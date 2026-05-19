'use client';

import axios from 'axios';
import Link from 'next/link';
import { FormEvent, ReactNode, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { getRole, isLoggedIn } from '@/lib/auth';

type WorkType = 'remote' | 'onsite' | 'hybrid';
type LowonganStatus = 'aktif' | 'ditutup';

type LowonganItem = {
  id: number;
  judul: string;
  deskripsi: string | null;
  persyaratan: string | null;
  keahlian_dibutuhkan: string[];
  jenis: WorkType;
  durasi_bulan: number | null;
  uang_saku: number | null;
  kuota: number | null;
  batas_lamaran: string | null;
  status: LowonganStatus;
  created_at: string;
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

type FormState = {
  judul: string;
  deskripsi: string;
  persyaratan: string;
  keahlian_dibutuhkan: string;
  jenis: WorkType;
  durasi_bulan: string;
  uang_saku: string;
  kuota: string;
  batas_lamaran: string;
  status: LowonganStatus;
};

const DEFAULT_FORM: FormState = {
  judul: '',
  deskripsi: '',
  persyaratan: '',
  keahlian_dibutuhkan: '',
  jenis: 'remote',
  durasi_bulan: '3',
  uang_saku: '',
  kuota: '10',
  batas_lamaran: '',
  status: 'aktif',
};

const jenisBadgeStyles: Record<WorkType, string> = {
  remote: 'bg-blue-50 text-blue-700 ring-blue-200',
  onsite: 'bg-orange-50 text-orange-700 ring-orange-200',
  hybrid: 'bg-green-50 text-green-700 ring-green-200',
};

const statusBadgeStyles: Record<LowonganStatus, string> = {
  aktif: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  ditutup: 'bg-slate-100 text-slate-700 ring-slate-200',
};

export default function HRDLowonganPage() {
  const router = useRouter();
  const [items, setItems] = useState<LowonganItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [toast, setToast] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<LowonganItem | null>(null);
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);

  useEffect(() => {
    if (!isLoggedIn() || getRole() !== 'hrd') {
      router.replace('/auth/login');
      return;
    }

    void fetchLowongan();
  }, [router]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(''), 2600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const activeCount = useMemo(
    () => items.filter((item) => item.status === 'aktif').length,
    [items]
  );

  async function fetchLowongan() {
    setIsLoading(true);
    setErrorMessage('');

    try {
      const response = await api.get<LowonganResponse>('/hrd/lowongan');
      setItems(response.data.data);
    } catch (error) {
      if (!axios.isAxiosError(error)) {
        setErrorMessage('Gagal memuat lowongan.');
        return;
      }

      const backendMessage = error.response?.data?.message;
      setErrorMessage(typeof backendMessage === 'string' ? backendMessage : 'Gagal memuat lowongan.');
    } finally {
      setIsLoading(false);
    }
  }

  function openCreateModal() {
    setEditingItem(null);
    setForm(DEFAULT_FORM);
    setFormError('');
    setIsModalOpen(true);
  }

  function openEditModal(item: LowonganItem) {
    setEditingItem(item);
    setForm({
      judul: item.judul,
      deskripsi: item.deskripsi ?? '',
      persyaratan: item.persyaratan ?? '',
      keahlian_dibutuhkan: item.keahlian_dibutuhkan.join(', '),
      jenis: item.jenis,
      durasi_bulan: item.durasi_bulan ? String(item.durasi_bulan) : '1',
      uang_saku: item.uang_saku ? String(item.uang_saku) : '',
      kuota: item.kuota ? String(item.kuota) : '10',
      batas_lamaran: item.batas_lamaran ?? '',
      status: item.status,
    });
    setFormError('');
    setIsModalOpen(true);
  }

  function closeModal() {
    if (isSubmitting) return;
    setIsModalOpen(false);
    setEditingItem(null);
    setForm(DEFAULT_FORM);
    setFormError('');
  }

  function updateForm<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function submitForm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const judul = form.judul.trim();
    const durasi = Number(form.durasi_bulan);
    const kuota = Number(form.kuota);

    if (!judul || !form.jenis || !form.batas_lamaran || !durasi) {
      setFormError('Judul, jenis, durasi, dan batas lamaran wajib diisi.');
      return;
    }

    if (durasi < 1 || durasi > 12) {
      setFormError('Durasi harus di antara 1 sampai 12 bulan.');
      return;
    }

    if (kuota < 1) {
      setFormError('Kuota minimal 1 kandidat.');
      return;
    }

    setIsSubmitting(true);
    setFormError('');

    const payload = {
      judul,
      deskripsi: normalizeOptional(form.deskripsi),
      persyaratan: normalizeOptional(form.persyaratan),
      keahlian_dibutuhkan: splitSkills(form.keahlian_dibutuhkan),
      jenis: form.jenis,
      durasi_bulan: durasi,
      uang_saku: Number(form.uang_saku || 0),
      kuota,
      batas_lamaran: form.batas_lamaran,
      status: form.status,
    };

    try {
      if (editingItem) {
        await api.put(`/hrd/lowongan/${editingItem.id}`, payload);
        setToast('Lowongan berhasil diperbarui.');
      } else {
        await api.post('/hrd/lowongan', payload);
        setToast('Lowongan baru berhasil dibuat.');
      }

      closeModal();
      await fetchLowongan();
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const backendMessage = error.response?.data?.message || error.response?.data?.error;
        if (typeof backendMessage === 'string') {
          setFormError(backendMessage);
        } else {
          setFormError('Gagal menyimpan lowongan.');
        }
      } else {
        setFormError('Gagal menyimpan lowongan.');
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  async function toggleStatus(item: LowonganItem) {
    const nextStatus: LowonganStatus = item.status === 'aktif' ? 'ditutup' : 'aktif';
    setBusyId(item.id);

    try {
      await api.put(`/hrd/lowongan/${item.id}`, { status: nextStatus });
      setToast(nextStatus === 'aktif' ? 'Lowongan diaktifkan kembali.' : 'Lowongan ditutup.');
      await fetchLowongan();
    } catch (error) {
      const backendMessage = axios.isAxiosError(error)
        ? error.response?.data?.message || error.response?.data?.error
        : null;
      setErrorMessage(typeof backendMessage === 'string' ? backendMessage : 'Gagal memperbarui status lowongan.');
    } finally {
      setBusyId(null);
    }
  }

  async function deleteLowongan(item: LowonganItem) {
    const confirmed = window.confirm(`Hapus lowongan "${item.judul}"?`);
    if (!confirmed) return;

    setBusyId(item.id);

    try {
      await api.delete(`/hrd/lowongan/${item.id}`);
      setToast('Lowongan berhasil dihapus.');
      await fetchLowongan();
    } catch (error) {
      const backendMessage = axios.isAxiosError(error)
        ? error.response?.data?.message || error.response?.data?.error
        : null;
      setErrorMessage(typeof backendMessage === 'string' ? backendMessage : 'Lowongan gagal dihapus.');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:py-10">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">Kelola rekrutmen</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-950">Lowongan Anda</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            Buat, edit, tutup, dan pantau performa lowongan dari satu tempat.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreateModal}
          className="inline-flex items-center justify-center rounded-md bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          Buat Lowongan Baru
        </button>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard label="Total lowongan" value={String(items.length)} helpText="Seluruh lowongan yang pernah dibuat" />
        <SummaryCard label="Lowongan aktif" value={String(activeCount)} helpText="Masih bisa menerima pelamar" />
        <SummaryCard
          label="Total pelamar"
          value={String(items.reduce((sum, item) => sum + item.lamaran_count.total, 0))}
          helpText="Akumulasi semua aplikasi"
        />
        <SummaryCard
          label="Kandidat diterima"
          value={String(items.reduce((sum, item) => sum + item.lamaran_count.diterima, 0))}
          helpText="Konversi akhir terbaik"
        />
      </div>

      {errorMessage ? (
        <p className="mt-6 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{errorMessage}</p>
      ) : null}

      <div className="mt-6 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="hidden grid-cols-[minmax(0,2fr)_120px_150px_120px_120px_120px_360px] gap-4 border-b border-slate-200 bg-slate-50 px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 lg:grid">
          <span>Lowongan</span>
          <span>Jenis</span>
          <span>Batas lamaran</span>
          <span>Status</span>
          <span>Pelamar</span>
          <span>Progress</span>
          <span>Aksi</span>
        </div>

        {isLoading ? (
          <div className="space-y-4 p-5">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="h-28 animate-pulse rounded-lg bg-slate-100" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="flex min-h-80 flex-col items-center justify-center px-6 text-center">
            <p className="text-lg font-semibold text-slate-950">Belum ada lowongan</p>
            <p className="mt-2 max-w-md text-sm text-slate-600">
              Mulai dengan membuat lowongan pertama untuk membuka pipeline kandidat.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-200">
            {items.map((item) => (
              <article key={item.id} className="p-5">
                <div className="grid gap-5 lg:grid-cols-[minmax(0,2fr)_120px_150px_120px_120px_120px_360px] lg:items-center">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-950">{item.judul}</h2>
                    <p className="mt-1 text-sm text-slate-600">{truncate(item.deskripsi || item.persyaratan || 'Belum ada deskripsi.', 120)}</p>
                  </div>

                  <div>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-medium capitalize ring-1 ${jenisBadgeStyles[item.jenis]}`}>
                      {item.jenis}
                    </span>
                  </div>

                  <div className="text-sm text-slate-700">{formatDate(item.batas_lamaran)}</div>

                  <div>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-medium capitalize ring-1 ${statusBadgeStyles[item.status]}`}>
                      {item.status}
                    </span>
                  </div>

                  <div className="text-sm font-medium text-slate-900">{item.lamaran_count.total}</div>

                  <div className="space-y-1 text-sm text-slate-600">
                    <p>Dipanggil: {item.lamaran_count.dipanggil}</p>
                    <p>Diterima: {item.lamaran_count.diterima}</p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Link
                      href={`/hrd/lowongan/${item.id}/pelamar`}
                      className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                    >
                      Lihat Pelamar
                    </Link>
                    <button
                      type="button"
                      onClick={() => openEditModal(item)}
                      className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleStatus(item)}
                      disabled={busyId === item.id}
                      className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {item.status === 'aktif' ? 'Tutup' : 'Aktifkan'}
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteLowongan(item)}
                      disabled={busyId === item.id}
                      className="rounded-md border border-red-200 px-3 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Hapus
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      {isModalOpen ? (
        <LowonganModal
          form={form}
          error={formError}
          isEditing={Boolean(editingItem)}
          isSubmitting={isSubmitting}
          onChange={updateForm}
          onClose={closeModal}
          onSubmit={submitForm}
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

function LowonganModal({
  form,
  error,
  isEditing,
  isSubmitting,
  onChange,
  onClose,
  onSubmit,
}: {
  form: FormState;
  error: string;
  isEditing: boolean;
  isSubmitting: boolean;
  onChange: <K extends keyof FormState>(key: K, value: FormState[K]) => void;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/45 p-4 sm:items-center">
      <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-lg bg-white shadow-xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
          <div>
            <p className="text-sm text-slate-500">{isEditing ? 'Edit lowongan' : 'Lowongan baru'}</p>
            <h2 className="mt-1 text-xl font-semibold text-slate-950">
              {isEditing ? 'Perbarui detail lowongan' : 'Buat lowongan baru'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-2 py-1 text-sm font-medium text-slate-500 hover:bg-slate-100"
          >
            Tutup
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-5 px-5 py-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Judul lowongan">
              <input
                value={form.judul}
                onChange={(event) => onChange('judul', event.target.value)}
                className={inputClassName}
                placeholder="Frontend Developer Intern"
              />
            </Field>

            <Field label="Jenis kerja">
              <select
                value={form.jenis}
                onChange={(event) => onChange('jenis', event.target.value as WorkType)}
                className={inputClassName}
              >
                <option value="remote">Remote</option>
                <option value="onsite">Onsite</option>
                <option value="hybrid">Hybrid</option>
              </select>
            </Field>
          </div>

          <Field label="Deskripsi">
            <textarea
              value={form.deskripsi}
              onChange={(event) => onChange('deskripsi', event.target.value)}
              rows={5}
              className={`${inputClassName} resize-none`}
              placeholder="Jelaskan tanggung jawab utama posisi ini."
            />
          </Field>

          <Field label="Persyaratan">
            <textarea
              value={form.persyaratan}
              onChange={(event) => onChange('persyaratan', event.target.value)}
              rows={5}
              className={`${inputClassName} resize-none`}
              placeholder="Tuliskan kualifikasi atau pengalaman yang dicari."
            />
          </Field>

          <Field label="Keahlian dibutuhkan">
            <input
              value={form.keahlian_dibutuhkan}
              onChange={(event) => onChange('keahlian_dibutuhkan', event.target.value)}
              className={inputClassName}
              placeholder="React, TypeScript, UI Testing"
            />
          </Field>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Durasi (bulan)">
              <input
                type="number"
                min={1}
                max={12}
                value={form.durasi_bulan}
                onChange={(event) => onChange('durasi_bulan', event.target.value)}
                className={inputClassName}
              />
            </Field>

            <Field label="Uang saku">
              <input
                type="number"
                min={0}
                value={form.uang_saku}
                onChange={(event) => onChange('uang_saku', event.target.value)}
                className={inputClassName}
                placeholder="1500000"
              />
            </Field>

            <Field label="Kuota">
              <input
                type="number"
                min={1}
                value={form.kuota}
                onChange={(event) => onChange('kuota', event.target.value)}
                className={inputClassName}
              />
            </Field>

            <Field label="Batas lamaran">
              <input
                type="date"
                value={form.batas_lamaran}
                onChange={(event) => onChange('batas_lamaran', event.target.value)}
                className={inputClassName}
              />
            </Field>
          </div>

          {isEditing ? (
            <Field label="Status">
              <select
                value={form.status}
                onChange={(event) => onChange('status', event.target.value as LowonganStatus)}
                className={inputClassName}
              >
                <option value="aktif">Aktif</option>
                <option value="ditutup">Ditutup</option>
              </select>
            </Field>
          ) : null}

          {error ? <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}

          <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-md bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              {isSubmitting ? 'Menyimpan...' : isEditing ? 'Simpan Perubahan' : 'Publikasikan Lowongan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-slate-800">{label}</span>
      <div className="mt-2">{children}</div>
    </label>
  );
}

function SummaryCard({ label, value, helpText }: { label: string; value: string; helpText: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">{value}</p>
      <p className="mt-2 text-sm text-slate-600">{helpText}</p>
    </div>
  );
}

const inputClassName =
  'w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-slate-950 focus:ring-2 focus:ring-slate-200';

function splitSkills(value: string) {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeOptional(value: string) {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function formatDate(value: string | null) {
  if (!value) return '-';
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(value));
}

function truncate(value: string, length: number) {
  if (value.length <= length) return value;
  return `${value.slice(0, length - 1)}…`;
}
