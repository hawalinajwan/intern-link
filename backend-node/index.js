const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');
const { loadEnv } = require('./config/load-env');
const { createRoomsRouter } = require('./routes/rooms');
const { initSocket } = require('./socket/handlers');
const { connectMongoDB } = require('./config/mongodb');

loadEnv();

const PORT = Number(process.env.PORT || 3000);
const HOST = '0.0.0.0';

function configuredOrigins() {
  const raw = process.env.CLIENT_URL || '';
  return raw
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
}

function isAllowedOrigin(origin) {
  if (!origin) return true;

  try {
    const { hostname } = new URL(origin);
    if (configuredOrigins().includes(origin)) {
      return true;
    }

    return hostname === 'intern-link.hawali.site' || hostname.endsWith('.hawali.site');
  } catch {
    return false;
  }
}

async function bootstrap() {
  await connectMongoDB();

  const app = express();
  app.set('trust proxy', true);
  const server = http.createServer(app);
  const io = new Server(server, {
    cors: {
      origin: (origin, callback) => callback(null, isAllowedOrigin(origin)),
      methods: ['GET', 'POST', 'PUT', 'DELETE'],
      credentials: true,
    },
    transports: ['websocket', 'polling'],
  });

  app.use(cors({
    origin(origin, callback) {
      callback(null, isAllowedOrigin(origin));
    },
    credentials: true,
  }));
  app.use(express.json());

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  initSocket(io);
  app.use('/api/rooms', createRoomsRouter(io));

  app.use((error, _req, res, _next) => {
    console.error(error);
    res.status(500).json({ success: false, message: 'Terjadi kesalahan server.' });
  });

  server.listen(PORT, HOST, () => {
    console.log(`Socket.IO chat server listening on ${HOST}:${PORT}`);
  });
}

bootstrap().catch((error) => {
  console.error(error);
  process.exit(1);
});
