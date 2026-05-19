const ChatRoom = require('../models/ChatRoom');
const ChatMessage = require('../models/ChatMessage');

function initSocket(io) {
  io.on('connection', (socket) => {
    socket.data.joinedRooms = new Set();

    socket.on('authenticate', ({ userId, role, name } = {}) => {
      if (!userId || !['mahasiswa', 'hrd'].includes(role) || typeof name !== 'string' || !name.trim()) {
        return emitSocketError(socket, 'Unauthorized');
      }

      socket.data.userId = userId;
      socket.data.role = role;
      socket.data.name = name;
    });

    socket.on('join_room', async ({ roomId } = {}) => {
      try {
        if (!socket.data.userId) return emitSocketError(socket, 'Unauthorized');
        if (!roomId) return emitSocketError(socket, 'Room not found');

        const room = await ChatRoom.findOne({ roomId });
        if (!room) return emitSocketError(socket, 'Room not found');

        const userId = socket.data.userId;
        const isParticipant = room.mahasiswaUserId == userId || room.hrdUserId == userId;
        if (!isParticipant) return emitSocketError(socket, 'Forbidden');

        socket.join(roomId);
        socket.data.joinedRooms.add(roomId);

        await ChatRoom.updateOne({ roomId }, { $addToSet: { activeParticipants: userId } });
        const freshRoom = await ChatRoom.findOne({ roomId }).lean();

        const messages = await ChatMessage.find({ roomId }).sort({ timestamp: -1 }).limit(50).lean();
        socket.emit('room_meta', {
          roomId,
          lamaranId: freshRoom?.lamaranId,
          lowonganTitle: freshRoom?.lowonganTitle || '',
          status: freshRoom?.status || 'active',
          activeParticipants: freshRoom?.activeParticipants || [],
        });
        socket.emit('chat_history', messages.reverse());

        socket.to(roomId).emit('user_joined', {
          userId,
          name: socket.data.name,
          role: socket.data.role,
        });
      } catch (error) {
        emitSocketError(socket, 'Server error');
      }
    });

    socket.on('send_message', async ({ roomId, content } = {}) => {
      try {
        if (!socket.data.userId) return emitSocketError(socket, 'Unauthorized');
        if (!roomId) return emitSocketError(socket, 'Room not found');
        if (typeof content !== 'string' || !content.trim() || content.length > 2000) return;

        const room = await ChatRoom.findOne({ roomId });
        if (!room || room.status !== 'active') {
          return emitSocketError(socket, 'Room closed');
        }

        const userId = socket.data.userId;
        const isParticipant = room.mahasiswaUserId == userId || room.hrdUserId == userId;
        if (!isParticipant) return emitSocketError(socket, 'Forbidden');

        const msg = await ChatMessage.create({
          roomId,
          senderId: socket.data.userId,
          senderName: socket.data.name,
          senderRole: socket.data.role,
          content: content.trim(),
          type: 'text',
          messageType: 'text',
          isRead: false,
          timestamp: new Date(),
        });

        await ChatRoom.updateOne(
          { roomId },
          {
            $set: {
              lastMessage: content.trim(),
              lastMessageAt: new Date(),
            },
            $inc: { messageCount: 1 },
          }
        );

        io.to(roomId).emit('new_message', msg);
      } catch (error) {
        emitSocketError(socket, 'Server error');
      }
    });

    socket.on('typing', async ({ roomId, isTyping } = {}) => {
      try {
        if (!socket.data.userId || !roomId) return;

        const room = await ChatRoom.findOne({ roomId }).lean();
        if (!room) return;

        const isParticipant = room.mahasiswaUserId == socket.data.userId || room.hrdUserId == socket.data.userId;
        if (!isParticipant) return;

        socket.to(roomId).emit('user_typing', {
          userId: socket.data.userId,
          name: socket.data.name,
          isTyping: Boolean(isTyping),
        });
      } catch (error) {
        emitSocketError(socket, 'Server error');
      }
    });

    socket.on('mark_read', async ({ roomId } = {}) => {
      try {
        if (!socket.data.userId || !roomId) return;

        const room = await ChatRoom.findOne({ roomId }).lean();
        if (!room) return;

        const isParticipant = room.mahasiswaUserId == socket.data.userId || room.hrdUserId == socket.data.userId;
        if (!isParticipant) return;

        await ChatMessage.updateMany(
          { roomId, isRead: false, senderId: { $ne: socket.data.userId } },
          { $set: { isRead: true } }
        );
        socket.to(roomId).emit('messages_read', { byUserId: socket.data.userId });
      } catch (error) {
        emitSocketError(socket, 'Server error');
      }
    });

    socket.on('disconnecting', async () => {
      await removeFromActiveRooms(io, socket);
    });

    socket.on('disconnect', async () => {
      await removeFromActiveRooms(io, socket);
    });
  });
}

function emitSocketError(socket, message) {
  socket.emit('error', { message });
}

async function removeFromActiveRooms(io, socket) {
  const userId = socket.data.userId;
  if (!userId || !socket.data.joinedRooms) return;

  const roomIds = [...socket.data.joinedRooms].filter((roomId) => roomId !== socket.id);
  if (roomIds.length === 0) return;

  await ChatRoom.updateMany({ roomId: { $in: roomIds } }, { $pull: { activeParticipants: userId } });
  roomIds.forEach((roomId) => {
    io.to(roomId).emit('user_left', { roomId, userId });
  });
  socket.data.joinedRooms.clear();
}

module.exports = { initSocket };
