<?php

declare(strict_types=1);

require_once __DIR__ . '/config/load-env.php';
require_once __DIR__ . '/config/cors.php';
require_once __DIR__ . '/config/database.php';
require_once __DIR__ . '/controllers/AuthController.php';
require_once __DIR__ . '/controllers/CVController.php';
require_once __DIR__ . '/controllers/LamaranController.php';
require_once __DIR__ . '/controllers/LowonganController.php';

try {
    $db = Database::connection();
    $authController = new AuthController($db);
    $cvController = new CVController($db);
    $lamaranController = new LamaranController($db);
    $lowonganController = new LowonganController($db);
    $method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
    $path = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';
    $path = rtrim($path, '/') ?: '/';

    if ($method === 'POST' && $path === '/auth/register') {
        $authController->register();
        return;
    }

    if ($method === 'GET' && $path === '/health') {
        header('Content-Type: application/json');
        echo json_encode(['success' => true, 'data' => ['status' => 'ok']], JSON_UNESCAPED_SLASHES);
        return;
    }

    if ($method === 'POST' && $path === '/auth/login') {
        $authController->login();
        return;
    }

    if ($method === 'POST' && $path === '/auth/forgot-password') {
        $authController->forgotPassword();
        return;
    }

    if ($method === 'POST' && $path === '/auth/reset-password') {
        $authController->resetPassword();
        return;
    }

    if ($method === 'POST' && $path === '/mahasiswa/cv/upload') {
        $cvController->upload();
        return;
    }

    if ($method === 'GET' && $path === '/mahasiswa/cv/download') {
        $cvController->downloadOwn();
        return;
    }

    if ($method === 'GET' && preg_match('#^/hrd/cv/(\d+)$#', $path, $matches)) {
        $cvController->viewByHRD((int) $matches[1]);
        return;
    }

    if ($method === 'GET' && $path === '/mahasiswa/profil') {
        $cvController->profile();
        return;
    }

    if ($method === 'PUT' && $path === '/mahasiswa/profil') {
        $cvController->updateProfile();
        return;
    }

    if ($method === 'GET' && $path === '/hrd/profil') {
        $cvController->companyProfile();
        return;
    }

    if ($method === 'PUT' && $path === '/hrd/profil') {
        $cvController->updateCompanyProfile();
        return;
    }

    if ($method === 'GET' && $path === '/lowongan') {
        $lowonganController->index($_GET);
        return;
    }

    if ($method === 'GET' && preg_match('#^/lowongan/(\d+)$#', $path, $matches)) {
        $lowonganController->show((int) $matches[1]);
        return;
    }

    if ($method === 'GET' && $path === '/hrd/lowongan') {
        $lowonganController->ownedIndex();
        return;
    }

    if ($method === 'POST' && $path === '/lamaran') {
        $lamaranController->create();
        return;
    }

    if ($method === 'GET' && $path === '/mahasiswa/lamaran') {
        $lamaranController->mine();
        return;
    }

    if ($method === 'GET' && preg_match('#^/hrd/lowongan/(\d+)/pelamar$#', $path, $matches)) {
        $lamaranController->applicants((int) $matches[1]);
        return;
    }

    if ($method === 'PUT' && preg_match('#^/hrd/lamaran/(\d+)/status$#', $path, $matches)) {
        $lamaranController->updateStatus((int) $matches[1]);
        return;
    }

    if ($method === 'POST' && $path === '/hrd/lowongan') {
        $lowonganController->create();
        return;
    }

    if ($method === 'PUT' && preg_match('#^/hrd/lowongan/(\d+)$#', $path, $matches)) {
        $lowonganController->update((int) $matches[1]);
        return;
    }

    if ($method === 'DELETE' && preg_match('#^/hrd/lowongan/(\d+)$#', $path, $matches)) {
        $lowonganController->delete((int) $matches[1]);
        return;
    }

    http_response_code(404);
    header('Content-Type: application/json');
    echo json_encode(['success' => false, 'error' => 'Endpoint tidak ditemukan.'], JSON_UNESCAPED_SLASHES);
} catch (Throwable $error) {
    error_log((string) $error);
    http_response_code(500);
    header('Content-Type: application/json');
    echo json_encode(['success' => false, 'error' => 'Terjadi kesalahan server.'], JSON_UNESCAPED_SLASHES);
}
