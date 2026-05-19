'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { usePathname } from 'next/navigation';
import { clearAuth, getRole, getUserName, isLoggedIn } from '@/lib/auth';
import { getToastEventName } from '@/lib/toast';

export function AuthNav() {
  const pathname = usePathname();
  const [loggedIn, setLoggedIn] = useState(false);
  const [role, setRole] = useState<string | null>(null);
  const [name, setName] = useState<string | null>(null);
  const [toast, setToast] = useState('');

  useEffect(() => {
    const sync = () => {
      setLoggedIn(isLoggedIn());
      setRole(getRole());
      setName(getUserName());
    };

    sync();
    window.addEventListener('auth:changed', sync);
    window.addEventListener('profile:changed', sync);
    window.addEventListener('storage', sync);

    return () => {
      window.removeEventListener('auth:changed', sync);
      window.removeEventListener('profile:changed', sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  useEffect(() => {
    const handler = (event: Event) => {
      const customEvent = event as CustomEvent<{ message?: string }>;
      if (customEvent.detail?.message) {
        setToast(customEvent.detail.message);
      }
    };

    window.addEventListener(getToastEventName(), handler as EventListener);
    return () => window.removeEventListener(getToastEventName(), handler as EventListener);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(''), 2600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const navItems = useMemo(() => {
    if (role === 'hrd') {
      return [
        { href: '/hrd/dashboard', label: 'Dashboard' },
        { href: '/hrd/lowongan', label: 'Kelola Lowongan' },
        { href: '/hrd/chat', label: 'Chat' },
      ];
    }

    if (role === 'mahasiswa') {
      return [
        { href: '/mahasiswa/dashboard', label: 'Dashboard' },
        { href: '/mahasiswa/lowongan', label: 'Cari Lowongan' },
        { href: '/mahasiswa/lamaran', label: 'Lamaran Saya' },
        { href: '/mahasiswa/profil', label: 'Profil' },
      ];
    }

    return [];
  }, [role]);

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex min-h-16 w-full max-w-7xl flex-col gap-3 px-4 py-3 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:py-0">
          <div className="flex items-center justify-between gap-4">
            <Link href="/" className="text-lg font-semibold tracking-tight text-slate-950">
              intern-link
            </Link>

            {loggedIn ? (
              <div className="flex items-center gap-2 lg:hidden">
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold capitalize text-slate-700">
                  {role}
                </span>
              </div>
            ) : null}
          </div>

          <div className="flex flex-1 flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <nav className="flex flex-wrap items-center gap-2">
              {loggedIn ? (
                navItems.map((item) => {
                  const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`rounded-md px-3 py-2 text-sm font-medium transition ${
                        active ? 'bg-slate-950 text-white' : 'text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {item.label}
                    </Link>
                  );
                })
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

            {loggedIn ? (
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-950">{name || 'Pengguna'}</p>
                    <p className="text-xs text-slate-500">Akun aktif</p>
                  </div>
                  <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold capitalize text-slate-700 ring-1 ring-slate-200">
                    {role}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    clearAuth();
                    window.location.href = '/auth/login';
                  }}
                  className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
                >
                  Logout
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </header>

      {toast ? (
        <div className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2 rounded-md bg-slate-950 px-4 py-3 text-sm font-medium text-white shadow-lg">
          {toast}
        </div>
      ) : null}
    </>
  );
}
