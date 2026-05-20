<?php

declare(strict_types=1);

function requireAuth(PDO $pdo): array
{
    $token = bearerToken();

    if ($token === null) {
        authUnauthorized();
    }

    $statement = $pdo->prepare(
        'SELECT u.*, pm.nama, pm.cv_filename, pp.nama_perusahaan
         FROM users u
         LEFT JOIN profil_mahasiswa pm ON u.id = pm.user_id
         LEFT JOIN profil_perusahaan pp ON u.id = pp.user_id
         WHERE u.session_token = ?
         LIMIT 1'
    );
    $statement->execute([$token]);
    $user = $statement->fetch();

    if (!$user) {
        authUnauthorized();
    }

    return [
        'id' => (int) $user['id'],
        'email' => $user['email'],
        'role' => $user['role'],
        'nama' => $user['nama'] ?: $user['nama_perusahaan'],
        'cv_filename' => $user['cv_filename'] ?? null,
        'nama_perusahaan' => $user['nama_perusahaan'] ?? null,
    ];
}

function bearerToken(): ?string
{
    $header = $_SERVER['HTTP_AUTHORIZATION']
        ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION']
        ?? null;

    if ($header === null && function_exists('getallheaders')) {
        $headers = getallheaders();
        $header = $headers['Authorization'] ?? $headers['authorization'] ?? null;
    }

    if (!is_string($header)) {
        return null;
    }

    $header = trim($header);
    if ($header === '') {
        return null;
    }

    if (preg_match('/^Bearer\s+(.+)$/i', $header, $matches)) {
        return trim($matches[1]);
    }

    return $header;
}

function authUnauthorized(): never
{
    http_response_code(401);
    header('Content-Type: application/json');
    echo json_encode(['success' => false, 'error' => 'Unauthorized'], JSON_UNESCAPED_SLASHES);
    exit;
}
