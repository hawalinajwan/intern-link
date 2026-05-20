import Image from 'next/image';
import Link from 'next/link';

const featuredJobs = [
  {
    title: 'Frontend Engineer Intern',
    company: 'Nusantara Digital',
    type: 'Hybrid',
    duration: '3 bulan',
    stipend: 'Rp2,5 juta / bulan',
    summary: 'Bangun antarmuka produk consumer dan internal tools dengan mentoring langsung dari tim engineering.',
    skills: ['React', 'TypeScript', 'Design Systems'],
  },
  {
    title: 'Product Operations Intern',
    company: 'Karya Labs',
    type: 'Remote',
    duration: '4 bulan',
    stipend: 'Rp2 juta / bulan',
    summary: 'Kelola ritme operasi rekrutmen, data kandidat, dan koordinasi lintas tim untuk proses seleksi yang rapi.',
    skills: ['Operations', 'Spreadsheet', 'Communication'],
  },
  {
    title: 'Data Analyst Intern',
    company: 'Sagara Tech',
    type: 'Onsite',
    duration: '6 bulan',
    stipend: 'Rp3 juta / bulan',
    summary: 'Bantu tim bisnis membaca funnel kandidat, kualitas hiring, dan waktu respons interview secara real-time.',
    skills: ['SQL', 'Python', 'Dashboarding'],
  },
];

const partnerCompanies = ['Mekari Group', 'Sagara Tech', 'Nusantara Digital', 'Karya Labs', 'Langit Start', 'Arunika Studio'];

const studentJourney = [
  'Lengkapi profil kampus, jurusan, semester, dan skill supaya HRD langsung paham konteksmu.',
  'Upload CV PDF sekali, lalu pakai untuk apply ke banyak lowongan tanpa ribet upload ulang.',
  'Pantau status dari pending sampai keputusan akhir dengan chat interview real-time saat dipanggil.',
];

const hrdJourney = [
  'Publikasikan lowongan dengan requirement yang rapi, durasi, kuota, dan batas lamaran yang jelas.',
  'Review pelamar dari satu dashboard, buka CV langsung di browser, dan tulis catatan internal per kandidat.',
  'Ubah status ke ditinjau, dipanggil, diterima, atau ditolak sambil menjaga komunikasi tetap terpusat.',
];

const testimonials = [
  {
    quote:
      'Akhirnya ada flow magang yang terasa profesional. Kandidat tidak bingung, HRD juga tidak harus pindah-pindah tools.',
    name: 'Nadia Putri',
    role: 'Talent Acquisition, Sagara Tech',
  },
  {
    quote:
      'Buat mahasiswa, yang paling terasa itu statusnya jelas. Kita tahu kapan CV dibuka, kapan dipanggil, dan kapan harus lanjut.',
    name: 'Rafi Pratama',
    role: 'Mahasiswa Sistem Informasi',
  },
];

export default function Home() {
  return (
    <main className="bg-white text-slate-950">
      <section className="relative isolate min-h-[calc(100vh-4rem)] overflow-hidden bg-slate-950">
        <Image
          src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=1600&q=80"
          alt="Mahasiswa dan mentor berdiskusi dalam sesi kerja kolaboratif."
          fill
          priority
          className="object-cover object-center"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950/88 via-slate-950/72 to-slate-950/45" />
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-slate-950 to-transparent" />

        <div className="relative mx-auto flex min-h-[calc(100vh-4rem)] max-w-6xl items-end px-4 pb-16 pt-28 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-rose-200">
              Platform rekrutmen magang modern
            </p>
            <h1 className="mt-5 text-4xl font-semibold leading-tight text-white sm:text-5xl lg:text-6xl">
              Magang terasa jelas, cepat, dan manusiawi dari klik pertama.
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-8 text-slate-200 sm:text-lg">
              intern-link menyatukan lowongan, CV, status lamaran, review HRD, dan chat wawancara ke dalam satu
              pengalaman yang rapi. Mahasiswa bergerak lebih percaya diri, HRD bergerak lebih cepat.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/auth/register"
                className="rounded-md bg-rose-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-rose-400"
              >
                Mulai daftar
              </Link>
              <Link
                href="/mahasiswa/lowongan"
                className="rounded-md border border-white/20 bg-white/10 px-5 py-3 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/15"
              >
                Cari lowongan
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="relative z-10 -mt-16 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-6xl gap-4 rounded-lg border border-slate-200 bg-white p-5 shadow-[0_24px_60px_-32px_rgba(15,23,42,0.35)] sm:grid-cols-3 sm:p-6">
          <Stat value="100K+" label="target talenta kampus untuk ekspansi ekosistem" />
          <Stat value="3-7 hari" label="rata-rata rentang review sebelum kandidat dipanggil" />
          <Stat value="Real-time" label="status dan chat interview tanpa pindah tool lain" />
        </div>
      </section>

      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
          <p className="text-center text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
            Digunakan oleh tim yang ingin proses magang lebih rapi
          </p>
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {partnerCompanies.map((company) => (
              <div
                key={company}
                className="flex min-h-16 items-center justify-center rounded-md border border-slate-200 bg-slate-50 px-4 text-center text-sm font-semibold text-slate-700"
              >
                {company}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#fffaf7]">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-rose-600">Lowongan pilihan</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
                Halaman publik yang terasa hangat, tapi tetap padat dan bisa dipakai kerja.
              </h2>
              <p className="mt-4 text-sm leading-7 text-slate-600 sm:text-base">
                Aku sengaja dorong `intern-link` ke arah portal rekrutmen yang lebih editorial: CTA jelas, lowongan
                langsung terlihat, dan value produk kebaca sebelum pengguna masuk terlalu dalam.
              </p>
            </div>
            <Link
              href="/mahasiswa/lowongan"
              className="inline-flex rounded-md border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 transition hover:bg-slate-50"
            >
              Jelajahi semua lowongan
            </Link>
          </div>

          <div className="mt-8 grid gap-4 lg:grid-cols-3">
            {featuredJobs.map((job) => (
              <article
                key={job.title}
                className="flex h-full flex-col rounded-lg border border-slate-200 bg-white p-5 shadow-[0_18px_40px_-28px_rgba(15,23,42,0.35)]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-950">{job.title}</p>
                    <p className="mt-1 text-sm text-slate-500">{job.company}</p>
                  </div>
                  <span className="rounded-full bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700">
                    {job.type}
                  </span>
                </div>

                <p className="mt-4 text-sm leading-7 text-slate-600">{job.summary}</p>

                <div className="mt-5 flex flex-wrap gap-2">
                  {job.skills.map((skill) => (
                    <span
                      key={skill}
                      className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-600"
                    >
                      {skill}
                    </span>
                  ))}
                </div>

                <div className="mt-6 grid grid-cols-2 gap-3 border-t border-slate-100 pt-4 text-sm">
                  <div>
                    <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Durasi</p>
                    <p className="mt-1 font-semibold text-slate-900">{job.duration}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Uang saku</p>
                    <p className="mt-1 font-semibold text-slate-900">{job.stipend}</p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white">
        <div className="mx-auto grid max-w-6xl gap-6 px-4 py-14 sm:px-6 lg:grid-cols-2 lg:px-8">
          <JourneyPanel
            eyebrow="Untuk mahasiswa"
            title="Dari upload CV sampai interview, semuanya terasa satu alur."
            items={studentJourney}
            href="/mahasiswa/dashboard"
            actionLabel="Masuk dashboard mahasiswa"
          />
          <JourneyPanel
            eyebrow="Untuk HRD"
            title="Kelola lowongan dan review kandidat tanpa pindah-pindah alat."
            items={hrdJourney}
            href="/hrd/dashboard"
            actionLabel="Masuk dashboard HRD"
          />
        </div>
      </section>

      <section className="border-y border-slate-200 bg-slate-950">
        <div className="mx-auto max-w-6xl px-4 py-14 text-white sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-rose-200">Kenapa terasa lebih matang</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight">Bukan cuma cantik, tapi menenangkan alur kerja.</h2>
          </div>

          <div className="mt-8 grid gap-4 lg:grid-cols-2">
            {testimonials.map((item) => (
              <article key={item.name} className="rounded-lg border border-white/10 bg-white/5 p-5 backdrop-blur">
                <p className="text-base leading-8 text-slate-100">“{item.quote}”</p>
                <div className="mt-5 border-t border-white/10 pt-4">
                  <p className="font-semibold">{item.name}</p>
                  <p className="text-sm text-slate-300">{item.role}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-md bg-white p-3 sm:p-4">
      <p className="text-2xl font-semibold tracking-tight text-slate-950">{value}</p>
      <p className="mt-2 text-sm leading-6 text-slate-600">{label}</p>
    </div>
  );
}

function JourneyPanel({
  eyebrow,
  title,
  items,
  href,
  actionLabel,
}: {
  eyebrow: string;
  title: string;
  items: string[];
  href: string;
  actionLabel: string;
}) {
  return (
    <article className="rounded-lg border border-slate-200 bg-slate-50 p-6">
      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-rose-600">{eyebrow}</p>
      <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">{title}</h2>
      <ol className="mt-6 grid gap-4">
        {items.map((item, index) => (
          <li key={item} className="flex gap-4">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-950 text-sm font-semibold text-white">
              {index + 1}
            </span>
            <p className="pt-1 text-sm leading-7 text-slate-600">{item}</p>
          </li>
        ))}
      </ol>
      <Link
        href={href}
        className="mt-8 inline-flex rounded-md bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
      >
        {actionLabel}
      </Link>
    </article>
  );
}
