# Migrasi intern-link ke Mac

Panduan ini untuk memindahkan project `intern-link` dari Windows ke Mac tanpa membawa secret ke Git.

Stack project:

- Frontend: Next.js 16, React 19, Tailwind CSS
- PHP API: PHP 8.x + MySQL
- Chat backend: Node.js + Socket.IO + MongoDB
- Tunnel publik: Cloudflare Tunnel

Catatan penting untuk setup production sekarang:

```text
Frontend tetap di Vercel:
https://intern-link.hawali.site

Database dan backend jalan di Mac:
MySQL + MongoDB + PHP API + Node chat

Cloudflare Tunnel membuka backend Mac ke internet:
https://intern-link-php.hawali.site  -> PHP API di localhost:8000
https://intern-link-node.hawali.site -> Node chat di localhost:3000
```

Frontend Vercel tidak pernah connect langsung ke MySQL atau MongoDB. Frontend hanya panggil API publik dari Cloudflare Tunnel.

Yang wajib jalan di Mac untuk production:

```text
MySQL localhost:3306
MongoDB localhost:27017
PHP API localhost:8000
Node chat localhost:3000
cloudflared tunnel
```

Yang wajib di-set di Vercel hanya environment frontend:

```env
NEXT_PUBLIC_API_URL=https://intern-link-php.hawali.site
NEXT_PUBLIC_SOCKET_URL=https://intern-link-node.hawali.site
```

Jadi kalau Mac mati, database dan backend ikut mati, lalu frontend Vercel masih terbuka tapi fitur login, lowongan, lamaran, CV, dan chat tidak bisa jalan.

## 1. Sync Kode dari Windows

Di Windows:

```powershell
cd C:\Awa\intern-link
git status
```

Jika ada perubahan yang memang ingin dibawa ke Mac:

```powershell
git add .
git commit -m "Sync before moving to Mac"
git push origin main
```

Jangan commit file berikut:

- `.env`
- `.env.local`
- `backend-php/.env`
- `backend-node/.env`
- API key, password database, token, atau credential Cloudflare
- File credential tunnel `*.json`

## 2. Siapkan Mac

Install Homebrew jika belum ada:

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

Install runtime dasar:

```bash
brew install node php composer mysql cloudflared
brew tap mongodb/brew
brew install mongodb-community
```

Disarankan pakai Node.js 20 atau lebih baru:

```bash
node -v
npm -v
php -v
composer -V
```

## 3. Clone Project di Mac

```bash
mkdir -p ~/Projects
cd ~/Projects
git clone https://github.com/hawalinajwan/intern-link.git
cd intern-link
```

Install dependency frontend:

```bash
npm install
```

Install dependency Node backend:

```bash
cd backend-node
npm install
cd ..
```

Install dependency PHP:

```bash
cd backend-php
composer install
cd ..
```

## 4. Pilih Cara Jalanin Backend dan Database di Mac: Docker atau Native

### Opsi A: Docker Compose

Ini cara paling cepat kalau Docker Desktop sudah tersedia di Mac.

```bash
cp .env.example .env
```

Edit `.env`, lalu jalankan:

```bash
docker compose up -d --build
```

Service lokal di Mac:

```text
PHP API    http://localhost:8000
Node chat  http://localhost:3000
MySQL      localhost:3306
MongoDB    localhost:27017
Frontend   http://localhost:3001  (opsional, bukan production)
```

Health check:

```bash
curl http://localhost:8000/health
curl http://localhost:3000/health
```

### Opsi B: Native Homebrew

Pakai opsi ini kalau mau menjalankan semua service langsung di Mac.

Start database:

```bash
brew services start mysql
brew services start mongodb-community
```

Buat database MySQL:

```bash
mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS magang_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
mysql -u root -p magang_db < backend-php/config/schema.sql
```

Opsional, isi data contoh:

```bash
mysql -u root -p magang_db < database/mysql/seeds.sql
```

## 5. Pindahkan File Lokal dari Windows

Copy file env dari Windows ke Mac secara manual via AirDrop, USB, private notes, atau password manager.

Dari Windows:

```text
C:\Awa\intern-link\.env
C:\Awa\intern-link\.env.local
C:\Awa\intern-link\backend-php\.env
C:\Awa\intern-link\backend-node\.env
C:\Awa\intern-link\cloudflared\config.yml
```

Ke Mac:

```text
~/Projects/intern-link/.env
~/Projects/intern-link/.env.local
~/Projects/intern-link/backend-php/.env
~/Projects/intern-link/backend-node/.env
~/Projects/intern-link/cloudflared/config.yml
```

Copy juga credential Cloudflare Tunnel.

Dari Windows:

```text
C:\Users\muham\.cloudflared\<TUNNEL_ID>.json
```

Ke Mac:

```text
/Users/<NAMA_KAMU>/.cloudflared/<TUNNEL_ID>.json
```

Pastikan permission-nya aman:

```bash
chmod 600 ~/.cloudflared/<TUNNEL_ID>.json
```

## 6. Contoh Environment Native Mac

Untuk production sekarang, env paling penting ada di backend Mac dan Vercel. Frontend production tetap membaca API dari domain tunnel, bukan dari `localhost`.

Root `.env`:

```env
CLIENT_URL=https://intern-link.hawali.site
NODE_URL=http://127.0.0.1:3000
NEXT_PUBLIC_API_URL=https://intern-link-php.hawali.site
NEXT_PUBLIC_SOCKET_URL=https://intern-link-node.hawali.site

DB_HOST=127.0.0.1
DB_NAME=magang_db
DB_USER=root
DB_PASS=ISI_PASSWORD_MYSQL_MAC
MYSQL_ROOT_PASSWORD=ISI_PASSWORD_MYSQL_MAC

CHAT_SERVER_URL=http://127.0.0.1:3000
UPLOAD_DIR=/Users/<NAMA_KAMU>/Projects/intern-link/backend-php/uploads/cv

MONGODB_URI=mongodb://127.0.0.1:27017/magang_chat
PORT=3000

MAIL_PASSWORD=ISI_RESEND_API_KEY
MAIL_FROM_ADDRESS=noreply@intern-link.hawali.site
MAIL_FROM_NAME=intern-link
MAIL_TIMEOUT=10
TEST_EMAIL=emailkamu@gmail.com
```

`backend-php/.env`:

```env
DB_HOST=127.0.0.1
DB_NAME=magang_db
DB_USER=root
DB_PASS=ISI_PASSWORD_MYSQL_MAC
CHAT_SERVER_URL=http://127.0.0.1:3000
UPLOAD_DIR=/Users/<NAMA_KAMU>/Projects/intern-link/backend-php/uploads/cv

MAIL_PASSWORD=ISI_RESEND_API_KEY
MAIL_FROM_ADDRESS=noreply@intern-link.hawali.site
MAIL_FROM_NAME=intern-link
MAIL_TIMEOUT=10
TEST_EMAIL=emailkamu@gmail.com
```

`backend-node/.env`:

```env
MONGODB_URI=mongodb://127.0.0.1:27017/magang_chat
PORT=3000
CLIENT_URL=https://intern-link.hawali.site
```

`.env.local` untuk frontend lokal, hanya kalau mau test UI dari Mac:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_SOCKET_URL=http://localhost:3000
```

Environment frontend di Vercel:

```env
NEXT_PUBLIC_API_URL=https://intern-link-php.hawali.site
NEXT_PUBLIC_SOCKET_URL=https://intern-link-node.hawali.site
```

Setelah env Vercel diubah, lakukan redeploy frontend di Vercel supaya build baru membaca nilai env tersebut.

## 7. Update Cloudflare Tunnel di Mac

Edit `cloudflared/config.yml`:

```yaml
tunnel: <TUNNEL_ID>
credentials-file: /Users/<NAMA_KAMU>/.cloudflared/<TUNNEL_ID>.json

ingress:
  - hostname: intern-link-php.hawali.site
    service: http://localhost:8000

  - hostname: intern-link-node.hawali.site
    service: http://localhost:3000
    originRequest:
      noTLSVerify: true

  - service: http_status:404
```

Frontend tidak perlu tunnel karena production frontend tetap jalan di Vercel.

Dengan setup ini alurnya:

```text
Browser user
  -> https://intern-link.hawali.site
  -> Vercel frontend
  -> https://intern-link-php.hawali.site
  -> Cloudflare Tunnel
  -> Mac localhost:8000
  -> MySQL localhost:3306

Browser user
  -> https://intern-link.hawali.site
  -> Vercel frontend
  -> https://intern-link-node.hawali.site
  -> Cloudflare Tunnel
  -> Mac localhost:3000
  -> MongoDB localhost:27017
```

## 8. Migrasi Database dari Windows ke Mac

Data aplikasi ada di dua database:

```text
MySQL    magang_db
MongoDB  magang_chat
```

CV tidak masuk database. File CV ada di folder `backend-php/uploads/cv`, jadi folder itu juga perlu dipindahkan kalau ingin data lamaran lama tetap bisa preview CV.

### Export dari Windows

Pastikan `mysqldump` dan `mongodump` tersedia di Windows. Biasanya `mysqldump` ikut MySQL, sedangkan `mongodump` ada di MongoDB Database Tools.

Dari PowerShell di root project Windows:

```powershell
cd C:\Awa\intern-link
.\scripts\export-db-windows.ps1
```

Script akan membuat folder seperti:

```text
C:\Awa\intern-link\db-migration\20260526-143000
```

Isi foldernya:

```text
magang_db.sql
mongodb\magang_chat\...
```

Copy folder `db-migration\<timestamp>` itu ke Mac, misalnya ke:

```text
/Users/<NAMA_KAMU>/Projects/intern-link/db-migration/20260526-143000
```

Copy juga folder CV dari Windows:

```text
C:\Awa\intern-link\backend-php\uploads\cv
```

Ke Mac:

```text
/Users/<NAMA_KAMU>/Projects/intern-link/backend-php/uploads/cv
```

### Restore di Mac

Pastikan database service sudah hidup:

```bash
brew services start mysql
brew services start mongodb-community
```

Jalankan restore:

```bash
chmod +x scripts/import-db-mac.sh
./scripts/import-db-mac.sh db-migration/20260526-143000
```

Kalau user MySQL bukan `root`, isi env saat menjalankan:

```bash
MYSQL_USER=nama_user_mysql ./scripts/import-db-mac.sh db-migration/20260526-143000
```

Script restore akan:

1. Membuat database MySQL `magang_db` kalau belum ada.
2. Import `magang_db.sql`.
3. Restore MongoDB `magang_chat` dengan `mongorestore --drop`.

`--drop` berarti koleksi MongoDB lama di Mac akan diganti oleh dump dari Windows.

### Verifikasi Database

Cek tabel MySQL:

```bash
mysql -u root -p magang_db -e "SHOW TABLES;"
mysql -u root -p magang_db -e "SELECT COUNT(*) AS users FROM users; SELECT COUNT(*) AS lowongan FROM lowongan; SELECT COUNT(*) AS lamaran FROM lamaran;"
```

Cek koleksi MongoDB:

```bash
mongosh magang_chat --eval "show collections"
mongosh magang_chat --eval "db.chatrooms.countDocuments(); db.chatmessages.countDocuments();"
```

## 9. Jalankan Service Backend di Mac

Terminal 1, PHP API:

```bash
php -S 0.0.0.0:8000 backend-php/index.php
```

Terminal 2, Node chat/API:

```bash
cd backend-node
npm run start
```

Terminal 3, Cloudflare Tunnel:

```bash
cloudflared tunnel --config cloudflared/config.yml run
```

Terminal 4, opsional frontend lokal jika ingin test UI dari Mac:

```bash
npm run dev -- --port 3001
```

## 10. Health Check

Local:

```bash
curl http://localhost:8000/health
curl http://localhost:3000/health
```

Public tunnel:

```bash
curl https://intern-link-php.hawali.site/health
curl https://intern-link-node.hawali.site/health
```

Kalau health check public berhasil, frontend Vercel bisa mengakses backend di Mac lewat domain tunnel.

Expected PHP:

```json
{"success":true,"data":{"status":"ok"}}
```

Expected Node:

```json
{"status":"ok"}
```

## 11. Test Email

Pastikan `MAIL_PASSWORD`, `MAIL_FROM_ADDRESS`, dan `TEST_EMAIL` sudah diisi.

```bash
cd backend-php
php helpers/TestEmail.php
```

Jika SMTP port diblokir jaringan, helper akan mencoba fallback Resend API.

## 12. Test Alur MVP

Minimal smoke test setelah migrasi:

1. Register mahasiswa.
2. Register HRD.
3. HRD buat lowongan.
4. Mahasiswa upload CV PDF.
5. Mahasiswa apply ke lowongan.
6. HRD buka daftar pelamar dan preview CV.
7. HRD ubah status ke `dipanggil`.
8. Pastikan room chat dibuat dan chat bisa kirim pesan dua arah.

Jika mau test otomatis:

```bash
node scripts/e2e-mvp.js
```

## 13. Pindahkan Percakapan Codex

Percakapan Codex tidak otomatis ikut Git.

Cara aman:

1. Export/copy conversation dari Codex app jika tersedia.
2. Simpan sebagai file lokal, misalnya:

   ```text
   intern-link-codex-conversation.md
   ```

3. Hapus semua secret sebelum disimpan atau dibagikan:

   ```text
   RESEND_API_KEY
   MAIL_PASSWORD
   DB_PASS
   TESTSPRITE API KEY
   Cloudflare tunnel credentials
   ```

4. Pindahkan ke Mac via AirDrop, USB, Drive, atau private notes.

Jangan commit file percakapan ke repo jika masih berisi secret.

## 14. Troubleshooting

### Port 3000 bentrok dengan frontend

Project ini memakai port `3000` untuk Node chat. Jalankan frontend lokal di port lain:

```bash
npm run dev -- --port 3001
```

### MySQL tidak bisa login sebagai root

Reset atau set password root MySQL lokal, lalu update `DB_PASS`:

```bash
mysqladmin -u root password "PASSWORD_BARU"
```

### PHP tidak bisa upload CV

Pastikan folder upload ada dan bisa ditulis:

```bash
mkdir -p backend-php/uploads/cv
chmod -R u+rw backend-php/uploads
```

Pastikan `UPLOAD_DIR` berisi absolute path Mac, bukan path Docker.

### Tunnel 502 atau service unavailable

Pastikan service lokalnya hidup:

```bash
curl http://localhost:8000/health
curl http://localhost:3000/health
```

Pastikan `credentials-file` di `cloudflared/config.yml` memakai path Mac:

```text
/Users/<NAMA_KAMU>/.cloudflared/<TUNNEL_ID>.json
```

### Chat tidak connect dari frontend Vercel

Cek env Vercel:

```env
NEXT_PUBLIC_SOCKET_URL=https://intern-link-node.hawali.site
```

Lalu redeploy frontend setelah env berubah.

### Frontend Vercel tidak bisa akses database

Ini memang desain yang benar. Vercel tidak connect langsung ke database lokal. Yang harus hidup di Mac adalah:

```text
MySQL
MongoDB
PHP API localhost:8000
Node chat localhost:3000
Cloudflare Tunnel
```

Frontend Vercel hanya butuh:

```env
NEXT_PUBLIC_API_URL=https://intern-link-php.hawali.site
NEXT_PUBLIC_SOCKET_URL=https://intern-link-node.hawali.site
```

## 15. Ringkasan Arsitektur Setelah Migrasi

Production/public:

```text
Frontend Vercel:
https://intern-link.hawali.site

PHP API tunnel:
https://intern-link-php.hawali.site -> localhost:8000

Node socket tunnel:
https://intern-link-node.hawali.site -> localhost:3000
```

Local Mac:

```text
MySQL      localhost:3306
MongoDB    localhost:27017
PHP API    localhost:8000
Node API   localhost:3000
Frontend   localhost:3001
```
