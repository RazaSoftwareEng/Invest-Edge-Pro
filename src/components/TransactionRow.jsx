import { ArrowDownLeft, ArrowUpRight, RotateCcw, ShoppingBag, SlidersHorizontal } from 'lucide-react';
import { formatDateTime, formatSignedRs } from '../lib/format';
import StatusBadge from './StatusBadge';

const META = {
  deposit: { icon: ArrowDownLeft, label: 'Deposit', iconCls: 'bg-emerald-100 text-emerald-700' },
  purchase: { icon: ShoppingBag, label: 'Plan Purchase', iconCls: 'bg-gold-100 text-maroon-700' },
  withdrawal: { icon: ArrowUpRight, label: 'Withdrawal', iconCls: 'bg-red-100 text-red-700' },
  refund: { icon: RotateCcw, label: 'Refund', iconCls: 'bg-sky-100 text-sky-700' },
  adjustment: { icon: SlidersHorizontal, label: 'Adjustment', iconCls: 'bg-violet-100 text-violet-700' },
};

/**
 * `showUser` prints the owner's @username (admin views; expects txn.user.username).
 * Optional `txn.status` shows a Pending/Approved/Paid/Rejected badge;
 * `txn.isRequest` marks a deposit request that has not moved money yet.
 */
export default function TransactionRow({ txn, showUser = false }) {
  const meta = META[txn.type] ?? META.deposit;
  const Icon = meta.icon;
  const amount = Number(txn.amount);

  return (
    <li className="flex items-center gap-3 py-3">
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ring-1 ring-gold-400/50 ${meta.iconCls}`}>
        <Icon className="h-[18px] w-[18px]" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-maroon-900">
          {meta.label}
          {showUser && <span className="ml-1.5 text-xs font-semibold text-maroon-600">@{txn.user?.username ?? 'deleted'}</span>}
        </p>
        {txn.note && <p className="truncate text-xs text-maroon-800/65">{txn.note}</p>}
        <p className="text-[11px] text-maroon-800/50">{formatDateTime(txn.created_at)}</p>
      </div>
      <div className="flex flex-col items-end gap-1 text-right">
        <p
          className={`text-sm font-bold ${
            txn.isRequest
              ? txn.status === 'rejected'
                ? 'text-maroon-800/40 line-through'
                : 'text-amber-700'
              : amount >= 0
                ? 'text-emerald-700'
                : 'text-red-600'
          }`}
        >
          {formatSignedRs(amount)}
        </p>
        {txn.status && <StatusBadge status={txn.status} />}
        {txn.balance_after != null && (
          <p className="text-[10px] text-maroon-800/50">Bal: Rs {Number(txn.balance_after).toLocaleString('en-PK')}</p>
        )}
      </div>
    </li>
  );
}
