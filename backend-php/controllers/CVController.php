<?php

declare(strict_types=1);

require_once __DIR__ . '/../middleware/AuthMiddleware.php';

final class CVController
{
    private const MAX_SIZE = 5 * 1024 * 1024;
    private const PDF_MIME = 'application/pdf';

    public function __construct(private readonly PDO $db)
    {
    }

    public function upload(): void
    {
        $user = (new AuthMiddleware($this->db))->requireAuth('mahasiswa');

        if (!isset($_FILES['cv']) || !is_array($_FILES['cv'])) {
            $this->json(['success' => false, 'error' => 'File CV wajib dikirim.'], 422);
            return;
        }

        $file = $_FILES['cv'];
        if (($file['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
            $this->json(['success' => false, 'error' => 'Upload CV gagal.'], 422);
            return;
        }

        if ((int) ($file['size'] ?? 0) > self::MAX_SIZE) {
            $this->json(['success' => false, 'error' => 'Ukuran CV maksimal 5MB.'], 422);
            return;
        }

        $tmpName = (string) ($file['tmp_name'] ?? '');
        $mime = $this->detectMime($tmpName);
        if ($mime !== self::PDF_MIME) {
            $this->json(['success' => false, 'error' => 'CV harus berupa file PDF.'], 422);
            return;
        }

        $uploadDir = $this->uploadDir();
        $timestamp = time();
        $filename = "cv_{$user['id']}_{$timestamp}.pdf";
        $destination = $uploadDir . $filename;

        if (!move_uploaded_file($tmpName, $destination)) {
            $this->json(['success' => false, 'error' => 'Gagal menyimpan CV.'], 500);
            return;
        }

        $originalName = $this->cleanOriginalName((string) ($file['name'] ?? 'cv.pdf'));
        $statement = $this->db->prepare(
            'UPDATE profil_mahasiswa
             SET cv_filename = ?, cv_original_name = ?, cv_uploaded_at = NOW()
             WHERE user_id = ?'
        );
        $statement->execute([$filename, $originalName, $user['id']]);

        $uploadedAt = $this->db->prepare('SELECT cv_uploaded_at FROM profil_mahasiswa WHERE user_id = ? LIMIT 1');
        $uploadedAt->execute([$user['id']]);
        $profile = $uploadedAt->fetch();

        $this->json([
            'success' => true,
            'data' => [
                'filename' => $filename,
                'original_name' => $originalName,
                'uploaded_at' => $profile['cv_uploaded_at'] ?? null,
            ],
        ]);
    }

    public function viewByHRD(int $mahasiswaUserId): void
    {
        $user = (new AuthMiddleware($this->db))->requireAuth('hrd');

        $allowed = $this->db->prepare(
            'SELECT la.id
             FROM lamaran la
             JOIN lowongan l ON la.lowongan_id = l.id
             WHERE la.mahasiswa_user_id = :mahasiswaId
               AND l.perusahaan_user_id = :hrdId
             LIMIT 1'
        );
        $allowed->execute([
            ':mahasiswaId' => $mahasiswaUserId,
            ':hrdId' => $user['id'],
        ]);

        if (!$allowed->fetch()) {
            $this->json(['success' => false, 'error' => 'Forbidden'], 403);
            exit;
        }

        $statement = $this->db->prepare('SELECT cv_filename FROM profil_mahasiswa WHERE user_id = :mahasiswaId LIMIT 1');
        $statement->execute([':mahasiswaId' => $mahasiswaUserId]);
        $profile = $statement->fetch();

        if (!$profile || empty($profile['cv_filename'])) {
            $this->json(['success' => false, 'error' => 'CV tidak ditemukan.'], 404);
            exit;
        }

        $filepath = $this->uploadDir() . basename((string) $profile['cv_filename']);
        if (!is_file($filepath)) {
            $this->json(['success' => false, 'error' => 'File CV tidak ditemukan.'], 404);
            exit;
        }

        header('Content-Type: application/pdf');
        header('Content-Disposition: inline; filename="cv.pdf"');
        header('Content-Length: ' . filesize($filepath));
        readfile($filepath);
        exit;
    }

    public function downloadOwn(): void
    {
        $user = (new AuthMiddleware($this->db))->requireAuth('mahasiswa');
        $statement = $this->db->prepare(
            'SELECT cv_filename, cv_original_name FROM profil_mahasiswa WHERE user_id = ? LIMIT 1'
        );
        $statement->execute([$user['id']]);
        $profile = $statement->fetch();

        if (!$profile || empty($profile['cv_filename'])) {
            $this->json(['success' => false, 'error' => 'CV tidak ditemukan.'], 404);
            exit;
        }

        $filepath = $this->uploadDir() . basename((string) $profile['cv_filename']);
        if (!is_file($filepath)) {
            $this->json(['success' => false, 'error' => 'File CV tidak ditemukan.'], 404);
            exit;
        }

        $downloadName = $this->cleanOriginalName((string) ($profile['cv_original_name'] ?: 'cv.pdf'));
        header('Content-Type: application/pdf');
        header('Content-Disposition: attachment; filename="' . addslashes($downloadName) . '"');
        header('Content-Length: ' . filesize($filepath));
        readfile($filepath);
        exit;
    }

    public function profile(): void
    {
        $user = (new AuthMiddleware($this->db))->requireAuth('mahasiswa');
        $statement = $this->db->prepare(
            'SELECT user_id, nama, universitas, jurusan, semester, bio, skills,
                    cv_filename, cv_original_name, cv_uploaded_at
             FROM profil_mahasiswa
             WHERE user_id = ?
             LIMIT 1'
        );
        $statement->execute([$user['id']]);
        $profile = $statement->fetch();

        if (!$profile) {
            $this->json(['success' => false, 'error' => 'Profil tidak ditemukan.'], 404);
            return;
        }

        $profile['user_id'] = (int) $profile['user_id'];
        $profile['semester'] = $profile['semester'] !== null ? (int) $profile['semester'] : null;
        $profile['skills'] = $this->decodeJsonArray($profile['skills'] ?? null);

        $this->json(['success' => true, 'data' => $profile]);
    }

    public function updateProfile(): void
    {
        $user = (new AuthMiddleware($this->db))->requireAuth('mahasiswa');
        $payload = $this->jsonBody();
        $fields = [];
        $values = [];

        foreach (['nama', 'universitas', 'jurusan', 'bio'] as $field) {
            if (array_key_exists($field, $payload)) {
                $fields[] = "{$field} = ?";
                $values[] = $this->nullableString($payload[$field]);
            }
        }

        if (array_key_exists('semester', $payload)) {
            $fields[] = 'semester = ?';
            $values[] = $payload['semester'] === null || $payload['semester'] === '' ? null : (int) $payload['semester'];
        }

        if (array_key_exists('skills', $payload)) {
            $fields[] = 'skills = ?';
            $values[] = $this->jsonArray($payload['skills']);
        }

        if ($fields === []) {
            $this->json(['success' => false, 'error' => 'Tidak ada field yang diubah.'], 422);
            return;
        }

        $values[] = $user['id'];
        $statement = $this->db->prepare(
            'UPDATE profil_mahasiswa SET ' . implode(', ', $fields) . ' WHERE user_id = ?'
        );
        $statement->execute($values);

        $this->json(['success' => true]);
    }

    public function companyProfile(): void
    {
        $user = (new AuthMiddleware($this->db))->requireAuth('hrd');
        $statement = $this->db->prepare(
            'SELECT user_id, nama_perusahaan, industri, website, logo_url
             FROM profil_perusahaan
             WHERE user_id = ?
             LIMIT 1'
        );
        $statement->execute([$user['id']]);
        $profile = $statement->fetch();

        if (!$profile) {
            $this->json(['success' => false, 'error' => 'Profil perusahaan tidak ditemukan.'], 404);
            return;
        }

        $profile['user_id'] = (int) $profile['user_id'];
        $this->json(['success' => true, 'data' => $profile]);
    }

    public function updateCompanyProfile(): void
    {
        $user = (new AuthMiddleware($this->db))->requireAuth('hrd');
        $payload = $this->jsonBody();
        $fields = [];
        $values = [];

        foreach (['nama_perusahaan', 'industri', 'website', 'logo_url'] as $field) {
            if (array_key_exists($field, $payload)) {
                $fields[] = "{$field} = ?";
                $values[] = $this->nullableString($payload[$field]);
            }
        }

        if ($fields === []) {
            $this->json(['success' => false, 'error' => 'Tidak ada field yang diubah.'], 422);
            return;
        }

        $values[] = $user['id'];
        $statement = $this->db->prepare(
            'UPDATE profil_perusahaan SET ' . implode(', ', $fields) . ' WHERE user_id = ?'
        );
        $statement->execute($values);

        $this->json(['success' => true]);
    }

    private function detectMime(string $path): string
    {
        $finfo = finfo_open(FILEINFO_MIME_TYPE);
        if ($finfo === false) {
            return '';
        }

        $mime = finfo_file($finfo, $path);
        finfo_close($finfo);

        return is_string($mime) ? $mime : '';
    }

    private function uploadDir(): string
    {
        $configured = getenv('UPLOAD_DIR');
        $path = is_string($configured) && trim($configured) !== ''
            ? trim($configured)
            : (__DIR__ . '/../uploads/cv');

        if (!$this->isAbsolutePath($path)) {
            $this->json(['success' => false, 'error' => 'UPLOAD_DIR harus berupa path absolut.'], 500);
            exit;
        }

        $dir = realpath($path);
        if ($dir === false) {
            if (!mkdir($path, 0755, true) && !is_dir($path)) {
                $this->json(['success' => false, 'error' => 'Direktori upload tidak tersedia.'], 500);
                exit;
            }
            $dir = realpath($path);
        }

        if ($dir === false || !is_writable($dir)) {
            $this->json(['success' => false, 'error' => 'Direktori upload tidak bisa ditulis.'], 500);
            exit;
        }

        return rtrim($dir, DIRECTORY_SEPARATOR) . DIRECTORY_SEPARATOR;
    }

    private function isAbsolutePath(string $path): bool
    {
        return preg_match('/^(?:[A-Za-z]:\\\\|\/)/', $path) === 1;
    }

    private function cleanOriginalName(string $name): string
    {
        $basename = basename($name);
        $clean = preg_replace('/[^A-Za-z0-9._ -]/', '_', $basename);

        return $clean !== null && $clean !== '' ? $clean : 'cv.pdf';
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
