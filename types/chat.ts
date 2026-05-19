export type ChatRole = 'mahasiswa' | 'hrd' | 'system';

export type ChatMessage = {
  _id?: string;
  roomId: string;
  senderId: number;
  senderName: string;
  senderRole: ChatRole;
  content: string;
  messageType: 'text' | 'system';
  isRead: boolean;
  timestamp: string;
  createdAt?: string;
  updatedAt?: string;
};

export type SocketAck = {
  success: boolean;
  message?: string;
  roomId?: string;
  status?: 'active' | 'closed';
  userId?: number;
  role?: ChatRole;
  name?: string;
  messageId?: string;
};
