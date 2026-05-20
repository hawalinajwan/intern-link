const mongoose = require('mongoose');

const chatRoomSchema = new mongoose.Schema(
  {
    roomId: { type: String, required: true, unique: true, index: true },
    lamaranId: { type: Number, required: true, index: true },
    mahasiswaUserId: { type: Number, required: true, index: true },
    hrdUserId: { type: Number, required: true, index: true },
    lowonganTitle: { type: String, default: '' },
    status: { type: String, enum: ['active', 'closed'], default: 'active', index: true },
    lastMessage: { type: String, default: null },
    lastMessageAt: { type: Date, default: null },
    messageCount: { type: Number, default: 0 },
    activeParticipants: { type: [Number], default: [] },
  },
  { versionKey: false, timestamps: true }
);

module.exports = mongoose.models.ChatRoom || mongoose.model('ChatRoom', chatRoomSchema);
