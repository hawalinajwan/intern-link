const ChatRoom = require('../models/ChatRoom');
const ChatMessage = require('../models/ChatMessage');

function initSocket(io) {
  io.on('connection', (socket) => {
    socket.data.joinedRooms = new Set();

    socket.on('authenticate', ({ userId, role, name } = {}) => {
      socket.data.userId = userId;
      socket.data.role = role;
      socket.data.name = name;
    });

    socket.on('join_room', async ({ roomId } = {}) => {
      try {
        const room = await ChatRoom.findOne({ roomId });
        if (!room) return socket.emit('error', { message: 'Room not found' });

        const userId = socket.data.userId;
        const isParticipant = room.mahasiswaUserId == userId || room.hrdUserId == userId;
        if (!isParticipant) return socket.emit('error', { message: 'Forbidden' });

        socket.join(roomId);
        socket.data.joinedRooms.add(roomId);

        await ChatRoom.updateOne({ roomId }, { $addToSet: { activeParticipants: userId } });

        const messages = await ChatMessage.find({ roomId }).sort({ timestamp: -1 }).limit(50).lean();
        socket.emit('chat_history', messages.reverse());

        socket.to(roomId).emit('user_joined', {
          userId,
          name: socket.data.name,
          role: socket.data.role,
        });
      } catch (error) {
        socket.emit('error', { message: 'Server error' });
      }
    });

    socket.on('send_message', async ({ roomId, content } = {}) => {
      try {
        if (!content || content.length > 2000) return;

        const room = await ChatRoom.findOne({ roomId });
        if (!room || room.status !== 'active') {
          return socket.emit('error', { message: 'Room closed' });
        }

        const userId = socket.data.userId;
        const isParticipant = room.mahasiswaUserId == userId || room.hrdUserId == userId;
        if (!isParticipant) return socket.emit('error', { message: 'Forbidden' });

        const msg = await ChatMessage.create({
          roomId,
          senderId: socket.data.userId,
          senderName: socket.data.name,
          senderRole: socket.data.role,
          content,
          type: 'text',
          messageType: 'text',
          isRead: false,
          timestamp: new Date(),
        });

        await ChatRoom.updateOne(
          { roomId },
          {
            $set: {
              lastMessage: content,
              lastMessageAt: new Date(),
            },
            $inc: { messageCount: 1 },
          }
        );

        io.to(roomId).emit('new_message', msg);
      } catch (error) {
        socket.emit('error', { message: 'Server error' });
      }
    });

    socket.on('typing', ({ roomId, isTyping } = {}) => {
      socket.to(roomId).emit('user_typing', {
        userId: socket.data.userId,
        name: socket.data.name,
        isTyping,
      });
    });

    socket.on('mark_read', async ({ roomId } = {}) => {
      try {
        await ChatMessage.updateMany(
          { roomId, isRead: false, senderId: { $ne: socket.data.userId } },
          { $set: { isRead: true } }
        );
        socket.to(roomId).emit('messages_read', { byUserId: socket.data.userId });
      } catch (error) {
        socket.emit('error', { message: 'Server error' });
      }
    });

    socket.on('disconnecting', async () => {
      await removeFromActiveRooms(socket);
    });

    socket.on('disconnect', async () => {
      await removeFromActiveRooms(socket);
    });
  });
}

async function removeFromActiveRooms(socket) {
  const userId = socket.data.userId;
  if (!userId || !socket.data.joinedRooms) return;

  const roomIds = [...socket.data.joinedRooms].filter((roomId) => roomId !== socket.id);
  if (roomIds.length === 0) return;

  await ChatRoom.updateMany({ roomId: { $in: roomIds } }, { $pull: { activeParticipants: userId } });
  socket.data.joinedRooms.clear();
}

module.exports = { initSocket };
