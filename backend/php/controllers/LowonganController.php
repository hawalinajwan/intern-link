<?php

declare(strict_types=1);

require_once __DIR__ . '/../middleware/AuthMiddleware.php';

final class LowonganController
{
    public function __construct(private readonly PDO|JsonStore $db)
    {
    }

    public function index(array $query): void
    {
        $items = $this->lowonganWithCompanies();
        $keyword = strtolower(trim((string) ($query['keyword'] ?? '')));
        $jenis = array_filter(explode(',', strtolower((string) ($query['jenis'] ?? ''))));
        $gajiMin = isset($query['gaji_min']) ? (int) $query['gaji_min'] : null;
        $durasiMin = isset($query['durasi_min']) ? (int) $query['durasi_min'] : null;
        $durasiMax = isset($query['durasi_max']) ? (int) $query['durasi_max'] : null;

        $items = array_values(array_filter($items, function (array $item) use ($keyword, $jenis, $gajiMin, $durasiMin, $durasiMax): bool {
            if (($item['status'] ?? 'aktif') !== 'aktif') {
                return false;
            }

            if (!empty($item['batas_lamaran']) && strtotime((string) $item['batas_lamaran']) < strtotime(date('Y-m-d'))) {
                return false;
            }

            if ($keyword !== '') {
                $haystack = strtolower(($item['judul'] ?? '') . ' ' . ($item['deskripsi'] ?? '') . ' ' . ($item['perusahaan']['nama_perusahaan'] ?? ''));
                if (!str_contains($haystack, $keyword)) {
                    return false;
                }
            }

            if ($jenis !== [] && !in_array(strtolower((string) ($item['jenis'] ?? '')), $jenis, true)) {
                return false;
            }

            if ($gajiMin !== null && (int) ($item['uang_saku'] ?? 0) < $gajiMin) {
                return false;
            }

            if ($durasiMin !== null && (int) ($item['durasi_bulan'] ?? 0) < $durasiMin) {
                return false;
            }

            if ($durasiMax !== null && (int) ($item['durasi_bulan'] ?? 0) > $durasiMax) {
                return false;
            }

            return true;
        }));

        $page = max(1, (int) ($query['page'] ?? 1));
        $limit = min(50, max(1, (int) ($query['limit'] ?? 10)));
        $total = count($items);
        $paged = array_slice($items, ($page - 1) * $limit, $limit);

        $this->json([
            'data' => $paged,
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
        foreach ($this->lowonganWithCompanies() as $item) {
            if ((int) $item['id'] === $id) {
                $this->json(['data' => $item]);
                return;
            }
        }

        $this->json(['message' => 'Lowongan tidak ditemukan.'], 404);
    }

    public function ownedIndex(): void
    {
        $user = (new AuthMiddleware($this->db))->requireAuth('hrd');
        $items = array_values(array_filter($this->lowonganWithCompanies(), fn (array $item): bool => (int) $item['perusahaan_user_id'] === (int) $user['id']));

        $this->json(['data' => $items]);
    }

    public function create(): void
    {
        $user = (new AuthMiddleware($this->db))->requireAuth('hrd');
        $payload = $this->jsonBody();
        $this->validatePayload($payload);

        if ($this->db instanceof JsonStore) {
            $item = $this->db->transaction(function (array &$data) use ($payload, $user): array {
                $now = date(DATE_ATOM);
                $item = [
                    'id' => $this->db->nextId($data, 'lowongan'),
                    'perusahaan_user_id' => (int) $user['id'],
                    'judul' => trim((string) $payload['judul']),
                    'deskripsi' => trim((string) ($payload['deskripsi'] ?? '')),
                    'persyaratan' => trim((string) ($payload['persyaratan'] ?? '')),
                    'jenis' => strtolower((string) $payload['jenis']),
                    'durasi_bulan' => (int) $payload['durasi_bulan'],
                    'uang_saku' => (int) ($payload['uang_saku'] ?? 0),
                    'kuota' => (int) ($payload['kuota'] ?? 0),
                    'batas_lamaran' => (string) $payload['batas_lamaran'],
                    'keahlian_dibutuhkan' => $payload['keahlian_dibutuhkan'] ?? [],
                    'status' => 'aktif',
                    'created_at' => $now,
                    'updated_at' => $now,
                ];
                $data['lowongan'][] = $item;

                return $item;
            });

            $this->json(['success' => true, 'data' => $item], 201);
            return;
        }

        $statement = $this->db->prepare(
            'INSERT INTO lowongan
             (perusahaan_user_id, judul, deskripsi, persyaratan, jenis, durasi_bulan, uang_saku, kuota, batas_lamaran, keahlian_dibutuhkan, status, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, "aktif", NOW(), NOW())'
        );
        $skills = json_encode($payload['keahlian_dibutuhkan'] ?? [], JSON_UNESCAPED_SLASHES);
        $statement->execute([
            (int) $user['id'],
            trim((string) $payload['judul']),
            trim((string) ($payload['deskripsi'] ?? '')),
            trim((string) ($payload['persyaratan'] ?? '')),
            strtolower((string) $payload['jenis']),
            (int) $payload['durasi_bulan'],
            (int) ($payload['uang_saku'] ?? 0),
            (int) ($payload['kuota'] ?? 0),
            (string) $payload['batas_lamaran'],
            $skills === false ? '[]' : $skills,
        ]);

        $this->show((int) $this->db->lastInsertId());
    }

    public function update(int $id): void
    {
        $user = (new AuthMiddleware($this->db))->requireAuth('hrd');
        $payload = $this->jsonBody();

        if ($this->db instanceof JsonStore) {
            $updated = $this->db->transaction(function (array &$data) use ($id, $payload, $user): ?array {
                foreach ($data['lowongan'] as &$item) {
                    if ((int) $item['id'] === $id && (int) $item['perusahaan_user_id'] === (int) $user['id']) {
                        foreach (['judul', 'deskripsi', 'persyaratan', 'jenis', 'batas_lamaran', 'status'] as $field) {
                            if (array_key_exists($field, $payload)) {
                                $item[$field] = is_string($payload[$field]) ? trim($payload[$field]) : $payload[$field];
                            }
                        }
                        foreach (['durasi_bulan', 'uang_saku', 'kuota'] as $field) {
                            if (array_key_exists($field, $payload)) {
                                $item[$field] = (int) $payload[$field];
                            }
                        }
                        if (array_key_exists('keahlian_dibutuhkan', $payload)) {
                            $item['keahlian_dibutuhkan'] = $payload['keahlian_dibutuhkan'];
                        }
                        $item['updated_at'] = date(DATE_ATOM);
                        return $item;
                    }
                }

                return null;
            });

            if ($updated === null) {
                $this->json(['message' => 'Lowongan tidak ditemukan.'], 404);
                return;
            }

            $this->json(['success' => true, 'data' => $updated]);
            return;
        }

        $fields = [];
        $values = [];

        foreach (['judul', 'deskripsi', 'persyaratan', 'jenis', 'batas_lamaran', 'status'] as $field) {
            if (array_key_exists($field, $payload)) {
                $fields[] = "{$field} = ?";
                $values[] = is_string($payload[$field]) ? trim($payload[$field]) : $payload[$field];
            }
        }

        foreach (['durasi_bulan', 'uang_saku', 'kuota'] as $field) {
            if (array_key_exists($field, $payload)) {
                $fields[] = "{$field} = ?";
                $values[] = (int) $payload[$field];
            }
        }

        if (array_key_exists('keahlian_dibutuhkan', $payload)) {
            $fields[] = 'keahlian_dibutuhkan = ?';
            $encoded = json_encode($payload['keahlian_dibutuhkan'], JSON_UNESCAPED_SLASHES);
            $values[] = $encoded === false ? '[]' : $encoded;
        }

        if ($fields === []) {
            $this->json(['message' => 'Tidak ada field yang diubah.'], 422);
            return;
        }

        $fields[] = 'updated_at = NOW()';
        $values[] = $id;
        $values[] = (int) $user['id'];

        $statement = $this->db->prepare(
            'UPDATE lowongan SET ' . implode(', ', $fields) . ' WHERE id = ? AND perusahaan_user_id = ?'
        );
        $statement->execute($values);

        if ($statement->rowCount() === 0) {
            $this->json(['message' => 'Lowongan tidak ditemukan.'], 404);
            return;
        }

        $this->show($id);
    }

    public function delete(int $id): void
    {
        $user = (new AuthMiddleware($this->db))->requireAuth('hrd');

        if ($this->db instanceof JsonStore) {
            $deleted = $this->db->transaction(function (array &$data) use ($id, $user): bool {
                foreach ($data['lowongan'] as $index => $item) {
                    if ((int) $item['id'] === $id && (int) $item['perusahaan_user_id'] === (int) $user['id']) {
                        array_splice($data['lowongan'], $index, 1);
                        return true;
                    }
                }

                return false;
            });

            $this->json(['success' => $deleted], $deleted ? 200 : 404);
            return;
        }

        $statement = $this->db->prepare('DELETE FROM lowongan WHERE id = ? AND perusahaan_user_id = ?');
        $statement->execute([$id, (int) $user['id']]);
        $deleted = $statement->rowCount() > 0;

        $this->json(['success' => $deleted], $deleted ? 200 : 404);
    }

    private function lowonganWithCompanies(): array
    {
        if (!$this->db instanceof JsonStore) {
            $statement = $this->db->query(
                "SELECT l.*,
                        p.nama_perusahaan,
                        p.logo
                 FROM lowongan l
                 LEFT JOIN profil_perusahaan p ON p.user_id = l.perusahaan_user_id
                 ORDER BY l.created_at DESC, l.id DESC"
            );

            return array_map([$this, 'normalizeLowonganRow'], $statement->fetchAll());
        }

        $data = $this->db->all();
        $profiles = [];

        foreach ($data['profil_perusahaan'] as $profile) {
            $profiles[(int) $profile['user_id']] = $profile;
        }

        return array_map(function (array $item) use ($profiles): array {
            $profile = $profiles[(int) $item['perusahaan_user_id']] ?? [];
            $item['perusahaan'] = [
                'nama_perusahaan' => $profile['nama_perusahaan'] ?? 'Perusahaan',
                'logo' => $profile['logo'] ?? null,
            ];
            return $item;
        }, $data['lowongan']);
    }

    private function normalizeLowonganRow(array $item): array
    {
        $skills = $item['keahlian_dibutuhkan'] ?? [];
        if (is_string($skills)) {
            $decoded = json_decode($skills, true);
            $skills = is_array($decoded) ? $decoded : [];
        }

        $item['id'] = (int) $item['id'];
        $item['perusahaan_user_id'] = (int) $item['perusahaan_user_id'];
        $item['durasi_bulan'] = (int) $item['durasi_bulan'];
        $item['uang_saku'] = (int) $item['uang_saku'];
        $item['kuota'] = (int) $item['kuota'];
        $item['keahlian_dibutuhkan'] = $skills;
        $item['perusahaan'] = [
            'nama_perusahaan' => $item['nama_perusahaan'] ?? 'Perusahaan',
            'logo' => $item['logo'] ?? null,
        ];
        unset($item['nama_perusahaan'], $item['logo']);

        return $item;
    }

    private function validatePayload(array $payload): void
    {
        foreach (['judul', 'jenis', 'durasi_bulan', 'batas_lamaran'] as $field) {
            if (!isset($payload[$field]) || $payload[$field] === '') {
                $this->json(['message' => "Field {$field} wajib diisi."], 422);
                exit;
            }
        }

        if (!in_array(strtolower((string) $payload['jenis']), ['remote', 'onsite', 'hybrid'], true)) {
            $this->json(['message' => 'Jenis kerja harus remote, onsite, atau hybrid.'], 422);
            exit;
        }
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
