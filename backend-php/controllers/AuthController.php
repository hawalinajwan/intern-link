<?php

declare(strict_types=1);

require_once __DIR__ . '/../helpers/EmailHelper.php';

final class AuthController
{
    public function __construct(private readonly PDO $db)
    {
    }

    public function register(): void
    {
        $payload = $this->jsonBody();
        $email = strtolower(trim((string) ($payload['email'] ?? '')));
        $password = (string) ($payload['password'] ?? '');
        $role = strtolower((string) ($payload['role'] ?? ''));

        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            $this->json(['success' => false, 'error' => 'Email tidak valid.'], 422);
            return;
        }

        if (strlen($password) < 8) {
            $this->json(['success' => false, 'error' => 'Password minimal 8 karakter.'], 422);
            return;
        }

        if (!in_array($role, ['mahasiswa', 'hrd'], true)) {
            $this->json(['success' => false, 'error' => 'Role tidak valid.'], 422);
            return;
        }

        $exists = $this->db->prepare('SELECT id FROM users WHERE email = ? LIMIT 1');
        $exists->execute([$email]);

        if ($exists->fetch()) {
            $this->json(['success' => false, 'error' => 'Email sudah terdaftar.'], 409);
            return;
        }

        $passwordHash = password_hash($password, PASSWORD_BCRYPT);
        $token = bin2hex(random_bytes(32));

        $this->db->beginTransaction();

        try {
            $insertUser = $this->db->prepare(
                'INSERT INTO users (email, password_hash, session_token, role) VALUES (?, ?, ?, ?)'
            );
            $insertUser->execute([$email, $passwordHash, $token, $role]);
            $userId = (int) $this->db->lastInsertId();

            if ($role === 'mahasiswa') {
                $insertProfile = $this->db->prepare('INSERT INTO profil_mahasiswa (user_id) VALUES (?)');
            } else {
                $insertProfile = $this->db->prepare('INSERT INTO profil_perusahaan (user_id) VALUES (?)');
            }

            $insertProfile->execute([$userId]);
            $this->db->commit();

            $this->json([
                'success' => true,
                'data' => [
                    'user_id' => $userId,
                    'role' => $role,
                    'token' => $token,
                ],
            ], 201);
        } catch (Throwable $error) {
            $this->db->rollBack();
            throw $error;
        }
    }

    public function login(): void
    {
        $payload = $this->jsonBody();
        $email = strtolower(trim((string) ($payload['email'] ?? '')));
        $password = (string) ($payload['password'] ?? '');

        if ($email === '' || $password === '') {
            $this->json(['success' => false, 'error' => 'Email dan password wajib diisi.'], 422);
            return;
        }

        $statement = $this->db->prepare('SELECT * FROM users WHERE email = ? LIMIT 1');
        $statement->execute([$email]);
        $user = $statement->fetch();

        if (!$user || !password_verify($password, (string) $user['password_hash'])) {
            $this->json(['success' => false, 'error' => 'Email atau password salah.'], 401);
            return;
        }

        $token = bin2hex(random_bytes(32));
        $update = $this->db->prepare('UPDATE users SET session_token = ? WHERE id = ?');
        $update->execute([$token, (int) $user['id']]);

        $nama = $this->fetchProfileName((int) $user['id'], (string) $user['role']);

        $this->json([
            'success' => true,
            'data' => [
                'user_id' => (int) $user['id'],
                'role' => $user['role'],
                'token' => $token,
                'nama' => $nama,
            ],
        ]);
    }

    public function forgotPassword(): void
    {
        $payload = $this->jsonBody();
        $email = strtolower(trim((string) ($payload['email'] ?? '')));
        $message = 'Jika email terdaftar, link reset akan dikirim';

        if (filter_var($email, FILTER_VALIDATE_EMAIL)) {
            $statement = $this->db->prepare('SELECT id, email, role FROM users WHERE email = ? LIMIT 1');
            $statement->execute([$email]);
            $user = $statement->fetch();

            if ($user) {
                $token = bin2hex(random_bytes(32));
                $update = $this->db->prepare(
                    'UPDATE users
                     SET reset_token = ?, reset_token_expires_at = DATE_ADD(NOW(), INTERVAL 1 HOUR)
                     WHERE id = ?'
                );
                $update->execute([$token, (int) $user['id']]);

                $name = $this->fetchProfileName((int) $user['id'], (string) $user['role']);
                EmailHelper::sendResetPassword((string) $user['email'], $name ?: 'User', $token);
            }
        }

        $this->json(['success' => true, 'message' => $message]);
    }

    public function resetPassword(): void
    {
        $payload = $this->jsonBody();
        $token = trim((string) ($payload['token'] ?? ''));
        $newPassword = (string) ($payload['new_password'] ?? '');

        if (strlen($newPassword) < 8) {
            $this->json(['success' => false, 'error' => 'Password minimal 8 karakter.'], 422);
            return;
        }

        if ($token === '' || !preg_match('/^[a-f0-9]{64}$/', $token)) {
            $this->json(['success' => false, 'error' => 'Link tidak valid atau sudah kadaluarsa'], 400);
            return;
        }

        $statement = $this->db->prepare(
            'SELECT id FROM users WHERE reset_token = ? AND reset_token_expires_at > NOW() LIMIT 1'
        );
        $statement->execute([$token]);
        $user = $statement->fetch();

        if (!$user) {
            $this->json(['success' => false, 'error' => 'Link tidak valid atau sudah kadaluarsa'], 400);
            return;
        }

        $passwordHash = password_hash($newPassword, PASSWORD_BCRYPT);
        $update = $this->db->prepare(
            'UPDATE users
             SET password_hash = ?, reset_token = NULL, reset_token_expires_at = NULL, session_token = NULL
             WHERE id = ?'
        );
        $update->execute([$passwordHash, (int) $user['id']]);

        $this->json(['success' => true, 'message' => 'Password berhasil direset. Silakan login.']);
    }

    private function fetchProfileName(int $userId, string $role): ?string
    {
        if ($role === 'mahasiswa') {
            $statement = $this->db->prepare('SELECT nama FROM profil_mahasiswa WHERE user_id = ? LIMIT 1');
        } else {
            $statement = $this->db->prepare('SELECT nama_perusahaan AS nama FROM profil_perusahaan WHERE user_id = ? LIMIT 1');
        }

        $statement->execute([$userId]);
        $profile = $statement->fetch();

        return $profile ? $profile['nama'] : null;
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
