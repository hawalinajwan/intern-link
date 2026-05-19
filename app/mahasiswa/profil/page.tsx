'use client';

import axios from 'axios';
import { ChangeEvent, DragEvent, FormEvent, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { getRole, isLoggedIn, setStoredProfile } from '@/lib/auth';

type Profile = {
  user_id: number;
  nama: string | null;
  universitas: string | null;
  jurusan: string | null;
  semester: number | null;
  bio: string | null;
  skills: string[];
  cv_filename: string | null;
  cv_original_name: string | null;
  cv_uploaded_at: string | null;
};

type ProfileResponse = {
  success: boolean;
  data: Profile;
  error?: string;
};

type UploadResponse = {
  success: boolean;
  data: {
    filename: string;
    original_name: string;
    uploaded_at: string;
  };
  error?: string;
};

const MAX_CV_SIZE = 5 * 1024 * 1024;

export default function MahasiswaProfilPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [nama, setNama] = useState('');
  const [universitas, setUniversitas] = useState('');
  const [jurusan, setJurusan] = useState('');
  const [semester, setSemester] = useState('');
  const [bio, setBio] = useState('');
  const [skills, setSkills] = useState('');
  const [cv, setCv] = useState<Pick<Profile, 'cv_filename' | 'cv_original_name' | 'cv_uploaded_at'>>({
    cv_filename: null,
    cv_original_name: null,
    cv_uploaded_at: null,
  });
  const [showUploadZone, setShowUploadZone] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [formError, setFormError] = useState('');
  const [uploadError, setUploadError] = useState('');
  const [toast, setToast] = useState('');

  const hasCv = Boolean(cv.cv_filename && !showUploadZone);

  useEffect(() => {
    if (!isLoggedIn() || getRole() !== 'mahasiswa') {
      router.replace('/auth/login');
      return;
    }

    setIsCheckingAuth(false);
  }, [router]);

  useEffect(() => {
    if (isCheckingAuth) return;

    async function fetchProfile() {
      setIsLoading(true);
      setFormError('');

      try {
        const response = await api.get<ProfileResponse>('/mahasiswa/profil');
        const profile = response.data.data;

        setNama(profile.nama || '');
        setUniversitas(profile.universitas || '');
        setJurusan(profile.jurusan || '');
        setSemester(profile.semester ? String(profile.semester) : '');
        setBio(profile.bio || '');
        setSkills((profile.skills || []).join(', '));
        setCv({
          cv_filename: profile.cv_filename,
          cv_original_name: profile.cv_original_name,
          cv_uploaded_at: profile.cv_uploaded_at,
        });
        setStoredProfile(profile);
        setShowUploadZone(!profile.cv_filename);
      } catch (error) {
        if (!axios.isAxiosError(error) || error.response?.status !== 401) {
          setFormError('Gagal memuat profil.');
        }
      } finally {
        setIsLoading(false);
      }
    }

    fetchProfile();
  }, [isCheckingAuth]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(''), 2600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError('');

    const semesterNumber = semester === '' ? null : Number(semester);
    if (semesterNumber !== null && (!Number.isInteger(semesterNumber) || semesterNumber < 1 || semesterNumber > 14)) {
      setFormError('Semester harus di antara 1 sampai 14.');
      return;
    }

    setIsSaving(true);

    try {
      await api.put('/mahasiswa/profil', {
        nama,
        universitas,
        jurusan,
        semester: semesterNumber,
        bio,
        skills: parseSkills(skills),
      });
      setStoredProfile({
        nama,
        universitas,
        jurusan,
        semester: semesterNumber,
        bio,
        skills: parseSkills(skills),
        cv_filename: cv.cv_filename,
        cv_original_name: cv.cv_original_name,
        cv_uploaded_at: cv.cv_uploaded_at,
      });
      setToast('Profil berhasil disimpan.');
    } catch (error) {
      const message = axios.isAxiosError(error)
        ? error.response?.data?.error || error.response?.data?.message
        : null;
      setFormError(typeof message === 'string' ? message : 'Gagal menyimpan profil.');
    } finally {
      setIsSaving(false);
    }
  }

  function handleFileInput(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) uploadCv(file);
    event.target.value = '';
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(false);
    const file = event.dataTransfer.files?.[0];
    if (file) uploadCv(file);
  }

  async function uploadCv(file: File) {
    setUploadError('');

    if (file.type !== 'application/pdf') {
      setUploadError('CV harus berupa file PDF.');
      return;
    }

    if (file.size > MAX_CV_SIZE) {
      setUploadError('Ukuran CV maksimal 5MB.');
      return;
    }

    const formData = new FormData();
    formData.append('cv', file);
    setIsUploading(true);
    setUploadProgress(0);

    try {
      const response = await api.post<UploadResponse>('/mahasiswa/cv/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (event) => {
          if (!event.total) return;
          setUploadProgress(Math.round((event.loaded * 100) / event.total));
        },
      });

      setCv({
        cv_filename: response.data.data.filename,
        cv_original_name: response.data.data.original_name,
        cv_uploaded_at: response.data.data.uploaded_at,
      });
      setShowUploadZone(false);
      setToast('CV berhasil diupload.');
    } catch (error) {
      const message = axios.isAxiosError(error)
        ? error.response?.data?.error || error.response?.data?.message
        : null;
      setUploadError(typeof message === 'string' ? message : 'Upload CV gagal.');
    } finally {
      setIsUploading(false);
    }
  }

  async function downloadCv() {
    setUploadError('');

    try {
      const response = await api.get<Blob>('/mahasiswa/cv/download', { responseType: 'blob' });
      const url = window.URL.createObjectURL(response.data);
      const link = document.createElement('a');
      link.href = url;
      link.download = cv.cv_original_name || 'cv.pdf';
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      const message = axios.isAxiosError(error)
        ? error.response?.data?.error || error.response?.data?.message
        : null;
      setUploadError(typeof message === 'string' ? message : 'Gagal download CV.');
    }
  }

  if (isCheckingAuth || isLoading) {
    return (
      <section className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6">
        <div className="h-8 w-48 animate-pulse rounded bg-slate-200" />
        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
          <div className="h-96 animate-pulse rounded-lg bg-white" />
          <div className="h-64 animate-pulse rounded-lg bg-white" />
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:py-10">
      <div className="mb-6">
        <p className="text-sm font-medium text-slate-500">Profil mahasiswa</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-950">Lengkapi Profil dan CV</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Data ini membantu HRD memahami latar belakang akademik, skill, dan dokumen CV kamu.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <form onSubmit={saveProfile} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-950">Data Profil</h2>

          {formError ? <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{formError}</p> : null}

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <TextField label="Nama" value={nama} onChange={setNama} />
            <TextField label="Universitas" value={universitas} onChange={setUniversitas} />
            <TextField label="Jurusan" value={jurusan} onChange={setJurusan} />
            <TextField
              label="Semester"
              value={semester}
              onChange={setSemester}
              type="number"
              min={1}
              max={14}
            />
          </div>

          <div className="mt-4">
            <label htmlFor="skills" className="block text-sm font-medium text-slate-800">
              Skills
            </label>
            <input
              id="skills"
              value={skills}
              onChange={(event) => setSkills(event.target.value)}
              placeholder="React, PHP, MySQL"
              className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-slate-950 focus:ring-2 focus:ring-slate-200"
            />
            <p className="mt-1 text-xs text-slate-500">Pisahkan skill dengan koma.</p>
          </div>

          <div className="mt-4">
            <label htmlFor="bio" className="block text-sm font-medium text-slate-800">
              Bio
            </label>
            <textarea
              id="bio"
              value={bio}
              onChange={(event) => setBio(event.target.value)}
              rows={5}
              className="mt-2 w-full resize-none rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-slate-950 focus:ring-2 focus:ring-slate-200"
            />
          </div>

          <button
            type="submit"
            disabled={isSaving}
            className="mt-5 rounded-md bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            {isSaving ? 'Menyimpan...' : 'Simpan Profil'}
          </button>
        </form>

        <aside className="h-fit rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-950">CV</h2>
          <p className="mt-1 text-sm text-slate-600">Upload PDF maksimal 5MB.</p>

          {uploadError ? <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{uploadError}</p> : null}

          {hasCv ? (
            <div className="mt-5 rounded-lg border border-slate-200 p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-red-50 text-sm font-semibold text-red-700">
                  PDF
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-950">{cv.cv_original_name || 'cv.pdf'}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    Upload {cv.cv_uploaded_at ? formatIndonesianDate(cv.cv_uploaded_at) : '-'}
                  </p>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={downloadCv}
                  className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Download
                </button>
                <button
                  type="button"
                  onClick={() => setShowUploadZone(true)}
                  className="rounded-md bg-slate-950 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800"
                >
                  Ganti CV
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-5">
              <div
                onDragOver={(event) => {
                  event.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`flex min-h-44 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed px-4 text-center transition ${
                  isDragging ? 'border-slate-950 bg-slate-50' : 'border-slate-300 hover:bg-slate-50'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/pdf"
                  onChange={handleFileInput}
                  className="sr-only"
                />
                <svg className="h-9 w-9 text-slate-400" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path
                    d="M12 15V4m0 0 4 4m-4-4L8 8M5 15v3a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-3"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <p className="mt-3 text-sm font-medium text-slate-800">Drag PDF di sini atau klik untuk pilih</p>
              </div>

              {isUploading ? (
                <div className="mt-4">
                  <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full bg-slate-950 transition-all" style={{ width: `${uploadProgress}%` }} />
                  </div>
                  <p className="mt-1 text-xs text-slate-500">{uploadProgress}%</p>
                </div>
              ) : null}
            </div>
          )}
        </aside>
      </div>

      {toast ? (
        <div className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2 rounded-md bg-slate-950 px-4 py-3 text-sm font-medium text-white shadow-lg">
          {toast}
        </div>
      ) : null}
    </section>
  );
}

function TextField({
  label,
  value,
  onChange,
  type = 'text',
  min,
  max,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  min?: number;
  max?: number;
}) {
  const id = label.toLowerCase().replace(/\s+/g, '-');

  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-slate-800">
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        min={min}
        max={max}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-slate-950 focus:ring-2 focus:ring-slate-200"
      />
    </div>
  );
}

function parseSkills(value: string): string[] {
  return value
    .split(',')
    .map((skill) => skill.trim())
    .filter(Boolean);
}

function formatIndonesianDate(value: string): string {
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(value));
}
