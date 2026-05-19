const express = require('express');
const ChatRoom = require('../models/ChatRoom');
const ChatMessage = require('../models/ChatMessage');

function createRoomsRouter(io) {
  const router = express.Router();

  router.post('/create', async (req, res, next) => {
    try {
      const { roomId, lamaranId, mahasiswaUserId, hrdUserId, lowonganTitle = '' } = req.body || {};

      if (!roomId || !lamaranId || !mahasiswaUserId || !hrdUserId) {
        return res.status(422).json({ success: false, message: 'Data room tidak lengkap.' });
      }

      let room = await ChatRoom.findOne({ roomId });

      if (!room) {
        room = await ChatRoom.create({
          roomId,
          lamaranId,
          mahasiswaUserId,
          hrdUserId,
          lowonganTitle,
          status: 'active',
          lastMessage: null,
          lastMessageAt: null,
          messageCount: 0,
          activeParticipants: [],
        });

        await ChatMessage.create({
          roomId,
          senderId: 0,
          senderName: 'System',
          senderRole: 'system',
          type: 'system',
          messageType: 'system',
          content: 'Sesi wawancara dimulai. Selamat datang!',
          isRead: true,
          timestamp: new Date(),
        });
      }

      return res.json({ success: true, roomId: room.roomId });
    } catch (error) {
      return next(error);
    }
  });

  router.get('/:roomId', async (req, res, next) => {
    try {
      const { roomId } = req.params;
      const room = await ChatRoom.findOne({ roomId }).lean();

      if (!room) {
        return res.status(404).json({ success: false, message: 'Room not found' });
      }

      return res.json({
        success: true,
        data: {
          roomId: room.roomId,
          lamaranId: room.lamaranId,
          mahasiswaUserId: room.mahasiswaUserId,
          hrdUserId: room.hrdUserId,
          lowonganTitle: room.lowonganTitle,
          status: room.status,
          activeParticipants: room.activeParticipants || [],
        },
      });
    } catch (error) {
      return next(error);
    }
  });

  router.put('/:roomId/close', async (req, res, next) => {
    try {
      const { roomId } = req.params;
      const room = await ChatRoom.findOneAndUpdate({ roomId }, { status: 'closed' }, { new: true });

      if (!room) {
        return res.status(404).json({ success: false, message: 'Room not found' });
      }

      io.to(roomId).emit('room_closed', { roomId, reason: 'Keputusan telah dibuat' });
      return res.json({ success: true });
    } catch (error) {
      return next(error);
    }
  });

  return router;
}

module.exports = { createRoomsRouter };
