<?php

declare(strict_types=1);

require_once __DIR__ . '/../middleware/AuthMiddleware.php';

final class LowonganController
{
    private const ALLOWED_JENIS = ['remote', 'onsite', 'hybrid'];
    private const ALLOWED_STATUS = ['aktif', 'ditutup'];

    public function __construct(private readonly PDO $db)
    {
    }

    public function index(array $query): void
    {
        $page = max(1, (int) ($query['page'] ?? 1));
        $limit = min(50, max(1, (int) ($query['limit'] ?? 10)));
        $offset = ($page - 1) * $limit;
        [$where, $params] = $this->publicFilters($query);

        $count = $this->db->prepare("SELECT COUNT(*) AS total FROM lowongan l {$where}");
        $count->execute($params);
        $total = (int) ($count->fetch()['total'] ?? 0);

        $sql = "SELECT l.id, l.judul, l.jenis, l.durasi_bulan, l.uang_saku, l.keahlian_dibutuhkan,
                       p.nama_perusahaan, p.logo_url
                FROM lowongan l
                LEFT JOIN profil_perusahaan p ON p.user_id = l.perusahaan_user_id
                {$where}
                ORDER BY l.created_at DESC, l.id DESC
                LIMIT {$limit} OFFSET {$offset}";
        $statement = $this->db->prepare($sql);
        $statement->execute($params);

        $this->json([
            'data' => array_map([$this, 'publicRow'], $statement->fetchAll()),
            'pagination' => [
                'page' => $page,
                'limit' => $limit,
                'total' => $total,
                'pages' => (int) ceil($total / $limit),
            ],
        ]);
    }

    public function show(int $id): void
    {
        $statement = $this->db->prepare(
            "SELECT l.id, l.judul, l.deskripsi, l.persyaratan, l.jenis, l.durasi_bulan,
                    l.uang_saku, l.keahlian_dibutuhkan, l.kuota, l.batas_lamaran, l.created_at,
                    p.nama_perusahaan, p.logo_url
             FROM lowongan l
             LEFT JOIN profil_perusahaan p ON p.user_id = l.perusahaan_user_id
             WHERE l.id = ?
               AND l.status = 'aktif'
               AND l.batas_lamaran >= CURDATE()
             LIMIT 1"
        );
        $statement->execute([$id]);
        $row = $statement->fetch();

        if (!$row) {
            $this->json(['message' => 'Lowongan tidak ditemukan.'], 404);
            return;
        }

        $this->json(['data' => $this->detailRow($row)]);
    }

    public function create(): void
    {
        $user = (new AuthMiddleware($this->db))->requireAuth('hrd');
        $payload = $this->jsonBody();
        $this->validateRequired($payload);

        $statement = $this->db->prepare(
            'INSERT INTO lowongan
             (perusahaan_user_id, judul, deskripsi, persyaratan, keahlian_dibutuhkan, jenis,
              durasi_bulan, uang_saku, kuota, batas_lamaran, status)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
        );
        $statement->execute([
            $user['id'],
            trim((string) $payload['judul']),
            $this->nullableString($payload['deskripsi'] ?? null),
            $this->nullableString($payload['persyaratan'] ?? null),
            $this->jsonArray($payload['keahlian_dibutuhkan'] ?? []),
            strtolower((string) $payload['jenis']),
            (int) $payload['durasi_bulan'],
            (int) ($payload['uang_saku'] ?? 0),
            (int) ($payload['kuota'] ?? 10),
            (string) $payload['batas_lamaran'],
            $this->validStatus((string) ($payload['status'] ?? 'aktif')),
        ]);

        $this->json(['success' => true, 'data' => ['id' => (int) $this->db->lastInsertId()]], 201);
    }

    public function update(int $id): void
    {
        $user = (new AuthMiddleware($this->db))->requireAuth('hrd');
        $payload = $this->jsonBody();

        if (!$this->ownsLowongan($id, $user['id'])) {
            $this->json(['message' => 'Akses ditolak.'], 403);
            return;
        }

        $fields = [];
        $values = [];
        foreach (['judul', 'deskripsi', 'persyaratan', 'batas_lamaran'] as $field) {
            if (array_key_exists($field, $payload)) {
                $fields[] = "{$field} = ?";
                $values[] = $field === 'judul' || $field === 'batas_lamaran'
                    ? trim((string) $payload[$field])
                    : $this->nullableString($payload[$field]);
            }
        }

        if (array_key_exists('jenis', $payload)) {
            $fields[] = 'jenis = ?';
            $values[] = $this->validJenis((string) $payload['jenis']);
        }

        foreach (['durasi_bulan', 'uang_saku', 'kuota'] as $field) {
            if (array_key_exists($field, $payload)) {
                $fields[] = "{$field} = ?";
                $values[] = (int) $payload[$field];
            }
        }

        if (array_key_exists('keahlian_dibutuhkan', $payload)) {
            $fields[] = 'keahlian_dibutuhkan = ?';
            $values[] = $this->jsonArray($payload['keahlian_dibutuhkan']);
        }

        if (array_key_exists('status', $payload)) {
            $fields[] = 'status = ?';
            $values[] = $this->validStatus((string) $payload['status']);
        }

        if ($fields === []) {
            $this->json(['message' => 'Tidak ada field yang diubah.'], 422);
            return;
        }

        $values[] = $id;
        $values[] = $user['id'];
        $statement = $this->db->prepare(
            'UPDATE lowongan SET ' . implode(', ', $fields) . ' WHERE id = ? AND perusahaan_user_id = ?'
        );
        $statement->execute($values);

        $this->json(['success' => true]);
    }

    public function delete(int $id): void
    {
        $user = (new AuthMiddleware($this->db))->requireAuth('hrd');

        if (!$this->ownsLowongan($id, $user['id'])) {
            $this->json(['message' => 'Akses ditolak.'], 403);
            return;
        }

        $blocked = $this->db->prepare(
            "SELECT COUNT(*) AS total
             FROM lamaran
             WHERE lowongan_id = ?
               AND status IN ('dipanggil', 'diterima')"
        );
        $blocked->execute([$id]);

        if ((int) ($blocked->fetch()['total'] ?? 0) > 0) {
            $this->json(['message' => 'Lowongan tidak bisa dihapus karena ada lamaran dipanggil/diterima.'], 409);
            return;
        }

        $statement = $this->db->prepare('DELETE FROM lowongan WHERE id = ? AND perusahaan_user_id = ?');
        $statement->execute([$id, $user['id']]);

        $this->json(['success' => true]);
    }

    public function ownedIndex(): void
    {
        $user = (new AuthMiddleware($this->db))->requireAuth('hrd');
        $statement = $this->db->prepare(
            "SELECT l.*,
                    SUM(CASE WHEN la.status = 'pending' THEN 1 ELSE 0 END) AS pending_count,
                    SUM(CASE WHEN la.status = 'ditinjau' THEN 1 ELSE 0 END) AS ditinjau_count,
                    SUM(CASE WHEN la.status = 'dipanggil' THEN 1 ELSE 0 END) AS dipanggil_count,
                    SUM(CASE WHEN la.status = 'diterima' THEN 1 ELSE 0 END) AS diterima_count,
                    SUM(CASE WHEN la.status = 'ditolak' THEN 1 ELSE 0 END) AS ditolak_count,
                    SUM(CASE WHEN DATE(la.created_at) = CURDATE() THEN 1 ELSE 0 END) AS today_lamaran_count,
                    COUNT(la.id) AS total_lamaran
             FROM lowongan l
             LEFT JOIN lamaran la ON la.lowongan_id = l.id
             WHERE l.perusahaan_user_id = ?
             GROUP BY l.id
             ORDER BY l.created_at DESC, l.id DESC"
        );
        $statement->execute([$user['id']]);

        $this->json(['data' => array_map([$this, 'ownedRow'], $statement->fetchAll())]);
    }

    private function publicFilters(array $query): array
    {
        $where = ["l.status = 'aktif'", 'l.batas_lamaran >= CURDATE()'];
        $params = [];
        $keyword = trim((string) ($query['keyword'] ?? ''));
        $jenis = array_values(array_filter(array_map('trim', explode(',', strtolower((string) ($query['jenis'] ?? ''))))));

        if ($keyword !== '') {
            $where[] = '(l.judul LIKE ? OR l.deskripsi LIKE ?)';
            $params[] = "%{$keyword}%";
            $params[] = "%{$keyword}%";
        }

        if ($jenis !== []) {
            $jenis = array_values(array_intersect($jenis, self::ALLOWED_JENIS));
            if ($jenis !== []) {
                $where[] = 'l.jenis IN (' . implode(',', array_fill(0, count($jenis), '?')) . ')';
                array_push($params, ...$jenis);
            }
        }

        return ['WHERE ' . implode(' AND ', $where), $params];
    }

    private function ownsLowongan(int $id, int $userId): bool
    {
        $statement = $this->db->prepare('SELECT id FROM lowongan WHERE id = ? AND perusahaan_user_id = ? LIMIT 1');
        $statement->execute([$id, $userId]);

        return (bool) $statement->fetch();
    }

    private function publicRow(array $row): array
    {
        return [
            'id' => (int) $row['id'],
            'judul' => $row['judul'],
            'jenis' => $row['jenis'],
            'durasi_bulan' => $row['durasi_bulan'] !== null ? (int) $row['durasi_bulan'] : null,
            'uang_saku' => $row['uang_saku'] !== null ? (int) $row['uang_saku'] : null,
            'keahlian_dibutuhkan' => $this->decodeJsonArray($row['keahlian_dibutuhkan'] ?? null),
            'perusahaan' => [
                'nama_perusahaan' => $row['nama_perusahaan'],
                'logo_url' => $row['logo_url'],
            ],
        ];
    }

    private function detailRow(array $row): array
    {
        return $this->publicRow($row) + [
            'deskripsi' => $row['deskripsi'],
            'persyaratan' => $row['persyaratan'],
            'kuota' => $row['kuota'] !== null ? (int) $row['kuota'] : null,
            'batas_lamaran' => $row['batas_lamaran'],
            'created_at' => $row['created_at'],
        ];
    }

    private function ownedRow(array $row): array
    {
        return [
            'id' => (int) $row['id'],
            'perusahaan_user_id' => (int) $row['perusahaan_user_id'],
            'judul' => $row['judul'],
            'deskripsi' => $row['deskripsi'],
            'persyaratan' => $row['persyaratan'],
            'keahlian_dibutuhkan' => $this->decodeJsonArray($row['keahlian_dibutuhkan'] ?? null),
            'jenis' => $row['jenis'],
            'durasi_bulan' => $row['durasi_bulan'] !== null ? (int) $row['durasi_bulan'] : null,
            'uang_saku' => $row['uang_saku'] !== null ? (int) $row['uang_saku'] : null,
            'kuota' => $row['kuota'] !== null ? (int) $row['kuota'] : null,
            'batas_lamaran' => $row['batas_lamaran'],
            'status' => $row['status'],
            'created_at' => $row['created_at'],
            'lamaran_count' => [
                'pending' => (int) $row['pending_count'],
                'ditinjau' => (int) $row['ditinjau_count'],
                'dipanggil' => (int) $row['dipanggil_count'],
                'diterima' => (int) $row['diterima_count'],
                'ditolak' => (int) $row['ditolak_count'],
                'today' => (int) $row['today_lamaran_count'],
                'total' => (int) $row['total_lamaran'],
            ],
        ];
    }

    private function validateRequired(array $payload): void
    {
        foreach (['judul', 'jenis', 'durasi_bulan', 'batas_lamaran'] as $field) {
            if (!isset($payload[$field]) || $payload[$field] === '') {
                $this->json(['message' => "Field {$field} wajib diisi."], 422);
                exit;
            }
        }

        $this->validJenis((string) $payload['jenis']);
    }

    private function validJenis(string $jenis): string
    {
        $jenis = strtolower($jenis);
        if (!in_array($jenis, self::ALLOWED_JENIS, true)) {
            $this->json(['message' => 'Jenis kerja harus remote, onsite, atau hybrid.'], 422);
            exit;
        }

        return $jenis;
    }

    private function validStatus(string $status): string
    {
        $status = strtolower($status);
        if (!in_array($status, self::ALLOWED_STATUS, true)) {
            $this->json(['message' => 'Status lowongan tidak valid.'], 422);
            exit;
        }

        return $status;
    }

    private function jsonArray(mixed $value): string
    {
        $array = is_array($value) ? array_values($value) : [];
        $encoded = json_encode($array, JSON_UNESCAPED_SLASHES);

        return $encoded === false ? '[]' : $encoded;
    }

    private function decodeJsonArray(?string $value): array
    {
        if ($value === null || $value === '') {
            return [];
        }

        $decoded = json_decode($value, true);

        return is_array($decoded) ? $decoded : [];
    }

    private function nullableString(mixed $value): ?string
    {
        if ($value === null) {
            return null;
        }

        $value = trim((string) $value);

        return $value === '' ? null : $value;
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
