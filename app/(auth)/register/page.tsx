'use client';

import { FormEvent, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { setAuth } from '@/lib/auth';

type Role = 'mahasiswa' | 'hrd';

type FieldErrors = {
  email?: string;
  password?: string;
  role?: string;
  general?: string;
};

type AuthResponse = {
  success: boolean;
  data?: {
    user_id: number;
    role: Role;
    token: string;
  };
  error?: string;
};

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<Role>('mahasiswa');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const roleOptions = useMemo(
    () => [
      { value: 'mahasiswa' as const, label: 'Mahasiswa', description: 'Cari dan lamar peluang magang.' },
      { value: 'hrd' as const, label: 'HRD', description: 'Publikasikan lowongan dan kelola kandidat.' },
    ],
    []
  );

  function validate(): FieldErrors {
    const nextErrors: FieldErrors = {};

    if (!email.trim()) {
      nextErrors.email = 'Email wajib diisi.';
    } else if (!/^\S+@\S+\.\S+$/.test(email)) {
      nextErrors.email = 'Format email tidak valid.';
    }

    if (password.length < 8) {
      nextErrors.password = 'Password minimal 8 karakter.';
    }

    if (!['mahasiswa', 'hrd'].includes(role)) {
      nextErrors.role = 'Pilih role yang valid.';
    }

    return nextErrors;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const validationErrors = validate();
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) return;

    setIsSubmitting(true);

    try {
      const response = await api.post<AuthResponse>('/auth/register', { email, password, role });
      const data = response.data.data;

      if (!data?.token) {
        throw new Error(response.data.error || 'Registrasi gagal.');
      }

      setAuth(data.token, data.user_id, data.role);
      router.push(data.role === 'hrd' ? '/hrd/dashboard' : '/mahasiswa/dashboard');
    } catch (error: unknown) {
      const message =
        typeof error === 'object' &&
        error !== null &&
        'response' in error &&
        typeof (error as { response?: { data?: { error?: string } } }).response?.data?.error === 'string'
          ? (error as { response: { data: { error: string } } }).response.data.error
          : 'Registrasi gagal. Coba lagi.';

      setErrors({ general: message });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="mx-auto flex w-full max-w-6xl items-center justify-center px-4 py-10 sm:px-6 lg:py-16">
      <div className="w-full max-w-md">
        <div className="mb-8">
          <p className="text-sm font-medium text-slate-500">Buat akun</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">Mulai dengan intern-link</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Pilih peran akun agar dashboard langsung sesuai kebutuhanmu.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          {errors.general ? (
            <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{errors.general}</p>
          ) : null}

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-slate-800">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-slate-950 focus:ring-2 focus:ring-slate-200"
              autoComplete="email"
            />
            {errors.email ? <p className="mt-1 text-sm text-red-600">{errors.email}</p> : null}
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-slate-800">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-slate-950 focus:ring-2 focus:ring-slate-200"
              autoComplete="new-password"
            />
            {errors.password ? <p className="mt-1 text-sm text-red-600">{errors.password}</p> : null}
          </div>

          <fieldset>
            <legend className="text-sm font-medium text-slate-800">Role</legend>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {roleOptions.map((option) => (
                <label
                  key={option.value}
                  className={`cursor-pointer rounded-md border p-3 transition ${
                    role === option.value ? 'border-slate-950 bg-slate-50' : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="role"
                    value={option.value}
                    checked={role === option.value}
                    onChange={() => setRole(option.value)}
                    className="sr-only"
                  />
                  <span className="block text-sm font-semibold text-slate-950">{option.label}</span>
                  <span className="mt-1 block text-xs leading-5 text-slate-600">{option.description}</span>
                </label>
              ))}
            </div>
            {errors.role ? <p className="mt-1 text-sm text-red-600">{errors.role}</p> : null}
          </fieldset>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-md bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            {isSubmitting ? 'Mendaftarkan...' : 'Daftar'}
          </button>
        </form>
      </div>
    </section>
  );
}
