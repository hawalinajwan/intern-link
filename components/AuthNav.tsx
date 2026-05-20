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

  const isPublicHome = pathname === '/' && !loggedIn;

  return (
    <>
      <header
        className={`sticky top-0 z-40 transition ${
          isPublicHome
            ? 'border-b border-white/10 bg-slate-950/35 text-white backdrop-blur'
            : 'border-b border-rose-100 bg-white/92 shadow-sm shadow-rose-950/5 backdrop-blur'
        }`}
      >
        <div className="mx-auto flex min-h-16 w-full max-w-6xl flex-col gap-3 px-4 py-3 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:py-0">
          <div className="flex items-center justify-between gap-4">
            <Link
              href="/"
              className={`text-lg font-semibold tracking-tight ${isPublicHome ? 'text-white' : 'text-slate-950'}`}
            >
              intern-link
            </Link>

            {loggedIn ? (
              <div className="flex items-center gap-2 lg:hidden">
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${
                    isPublicHome ? 'bg-white/10 text-white' : 'bg-slate-100 text-slate-700'
                  }`}
                >
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
                        active
                          ? 'bg-rose-600 text-white shadow-sm shadow-rose-600/20'
                          : isPublicHome
                            ? 'text-white/90 hover:bg-white/10'
                            : 'text-slate-700 hover:bg-rose-50 hover:text-rose-700'
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
                    className={`rounded-md px-3 py-2 text-sm font-medium transition ${
                      isPublicHome ? 'text-white/90 hover:bg-white/10' : 'text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    Login
                  </Link>
                  <Link
                    href="/auth/register"
                    className={`rounded-md px-3 py-2 text-sm font-medium transition ${
                      isPublicHome
                        ? 'bg-rose-500 text-white hover:bg-rose-400'
                        : 'bg-rose-600 text-white shadow-sm shadow-rose-600/20 hover:bg-rose-500'
                    }`}
                  >
                    Register
                  </Link>
                </>
              )}
            </nav>

            {loggedIn ? (
              <div className="flex flex-wrap items-center gap-3">
                <div
                  className={`flex items-center gap-3 rounded-lg px-3 py-2 ${
                    isPublicHome ? 'border border-white/10 bg-white/10' : 'border border-rose-100 bg-rose-50/70'
                  }`}
                >
                  <div className="min-w-0">
                    <p className={`truncate text-sm font-semibold ${isPublicHome ? 'text-white' : 'text-slate-950'}`}>
                      {name || 'Pengguna'}
                    </p>
                    <p className={`text-xs ${isPublicHome ? 'text-white/70' : 'text-slate-500'}`}>Akun aktif</p>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${
                    isPublicHome ? 'bg-white/10 text-white ring-1 ring-white/15' : 'bg-white text-rose-700 ring-1 ring-rose-200'
                    }`}
                  >
                    {role}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    clearAuth();
                    window.location.href = '/auth/login';
                  }}
                  className={`rounded-md border px-3 py-2 text-sm font-medium transition ${
                    isPublicHome
                      ? 'border-white/15 text-white hover:bg-white/10'
                      : 'border-rose-200 text-slate-700 hover:bg-rose-50 hover:text-rose-700'
                  }`}
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
