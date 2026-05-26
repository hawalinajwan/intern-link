# Migrasi intern-link ke Mac

Panduan ini memindahkan project intern-link dari Windows ke Mac tanpa membawa secret ke Git.

## 1. Sync Kode ke GitHub

Di Windows:

```powershell
cd C:\Awa\intern-link
git status
git push origin main
```

Jika ada perubahan yang memang ingin dibawa:

```powershell
git add .
git commit -m "Sync before moving to Mac"
git push origin main
```

Jangan commit file `.env`, API key, password database, atau file kredensial Cloudflare.

## 2. Clone di Mac

```bash
mkdir -p ~/Projects
cd ~/Projects
git clone https://github.com/hawalinajwan/intern-link.git
cd intern-link
npm install
```

Install dependency Node backend:

```bash
cd backend-node
npm install
cd ..
```

## 3. Install Runtime di Mac

```bash
brew install php mysql cloudflared
brew tap mongodb/brew
brew install mongodb-community
```

Start database:

```bash
brew services start mysql
brew services start mongodb-community
```

## 4. Copy File Lokal dari Windows

Copy file berikut dari Windows ke folder repo Mac:

```text
C:\Awa\intern-link\.env
C:\Awa\intern-link\.env.local
C:\Awa\intern-link\backend-php\.env
C:\Awa\intern-link\backend-node\.env
C:\Awa\intern-link\cloudflared\config.yml
```

Lokasi di Mac:

```text
~/Projects/intern-link/.env
~/Projects/intern-link/.env.local
~/Projects/intern-link/backend-php/.env
~/Projects/intern-link/backend-node/.env
~/Projects/intern-link/cloudflared/config.yml
```

Copy juga file credentials Cloudflare tunnel:

```text
C:\Users\muham\.cloudflared\<TUNNEL_ID>.json
```

Ke Mac:

```text
/Users/<NAMA_KAMU>/.cloudflared/<TUNNEL_ID>.json
```

Lalu update `cloudflared/config.yml`:

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

Frontend tidak perlu tunnel karena sudah jalan di Vercel.

## 5. Isi Environment

Contoh root `.env` / `backend-php/.env`:

```env
CLIENT_URL=https://intern-link.hawali.site
NODE_URL=http://127.0.0.1:3000

DB_HOST=127.0.0.1
DB_NAME=magang_db
DB_USER=root
DB_PASS=ISI_PASSWORD_MYSQL_MAC

UPLOAD_DIR=/Users/<NAMA_KAMU>/Projects/intern-link/backend-php/uploads/cv

MAIL_PASSWORD=ISI_RESEND_API_KEY
MAIL_FROM_ADDRESS=noreply@intern-link.hawali.site
MAIL_FROM_NAME=intern-link
MAIL_TIMEOUT=10
RESEND_API_KEY=ISI_RESEND_API_KEY
```

Contoh `backend-node/.env`:

```env
MONGODB_URI=mongodb://127.0.0.1:27017/magang_chat
PORT=3000
CLIENT_URL=https://intern-link.hawali.site
```

Contoh `.env.local` untuk frontend:

```env
NEXT_PUBLIC_API_URL=https://intern-link-php.hawali.site
NEXT_PUBLIC_SOCKET_URL=https://intern-link-node.hawali.site
```

Di Vercel, pastikan env frontend sama:

```env
NEXT_PUBLIC_API_URL=https://intern-link-php.hawali.site
NEXT_PUBLIC_SOCKET_URL=https://intern-link-node.hawali.site
```

## 6. Setup MySQL

```bash
mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS magang_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
mysql -u root -p magang_db < backend-php/config/schema.sql
```

Jika schema sudah pernah dibuat dan hanya perlu kolom reset password:

```sql
ALTER TABLE users ADD COLUMN reset_token VARCHAR(64) NULL;
ALTER TABLE users ADD COLUMN reset_token_expires_at TIMESTAMP NULL;
```

## 7. Jalankan Service Lokal

Terminal 1, PHP API:

```bash
php -S 0.0.0.0:8000 backend-php/index.php
```

Terminal 2, Node Socket/API:

```bash
cd backend-node
npm run start
```

Terminal 3, Cloudflared:

```bash
cloudflared tunnel --config cloudflared/config.yml run
```

Opsional untuk test frontend lokal:

```bash
npm run dev
```

## 8. Health Check

```bash
curl http://localhost:8000/health
curl http://localhost:3000/health
curl https://intern-link-php.hawali.site/health
curl https://intern-link-node.hawali.site/health
```

Expected:

```json
{"success":true,"data":{"status":"ok"}}
```

atau Node:

```json
{"status":"ok"}
```

## 9. Test Email

Pastikan `MAIL_PASSWORD`, `MAIL_FROM_ADDRESS`, dan `TEST_EMAIL` sudah diisi.

```bash
cd backend-php
php helpers/TestEmail.php
```

Jika SMTP port diblokir jaringan, helper akan mencoba fallback Resend API.

## 10. Pindahkan Percakapan Codex

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

## 11. Ringkasan Arsitektur Setelah Migrasi

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
```
