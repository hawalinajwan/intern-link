CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  session_token VARCHAR(64),
  role ENUM('mahasiswa','hrd') NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS profil_mahasiswa (
  user_id INT PRIMARY KEY,
  nama VARCHAR(255),
  universitas VARCHAR(255),
  jurusan VARCHAR(255),
  semester INT,
  bio TEXT,
  skills JSON,
  cv_filename VARCHAR(255),
  cv_original_name VARCHAR(255),
  cv_uploaded_at TIMESTAMP NULL,
  CONSTRAINT fk_profil_mahasiswa_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE users ADD COLUMN reset_token VARCHAR(64) NULL;
ALTER TABLE users ADD COLUMN reset_token_expires_at TIMESTAMP NULL;

CREATE TABLE IF NOT EXISTS profil_perusahaan (
  user_id INT PRIMARY KEY,
  nama_perusahaan VARCHAR(255),
  industri VARCHAR(255),
  website VARCHAR(255),
  logo_url VARCHAR(255),
  CONSTRAINT fk_profil_perusahaan_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS lowongan (
  id INT AUTO_INCREMENT PRIMARY KEY,
  perusahaan_user_id INT NOT NULL,
  judul VARCHAR(255) NOT NULL,
  deskripsi TEXT,
  persyaratan TEXT,
  keahlian_dibutuhkan JSON,
  jenis ENUM('remote','onsite','hybrid') NOT NULL,
  durasi_bulan INT,
  uang_saku INT,
  kuota INT DEFAULT 10,
  batas_lamaran DATE,
  status ENUM('aktif','ditutup') DEFAULT 'aktif',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_lowongan_perusahaan_user
    FOREIGN KEY (perusahaan_user_id) REFERENCES users(id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS lamaran (
  id INT AUTO_INCREMENT PRIMARY KEY,
  mahasiswa_user_id INT NOT NULL,
  lowongan_id INT NOT NULL,
  surat_motivasi TEXT NOT NULL,
  status ENUM('pending','ditinjau','dipanggil','diterima','ditolak') DEFAULT 'pending',
  catatan_hrd TEXT,
  chat_room_id VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_apply (mahasiswa_user_id, lowongan_id),
  CONSTRAINT fk_lamaran_mahasiswa_user
    FOREIGN KEY (mahasiswa_user_id) REFERENCES users(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_lamaran_lowongan
    FOREIGN KEY (lowongan_id) REFERENCES lowongan(id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
