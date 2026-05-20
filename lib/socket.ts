import { io, type Socket } from 'socket.io-client';

function getRequiredSocketUrl(): string {
  return process.env.NEXT_PUBLIC_SOCKET_URL || 'https://intern-link-node.hawali.site';
}

export function getSocketUrl(): string {
  return getRequiredSocketUrl();
}

let socketInstance: Socket | null = null;

export function getSocket(): Socket {
  if (!socketInstance) {
    socketInstance = io(getRequiredSocketUrl(), {
      autoConnect: false,
      transports: ['websocket', 'polling'],
      withCredentials: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socketInstance.on('connect_error', () => {
      if (!socketInstance) return;
      socketInstance.io.opts.transports = ['polling', 'websocket'];
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
