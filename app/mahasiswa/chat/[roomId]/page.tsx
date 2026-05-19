'use client';

import { useParams } from 'next/navigation';
import { ChatRoom } from '@/components/ChatRoom';

export default function MahasiswaChatPage() {
  const params = useParams<{ roomId: string }>();

  return <ChatRoom roomId={String(params.roomId)} role="mahasiswa" />;
}
