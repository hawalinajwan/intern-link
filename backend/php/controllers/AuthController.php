<?php

declare(strict_types=1);

require_once __DIR__ . '/../models/User.php';

final class AuthController
{
    public function __construct(private readonly PDO|JsonStore $db)
    {
    }

    public function register(): void
    {
        $payload = $this->jsonBody();
        $email = strtolower(trim((string) ($payload['email'] ?? '')));
        $password = (string) ($payload['password'] ?? '');
        $role = strtolower(trim((string) ($payload['role'] ?? '')));

        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            $this->json(['message' => 'Email tidak valid.'], 422);
            return;
        }

        if (strlen($password) < 8) {
            $this->json(['message' => 'Password minimal 8 karakter.'], 422);
            return;
        }

        if (!in_array($role, ['mahasiswa', 'hrd'], true)) {
            $this->json(['message' => 'Role harus mahasiswa atau hrd.'], 422);
            return;
        }

        $users = new User($this->db);

        if ($users->findByEmail($email) !== null) {
            $this->json(['message' => 'Email sudah terdaftar.'], 409);
            return;
        }

        $passwordHash = password_hash($password, PASSWORD_BCRYPT);
        $user = $users->createWithProfile($email, $passwordHash, $role);
        $token = $users->createBearerToken((int) $user['id']);
        $profile = $users->findProfile((int) $user['id'], $role);

        $this->json([
            'user_id' => (int) $user['id'],
            'role' => $role,
            'token' => $token,
            'token_type' => 'Bearer',
            'profile' => $profile,
        ], 201);
    }

    public function login(): void
    {
        $payload = $this->jsonBody();
        $email = strtolower(trim((string) ($payload['email'] ?? '')));
        $password = (string) ($payload['password'] ?? '');

        if (!filter_var($email, FILTER_VALIDATE_EMAIL) || $password === '') {
            $this->json(['message' => 'Email atau password salah.'], 401);
            return;
        }

        $users = new User($this->db);
        $user = $users->findByEmail($email);

        if ($user === null || !password_verify($password, (string) $user['password_hash'])) {
            $this->json(['message' => 'Email atau password salah.'], 401);
            return;
        }

        $token = $users->createBearerToken((int) $user['id']);
        $profile = $users->findProfile((int) $user['id'], (string) $user['role']);

        $this->json([
            'user_id' => (int) $user['id'],
            'role' => $user['role'],
            'token' => $token,
            'token_type' => 'Bearer',
            'profile' => $profile,
        ]);
    }

    private function jsonBody(): array
    {
        $rawBody = file_get_contents('php://input') ?: '';
        $payload = json_decode($rawBody, true);

        if (!is_array($payload)) {
            $this->json(['message' => 'Body JSON tidak valid.'], 400);
            exit;
        }

        return $payload;
    }

    private function json(array $payload, int $status = 200): void
    {
        http_response_code($status);
        header('Content-Type: application/json');
        echo json_encode($payload, JSON_UNESCAPED_SLASHES);
    }
}
