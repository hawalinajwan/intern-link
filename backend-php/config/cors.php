<?php

declare(strict_types=1);

function corsAllowedOrigin(?string $origin): ?string
{
    if (!is_string($origin) || $origin === '') {
        return null;
    }

    $host = parse_url($origin, PHP_URL_HOST);
    if (!is_string($host) || $host === '') {
        return null;
    }

    $clientUrl = getenv('CLIENT_URL');
    if (is_string($clientUrl) && $clientUrl !== '' && $origin === $clientUrl) {
        return $origin;
    }

    if (str_ends_with($host, '.hawali.site')) {
        return $origin;
    }

    return null;
}

$origin = $_SERVER['HTTP_ORIGIN'] ?? null;
$allowedOrigin = corsAllowedOrigin(is_string($origin) ? $origin : null);

if ($allowedOrigin !== null) {
    header('Access-Control-Allow-Origin: ' . $allowedOrigin);
    header('Vary: Origin');
}

header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Content-Type: application/json');

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'OPTIONS') {
    http_response_code(200);
    exit;
}
