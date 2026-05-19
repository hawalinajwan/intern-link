<?php

declare(strict_types=1);

require_once __DIR__ . '/../middleware/AuthMiddleware.php';

final class CVController
{
    private const MAX_FILE_SIZE = 5 * 1024 * 1024;

    public function __construct(private readonly PDO|JsonStore $db)
    {
    }

    public function upload(): void
    {
        $currentUser = (new AuthMiddleware($this->db))->requireAuth('mahasiswa');
        $file = $_FILES['file'] ?? $_FILES['cv'] ?? null;

        if (!is_array($file)) {
            $this->json(['message' => 'File CV wajib dikirim.'], 422);
            return;
        }

        if (($file['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
            $this->json(['message' => $this->uploadErrorMessage((int) $file['error'])], 422);
            return;
        }

        $tmpName = (string) ($file['tmp_name'] ?? '');
        $size = (int) ($file['size'] ?? 0);
        $originalName = $this->cleanOriginalName((string) ($file['name'] ?? 'cv.pdf'));

        if ($size <= 0 || $size > self::MAX_FILE_SIZE) {
            $this->json(['message' => 'Ukuran CV maksimal 5MB.'], 422);
            return;
        }

        if (!is_uploaded_file($tmpName)) {
            $this->json(['message' => 'Upload file tidak valid.'], 422);
            return;
        }

        $mimeType = $this->detectMimeType($tmpName);

        if ($mimeType !== 'application/pdf') {
            $this->json(['message' => 'CV harus berupa file PDF asli.'], 422);
            return;
        }

        $uploadDir = $this->uploadDirectory();
        $filename = sprintf('cv_%d_%d.pdf', (int) $currentUser['id'], time());
        $destination = $uploadDir . DIRECTORY_SEPARATOR . $filename;

        if (!move_uploaded_file($tmpName, $destination)) {
            $this->json(['message' => 'Gagal menyimpan CV.'], 500);
            return;
        }

        $this->updateProfileCv((int) $currentUser['id'], $filename, $originalName);

        $this->json([
            'success' => true,
            'filename' => $filename,
            'original_name' => $originalName,
        ]);
    }

    public function viewByHRD(int $mahasiswaUserId): void
    {
        $currentUser = (new AuthMiddleware($this->db))->requireAuth('hrd');

        if (!$this->db instanceof JsonStore) {
            $statement = $this->db->prepare(
                'SELECT pm.cv_filename, pm.cv_original_name
                 FROM lamaran la
                 JOIN lowongan l ON l.id = la.lowongan_id
                 JOIN profil_mahasiswa pm ON pm.user_id = la.mahasiswa_user_id
                 WHERE la.mahasiswa_user_id = ?
                   AND l.perusahaan_user_id = ?
                 LIMIT 1'
            );
            $statement->execute([$mahasiswaUserId, (int) $currentUser['id']]);
            $profile = $statement->fetch();

            if (!$profile) {
                $this->json(['message' => 'Akses CV ditolak.'], 403);
                return;
            }

            $this->streamProfileCv($profile);
            return;
        }

        $data = $this->db->all();
        $allowed = false;
        foreach ($data['lamaran'] as $lamaran) {
            if ((int) $lamaran['mahasiswa_user_id'] !== $mahasiswaUserId) {
                continue;
            }

            foreach ($data['lowongan'] as $lowongan) {
                if ((int) $lowongan['id'] === (int) $lamaran['lowongan_id'] && (int) $lowongan['perusahaan_user_id'] === (int) $currentUser['id']) {
                    $allowed = true;
                    break 2;
                }
            }
        }

        if (!$allowed) {
            $this->json(['message' => 'Akses CV ditolak.'], 403);
            return;
        }

        $profile = null;
        foreach ($data['profil_mahasiswa'] as $candidate) {
            if ((int) $candidate['user_id'] === $mahasiswaUserId) {
                $profile = $candidate;
                break;
            }
        }

        if (!$profile || empty($profile['cv_filename'])) {
            $this->json(['message' => 'CV belum tersedia.'], 404);
            return;
        }

        $this->streamProfileCv($profile);
    }

    private function streamProfileCv(array $profile): void
    {
        if (empty($profile['cv_filename'])) {
            $this->json(['message' => 'CV belum tersedia.'], 404);
            return;
        }

        $path = $this->uploadDirectory() . DIRECTORY_SEPARATOR . basename((string) $profile['cv_filename']);

        if (!is_file($path)) {
            $this->json(['message' => 'File CV tidak ditemukan.'], 404);
            return;
        }

        header('Content-Type: application/pdf');
        header('Content-Disposition: inline; filename="' . addslashes((string) ($profile['cv_original_name'] ?: 'cv.pdf')) . '"');
        header('Content-Length: ' . filesize($path));
        readfile($path);
    }

    private function updateProfileCv(int $userId, string $filename, string $originalName): void
    {
        if ($this->db instanceof JsonStore) {
            $this->db->transaction(function (array &$data) use ($userId, $filename, $originalName): void {
                foreach ($data['profil_mahasiswa'] as &$profile) {
                    if ((int) ($profile['user_id'] ?? 0) === $userId) {
                        $profile['cv_filename'] = $filename;
                        $profile['cv_original_name'] = $originalName;
                        $profile['cv_uploaded_at'] = date(DATE_ATOM);
                        $profile['updated_at'] = date(DATE_ATOM);
                        return;
                    }
                }
            });
            return;
        }

        $statement = $this->db->prepare(
            'UPDATE profil_mahasiswa
             SET cv_filename = ?, cv_original_name = ?, cv_uploaded_at = NOW(), updated_at = NOW()
             WHERE user_id = ?'
        );
        $statement->execute([$filename, $originalName, $userId]);
    }

    private function uploadDirectory(): string
    {
        $configuredPath = getenv('CV_UPLOAD_DIR') ?: '';
        $uploadDir = $configuredPath !== ''
            ? $configuredPath
            : dirname(__DIR__) . DIRECTORY_SEPARATOR . 'storage' . DIRECTORY_SEPARATOR . 'uploads' . DIRECTORY_SEPARATOR . 'cv';

        if (!is_dir($uploadDir) && !mkdir($uploadDir, 0755, true) && !is_dir($uploadDir)) {
            $this->json(['message' => 'Direktori upload CV tidak tersedia.'], 500);
            exit;
        }

        if (!is_writable($uploadDir)) {
            $this->json(['message' => 'Direktori upload CV tidak bisa ditulis.'], 500);
            exit;
        }

        return $uploadDir;
    }

    private function detectMimeType(string $path): string
    {
        if (!function_exists('finfo_open')) {
            $handle = fopen($path, 'rb');
            $header = $handle ? fread($handle, 4) : '';
            if (is_resource($handle)) {
                fclose($handle);
            }

            return $header === '%PDF' ? 'application/pdf' : '';
        }

        $finfo = finfo_open(FILEINFO_MIME_TYPE);

        if ($finfo === false) {
            return '';
        }

        $mimeType = finfo_file($finfo, $path);
        finfo_close($finfo);

        return is_string($mimeType) ? $mimeType : '';
    }

    private function cleanOriginalName(string $name): string
    {
        $basename = basename($name);
        $clean = preg_replace('/[^A-Za-z0-9._ -]/', '_', $basename);

        return $clean !== null && $clean !== '' ? $clean : 'cv.pdf';
    }

    private function uploadErrorMessage(int $errorCode): string
    {
        return match ($errorCode) {
            UPLOAD_ERR_INI_SIZE, UPLOAD_ERR_FORM_SIZE => 'Ukuran CV maksimal 5MB.',
            UPLOAD_ERR_NO_FILE => 'File CV wajib dikirim.',
            default => 'Upload CV gagal.',
        };
    }

    private function json(array $payload, int $status = 200): void
    {
        http_response_code($status);
        header('Content-Type: application/json');
        echo json_encode($payload, JSON_UNESCAPED_SLASHES);
    }
}
