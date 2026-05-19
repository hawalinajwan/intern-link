'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { setAuth } from '@/lib/auth';

type Role = 'mahasiswa' | 'hrd';

type AuthResponse = {
  success: boolean;
  data?: {
    user_id: number;
    role: Role;
    token: string;
    nama?: string | null;
  };
  error?: string;
};

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  function validate() {
    const errors: { email?: string; password?: string } = {};

    if (!email.trim()) errors.email = 'Email wajib diisi.';
    if (!password) errors.password = 'Password wajib diisi.';

    return errors;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const errors = validate();
    setFieldErrors(errors);
    setErrorMessage('');

    if (Object.keys(errors).length > 0) return;

    setIsSubmitting(true);

    try {
      const response = await api.post<AuthResponse>('/auth/login', { email, password });
      const data = response.data.data;

      if (!data?.token) {
        throw new Error(response.data.error || 'Login gagal.');
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
          : 'Email atau password salah.';

      setErrorMessage(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="mx-auto flex w-full max-w-6xl items-center justify-center px-4 py-10 sm:px-6 lg:py-16">
      <div className="w-full max-w-md">
        <div className="mb-8">
          <p className="text-sm font-medium text-slate-500">Masuk</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">Lanjutkan rekrutmen magang</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Masuk untuk mengelola lamaran, lowongan, dan percakapan interview.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          {errorMessage ? (
            <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{errorMessage}</p>
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
            {fieldErrors.email ? <p className="mt-1 text-sm text-red-600">{fieldErrors.email}</p> : null}
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
              autoComplete="current-password"
            />
            {fieldErrors.password ? <p className="mt-1 text-sm text-red-600">{fieldErrors.password}</p> : null}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-md bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            {isSubmitting ? 'Masuk...' : 'Login'}
          </button>

          <p className="text-center text-sm text-slate-600">
            Belum punya akun?{' '}
            <Link href="/auth/register" className="font-medium text-slate-950 underline-offset-4 hover:underline">
              Daftar
            </Link>
          </p>
        </form>
      </div>
    </section>
  );
}
