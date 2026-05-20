<?php

declare(strict_types=1);

final class Database
{
    private static ?PDO $connection = null;

    public static function connection(): PDO
    {
        if (self::$connection instanceof PDO) {
            return self::$connection;
        }

        $host = self::requireEnv('DB_HOST');
        $name = self::requireEnv('DB_NAME');
        $user = self::requireEnv('DB_USER');
        $password = self::envOrEmpty('DB_PASS');

        $dsn = "mysql:host={$host};dbname={$name};charset=utf8mb4";

        self::$connection = new PDO($dsn, $user, $password, [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
        ]);

        return self::$connection;
    }

    private static function requireEnv(string $name): string
    {
        $value = getenv($name);
        if (!is_string($value) || trim($value) === '') {
            throw new RuntimeException($name . ' is required.');
        }

        return $value;
    }

    private static function envOrEmpty(string $name): string
    {
        $value = getenv($name);
        return is_string($value) ? $value : '';
    }
}
