# intern-link Web Documentation

`intern-link` adalah platform rekrutmen magang untuk menghubungkan mahasiswa dengan HRD/perusahaan. Frontend berjalan dengan Next.js, API utama memakai PHP + MySQL, sedangkan chat interview real-time memakai Node.js + Socket.IO + MongoDB.

## 1. Ringkasan Sistem

### Tujuan

- Mahasiswa dapat mencari lowongan magang, melengkapi profil, upload CV, melamar, memantau status, dan chat interview.
- HRD dapat mengelola profil perusahaan, membuat lowongan, melihat pelamar, preview CV, mengubah status lamaran, dan chat dengan kandidat yang dipanggil.

### Role Pengguna

| Role | Fungsi utama |
| --- | --- |
| Mahasiswa | Browse lowongan, upload CV, apply, tracking status, chat interview |
| HRD | Kelola lowongan, review pelamar, lihat CV, update status, chat interview |

## 2. Arsitektur

```text
Browser
  -> Next.js frontend
  -> PHP REST API
  -> MySQL magang_db

Browser
  -> Next.js frontend
  -> Node Socket.IO chat server
  -> MongoDB magang_chat
```

Production saat ini:

```text
Frontend Vercel:
https://intern-link.hawali.site

PHP API via Cloudflare Tunnel:
https://intern-link-php.hawali.site -> localhost:8000

Node chat via Cloudflare Tunnel:
https://intern-link-node.hawali.site -> localhost:3000

Database di Mac:
MySQL localhost:3306
MongoDB localhost:27017
```

Frontend tidak connect langsung ke database. Semua akses data melewati PHP API atau Node chat server.

## 3. Halaman Web

### Public

| Route | Fungsi |
| --- | --- |
| `/` | Landing/entry page |
| `/auth/register` | Registrasi mahasiswa atau HRD |
| `/auth/login` | Login |
| `/auth/forgot-password` | Request reset password |
| `/auth/reset-password` | Set password baru |
| `/akses-ditolak` | Halaman forbidden |
| `/tidak-ditemukan` | Halaman not found |

### Mahasiswa

| Route | Fungsi |
| --- | --- |
| `/mahasiswa/dashboard` | Ringkasan status lamaran mahasiswa |
| `/mahasiswa/profil` | Edit profil mahasiswa dan upload CV PDF |
| `/mahasiswa/lowongan` | Browse dan filter lowongan |
| `/mahasiswa/lowongan/[id]` | Detail lowongan dan form lamar |
| `/mahasiswa/lamaran` | Daftar lamaran dan status |
| `/mahasiswa/chat/[roomId]` | Chat interview dengan HRD |

### HRD

| Route | Fungsi |
| --- | --- |
| `/hrd/dashboard` | Ringkasan lowongan dan interview aktif |
| `/hrd/lowongan` | Kelola lowongan: buat, edit, tutup, hapus |
| `/hrd/lowongan/[id]/pelamar` | Review pelamar, lihat CV, ubah status |
| `/hrd/chat` | Daftar chat interview aktif |
| `/hrd/chat/[roomId]` | Chat interview dengan kandidat |

Catatan: HRD wajib mengisi `nama_perusahaan` sebelum bisa membuat lowongan.

## 4. Alur Pengguna

### Alur Mahasiswa

1. Register sebagai mahasiswa.
2. Login.
3. Lengkapi profil di `/mahasiswa/profil`.
4. Upload CV PDF.
5. Browse lowongan di `/mahasiswa/lowongan`.
6. Buka detail lowongan dan kirim lamaran.
7. Pantau status di `/mahasiswa/lamaran`.
8. Jika status berubah menjadi `dipanggil`, mahasiswa dapat masuk ke chat interview.

### Alur HRD

1. Register sebagai HRD.
2. Login.
3. Buka `/hrd/lowongan`.
4. Isi nama perusahaan jika belum ada.
5. Buat lowongan.
6. Buka daftar pelamar dari halaman lowongan.
7. Preview CV kandidat.
8. Ubah status lamaran:
   - `pending`
   - `ditinjau`
   - `dipanggil`
   - `diterima`
   - `ditolak`
9. Saat status menjadi `dipanggil`, sistem membuat chat room dan mengirim email notifikasi interview.

## 5. Status Lamaran

| Status | Arti |
| --- | --- |
| `pending` | Lamaran baru dikirim mahasiswa |
| `ditinjau` | HRD sedang review kandidat |
| `dipanggil` | Kandidat dipanggil interview dan chat aktif |
| `diterima` | Kandidat diterima |
| `ditolak` | Kandidat ditolak |

Transisi umum:

```text
pending -> ditinjau -> dipanggil -> diterima
pending -> ditinjau -> ditolak
pending -> dipanggil -> ditolak
```

## 6. Fitur Utama

### Mahasiswa

- Register/login.
- Edit profil: nama, universitas, jurusan, semester, bio, skills.
- Upload CV PDF maksimal 5 MB.
- Download CV sendiri.
- Browse lowongan berdasarkan keyword dan jenis kerja.
- Lamar lowongan dengan surat motivasi.
- Tracking status lamaran.
- Chat real-time saat dipanggil interview.

### HRD

- Register/login.
- Simpan nama perusahaan.
- Buat, edit, tutup, dan hapus lowongan.
- Lihat daftar pelamar.
- Preview CV pelamar.
- Update status lamaran.
- Catatan HRD pada lamaran.
- Chat real-time dengan kandidat.
- Email notifikasi status `dipanggil`, `diterima`, dan `ditolak`.

## 7. API PHP

Base URL lokal:

```text
http://localhost:8000
```

Base URL production:

```text
https://intern-link-php.hawali.site
```

### Auth

| Method | Endpoint | Keterangan |
| --- | --- | --- |
| `POST` | `/auth/register` | Register mahasiswa/HRD |
| `POST` | `/auth/login` | Login dan menerima token |
| `POST` | `/auth/forgot-password` | Kirim email reset password |
| `POST` | `/auth/reset-password` | Reset password |
| `GET` | `/health` | Health check PHP API |

### Mahasiswa

| Method | Endpoint | Keterangan |
| --- | --- | --- |
| `GET` | `/mahasiswa/profil` | Ambil profil mahasiswa |
| `PUT` | `/mahasiswa/profil` | Update profil mahasiswa |
| `POST` | `/mahasiswa/cv/upload` | Upload CV PDF |
| `GET` | `/mahasiswa/cv/download` | Download CV sendiri |
| `POST` | `/lamaran` | Kirim lamaran |
| `GET` | `/mahasiswa/lamaran` | Daftar lamaran mahasiswa |

### HRD

| Method | Endpoint | Keterangan |
| --- | --- | --- |
| `GET` | `/hrd/profil` | Ambil profil perusahaan |
| `PUT` | `/hrd/profil` | Update profil perusahaan |
| `GET` | `/hrd/lowongan` | Daftar lowongan milik HRD |
| `POST` | `/hrd/lowongan` | Buat lowongan |
| `PUT` | `/hrd/lowongan/{id}` | Update lowongan |
| `DELETE` | `/hrd/lowongan/{id}` | Hapus lowongan |
| `GET` | `/hrd/lowongan/{id}/pelamar` | Daftar pelamar lowongan |
| `PUT` | `/hrd/lamaran/{id}/status` | Update status lamaran |
| `GET` | `/hrd/cv/{mahasiswaUserId}` | Preview CV kandidat |

### Public Lowongan

| Method | Endpoint | Keterangan |
| --- | --- | --- |
| `GET` | `/lowongan` | Browse lowongan aktif |
| `GET` | `/lowongan/{id}` | Detail lowongan aktif |

## 8. API Node Chat

Base URL lokal:

```text
http://localhost:3000
```

Base URL production:

```text
https://intern-link-node.hawali.site
```

| Method | Endpoint | Keterangan |
| --- | --- | --- |
| `GET` | `/health` | Health check Node chat |
| `POST` | `/api/rooms/create` | Membuat chat room interview |
| `PUT` | `/api/rooms/{roomId}/close` | Menutup chat room |

Socket.IO events utama:

| Event | Arah | Fungsi |
| --- | --- | --- |
| `authenticate` | client -> server | Set user identity socket |
| `join_room` | client -> server | Masuk room chat |
| `chat_history` | server -> client | Kirim riwayat chat |
| `send_message` | client -> server | Kirim pesan |
| `new_message` | server -> client | Broadcast pesan baru |
| `typing` | client -> server | Typing indicator |
| `user_typing` | server -> client | Broadcast typing indicator |
| `mark_read` | client -> server | Tandai pesan dibaca |
| `messages_read` | server -> client | Broadcast read state |
| `room_closed` | server -> client | Room interview ditutup |

## 9. Database

### MySQL `magang_db`

Tabel utama:

| Tabel | Isi |
| --- | --- |
| `users` | Akun, email, password hash, role, session token |
| `profil_mahasiswa` | Data profil mahasiswa dan metadata CV |
| `profil_perusahaan` | Data profil perusahaan HRD |
| `lowongan` | Data lowongan magang |
| `lamaran` | Data aplikasi mahasiswa ke lowongan |

Schema berada di:

```text
backend-php/config/schema.sql
```

### MongoDB `magang_chat`

Collection utama:

| Collection | Isi |
| --- | --- |
| `chatrooms` | Metadata room interview |
| `chatmessages` | Riwayat pesan chat |

## 10. Environment

Frontend:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_SOCKET_URL=http://localhost:3000
```

PHP API:

```env
CLIENT_URL=https://intern-link.hawali.site
NODE_URL=http://127.0.0.1:3000
DB_HOST=127.0.0.1
DB_NAME=magang_db
DB_USER=root
DB_PASS=
UPLOAD_DIR=/absolute/path/to/backend-php/uploads/cv
MAIL_PASSWORD=re_xxxxx
RESEND_API_KEY=re_xxxxx
MAIL_FROM_ADDRESS=noreply@intern-link.hawali.site
MAIL_FROM_NAME=intern-link
```

Node chat:

```env
MONGODB_URI=mongodb://127.0.0.1:27017/magang_chat
PORT=3000
CLIENT_URL=https://intern-link.hawali.site
```

Cloudflare Tunnel:

```env
CLOUDFLARED_TUNNEL_TOKEN=...
```

Jangan commit file `.env` atau secret.

## 11. Menjalankan Lokal di Mac

Cara paling mudah adalah double-click:

```text
START_INTERN_LINK.command
```

Script ini menyalakan:

- MySQL
- MongoDB
- PHP API
- Node chat
- Cloudflare Tunnel
- Frontend lokal di `http://localhost:3001`

Untuk mematikan semuanya:

```text
STOP_INTERN_LINK.command
```

Manual command jika diperlukan:

```bash
brew services start mysql
brew services start mongodb-community
php -S 0.0.0.0:8000 backend-php/index.php
cd backend-node && node index.js
npm run dev -- --port 3001
```

Health check:

```bash
curl http://localhost:8000/health
curl http://localhost:3000/health
curl https://intern-link-php.hawali.site/health
curl https://intern-link-node.hawali.site/health
```

## 12. File Penting

| File/Folder | Fungsi |
| --- | --- |
| `app/` | Halaman Next.js |
| `components/` | Komponen React reusable |
| `lib/api.ts` | Axios client untuk PHP API |
| `lib/socket.ts` | Socket.IO client |
| `backend-php/` | PHP REST API |
| `backend-node/` | Node Socket.IO server |
| `database/mysql/schema.sql` | Schema MySQL alternatif/rujukan |
| `backend-php/config/schema.sql` | Schema MySQL yang dipakai backend PHP saat ini |
| `cloudflared/config.yml` | Konfigurasi Cloudflare Tunnel |
| `START_INTERN_LINK.command` | Launcher Mac untuk menyalakan stack |
| `STOP_INTERN_LINK.command` | Launcher Mac untuk mematikan stack |

## 13. Troubleshooting

### Upload CV terlihat gagal tetapi muncul setelah refresh

Penyebab umum: response backend tercampur warning PHP, sehingga frontend gagal parse JSON. Pastikan tidak ada warning/deprecated dari PHP dan cek log PHP API.

### Email status tidak terkirim

Pastikan env berikut valid:

```env
MAIL_PASSWORD=re_xxxxx
RESEND_API_KEY=re_xxxxx
MAIL_FROM_ADDRESS=noreply@intern-link.hawali.site
```

Saat status lamaran berubah, response endpoint status menyertakan:

```json
{
  "email_notification_sent": true
}
```

Jika `false`, cek log PHP API untuk error Resend/SMTP.

### HRD tidak bisa membuat lowongan

HRD wajib mengisi nama perusahaan terlebih dahulu di halaman `/hrd/lowongan`. Backend akan menolak pembuatan lowongan jika `nama_perusahaan` kosong.

### Frontend Vercel tidak bisa akses backend

Pastikan Mac menyala dan Cloudflare Tunnel aktif. Cek:

```bash
curl https://intern-link-php.hawali.site/health
curl https://intern-link-node.hawali.site/health
```

### Port bentrok

Port yang dipakai:

```text
3000 Node chat
3001 Frontend lokal
8000 PHP API
3306 MySQL
27017 MongoDB
```

Gunakan `STOP_INTERN_LINK.command` untuk mematikan proses yang dibuat launcher.
