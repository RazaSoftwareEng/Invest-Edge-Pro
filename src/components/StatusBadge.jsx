import { CheckCircle2, Clock, XCircle } from 'lucide-react';

const STYLES = {
  pending: { cls: 'bg-amber-100 text-amber-800 ring-amber-300', icon: Clock, label: 'Pending' },
  approved: { cls: 'bg-emerald-100 text-emerald-800 ring-emerald-300', icon: CheckCircle2, label: 'Approved' },
  paid: { cls: 'bg-emerald-100 text-emerald-800 ring-emerald-300', icon: CheckCircle2, label: 'Paid' },
  rejected: { cls: 'bg-red-100 text-red-700 ring-red-300', icon: XCircle, label: 'Rejected' },
};

export default function StatusBadge({ status }) {
  const s = STYLES[status] ?? STYLES.pending;
  const Icon = s.icon;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1 ${s.cls}`}>
      <Icon className="h-3 w-3" />
      {s.label}
    </span>
  );
}
