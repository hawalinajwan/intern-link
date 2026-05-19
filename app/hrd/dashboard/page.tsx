'use client';

import axios from 'axios';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { getRole, isLoggedIn } from '@/lib/auth';
import { type ActiveInterviewItem, loadActiveInterviews } from '@/lib/hrd-interviews';

type LowonganStatus = 'aktif' | 'ditutup';

type LowonganItem = {
  id: number;
  judul: string;
  jenis: 'remote' | 'onsite' | 'hybrid';
  batas_lamaran: string | null;
  status: LowonganStatus;
  lamaran_count: {
    pending: number;
    ditinjau: number;
    dipanggil: number;
    diterima: number;
    ditolak: number;
    today?: number;
    total: number;
  };
};

type LowonganResponse = {
  data: LowonganItem[];
};

export default function HRDDashboardPage() {
  const router = useRouter();
  const [items, setItems] = useState<LowonganItem[]>([]);
  const [activeInterviews, setActiveInterviews] = useState<ActiveInterviewItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (!isLoggedIn() || getRole() !== 'hrd') {
      router.replace('/auth/login');
      return;
    }

    void fetchData();
  }, [router]);

  async function fetchData() {
    setIsLoading(true);
    setErrorMessage('');

    try {
      const response = await api.get<LowonganResponse>('/hrd/lowongan');
      setItems(response.data.data);
      setActiveInterviews(await loadActiveInterviews());
    } catch (error) {
      const backendMessage = axios.isAxiosError(error)
        ? error.response?.data?.message || error.response?.data?.error
        : null;
      setErrorMessage(typeof backendMessage === 'string' ? backendMessage : 'Gagal memuat dashboard HRD.');
    } finally {
      setIsLoading(false);
    }
  }

  const activeItems = useMemo(() => items.filter((item) => item.status === 'aktif'), [items]);
  const totalActive = activeItems.length;
  const totalTodayApplicants = items.reduce((sum, item) => sum + (item.lamaran_count.today ?? 0), 0);
  const dipanggilPending = items.reduce((sum, item) => sum + item.lamaran_count.dipanggil, 0);

  return (
    <section className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:py-10">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">Dashboard HRD</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-950">Ringkasan Rekrutmen</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            Pantau lowongan aktif, laju pelamar hari ini, dan kandidat yang sedang menunggu proses interview.
          </p>
        </div>
        <Link
          href="/hrd/lowongan"
          className="inline-flex items-center justify-center rounded-md bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          Kelola Lowongan
        </Link>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <DashboardStat label="Lowongan aktif" value={String(totalActive)} tone="default" />
        <DashboardStat label="Pelamar hari ini" value={String(totalTodayApplicants)} tone="default" />
        <DashboardStat label="Dipanggil pending" value={String(dipanggilPending)} tone={dipanggilPending > 0 ? 'highlight' : 'default'} />
      </div>

      {errorMessage ? (
        <p className="mt-6 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{errorMessage}</p>
      ) : null}

      <div className="mt-8 rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-950">Interview Aktif</h2>
            <p className="mt-1 text-sm text-slate-600">Kandidat yang sedang berada di tahap chat interview.</p>
          </div>
          <Link href="/hrd/chat" className="text-sm font-medium text-slate-700 hover:text-slate-950">
            Buka semua
          </Link>
        </div>

        {isLoading ? (
          <div className="space-y-4 p-5">
            {Array.from({ length: 2 }).map((_, index) => (
              <div key={index} className="h-20 animate-pulse rounded-lg bg-slate-100" />
            ))}
          </div>
        ) : activeInterviews.length === 0 ? (
          <div className="flex min-h-48 flex-col items-center justify-center px-6 text-center">
            <p className="text-lg font-semibold text-slate-950">Belum ada interview aktif</p>
            <p className="mt-2 text-sm text-slate-600">Saat kandidat dipanggil, room chat akan muncul di sini.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-200">
            {activeInterviews.slice(0, 5).map((item) => (
              <article key={item.roomId} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-base font-semibold text-slate-950">{item.lowonganTitle}</h3>
                  <p className="mt-1 text-sm text-slate-600">
                    {item.kandidatNama}
                    {item.universitas ? ` • ${item.universitas}` : ''}
                  </p>
                </div>
                <Link
                  href={`/hrd/chat/${item.roomId}`}
                  className="inline-flex items-center justify-center rounded-md bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
                >
                  Masuk Interview
                </Link>
              </article>
            ))}
          </div>
        )}
      </div>

      <div className="mt-8 rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-950">Lowongan aktif</h2>
            <p className="mt-1 text-sm text-slate-600">Prioritas utama yang masih menerima kandidat.</p>
          </div>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
            {activeItems.length} aktif
          </span>
        </div>

        {isLoading ? (
          <div className="space-y-4 p-5">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="h-24 animate-pulse rounded-lg bg-slate-100" />
            ))}
          </div>
        ) : activeItems.length === 0 ? (
          <div className="flex min-h-72 flex-col items-center justify-center px-6 text-center">
            <p className="text-lg font-semibold text-slate-950">Belum ada lowongan aktif</p>
            <p className="mt-2 max-w-md text-sm text-slate-600">
              Aktifkan kembali lowongan lama atau buat yang baru untuk mulai menerima pelamar.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-200">
            {activeItems.map((item) => (
              <article key={item.id} className="flex flex-col gap-4 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <h3 className="truncate text-lg font-semibold text-slate-950">{item.judul}</h3>
                  <p className="mt-1 text-sm text-slate-600">
                    {capitalize(item.jenis)} • Batas lamaran {formatDate(item.batas_lamaran)}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <div className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">
                    <span className="font-semibold text-slate-950">{item.lamaran_count.total}</span> pelamar
                  </div>
                  <div className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700">
                    <span className="font-semibold">{item.lamaran_count.dipanggil}</span> dipanggil
                  </div>
                  <Link
                    href={`/hrd/lowongan/${item.id}/pelamar`}
                    className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                  >
                    Lihat Pelamar
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function DashboardStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: 'default' | 'highlight';
}) {
  return (
    <div
      className={`rounded-lg border p-4 shadow-sm ${
        tone === 'highlight'
          ? 'border-amber-200 bg-amber-50'
          : 'border-slate-200 bg-white'
      }`}
    >
      <p className={`text-sm font-medium ${tone === 'highlight' ? 'text-amber-700' : 'text-slate-500'}`}>{label}</p>
      <p className={`mt-3 text-3xl font-semibold tracking-tight ${tone === 'highlight' ? 'text-amber-900' : 'text-slate-950'}`}>{value}</p>
    </div>
  );
}

function formatDate(value: string | null) {
  if (!value) return '-';
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(value));
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
