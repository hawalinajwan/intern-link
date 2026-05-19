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

export default function MahasiswaLamaranPage() {
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
          setError('Gagal memuat daftar lamaran.');
        }
      } finally {
        setIsLoading(false);
      }
    }

    fetchLamaran();
  }, [isCheckingAuth]);

  if (isCheckingAuth || isLoading) {
    return (
      <section className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6">
        <div className="h-8 w-40 animate-pulse rounded bg-slate-200" />
        <div className="mt-6 space-y-4">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="h-36 animate-pulse rounded-lg bg-white shadow-sm" />
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:py-10">
      <div className="mb-6">
        <p className="text-sm font-medium text-slate-500">Status lamaran</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-950">Lamaran Saya</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Pantau progres rekrutmen dan masuk ke chat interview saat kamu dipanggil.
        </p>
      </div>

      {error ? <p className="mb-4 rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}

      {lamaran.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
          <p className="text-lg font-semibold text-slate-950">Belum ada lamaran. Yuk cari lowongan!</p>
          <p className="mt-2 text-sm text-slate-600">Mulai dari halaman lowongan untuk mengirim aplikasi pertama.</p>
          <Link
            href="/mahasiswa/lowongan"
            className="mt-5 inline-flex rounded-md bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
          >
            Cari Lowongan
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {lamaran.map((item) => (
            <LamaranCard key={item.lamaran_id} item={item} />
          ))}
        </div>
      )}
    </section>
  );
}

function sortByLatest(a: LamaranItem, b: LamaranItem) {
  return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
}
