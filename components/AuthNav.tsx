'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { clearAuth, getRole, isLoggedIn } from '@/lib/auth';

export function AuthNav() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    const sync = () => {
      setLoggedIn(isLoggedIn());
      setRole(getRole());
    };

    sync();
    window.addEventListener('auth:changed', sync);
    window.addEventListener('storage', sync);

    return () => {
      window.removeEventListener('auth:changed', sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  const dashboardHref = role === 'hrd' ? '/hrd/dashboard' : '/mahasiswa/dashboard';

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex min-h-16 w-full max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/" className="text-lg font-semibold tracking-tight text-slate-950">
          intern-link
        </Link>

        <nav className="flex items-center gap-2">
          {loggedIn ? (
            <>
              <Link
                href={dashboardHref}
                className="rounded-md px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
              >
                Dashboard
              </Link>
              <button
                type="button"
                onClick={() => {
                  clearAuth();
                  window.location.href = '/';
                }}
                className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
              >
                Keluar
              </button>
            </>
          ) : (
            <>
              <Link
                href="/auth/login"
                className="rounded-md px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
              >
                Login
              </Link>
              <Link
                href="/auth/register"
                className="rounded-md bg-slate-950 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800"
              >
                Register
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
