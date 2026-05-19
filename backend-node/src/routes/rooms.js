const express = require('express');

function createRoomsRouter(io, store) {
  const router = express.Router();

  router.post('/create', async (req, res, next) => {
    try {
      const { roomId, lamaranId, mahasiswaUserId, hrdUserId, lowonganTitle = '' } = req.body || {};

      if (!roomId || !lamaranId || !mahasiswaUserId || !hrdUserId) {
        return res.status(422).json({ success: false, message: 'Data room tidak lengkap.' });
      }

      const room = await store.createRoom({ roomId, lamaranId, mahasiswaUserId, hrdUserId, lowonganTitle });
      const systemContent = 'Sesi wawancara dimulai. Selamat datang!';
      await store.ensureSystemMessage(roomId, systemContent);

      return res.json({ success: true, roomId: room.roomId });
    } catch (error) {
      return next(error);
    }
  });

  router.post('/:roomId/close', async (req, res, next) => {
    try {
      const { roomId } = req.params;
      const room = await store.closeRoom(roomId);

      if (!room) {
        return res.status(404).json({ success: false, message: 'Room tidak ditemukan.' });
      }

      io.to(roomId).emit('room_closed', { reason: 'Keputusan telah dibuat' });
      return res.json({ success: true, roomId });
    } catch (error) {
      return next(error);
    }
  });

  return router;
}

module.exports = createRoomsRouter;
