# intern-link — Codex Prompts: MVP Lengkap
> Jalankan prompt ini secara **berurutan** di Codex. Tunggu setiap task selesai sebelum lanjut ke berikutnya.

---

## ⚡ PROMPT 0 — Konteks Awal (Paste PERTAMA, sekali saja)

```
Read AGENTS.md in the root of this repository before doing anything else.

You are building "intern-link", a modern internship recruitment platform for Indonesia.
The full product spec, architecture, business rules, API contracts, and DB schemas are in AGENTS.md — always refer to it throughout this entire session.

Stack:
- Frontend: Next.js 14 (App Router), Tailwind CSS
- Backend A: PHP 8.x REST API on port 8000, MySQL (magang_db)
- Backend B: Node.js 18+ with Socket.IO on port 3000, MongoDB (magang_chat)

Rules to always follow:
- All PHP endpoints must call requireAuth() and check role
- All DB writes use PDO prepared statements — no string interpolation
- All API responses use shape: { success: bool, data?: any, message?: string, error?: string }
- Status flow is one-way: pending → ditinjau → dipanggil → diterima/ditolak
- Never expose the real CV file path to the client
- HRD can only view a CV if a lamaran from that mahasiswa exists for their lowongan (validate via JOIN)
```

---

## 🗂️ PROMPT 1 — Project Scaffold

```
Referring to AGENTS.md, scaffold the complete directory and file structure for intern-link.

Create empty files with the correct folder layout:

frontend/
  app/
    (auth)/login/page.tsx
    (auth)/register/page.tsx
    mahasiswa/dashboard/page.tsx
    mahasiswa/lowongan/page.tsx
    mahasiswa/profil/page.tsx
    mahasiswa/lamaran/page.tsx
    mahasiswa/chat/[roomId]/page.tsx
    hrd/dashboard/page.tsx
    hrd/lowongan/page.tsx
    hrd/lowongan/[id]/pelamar/page.tsx
    hrd/chat/[roomId]/page.tsx
    layout.tsx
    page.tsx
  lib/
    api.ts           (axios instance with Bearer token interceptor)
    socket.ts        (Socket.IO client singleton)
    auth.ts          (get/set/clear token helpers)
  components/
    StatusBadge.tsx
    CVModal.tsx
    ChatBubble.tsx
  package.json       (Next.js 14, tailwindcss, socket.io-client, axios)

backend-php/
  index.php          (router: parse method + path, dispatch to controller)
  config/
    database.php     (PDO MySQL connection)
    cors.php         (CORS headers)
  middleware/
    auth.php         (requireAuth function, returns decoded token payload)
  controllers/
    AuthController.php
    LowonganController.php
    LamaranController.php
    CVController.php
  uploads/
    cv/.gitkeep

backend-node/
  index.js           (Express + Socket.IO server)
  config/
    mongodb.js       (Mongoose connect)
  models/
    ChatRoom.js
    ChatMessage.js
  routes/
    rooms.js         (POST /api/rooms/create, PUT /api/rooms/:roomId/close)
  socket/
    handlers.js      (all socket event logic)
  package.json       (express, socket.io, mongoose, cors)

After scaffolding, add a root README.md with setup instructions for all three services.
Do not implement any logic yet — just create the structure with placeholder comments.
```

---

## 🗄️ PROMPT 2 — Database Setup

```
Referring to AGENTS.md, create the MySQL schema file and MongoDB models.

1. Create backend-php/config/schema.sql with full CREATE TABLE statements:

users:
  id INT AUTO_INCREMENT PRIMARY KEY
  email VARCHAR(255) UNIQUE NOT NULL
  password_hash VARCHAR(255) NOT NULL
  role ENUM('mahasiswa','hrd') NOT NULL
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP

profil_mahasiswa:
  user_id INT PRIMARY KEY (FK → users.id)
  nama VARCHAR(255)
  universitas VARCHAR(255)
  jurusan VARCHAR(255)
  semester INT
  bio TEXT
  skills JSON
  cv_filename VARCHAR(255)
  cv_original_name VARCHAR(255)
  cv_uploaded_at TIMESTAMP NULL

profil_perusahaan:
  user_id INT PRIMARY KEY (FK → users.id)
  nama_perusahaan VARCHAR(255)
  industri VARCHAR(255)
  website VARCHAR(255)
  logo_url VARCHAR(255)

lowongan:
  id INT AUTO_INCREMENT PRIMARY KEY
  perusahaan_user_id INT NOT NULL (FK → users.id)
  judul VARCHAR(255) NOT NULL
  deskripsi TEXT
  persyaratan TEXT
  keahlian_dibutuhkan JSON
  jenis ENUM('remote','onsite','hybrid') NOT NULL
  durasi_bulan INT
  uang_saku INT
  kuota INT DEFAULT 10
  batas_lamaran DATE
  status ENUM('aktif','ditutup') DEFAULT 'aktif'
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP

lamaran:
  id INT AUTO_INCREMENT PRIMARY KEY
  mahasiswa_user_id INT NOT NULL (FK → users.id)
  lowongan_id INT NOT NULL (FK → lowongan.id)
  surat_motivasi TEXT NOT NULL
  status ENUM('pending','ditinjau','dipanggil','diterima','ditolak') DEFAULT 'pending'
  catatan_hrd TEXT
  chat_room_id VARCHAR(255)
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  UNIQUE KEY unique_apply (mahasiswa_user_id, lowongan_id)

2. Implement backend-node/models/ChatRoom.js and ChatMessage.js as Mongoose schemas matching AGENTS.md exactly.

3. In backend-php/config/database.php, implement the PDO connection using environment variables:
  DB_HOST, DB_NAME, DB_USER, DB_PASS
  Options: ERRMODE_EXCEPTION, FETCH_ASSOC, charset utf8mb4

4. In backend-node/config/mongodb.js, implement Mongoose connection using MONGODB_URI env var.
```

---

## 🔐 PROMPT 3 — Auth (PHP)

```
Referring to AGENTS.md, implement full authentication in backend-php.

1. backend-php/middleware/auth.php
   - requireAuth($pdo): reads Authorization header, extracts Bearer token
   - Query: SELECT u.*, pm.nama, pm.cv_filename, pp.nama_perusahaan FROM users u
     LEFT JOIN profil_mahasiswa pm ON u.id = pm.user_id
     LEFT JOIN profil_perusahaan pp ON u.id = pp.user_id
     WHERE u.session_token = ?
   - If not found or token missing: respond 401 { success: false, error: 'Unauthorized' } and exit
   - Return user array with id, email, role, nama

2. backend-php/controllers/AuthController.php
   - register(POST /auth/register):
     * Validate: email, password (min 8 chars), role IN ('mahasiswa','hrd')
     * Check email unique in users table
     * Hash with PASSWORD_BCRYPT
     * Generate session_token = bin2hex(random_bytes(32))
     * INSERT into users
     * INSERT empty row into profil_mahasiswa or profil_perusahaan based on role
     * Return { success: true, data: { user_id, role, token } }

   - login(POST /auth/login):
     * SELECT user by email
     * password_verify()
     * Regenerate session_token, UPDATE users SET session_token = ?
     * Fetch profile (nama from profil_mahasiswa or profil_perusahaan)
     * Return { success: true, data: { user_id, role, token, nama } }

3. backend-php/index.php
   - Add routing for POST /auth/register and POST /auth/login
   - Include config/cors.php at the top (allow all origins for dev, set Content-Type: application/json)
   - Add session_token VARCHAR(64) column to users table in schema.sql
```

---

## 🏢 PROMPT 4 — Lowongan CRUD (PHP)

```
Referring to AGENTS.md, implement LowonganController.php in backend-php.

Endpoints to implement:

GET /lowongan (public, no auth)
  - Query params: jenis, keyword (search judul/deskripsi), page (default 1), limit (default 10)
  - Join with profil_perusahaan for nama_perusahaan, logo_url
  - Only return lowongan WHERE status = 'aktif' AND batas_lamaran >= CURDATE()
  - Return pagination: { data: [...], pagination: { page, limit, total, pages } }
  - Each item includes: id, judul, jenis, durasi_bulan, uang_saku, keahlian_dibutuhkan, perusahaan: { nama_perusahaan, logo_url }

GET /lowongan/:id (public)
  - Full detail including deskripsi, persyaratan
  - 404 if not found

POST /hrd/lowongan (role: hrd)
  - requireAuth(), check role === 'hrd'
  - Validate: judul, jenis, durasi_bulan, batas_lamaran required
  - INSERT into lowongan with perusahaan_user_id = current user id
  - Return { success: true, data: { id } }

PUT /hrd/lowongan/:id (role: hrd)
  - requireAuth(), check role === 'hrd'
  - UPDATE lowongan SET ... WHERE id = ? AND perusahaan_user_id = ? (ownership check)
  - 403 if not owner

DELETE /hrd/lowongan/:id (role: hrd)
  - requireAuth(), check role === 'hrd'
  - Only allow if no lamaran with status dipanggil/diterima exists
  - DELETE WHERE id = ? AND perusahaan_user_id = ?

GET /hrd/lowongan (role: hrd)
  - List all lowongan milik HRD ini
  - Include count of lamaran per lowongan grouped by status

Add all routes to index.php.
```

---

## 📋 PROMPT 5 — Lamaran & Status (PHP)

```
Referring to AGENTS.md, implement LamaranController.php in backend-php.

POST /lamaran (role: mahasiswa)
  - requireAuth(), check role === 'mahasiswa'
  - Validate: lowongan_id exists, status='aktif', batas_lamaran >= TODAY
  - Duplicate check: SELECT id FROM lamaran WHERE mahasiswa_user_id=? AND lowongan_id=? → 409 if exists
  - Kuota check: SELECT COUNT(*) FROM lamaran WHERE lowongan_id=? AND status IN ('dipanggil','diterima') — if >= kuota: 400 error
  - INSERT lamaran with status='pending'
  - Return { success: true, data: { lamaran_id } }

GET /mahasiswa/lamaran (role: mahasiswa)
  - requireAuth(), check role === 'mahasiswa'
  - SELECT all lamaran for this mahasiswa
  - JOIN lowongan + profil_perusahaan for judul, nama_perusahaan
  - Include chat_room_id (nullable) and status
  - Return ordered by created_at DESC

GET /hrd/lowongan/:id/pelamar (role: hrd)
  - requireAuth(), check role === 'hrd'
  - Validate: lowongan belongs to this HRD (WHERE perusahaan_user_id = ?)
  - SELECT all lamaran for this lowongan
  - JOIN profil_mahasiswa for nama, universitas, jurusan, cv_filename, skills
  - Return list with: lamaran_id, status, surat_motivasi, catatan_hrd, chat_room_id, mahasiswa: { nama, universitas, jurusan, user_id, has_cv: bool }

PUT /hrd/lamaran/:id/status (role: hrd)
  - requireAuth(), check role === 'hrd'
  - Validate ownership: JOIN lamaran → lowongan WHERE perusahaan_user_id = current HRD
  - Validate status in whitelist: ['ditinjau','dipanggil','diterima','ditolak']
  - UPDATE lamaran SET status=?, catatan_hrd=?

  IF new status === 'dipanggil':
    * Generate chatRoomId = "room_{lamaranId}_" . time()
    * UPDATE lamaran SET chat_room_id = chatRoomId
    * Fire async cURL to Node.js POST http://localhost:3000/api/rooms/create:
      Body: { roomId, lamaranId, mahasiswaUserId, hrdUserId, lowonganTitle }
      curl_setopt(CURLOPT_TIMEOUT, 3)
      curl_setopt(CURLOPT_RETURNTRANSFER, true)
      Do NOT block on response

  IF new status === 'diterima' OR 'ditolak':
    * If lamaran has chat_room_id: cURL PUT http://localhost:3000/api/rooms/{roomId}/close

  - Return { success: true, data: { status, chat_room_id } }

Add all routes to index.php.
```

---

## 📄 PROMPT 6 — CV Upload & Viewer (PHP)

```
Referring to AGENTS.md, implement CVController.php in backend-php.

POST /mahasiswa/cv/upload (role: mahasiswa, multipart/form-data)
  - requireAuth(), check role === 'mahasiswa'
  - $_FILES['cv'] must exist
  - Validate MIME type using finfo_open(FILEINFO_MIME_TYPE) — must be exactly 'application/pdf'
  - Validate size: $_FILES['cv']['size'] <= 5 * 1024 * 1024 (5MB)
  - Generate filename: "cv_{$userId}_{$timestamp}.pdf"
  - Define UPLOAD_DIR as absolute path to uploads/cv/ (outside web root accessible, inside project OK for now)
  - move_uploaded_file() to UPLOAD_DIR . $filename
  - UPDATE profil_mahasiswa SET cv_filename=?, cv_original_name=?, cv_uploaded_at=NOW() WHERE user_id=?
  - Return { success: true, data: { filename, original_name, uploaded_at } }

GET /hrd/cv/:mahasiswaUserId (role: hrd)
  - requireAuth(), check role === 'hrd'
  - SECURITY CHECK (critical):
    SELECT la.id FROM lamaran la
    JOIN lowongan l ON la.lowongan_id = l.id
    WHERE la.mahasiswa_user_id = :mahasiswaId
      AND l.perusahaan_user_id = :hrdId
    LIMIT 1
    → If no row: respond 403 { success: false, error: 'Forbidden' } and exit
  - SELECT cv_filename FROM profil_mahasiswa WHERE user_id = :mahasiswaId
  - If cv_filename is null: 404
  - $filepath = UPLOAD_DIR . $cv_filename
  - If file not exists on disk: 404
  - Stream file:
    header('Content-Type: application/pdf')
    header('Content-Disposition: inline; filename="cv.pdf"')
    header('Content-Length: ' . filesize($filepath))
    readfile($filepath)
    exit

GET /mahasiswa/profil (role: mahasiswa)
  - Return full profil_mahasiswa data for current user

PUT /mahasiswa/profil (role: mahasiswa)
  - Update nama, universitas, jurusan, semester, bio, skills (JSON)

Add all routes to index.php.
```

---

## 💬 PROMPT 7 — Chat Server (Node.js)

```
Referring to AGENTS.md, implement the full Node.js chat server in backend-node.

1. backend-node/index.js
   - Express app + http server + Socket.IO
   - CORS: allow all origins (dev mode)
   - Import routes/rooms.js at /api/rooms
   - Import socket/handlers.js and pass io
   - Listen on port 3000
   - Connect to MongoDB on startup

2. backend-node/routes/rooms.js
   POST /api/rooms/create
     - Body: { roomId, lamaranId, mahasiswaUserId, hrdUserId, lowonganTitle }
     - Idempotent: findOne by roomId first, create only if not exists
     - Create ChatRoom document with status: 'active'
     - Create one ChatMessage: { type: 'system', content: 'Sesi wawancara dimulai. Selamat datang!' }
     - Return { success: true, roomId }

   PUT /api/rooms/:roomId/close
     - Update ChatRoom status to 'closed'
     - Return { success: true }

3. backend-node/socket/handlers.js
   Export function initSocket(io):

   io.on('connection', socket => {

     socket.on('authenticate', ({ userId, role, name }) => {
       socket.data.userId = userId
       socket.data.role = role
       socket.data.name = name
     })

     socket.on('join_room', async ({ roomId }) => {
       const room = await ChatRoom.findOne({ roomId })
       if (!room) return socket.emit('error', { message: 'Room not found' })
       
       const userId = socket.data.userId
       const isParticipant = room.mahasiswaUserId == userId || room.hrdUserId == userId
       if (!isParticipant) return socket.emit('error', { message: 'Forbidden' })

       socket.join(roomId)
       
       // Update activeParticipants
       await ChatRoom.updateOne({ roomId }, { $addToSet: { activeParticipants: userId } })

       // Send last 50 messages (chronological)
       const messages = await ChatMessage.find({ roomId })
         .sort({ timestamp: -1 }).limit(50).lean()
       socket.emit('chat_history', messages.reverse())

       // Notify others
       socket.to(roomId).emit('user_joined', { userId, name: socket.data.name, role: socket.data.role })
     })

     socket.on('send_message', async ({ roomId, content }) => {
       if (!content || content.length > 2000) return
       
       const room = await ChatRoom.findOne({ roomId })
       if (!room || room.status !== 'active') return socket.emit('error', { message: 'Room closed' })

       const msg = await ChatMessage.create({
         roomId,
         senderId: socket.data.userId,
         senderName: socket.data.name,
         senderRole: socket.data.role,
         content,
         messageType: 'text',
         isRead: false,
         timestamp: new Date()
       })

       await ChatRoom.updateOne({ roomId }, {
         lastMessage: content,
         lastMessageAt: new Date(),
         $inc: { messageCount: 1 }
       })

       io.to(roomId).emit('new_message', msg)
     })

     socket.on('typing', ({ roomId, isTyping }) => {
       socket.to(roomId).emit('user_typing', {
         userId: socket.data.userId,
         name: socket.data.name,
         isTyping
       })
     })

     socket.on('mark_read', async ({ roomId }) => {
       await ChatMessage.updateMany(
         { roomId, isRead: false, senderId: { $ne: socket.data.userId } },
         { $set: { isRead: true } }
       )
       socket.to(roomId).emit('messages_read', { byUserId: socket.data.userId })
     })

     socket.on('disconnect', async () => {
       // Remove from activeParticipants in all joined rooms
       // socket.rooms contains the roomIds
     })
   })
```

---

## 🎨 PROMPT 8 — Frontend: Auth Pages

```
Referring to AGENTS.md, implement the frontend auth flow in Next.js 14.

1. frontend/lib/auth.ts
   - getToken(): string | null → localStorage.getItem('token')
   - setAuth(token, userId, role): void → set all three in localStorage
   - clearAuth(): void → remove token, userId, role
   - getRole(): string | null
   - isLoggedIn(): bool

2. frontend/lib/api.ts
   - Axios instance with baseURL = process.env.NEXT_PUBLIC_API_URL (default http://localhost:8000)
   - Request interceptor: if token exists, add Authorization: Bearer {token}
   - Response interceptor: if 401, clearAuth() and redirect to /auth/login

3. frontend/app/(auth)/register/page.tsx (Client Component)
   - Form fields: email, password, role (mahasiswa/hrd radio buttons)
   - On submit: POST /auth/register
   - On success: setAuth(), redirect to /mahasiswa/dashboard or /hrd/dashboard based on role
   - Show validation errors inline

4. frontend/app/(auth)/login/page.tsx (Client Component)
   - Form fields: email, password
   - On submit: POST /auth/login
   - On success: setAuth(), redirect based on role
   - Show error message if invalid credentials

5. frontend/app/layout.tsx
   - Root layout with Tailwind
   - Simple nav: logo "intern-link", login/register buttons (if not logged in)

Style: clean, modern, use Tailwind. Mobile-responsive. Use Inter font.
```

---

## 🔍 PROMPT 9 — Frontend: Browse Lowongan

```
Referring to AGENTS.md, implement the browse lowongan page for mahasiswa.

frontend/app/mahasiswa/lowongan/page.tsx (Client Component)

Features:
1. Fetch GET /lowongan on mount with query params
2. Search bar: keyword input (debounce 500ms before fetch)
3. Filter by jenis: checkboxes for Remote / Onsite / Hybrid
4. Card grid for results showing:
   - Company logo (placeholder if null) + nama_perusahaan
   - Judul lowongan (bold)
   - Jenis badge (colored: Remote=blue, Onsite=orange, Hybrid=green)
   - Durasi + uang saku (formatted IDR)
   - Skill tags (keahlian_dibutuhkan, max 3 shown)
   - "Lamar" button

5. On click "Lamar":
   - Open modal with textarea for surat_motivasi (required, min 50 chars)
   - Submit POST /lamaran with { lowongan_id, surat_motivasi }
   - On success: show toast "Lamaran berhasil dikirim!", change button to "Sudah Lamar" (disabled)
   - On 409 (duplicate): show "Kamu sudah pernah melamar"
   - On 400 (kuota penuh): show "Maaf, kuota sudah penuh"

6. Pagination: prev/next buttons, show "Halaman X dari Y"

7. Empty state: "Tidak ada lowongan yang cocok" with icon

frontend/components/StatusBadge.tsx
   - Props: status: 'pending'|'ditinjau'|'dipanggil'|'diterima'|'ditolak'
   - Return colored badge:
     pending=gray, ditinjau=blue, dipanggil=yellow, diterima=green, ditolak=red
```

---

## 👤 PROMPT 10 — Frontend: Profil Mahasiswa + CV Upload

```
Referring to AGENTS.md, implement the mahasiswa profile page.

frontend/app/mahasiswa/profil/page.tsx (Client Component)

Sections:

1. Profile Form
   - Fields: nama, universitas, jurusan, semester (1-14), bio, skills (comma-separated input → save as JSON array)
   - Fetch GET /mahasiswa/profil on mount, pre-fill form
   - Submit PUT /mahasiswa/profil
   - Show success toast on save

2. CV Upload Section
   IF no CV uploaded:
     - Drag-drop zone with dashed border
     - "Drag PDF di sini atau klik untuk pilih"
     - Accept only application/pdf
     - Client-side validate: MIME type + size < 5MB
     - Show upload progress bar (track with XMLHttpRequest or axios onUploadProgress)
     - POST /mahasiswa/cv/upload as multipart/form-data
     - On success: switch to "CV Card" view

   IF CV exists:
     - Card showing: original filename, upload date (formatted: "12 Mei 2026")
     - "Download" button → GET /mahasiswa/cv/download
     - "Ganti CV" button → show upload zone again, replace

3. Guard: if not logged in or role !== 'mahasiswa', redirect to /auth/login
```

---

## 📊 PROMPT 11 — Frontend: Dashboard Lamaran Mahasiswa

```
Referring to AGENTS.md, implement the lamaran dashboard for mahasiswa.

frontend/app/mahasiswa/lamaran/page.tsx (Client Component)

Features:
1. Fetch GET /mahasiswa/lamaran on mount
2. Show list of lamaran cards, each containing:
   - nama_perusahaan + judul lowongan
   - Tanggal apply (formatted)
   - StatusBadge component (status)
   - If status === 'dipanggil' AND chat_room_id exists:
     → Show "Buka Chat" button linking to /mahasiswa/chat/[roomId]
   - If status === 'diterima': show green "Selamat! Kamu diterima" banner on card
   - If status === 'ditolak': show subtle gray styling

3. Empty state: "Belum ada lamaran. Yuk cari lowongan!" with link to /mahasiswa/lowongan

4. Sort by created_at DESC (latest first)

frontend/app/mahasiswa/dashboard/page.tsx
   - Summary stats at top:
     * Total lamaran
     * Pending / Ditinjau count
     * Dipanggil count (highlight if > 0)
     * Diterima count
   - Show last 3 lamaran cards (same as above)
   - Quick link to browse lowongan
```

---

## 🏢 PROMPT 12 — Frontend: HRD Dashboard & Kelola Lowongan

```
Referring to AGENTS.md, implement HRD pages for managing job postings.

frontend/app/hrd/lowongan/page.tsx (Client Component)

Features:
1. Fetch GET /hrd/lowongan on mount
2. Table/card list showing all HRD's lowongan:
   - Judul, jenis, batas_lamaran, status badge (Aktif/Ditutup)
   - Counts: total_pelamar, dipanggil_count, diterima_count
   - Actions: "Lihat Pelamar", "Edit", "Tutup"/"Aktifkan", "Hapus"

3. "Buat Lowongan Baru" button → open modal/drawer with form:
   Fields: judul, deskripsi (textarea), persyaratan (textarea), keahlian_dibutuhkan (tag input, comma-separated),
   jenis (select: remote/onsite/hybrid), durasi_bulan (1-12 number), uang_saku (IDR number),
   kuota (number), batas_lamaran (date picker)
   Submit POST /hrd/lowongan

4. Edit: pre-fill form, submit PUT /hrd/lowongan/:id

5. Guard: role must be 'hrd'

frontend/app/hrd/dashboard/page.tsx
   - Summary: total lowongan aktif, total pelamar hari ini, dipanggil pending
   - List of active lowongan with pelamar count
```

---

## 👥 PROMPT 13 — Frontend: Daftar Pelamar + CV Modal

```
Referring to AGENTS.md, implement the pelamar management page for HRD.

frontend/app/hrd/lowongan/[id]/pelamar/page.tsx (Client Component)

Features:
1. Fetch GET /hrd/lowongan/:id/pelamar on mount
2. Table with columns:
   Nama | Universitas | Jurusan | Tgl Lamar | Status | CV | Motivasi | Catatan

3. Status column:
   - Show StatusBadge
   - Dropdown to change status: ['ditinjau','dipanggil','diterima','ditolak']
   - On change: PUT /hrd/lamaran/:id/status with { status, catatan }
   - Optimistic UI update (update table row immediately)
   - If new status = 'dipanggil': show toast "Chat room dibuat! Buka di Chat untuk interview"
   - If new status = 'diterima'/'ditolak': confirm modal "Yakin dengan keputusan ini? Tidak bisa diubah."

4. "Lihat CV" button:
   - If mahasiswa.has_cv is false: show disabled button "Belum upload CV"
   - If true: open CVModal

5. "Lihat Motivasi" button: expand inline text area showing surat_motivasi

6. Catatan HRD: editable text input per row, auto-save on blur (PUT same endpoint with catatan)

frontend/components/CVModal.tsx
   Props: mahasiswaUserId, isOpen, onClose

   On open:
   - Show loading skeleton
   - Fetch GET /hrd/cv/:mahasiswaUserId with { responseType: 'blob' }
   - const url = URL.createObjectURL(blob)
   - Render <iframe src={url} className="w-full h-[80vh]" />
   - "Download" button: create <a href={url} download="cv.pdf"> and click programmatically

   On close:
   - URL.revokeObjectURL(url)
   - setUrl(null)
```

---

## 💬 PROMPT 14 — Frontend: Real-Time Chat

```
Referring to AGENTS.md, implement the real-time chat pages.

frontend/lib/socket.ts
   - Singleton Socket.IO client
   - URL = process.env.NEXT_PUBLIC_SOCKET_URL (default http://localhost:3000)
   - export function getSocket(): Socket — connect if not already connected
   - export function disconnectSocket(): void

frontend/app/mahasiswa/chat/[roomId]/page.tsx (Client Component)
frontend/app/hrd/chat/[roomId]/page.tsx (Client Component)

Both pages share the same logic, implement as shared component ChatRoom.tsx:

Props: roomId, role ('mahasiswa'|'hrd')

On mount:
  1. const socket = getSocket()
  2. socket.emit('authenticate', { userId: getFromStorage('userId'), role, name })
  3. socket.emit('join_room', { roomId })
  4. Listen 'chat_history': setState(messages), scroll to bottom
  5. Listen 'new_message': append to messages, scroll to bottom, emit 'mark_read'
  6. Listen 'user_typing': show/hide typing indicator
  7. Listen 'room_closed': show banner "Sesi wawancara telah ditutup", disable input
  8. Listen 'error': show error toast

On unmount: socket.off all listeners (do NOT disconnect — singleton)

UI:
  Header:
    - Back button (← Kembali)
    - Title: "Wawancara — {lowonganTitle}"
    - Online indicator (green dot if other participant active)
    - If role === 'hrd' AND room status === 'active':
      "Tandai Diterima" button (green) → confirm modal → PUT /hrd/lamaran/:lamaranId/status { status: 'diterima' }

  Message list (scrollable):
    - System messages: centered, gray italic text
    - Own messages: right-aligned, bg-red-500 text-white rounded-xl px-4 py-2
    - Other's messages: left-aligned, bg-gray-100 rounded-xl px-4 py-2
    - Show sender name above first message in a sequence
    - Timestamp on hover (format: "14:32")
    - Read indicator (✓✓ if isRead) for own messages

  Typing indicator: "... sedang mengetik" below message list

  Input area:
    - Textarea (Shift+Enter for newline, Enter to send)
    - Character counter: "X/2000"
    - Send button (disabled if empty or room closed)
    - On input: emit 'typing' with isTyping: true (debounce 500ms, emit false after 1.5s)

  Empty state: "Belum ada pesan. Mulai percakapan!"

frontend/components/ChatBubble.tsx
  Props: message (ChatMessage shape), isOwn: bool
  Render the bubble with correct styling
```

---

## 🔗 PROMPT 15 — Integrasi & Polish

```
Referring to AGENTS.md, do a final integration pass and polish.

1. Navigation / Layout
   - frontend/app/layout.tsx: add sidebar or top nav based on role
   - Mahasiswa nav: Dashboard, Cari Lowongan, Lamaran Saya, Profil
   - HRD nav: Dashboard, Kelola Lowongan, Chat
   - Show logged-in user's name + role badge
   - Logout button: clearAuth() + redirect to /auth/login

2. Route Guards
   - Create middleware.ts in frontend root:
     * If path starts with /mahasiswa/* and role !== 'mahasiswa': redirect to /auth/login
     * If path starts with /hrd/* and role !== 'hrd': redirect to /auth/login
     * If path is /auth/* and already logged in: redirect to dashboard

3. HRD Chat List Page
   - frontend/app/hrd/dashboard/page.tsx: add section "Interview Aktif"
   - Fetch all lamaran with status='dipanggil' across all HRD's lowongan
   - Each item links to /hrd/chat/[roomId]

4. Error Handling
   - Global error boundary in layout.tsx
   - All API calls: show toast on network error
   - 403 responses: show "Akses ditolak" page
   - 404 responses: show "Tidak ditemukan" page

5. Environment Files
   Create:
   - frontend/.env.local.example with NEXT_PUBLIC_API_URL, NEXT_PUBLIC_SOCKET_URL
   - backend-php/.env.example with DB_HOST, DB_NAME, DB_USER, DB_PASS
   - backend-node/.env.example with MONGODB_URI, PORT

6. Root docker-compose.yml (optional but helpful):
   Services: mysql, mongodb, php (port 8000), node (port 3000), nextjs (port 3001)
   With volume mounts and env_file references

After all this is done, run a final check:
- Are all AGENTS.md business rules implemented?
- Is every PHP endpoint calling requireAuth()?
- Is the CV security JOIN check in place?
- Is the status flow validated (no backward transitions)?
- Are all Socket.IO events handled with error checks?

List any gaps found and fix them.
```

---

## 📋 Urutan Eksekusi

| # | Prompt | Estimasi |
|---|--------|---------|
| 0 | Konteks Awal | Sekali |
| 1 | Scaffold | 5 menit |
| 2 | Database Setup | 5 menit |
| 3 | Auth PHP | 10 menit |
| 4 | Lowongan CRUD | 10 menit |
| 5 | Lamaran & Status | 10 menit |
| 6 | CV Upload & Viewer | 10 menit |
| 7 | Chat Server Node.js | 10 menit |
| 8 | Frontend Auth | 10 menit |
| 9 | Frontend Browse Lowongan | 10 menit |
| 10 | Frontend Profil + CV | 10 menit |
| 11 | Frontend Dashboard Mahasiswa | 8 menit |
| 12 | Frontend HRD Lowongan | 10 menit |
| 13 | Frontend Pelamar + CV Modal | 10 menit |
| 14 | Frontend Chat | 15 menit |
| 15 | Integrasi & Polish | 15 menit |

**Total estimasi: ~2-2.5 jam di Codex**

---

## ⚠️ Tips Penting

- Jika Codex menghasilkan file yang salah path, koreksi dengan: *"That file should be at [correct path], move it and fix the import"*
- Jika ada bug setelah Prompt N selesai, fix dulu sebelum lanjut ke N+1
- Untuk task yang panjang, Codex mungkin hanya partial — lanjutkan dengan: *"Continue implementing [specific part] that was not completed"*
- Setelah Prompt 15, test end-to-end: register → browse → apply → HRD review → dipanggil → chat → diterima

---

---

# FASE 2 — Sampai Bisa Berjalan Normal (Prompt 16–22)
> Lanjutkan setelah Prompt 0–15 selesai. Fokus: local run, bug fixing, lalu deploy.

---

## 🧪 PROMPT 16 — Local Run Check (3 Service Sekaligus)

```
Check that all three services can start without errors locally.

1. Backend PHP (port 8000)
   - Verify backend-php/index.php has correct routing for all these paths:
     POST /auth/register, POST /auth/login
     GET /lowongan, GET /lowongan/:id
     POST /mahasiswa/cv/upload, GET /hrd/cv/:mahasiswaUserId
     GET /mahasiswa/profil, PUT /mahasiswa/profil, GET /mahasiswa/lamaran
     POST /lamaran
     POST /hrd/lowongan, GET /hrd/lowongan, PUT /hrd/lowongan/:id, DELETE /hrd/lowongan/:id
     GET /hrd/lowongan/:id/pelamar, PUT /hrd/lamaran/:id/status
   - Verify config/cors.php sends these headers on every request including OPTIONS preflight:
     Access-Control-Allow-Origin: *
     Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
     Access-Control-Allow-Headers: Content-Type, Authorization
     If method is OPTIONS: respond 200 and exit immediately
   - Verify config/database.php reads from $_ENV or getenv() for DB_HOST, DB_NAME, DB_USER, DB_PASS
   - If using php -S localhost:8000, make sure index.php handles all routes (not just /)

2. Backend Node.js (port 3000)
   - Verify index.js starts Express + Socket.IO correctly
   - Verify mongodb.js connects using MONGODB_URI env var with error logging
   - Verify routes/rooms.js is mounted at /api/rooms
   - Verify socket/handlers.js is called with io instance
   - Add a health check: GET /health → res.json({ status: 'ok', time: new Date() })

3. Frontend (port 3001 or 3000)
   - Verify frontend/package.json has all dependencies:
     next@14, react, react-dom, tailwindcss, axios, socket.io-client
   - Verify tailwind.config.js content includes app/ and components/
   - Verify frontend/.env.local exists with:
     NEXT_PUBLIC_API_URL=http://localhost:8000
     NEXT_PUBLIC_SOCKET_URL=http://localhost:3000
   - Run next build and fix any TypeScript errors or missing imports

4. Create a root Makefile with these commands:
   make dev-php    → cd backend-php && php -S localhost:8000
   make dev-node   → cd backend-node && node index.js
   make dev-next   → cd frontend && npm run dev
   make install    → npm install in frontend and backend-node
   make db-setup   → mysql -u root -p magang_db < backend-php/config/schema.sql
```

---

## 🔌 PROMPT 17 — Fix CORS & API Connection

```
Fix all CORS and API connection issues between the three services.

1. PHP CORS fix (backend-php/config/cors.php)
   Replace with this exact implementation:
   <?php
   header('Access-Control-Allow-Origin: *');
   header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
   header('Access-Control-Allow-Headers: Content-Type, Authorization');
   header('Content-Type: application/json');
   if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
       http_response_code(200);
       exit();
   }

2. PHP Router fix (backend-php/index.php)
   - Must include cors.php as the VERY FIRST line before any routing
   - Parse URL path correctly: use parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH)
   - Strip leading slash and split by /
   - Handle dynamic segments (:id, :mahasiswaUserId, :roomId) with regex matching
   - For PUT requests: read body with json_decode(file_get_contents('php://input'), true)
   - For multipart (CV upload): use $_FILES as normal
   - If no route matches: respond 404 { success: false, error: 'Route not found' }

3. Node.js CORS fix (backend-node/index.js)
   - Use cors package: app.use(cors({ origin: '*' }))
   - Socket.IO CORS: new Server(httpServer, { cors: { origin: '*', methods: ['GET','POST'] } })

4. Frontend API fix (frontend/lib/api.ts)
   - baseURL must use NEXT_PUBLIC_API_URL env var
   - Add timeout: 10000 (10 seconds)
   - Request interceptor: read token from localStorage only on client side:
     if (typeof window !== 'undefined') { const token = localStorage.getItem('token') ... }
   - Response interceptor: on 401, clear localStorage and window.location.href = '/auth/login'

5. Test the connection with a simple curl:
   curl -X POST http://localhost:8000/auth/register \
     -H "Content-Type: application/json" \
     -d '{"email":"test@test.com","password":"password123","role":"mahasiswa"}'
   
   Expected: { "success": true, "data": { "user_id": 1, "role": "mahasiswa", "token": "..." } }
   
   Fix any errors until this returns correctly.
```

---

## 🔐 PROMPT 18 — Fix Auth Flow End-to-End

```
Test and fix the complete authentication flow.

Run these tests in order and fix any bugs found:

TEST 1 — Register mahasiswa
POST http://localhost:8000/auth/register
Body: { "email": "mahasiswa@test.com", "password": "password123", "role": "mahasiswa" }
Expected: 200 { success: true, data: { user_id, role: 'mahasiswa', token } }
Common bugs to fix:
- Missing session_token column in users table → add to schema.sql and ALTER TABLE
- profil_mahasiswa INSERT fails → check FK constraint, insert users row first
- Password hash stored incorrectly → use password_hash($password, PASSWORD_BCRYPT)

TEST 2 — Register HRD
POST http://localhost:8000/auth/register
Body: { "email": "hrd@test.com", "password": "password123", "role": "hrd" }
Expected: 200 { success: true, data: { user_id, role: 'hrd', token } }

TEST 3 — Login
POST http://localhost:8000/auth/login
Body: { "email": "mahasiswa@test.com", "password": "password123" }
Expected: 200 { success: true, data: { user_id, role, token, nama } }
Common bugs: password_verify() returns false → check hash was stored correctly

TEST 4 — Protected endpoint without token
GET http://localhost:8000/mahasiswa/profil (no Authorization header)
Expected: 401 { success: false, error: 'Unauthorized' }

TEST 5 — Protected endpoint with valid token
GET http://localhost:8000/mahasiswa/profil
Header: Authorization: Bearer {token from TEST 3}
Expected: 200 with profil data

TEST 6 — Frontend login page
- Open http://localhost:3001/auth/login in browser
- Login with mahasiswa@test.com / password123
- Should redirect to /mahasiswa/dashboard
- localStorage should have token, userId, role
- If blank page or error: check browser console and fix

Fix every bug found before moving to next prompt.
```

---

## 📋 PROMPT 19 — Fix Lamaran & Chat Room Flow

```
Test and fix the core business flow: apply → status update → chat room creation.

TEST 1 — Create lowongan as HRD
POST http://localhost:8000/hrd/lowongan
Header: Authorization: Bearer {hrd_token}
Body: {
  "judul": "Frontend Developer Intern",
  "deskripsi": "Kami mencari intern frontend",
  "persyaratan": "Bisa React",
  "keahlian_dibutuhkan": ["React", "Tailwind"],
  "jenis": "remote",
  "durasi_bulan": 3,
  "uang_saku": 1500000,
  "kuota": 5,
  "batas_lamaran": "2026-12-31"
}
Expected: 200 { success: true, data: { id: 1 } }

TEST 2 — Apply as mahasiswa
POST http://localhost:8000/lamaran
Header: Authorization: Bearer {mahasiswa_token}
Body: { "lowongan_id": 1, "surat_motivasi": "Saya sangat tertarik dengan posisi ini karena..." }
Expected: 200 { success: true, data: { lamaran_id: 1 } }

TEST 3 — Duplicate apply (must fail)
Same request as TEST 2
Expected: 409 { success: false, error: 'Sudah pernah melamar' }

TEST 4 — HRD update status to 'ditinjau'
PUT http://localhost:8000/hrd/lamaran/1/status
Header: Authorization: Bearer {hrd_token}
Body: { "status": "ditinjau", "catatan": "CV menarik" }
Expected: 200 { success: true, data: { status: 'ditinjau' } }

TEST 5 — HRD update status to 'dipanggil' (critical: must create chat room)
PUT http://localhost:8000/hrd/lamaran/1/status
Header: Authorization: Bearer {hrd_token}
Body: { "status": "dipanggil" }
Expected:
- 200 { success: true, data: { status: 'dipanggil', chat_room_id: 'room_1_...' } }
- lamaran.chat_room_id updated in MySQL
- ChatRoom document created in MongoDB with status: 'active'
- System message "Sesi wawancara dimulai" created in ChatMessage collection

Common bugs to fix:
- cURL to Node.js fails silently → add error logging in PHP cURL call
- Node.js /api/rooms/create returns error → check MongoDB connection
- chat_room_id not saved in MySQL → check UPDATE query after cURL call
- Port mismatch: PHP calling wrong Node.js port → check hardcoded vs env var

Verify MongoDB has the ChatRoom:
- Connect to MongoDB and run: db.chatrooms.find({})
- Must show the room with correct mahasiswaUserId and hrdUserId

Fix all bugs before next prompt.
```

---

## 💬 PROMPT 20 — Fix Socket.IO Chat

```
Test and fix the real-time chat functionality.

Write a test script backend-node/test-socket.js that simulates two users chatting:

const { io } = require('socket.io-client')

const SOCKET_URL = 'http://localhost:3000'
const ROOM_ID = 'room_1_test' // use actual roomId from TEST 5 above

// First create the room via HTTP
const fetch = require('node-fetch')
fetch('http://localhost:3000/api/rooms/create', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    roomId: ROOM_ID,
    lamaranId: 1,
    mahasiswaUserId: '1',
    hrdUserId: '2',
    lowonganTitle: 'Frontend Developer Intern'
  })
}).then(r => r.json()).then(console.log)

// Connect mahasiswa socket
const mahasiswaSocket = io(SOCKET_URL)
mahasiswaSocket.on('connect', () => {
  console.log('Mahasiswa connected:', mahasiswaSocket.id)
  mahasiswaSocket.emit('authenticate', { userId: '1', role: 'mahasiswa', name: 'Budi' })
  mahasiswaSocket.emit('join_room', { roomId: ROOM_ID })
})
mahasiswaSocket.on('chat_history', (msgs) => console.log('History:', msgs.length, 'messages'))
mahasiswaSocket.on('new_message', (msg) => console.log('Mahasiswa received:', msg.content))

// Connect HRD socket
const hrdSocket = io(SOCKET_URL)
hrdSocket.on('connect', () => {
  console.log('HRD connected:', hrdSocket.id)
  hrdSocket.emit('authenticate', { userId: '2', role: 'hrd', name: 'HR Manager' })
  hrdSocket.emit('join_room', { roomId: ROOM_ID })
  
  // After 1 second, send a message
  setTimeout(() => {
    hrdSocket.emit('send_message', { roomId: ROOM_ID, content: 'Halo, apakah Anda tersedia untuk interview?' })
  }, 1000)
})
hrdSocket.on('new_message', (msg) => {
  console.log('HRD received:', msg.content)
  // Reply after receiving
  if (msg.senderRole === 'hrd') {
    setTimeout(() => {
      mahasiswaSocket.emit('send_message', { roomId: ROOM_ID, content: 'Halo, siap!' })
    }, 500)
  }
})
hrdSocket.on('user_typing', (data) => console.log('Typing:', data.name, data.isTyping))

// Test typing indicator
setTimeout(() => {
  mahasiswaSocket.emit('typing', { roomId: ROOM_ID, isTyping: true })
}, 2000)

// Close after 5 seconds
setTimeout(() => {
  mahasiswaSocket.disconnect()
  hrdSocket.disconnect()
  process.exit(0)
}, 5000)

Run: node backend-node/test-socket.js

Expected output:
- Both sockets connect
- chat_history received with system message
- HRD message received by mahasiswa
- Mahasiswa reply received by HRD
- Typing indicator logged

Common bugs to fix:
- Socket not authenticating → check socket.data.userId is set before join_room
- join_room ownership check fails → userId type mismatch (string vs int), normalize with ==
- Messages not saved to MongoDB → check ChatMessage.create() has correct schema fields
- new_message not broadcast → check io.to(roomId).emit vs socket.to(roomId).emit

Fix all bugs until test script runs successfully.
```

---

## 🌐 PROMPT 21 — Frontend Full Flow Test & Fix

```
Test the complete frontend user flow in the browser and fix all UI bugs.

FLOW 1 — Mahasiswa Register & Setup
1. Open http://localhost:3001/auth/register
2. Register as mahasiswa (email: mahasiswa@test.com)
3. Should redirect to /mahasiswa/dashboard
4. Go to /mahasiswa/profil
5. Fill in: nama, universitas, jurusan, semester
6. Save profile — should show success toast
7. Upload a PDF file as CV — should show progress bar then success card
Fix: form not submitting, toast not showing, CV upload 400/500 error

FLOW 2 — HRD Setup & Post Lowongan
1. Open new incognito window
2. Register as HRD (email: hrd@test.com)
3. Should redirect to /hrd/dashboard
4. Go to /hrd/lowongan
5. Click "Buat Lowongan Baru"
6. Fill form and submit
7. Lowongan should appear in list
Fix: form modal not opening, submit fails, list not refreshing after create

FLOW 3 — Mahasiswa Apply
1. Back to mahasiswa window
2. Go to /mahasiswa/lowongan
3. Search for the lowongan just created
4. Click "Lamar", fill surat motivasi, submit
5. Should show "Lamaran berhasil dikirim!" toast
6. Go to /mahasiswa/lamaran
7. Should see the lamaran with status "Pending"
Fix: lowongan not showing (check filter), apply modal not submitting, lamaran list empty

FLOW 4 — HRD Review & Dipanggil
1. In HRD window, go to /hrd/lowongan
2. Click "Lihat Pelamar" for the lowongan
3. Should see mahasiswa in table
4. Click "Lihat CV" — should open PDF modal
5. Change status to "Ditinjau" — badge should update
6. Change status to "Dipanggil" — should show toast about chat room
Fix: pelamar list empty, CV modal blank (check blob fetch), status dropdown not working

FLOW 5 — Chat
1. In mahasiswa window, go to /mahasiswa/lamaran
2. Status badge should now show "Dipanggil"
3. Click "Buka Chat" — should open /mahasiswa/chat/[roomId]
4. In HRD window, go to /hrd/dashboard → "Interview Aktif" section
5. Click chat link → open /hrd/chat/[roomId]
6. Send messages from both sides — should appear in real-time
7. In HRD window, click "Tandai Diterima" → confirm modal → confirm
8. Both windows should show "Sesi wawancara telah ditutup" banner
9. Mahasiswa window: status badge updates to "Diterima"
Fix: chat page blank, socket not connecting, messages not appearing real-time, room_closed not triggering

After fixing all flows, do a final check:
- No console errors in browser
- No 4xx/5xx errors in network tab (except intentional 401/403/409)
- All toasts show correctly
- All redirects work
```

---

## 🚀 PROMPT 22 — Deploy ke Vercel + Railway

```
Prepare and deploy intern-link to production.

1. Environment Variables Setup

For Vercel (frontend), set these in Vercel dashboard:
  NEXT_PUBLIC_API_URL = https://intern-link-php.up.railway.app
  NEXT_PUBLIC_SOCKET_URL = https://intern-link-node.up.railway.app

For Railway PHP service, set:
  DB_HOST = (Railway MySQL internal host)
  DB_NAME = magang_db
  DB_USER = root
  DB_PASS = (Railway MySQL password)
  NODE_URL = https://intern-link-node.up.railway.app
  UPLOAD_DIR = /var/www/html/uploads/cv/

For Railway Node.js service, set:
  MONGODB_URI = (MongoDB Atlas connection string)
  PORT = 3000
  CLIENT_URL = https://intern-link.vercel.app

2. PHP Production Fixes
   Create backend-php/.htaccess:
   RewriteEngine On
   RewriteCond %{REQUEST_FILENAME} !-f
   RewriteCond %{REQUEST_FILENAME} !-d
   RewriteRule ^(.*)$ index.php [QSA,L]

   Create backend-php/Dockerfile:
   FROM php:8.2-apache
   RUN a2enmod rewrite
   RUN docker-php-ext-install pdo pdo_mysql
   COPY . /var/www/html/
   RUN chown -R www-data:www-data /var/www/html/uploads
   EXPOSE 80

   Update cURL call in LamaranController.php to use NODE_URL env var:
   $nodeUrl = getenv('NODE_URL') ?: 'http://localhost:3000';
   curl_setopt($ch, CURLOPT_URL, "$nodeUrl/api/rooms/create");

3. Node.js Production Fixes
   Create backend-node/Dockerfile:
   FROM node:18-alpine
   WORKDIR /app
   COPY package*.json ./
   RUN npm ci --production
   COPY . .
   EXPOSE 3000
   CMD ["node", "index.js"]

   Update Socket.IO CORS for production:
   const CLIENT_URL = process.env.CLIENT_URL || '*'
   new Server(httpServer, { cors: { origin: CLIENT_URL, methods: ['GET','POST'] } })

4. Frontend Production Fixes
   Update frontend/next.config.js:
   module.exports = {
     output: 'standalone',
     env: {
       NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
       NEXT_PUBLIC_SOCKET_URL: process.env.NEXT_PUBLIC_SOCKET_URL,
     }
   }

5. Deploy Steps
   a. Push all code to GitHub
   b. Connect Railway to GitHub repo → deploy backend-php (Dockerfile in backend-php/)
   c. Connect Railway to GitHub repo → deploy backend-node (Dockerfile in backend-node/)
   d. In Railway MySQL service: run schema.sql to create tables
   e. Connect Vercel to GitHub repo → set root directory to "frontend" → deploy
   f. Update all environment variables with real production URLs
   g. Test production URL end-to-end with same flows as Prompt 21

6. Post-deploy verification
   curl https://intern-link-php.up.railway.app/auth/register \
     -X POST -H "Content-Type: application/json" \
     -d '{"email":"prod@test.com","password":"password123","role":"mahasiswa"}'
   
   Expected: { success: true, data: { token: "..." } }
   
   curl https://intern-link-node.up.railway.app/health
   Expected: { status: "ok" }

Fix any production-specific issues (HTTPS mixed content, CORS with real domain, upload directory permissions).
```

---

## 📋 Urutan Lengkap (0–22)

| # | Prompt | Tujuan |
|---|--------|--------|
| 0 | Konteks Awal | Set rules untuk Codex |
| 1 | Scaffold | Buat struktur folder |
| 2 | Database Setup | Schema SQL + Mongoose |
| 3 | Auth PHP | Register + Login |
| 4 | Lowongan CRUD | Job posting API |
| 5 | Lamaran & Status | Apply + status update |
| 6 | CV Upload & Viewer | File handling |
| 7 | Chat Server | Socket.IO + MongoDB |
| 8 | Frontend Auth | Login/Register UI |
| 9 | Browse Lowongan | Search + apply UI |
| 10 | Profil + CV | Profile + upload UI |
| 11 | Dashboard Mahasiswa | Status tracking UI |
| 12 | HRD Lowongan | Job management UI |
| 13 | HRD Pelamar + CV | Applicant review UI |
| 14 | Chat UI | Real-time chat UI |
| 15 | Integrasi & Polish | Nav, guards, error handling |
| **16** | **Local Run Check** | **Semua service bisa start** |
| **17** | **Fix CORS & API** | **Frontend ↔ Backend connect** |
| **18** | **Fix Auth Flow** | **Login/register berjalan** |
| **19** | **Fix Lamaran & Chat Room** | **Apply → dipanggil → room dibuat** |
| **20** | **Fix Socket.IO** | **Chat real-time berjalan** |
| **21** | **Frontend Full Flow** | **Semua halaman bisa dipakai** |
| **22** | **Deploy** | **Online di Vercel + Railway** |

**Setelah Prompt 22 → intern-link berjalan normal di production.**
