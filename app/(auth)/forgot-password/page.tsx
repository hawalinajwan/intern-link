'use client';

import axios from 'axios';
import Link from 'next/link';
import { FormEvent, useState } from 'react';
import api from '@/lib/api';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSent, setIsSent] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');

    if (!email.trim()) {
      setError('Email wajib diisi.');
      return;
    }

    setIsSubmitting(true);

    try {
      await api.post('/auth/forgot-password', { email: email.trim() });
      setIsSent(true);
    } catch (requestError) {
      if (axios.isAxiosError(requestError) && requestError.response?.status === 422) {
        setError('Format email tidak valid.');
      } else {
        setIsSent(true);
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="mx-auto flex w-full max-w-6xl items-center justify-center px-4 py-10 sm:px-6 lg:py-16">
      <div className="w-full max-w-md">
        <div className="mb-8">
          <p className="text-sm font-medium text-slate-500">Reset akses</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">Lupa password?</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Masukkan email akunmu. Kalau terdaftar, kami akan mengirim link reset password.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          {isSent ? (
            <div className="rounded-md border border-green-200 bg-green-50 px-3 py-3 text-sm leading-6 text-green-700">
              Jika email terdaftar, link reset password akan dikirim ke emailmu.
            </div>
          ) : null}

          {error ? <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-slate-800">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-rose-500 focus:ring-2 focus:ring-rose-100"
              autoComplete="email"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-md bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-rose-600/20 transition hover:bg-rose-500 disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            {isSubmitting ? 'Mengirim...' : 'Kirim Link Reset'}
          </button>

          <p className="text-center text-sm text-slate-600">
            Ingat password?{' '}
            <Link href="/auth/login" className="font-medium text-slate-950 underline-offset-4 hover:underline">
              Login
            </Link>
          </p>
        </form>
      </div>
    </section>
  );
}
