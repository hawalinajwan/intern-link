'use client';

export default function GlobalError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  return (
    <html lang="id">
      <body className="min-h-screen bg-slate-50 text-slate-950">
        <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col items-center justify-center px-6 text-center">
          <p className="text-sm font-medium text-slate-500">Terjadi error</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">Ada sesuatu yang bermasalah</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Kami tidak bisa memuat halaman ini sekarang. Coba ulangi sebentar lagi.
          </p>
          <button
            type="button"
            onClick={() => unstable_retry()}
            className="mt-6 rounded-md bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
          >
            Coba Lagi
          </button>
          <p className="mt-4 text-xs text-slate-400">{error.digest ? `Ref ${error.digest}` : null}</p>
        </main>
      </body>
    </html>
  );
}
