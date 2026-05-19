'use client';

import axios from 'axios';
import { useEffect, useState } from 'react';
import api from '@/lib/api';

type CVModalProps = {
  mahasiswaUserId: number | null;
  isOpen: boolean;
  onClose: () => void;
};

export function CVModal({ mahasiswaUserId, isOpen, onClose }: CVModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !mahasiswaUserId) return;

    let isCancelled = false;
    let objectUrl: string | null = null;

    async function fetchPdf() {
      setIsLoading(true);
      setError('');

      try {
        const response = await api.get(`/hrd/cv/${mahasiswaUserId}`, {
          responseType: 'blob',
          headers: { 'X-Skip-NotFound-Redirect': '1' },
        });

        if (isCancelled) return;

        objectUrl = URL.createObjectURL(response.data);
        setUrl(objectUrl);
      } catch (requestError) {
        if (isCancelled) return;

        const backendMessage = axios.isAxiosError(requestError)
          ? requestError.response?.data?.message || requestError.response?.data?.error
          : null;
        setError(typeof backendMessage === 'string' ? backendMessage : 'Gagal memuat CV.');
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    }

    fetchPdf();

    return () => {
      isCancelled = true;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
      setUrl(null);
    };
  }, [isOpen, mahasiswaUserId]);

  if (!isOpen) return null;

  function handleClose() {
    if (url) {
      URL.revokeObjectURL(url);
    }
    setUrl(null);
    setError('');
    onClose();
  }

  function handleDownload() {
    if (!url) return;

    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'cv.pdf';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
      <div className="w-full max-w-5xl rounded-lg bg-white shadow-xl">
        <div className="flex items-center justify-between gap-4 border-b border-slate-200 px-5 py-4">
          <div>
            <p className="text-sm text-slate-500">Preview CV</p>
            <h2 className="text-lg font-semibold text-slate-950">Dokumen kandidat</h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDownload}
              disabled={!url}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Download
            </button>
            <button
              type="button"
              onClick={handleClose}
              className="rounded-md px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100"
            >
              Tutup
            </button>
          </div>
        </div>

        <div className="px-5 py-5">
          {isLoading ? (
            <div className="h-[80vh] animate-pulse rounded-lg bg-slate-100" />
          ) : error ? (
            <div className="flex h-[80vh] items-center justify-center rounded-lg border border-red-200 bg-red-50 px-6 text-center text-sm text-red-700">
              {error}
            </div>
          ) : url ? (
            <iframe src={url} className="h-[80vh] w-full rounded-lg border border-slate-200" title="CV Preview" />
          ) : (
            <div className="flex h-[80vh] items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-sm text-slate-600">
              Tidak ada dokumen untuk ditampilkan.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
