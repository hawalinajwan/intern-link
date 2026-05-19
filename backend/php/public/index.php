<?php

declare(strict_types=1);

require_once __DIR__ . '/../config/cors.php';
require_once __DIR__ . '/../config/database.php';

try {
    $db = Database::connection();
    require __DIR__ . '/../routes/api.php';
} catch (Throwable $error) {
    http_response_code(500);
    header('Content-Type: application/json');
    echo json_encode(['message' => 'Terjadi kesalahan server.'], JSON_UNESCAPED_SLASHES);
}
