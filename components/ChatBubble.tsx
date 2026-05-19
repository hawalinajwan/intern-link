'use client';

import type { ChatMessage } from '@/types/chat';

type ChatBubbleProps = {
  message: ChatMessage;
  isOwn: boolean;
  showSenderName: boolean;
};

export function ChatBubble({ message, isOwn, showSenderName }: ChatBubbleProps) {
  if (message.messageType === 'system' || message.senderRole === 'system') {
    return (
      <div className="flex justify-center">
        <div className="rounded-full bg-slate-100 px-3 py-1 text-center text-xs italic text-slate-500">
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <div className={`group flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
      <div className={`flex max-w-[82%] flex-col ${isOwn ? 'items-end' : 'items-start'}`}>
        {showSenderName ? (
          <p className="mb-1 px-1 text-xs font-medium text-slate-500">
            {isOwn ? 'Anda' : message.senderName}
          </p>
        ) : null}
        <div
          title={formatTime(message.timestamp)}
          className={`rounded-xl px-4 py-2 text-sm leading-6 shadow-sm ${
            isOwn ? 'bg-red-500 text-white' : 'bg-slate-100 text-slate-900'
          }`}
        >
          {message.content}
        </div>
        <div className="mt-1 px-1 text-xs text-slate-400 opacity-0 transition group-hover:opacity-100">
          {formatTime(message.timestamp)}
          {isOwn ? ` ${message.isRead ? '✓✓' : '✓'}` : ''}
        </div>
      </div>
    </div>
  );
}

function formatTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  return new Intl.DateTimeFormat('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
}
