CREATE TABLE IF NOT EXISTS users (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('mahasiswa', 'hrd') NOT NULL,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS profil_mahasiswa (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL UNIQUE,
  nama_lengkap VARCHAR(255) NULL,
  universitas VARCHAR(255) NULL,
  jurusan VARCHAR(255) NULL,
  semester TINYINT UNSIGNED NULL,
  skills JSON NULL,
  bio TEXT NULL,
  cv_filename VARCHAR(255) NULL,
  cv_original_name VARCHAR(255) NULL,
  cv_uploaded_at TIMESTAMP NULL,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT profil_mahasiswa_user_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS profil_perusahaan (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL UNIQUE,
  nama_perusahaan VARCHAR(255) NULL,
  industri VARCHAR(255) NULL,
  website VARCHAR(255) NULL,
  logo VARCHAR(255) NULL,
  deskripsi TEXT NULL,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT profil_perusahaan_user_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS auth_tokens (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  token_hash CHAR(64) NOT NULL UNIQUE,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NULL,
  revoked_at TIMESTAMP NULL,
  CONSTRAINT auth_tokens_user_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX auth_tokens_user_id_index (user_id),
  INDEX auth_tokens_token_hash_index (token_hash)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS lowongan (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  perusahaan_user_id BIGINT UNSIGNED NOT NULL,
  judul VARCHAR(255) NOT NULL,
  deskripsi TEXT NULL,
  persyaratan TEXT NULL,
  jenis ENUM('remote', 'onsite', 'hybrid') NOT NULL,
  durasi_bulan TINYINT UNSIGNED NOT NULL,
  uang_saku INT UNSIGNED DEFAULT 0,
  kuota INT UNSIGNED DEFAULT 0,
  batas_lamaran DATE NOT NULL,
  keahlian_dibutuhkan JSON NULL,
  status ENUM('aktif', 'ditutup') NOT NULL DEFAULT 'aktif',
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT lowongan_perusahaan_user_fk FOREIGN KEY (perusahaan_user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX lowongan_status_index (status),
  INDEX lowongan_jenis_index (jenis)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS lamaran (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  mahasiswa_user_id BIGINT UNSIGNED NOT NULL,
  lowongan_id BIGINT UNSIGNED NOT NULL,
  surat_motivasi TEXT NOT NULL,
  status ENUM('pending', 'ditinjau', 'dipanggil', 'diterima', 'ditolak') NOT NULL DEFAULT 'pending',
  catatan_hrd TEXT NULL,
  chat_room_id VARCHAR(255) NULL,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT lamaran_mahasiswa_user_fk FOREIGN KEY (mahasiswa_user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT lamaran_lowongan_fk FOREIGN KEY (lowongan_id) REFERENCES lowongan(id) ON DELETE CASCADE,
  UNIQUE KEY lamaran_unique_user_lowongan (mahasiswa_user_id, lowongan_id),
  INDEX lamaran_status_index (status),
  INDEX lamaran_lowongan_index (lowongan_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
