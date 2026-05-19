<?php

declare(strict_types=1);

final class AuthMiddleware
{
    public function __construct(private readonly PDO|JsonStore $db)
    {
    }

    public function requireAuth(?string $requiredRole = null): array
    {
        $token = $this->bearerToken();

        if ($token === null) {
            $this->json(['message' => 'Token autentikasi diperlukan.'], 401);
            exit;
        }

        if ($this->db instanceof JsonStore) {
            $data = $this->db->all();
            $tokenHash = hash('sha256', $token);
            $authToken = null;

            foreach ($data['auth_tokens'] as $candidate) {
                if (($candidate['token_hash'] ?? '') === $tokenHash && empty($candidate['revoked_at'])) {
                    $expiresAt = isset($candidate['expires_at']) ? strtotime((string) $candidate['expires_at']) : null;

                    if ($expiresAt === null || $expiresAt > time()) {
                        $authToken = $candidate;
                        break;
                    }
                }
            }

            if ($authToken === null) {
                $this->json(['message' => 'Token tidak valid atau sudah kedaluwarsa.'], 401);
                exit;
            }

            foreach ($data['users'] as $user) {
                if ((int) ($user['id'] ?? 0) === (int) $authToken['user_id']) {
                    if ($requiredRole !== null && $user['role'] !== $requiredRole) {
                        $this->json(['message' => 'Akses ditolak.'], 403);
                        exit;
                    }

                    return [
                        'id' => (int) $user['id'],
                        'email' => $user['email'],
                        'role' => $user['role'],
                    ];
                }
            }

            $this->json(['message' => 'Token tidak valid atau sudah kedaluwarsa.'], 401);
            exit;
        }

        $statement = $this->db->prepare(
            'SELECT users.id, users.email, users.role
             FROM auth_tokens
             JOIN users ON users.id = auth_tokens.user_id
             WHERE auth_tokens.token_hash = ?
               AND auth_tokens.revoked_at IS NULL
               AND (auth_tokens.expires_at IS NULL OR auth_tokens.expires_at > NOW())
             LIMIT 1'
        );
        $statement->execute([hash('sha256', $token)]);
        $user = $statement->fetch();

        if (!$user) {
            $this->json(['message' => 'Token tidak valid atau sudah kedaluwarsa.'], 401);
            exit;
        }

        if ($requiredRole !== null && $user['role'] !== $requiredRole) {
            $this->json(['message' => 'Akses ditolak.'], 403);
            exit;
        }

        return $user;
    }

    private function bearerToken(): ?string
    {
        $header = $_SERVER['HTTP_AUTHORIZATION']
            ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION']
            ?? null;

        if ($header === null && function_exists('getallheaders')) {
            $headers = getallheaders();
            $header = $headers['Authorization'] ?? $headers['authorization'] ?? null;
        }

        if (!is_string($header) || !preg_match('/^Bearer\s+(.+)$/i', trim($header), $matches)) {
            return null;
        }

        return trim($matches[1]);
    }

    private function json(array $payload, int $status): void
    {
        http_response_code($status);
        header('Content-Type: application/json');
        echo json_encode($payload, JSON_UNESCAPED_SLASHES);
    }
}
