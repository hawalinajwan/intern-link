'use client';

import axios from 'axios';
import Link from 'next/link';
import { KeyboardEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Socket } from 'socket.io-client';
import api from '@/lib/api';
import { getSocket, getSocketUrl } from '@/lib/socket';
import { getRole, isLoggedIn } from '@/lib/auth';
import { ChatBubble } from '@/components/ChatBubble';
import type { ChatMessage } from '@/types/chat';

type ChatRole = 'mahasiswa' | 'hrd';
type RoomStatus = 'active' | 'closed';

type ChatRoomProps = {
  roomId: string;
  role: ChatRole;
};

type RoomMetaResponse = {
  success: boolean;
  data: {
    roomId: string;
    lamaranId: number;
    mahasiswaUserId: number;
    hrdUserId: number;
    lowonganTitle: string;
    status: RoomStatus;
    activeParticipants: number[];
  };
};

type RoomMetaEvent = {
  roomId: string;
  lamaranId: number;
  lowonganTitle: string;
  status: RoomStatus;
  activeParticipants: number[];
};

type UserTypingPayload = {
  userId: number;
  name: string;
  isTyping: boolean;
};

type SocketErrorPayload = {
  message?: string;
  roomId?: string;
};

const MAX_MESSAGE_LENGTH = 2000;

export function ChatRoom({ roomId, role }: ChatRoomProps) {
  const [isReady, setIsReady] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [typingName, setTypingName] = useState('');
  const [toast, setToast] = useState('');
  const [roomStatus, setRoomStatus] = useState<RoomStatus>('active');
  const [lowonganTitle, setLowonganTitle] = useState('');
  const [lamaranId, setLamaranId] = useState<number | null>(null);
  const [activeParticipants, setActiveParticipants] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAccepting, setIsAccepting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const socketRef = useRef<Socket | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);
  const typingStartTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const typingStopTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const currentUser = useMemo(() => readCurrentUser(role), [role]);
  const isClosed = roomStatus === 'closed';
  const canSend = Boolean(draft.trim()) && draft.length <= MAX_MESSAGE_LENGTH && !isClosed && isReady;
  const isOtherParticipantOnline = activeParticipants.some((userId) => userId !== currentUser?.userId);
  const backHref = role === 'mahasiswa' ? '/mahasiswa/lamaran' : '/hrd/lowongan';

  const markRead = useCallback(() => {
    if (!socketRef.current || !currentUser) return;
    socketRef.current.emit('mark_read', { roomId });
  }, [currentUser, roomId]);

  const handleSocketError = useCallback((payload?: SocketErrorPayload) => {
    if (payload?.roomId && payload.roomId !== roomId) return;
    setToast(payload?.message || 'Terjadi kesalahan pada chat.');
  }, [roomId]);

  const syncRoomMeta = useCallback((meta: RoomMetaEvent) => {
    if (meta.roomId !== roomId) return;
    setLamaranId(meta.lamaranId || null);
    setLowonganTitle(meta.lowonganTitle || '');
    setRoomStatus(meta.status || 'active');
    setActiveParticipants(meta.activeParticipants || []);
  }, [roomId]);

  useEffect(() => {
    if (!isLoggedIn() || getRole() !== role) {
      window.location.href = '/auth/login';
      return;
    }

    if (!currentUser) {
      setErrorMessage('Informasi pengguna tidak lengkap untuk membuka chat.');
      setIsLoading(false);
      return;
    }
    const user = currentUser;

    async function bootstrapRoom() {
      setIsLoading(true);
      setErrorMessage('');

      try {
        const response = await axios.get<RoomMetaResponse>(`${getSocketUrl()}/api/rooms/${roomId}`);
        const room = response.data.data;
        setLamaranId(room.lamaranId);
        setLowonganTitle(room.lowonganTitle || '');
        setRoomStatus(room.status || 'active');
        setActiveParticipants(room.activeParticipants || []);
      } catch (requestError) {
        const backendMessage = axios.isAxiosError(requestError)
          ? requestError.response?.data?.message || requestError.response?.data?.error
          : null;
        setErrorMessage(typeof backendMessage === 'string' ? backendMessage : 'Room chat tidak ditemukan.');
      } finally {
        setIsLoading(false);
      }

      const socket = getSocket();
      socketRef.current = socket;

      const onChatHistory = (history: ChatMessage[]) => {
        setMessages(history);
        setIsReady(true);
        markRead();
      };

      const onNewMessage = (message: ChatMessage) => {
        if (message.roomId !== roomId) return;
        setMessages((current) => [...current, message]);
        markRead();
      };

      const onTyping = ({ userId, name, isTyping }: UserTypingPayload) => {
        if (userId === user.userId) return;
        setTypingName(isTyping ? name : '');
      };

      const onMessagesRead = ({ byUserId }: { byUserId: number }) => {
        if (byUserId === user.userId) return;

        setMessages((current) =>
          current.map((message) =>
            message.senderId === user.userId ? { ...message, isRead: true } : message
          )
        );
      };

      const onRoomClosed = ({ roomId: closedRoomId, reason }: { roomId?: string; reason?: string }) => {
        if (closedRoomId && closedRoomId !== roomId) return;
        setRoomStatus('closed');
        setToast(reason || 'Sesi wawancara telah ditutup');
      };

      const onUserJoined = ({ userId }: { userId: number }) => {
        setActiveParticipants((current) => (current.includes(userId) ? current : [...current, userId]));
      };

      const onUserLeft = ({ roomId: leftRoomId, userId }: { roomId?: string; userId: number }) => {
        if (leftRoomId && leftRoomId !== roomId) return;
        setActiveParticipants((current) => current.filter((id) => id !== userId));
      };

      socket.on('chat_history', onChatHistory);
      socket.on('new_message', onNewMessage);
      socket.on('user_typing', onTyping);
      socket.on('room_closed', onRoomClosed);
      socket.on('error', handleSocketError);
      socket.on('messages_read', onMessagesRead);
      socket.on('room_meta', syncRoomMeta);
      socket.on('user_joined', onUserJoined);
      socket.on('user_left', onUserLeft);

      socket.emit('authenticate', {
        userId: user.userId,
        role,
        name: user.name,
      });
      socket.emit('join_room', { roomId });

      return () => {
        socket.off('chat_history', onChatHistory);
        socket.off('new_message', onNewMessage);
        socket.off('user_typing', onTyping);
        socket.off('room_closed', onRoomClosed);
        socket.off('error', handleSocketError);
        socket.off('messages_read', onMessagesRead);
        socket.off('room_meta', syncRoomMeta);
        socket.off('user_joined', onUserJoined);
        socket.off('user_left', onUserLeft);
      };
    }

    let cleanup: (() => void) | undefined;
    bootstrapRoom().then((value) => {
      cleanup = value;
    });

    return () => {
      if (typingStartTimeoutRef.current) clearTimeout(typingStartTimeoutRef.current);
      if (typingStopTimeoutRef.current) clearTimeout(typingStopTimeoutRef.current);
      socketRef.current?.emit('typing', { roomId, isTyping: false });
      cleanup?.();
    };
  }, [currentUser, handleSocketError, markRead, role, roomId, syncRoomMeta]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, typingName]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(''), 2600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  function handleInputChange(value: string) {
    setDraft(value);

    if (!socketRef.current || isClosed) return;

    if (typingStartTimeoutRef.current) clearTimeout(typingStartTimeoutRef.current);
    if (typingStopTimeoutRef.current) clearTimeout(typingStopTimeoutRef.current);

    typingStartTimeoutRef.current = setTimeout(() => {
      socketRef.current?.emit('typing', { roomId, isTyping: value.trim().length > 0 });
    }, 500);

    typingStopTimeoutRef.current = setTimeout(() => {
      socketRef.current?.emit('typing', { roomId, isTyping: false });
    }, 1500);
  }

  function sendMessage() {
    const content = draft.trim();
    if (!socketRef.current || !content || content.length > MAX_MESSAGE_LENGTH || isClosed) return;

    socketRef.current.emit('send_message', { roomId, content });
    socketRef.current.emit('typing', { roomId, isTyping: false });
    setDraft('');
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  }

  async function handleAcceptCandidate() {
    if (!lamaranId) return;
    const confirmed = window.confirm('Terima kandidat ini dan tutup sesi wawancara?');
    if (!confirmed) return;

    setIsAccepting(true);

    try {
      await api.put(`/hrd/lamaran/${lamaranId}/status`, { status: 'diterima' });
      setRoomStatus('closed');
      setToast('Kandidat ditandai diterima.');
    } catch (requestError) {
      const backendMessage = axios.isAxiosError(requestError)
        ? requestError.response?.data?.message || requestError.response?.data?.error
        : null;
      setToast(typeof backendMessage === 'string' ? backendMessage : 'Gagal memperbarui status kandidat.');
    } finally {
      setIsAccepting(false);
    }
  }

  if (isLoading) {
    return (
      <section className="mx-auto min-h-screen w-full max-w-5xl px-4 py-8 sm:px-6">
        <div className="h-8 w-56 animate-pulse rounded bg-slate-200" />
        <div className="mt-6 h-[70vh] animate-pulse rounded-lg bg-white shadow-sm" />
      </section>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <section className="mx-auto flex min-h-screen w-full max-w-5xl flex-col px-4 py-4 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-4 border-b border-slate-200 pb-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <Link href={backHref} className="text-sm font-medium text-red-600 transition hover:text-red-700">
              ← Kembali
            </Link>
            <h1 className="mt-2 text-xl font-semibold tracking-tight text-slate-950 sm:text-2xl">
              Wawancara — {lowonganTitle || roomId}
            </h1>
            <div className="mt-2 flex items-center gap-2 text-sm text-slate-600">
              <span className={`h-2.5 w-2.5 rounded-full ${isOtherParticipantOnline ? 'bg-emerald-500' : 'bg-slate-300'}`} />
              {isOtherParticipantOnline ? 'Peserta lain online' : 'Menunggu peserta lain'}
            </div>
          </div>

          {role === 'hrd' && roomStatus === 'active' ? (
            <button
              type="button"
              onClick={handleAcceptCandidate}
              disabled={isAccepting || !lamaranId}
              className="rounded-md bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-emerald-300"
            >
              {isAccepting ? 'Menyimpan...' : 'Tandai Diterima'}
            </button>
          ) : null}
        </header>

        {errorMessage ? (
          <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {errorMessage}
          </div>
        ) : null}

        {isClosed ? (
          <div className="mt-4 rounded-md border border-slate-300 bg-slate-100 px-4 py-3 text-sm font-medium text-slate-700">
            Sesi wawancara telah ditutup
          </div>
        ) : null}

        <div className="mt-4 flex min-h-0 flex-1 flex-col rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6">
            {messages.length === 0 ? (
              <div className="flex h-full min-h-72 items-center justify-center text-center text-sm text-slate-500">
                Belum ada pesan. Mulai percakapan!
              </div>
            ) : (
              <div className="space-y-3">
                {messages.map((message, index) => {
                  const previous = messages[index - 1];
                  const isOwn = message.senderId === currentUser?.userId;
                  const showSenderName =
                    index === 0 ||
                    previous?.senderId !== message.senderId ||
                    previous?.messageType === 'system' ||
                    message.messageType === 'system';

                  return (
                    <ChatBubble
                      key={message._id || `${message.timestamp}-${index}`}
                      message={message}
                      isOwn={isOwn}
                      showSenderName={showSenderName}
                    />
                  );
                })}
              </div>
            )}

            {typingName ? (
              <div className="mt-4 text-sm text-slate-500">{typingName} sedang mengetik...</div>
            ) : null}

            <div ref={endRef} />
          </div>

          <div className="border-t border-slate-200 p-3 sm:p-4">
            <div className="flex items-end gap-3">
              <textarea
                value={draft}
                onChange={(event) => handleInputChange(event.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isClosed}
                maxLength={MAX_MESSAGE_LENGTH}
                rows={3}
                className="min-h-20 flex-1 resize-none rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-100 disabled:bg-slate-100 disabled:text-slate-500"
                placeholder={isClosed ? 'Sesi telah ditutup' : 'Tulis pesan...'}
              />
              <button
                type="button"
                onClick={sendMessage}
                disabled={!canSend}
                className="h-10 rounded-md bg-red-500 px-4 text-sm font-semibold text-white transition hover:bg-red-600 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                Kirim
              </button>
            </div>
            <div className="mt-2 text-right text-xs text-slate-500">{draft.length}/{MAX_MESSAGE_LENGTH}</div>
          </div>
        </div>
      </section>

      {toast ? (
        <div className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2 rounded-md bg-slate-950 px-4 py-3 text-sm font-medium text-white shadow-lg">
          {toast}
        </div>
      ) : null}
    </main>
  );
}

function readCurrentUser(role: ChatRole) {
  if (typeof window === 'undefined') return null;

  const userId = Number(window.localStorage.getItem('userId'));
  if (!Number.isInteger(userId) || userId <= 0) return null;

  const storedRole = window.localStorage.getItem('role');
  if (storedRole !== role) return null;

  const profile = parseStoredProfile();
  const fallbackName = role === 'hrd' ? 'HRD' : 'Mahasiswa';
  const name =
    profile?.nama ||
    profile?.nama_perusahaan ||
    profile?.name ||
    window.localStorage.getItem('name') ||
    fallbackName;

  return { userId, role, name };
}

function parseStoredProfile(): Record<string, string> | null {
  if (typeof window === 'undefined') return null;
  const rawProfile = window.localStorage.getItem('profile');
  if (!rawProfile) return null;

  try {
    const profile = JSON.parse(rawProfile);
    return profile && typeof profile === 'object' ? profile : null;
  } catch {
    return null;
  }
}
