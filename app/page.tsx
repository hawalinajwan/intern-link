import Link from 'next/link';

const studentSteps = [
  'Upload CV sekali',
  'Cari lowongan sesuai skill',
  'Pantau status lamaran',
  'Interview lewat chat',
];

const companySteps = [
  'Publikasikan lowongan',
  'Review CV pelamar',
  'Ubah status kandidat',
  'Chat untuk wawancara',
];

const jobs = [
  { role: 'Frontend Developer Intern', company: 'Nusantara Digital', type: 'Hybrid', stipend: 'Rp2,5 jt' },
  { role: 'UI/UX Research Intern', company: 'Karya Labs', type: 'Remote', stipend: 'Rp2 jt' },
  { role: 'Data Analyst Intern', company: 'Sagara Tech', type: 'Onsite', stipend: 'Rp3 jt' },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-[#f7f7fb] text-zinc-950">
      <nav className="border-b border-zinc-200 bg-white/90">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <Link href="/" className="text-lg font-bold tracking-normal text-rose-700">
            intern-link
          </Link>
          <div className="flex items-center gap-2 text-sm font-medium">
            <Link className="hidden rounded-md px-3 py-2 text-zinc-700 hover:bg-zinc-100 sm:inline-flex" href="/mahasiswa/lowongan">
              Lowongan
            </Link>
            <Link className="rounded-md px-3 py-2 text-zinc-700 hover:bg-zinc-100" href="/login">
              Masuk
            </Link>
            <Link className="rounded-md bg-rose-600 px-3 py-2 text-white hover:bg-rose-700" href="/register">
              Daftar
            </Link>
          </div>
        </div>
      </nav>

      <section className="mx-auto grid max-w-6xl items-center gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[1fr_440px] lg:px-8 lg:py-16">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-rose-700">Platform rekrutmen magang</p>
          <h1 className="mt-4 max-w-3xl text-4xl font-bold leading-tight tracking-normal text-zinc-950 sm:text-5xl">
            Hubungkan mahasiswa siap kerja dengan perusahaan yang butuh talenta muda.
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-zinc-650">
            intern-link menyatukan pencarian lowongan, upload CV, tracking lamaran, review HRD, dan chat interview real-time dalam satu alur yang rapi.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link className="rounded-md bg-rose-600 px-5 py-3 text-sm font-semibold text-white hover:bg-rose-700" href="/register">
              Mulai daftar
            </Link>
            <Link className="rounded-md border border-zinc-300 bg-white px-5 py-3 text-sm font-semibold text-zinc-800 hover:bg-zinc-50" href="/mahasiswa/lowongan">
              Lihat lowongan
            </Link>
          </div>
          <div className="mt-8 grid max-w-2xl grid-cols-3 gap-3 text-sm">
            <Metric value="100K+" label="target talenta" />
            <Metric value="3-7 hari" label="rata-rata review" />
            <Metric value="Real-time" label="status & chat" />
          </div>
        </div>

        <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
            <div>
              <p className="text-sm font-semibold text-zinc-950">Lowongan aktif</p>
              <p className="text-xs text-zinc-500">Rekomendasi minggu ini</p>
            </div>
            <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">Live</span>
          </div>

          <div className="mt-4 space-y-3">
            {jobs.map((job) => (
              <article key={job.role} className="rounded-md border border-zinc-200 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-sm font-semibold text-zinc-950">{job.role}</h2>
                    <p className="mt-1 text-sm text-zinc-500">{job.company}</p>
                  </div>
                  <span className="rounded-full bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700">{job.type}</span>
                </div>
                <div className="mt-3 flex items-center justify-between text-xs text-zinc-500">
                  <span>Durasi 3 bulan</span>
                  <span className="font-semibold text-zinc-800">{job.stipend}/bulan</span>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-zinc-200 bg-white">
        <div className="mx-auto grid max-w-6xl gap-6 px-4 py-10 sm:px-6 lg:grid-cols-2 lg:px-8">
          <Workflow title="Untuk mahasiswa" items={studentSteps} href="/mahasiswa/dashboard" />
          <Workflow title="Untuk HRD" items={companySteps} href="/hrd/dashboard" />
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid gap-4 md:grid-cols-3">
          <Feature title="CV aman" body="CV disimpan lewat endpoint autentikasi dan hanya bisa dibuka HRD terkait." />
          <Feature title="Status transparan" body="Lamaran bergerak dari pending, ditinjau, dipanggil, sampai keputusan akhir." />
          <Feature title="Interview cepat" body="Room chat otomatis tersedia saat kandidat dipanggil untuk wawancara." />
        </div>
      </section>
    </main>
  );
}

function Metric({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-md border border-zinc-200 bg-white p-3">
      <p className="text-base font-bold text-zinc-950">{value}</p>
      <p className="mt-1 text-xs text-zinc-500">{label}</p>
    </div>
  );
}

function Workflow({ title, items, href }: { title: string; items: string[]; href: string }) {
  return (
    <article className="rounded-lg border border-zinc-200 p-5">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-lg font-semibold text-zinc-950">{title}</h2>
        <Link className="text-sm font-semibold text-rose-700 hover:text-rose-800" href={href}>
          Dashboard
        </Link>
      </div>
      <ol className="mt-5 grid gap-3">
        {items.map((item, index) => (
          <li key={item} className="flex items-center gap-3 text-sm text-zinc-700">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-zinc-950 text-xs font-bold text-white">
              {index + 1}
            </span>
            {item}
          </li>
        ))}
      </ol>
    </article>
  );
}

function Feature({ title, body }: { title: string; body: string }) {
  return (
    <article className="rounded-lg border border-zinc-200 bg-white p-5">
      <h2 className="text-base font-semibold text-zinc-950">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-zinc-600">{body}</p>
    </article>
  );
}
