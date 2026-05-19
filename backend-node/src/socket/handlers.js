const activeUsers = new Map();

function registerSocketHandlers(io, store) {
  io.on('connection', (socket) => {
    socket.on('authenticate', (payload = {}, ack) => {
      const userId = Number(payload.userId);
      const role = String(payload.role || '').toLowerCase();
      const name = String(payload.name || '').trim();

      if (!Number.isInteger(userId) || userId <= 0 || !['mahasiswa', 'hrd'].includes(role) || name === '') {
        return acknowledge(ack, { success: false, message: 'Data autentikasi tidak valid.' });
      }

      socket.data.userId = userId;
      socket.data.role = role;
      socket.data.name = name;
      activeUsers.set(userId, socket.id);

      socket.emit('authenticated', { userId, role, name });
      return acknowledge(ack, { success: true, userId, role, name });
    });

    socket.on('join_room', async ({ roomId } = {}, ack) => {
      try {
        const user = requireAuthenticatedSocket(socket, ack);
        if (!user) return;

        const room = await store.findRoom(roomId);
        if (!room) {
          return acknowledge(ack, { success: false, message: 'Room tidak ditemukan.' });
        }

        if (!hasParticipant(room, user.userId)) {
          return acknowledge(ack, { success: false, message: 'Anda bukan peserta room ini.' });
        }

        await socket.join(roomId);
        await store.addParticipant(roomId, user.userId);

        const messages = await store.history(roomId);
        socket.emit('chat_history', messages);
        socket.to(roomId).emit('user_joined', {
          userId: user.userId,
          name: user.name,
          role: user.role,
        });

        return acknowledge(ack, { success: true, roomId, status: room.status });
      } catch (error) {
        return emitSocketError(socket, ack, error);
      }
    });

    socket.on('send_message', async ({ roomId, content } = {}, ack) => {
      try {
        const user = requireAuthenticatedSocket(socket, ack);
        if (!user) return;

        const cleanContent = String(content || '').trim();
        if (cleanContent === '' || cleanContent.length > 2000) {
          return acknowledge(ack, { success: false, message: 'Pesan harus 1-2000 karakter.' });
        }

        const room = await store.findRoom(roomId);
        if (!room) {
          return acknowledge(ack, { success: false, message: 'Room tidak ditemukan.' });
        }

        if (room.status !== 'active') {
          return acknowledge(ack, { success: false, message: 'Sesi wawancara telah ditutup.' });
        }

        if (!hasParticipant(room, user.userId)) {
          return acknowledge(ack, { success: false, message: 'Anda bukan peserta room ini.' });
        }

        const message = await store.createMessage({
          roomId,
          senderId: user.userId,
          senderName: user.name,
          senderRole: user.role,
          content: cleanContent,
          messageType: 'text',
          isRead: false,
        });

        await store.updateRoomAfterMessage(roomId, message);

        io.to(roomId).emit('new_message', typeof message.toObject === 'function' ? message.toObject() : message);
        return acknowledge(ack, { success: true, messageId: message._id });
      } catch (error) {
        return emitSocketError(socket, ack, error);
      }
    });

    socket.on('typing', async ({ roomId, isTyping } = {}, ack) => {
      try {
        const user = requireAuthenticatedSocket(socket, ack);
        if (!user) return;

        const room = await store.findRoom(roomId);
        if (!room) {
          return acknowledge(ack, { success: false, message: 'Room tidak ditemukan.' });
        }

        if (!hasParticipant(room, user.userId)) {
          return acknowledge(ack, { success: false, message: 'Anda bukan peserta room ini.' });
        }

        socket.to(roomId).emit('user_typing', {
          userId: user.userId,
          name: user.name,
          isTyping: Boolean(isTyping),
        });

        return acknowledge(ack, { success: true });
      } catch (error) {
        return emitSocketError(socket, ack, error);
      }
    });

    socket.on('mark_read', async ({ roomId } = {}, ack) => {
      try {
        const user = requireAuthenticatedSocket(socket, ack);
        if (!user) return;

        const room = await store.findRoom(roomId);
        if (!room) {
          return acknowledge(ack, { success: false, message: 'Room tidak ditemukan.' });
        }

        if (!hasParticipant(room, user.userId)) {
          return acknowledge(ack, { success: false, message: 'Anda bukan peserta room ini.' });
        }

        await store.markRead(roomId, user.userId);

        io.to(roomId).emit('messages_read', { byUserId: user.userId });
        return acknowledge(ack, { success: true });
      } catch (error) {
        return emitSocketError(socket, ack, error);
      }
    });

    socket.on('disconnect', async () => {
      const userId = socket.data.userId;
      if (!userId) return;

      if (activeUsers.get(userId) === socket.id) {
        activeUsers.delete(userId);
      }

      await store.removeParticipantFromAll(userId);
    });
  });
}

function hasParticipant(room, userId) {
  return Number(room.mahasiswaUserId) === Number(userId) || Number(room.hrdUserId) === Number(userId);
}

function requireAuthenticatedSocket(socket, ack) {
  const { userId, role, name } = socket.data;

  if (!userId || !role || !name) {
    acknowledge(ack, { success: false, message: 'Socket belum diautentikasi.' });
    return null;
  }

  return { userId, role, name };
}

function acknowledge(ack, payload) {
  if (typeof ack === 'function') {
    ack(payload);
  }
}

function emitSocketError(socket, ack, error) {
  const payload = { success: false, message: 'Terjadi kesalahan server.' };
  acknowledge(ack, payload);
  socket.emit('error_message', payload);
  console.error(error);
}

module.exports = { registerSocketHandlers, activeUsers };
