'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import api from '@/lib/api';
import { getRole, isLoggedIn } from '@/lib/auth';
import { LamaranCard, type LamaranItem } from '@/components/LamaranCard';

type LamaranResponse = {
  success: boolean;
  data: LamaranItem[];
  error?: string;
};

export default function MahasiswaDashboardPage() {
  const router = useRouter();
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [lamaran, setLamaran] = useState<LamaranItem[]>([]);

  useEffect(() => {
    if (!isLoggedIn() || getRole() !== 'mahasiswa') {
      router.replace('/auth/login');
      return;
    }

    setIsCheckingAuth(false);
  }, [router]);

  useEffect(() => {
    if (isCheckingAuth) return;

    async function fetchLamaran() {
      setIsLoading(true);
      setError('');

      try {
        const response = await api.get<LamaranResponse>('/mahasiswa/lamaran');
        setLamaran((response.data.data || []).sort(sortByLatest));
      } catch (requestError) {
        if (!axios.isAxiosError(requestError) || requestError.response?.status !== 401) {
          setError('Gagal memuat dashboard lamaran.');
        }
      } finally {
        setIsLoading(false);
      }
    }

    fetchLamaran();
  }, [isCheckingAuth]);

  const totalLamaran = lamaran.length;
  const pendingDitinjauCount = lamaran.filter((item) => item.status === 'pending' || item.status === 'ditinjau').length;
  const dipanggilCount = lamaran.filter((item) => item.status === 'dipanggil').length;
  const diterimaCount = lamaran.filter((item) => item.status === 'diterima').length;
  const latestLamaran = lamaran.slice(0, 3);

  if (isCheckingAuth || isLoading) {
    return (
      <section className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
        <div className="h-8 w-48 animate-pulse rounded bg-slate-200" />
        <div className="mt-6 grid gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-28 animate-pulse rounded-lg bg-white shadow-sm" />
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:py-10">
      <div className="rounded-lg border border-rose-100 bg-white/85 p-5 shadow-sm shadow-rose-950/5 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-rose-600">Ringkasan mahasiswa</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-950">Dashboard Mahasiswa</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Lihat progres aplikasi terbaru dan lanjutkan ke lowongan berikutnya.
          </p>
        </div>
        <Link
          href="/mahasiswa/lowongan"
          className="inline-flex rounded-md bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-rose-600/20 hover:bg-rose-500"
        >
          Cari Lowongan
        </Link>
        </div>
      </div>

      {error ? <p className="mt-6 rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total lamaran" value={totalLamaran} tone="rose" />
        <StatCard label="Pending / Ditinjau" value={pendingDitinjauCount} tone="blue" />
        <StatCard label="Dipanggil" value={dipanggilCount} highlight={dipanggilCount > 0} />
        <StatCard label="Diterima" value={diterimaCount} success />
      </div>

      <div className="mt-8">
        <div className="mb-4 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold tracking-tight text-slate-950">3 lamaran terbaru</h2>
            <p className="mt-1 text-sm text-slate-600">Status terbaru dari aplikasi yang sudah kamu kirim.</p>
          </div>
          {lamaran.length > 3 ? (
            <Link href="/mahasiswa/lamaran" className="text-sm font-medium text-slate-700 hover:text-slate-950">
              Lihat semua
            </Link>
          ) : null}
        </div>

        {latestLamaran.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
            <p className="text-lg font-semibold text-slate-950">Belum ada lamaran</p>
            <p className="mt-2 text-sm text-slate-600">Ayo mulai cari lowongan dan kirim aplikasi pertamamu.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {latestLamaran.map((item) => (
              <LamaranCard key={item.lamaran_id} item={item} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function StatCard({
  label,
  value,
  highlight = false,
  success = false,
  tone = 'default',
}: {
  label: string;
  value: number;
  highlight?: boolean;
  success?: boolean;
  tone?: 'default' | 'rose' | 'blue';
}) {
  const classes = highlight
    ? 'border-yellow-200 bg-yellow-50'
    : success
      ? 'border-green-200 bg-green-50'
      : tone === 'rose'
        ? 'border-rose-200 bg-rose-50'
        : tone === 'blue'
          ? 'border-sky-200 bg-sky-50'
      : 'border-slate-200 bg-white';

  return (
    <div className={`rounded-lg border p-4 shadow-sm ${classes}`}>
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">{value}</p>
    </div>
  );
}

function sortByLatest(a: LamaranItem, b: LamaranItem) {
  return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
}
