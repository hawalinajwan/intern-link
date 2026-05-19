const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');
const roomsRouter = require('./routes/rooms');
const { initSocket } = require('./socket/handlers');
const { connectMongoDB } = require('./config/mongodb');

const PORT = 3000;

async function bootstrap() {
  await connectMongoDB();

  const app = express();
  const server = http.createServer(app);
  const io = new Server(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST', 'PUT', 'DELETE'],
    },
  });

  app.use(cors({ origin: '*' }));
  app.use(express.json());

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.use('/api/rooms', roomsRouter);
  initSocket(io);

  app.use((error, _req, res, _next) => {
    console.error(error);
    res.status(500).json({ success: false, message: 'Terjadi kesalahan server.' });
  });

  server.listen(PORT, () => {
    console.log(`Socket.IO chat server listening on port ${PORT}`);
  });
}

bootstrap().catch((error) => {
  console.error(error);
  process.exit(1);
});
