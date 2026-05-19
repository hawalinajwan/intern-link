<?php

declare(strict_types=1);

require_once __DIR__ . '/../middleware/AuthMiddleware.php';

final class LamaranController
{
    public function __construct(private readonly PDO|JsonStore $db)
    {
    }

    public function create(): void
    {
        $user = (new AuthMiddleware($this->db))->requireAuth('mahasiswa');
        $payload = $this->jsonBody();
        $lowonganId = (int) ($payload['lowongan_id'] ?? 0);
        $motivasi = trim((string) ($payload['surat_motivasi'] ?? ''));

        if ($lowonganId <= 0 || $motivasi === '') {
            $this->json(['message' => 'Lowongan dan surat motivasi wajib diisi.'], 422);
            return;
        }

        if ($this->db instanceof JsonStore) {
            $result = $this->db->transaction(function (array &$data) use ($user, $lowonganId, $motivasi): array {
                $lowongan = null;
                foreach ($data['lowongan'] as $item) {
                    if ((int) $item['id'] === $lowonganId) {
                        $lowongan = $item;
                        break;
                    }
                }

                if ($lowongan === null || ($lowongan['status'] ?? 'aktif') !== 'aktif') {
                    return ['status' => 404, 'payload' => ['message' => 'Lowongan tidak ditemukan atau tidak aktif.']];
                }

                if (!empty($lowongan['batas_lamaran']) && strtotime((string) $lowongan['batas_lamaran']) < strtotime(date('Y-m-d'))) {
                    return ['status' => 422, 'payload' => ['message' => 'Batas lamaran sudah lewat.']];
                }

                foreach ($data['lamaran'] as $lamaran) {
                    if ((int) $lamaran['mahasiswa_user_id'] === (int) $user['id'] && (int) $lamaran['lowongan_id'] === $lowonganId) {
                        return ['status' => 409, 'payload' => ['message' => 'Anda sudah melamar lowongan ini.']];
                    }
                }

                $acceptedCount = 0;
                foreach ($data['lamaran'] as $lamaran) {
                    if ((int) $lamaran['lowongan_id'] === $lowonganId && in_array($lamaran['status'], ['dipanggil', 'diterima'], true)) {
                        $acceptedCount++;
                    }
                }

                if ((int) ($lowongan['kuota'] ?? 0) > 0 && $acceptedCount >= (int) $lowongan['kuota']) {
                    return ['status' => 422, 'payload' => ['message' => 'Kuota lowongan sudah penuh.']];
                }

                $id = $this->db->nextId($data, 'lamaran');
                $data['lamaran'][] = [
                    'id' => $id,
                    'mahasiswa_user_id' => (int) $user['id'],
                    'lowongan_id' => $lowonganId,
                    'surat_motivasi' => $motivasi,
                    'status' => 'pending',
                    'catatan_hrd' => null,
                    'chat_room_id' => null,
                    'created_at' => date(DATE_ATOM),
                    'updated_at' => date(DATE_ATOM),
                ];

                return ['status' => 201, 'payload' => ['success' => true, 'lamaran_id' => $id]];
            });

            $this->json($result['payload'], $result['status']);
            return;
        }

        $lowonganStatement = $this->db->prepare('SELECT * FROM lowongan WHERE id = ? LIMIT 1');
        $lowonganStatement->execute([$lowonganId]);
        $lowongan = $lowonganStatement->fetch();

        if (!$lowongan || ($lowongan['status'] ?? 'aktif') !== 'aktif') {
            $this->json(['message' => 'Lowongan tidak ditemukan atau tidak aktif.'], 404);
            return;
        }

        if (!empty($lowongan['batas_lamaran']) && strtotime((string) $lowongan['batas_lamaran']) < strtotime(date('Y-m-d'))) {
            $this->json(['message' => 'Batas lamaran sudah lewat.'], 422);
            return;
        }

        $duplicateStatement = $this->db->prepare('SELECT id FROM lamaran WHERE mahasiswa_user_id = ? AND lowongan_id = ? LIMIT 1');
        $duplicateStatement->execute([(int) $user['id'], $lowonganId]);

        if ($duplicateStatement->fetch()) {
            $this->json(['message' => 'Anda sudah melamar lowongan ini.'], 409);
            return;
        }

        $quotaStatement = $this->db->prepare(
            "SELECT COUNT(*) AS total FROM lamaran WHERE lowongan_id = ? AND status IN ('dipanggil', 'diterima')"
        );
        $quotaStatement->execute([$lowonganId]);
        $acceptedCount = (int) ($quotaStatement->fetch()['total'] ?? 0);

        if ((int) ($lowongan['kuota'] ?? 0) > 0 && $acceptedCount >= (int) $lowongan['kuota']) {
            $this->json(['message' => 'Kuota lowongan sudah penuh.'], 422);
            return;
        }

        $statement = $this->db->prepare(
            "INSERT INTO lamaran (mahasiswa_user_id, lowongan_id, surat_motivasi, status, created_at, updated_at)
             VALUES (?, ?, ?, 'pending', NOW(), NOW())"
        );
        $statement->execute([(int) $user['id'], $lowonganId, $motivasi]);

        $this->json(['success' => true, 'lamaran_id' => (int) $this->db->lastInsertId()], 201);
    }

    public function mine(): void
    {
        $user = (new AuthMiddleware($this->db))->requireAuth('mahasiswa');
        if (!$this->db instanceof JsonStore) {
            $statement = $this->db->prepare(
                'SELECT la.*,
                        l.judul, l.jenis, l.durasi_bulan, l.uang_saku, l.status AS lowongan_status,
                        p.nama_perusahaan, p.logo
                 FROM lamaran la
                 JOIN lowongan l ON l.id = la.lowongan_id
                 LEFT JOIN profil_perusahaan p ON p.user_id = l.perusahaan_user_id
                 WHERE la.mahasiswa_user_id = ?
                 ORDER BY la.created_at DESC, la.id DESC'
            );
            $statement->execute([(int) $user['id']]);
            $items = array_map(fn (array $row): array => $this->normalizeLamaranMineRow($row), $statement->fetchAll());

            $this->json(['data' => $items]);
            return;
        }

        $data = $this->db->all();
        $lowongan = [];

        foreach ($data['lowongan'] ?? [] as $item) {
            $lowongan[(int) $item['id']] = $item;
        }

        $items = [];
        foreach ($data['lamaran'] ?? [] as $lamaran) {
            if ((int) $lamaran['mahasiswa_user_id'] === (int) $user['id']) {
                $lamaran['lowongan'] = $lowongan[(int) $lamaran['lowongan_id']] ?? null;
                $items[] = $lamaran;
            }
        }

        $this->json(['data' => $items]);
    }

    public function applicants(int $lowonganId): void
    {
        $user = (new AuthMiddleware($this->db))->requireAuth('hrd');
        if (!$this->db instanceof JsonStore) {
            $ownedStatement = $this->db->prepare('SELECT id FROM lowongan WHERE id = ? AND perusahaan_user_id = ? LIMIT 1');
            $ownedStatement->execute([$lowonganId, (int) $user['id']]);

            if (!$ownedStatement->fetch()) {
                $this->json(['message' => 'Lowongan tidak ditemukan.'], 404);
                return;
            }

            $statement = $this->db->prepare(
                'SELECT la.*,
                        pm.nama_lengkap, pm.universitas, pm.jurusan, pm.semester, pm.skills,
                        pm.bio, pm.cv_filename, pm.cv_original_name, pm.cv_uploaded_at
                 FROM lamaran la
                 LEFT JOIN profil_mahasiswa pm ON pm.user_id = la.mahasiswa_user_id
                 WHERE la.lowongan_id = ?
                 ORDER BY la.created_at DESC, la.id DESC'
            );
            $statement->execute([$lowonganId]);
            $items = array_map(fn (array $row): array => $this->normalizeApplicantRow($row), $statement->fetchAll());

            $this->json(['data' => $items]);
            return;
        }

        $data = $this->db->all();
        $owned = false;

        foreach ($data['lowongan'] ?? [] as $lowongan) {
            if ((int) $lowongan['id'] === $lowonganId && (int) $lowongan['perusahaan_user_id'] === (int) $user['id']) {
                $owned = true;
                break;
            }
        }

        if (!$owned) {
            $this->json(['message' => 'Lowongan tidak ditemukan.'], 404);
            return;
        }

        $profiles = [];
        foreach ($data['profil_mahasiswa'] ?? [] as $profile) {
            $profiles[(int) $profile['user_id']] = $profile;
        }

        $items = [];
        foreach ($data['lamaran'] ?? [] as $lamaran) {
            if ((int) $lamaran['lowongan_id'] === $lowonganId) {
                $lamaran['mahasiswa'] = $profiles[(int) $lamaran['mahasiswa_user_id']] ?? null;
                $items[] = $lamaran;
            }
        }

        $this->json(['data' => $items]);
    }

    public function updateStatus(int $lamaranId): void
    {
        $user = (new AuthMiddleware($this->db))->requireAuth('hrd');
        $payload = $this->jsonBody();
        $status = strtolower((string) ($payload['status'] ?? ''));

        if (!in_array($status, ['ditinjau', 'dipanggil', 'diterima', 'ditolak'], true)) {
            $this->json(['message' => 'Status tidak valid.'], 422);
            return;
        }

        if ($this->db instanceof JsonStore) {
            $result = $this->db->transaction(function (array &$data) use ($lamaranId, $status, $payload, $user): array {
                $lowonganById = [];
                foreach ($data['lowongan'] as $lowongan) {
                    $lowonganById[(int) $lowongan['id']] = $lowongan;
                }

                foreach ($data['lamaran'] as &$lamaran) {
                    $lowongan = $lowonganById[(int) $lamaran['lowongan_id']] ?? null;
                    if ((int) $lamaran['id'] === $lamaranId && $lowongan && (int) $lowongan['perusahaan_user_id'] === (int) $user['id']) {
                        $lamaran['status'] = $status;
                        $lamaran['catatan_hrd'] = $payload['catatan'] ?? $payload['catatan_hrd'] ?? $lamaran['catatan_hrd'];
                        $lamaran['updated_at'] = date(DATE_ATOM);

                        if ($status === 'dipanggil' && empty($lamaran['chat_room_id'])) {
                            $lamaran['chat_room_id'] = 'room_' . $lamaranId . '_' . time();
                            $this->createChatRoom($lamaran, $lowongan, (int) $user['id']);
                        }

                        if (in_array($status, ['diterima', 'ditolak'], true) && !empty($lamaran['chat_room_id'])) {
                            $this->closeChatRoom((string) $lamaran['chat_room_id']);
                        }

                        return ['status' => 200, 'payload' => ['success' => true, 'status' => $status, 'chat_room_id' => $lamaran['chat_room_id']]];
                    }
                }

                return ['status' => 404, 'payload' => ['message' => 'Lamaran tidak ditemukan.']];
            });

            $this->json($result['payload'], $result['status']);
            return;
        }

        $statement = $this->db->prepare(
            'SELECT la.*, l.perusahaan_user_id, l.judul
             FROM lamaran la
             JOIN lowongan l ON l.id = la.lowongan_id
             WHERE la.id = ? AND l.perusahaan_user_id = ?
             LIMIT 1'
        );
        $statement->execute([$lamaranId, (int) $user['id']]);
        $lamaran = $statement->fetch();

        if (!$lamaran) {
            $this->json(['message' => 'Lamaran tidak ditemukan.'], 404);
            return;
        }

        $chatRoomId = $lamaran['chat_room_id'];
        if ($status === 'dipanggil' && empty($chatRoomId)) {
            $chatRoomId = 'room_' . $lamaranId . '_' . time();
        }

        $update = $this->db->prepare(
            'UPDATE lamaran SET status = ?, catatan_hrd = ?, chat_room_id = ?, updated_at = NOW() WHERE id = ?'
        );
        $update->execute([
            $status,
            $payload['catatan'] ?? $payload['catatan_hrd'] ?? $lamaran['catatan_hrd'],
            $chatRoomId,
            $lamaranId,
        ]);

        $lamaran['chat_room_id'] = $chatRoomId;
        if ($status === 'dipanggil') {
            $this->createChatRoom($lamaran, ['judul' => $lamaran['judul']], (int) $user['id']);
        }

        if (in_array($status, ['diterima', 'ditolak'], true) && !empty($chatRoomId)) {
            $this->closeChatRoom((string) $chatRoomId);
        }

        $this->json(['success' => true, 'status' => $status, 'chat_room_id' => $chatRoomId]);
    }

    private function normalizeLamaranMineRow(array $row): array
    {
        $lamaran = [
            'id' => (int) $row['id'],
            'mahasiswa_user_id' => (int) $row['mahasiswa_user_id'],
            'lowongan_id' => (int) $row['lowongan_id'],
            'surat_motivasi' => $row['surat_motivasi'],
            'status' => $row['status'],
            'catatan_hrd' => $row['catatan_hrd'],
            'chat_room_id' => $row['chat_room_id'],
            'created_at' => $row['created_at'],
            'updated_at' => $row['updated_at'],
        ];

        $lamaran['lowongan'] = [
            'id' => (int) $row['lowongan_id'],
            'judul' => $row['judul'],
            'jenis' => $row['jenis'],
            'durasi_bulan' => (int) $row['durasi_bulan'],
            'uang_saku' => (int) $row['uang_saku'],
            'status' => $row['lowongan_status'],
            'perusahaan' => [
                'nama_perusahaan' => $row['nama_perusahaan'] ?? 'Perusahaan',
                'logo' => $row['logo'] ?? null,
            ],
        ];

        return $lamaran;
    }

    private function normalizeApplicantRow(array $row): array
    {
        $skills = $row['skills'] ?? [];
        if (is_string($skills)) {
            $decoded = json_decode($skills, true);
            $skills = is_array($decoded) ? $decoded : [];
        }

        $lamaran = [
            'id' => (int) $row['id'],
            'mahasiswa_user_id' => (int) $row['mahasiswa_user_id'],
            'lowongan_id' => (int) $row['lowongan_id'],
            'surat_motivasi' => $row['surat_motivasi'],
            'status' => $row['status'],
            'catatan_hrd' => $row['catatan_hrd'],
            'chat_room_id' => $row['chat_room_id'],
            'created_at' => $row['created_at'],
            'updated_at' => $row['updated_at'],
        ];

        $lamaran['mahasiswa'] = [
            'user_id' => (int) $row['mahasiswa_user_id'],
            'nama_lengkap' => $row['nama_lengkap'],
            'universitas' => $row['universitas'],
            'jurusan' => $row['jurusan'],
            'semester' => $row['semester'] !== null ? (int) $row['semester'] : null,
            'skills' => $skills,
            'bio' => $row['bio'],
            'cv_filename' => $row['cv_filename'],
            'cv_original_name' => $row['cv_original_name'],
            'cv_uploaded_at' => $row['cv_uploaded_at'],
        ];

        return $lamaran;
    }

    private function createChatRoom(array $lamaran, array $lowongan, int $hrdUserId): void
    {
        $this->postJson((getenv('CHAT_SERVER_URL') ?: 'http://localhost:3001') . '/api/rooms/create', [
            'roomId' => $lamaran['chat_room_id'],
            'lamaranId' => $lamaran['id'],
            'mahasiswaUserId' => $lamaran['mahasiswa_user_id'],
            'hrdUserId' => $hrdUserId,
            'lowonganTitle' => $lowongan['judul'] ?? '',
        ]);
    }

    private function closeChatRoom(string $roomId): void
    {
        $this->postJson((getenv('CHAT_SERVER_URL') ?: 'http://localhost:3001') . '/api/rooms/' . rawurlencode($roomId) . '/close', []);
    }

    private function postJson(string $url, array $payload): void
    {
        $body = json_encode($payload);
        $context = stream_context_create([
            'http' => [
                'method' => 'POST',
                'header' => "Content-Type: application/json\r\n",
                'content' => $body === false ? '{}' : $body,
                'timeout' => 1,
                'ignore_errors' => true,
            ],
        ]);
        @file_get_contents($url, false, $context);
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
