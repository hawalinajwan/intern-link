<?php

declare(strict_types=1);

final class User
{
    public function __construct(private readonly PDO|JsonStore $db)
    {
    }

    public function findByEmail(string $email): ?array
    {
        if ($this->db instanceof JsonStore) {
            $data = $this->db->all();

            foreach ($data['users'] as $user) {
                if (($user['email'] ?? '') === $email) {
                    return $user;
                }
            }

            return null;
        }

        $statement = $this->db->prepare('SELECT * FROM users WHERE email = ? LIMIT 1');
        $statement->execute([$email]);
        $user = $statement->fetch();

        return $user ?: null;
    }

    public function findProfile(int $userId, string $role): array
    {
        if ($this->db instanceof JsonStore) {
            $data = $this->db->all();
            $table = $role === 'mahasiswa' ? 'profil_mahasiswa' : 'profil_perusahaan';

            foreach ($data[$table] as $profile) {
                if ((int) ($profile['user_id'] ?? 0) === $userId) {
                    return $profile;
                }
            }

            return [];
        }

        if ($role === 'mahasiswa') {
            $statement = $this->db->prepare('SELECT * FROM profil_mahasiswa WHERE user_id = ? LIMIT 1');
        } else {
            $statement = $this->db->prepare('SELECT * FROM profil_perusahaan WHERE user_id = ? LIMIT 1');
        }

        $statement->execute([$userId]);

        return $statement->fetch() ?: [];
    }

    public function createWithProfile(string $email, string $passwordHash, string $role): array
    {
        if ($this->db instanceof JsonStore) {
            return $this->db->transaction(function (array &$data) use ($email, $passwordHash, $role): array {
                $now = date(DATE_ATOM);
                $userId = $this->db->nextId($data, 'users');
                $user = [
                    'id' => $userId,
                    'email' => $email,
                    'password_hash' => $passwordHash,
                    'role' => $role,
                    'created_at' => $now,
                    'updated_at' => $now,
                ];

                $data['users'][] = $user;

                if ($role === 'mahasiswa') {
                    $data['profil_mahasiswa'][] = [
                        'id' => $this->db->nextId($data, 'profil_mahasiswa'),
                        'user_id' => $userId,
                        'nama_lengkap' => null,
                        'universitas' => null,
                        'jurusan' => null,
                        'semester' => null,
                        'skills' => [],
                        'bio' => null,
                        'cv_filename' => null,
                        'cv_original_name' => null,
                        'cv_uploaded_at' => null,
                        'created_at' => $now,
                        'updated_at' => $now,
                    ];
                } else {
                    $data['profil_perusahaan'][] = [
                        'id' => $this->db->nextId($data, 'profil_perusahaan'),
                        'user_id' => $userId,
                        'nama_perusahaan' => null,
                        'industri' => null,
                        'website' => null,
                        'logo' => null,
                        'deskripsi' => null,
                        'created_at' => $now,
                        'updated_at' => $now,
                    ];
                }

                return $user;
            });
        }

        $this->db->beginTransaction();

        try {
            $statement = $this->db->prepare(
                'INSERT INTO users (email, password_hash, role, created_at, updated_at) VALUES (?, ?, ?, NOW(), NOW())'
            );
            $statement->execute([$email, $passwordHash, $role]);

            $userId = (int) $this->db->lastInsertId();

            if ($role === 'mahasiswa') {
                $profileStatement = $this->db->prepare(
                    'INSERT INTO profil_mahasiswa (user_id, created_at, updated_at) VALUES (?, NOW(), NOW())'
                );
            } else {
                $profileStatement = $this->db->prepare(
                    'INSERT INTO profil_perusahaan (user_id, created_at, updated_at) VALUES (?, NOW(), NOW())'
                );
            }

            $profileStatement->execute([$userId]);
            $this->db->commit();

            return [
                'id' => $userId,
                'email' => $email,
                'role' => $role,
            ];
        } catch (Throwable $error) {
            $this->db->rollBack();
            throw $error;
        }
    }

    public function createBearerToken(int $userId): string
    {
        $token = bin2hex(random_bytes(32));
        $tokenHash = hash('sha256', $token);

        if ($this->db instanceof JsonStore) {
            $this->db->transaction(function (array &$data) use ($userId, $tokenHash): void {
                $data['auth_tokens'][] = [
                    'id' => $this->db->nextId($data, 'auth_tokens'),
                    'user_id' => $userId,
                    'token_hash' => $tokenHash,
                    'created_at' => date(DATE_ATOM),
                    'expires_at' => date(DATE_ATOM, time() + (30 * 24 * 60 * 60)),
                    'revoked_at' => null,
                ];
            });

            return $token;
        }

        $statement = $this->db->prepare(
            'INSERT INTO auth_tokens (user_id, token_hash, created_at, expires_at) VALUES (?, ?, NOW(), DATE_ADD(NOW(), INTERVAL 30 DAY))'
        );
        $statement->execute([$userId, $tokenHash]);

        return $token;
    }
}
