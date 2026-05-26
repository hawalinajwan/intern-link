<?php

declare(strict_types=1);

require_once __DIR__ . '/../middleware/AuthMiddleware.php';
require_once __DIR__ . '/../helpers/EmailHelper.php';

final class LamaranController
{
    private const STATUS_WHITELIST = ['pending', 'ditinjau', 'dipanggil', 'diterima', 'ditolak'];

    public function __construct(private readonly PDO $db)
    {
    }

    public function create(): void
    {
        $user = (new AuthMiddleware($this->db))->requireAuth('mahasiswa');
        $payload = $this->jsonBody();
        $lowonganId = (int) ($payload['lowongan_id'] ?? 0);
        $suratMotivasi = trim((string) ($payload['surat_motivasi'] ?? ''));

        if ($lowonganId <= 0 || $suratMotivasi === '') {
            $this->json(['success' => false, 'error' => 'lowongan_id dan surat_motivasi wajib diisi.'], 422);
            return;
        }

        $lowongan = $this->findOpenLowongan($lowonganId);
        if (!$lowongan) {
            $this->json(['success' => false, 'error' => 'Lowongan tidak ditemukan atau sudah ditutup.'], 404);
            return;
        }

        $missingFields = $this->missingProfileFields((int) $user['id']);
        if ($missingFields !== []) {
            $this->json([
                'success' => false,
                'error' => 'Lengkapi profil sebelum melamar',
                'missing_fields' => $missingFields,
            ], 422);
            return;
        }

        $duplicate = $this->db->prepare(
            'SELECT id FROM lamaran WHERE mahasiswa_user_id = ? AND lowongan_id = ? LIMIT 1'
        );
        $duplicate->execute([$user['id'], $lowonganId]);

        if ($duplicate->fetch()) {
            $this->json(['success' => false, 'error' => 'Anda sudah melamar lowongan ini.'], 409);
            return;
        }

        $filled = $this->db->prepare(
            "SELECT COUNT(*) AS total
             FROM lamaran
             WHERE lowongan_id = ?
               AND status IN ('dipanggil', 'diterima')"
        );
        $filled->execute([$lowonganId]);

        $kuota = (int) ($lowongan['kuota'] ?? 10);
        if ((int) ($filled->fetch()['total'] ?? 0) >= $kuota) {
            $this->json(['success' => false, 'error' => 'Kuota lowongan sudah penuh.'], 400);
            return;
        }

        $statement = $this->db->prepare(
            "INSERT INTO lamaran (mahasiswa_user_id, lowongan_id, surat_motivasi, status)
             VALUES (?, ?, ?, 'pending')"
        );
        $statement->execute([$user['id'], $lowonganId, $suratMotivasi]);

        $this->json([
            'success' => true,
            'data' => ['lamaran_id' => (int) $this->db->lastInsertId()],
        ], 201);
    }

    public function mine(): void
    {
        $user = (new AuthMiddleware($this->db))->requireAuth('mahasiswa');
        $statement = $this->db->prepare(
            'SELECT la.id AS lamaran_id, la.status, la.chat_room_id, la.surat_motivasi,
                    la.catatan_hrd, la.created_at,
                    l.id AS lowongan_id, l.judul,
                    pp.nama_perusahaan
             FROM lamaran la
             JOIN lowongan l ON l.id = la.lowongan_id
             LEFT JOIN profil_perusahaan pp ON pp.user_id = l.perusahaan_user_id
             WHERE la.mahasiswa_user_id = ?
             ORDER BY la.created_at DESC, la.id DESC'
        );
        $statement->execute([$user['id']]);

        $this->json([
            'success' => true,
            'data' => array_map([$this, 'mineRow'], $statement->fetchAll()),
        ]);
    }

    public function applicants(int $lowonganId): void
    {
        $user = (new AuthMiddleware($this->db))->requireAuth('hrd');

        if (!$this->ownsLowongan($lowonganId, (int) $user['id'])) {
            $this->json(['success' => false, 'error' => 'Lowongan tidak ditemukan atau bukan milik Anda.'], 403);
            return;
        }

        $statement = $this->db->prepare(
            'SELECT la.id AS lamaran_id, la.status, la.surat_motivasi, la.catatan_hrd,
                    la.chat_room_id, la.created_at,
                    pm.user_id, pm.nama, pm.universitas, pm.jurusan, pm.cv_filename, pm.skills
             FROM lamaran la
             JOIN profil_mahasiswa pm ON pm.user_id = la.mahasiswa_user_id
             WHERE la.lowongan_id = ?
             ORDER BY la.created_at DESC, la.id DESC'
        );
        $statement->execute([$lowonganId]);

        $this->json([
            'success' => true,
            'data' => array_map([$this, 'applicantRow'], $statement->fetchAll()),
        ]);
    }

    public function updateStatus(int $lamaranId): void
    {
        $user = (new AuthMiddleware($this->db))->requireAuth('hrd');
        $payload = $this->jsonBody();
        $status = strtolower((string) ($payload['status'] ?? ''));

        if (!in_array($status, self::STATUS_WHITELIST, true)) {
            $this->json(['success' => false, 'error' => 'Status tidak valid.'], 422);
            return;
        }

        $lamaran = $this->findOwnedLamaran($lamaranId, (int) $user['id']);
        if (!$lamaran) {
            $this->json(['success' => false, 'error' => 'Lamaran tidak ditemukan atau bukan milik Anda.'], 403);
            return;
        }

        if (!$this->isAllowedTransition((string) $lamaran['status'], $status)) {
            $this->json(['success' => false, 'error' => 'Transisi status tidak diizinkan.'], 422);
            return;
        }

        $chatRoomId = $lamaran['chat_room_id'];
        if ($status === 'dipanggil' && $lamaran['status'] !== 'dipanggil') {
            $chatRoomId = $chatRoomId ?: 'room_' . $lamaranId . '_' . time();
        }

        $statement = $this->db->prepare(
            'UPDATE lamaran SET status = ?, catatan_hrd = ?, chat_room_id = ? WHERE id = ?'
        );
        $statement->execute([
            $status,
            $payload['catatan_hrd'] ?? $payload['catatan'] ?? $lamaran['catatan_hrd'],
            $chatRoomId,
            $lamaranId,
        ]);

        if ($status === 'dipanggil' && $lamaran['status'] !== 'dipanggil') {
            $this->createChatRoom([
                'roomId' => $chatRoomId,
                'lamaranId' => $lamaranId,
                'mahasiswaUserId' => (int) $lamaran['mahasiswa_user_id'],
                'hrdUserId' => (int) $user['id'],
                'lowonganTitle' => $lamaran['judul'],
            ]);
        }

        if (in_array($status, ['diterima', 'ditolak'], true) && !empty($chatRoomId)) {
            $this->closeChatRoom((string) $chatRoomId);
        }

        $emailNotificationSent = null;
        if ($status !== $lamaran['status']) {
            $emailNotificationSent = $this->sendStatusNotification($lamaranId, $status, $chatRoomId ? (string) $chatRoomId : null);
        }

        $this->json([
            'success' => true,
            'data' => [
                'status' => $status,
                'chat_room_id' => $chatRoomId,
                'email_notification_sent' => $emailNotificationSent,
            ],
        ]);
    }

    private function missingProfileFields(int $mahasiswaUserId): array
    {
        $statement = $this->db->prepare(
            'SELECT nama, universitas, jurusan, semester
             FROM profil_mahasiswa
             WHERE user_id = ?
             LIMIT 1'
        );
        $statement->execute([$mahasiswaUserId]);
        $profile = $statement->fetch() ?: [];

        $missingFields = [];
        if (empty($profile['nama'])) {
            $missingFields[] = 'Nama';
        }
        if (empty($profile['universitas'])) {
            $missingFields[] = 'Universitas';
        }
        if (empty($profile['jurusan'])) {
            $missingFields[] = 'Jurusan';
        }
        if (empty($profile['semester'])) {
            $missingFields[] = 'Semester';
        }

        return $missingFields;
    }

    private function sendStatusNotification(int $lamaranId, string $newStatus, ?string $chatRoomId): ?bool
    {
        if (!in_array($newStatus, ['dipanggil', 'diterima', 'ditolak'], true)) {
            return null;
        }

        $detail = $this->notificationDetail($lamaranId);
        if ($detail === null) {
            return false;
        }

        $email = (string) $detail['mahasiswa_email'];
        $name = (string) ($detail['mahasiswa_nama'] ?: 'Kandidat');
        $title = (string) $detail['judul_lowongan'];
        $company = (string) ($detail['nama_perusahaan'] ?: 'Perusahaan');

        if ($newStatus === 'dipanggil' && $chatRoomId !== null) {
            return EmailHelper::sendDipanggil($email, $name, $title, $company, $this->clientUrl() . '/mahasiswa/chat/' . rawurlencode($chatRoomId));
        }

        if ($newStatus === 'diterima') {
            return EmailHelper::sendDiterima($email, $name, $title, $company);
        }

        return EmailHelper::sendDitolak($email, $name, $title, $company);
    }

    private function notificationDetail(int $lamaranId): ?array
    {
        $statement = $this->db->prepare(
            'SELECT u.email AS mahasiswa_email,
                    pm.nama AS mahasiswa_nama,
                    l.judul AS judul_lowongan,
                    pp.nama_perusahaan
             FROM lamaran la
             JOIN users u ON la.mahasiswa_user_id = u.id
             LEFT JOIN profil_mahasiswa pm ON u.id = pm.user_id
             JOIN lowongan l ON la.lowongan_id = l.id
             LEFT JOIN profil_perusahaan pp ON l.perusahaan_user_id = pp.user_id
             WHERE la.id = ?
             LIMIT 1'
        );
        $statement->execute([$lamaranId]);
        $detail = $statement->fetch();

        return $detail ?: null;
    }

    private function clientUrl(): string
    {
        $configured = getenv('CLIENT_URL');
        if (is_string($configured) && trim($configured) !== '') {
            $first = trim(explode(',', $configured)[0]);
            if ($first !== '') {
                return rtrim($first, '/');
            }
        }

        return 'https://intern-link.hawali.site';
    }

    private function findOpenLowongan(int $lowonganId): ?array
    {
        $statement = $this->db->prepare(
            "SELECT id, kuota
             FROM lowongan
             WHERE id = ?
               AND status = 'aktif'
               AND batas_lamaran >= CURDATE()
             LIMIT 1"
        );
        $statement->execute([$lowonganId]);
        $lowongan = $statement->fetch();

        return $lowongan ?: null;
    }

    private function ownsLowongan(int $lowonganId, int $hrdUserId): bool
    {
        $statement = $this->db->prepare(
            'SELECT id FROM lowongan WHERE id = ? AND perusahaan_user_id = ? LIMIT 1'
        );
        $statement->execute([$lowonganId, $hrdUserId]);

        return (bool) $statement->fetch();
    }

    private function findOwnedLamaran(int $lamaranId, int $hrdUserId): ?array
    {
        $statement = $this->db->prepare(
            'SELECT la.*, l.judul
             FROM lamaran la
             JOIN lowongan l ON l.id = la.lowongan_id
             WHERE la.id = ?
               AND l.perusahaan_user_id = ?
             LIMIT 1'
        );
        $statement->execute([$lamaranId, $hrdUserId]);
        $lamaran = $statement->fetch();

        return $lamaran ?: null;
    }

    private function isAllowedTransition(string $currentStatus, string $nextStatus): bool
    {
        if ($currentStatus === $nextStatus) {
            return true;
        }

        $allowedTransitions = [
            'pending' => ['ditinjau', 'dipanggil', 'ditolak'],
            'ditinjau' => ['dipanggil', 'ditolak'],
            'dipanggil' => ['diterima', 'ditolak'],
            'diterima' => [],
            'ditolak' => [],
        ];

        return in_array($nextStatus, $allowedTransitions[$currentStatus] ?? [], true);
    }

    private function createChatRoom(array $payload): void
    {
        $this->sendNodeRequest('POST', $this->chatServerUrl() . '/api/rooms/create', $payload);
    }

    private function closeChatRoom(string $roomId): void
    {
        $this->sendNodeRequest('PUT', $this->chatServerUrl() . '/api/rooms/' . rawurlencode($roomId) . '/close', []);
    }

    private function sendNodeRequest(string $method, string $url, array $payload): void
    {
        $body = json_encode($payload, JSON_UNESCAPED_SLASHES);
        if ($body === false) {
            $body = '{}';
        }

        if (function_exists('curl_init')) {
            $curl = curl_init($url);
            curl_setopt($curl, CURLOPT_CUSTOMREQUEST, $method);
            curl_setopt($curl, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
            curl_setopt($curl, CURLOPT_POSTFIELDS, $body);
            curl_setopt($curl, CURLOPT_TIMEOUT, 3);
            curl_setopt($curl, CURLOPT_RETURNTRANSFER, true);
            @curl_exec($curl);
            return;
        }

        $context = stream_context_create([
            'http' => [
                'method' => $method,
                'header' => "Content-Type: application/json\r\n",
                'content' => $body,
                'timeout' => 3,
                'ignore_errors' => true,
            ],
        ]);
        @file_get_contents($url, false, $context);
    }

    private function chatServerUrl(): string
    {
        $url = getenv('NODE_URL') ?: getenv('CHAT_SERVER_URL') ?: '';
        if (!is_string($url) || trim($url) === '') {
            throw new RuntimeException('NODE_URL is required.');
        }

        return rtrim($url, '/');
    }

    private function mineRow(array $row): array
    {
        return [
            'lamaran_id' => (int) $row['lamaran_id'],
            'status' => $row['status'],
            'chat_room_id' => $row['chat_room_id'],
            'surat_motivasi' => $row['surat_motivasi'],
            'catatan_hrd' => $row['catatan_hrd'],
            'created_at' => $row['created_at'],
            'lowongan' => [
                'id' => (int) $row['lowongan_id'],
                'judul' => $row['judul'],
                'nama_perusahaan' => $row['nama_perusahaan'],
            ],
        ];
    }

    private function applicantRow(array $row): array
    {
        return [
            'lamaran_id' => (int) $row['lamaran_id'],
            'status' => $row['status'],
            'surat_motivasi' => $row['surat_motivasi'],
            'catatan_hrd' => $row['catatan_hrd'],
            'chat_room_id' => $row['chat_room_id'],
            'created_at' => $row['created_at'],
            'mahasiswa' => [
                'user_id' => (int) $row['user_id'],
                'nama' => $row['nama'],
                'universitas' => $row['universitas'],
                'jurusan' => $row['jurusan'],
                'skills' => $this->decodeJsonArray($row['skills'] ?? null),
                'has_cv' => !empty($row['cv_filename']),
            ],
        ];
    }

    private function decodeJsonArray(?string $value): array
    {
        if ($value === null || $value === '') {
            return [];
        }

        $decoded = json_decode($value, true);

        return is_array($decoded) ? $decoded : [];
    }

    private function jsonBody(): array
    {
        $payload = json_decode(file_get_contents('php://input') ?: '', true);

        return is_array($payload) ? $payload : [];
    }

    private function json(array $payload, int $status = 200): void
    {
        http_response_code($status);
        header('Content-Type: application/json');
        echo json_encode($payload, JSON_UNESCAPED_SLASHES);
    }
}
