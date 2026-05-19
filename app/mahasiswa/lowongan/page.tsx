'use client';

import axios from 'axios';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import api from '@/lib/api';

type WorkType = 'remote' | 'onsite' | 'hybrid';

type Company = {
  nama_perusahaan: string | null;
  logo_url?: string | null;
  logo?: string | null;
};

type Lowongan = {
  id: number;
  judul: string;
  jenis: WorkType;
  durasi_bulan: number | null;
  uang_saku: number | null;
  keahlian_dibutuhkan: string[];
  perusahaan: Company;
  sudah_lamar?: boolean;
};

type LowonganResponse = {
  data: Lowongan[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
};

const JENIS_OPTIONS: Array<{ value: WorkType; label: string }> = [
  { value: 'remote', label: 'Remote' },
  { value: 'onsite', label: 'Onsite' },
  { value: 'hybrid', label: 'Hybrid' },
];

const jenisBadgeStyles: Record<WorkType, string> = {
  remote: 'bg-blue-50 text-blue-700 ring-blue-200',
  onsite: 'bg-orange-50 text-orange-700 ring-orange-200',
  hybrid: 'bg-green-50 text-green-700 ring-green-200',
};

const LIMIT = 10;

export default function MahasiswaLowonganPage() {
  const [keyword, setKeyword] = useState('');
  const [debouncedKeyword, setDebouncedKeyword] = useState('');
  const [selectedJenis, setSelectedJenis] = useState<WorkType[]>([]);
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<Lowongan[]>([]);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [selectedLowongan, setSelectedLowongan] = useState<Lowongan | null>(null);
  const [motivation, setMotivation] = useState('');
  const [modalError, setModalError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [appliedIds, setAppliedIds] = useState<Set<number>>(new Set());
  const [toast, setToast] = useState('');

  const jenisParam = useMemo(() => selectedJenis.join(','), [selectedJenis]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedKeyword(keyword.trim());
      setPage(1);
    }, 500);

    return () => window.clearTimeout(timer);
  }, [keyword]);

  useEffect(() => {
    setPage(1);
  }, [jenisParam]);

  useEffect(() => {
    const controller = new AbortController();

    async function fetchLowongan() {
      setIsLoading(true);
      setErrorMessage('');

      try {
        const response = await api.get<LowonganResponse>('/lowongan', {
          params: {
            keyword: debouncedKeyword || undefined,
            jenis: jenisParam || undefined,
            page,
            limit: LIMIT,
          },
          signal: controller.signal,
        });

        setItems(response.data.data);
        setPage(response.data.pagination.page);
        setPages(Math.max(1, response.data.pagination.pages || 1));
        setTotal(response.data.pagination.total);
        setAppliedIds((current) => {
          const next = new Set(current);
          response.data.data.forEach((item) => {
            if (item.sudah_lamar) next.add(item.id);
          });
          return next;
        });
      } catch (error) {
        if (axios.isCancel(error)) return;
        setErrorMessage('Gagal memuat lowongan. Coba lagi sebentar.');
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    }

    fetchLowongan();

    return () => controller.abort();
  }, [debouncedKeyword, jenisParam, page]);

  useEffect(() => {
    if (!toast) return;

    const timer = window.setTimeout(() => setToast(''), 2600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  function toggleJenis(value: WorkType) {
    setSelectedJenis((current) =>
      current.includes(value) ? current.filter((item) => item !== value) : [...current, value]
    );
  }

  function openApplyModal(lowongan: Lowongan) {
    setSelectedLowongan(lowongan);
    setMotivation('');
    setModalError('');
  }

  function closeApplyModal() {
    if (isSubmitting) return;
    setSelectedLowongan(null);
    setMotivation('');
    setModalError('');
  }

  async function submitApplication(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedLowongan) return;
    if (motivation.trim().length < 50) {
      setModalError('Surat motivasi minimal 50 karakter.');
      return;
    }

    setIsSubmitting(true);
    setModalError('');

    try {
      await api.post('/lamaran', {
        lowongan_id: selectedLowongan.id,
        surat_motivasi: motivation.trim(),
      });

      setAppliedIds((current) => new Set(current).add(selectedLowongan.id));
      setSelectedLowongan(null);
      setMotivation('');
      setToast('Lamaran berhasil dikirim!');
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 409) {
          setAppliedIds((current) => new Set(current).add(selectedLowongan.id));
          setModalError('Kamu sudah pernah melamar');
          return;
        }

        if (error.response?.status === 400) {
          setModalError('Maaf, kuota sudah penuh');
          return;
        }

        const backendError = error.response?.data?.error || error.response?.data?.message;
        if (typeof backendError === 'string') {
          setModalError(backendError);
          return;
        }
      }

      setModalError('Lamaran gagal dikirim. Coba lagi.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:py-10">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">Lowongan aktif</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-950">Cari Lowongan Magang</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            Temukan peluang magang yang sesuai minat, mode kerja, dan skill kamu.
          </p>
        </div>
        <p className="text-sm text-slate-500">{total} lowongan ditemukan</p>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[280px_1fr]">
        <aside className="h-fit rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <label htmlFor="keyword" className="text-sm font-medium text-slate-800">
            Search
          </label>
          <input
            id="keyword"
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            placeholder="Frontend, data, UI..."
            className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-slate-950 focus:ring-2 focus:ring-slate-200"
          />

          <fieldset className="mt-5">
            <legend className="text-sm font-medium text-slate-800">Jenis kerja</legend>
            <div className="mt-3 space-y-2">
              {JENIS_OPTIONS.map((option) => (
                <label key={option.value} className="flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={selectedJenis.includes(option.value)}
                    onChange={() => toggleJenis(option.value)}
                    className="h-4 w-4 rounded border-slate-300 text-slate-950 focus:ring-slate-950"
                  />
                  {option.label}
                </label>
              ))}
            </div>
          </fieldset>
        </aside>

        <div>
          {errorMessage ? (
            <p className="mb-4 rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">{errorMessage}</p>
          ) : null}

          {isLoading ? (
            <LoadingGrid />
          ) : items.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {items.map((item) => (
                <LowonganCard
                  key={item.id}
                  item={item}
                  hasApplied={appliedIds.has(item.id)}
                  onApply={() => openApplyModal(item)}
                />
              ))}
            </div>
          )}

          <div className="mt-6 flex flex-col items-center justify-between gap-3 border-t border-slate-200 pt-4 sm:flex-row">
            <button
              type="button"
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              disabled={page <= 1 || isLoading}
              className="w-full rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
            >
              Prev
            </button>
            <p className="text-sm text-slate-600">
              Halaman {page} dari {pages}
            </p>
            <button
              type="button"
              onClick={() => setPage((current) => Math.min(pages, current + 1))}
              disabled={page >= pages || isLoading}
              className="w-full rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {selectedLowongan ? (
        <ApplyModal
          lowongan={selectedLowongan}
          motivation={motivation}
          setMotivation={setMotivation}
          error={modalError}
          isSubmitting={isSubmitting}
          onClose={closeApplyModal}
          onSubmit={submitApplication}
        />
      ) : null}

      {toast ? (
        <div className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2 rounded-md bg-slate-950 px-4 py-3 text-sm font-medium text-white shadow-lg">
          {toast}
        </div>
      ) : null}
    </section>
  );
}

function LowonganCard({
  item,
  hasApplied,
  onApply,
}: {
  item: Lowongan;
  hasApplied: boolean;
  onApply: () => void;
}) {
  const companyName = item.perusahaan?.nama_perusahaan || 'Perusahaan';
  const logo = item.perusahaan?.logo_url || item.perusahaan?.logo;

  return (
    <article className="flex min-h-64 flex-col rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start gap-3">
        {logo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logo} alt="" className="h-11 w-11 rounded-md border border-slate-200 object-cover" />
        ) : (
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-slate-100 text-sm font-semibold text-slate-600">
            {companyName.slice(0, 1).toUpperCase()}
          </div>
        )}
        <div className="min-w-0">
          <p className="truncate text-sm text-slate-500">{companyName}</p>
          <h2 className="mt-1 line-clamp-2 text-lg font-semibold leading-6 text-slate-950">{item.judul}</h2>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span className={`rounded-full px-2.5 py-1 text-xs font-medium capitalize ring-1 ${jenisBadgeStyles[item.jenis]}`}>
          {item.jenis}
        </span>
        <span className="text-sm text-slate-600">{formatDuration(item.durasi_bulan)}</span>
        <span className="text-sm text-slate-400">•</span>
        <span className="text-sm font-medium text-slate-700">{formatIDR(item.uang_saku)}</span>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {item.keahlian_dibutuhkan.slice(0, 3).map((skill) => (
          <span key={skill} className="rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">
            {skill}
          </span>
        ))}
      </div>

      <div className="mt-auto pt-5">
        <button
          type="button"
          onClick={onApply}
          disabled={hasApplied}
          className="w-full rounded-md bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-600"
        >
          {hasApplied ? 'Sudah Lamar' : 'Lamar'}
        </button>
      </div>
    </article>
  );
}

function ApplyModal({
  lowongan,
  motivation,
  setMotivation,
  error,
  isSubmitting,
  onClose,
  onSubmit,
}: {
  lowongan: Lowongan;
  motivation: string;
  setMotivation: (value: string) => void;
  error: string;
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/40 p-4 sm:items-center">
      <div className="w-full max-w-lg rounded-lg bg-white p-5 shadow-xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm text-slate-500">Kirim lamaran</p>
            <h2 className="mt-1 text-xl font-semibold text-slate-950">{lowongan.judul}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-2 py-1 text-sm font-medium text-slate-500 hover:bg-slate-100"
          >
            Tutup
          </button>
        </div>

        <form onSubmit={onSubmit} className="mt-5 space-y-4">
          <div>
            <label htmlFor="surat_motivasi" className="block text-sm font-medium text-slate-800">
              Surat motivasi
            </label>
            <textarea
              id="surat_motivasi"
              value={motivation}
              onChange={(event) => setMotivation(event.target.value)}
              rows={7}
              className="mt-2 w-full resize-none rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-slate-950 focus:ring-2 focus:ring-slate-200"
              placeholder="Ceritakan alasan kamu cocok untuk posisi ini..."
            />
            <p className={`mt-1 text-xs ${motivation.trim().length >= 50 ? 'text-slate-500' : 'text-slate-400'}`}>
              {motivation.trim().length}/50 karakter minimum
            </p>
          </div>

          {error ? <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-md bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            {isSubmitting ? 'Mengirim...' : 'Kirim Lamaran'}
          </button>
        </form>
      </div>
    </div>
  );
}

function LoadingGrid() {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="h-64 animate-pulse rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex gap-3">
            <div className="h-11 w-11 rounded-md bg-slate-200" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-1/2 rounded bg-slate-200" />
              <div className="h-5 w-3/4 rounded bg-slate-200" />
            </div>
          </div>
          <div className="mt-6 h-4 w-2/3 rounded bg-slate-200" />
          <div className="mt-4 flex gap-2">
            <div className="h-7 w-16 rounded bg-slate-200" />
            <div className="h-7 w-20 rounded bg-slate-200" />
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex min-h-80 flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 bg-white px-6 text-center">
      <svg className="h-10 w-10 text-slate-400" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M10.5 18a7.5 7.5 0 1 1 5.3-12.8A7.5 7.5 0 0 1 10.5 18Zm5.5-2 4 4"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </svg>
      <p className="mt-4 text-base font-semibold text-slate-950">Tidak ada lowongan yang cocok</p>
      <p className="mt-1 text-sm text-slate-600">Coba ubah keyword atau filter jenis kerja.</p>
    </div>
  );
}

function formatIDR(value: number | null) {
  if (!value || value <= 0) return 'Uang saku tidak dicantumkan';

  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDuration(value: number | null) {
  if (!value) return 'Durasi fleksibel';
  return `${value} bulan`;
}
