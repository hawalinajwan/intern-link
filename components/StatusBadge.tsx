type Status = 'pending' | 'ditinjau' | 'dipanggil' | 'diterima' | 'ditolak';

const badgeStyles: Record<Status, string> = {
  pending: 'bg-slate-100 text-slate-700 ring-slate-200',
  ditinjau: 'bg-blue-50 text-blue-700 ring-blue-200',
  dipanggil: 'bg-yellow-50 text-yellow-800 ring-yellow-200',
  diterima: 'bg-green-50 text-green-700 ring-green-200',
  ditolak: 'bg-red-50 text-red-700 ring-red-200',
};

const labels: Record<Status, string> = {
  pending: 'Pending',
  ditinjau: 'Ditinjau',
  dipanggil: 'Dipanggil',
  diterima: 'Diterima',
  ditolak: 'Ditolak',
};

export function StatusBadge({ status }: { status: Status }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${badgeStyles[status]}`}>
      {labels[status]}
    </span>
  );
}
