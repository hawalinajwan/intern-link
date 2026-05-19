function createMemoryStore() {
  const rooms = [];
  const messages = [];

  return {
    name: 'memory',

    async createRoom(payload) {
      let room = rooms.find((item) => item.roomId === payload.roomId);
      if (!room) {
        room = {
          roomId: payload.roomId,
          lamaranId: Number(payload.lamaranId),
          mahasiswaUserId: Number(payload.mahasiswaUserId),
          hrdUserId: Number(payload.hrdUserId),
          lowonganTitle: payload.lowonganTitle || '',
          status: 'active',
          lastMessage: null,
          lastMessageAt: null,
          messageCount: 0,
          activeParticipants: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        rooms.push(room);
      }
      return room;
    },

    async ensureSystemMessage(roomId, content) {
      const exists = messages.some((message) => message.roomId === roomId && message.messageType === 'system' && message.content === content);
      if (!exists) {
        await this.createMessage({
          roomId,
          senderId: 0,
          senderName: 'System',
          senderRole: 'system',
          content,
          messageType: 'system',
          isRead: true,
        });
      }
    },

    async closeRoom(roomId) {
      const room = rooms.find((item) => item.roomId === roomId);
      if (!room) return null;
      room.status = 'closed';
      room.updatedAt = new Date();
      return room;
    },

    async findRoom(roomId) {
      return rooms.find((item) => item.roomId === roomId) || null;
    },

    async addParticipant(roomId, userId) {
      const room = await this.findRoom(roomId);
      if (room && !room.activeParticipants.includes(userId)) {
        room.activeParticipants.push(userId);
      }
    },

    async removeParticipantFromAll(userId) {
      for (const room of rooms) {
        room.activeParticipants = room.activeParticipants.filter((id) => id !== userId);
      }
    },

    async history(roomId) {
      return messages
        .filter((message) => message.roomId === roomId)
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        .slice(0, 50)
        .reverse();
    },

    async createMessage(payload) {
      const now = new Date();
      const message = {
        _id: `${Date.now()}_${Math.random().toString(16).slice(2)}`,
        roomId: payload.roomId,
        senderId: Number(payload.senderId),
        senderName: payload.senderName,
        senderRole: payload.senderRole,
        content: payload.content,
        messageType: payload.messageType || 'text',
        isRead: Boolean(payload.isRead),
        timestamp: now,
        createdAt: now,
        updatedAt: now,
      };
      messages.push(message);
      return message;
    },

    async updateRoomAfterMessage(roomId, message) {
      const room = await this.findRoom(roomId);
      if (!room) return;
      room.lastMessage = message.content;
      room.lastMessageAt = message.timestamp;
      room.messageCount += 1;
      room.updatedAt = new Date();
    },

    async markRead(roomId, userId) {
      for (const message of messages) {
        if (message.roomId === roomId && !message.isRead && message.senderId !== userId) {
          message.isRead = true;
          message.updatedAt = new Date();
        }
      }
    },
  };
}

module.exports = { createMemoryStore };
