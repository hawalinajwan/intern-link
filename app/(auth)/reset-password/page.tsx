'use client';

import axios from 'axios';
import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const resetToken = new URLSearchParams(window.location.search).get('token') || '';
    if (!resetToken) {
      setError('Link tidak valid.');
      const timer = window.setTimeout(() => router.replace('/auth/forgot-password'), 1200);
      return () => window.clearTimeout(timer);
    }

    setToken(resetToken);
  }, [router]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');

    if (newPassword.length < 8) {
      setError('Password minimal 8 karakter.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Konfirmasi password tidak sama.');
      return;
    }

    setIsSubmitting(true);

    try {
      await api.post('/auth/reset-password', {
        token,
        new_password: newPassword,
      });
      setSuccess('Password berhasil direset!');
      window.setTimeout(() => router.replace('/auth/login'), 2000);
    } catch (requestError) {
      const backendMessage = axios.isAxiosError(requestError)
        ? requestError.response?.data?.error || requestError.response?.data?.message
        : null;
      setError(typeof backendMessage === 'string' ? backendMessage : 'Reset password gagal.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="mx-auto flex w-full max-w-6xl items-center justify-center px-4 py-10 sm:px-6 lg:py-16">
      <div className="w-full max-w-md">
        <div className="mb-8">
          <p className="text-sm font-medium text-slate-500">Password baru</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">Reset Password</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Buat password baru minimal 8 karakter untuk akun intern-link kamu.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          {success ? (
            <p className="rounded-md border border-green-200 bg-green-50 px-3 py-3 text-sm text-green-700">{success}</p>
          ) : null}
          {error ? <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}

          <div>
            <label htmlFor="new_password" className="block text-sm font-medium text-slate-800">
              Password baru
            </label>
            <input
              id="new_password"
              type="password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-rose-500 focus:ring-2 focus:ring-rose-100"
              autoComplete="new-password"
            />
          </div>

          <div>
            <label htmlFor="confirm_password" className="block text-sm font-medium text-slate-800">
              Konfirmasi password
            </label>
            <input
              id="confirm_password"
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-rose-500 focus:ring-2 focus:ring-rose-100"
              autoComplete="new-password"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting || !token || Boolean(success)}
            className="w-full rounded-md bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-rose-600/20 transition hover:bg-rose-500 disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            {isSubmitting ? 'Menyimpan...' : 'Reset Password'}
          </button>

          <p className="text-center text-sm text-slate-600">
            Butuh link baru?{' '}
            <Link href="/auth/forgot-password" className="font-medium text-slate-950 underline-offset-4 hover:underline">
              Kirim ulang
            </Link>
          </p>
        </form>
      </div>
    </section>
  );
}
