'use client';

import axios from 'axios';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ChangeEvent, useCallback, useEffect, useMemo, useState } from 'react';
import api from '@/lib/api';
import { getRole, isLoggedIn } from '@/lib/auth';
import { CVModal } from '@/components/CVModal';
import { StatusBadge } from '@/components/StatusBadge';

type LamaranStatus = 'pending' | 'ditinjau' | 'dipanggil' | 'diterima' | 'ditolak';
type SelectableStatus = 'ditinjau' | 'dipanggil' | 'diterima' | 'ditolak';

type PelamarItem = {
  lamaran_id: number;
  status: LamaranStatus;
  surat_motivasi: string;
  catatan_hrd: string | null;
  chat_room_id: string | null;
  created_at: string;
  mahasiswa: {
    user_id: number;
    nama: string | null;
    universitas: string | null;
    jurusan: string | null;
    skills?: string[];
    has_cv: boolean;
  };
};

type PelamarResponse = {
  success: boolean;
  data: PelamarItem[];
  error?: string;
};

const STATUS_OPTIONS: SelectableStatus[] = ['ditinjau', 'dipanggil', 'diterima', 'ditolak'];

export default function PelamarLowonganPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const lowonganId = Number(params.id);

  const [items, setItems] = useState<PelamarItem[]>([]);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [toast, setToast] = useState('');
  const [expandedMotivasi, setExpandedMotivasi] = useState<Set<number>>(new Set());
  const [cvUserId, setCvUserId] = useState<number | null>(null);
  const [busyStatusId, setBusyStatusId] = useState<number | null>(null);
  const [savingNoteId, setSavingNoteId] = useState<number | null>(null);

  const fetchPelamar = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage('');

    try {
      const response = await api.get<PelamarResponse>(`/hrd/lowongan/${lowonganId}/pelamar`);
      setItems(response.data.data || []);
    } catch (requestError) {
      const backendMessage = axios.isAxiosError(requestError)
        ? requestError.response?.data?.message || requestError.response?.data?.error
        : null;
      setErrorMessage(typeof backendMessage === 'string' ? backendMessage : 'Gagal memuat daftar pelamar.');
    } finally {
      setIsLoading(false);
    }
  }, [lowonganId]);

  useEffect(() => {
    if (!isLoggedIn() || getRole() !== 'hrd') {
      router.replace('/auth/login');
      return;
    }

    setIsCheckingAuth(false);
  }, [router]);

  useEffect(() => {
    if (isCheckingAuth || !Number.isFinite(lowonganId) || lowonganId <= 0) return;
    void fetchPelamar();
  }, [fetchPelamar, isCheckingAuth, lowonganId]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(''), 3000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const totalPelamar = useMemo(() => items.length, [items]);

  function toggleMotivasi(lamaranId: number) {
    setExpandedMotivasi((current) => {
      const next = new Set(current);
      if (next.has(lamaranId)) {
        next.delete(lamaranId);
      } else {
        next.add(lamaranId);
      }
      return next;
    });
  }

  function updateNoteDraft(lamaranId: number, value: string) {
    setItems((current) =>
      current.map((item) =>
        item.lamaran_id === lamaranId
          ? { ...item, catatan_hrd: value }
          : item
      )
    );
  }

  async function saveNote(item: PelamarItem) {
    setSavingNoteId(item.lamaran_id);

    try {
      await api.put(`/hrd/lamaran/${item.lamaran_id}/status`, {
        status: item.status,
        catatan: item.catatan_hrd ?? '',
      });
      setToast('Catatan HRD tersimpan.');
    } catch (requestError) {
      const backendMessage = axios.isAxiosError(requestError)
        ? requestError.response?.data?.message || requestError.response?.data?.error
        : null;
      setErrorMessage(typeof backendMessage === 'string' ? backendMessage : 'Gagal menyimpan catatan HRD.');
    } finally {
      setSavingNoteId(null);
    }
  }

  async function handleStatusChange(item: PelamarItem, nextStatus: SelectableStatus) {
    if (item.status === nextStatus) return;

    if (nextStatus === 'diterima' || nextStatus === 'ditolak') {
      const confirmed = window.confirm('Yakin dengan keputusan ini? Tidak bisa diubah.');
      if (!confirmed) return;
    }

    const previous = item;
    setBusyStatusId(item.lamaran_id);
    setItems((current) =>
      current.map((row) =>
        row.lamaran_id === item.lamaran_id
          ? { ...row, status: nextStatus }
          : row
      )
    );

    try {
      const response = await api.put(`/hrd/lamaran/${item.lamaran_id}/status`, {
        status: nextStatus,
        catatan: item.catatan_hrd ?? '',
      });

      const chatRoomId = response.data?.data?.chat_room_id ?? item.chat_room_id ?? null;
      setItems((current) =>
        current.map((row) =>
          row.lamaran_id === item.lamaran_id
            ? { ...row, status: nextStatus, chat_room_id: chatRoomId }
            : row
        )
      );

      if (nextStatus === 'dipanggil') {
        setToast('Chat room dibuat! Buka di Chat untuk interview');
      } else {
        setToast('Status kandidat berhasil diperbarui.');
      }
    } catch (requestError) {
      setItems((current) =>
        current.map((row) =>
          row.lamaran_id === previous.lamaran_id ? previous : row
        )
      );
      const backendMessage = axios.isAxiosError(requestError)
        ? requestError.response?.data?.message || requestError.response?.data?.error
        : null;
      setErrorMessage(typeof backendMessage === 'string' ? backendMessage : 'Gagal memperbarui status.');
    } finally {
      setBusyStatusId(null);
    }
  }

  if (isCheckingAuth || isLoading) {
    return (
      <section className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6">
        <div className="h-8 w-48 animate-pulse rounded bg-slate-200" />
        <div className="mt-6 h-96 animate-pulse rounded-lg bg-white shadow-sm" />
      </section>
    );
  }

  return (
    <section className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:py-10">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">Review kandidat</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-950">Daftar Pelamar</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Tinjau CV, baca motivasi, beri catatan internal, lalu gerakkan kandidat ke tahap berikutnya.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Total pelamar</p>
            <p className="mt-1 text-2xl font-semibold text-slate-950">{totalPelamar}</p>
          </div>
          <Link
            href="/hrd/lowongan"
            className="inline-flex items-center justify-center rounded-md border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            Kembali ke Lowongan
          </Link>
        </div>
      </div>

      {errorMessage ? (
        <p className="mt-6 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{errorMessage}</p>
      ) : null}

      <div className="mt-6 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-[1180px] w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr className="text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <th className="px-4 py-3">Nama</th>
                <th className="px-4 py-3">Universitas</th>
                <th className="px-4 py-3">Jurusan</th>
                <th className="px-4 py-3">Tgl Lamar</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">CV</th>
                <th className="px-4 py-3">Motivasi</th>
                <th className="px-4 py-3">Catatan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {items.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-16 text-center">
                    <p className="text-lg font-semibold text-slate-950">Belum ada pelamar</p>
                    <p className="mt-2 text-sm text-slate-600">Kandidat yang masuk ke lowongan ini akan muncul di sini.</p>
                  </td>
                </tr>
              ) : (
                items.map((item) => {
                  const isExpanded = expandedMotivasi.has(item.lamaran_id);

                  return (
                    <tr key={item.lamaran_id} className="align-top">
                      <td className="px-4 py-4">
                        <div className="font-semibold text-slate-950">{item.mahasiswa.nama || 'Mahasiswa'}</div>
                        {item.chat_room_id ? (
                          <Link
                            href={`/hrd/chat/${item.chat_room_id}`}
                            className="mt-2 inline-flex text-sm font-medium text-blue-700 hover:text-blue-800"
                          >
                            Buka Chat
                          </Link>
                        ) : null}
                      </td>
                      <td className="px-4 py-4 text-sm text-slate-700">{item.mahasiswa.universitas || '-'}</td>
                      <td className="px-4 py-4 text-sm text-slate-700">{item.mahasiswa.jurusan || '-'}</td>
                      <td className="px-4 py-4 text-sm text-slate-700">{formatDate(item.created_at)}</td>
                      <td className="px-4 py-4">
                        <div className="space-y-3">
                          <StatusBadge status={item.status} />
                          <select
                            value={item.status === 'pending' ? '' : item.status}
                            onChange={(event) =>
                              handleStatusChange(item, event.target.value as SelectableStatus)
                            }
                            disabled={busyStatusId === item.lamaran_id}
                            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-slate-950 focus:ring-2 focus:ring-slate-200 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <option value="" disabled>
                              Ubah status
                            </option>
                            {STATUS_OPTIONS.map((status) => (
                              <option key={status} value={status}>
                                {status}
                              </option>
                            ))}
                          </select>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <button
                          type="button"
                          disabled={!item.mahasiswa.has_cv}
                          onClick={() => setCvUserId(item.mahasiswa.user_id)}
                          className={`rounded-md px-3 py-2 text-sm font-medium transition ${
                            item.mahasiswa.has_cv
                              ? 'border border-slate-300 text-slate-700 hover:bg-slate-50'
                              : 'cursor-not-allowed border border-slate-200 bg-slate-100 text-slate-400'
                          }`}
                        >
                          {item.mahasiswa.has_cv ? 'Lihat CV' : 'Belum upload CV'}
                        </button>
                      </td>
                      <td className="px-4 py-4">
                        <button
                          type="button"
                          onClick={() => toggleMotivasi(item.lamaran_id)}
                          className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                        >
                          {isExpanded ? 'Sembunyikan' : 'Lihat Motivasi'}
                        </button>
                        {isExpanded ? (
                          <div className="mt-3 rounded-md border border-slate-200 bg-slate-50 p-3 text-sm leading-6 text-slate-700">
                            {item.surat_motivasi}
                          </div>
                        ) : null}
                      </td>
                      <td className="px-4 py-4">
                        <textarea
                          value={item.catatan_hrd ?? ''}
                          onChange={(event: ChangeEvent<HTMLTextAreaElement>) =>
                            updateNoteDraft(item.lamaran_id, event.target.value)
                          }
                          onBlur={() => saveNote(item)}
                          rows={4}
                          className="w-full min-w-56 resize-none rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-slate-950 focus:ring-2 focus:ring-slate-200"
                          placeholder="Tulis catatan privat untuk kandidat ini..."
                        />
                        <p className="mt-2 text-xs text-slate-500">
                          {savingNoteId === item.lamaran_id ? 'Menyimpan...' : 'Auto-save saat keluar dari kolom'}
                        </p>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <CVModal mahasiswaUserId={cvUserId} isOpen={cvUserId !== null} onClose={() => setCvUserId(null)} />

      {toast ? (
        <div className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2 rounded-md bg-slate-950 px-4 py-3 text-sm font-medium text-white shadow-lg">
          {toast}
        </div>
      ) : null}
    </section>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(value));
}
