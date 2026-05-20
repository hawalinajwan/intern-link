const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');
const { connectMongo } = require('./config/mongo');
const createRoomsRouter = require('./routes/rooms');
const { registerSocketHandlers } = require('./socket/handlers');
const { createMemoryStore } = require('./store/memoryStore');
const { createMongoStore } = require('./store/mongoStore');

const port = Number(process.env.PORT || 3000);
const frontendOrigin = (process.env.CLIENT_URL || process.env.FRONTEND_ORIGIN || 'https://intern-link.hawali.site')
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean);

async function bootstrap() {
  const mongoConnected = await connectMongo();
  const store = mongoConnected ? createMongoStore() : createMemoryStore();

  const app = express();
  const server = http.createServer(app);
  const io = new Server(server, {
    cors: {
      origin: frontendOrigin,
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  app.use(cors({ origin: frontendOrigin, credentials: true }));
  app.use(express.json());

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', store: store.name });
  });

  app.use('/api/rooms', createRoomsRouter(io, store));
  registerSocketHandlers(io, store);

  app.use((error, _req, res, _next) => {
    console.error(error);
    res.status(500).json({ success: false, message: 'Terjadi kesalahan server.' });
  });

  server.listen(port, () => {
    console.log(`Socket.IO chat server listening on port ${port} using ${store.name} store`);
  });
}

bootstrap().catch((error) => {
  console.error(error);
  process.exit(1);
});
