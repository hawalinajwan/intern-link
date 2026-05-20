<?php

declare(strict_types=1);

loadEnvFile(__DIR__ . '/../.env');
loadEnvFile(__DIR__ . '/../../.env');

function loadEnvFile(string $path): void
{
    if (!is_file($path) || !is_readable($path)) {
        return;
    }

    $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    if ($lines === false) {
        return;
    }

    foreach ($lines as $line) {
        $trimmed = trim($line);
        if ($trimmed === '' || str_starts_with($trimmed, '#')) {
            continue;
        }

        [$name, $value] = array_pad(explode('=', $trimmed, 2), 2, '');
        $name = trim($name);
        if ($name === '') {
            continue;
        }

        if (getenv($name) !== false) {
            continue;
        }

        $value = trim($value);
        putenv($name . '=' . $value);
        $_ENV[$name] = $value;
        $_SERVER[$name] = $value;
    }
}
