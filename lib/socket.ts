import { io, type Socket } from 'socket.io-client';

export type AuthenticatedSocketUser = {
  userId: number;
  role: 'mahasiswa' | 'hrd';
  name: string;
};

export function createChatSocket(): Socket {
  return io(process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3000', {
    autoConnect: false,
    transports: ['websocket'],
    withCredentials: true,
  });
}

export function connectSocket(user: AuthenticatedSocketUser): Socket {
  const socket = createChatSocket();

  socket.once('connect', () => {
    socket.emit('authenticate', user);
  });

  socket.connect();
  return socket;
}
