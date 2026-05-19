import api from '@/lib/api';

export type LowonganSummary = {
  id: number;
  judul: string;
  status: 'aktif' | 'ditutup';
  lamaran_count: {
    total: number;
    dipanggil: number;
  };
};

type LowonganResponse = {
  data: LowonganSummary[];
};

type PelamarItem = {
  lamaran_id: number;
  status: 'pending' | 'ditinjau' | 'dipanggil' | 'diterima' | 'ditolak';
  chat_room_id: string | null;
  created_at: string;
  mahasiswa: {
    nama: string | null;
    universitas: string | null;
  };
};

type PelamarResponse = {
  success: boolean;
  data: PelamarItem[];
};

export type ActiveInterviewItem = {
  roomId: string;
  lamaranId: number;
  lowonganId: number;
  lowonganTitle: string;
  kandidatNama: string;
  universitas: string | null;
  createdAt: string;
};

export async function loadActiveInterviews(): Promise<ActiveInterviewItem[]> {
  const lowonganResponse = await api.get<LowonganResponse>('/hrd/lowongan');
  const lowongan = lowonganResponse.data.data || [];

  const applicantResponses = await Promise.all(
    lowongan
      .filter((item) => item.lamaran_count.dipanggil > 0)
      .map(async (item) => {
        const response = await api.get<PelamarResponse>(`/hrd/lowongan/${item.id}/pelamar`, {
          headers: { 'X-Skip-NotFound-Redirect': '1' },
        });
        return { item, applicants: response.data.data || [] };
      })
  );

  return applicantResponses
    .flatMap(({ item, applicants }) =>
      applicants
        .filter((applicant) => applicant.status === 'dipanggil' && applicant.chat_room_id)
        .map((applicant) => ({
          roomId: applicant.chat_room_id as string,
          lamaranId: applicant.lamaran_id,
          lowonganId: item.id,
          lowonganTitle: item.judul,
          kandidatNama: applicant.mahasiswa.nama || 'Mahasiswa',
          universitas: applicant.mahasiswa.universitas || null,
          createdAt: applicant.created_at,
        }))
    )
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}
