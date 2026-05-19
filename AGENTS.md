<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# AGENTS.md — intern-link

Platform rekrutmen magang modern (Next.js + PHP + Node.js + MySQL + MongoDB).

---

## 📋 Daftar Isi

1. [Visi & Misi](#visi--misi)
2. [Fitur Utama](#fitur-utama)
3. [User Journey](#user-journey)
4. [Arsitektur Sistem](#arsitektur-sistem)
5. [Alur Teknis](#alur-teknis)
6. [Value Proposition](#value-proposition)
7. [Spesifikasi Fitur](#spesifikasi-fitur)
8. [Keamanan & Compliance](#keamanan--compliance)
9. [Roadmap Produk](#roadmap-produk)
10. [FAQ & Troubleshooting](#faq--troubleshooting)

---

## 🎯 Visi & Misi

### Visi
Menjadi platform rekrutmen magang nomor satu di Indonesia yang menghubungkan talenta muda berbakat dengan perusahaan terkemuka melalui teknologi modern dan pengalaman pengguna yang seamless.

### Misi
1. **Mahasiswa**: Mempermudah akses ke peluang magang berkualitas tinggi dengan proses aplikasi yang transparan
2. **Perusahaan (HRD)**: Mengoptimalkan proses rekrutmen magang dengan manajemen pelamar terintegrasi dan komunikasi real-time
3. **Ekosistem**: Membangun komunitas yang sehat antara industri dan akademik

---

## ✨ Fitur Utama

### Untuk Mahasiswa

| Fitur | Deskripsi | Keuntungan |
|-------|-----------|-----------|
| **Browse Lowongan** | Cari lowongan dengan filter (jenis kerja, keyword, perusahaan) | Hemat waktu mencari lowongan yang sesuai |
| **Upload CV** | Upload CV dalam format PDF (max 5MB) dengan tracking upload date | Profesional & terorganisir |
| **Kelola Profil** | Lengkap dengan universitas, jurusan, semester, skills, bio | Datanya tersimpan & mudah diakses HRD |
| **Ajukan Lamaran** | Submit aplikasi dengan surat motivasi personal | Transparan & trackable |
| **Pantau Status** | Real-time updates: Pending → Ditinjau → Dipanggil → Diterima/Ditolak | Tidak perlu menunggu blind |
| **Chat Wawancara** | Real-time chat dengan HRD saat dipanggil untuk interview | Komunikasi langsung & fleksibel |
| **Dashboard Lamaran** | Lihat semua status aplikasi dalam satu tempat | Manajemen aplikasi yang lebih baik |

### Untuk HRD (Perusahaan)

| Fitur | Deskripsi | Keuntangan |
|-------|-----------|-----------|
| **Kelola Lowongan** | Buat, edit, hapus job posting dengan deskripsi & requirement | Full kontrol atas rekrutmen |
| **Lihat Pelamar** | List semua kandidat yang apply ke lowongan tertentu | Satu dashboard untuk semua aplikasi |
| **Preview CV** | Lihat CV candidate langsung di platform (PDF viewer) | Tidak perlu download, hemat storage |
| **Filter Pelamar** | Sortir berdasarkan universitas, jurusan, keahlian | Fokus pada kandidat terbaik |
| **Kelola Status** | Update status: Ditinjau → Dipanggil → Diterima/Ditolak | Workflow yang terstruktur |
| **Chat dengan Kandidat** | Interview langsung via chat real-time | Hemat waktu & koordinasi lebih mudah |
| **Catatan HRD** | Tulis catatan privat untuk setiap kandidat | Tracking feedback & keputusan |

---

## 👥 User Journey

### Journey Mahasiswa

```
┌─────────────────────────────────────────────────────────────────┐
│                    MAHASISWA JOURNEY                            │
└─────────────────────────────────────────────────────────────────┘

1. REGISTER & SETUP
   ↓
   Daftar email/password
   ↓
   Lengkapi profil (universitas, jurusan, semester)
   ↓
   Upload CV (PDF)
   ↓
   Input keahlian (skills)
   ↓
   Dashboard siap diakses

2. BROWSE & APPLY
   ↓
   Ke halaman "Cari Lowongan"
   ↓
   Filter: jenis (remote/onsite/hybrid), keyword
   ↓
   Lihat detail lowongan (deskripsi, persyaratan, durasi, gaji)
   ↓
   Click "Lamar" & tulis surat motivasi
   ↓
   Submit → status menjadi "Pending"
   ↓
   Notifikasi sukses

3. PANTAU STATUS
   ↓
   Lihat di halaman "Lamaran Saya"
   ↓
   Lihat badge: Pending → Ditinjau → Dipanggil → Diterima/Ditolak
   ↓
   Jika "Dipanggil" → buka chat dengan HRD
   ↓
   Saling berbincang untuk interview
   ↓
   Tunggu keputusan akhir

4. INTERVIEW (optional)
   ↓
   Notif dari HRD: status berubah ke "Dipanggil"
   ↓
   Chat icon jadi aktif di lamaran itu
   ↓
   Buka tab Chat → lihat percakapan dengan HRD
   ↓
   Real-time messaging
   ↓
   HRD click "Tandai Diterima" atau cukup tutup chat

5. FINAL RESULT
   ↓
   Status berubah jadi "Diterima" atau "Ditolak"
   ↓
   Lamaran tidak bisa diubah lagi
   ↓
   Bisa apply ke lowongan lain
```

### Journey HRD

```
┌─────────────────────────────────────────────────────────────────┐
│                      HRD JOURNEY                                │
└─────────────────────────────────────────────────────────────────┘

1. REGISTER & SETUP
   ↓
   Daftar sebagai HRD (email perusahaan)
   ↓
   Lengkapi profil perusahaan (nama, industri, website, logo)
   ↓
   Verifikasi (email/domain)
   ↓
   Dashboard siap digunakan

2. PUBLISH LOWONGAN
   ↓
   Ke halaman "Kelola Lowongan"
   ↓
   Click "Buat Lowongan Baru"
   ↓
   Isi form:
     - Judul (e.g., "Frontend Developer Intern")
     - Deskripsi & tanggung jawab
     - Persyaratan & keahlian yang dicari
     - Jenis kerja (remote/onsite/hybrid)
     - Durasi (bulan)
     - Uang saku (IDR per bulan)
     - Kuota kandidat
     - Batas tanggal lamar
   ↓
   Publikasikan → status "Aktif"
   ↓
   Mulai menerima aplikasi

3. REVIEW PELAMAR
   ↓
   Lihat halaman "Daftar Pelamar" untuk lowongan tersebut
   ↓
   Lihat card/table: nama, universitas, jurusan, tanggal apply
   ↓
   Click "Lihat CV" → modal terbuka, PDF render langsung
   ↓
   Review CV & surat motivasi
   ↓
   Update status: "Ditinjau"
   ↓
   Tulis catatan privat (internal notes)

4. SHORTLIST & INTERVIEW
   ↓
   Pilih kandidat terbaik → ubah status ke "Dipanggil"
   ↓
   Sistem otomatis create chat room di MongoDB
   ↓
   Chat room link tersedia untuk HRD & mahasiswa
   ↓
   Buka tab "Chat" → lihat list interview rooms
   ↓
   Click room → mulai real-time messaging
   ↓
   Tanya-jawab, diskusi, assessment
   ↓
   HRD bisa "Tandai Diterima" atau ubah status jadi "Ditolak"

5. FINAL DECISION
   ↓
   Jika "Diterima" → room otomatis close
   ↓
   Mahasiswa dapat notif & bisa lihat badge "Diterima"
   ↓
   Jika "Ditolak" → status update, komunikasi selesai
   ↓
   Bisa ambil keputusan untuk lowongan lain

6. ANALYTICS & FOLLOW-UP
   ↓
   Dashboard menunjukkan:
     - Jumlah aplikasi per lowongan
     - Conversion rate (apply → dipanggil → diterima)
     - Response time rata-rata
   ↓
   Download export pelamar (future feature)
```

---

## 🏗️ Arsitektur Sistem

### Overview

MagangHub menggunakan **Dual-Backend Architecture** untuk optimal performance:

```
┌────────────────────────────────────────────────────────────┐
│                   BROWSER (User Device)                    │
│               Next.js 14 SPA (App Router)                  │
│          Tailwind CSS + Modern UI Components               │
└──────────┬──────────────────────────────────┬──────────────┘
           │                                  │
           │ REST API :8000                   │ WebSocket :3000
           │ (Form Submit, CRUD)              │ (Real-time Chat)
           │                                  │
      ┌────▼────────────┐              ┌─────▼──────────────┐
      │  MODULE A       │              │   MODULE B         │
      │  PHP 8.x        │              │   Node.js 18+      │
      │  + MySQL        │              │   + MongoDB        │
      │                 │              │   + Socket.IO      │
      │ • Auth          │              │                    │
      │ • Lowongan CRUD │◄─────┬──────►│ • Chat Server      │
      │ • Lamaran CRUD  │   cURL       │ • Interview Rooms  │
      │ • CV Upload     │  (async)     │ • Message History  │
      │ • CV Viewer     │              │                    │
      └────┬────────────┘              └─────┬──────────────┘
           │                                  │
      ┌────▼──────┐                   ┌──────▼────────┐
      │  MySQL    │                   │   MongoDB     │
      │ magang_db │                   │ magang_chat   │
      │           │                   │               │
      │ • users   │                   │ • ChatRoom    │
      │ • profil  │                   │ • ChatMessage │
      │ • lowongan│                   │               │
      │ • lamaran │                   │               │
      │           │                   │               │
      └───────────┘                   └───────────────┘

      Storage: /uploads/cv/
      └─────────────────┘
```

### Mengapa Dual-Backend?

| Aspek | Module A (PHP) | Module B (Node.js) |
|-------|----------------|-------------------|
| **Gunakan untuk** | Transactional data | Real-time, event-driven |
| **Kelebihan** | Mature, simple, fast | Lightweight, low-latency, async |
| **Use Case** | Auth, CRUD form, file storage | WebSocket, chat, notification |
| **Scaling** | Vertical easy | Horizontal easy |

---

## 🔄 Alur Teknis

### 1. Alur Registrasi & Login

```
REGISTRASI
──────────
Mahasiswa/HRD input email + password
         ↓
   Next.js form validation (client-side)
         ↓
   POST /auth/register to PHP :8000
   Body: { email, password, role }
         ↓
   PHP:
   • Validate email unique (SELECT * FROM users WHERE email = ?)
   • Hash password (PASSWORD_BCRYPT)
   • INSERT into users + profil_mahasiswa / profil_perusahaan
   • Generate JWT token (store in DB or use Bearer)
         ↓
   Response: { user_id, role, token, profile }
         ↓
   localStorage.setItem('token', token)
   localStorage.setItem('userId', user_id)
   localStorage.setItem('role', role)
         ↓
   Redirect ke dashboard atau profil completion page


LOGIN
─────
Email + password input
         ↓
   Next.js form validation
         ↓
   POST /auth/login to PHP :8000
   Body: { email, password }
         ↓
   PHP:
   • SELECT * FROM users WHERE email = ?
   • Verify password with password_verify()
   • Generate session token
   • Fetch profile data
         ↓
   Response: { user_id, role, token, profile }
         ↓
   localStorage save (same as register)
         ↓
   Redirect ke dashboard
         ↓
   API interceptor: semua request punya Authorization: Bearer {token}
```

### 2. Alur Upload CV

```
Mahasiswa di halaman /mahasiswa/profil
         ↓
   Lihat section "Upload CV"
   • Show current CV info (jika ada)
   • Drag-drop zone atau click to select
         ↓
   Select PDF file (max 5MB)
         ↓
   Client-side validation:
   • MIME type = application/pdf
   • Size < 5MB
   • Show progress bar
         ↓
   POST /mahasiswa/cv/upload (multipart/form-data)
   Headers: Authorization: Bearer {token}
   Body: { file: <PDF binary> }
         ↓
   PHP CVController.upload():
   • requireAuth() → check role === mahasiswa
   • finfo_open() → verify real MIME type = application/pdf
   • $filename = "cv_{$userId}_{$timestamp}.pdf"
   • move_uploaded_file() → /uploads/cv/{$filename}
   • UPDATE profil_mahasiswa SET:
       cv_filename = $filename
       cv_original_name = $_FILES['cv']['name']
       cv_uploaded_at = NOW()
         ↓
   Response: { success: true, filename, original_name }
         ↓
   Next.js: show success toast + "CV berhasil diupload"
   • Hide upload zone
   • Show card: "CV_name.pdf | Upload date | Download | Ganti CV"
```

### 3. Alur HRD Lihat CV Pelamar

```
HRD di halaman /hrd/lowongan/[id]/pelamar
         ↓
   Lihat table pelamar dengan kolom:
   • Nama, Universitas, Jurusan, Tgl Lamar, Status
   • Button "Lihat CV" untuk setiap pelamar
         ↓
   Click "Lihat CV" button
         ↓
   Next.js Modal terbuka
   • Show loading skeleton
         ↓
   Fetch PDF blob:
   GET /hrd/cv/{mahasiswa_user_id}
   Headers: Authorization: Bearer {token}
         ↓
   PHP CVController.viewByHRD():
   • requireAuth() → check role === hrd
   • $userId = $this->currentUser['id'] (HRD user_id)
   • $mahasiswaUserId = query parameter
   • Validate: ada lamaran di lowongan milik HRD yang dibuat oleh mahasiswa ini
     SELECT l.id FROM lamaran la
     JOIN lowongan l ON la.lowongan_id = l.id
     WHERE la.mahasiswa_user_id = ? AND l.perusahaan_user_id = ?
   • Jika valid: stream file
     header('Content-Type: application/pdf')
     readfile(UPLOAD_DIR . cv_filename)
   • Jika tidak valid: 403 Forbidden
         ↓
   Response: PDF as blob (binary)
         ↓
   Next.js:
   • Create object URL: const url = URL.createObjectURL(blob)
   • Set iframe src = url
   • Show PDF di modal
   • Button "Download" → trigger file download
   • On close modal: URL.revokeObjectURL(url)
         ↓
   HRD bisa review CV, kemudian update status dari dropdown
```

### 4. Alur Lamaran (Apply)

```
Mahasiswa lihat detail lowongan
         ↓
   Click button "Lamar Sekarang"
         ↓
   Modal form muncul:
   • Textarea "Surat Motivasi" (required)
         ↓
   Isi surat motivasi + click "Kirim Lamaran"
         ↓
   Next.js form validation (tidak kosong)
         ↓
   POST /lamaran
   Body: { lowongan_id, surat_motivasi }
   Headers: Authorization: Bearer {token}
         ↓
   PHP LamaranController.create():
   • requireAuth() → extract $mahasiswa_user_id
   • Validate: lowongan exist, not expired (batas_lamaran >= TODAY)
   • Validate: not duplicate
     SELECT id FROM lamaran 
     WHERE mahasiswa_user_id = ? AND lowongan_id = ?
   • Validate: kuota not full
     SELECT COUNT(*) FROM lamaran 
     WHERE lowongan_id = ? AND status IN ('dipanggil', 'diterima')
   • INSERT into lamaran:
     mahasiswa_user_id, lowongan_id, surat_motivasi, status='pending'
         ↓
   Response: { success: true, lamaran_id }
         ↓
   Next.js:
   • Close modal
   • Show toast "Lamaran berhasil dikirim!"
   • Redirect ke /mahasiswa/lamaran (atau auto-refresh)
         ↓
   HRD melihat aplikasi baru di /hrd/lowongan/[id]/pelamar
```

### 5. Alur Update Status Lamaran & Trigger Chat Room

```
HRD di halaman pelamar, click dropdown status untuk kandidat tertentu
         ↓
   Select status baru: "Ditinjau", "Dipanggil", "Diterima", atau "Ditolak"
         ↓
   PUT /hrd/lamaran/{lamaran_id}/status
   Body: { status: "ditinjau"|"dipanggil"|"diterima"|"ditolak", catatan: "..." }
   Headers: Authorization: Bearer {token}
         ↓
   PHP LamaranController.updateStatus():
   • requireAuth() → $hrdUserId = current user
   • Validate: lamaran exist
   • Validate: HRD owns lowongan yang punya lamaran ini
   • Validate: status in whitelist ['ditinjau','dipanggil','diterima','ditolak']
   • UPDATE lamaran SET status=?, catatan_hrd=?
   
   ★ IF status === 'dipanggil':
       • Generate $chatRoomId = "room_{lamaran_id}_" . time()
       • Fetch mahasiswa_user_id, hrd_user_id, lowongan title
       • **Fire async cURL to Node.js** (non-blocking):
         POST http://localhost:3000/api/rooms/create
         Body: {
           roomId: $chatRoomId,
           lamaranId: $lamaranId,
           mahasiswaUserId: $mahasiswaUserId,
           hrdUserId: $hrdUserId,
           lowonganTitle: $lowonganTitle
         }
         curl_setopt(CURLOPT_TIMEOUT, 3) // don't wait long
         
       • UPDATE lamaran SET chat_room_id = $chatRoomId
   
   ★ IF status === 'diterima' or 'ditolak':
       • Optional: close room di Node.js via cURL to PUT /api/rooms/{roomId}/close
         ↓
   Response: { success: true, chat_room_id (if dipanggil), status }
         ↓
   Next.js:
   • Update table row immediately (optimistic)
   • If new status === "dipanggil":
       • Show toast "Chat room dibuat! Buka di tab Chat untuk komunikasi"
       • Highlight atau scroll ke "Chat" nav
   • Else: just show "Status berhasil diperbarui"
         ↓

NODE.JS SIDE
────────────
Terima POST /api/rooms/create
         ↓
   • Check if room sudah exist (idempotent)
   • Create ChatRoom document di MongoDB:
     {
       roomId, lamaranId, mahasiswaUserId, hrdUserId,
       status: 'active', lastMessage: null, messageCount: 0,
       activeParticipants: []
     }
   • Create system message: "Sesi wawancara dimulai. Selamat datang!"
         ↓
   Response: { success: true, roomId }
         ↓

MAHASISWA SIDE
──────────────
Notifikasi: "HRD mengundang Anda untuk wawancara!"
         ↓
   Buka halaman /mahasiswa/lamaran
         ↓
   Status badge berubah dari "Pending" jadi "Dipanggil"
         ↓
   Chat icon jadi aktif (clickable)
         ↓
   Click chat → go to /mahasiswa/chat/[roomId]
```

### 6. Alur Real-Time Chat

```
Mahasiswa atau HRD membuka /chat/[roomId]
         ↓
   React useEffect():
   • connectSocket(userId, role, name) from lib/socket.ts
   • socket.connect()
   • socket.once('connect', () => {
       socket.emit('authenticate', { userId, role, name })
     })
         ↓
   Server (Node.js) io.on('connection', ...):
   • socket.data.userId = userId
   • socket.data.role = role
   • socket.data.name = name
   • activeUsers.set(userId, socket.id)
         ↓
   Client emit('join_room', { roomId })
         ↓
   Server socket.on('join_room', async ({ roomId }) => {...}):
   • Verify room exist di MongoDB
   • Verify user is mahasiswaUserId or hrdUserId of room
   • socket.join(roomId)
   • Add userId to room.activeParticipants
   • Fetch last 50 messages: ChatMessage.find({roomId}).sort({timestamp:-1})
   • Reverse array untuk chronological display
   • emit('chat_history', messages) to this socket
   • emit('user_joined', {userId, name, role}) to room (broadcast)
         ↓
   Client receive 'chat_history':
   • setState(messages)
   • Show messages list dengan scroll ke bawah
         ↓
   Mahasiswa/HRD type message di textarea
         ↓
   On input: socket.emit('typing', {roomId, isTyping: true})
   (debounce 500ms)
         ↓
   Server socket.on('typing', ...):
   • socket.to(roomId).emit('user_typing', {userId, name, isTyping})
         ↓
   Client receive 'user_typing':
   • Show "HRD sedang mengetik..." di atas message input
         ↓
   User click Send (or Enter key)
         ↓
   Validate: content.length <= 2000
         ↓
   socket.emit('send_message', {roomId, content})
         ↓
   Server socket.on('send_message', async ({roomId, content}) => {...}):
   • Verify room.status === 'active'
   • Create ChatMessage document:
     {
       roomId, senderId, senderName, senderRole: 'mahasiswa'|'hrd',
       content, messageType: 'text', isRead: false, timestamp: NOW
     }
   • Update ChatRoom: lastMessage, lastMessageAt, messageCount++
   • io.to(roomId).emit('new_message', messageDoc)
         ↓
   Both client receive 'new_message':
   • Add message ke list
   • Auto-scroll ke bawah
   • Clear textarea
   • Emit 'mark_read' untuk mark message sebagai read
         ↓
   Server on('mark_read', ...):
   • ChatMessage.updateMany({roomId, isRead: false, senderId != userId})
   • io.to(roomId).emit('messages_read', {byUserId})
         ↓
   Client receive 'messages_read':
   • Update message UI (show checkmark / "read" indicator)
         ↓

CLOSE CHAT
──────────
HRD click "Tandai Diterima" atau change status ke "ditolak"
         ↓
   PUT /hrd/lamaran/{lamaranId}/status dengan status baru
         ↓
   PHP update status + call Node.js:
   POST /api/rooms/{roomId}/close
         ↓
   Node.js: ChatRoom.updateOne({roomId}, {status: 'closed'})
         ↓
   Server broadcast to room: emit('room_closed', {reason: 'Keputusan telah dibuat'})
         ↓
   Client both side:
   • Disable message input
   • Show banner: "Sesi wawancara telah ditutup"
   • Jika mahasiswa: show final status badge ("Diterima" atau "Ditolak")
   • Jika HRD: confirm button, bisa lihat history chat tapi tidak bisa reply
```

---

## 💡 Value Proposition

### Untuk Mahasiswa

✅ **Transparansi Penuh**
- Real-time status tracking (tidak perlu tanya-tanya via email)
- Setiap tahap proses jelas terlihat

✅ **Pengalaman Aplikasi Mudah**
- Upload CV sekali, pakai berkali-kali
- Aplikasi cepat & simple (hanya surat motivasi)
- Tidak perlu email-email bolak-balik

✅ **Interview yang Produktif**
- Chat real-time dengan HRD (tidak perlu zoom link dll)
- Bisa dilakukan kapan saja, fleksibel
- Riwayat chat tersimpan untuk referensi

✅ **Keamanan Data**
- CV tersimpan aman di platform
- Hanya HRD yang apply yang bisa lihat CV
- Data profil terlindungi

### Untuk Perusahaan/HRD

✅ **Manajemen Pelamar Efisien**
- Satu dashboard untuk semua aplikasi
- Filter & sortir kandidat cepat
- CV terintegrasi, tidak perlu buka attachment

✅ **Proses Interview Cepat**
- Chat langsung dalam platform (tim sync lebih mudah)
- Tidak perlu tools pihak ketiga (zoom, email, drive)
- Audit trail otomatis

✅ **Decision Making yang Data-Driven**
- Lihat all candidates side-by-side
- Track waktu respons
- Catatan HRD terintegrasi per kandidat

✅ **Branding & Employer Image**
- Proses rekrutmen modern menunjukkan kultur company
- Kandidat yang ditolak tetap meninggalkan kesan baik (proses jelas)
- Rekomendasi ke teman easier (word-of-mouth)

### Untuk Platform/Investor

✅ **Sustainable Business Model**
- Freemium: mahasiswa gratis, HRD berbayar (per job posting)
- Premium features: branding, analytics, API
- Network effects: semakin banyak lowongan → semakin banyak mahasiswa

✅ **Skalabilitas**
- Architecture memungkinkan scale ke 100K+ users
- Chat real-time tidak berat (MongoDB + Socket.IO)
- CV storage sederhana (filesystem atau cloud storage)

✅ **Competitive Advantage**
- Real-time chat untuk interview (first mover advantage)
- Integrated CV viewer (no 3rd party tools)
- Dual-backend architecture (performance + reliability)

---

## 📋 Spesifikasi Fitur

### Feature: Browse & Filter Lowongan

**Halaman**: `/mahasiswa/lowongan`

**Komponen**:
- Search bar (keyword)
- Filter sidebar:
  - Jenis kerja: Remote / Onsite / Hybrid (checkbox)
  - Perusahaan (dropdown dengan autocomplete)
  - Durasi (slider: 1-6 bulan)
  - Minimum gaji (range slider)
- Card list lowongan dengan:
  - Logo perusahaan
  - Judul + nama perusahaan
  - Jenis (badge)
  - Durasi + gaji
  - 2-3 skill requirement
  - "Lamar" button (atau "Sudah Lamar" jika sudah apply)

**Backend Endpoint**:
```
GET /lowongan?
  jenis=remote,hybrid
  &keyword=frontend
  &perusahaan=abc
  &durasi_min=1&durasi_max=6
  &gaji_min=500000
  &page=1
  &limit=10

Response: {
  data: [{
    id, judul, perusahaan: {logo, nama_perusahaan},
    jenis, durasi_bulan, uang_saku,
    keahlian_dibutuhkan: ["React", "Node.js"],
    sudah_lamar: true|false
  }],
  pagination: {page, limit, total, pages}
}
```

---

### Feature: Upload & Manage CV

**Halaman**: `/mahasiswa/profil`

**Section CV Upload**:
- Drag-drop zone dengan border dashed
- Accept: `application/pdf` only
- Max: 5MB
- Show: "Drag PDF di sini atau klik untuk pilih"

**Current CV Card** (if exists):
- Nama file, size, upload date
- Button "Download", "Lihat", "Ganti"

**Upload Progress**:
- Progress bar dengan percentage
- Cancel button

**Validations**:
- Client-side: MIME type, size check
- Server-side: real MIME type check (finfo), size, auth check

---

### Feature: Kelola Lamaran (HRD View Pelamar)

**Halaman**: `/hrd/lowongan/[id]/pelamar`

**Table/Grid**:
| Kolom | Tipe | Action |
|-------|------|--------|
| Nama | text | - |
| Universitas | text | - |
| Jurusan | text | - |
| Tgl Lamar | date | - |
| Status | badge | Dropdown (change status) |
| CV | link | "Lihat CV" button |
| Motivasi | text | "Lihat" (expand inline) |

**Status Flow**:
```
Pending
   ↓
Ditinjau (manual HRD)
   ↓
(Dipanggil → create chat room)
   ↓
Diterima / Ditolak (close chat)
```

**Catatan HRD**:
- Text input under status dropdown
- Saved to DB (catatan_hrd field)
- Show in tooltip atau expandable section

---

### Feature: Real-Time Interview Chat

**Halaman**: `/[role]/chat/[roomId]`

**Header**:
- Back button
- Room title: "Wawancara — Lowongan: [Judul]"
- Participant info (show who's online)
- Close button (HRD only)

**Message List**:
- System message: "Sesi wawancara dimulai..."
- Chat bubbles:
  - Sent: right-aligned, pink/red bg
  - Received: left-aligned, gray bg
  - System: center, gray text, italic
- Avatar + name on first message from sender
- Timestamp (show on hover or below message)
- Read indicators (for HRD view)

**Message Input**:
- Textarea, max 2000 chars
- Char counter (e.g., "234/2000")
- Send button (or Enter to send, Shift+Enter newline)
- Typing indicator: "HRD sedang mengetik..."

**HRD Controls**:
- "Tandai Diterima" button (top right)
- Confirmation modal: "Terima kandidat ini?"
- On confirm: disable input, show "Diterima" badge, close chat

**Edge Cases**:
- Room not found → show error message
- Room closed → show "Sesi telah ditutup" banner, disable input
- Connection lost → show "Reconnecting..." + auto-reconnect
- Offline → show "Offline mode" indicator

---

### Feature: CV Viewer (Modal)

**Triggered**: HRD click "Lihat CV" in pelamar list

**Modal**:
- Full-height (90vh), centered
- Dark overlay background
- Close button (X top-right)

**Content**:
- PDF viewer (iframe with object URL)
- Loading skeleton (while blob fetching)
- Download button
- Print button (optional)

**Technical**:
```tsx
// Fetch blob
const blob = await api.get('/hrd/cv/{userId}', 
  { responseType: 'blob' }
)

// Create object URL
const url = URL.createObjectURL(blob)

// Set iframe
<iframe src={url} />

// On close
URL.revokeObjectURL(url)
```

---

## 🔐 Keamanan & Compliance

### Authentication & Authorization

**Token-based Auth**:
- Login generate JWT or custom token
- Store in localStorage (SPA)
- Attach to every API request: `Authorization: Bearer {token}`
- Backend validate token on every protected endpoint

**Role-based Access Control (RBAC)**:
```
GET /mahasiswa/* → only role === 'mahasiswa'
GET /hrd/* → only role === 'hrd'
GET /lowongan → public (no auth)
POST /lamaran → only mahasiswa
```

**Ownership Validation**:
```sql
-- UPDATE lowongan only if user owns it
UPDATE lowongan SET ... 
WHERE id = ? AND perusahaan_user_id = ?

-- HRD can only view CV of mahasiswa who applied to their lowongan
SELECT ... FROM lamaran la
JOIN lowongan l ON la.lowongan_id = l.id
WHERE la.mahasiswa_user_id = ? 
  AND l.perusahaan_user_id = ? -- HRD user_id
```

### Data Protection

**Password Security**:
- Hash with `PASSWORD_BCRYPT` (PHP)
- No plaintext storage
- Minimum 8 chars (client-side recommendation)

**CV Security**:
- MIME type validation server-side (finfo)
- File stored outside web root
- Served via authenticated endpoint
- Never expose real file path to client

**Session Security**:
- Token expiry (future: JWT with exp claim)
- Logout clears token from localStorage
- CORS: only allow requests from Next.js origin

**Data Privacy**:
- Mahasiswa CV hanya visible ke HRD yang relevan
- HRD profil perusahaan visible ke semua mahasiswa
- Chat history stored encrypted (future)

### Compliance (Indonesia)

**GDPR-like Compliance**:
- Privacy policy terlihat saat register
- User bisa request delete account (future)
- Data retention policy: lambat laun hapus data inactive users

**Terms of Service**:
- Jelas ownership CV dan interview transcript
- Tidak boleh share CV candidate ke pihak lain
- Disclaimer: platform tidak bertanggung jawab atas keputusan rekrutmen

---

## 🗺️ Roadmap Produk

### Phase 1 (MVP) — Current Codex
**Timeline**: 3-4 bulan

- [x] Auth (register/login)
- [x] Mahasiswa browse & apply
- [x] CV upload & view
- [x] HRD manage lowongan & pelamar
- [x] Status tracking
- [x] Real-time chat

### Phase 2 (Q2 2025)
**Timeline**: 2 bulan

- [ ] Email notifications (apply, status update, new message)
- [ ] SMS/WhatsApp reminder (optional)
- [ ] Analytics dashboard (HRD):
  - Conversion funnel
  - Response time metrics
  - Source analysis (search vs recommendation)
- [ ] Recommendation algorithm (suggest lowongan ke mahasiswa)
- [ ] Saved/Bookmarked lowongan (mahasiswa)

### Phase 3 (Q3 2025)
**Timeline**: 2 bulan

- [ ] Advanced search (saved filters, alerts)
- [ ] Bulk import lowongan (HRD — CSV upload)
- [ ] CV parser (extract skills auto dari PDF)
- [ ] Video interview (Agora SDK integration)
- [ ] Feedback form post-interview
- [ ] Referral system (mahasiswa refer teman)

### Phase 4 (Q4 2025)
**Timeline**: 2 bulan

- [ ] Verification badge (perusahaan terverifikasi)
- [ ] Premium features (featured posting, advanced analytics)
- [ ] API for partners (university, corporation partners)
- [ ] Mobile app (React Native)
- [ ] Multi-language support (EN + ID)

### Phase 5 (2026)
**Timeline**: Ongoing

- [ ] Marketplace ratings (mahasiswa rate interview process)
- [ ] Internship completion certificate
- [ ] Alumni network (stay connected post-internship)
- [ ] Corporate training programs integration
- [ ] International expansion

---

## ❓ FAQ & Troubleshooting

### Umum

**Q: Apakah MagangHub gratis?**
A: Ya, untuk mahasiswa 100% gratis. HRD/Perusahaan berbayar per job posting (model freemium akan dikembangkan).

**Q: Apakah CV saya aman di MagangHub?**
A: Ya, CV hanya bisa diakses oleh HRD yang Anda apply ke lowongannya. Platform menggunakan enkripsi & HTTPS.

**Q: Berapa lama proses review aplikasi?**
A: Tergantung perusahaan. Rata-rata 3-7 hari, tapi beberapa bisa lebih cepat/lambat.

**Q: Bisa apply ke banyak lowongan?**
A: Ya, bisa apply unlimited ke lowongan berbeda. Tapi satu lowongan hanya bisa 1 aplikasi per mahasiswa.

### Mahasiswa

**Q: CV saya sudah expired/mau ganti, bisa?**
A: Ya, buka profil → CV section → "Ganti CV". Otomatis update untuk semua aplikasi.

**Q: Status lamaran saya stuck di "Pending", kenapa?**
A: Kemungkinan HRD belum review. Coba tunggu atau hubungi perusahaan via email jika ada no kontak.

**Q: Gimana kalau diterima di multiple lowongan?**
A: Terserah Anda pilih yang mana. Update status di perusahaan lain jadi "Tolak" supaya mereka tahu.

**Q: Bisa lihat surat motivasi yang sudah kirim?**
A: Ya, buka lamaran → expand "Lihat Motivasi" buat lihat text yang kirim.

**Q: Chat bisa untuk diskusi non-interview?**
A: Idealnya interview, tapi teknisnya bisa apa saja. Gunakan secara profesional.

### HRD

**Q: Berapa mahasiswa yang bisa lihat lowongan saya?**
A: Semua mahasiswa terdaftar di platform. Exposure tergantung search & filter mereka.

**Q: Bisa ngerubah lowongan yang sudah published?**
A: Ya, buka halaman Kelola Lowongan → edit. Perubahan langsung terlihat.

**Q: Kalau mau close lowongan sebelum batas lamaran, bisa?**
A: Ya, ubah status dari "Aktif" → "Ditutup". Tidak ada aplikasi baru yang masuk.

**Q: Chat ditutup tapi mau buka lagi, gimana?**
A: Saat ini chat auto-close saat Anda klik "Tandai Diterima/Ditolak". Feature re-open ada di roadmap.

**Q: Bisa download semua data pelamar?**
A: Belum, tapi ada di roadmap Phase 2 (CSV export).

**Q: Berapa kuota pelamar per lowongan?**
A: Technically unlimited, tapi recommended set kuota (misal 10 orang) untuk fokus pada kandidat terbaik.

### Technical

**Q: Apa itu Socket.IO?**
A: Technology untuk real-time chat. Memungkinkan message langsung tanpa refresh.

**Q: Kenapa ada PHP dan Node.js?**
A: PHP untuk CRUD data (fast, simple), Node.js untuk real-time (websocket efficient).

**Q: Bisa akses dari mobile?**
A: Ya, Next.js responsive. Optimal di desktop, tapi bisa di mobile (scroll horizontal).

**Q: Kenapa CV hanya accept PDF?**
A: Untuk konsistensi formatting & keamanan (avoid executable files).

**Q: Berapa ukuran CV bisa diupload?**
A: Max 5MB per file. Untuk CV standar (1-2 halaman), cukup (typical PDF = 500KB-2MB).

### Troubleshooting

**Problem: "Gagal upload CV"**
- Pastikan file adalah PDF asli (bukan rename .docx ke .pdf)
- Ukuran < 5MB
- Koneksi internet stabil
- Coba refresh halaman & upload lagi

**Problem: "CV tidak tampil di HRD view"**
- Mahasiswa sudah upload CV? (Check di profil)
- HRD sudah lihat daftar pelamar? (Klik lowongan → tab Pelamar)
- Coba refresh browser

**Problem: "Chat tidak muncul setelah diklik Dipanggil"**
- Refresh halaman (chat server mungkin sedang setup)
- Coba buka Chat tab dan join room manual
- Jika masih error, mungkin ada koneksi ke Node.js yang timeout

**Problem: "Logout tapi tetap login"**
- Clear localStorage manually: 
  - Inspect → Application → localStorage → delete token/userId
- Clear cookies & site data
- Hard refresh (Ctrl+Shift+R)

---

## 📞 Support & Contact

**Email**: support@maganghub.id
**Docs**: https://docs.maganghub.id
**Status Page**: https://status.maganghub.id
**Community**: [Discord Link]
**Bug Report**: https://github.com/maganghub/issues

---

## 📄 Metadata

**Document Version**: 2.0
**Last Updated**: May 2026
**Author**: MagangHub Product Team
**Status**: Production Ready
**Maintained By**: @product-team

---

*MagangHub — Connecting Talents to Opportunities*
