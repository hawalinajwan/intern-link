const ChatRoom = require('../models/ChatRoom');
const ChatMessage = require('../models/ChatMessage');

function createMongoStore() {
  return {
    name: 'mongo',

    async createRoom(payload) {
      return ChatRoom.findOneAndUpdate(
        { roomId: payload.roomId },
        {
          $setOnInsert: {
            roomId: payload.roomId,
            lamaranId: Number(payload.lamaranId),
            mahasiswaUserId: Number(payload.mahasiswaUserId),
            hrdUserId: Number(payload.hrdUserId),
            lowonganTitle: payload.lowonganTitle || '',
            status: 'active',
            lastMessage: null,
            messageCount: 0,
            activeParticipants: [],
          },
        },
        { new: true, upsert: true }
      );
    },

    async ensureSystemMessage(roomId, content) {
      const exists = await ChatMessage.exists({ roomId, senderRole: 'system', messageType: 'system', content });
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
      return ChatRoom.findOneAndUpdate({ roomId }, { status: 'closed' }, { new: true });
    },

    async findRoom(roomId) {
      return ChatRoom.findOne({ roomId });
    },

    async addParticipant(roomId, userId) {
      await ChatRoom.updateOne({ roomId }, { $addToSet: { activeParticipants: userId } });
    },

    async removeParticipantFromAll(userId) {
      await ChatRoom.updateMany({ activeParticipants: userId }, { $pull: { activeParticipants: userId } });
    },

    async history(roomId) {
      const messages = await ChatMessage.find({ roomId }).sort({ timestamp: -1 }).limit(50).lean();
      return messages.reverse();
    },

    async createMessage(payload) {
      return ChatMessage.create(payload);
    },

    async updateRoomAfterMessage(roomId, message) {
      await ChatRoom.updateOne(
        { roomId },
        {
          $set: { lastMessage: message.content, lastMessageAt: message.timestamp },
          $inc: { messageCount: 1 },
        }
      );
    },

    async markRead(roomId, userId) {
      await ChatMessage.updateMany(
        { roomId, isRead: false, senderId: { $ne: userId } },
        { $set: { isRead: true } }
      );
    },
  };
}

module.exports = { createMongoStore };
