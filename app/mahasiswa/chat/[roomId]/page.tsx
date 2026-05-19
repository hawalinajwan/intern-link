'use client';

import { use, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Socket } from 'socket.io-client';
import { connectSocket } from '@/lib/socket';
import type { ChatMessage, SocketAck } from '@/types/chat';

type PageProps = {
  params: Promise<{ roomId: string }>;
};

type ConnectionState = 'connecting' | 'connected' | 'reconnecting' | 'offline' | 'error';

type CurrentUser = {
  userId: number;
  role: 'mahasiswa';
  name: string;
};

const MAX_MESSAGE_LENGTH = 2000;

export default function MahasiswaChatPage({ params }: PageProps) {
  const { roomId } = use(params);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [connectionState, setConnectionState] = useState<ConnectionState>('connecting');
  const [typingName, setTypingName] = useState('');
  const [roomClosedReason, setRoomClosedReason] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isJoined, setIsJoined] = useState(false);

  const socketRef = useRef<Socket | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stopTypingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isRoomClosed = roomClosedReason !== '';
  const canSend = isJoined && !isRoomClosed && draft.trim().length > 0 && draft.length <= MAX_MESSAGE_LENGTH;

  const currentUserId = currentUser?.userId ?? 0;

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const user = readCurrentUser();

      if (!user) {
        setConnectionState('error');
        setErrorMessage('Login sebagai mahasiswa diperlukan untuk membuka chat.');
        return;
      }

      setCurrentUser(user);
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  const markRead = useCallback(() => {
    socketRef.current?.emit('mark_read', { roomId });
  }, [roomId]);

  useEffect(() => {
    if (!currentUser) return;

    const socket = connectSocket(currentUser);
    socketRef.current = socket;

    socket.on('connect', () => {
      setConnectionState('connected');
      socket.emit('join_room', { roomId }, (ack: SocketAck) => {
        if (!ack?.success) {
          setErrorMessage(ack?.message || 'Gagal bergabung ke room chat.');
          setConnectionState('error');
          return;
        }

        setIsJoined(true);

        if (ack.status === 'closed') {
          setRoomClosedReason('Sesi wawancara telah ditutup');
        }
      });
    });

    socket.on('disconnect', () => {
      setConnectionState('offline');
      setIsJoined(false);
    });

    socket.io.on('reconnect_attempt', () => {
      setConnectionState('reconnecting');
    });

    socket.io.on('reconnect', () => {
      setConnectionState('connected');
      socket.emit('join_room', { roomId });
    });

    socket.on('connect_error', () => {
      setConnectionState('error');
      setErrorMessage('Tidak bisa terhubung ke server chat.');
    });

    socket.on('chat_history', (history: ChatMessage[]) => {
      setMessages(history);
      markRead();
    });

    socket.on('new_message', (message: ChatMessage) => {
      setMessages((current) => [...current, message]);
      markRead();
    });

    socket.on('user_typing', ({ name, isTyping }: { name: string; isTyping: boolean }) => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      setTypingName(isTyping ? name : '');

      if (isTyping) {
        typingTimeoutRef.current = setTimeout(() => setTypingName(''), 1800);
      }
    });

    socket.on('messages_read', ({ byUserId }: { byUserId: number }) => {
      if (byUserId === currentUser.userId) return;

      setMessages((current) =>
        current.map((message) =>
          message.senderId === currentUser.userId ? { ...message, isRead: true } : message
        )
      );
    });

    socket.on('room_closed', ({ reason }: { reason?: string }) => {
      setRoomClosedReason(reason || 'Sesi wawancara telah ditutup');
    });

    socket.on('error_message', ({ message }: { message?: string }) => {
      setErrorMessage(message || 'Terjadi kesalahan chat.');
    });

    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      if (stopTypingTimeoutRef.current) clearTimeout(stopTypingTimeoutRef.current);
      socket.disconnect();
      socketRef.current = null;
    };
  }, [currentUser, markRead, roomId]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, typingName]);

  const connectionLabel = useMemo(() => {
    switch (connectionState) {
      case 'connected':
        return 'Online';
      case 'reconnecting':
        return 'Reconnecting...';
      case 'offline':
        return 'Offline mode';
      case 'error':
        return 'Koneksi bermasalah';
      default:
        return 'Menghubungkan...';
    }
  }, [connectionState]);

  function handleDraftChange(value: string) {
    setDraft(value);

    const socket = socketRef.current;
    if (!socket || !isJoined || isRoomClosed) return;

    socket.emit('typing', { roomId, isTyping: value.trim().length > 0 });

    if (stopTypingTimeoutRef.current) {
      clearTimeout(stopTypingTimeoutRef.current);
    }

    stopTypingTimeoutRef.current = setTimeout(() => {
      socket.emit('typing', { roomId, isTyping: false });
    }, 900);
  }

  function sendMessage() {
    const content = draft.trim();
    const socket = socketRef.current;

    if (!socket || !canSend) return;

    socket.emit('send_message', { roomId, content }, (ack: SocketAck) => {
      if (!ack?.success) {
        setErrorMessage(ack?.message || 'Pesan gagal dikirim.');
      }
    });

    socket.emit('typing', { roomId, isTyping: false });
    setDraft('');
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== 'Enter' || event.shiftKey) return;

    event.preventDefault();
    sendMessage();
  }

  return (
    <main className="min-h-screen bg-zinc-50 text-zinc-950">
      <section className="mx-auto flex min-h-screen w-full max-w-5xl flex-col px-4 py-4 sm:px-6 lg:px-8">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 pb-4">
          <div>
            <a className="text-sm font-medium text-rose-700 hover:text-rose-800" href="/mahasiswa/lamaran">
              Kembali
            </a>
            <h1 className="mt-2 text-xl font-semibold tracking-normal text-zinc-950 sm:text-2xl">
              Wawancara
            </h1>
            <p className="mt-1 text-sm text-zinc-600">Room {roomId}</p>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-700">
            <span
              className={`h-2.5 w-2.5 rounded-full ${
                connectionState === 'connected' ? 'bg-emerald-500' : 'bg-amber-500'
              }`}
            />
            {connectionLabel}
          </div>
        </header>

        {errorMessage ? (
          <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {errorMessage}
          </div>
        ) : null}

        {isRoomClosed ? (
          <div className="mt-4 rounded-md border border-zinc-300 bg-zinc-100 px-4 py-3 text-sm font-medium text-zinc-700">
            {roomClosedReason}
          </div>
        ) : null}

        <div className="mt-4 flex min-h-0 flex-1 flex-col rounded-lg border border-zinc-200 bg-white">
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-5 sm:px-6">
            {messages.length === 0 ? (
              <div className="flex h-full min-h-72 items-center justify-center text-center text-sm text-zinc-500">
                Menunggu riwayat chat...
              </div>
            ) : (
              messages.map((message, index) => (
                <MessageBubble
                  key={message._id || `${message.timestamp}-${index}`}
                  message={message}
                  isOwn={message.senderId === currentUserId}
                />
              ))
            )}

            {typingName ? (
              <div className="text-sm text-zinc-500">{typingName} sedang mengetik...</div>
            ) : null}

            <div ref={endRef} />
          </div>

          <div className="border-t border-zinc-200 p-3 sm:p-4">
            <div className="flex items-end gap-3">
              <textarea
                value={draft}
                onChange={(event) => handleDraftChange(event.target.value)}
                onKeyDown={handleKeyDown}
                disabled={!isJoined || isRoomClosed}
                maxLength={MAX_MESSAGE_LENGTH}
                rows={3}
                className="min-h-20 flex-1 resize-none rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 outline-none transition focus:border-rose-500 focus:ring-2 focus:ring-rose-100 disabled:bg-zinc-100 disabled:text-zinc-500"
                placeholder={isRoomClosed ? 'Sesi telah ditutup' : 'Tulis pesan...'}
              />
              <button
                type="button"
                onClick={sendMessage}
                disabled={!canSend}
                className="h-10 rounded-md bg-rose-600 px-4 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:bg-zinc-300"
              >
                Kirim
              </button>
            </div>
            <div className="mt-2 text-right text-xs text-zinc-500">
              {draft.length}/{MAX_MESSAGE_LENGTH}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

function MessageBubble({ message, isOwn }: { message: ChatMessage; isOwn: boolean }) {
  if (message.messageType === 'system' || message.senderRole === 'system') {
    return (
      <div className="flex justify-center">
        <div className="rounded-full bg-zinc-100 px-3 py-1 text-center text-xs italic text-zinc-500">
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[78%] ${isOwn ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
        <div className="text-xs font-medium text-zinc-500">{isOwn ? 'Anda' : message.senderName}</div>
        <div
          className={`rounded-lg px-4 py-2 text-sm leading-6 ${
            isOwn ? 'bg-rose-600 text-white' : 'bg-zinc-100 text-zinc-900'
          }`}
        >
          {message.content}
        </div>
        <div className="text-xs text-zinc-400">
          {formatTime(message.timestamp)}
          {isOwn ? ` · ${message.isRead ? 'read' : 'sent'}` : ''}
        </div>
      </div>
    </div>
  );
}

function readCurrentUser(): CurrentUser | null {
  const userId = Number(window.localStorage.getItem('userId'));
  const role = window.localStorage.getItem('role');

  if (!Number.isInteger(userId) || userId <= 0 || role !== 'mahasiswa') {
    return null;
  }

  const profile = parseStoredProfile();
  const name =
    profile?.nama_lengkap ||
    profile?.name ||
    window.localStorage.getItem('name') ||
    window.localStorage.getItem('email') ||
    'Mahasiswa';

  return { userId, role: 'mahasiswa', name };
}

function parseStoredProfile(): Record<string, string> | null {
  const rawProfile = window.localStorage.getItem('profile');
  if (!rawProfile) return null;

  try {
    const profile = JSON.parse(rawProfile);
    return profile && typeof profile === 'object' ? profile : null;
  } catch {
    return null;
  }
}

function formatTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return new Intl.DateTimeFormat('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}
