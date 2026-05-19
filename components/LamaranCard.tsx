import Link from 'next/link';
import { StatusBadge } from './StatusBadge';

export type LamaranStatus = 'pending' | 'ditinjau' | 'dipanggil' | 'diterima' | 'ditolak';

export type LamaranItem = {
  lamaran_id: number;
  status: LamaranStatus;
  chat_room_id: string | null;
  surat_motivasi?: string | null;
  catatan_hrd?: string | null;
  created_at: string;
  lowongan: {
    id: number;
    judul: string;
    nama_perusahaan: string | null;
  };
};

export function LamaranCard({ item }: { item: LamaranItem }) {
  const isRejected = item.status === 'ditolak';
  const isAccepted = item.status === 'diterima';
  const canChat = item.status === 'dipanggil' && item.chat_room_id;

  return (
    <article
      className={`rounded-lg border p-4 shadow-sm transition ${
        isRejected ? 'border-slate-200 bg-slate-50 text-slate-500' : 'border-slate-200 bg-white'
      }`}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm text-slate-500">{item.lowongan.nama_perusahaan || 'Perusahaan'}</p>
          <h3 className="mt-1 text-lg font-semibold tracking-tight text-slate-950">{item.lowongan.judul}</h3>
          <p className="mt-2 text-sm text-slate-500">Dilamar pada {formatIndonesianDate(item.created_at)}</p>
        </div>
        <StatusBadge status={item.status} />
      </div>

      {isAccepted ? (
        <div className="mt-4 rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm font-medium text-green-800">
          Selamat! Kamu diterima
        </div>
      ) : null}

      {canChat ? (
        <div className="mt-4">
          <Link
            href={`/mahasiswa/chat/${item.chat_room_id}`}
            className="inline-flex rounded-md bg-slate-950 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800"
          >
            Buka Chat
          </Link>
        </div>
      ) : null}
    </article>
  );
}

export function formatIndonesianDate(value: string) {
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(value));
}
