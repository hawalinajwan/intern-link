const path = require('path');
const { once } = require('events');
const { io } = require('socket.io-client');
const { spawnSync } = require('child_process');

const ChatRoom = require('../backend-node/models/ChatRoom');
const { connectMongoDB } = require('../backend-node/config/mongodb');

const API_BASE = 'http://127.0.0.1:8000';
const SOCKET_URL = 'http://127.0.0.1:3000';
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/magang_chat';

async function main() {
  const runId = Date.now();
  const mahasiswaEmail = `mahasiswa.${runId}@example.com`;
  const hrdEmail = `hrd.${runId}@example.com`;
  const hrdOtherEmail = `hrd.other.${runId}@example.com`;
  const password = 'Password123!';
  const pdfBytes = createSamplePdf(`intern-link-${runId}`);

  const results = [];

  await connectMongoDB();

  try {
    logStep('Starting FLOW 1 — Mahasiswa Register & Setup');
    results.push(await flowMahasiswaSetup({ mahasiswaEmail, password, pdfBytes }));
    logStep('Starting FLOW 2 — HRD Register & Publish Lowongan');
    results.push(await flowHrdPublish({ hrdEmail, password }));
    logStep('Starting FLOW 3 — Apply & Status Flow');
    const shared = await flowApplyAndStatus({
      mahasiswaToken: results[0].token,
      mahasiswaUserId: results[0].userId,
      hrdToken: results[1].token,
      hrdUserId: results[1].userId,
      lowonganId: results[1].lowonganId,
    });
    results.push(shared);
    logStep('Starting FLOW 4 — Real-Time Chat');
    results.push(await flowRealtimeChat(shared));
    logStep('Starting FLOW 5 — Final Decision');
    results.push(await flowFinalDecision(shared));
    logStep('Starting FLOW 6 — Security Checks');
    results.push(await flowSecurityChecks({
      mahasiswaToken: results[0].token,
      mahasiswaUserId: results[0].userId,
      hrdToken: results[1].token,
      hrdOtherEmail,
      password,
      lowonganId: results[1].lowonganId,
    }));
  } finally {
    const mongoose = require('../backend-node/node_modules/mongoose');
    await mongoose.disconnect();
  }

  console.log(JSON.stringify({ success: true, results }, null, 2));
}

function logStep(message) {
  console.log(`[e2e] ${message}`);
}

async function flowMahasiswaSetup({ mahasiswaEmail, password, pdfBytes }) {
  const register = await postJson('/auth/register', {
    email: mahasiswaEmail,
    password,
    role: 'mahasiswa',
  });
  assertStatus(register.status, 201, 'Mahasiswa register should return 201');

  const mahasiswaToken = register.body.data.token;
  const mahasiswaUserId = register.body.data.user_id;

  const profile = await putJson('/mahasiswa/profil', {
    nama: 'Alya Mahasiswa',
    universitas: 'Institut Teknologi Intern Link',
    jurusan: 'Teknik Informatika',
  }, mahasiswaToken);
  assertStatus(profile.status, 200, 'Mahasiswa profile update should return 200');

  const upload = await uploadPdf('/mahasiswa/cv/upload', mahasiswaToken, pdfBytes, 'sample-cv.pdf');
  assertStatus(upload.status, 200, 'Mahasiswa CV upload should return 200');

  return {
    flow: 'FLOW 1',
    token: mahasiswaToken,
    userId: mahasiswaUserId,
  };
}

async function flowHrdPublish({ hrdEmail, password }) {
  const register = await postJson('/auth/register', {
    email: hrdEmail,
    password,
    role: 'hrd',
  });
  assertStatus(register.status, 201, 'HRD register should return 201');

  const hrdToken = register.body.data.token;
  const hrdUserId = register.body.data.user_id;

  const profile = await putJson('/hrd/profil', {
    nama_perusahaan: 'PT Intern Link Nusantara',
    industri: 'Technology',
    website: 'https://example.com',
  }, hrdToken);
  assertStatus(profile.status, 200, 'HRD profile update should return 200');

  const lowongan = await postJson('/hrd/lowongan', {
    judul: 'Frontend Engineer Intern',
    deskripsi: 'Membangun UI internship platform.',
    persyaratan: 'Mengerti React dan TypeScript.',
    keahlian_dibutuhkan: ['React', 'TypeScript'],
    jenis: 'remote',
    durasi_bulan: 3,
    uang_saku: 2000000,
    kuota: 2,
    batas_lamaran: '2099-12-31',
    status: 'aktif',
  }, hrdToken);
  assertStatus(lowongan.status, 201, 'HRD create lowongan should return 201');

  return {
    flow: 'FLOW 2',
    token: hrdToken,
    userId: hrdUserId,
    lowonganId: lowongan.body.data.id,
  };
}

async function flowApplyAndStatus({ mahasiswaToken, mahasiswaUserId, hrdToken, hrdUserId, lowonganId }) {
  const apply = await postJson('/lamaran', {
    lowongan_id: lowonganId,
    surat_motivasi: 'Saya tertarik dengan posisi ini karena ingin membangun produk rekrutmen modern dan belajar langsung dari tim engineering yang kuat.',
  }, mahasiswaToken);
  assertStatus(apply.status, 201, 'Mahasiswa apply should return 201');

  const lamaranId = apply.body.data.lamaran_id;

  const ditinjau = await putJson(`/hrd/lamaran/${lamaranId}/status`, {
    status: 'ditinjau',
    catatan: 'CV cukup menarik untuk ditinjau lanjut.',
  }, hrdToken);
  assertStatus(ditinjau.status, 200, 'Status ditinjau should return 200');

  const dipanggil = await putJson(`/hrd/lamaran/${lamaranId}/status`, {
    status: 'dipanggil',
    catatan: 'Ajak interview chat.',
  }, hrdToken);
  assertStatus(dipanggil.status, 200, 'Status dipanggil should return 200');

  const mahasiswaLamaran = await getJson('/mahasiswa/lamaran', mahasiswaToken);
  assertStatus(mahasiswaLamaran.status, 200, 'Mahasiswa lamaran list should return 200');

  const lamaran = (mahasiswaLamaran.body.data || []).find((item) => item.lamaran_id === lamaranId);
  if (!lamaran || !lamaran.chat_room_id) {
    throw new Error('chat_room_id was not saved after status dipanggil');
  }

  const chatRoom = await ChatRoom.findOne({ roomId: lamaran.chat_room_id }).lean();
  if (!chatRoom) {
    throw new Error('ChatRoom document was not created in MongoDB');
  }

  return {
    flow: 'FLOW 3',
    mahasiswaToken,
    mahasiswaUserId,
    hrdToken,
    hrdUserId,
    lowonganId,
    lamaranId,
    roomId: lamaran.chat_room_id,
  };
}

async function flowRealtimeChat(shared) {
  const mahasiswaSocket = io(SOCKET_URL, { transports: ['websocket'], forceNew: true });
  const hrdSocket = io(SOCKET_URL, { transports: ['websocket'], forceNew: true });

  try {
    await Promise.all([once(mahasiswaSocket, 'connect'), once(hrdSocket, 'connect')]);

    mahasiswaSocket.emit('authenticate', {
      userId: shared.mahasiswaUserId,
      role: 'mahasiswa',
      name: 'Alya Mahasiswa',
    });
    hrdSocket.emit('authenticate', {
      userId: shared.hrdUserId,
      role: 'hrd',
      name: 'PT Intern Link Nusantara',
    });

    const mahasiswaHistory = waitForEvent(mahasiswaSocket, 'chat_history');
    const hrdHistory = waitForEvent(hrdSocket, 'chat_history');
    mahasiswaSocket.emit('join_room', { roomId: shared.roomId });
    hrdSocket.emit('join_room', { roomId: shared.roomId });
    await Promise.all([mahasiswaHistory, hrdHistory]);

    const hrdReceivesMahasiswa = waitForEvent(hrdSocket, 'new_message');
    mahasiswaSocket.emit('send_message', {
      roomId: shared.roomId,
      content: 'Halo Kak, saya siap untuk interview.',
    });
    const msgForHrd = await hrdReceivesMahasiswa;
    if (msgForHrd.content !== 'Halo Kak, saya siap untuk interview.') {
      throw new Error('HRD did not receive mahasiswa message correctly');
    }

    const mahasiswaReceivesHrd = waitForEvent(mahasiswaSocket, 'new_message');
    hrdSocket.emit('send_message', {
      roomId: shared.roomId,
      content: 'Halo Alya, terima kasih. Mari kita mulai.',
    });
    const msgForMahasiswa = await mahasiswaReceivesHrd;
    if (msgForMahasiswa.content !== 'Halo Alya, terima kasih. Mari kita mulai.') {
      throw new Error('Mahasiswa did not receive HRD message correctly');
    }

    const typingPromise = waitForEvent(hrdSocket, 'user_typing');
    mahasiswaSocket.emit('typing', { roomId: shared.roomId, isTyping: true });
    const typing = await typingPromise;
    if (!typing.isTyping) {
      throw new Error('Typing event was not received by the other side');
    }

    return { flow: 'FLOW 4' };
  } finally {
    mahasiswaSocket.disconnect();
    hrdSocket.disconnect();
  }
}

async function flowFinalDecision(shared) {
  const mahasiswaSocket = io(SOCKET_URL, { transports: ['websocket'], forceNew: true });
  const hrdSocket = io(SOCKET_URL, { transports: ['websocket'], forceNew: true });

  try {
    await Promise.all([once(mahasiswaSocket, 'connect'), once(hrdSocket, 'connect')]);
    mahasiswaSocket.emit('authenticate', {
      userId: shared.mahasiswaUserId,
      role: 'mahasiswa',
      name: 'Alya Mahasiswa',
    });
    hrdSocket.emit('authenticate', {
      userId: shared.hrdUserId,
      role: 'hrd',
      name: 'PT Intern Link Nusantara',
    });
    mahasiswaSocket.emit('join_room', { roomId: shared.roomId });
    hrdSocket.emit('join_room', { roomId: shared.roomId });
    await Promise.all([waitForEvent(mahasiswaSocket, 'chat_history'), waitForEvent(hrdSocket, 'chat_history')]);

    const mahasiswaClosed = waitForEvent(mahasiswaSocket, 'room_closed');
    const hrdClosed = waitForEvent(hrdSocket, 'room_closed');

    const diterima = await putJson(`/hrd/lamaran/${shared.lamaranId}/status`, {
      status: 'diterima',
      catatan: 'Lolos interview.',
    }, shared.hrdToken);
    assertStatus(diterima.status, 200, 'Status diterima should return 200');

    await Promise.all([mahasiswaClosed, hrdClosed]);

    const chatRoom = await ChatRoom.findOne({ roomId: shared.roomId }).lean();
    if (!chatRoom || chatRoom.status !== 'closed') {
      throw new Error('ChatRoom status was not closed in MongoDB');
    }

    return { flow: 'FLOW 5' };
  } finally {
    mahasiswaSocket.disconnect();
    hrdSocket.disconnect();
  }
}

async function flowSecurityChecks({ mahasiswaToken, mahasiswaUserId, hrdToken, hrdOtherEmail, password, lowonganId }) {
  const hrdOtherRegister = await postJson('/auth/register', {
    email: hrdOtherEmail,
    password,
    role: 'hrd',
  });
  assertStatus(hrdOtherRegister.status, 201, 'Second HRD register should return 201');
  const hrdOtherToken = hrdOtherRegister.body.data.token;

  const forbiddenCv = await fetchRaw(`${API_BASE}/hrd/cv/${mahasiswaUserId}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${hrdOtherToken}` },
  });
  assertStatus(forbiddenCv.status, 403, 'Unrelated HRD should get 403 on CV access');

  const duplicateApply = await postJson('/lamaran', {
    lowongan_id: lowonganId,
    surat_motivasi: 'Saya mengirim lamaran kedua untuk menguji validasi duplicate apply di sistem.',
  }, mahasiswaToken);
  assertStatus(duplicateApply.status, 409, 'Duplicate apply should return 409');

  const forbiddenUpdate = await putJson(`/hrd/lowongan/${lowonganId}`, {
    judul: 'Should Not Update',
  }, hrdOtherToken);
  assertStatus(forbiddenUpdate.status, 403, 'Different HRD should get 403 on lowongan update');

  return { flow: 'FLOW 6' };
}

async function postJson(pathname, body, token) {
  return requestJson(pathname, 'POST', body, token);
}

async function putJson(pathname, body, token) {
  return requestJson(pathname, 'PUT', body, token);
}

async function getJson(pathname, token) {
  const response = await fetchRaw(`${API_BASE}${pathname}`, {
    method: 'GET',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  return {
    status: response.status,
    body: await parseResponseBody(response),
  };
}

async function requestJson(pathname, method, body, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetchRaw(`${API_BASE}${pathname}`, {
    method,
    headers,
    body: JSON.stringify(body),
  });

  return {
    status: response.status,
    body: await parseResponseBody(response),
  };
}

async function uploadPdf(pathname, token, pdfBytes, filename) {
  const form = new FormData();
  form.append('cv', new Blob([pdfBytes], { type: 'application/pdf' }), filename);

  const response = await fetchRaw(`${API_BASE}${pathname}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });

  return {
    status: response.status,
    body: await parseResponseBody(response),
  };
}

async function fetchRaw(url, options) {
  const response = await fetch(url, options);
  return response;
}

async function parseResponseBody(response) {
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    return response.json();
  }

  return response.text();
}

function assertStatus(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(`${message}. Expected ${expected}, got ${actual}`);
  }
}

function waitForEvent(socket, eventName, timeoutMs = 6000) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      socket.off(eventName, onEvent);
      reject(new Error(`Timed out waiting for ${eventName}`));
    }, timeoutMs);

    function onEvent(payload) {
      clearTimeout(timeout);
      socket.off(eventName, onEvent);
      resolve(payload);
    }

    socket.on(eventName, onEvent);
  });
}

function createSamplePdf(label) {
  const lines = [
    '%PDF-1.4',
    '1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj',
    '2 0 obj<</Type/Pages/Count 1/Kids[3 0 R]>>endobj',
    '3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 300 144]/Contents 4 0 R/Resources<</Font<</F1 5 0 R>>>>>>endobj',
    `4 0 obj<</Length 65>>stream`,
    'BT',
    '/F1 18 Tf',
    '36 96 Td',
    `(${label}) Tj`,
    'ET',
    'endstream',
    'endobj',
    '5 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj',
    'xref',
    '0 6',
    '0000000000 65535 f ',
    '0000000010 00000 n ',
    '0000000053 00000 n ',
    '0000000108 00000 n ',
    '0000000228 00000 n ',
    '0000000343 00000 n ',
    'trailer<</Size 6/Root 1 0 R>>',
    'startxref',
    '413',
    '%%EOF',
  ];

  return Buffer.from(lines.join('\n'), 'utf8');
}

main().catch((error) => {
  console.error(JSON.stringify({ success: false, error: error.message }, null, 2));
  process.exit(1);
});
