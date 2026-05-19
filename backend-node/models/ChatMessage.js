const mongoose = require('mongoose');

const chatMessageSchema = new mongoose.Schema(
  {
    roomId: { type: String, required: true, index: true },
    senderId: { type: Number, required: true, index: true },
    senderName: { type: String, required: true },
    senderRole: { type: String, enum: ['mahasiswa', 'hrd', 'system'], required: true },
    content: { type: String, required: true, maxlength: 2000 },
    type: { type: String, enum: ['text', 'system'], default: 'text' },
    messageType: { type: String, enum: ['text', 'system'], default: 'text' },
    isRead: { type: Boolean, default: false, index: true },
    timestamp: { type: Date, default: Date.now, index: true },
  },
  { versionKey: false }
);

chatMessageSchema.index({ roomId: 1, timestamp: -1 });

module.exports = mongoose.models.ChatMessage || mongoose.model('ChatMessage', chatMessageSchema);
