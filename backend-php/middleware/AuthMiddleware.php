<?php

declare(strict_types=1);

require_once __DIR__ . '/auth.php';

final class AuthMiddleware
{
    public function __construct(private readonly PDO $db)
    {
    }

    public function requireAuth(?string $requiredRole = null): array
    {
        $user = requireAuth($this->db);

        if ($requiredRole !== null && ($user['role'] ?? null) !== $requiredRole) {
            $this->json(['success' => false, 'error' => 'Forbidden'], 403);
            exit;
        }

        return $user;
    }

    private function json(array $payload, int $status): void
    {
        http_response_code($status);
        header('Content-Type: application/json');
        echo json_encode($payload, JSON_UNESCAPED_SLASHES);
    }
}
