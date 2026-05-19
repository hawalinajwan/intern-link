<?php

declare(strict_types=1);

final class JsonStore
{
    private string $path;

    public function __construct(?string $path = null)
    {
        $this->path = $path ?: dirname(__DIR__) . DIRECTORY_SEPARATOR . 'storage' . DIRECTORY_SEPARATOR . 'app.json';
        $dir = dirname($this->path);

        if (!is_dir($dir)) {
            mkdir($dir, 0755, true);
        }

        if (!is_file($this->path)) {
            $this->write($this->initialData());
        }
    }

    public function all(): array
    {
        $raw = file_get_contents($this->path);
        $data = json_decode($raw ?: '', true);

        return is_array($data) ? array_merge($this->initialData(), $data) : $this->initialData();
    }

    public function save(array $data): void
    {
        $this->write(array_merge($this->initialData(), $data));
    }

    public function transaction(callable $callback): mixed
    {
        $data = $this->all();
        $result = $callback($data);
        $this->save($data);

        return $result;
    }

    public function nextId(array &$data, string $table): int
    {
        $data['counters'][$table] = (int) ($data['counters'][$table] ?? 0) + 1;

        return $data['counters'][$table];
    }

    private function write(array $data): void
    {
        file_put_contents($this->path, json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES), LOCK_EX);
    }

    private function initialData(): array
    {
        return [
            'counters' => [
                'users' => 0,
                'profil_mahasiswa' => 0,
                'profil_perusahaan' => 0,
                'auth_tokens' => 0,
                'lowongan' => 0,
                'lamaran' => 0,
            ],
            'users' => [],
            'profil_mahasiswa' => [],
            'profil_perusahaan' => [],
            'auth_tokens' => [],
            'lowongan' => [],
            'lamaran' => [],
        ];
    }
}
