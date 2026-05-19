<?php

declare(strict_types=1);

require_once __DIR__ . '/JsonStore.php';

final class Database
{
    private static PDO|JsonStore|null $connection = null;

    public static function connection(): PDO|JsonStore
    {
        if (self::$connection instanceof PDO || self::$connection instanceof JsonStore) {
            return self::$connection;
        }

        $driver = getenv('DB_CONNECTION') ?: 'auto';

        if ($driver === 'json' || !in_array('mysql', PDO::getAvailableDrivers(), true)) {
            self::$connection = new JsonStore();
            return self::$connection;
        }

        $host = getenv('DB_HOST') ?: '127.0.0.1';
        $port = getenv('DB_PORT') ?: '3306';
        $name = getenv('DB_NAME') ?: (getenv('DB_DATABASE') ?: 'magang_db');
        $user = getenv('DB_USER') ?: (getenv('DB_USERNAME') ?: 'root');
        $password = getenv('DB_PASS') ?: (getenv('DB_PASSWORD') ?: '');

        $dsn = "mysql:host={$host};port={$port};dbname={$name};charset=utf8mb4";

        self::$connection = new PDO($dsn, $user, $password, [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
        ]);

        return self::$connection;
    }
}
