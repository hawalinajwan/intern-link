import { io, type Socket } from 'socket.io-client';

function getRequiredSocketUrl(): string {
  const value = process.env.NEXT_PUBLIC_SOCKET_URL;

  if (!value) {
    throw new Error('NEXT_PUBLIC_SOCKET_URL is required.');
  }

  return value;
}

export function getSocketUrl(): string {
  return getRequiredSocketUrl();
}

let socketInstance: Socket | null = null;

export function getSocket(): Socket {
  if (!socketInstance) {
    socketInstance = io(getRequiredSocketUrl(), {
      autoConnect: false,
      transports: ['websocket'],
      withCredentials: true,
    });
  }

  if (!socketInstance.connected) {
    socketInstance.connect();
  }

  return socketInstance;
}

export function disconnectSocket(): void {
  if (!socketInstance) return;
  socketInstance.disconnect();
}
