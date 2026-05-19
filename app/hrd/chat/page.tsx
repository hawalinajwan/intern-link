'use client';

import axios from 'axios';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getRole, isLoggedIn } from '@/lib/auth';
import { type ActiveInterviewItem, loadActiveInterviews } from '@/lib/hrd-interviews';

export default function HRDChatListPage() {
  const router = useRouter();
  const [items, setItems] = useState<ActiveInterviewItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (!isLoggedIn() || getRole() !== 'hrd') {
      router.replace('/auth/login');
      return;
    }

    void fetchItems();
  }, [router]);

  async function fetchItems() {
    setIsLoading(true);
    setErrorMessage('');

    try {
      setItems(await loadActiveInterviews());
    } catch (error) {
      const backendMessage = axios.isAxiosError(error)
        ? error.response?.data?.message || error.response?.data?.error
        : null;
      setErrorMessage(typeof backendMessage === 'string' ? backendMessage : 'Gagal memuat daftar interview aktif.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:py-10">
      <div className="mb-6">
        <p className="text-sm font-medium text-slate-500">Chat interview</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-950">Interview Aktif</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Semua sesi interview yang sedang berjalan untuk lowongan milik Anda.
        </p>
      </div>

      {errorMessage ? (
        <p className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{errorMessage}</p>
      ) : null}

      <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
        {isLoading ? (
          <div className="space-y-4 p-5">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="h-24 animate-pulse rounded-lg bg-slate-100" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="flex min-h-72 flex-col items-center justify-center px-6 text-center">
            <p className="text-lg font-semibold text-slate-950">Belum ada interview aktif</p>
            <p className="mt-2 text-sm text-slate-600">Kandidat yang Anda panggil akan muncul di sini.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-200">
            {items.map((item) => (
              <article key={item.roomId} className="flex flex-col gap-4 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-slate-950">{item.lowonganTitle}</h2>
                  <p className="mt-1 text-sm text-slate-600">
                    {item.kandidatNama}
                    {item.universitas ? ` • ${item.universitas}` : ''}
                  </p>
                </div>
                <Link
                  href={`/hrd/chat/${item.roomId}`}
                  className="inline-flex items-center justify-center rounded-md bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
                >
                  Buka Chat
                </Link>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
