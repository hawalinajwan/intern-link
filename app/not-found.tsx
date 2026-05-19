import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-[70vh] w-full max-w-2xl flex-col items-center justify-center px-6 text-center">
      <p className="text-sm font-medium text-slate-500">404</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">Tidak ditemukan</h1>
      <p className="mt-3 text-sm leading-6 text-slate-600">
        Halaman atau data yang kamu cari tidak tersedia.
      </p>
      <Link
        href="/"
        className="mt-6 rounded-md bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
      >
        Kembali ke Beranda
      </Link>
    </main>
  );
}
