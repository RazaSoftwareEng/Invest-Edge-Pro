import { useCallback, useEffect, useState } from 'react';
import { Check, RefreshCw, X } from 'lucide-react';
import { supabase, friendlyDbError } from '../../lib/supabase';
import { formatDateTime, formatRs, methodName } from '../../lib/format';
import StatusBadge from '../../components/StatusBadge';
import PageHeader from '../../components/PageHeader';
import EmptyState from '../../components/EmptyState';
import Notice from '../../components/Notice';
import CopyField from '../../components/CopyField';
import { CardLoader } from '../../components/Spinner';
import StatusFilter from './StatusFilter';
import ActionModal from './ActionModal';

const STATUSES = ['pending', 'paid', 'rejected', 'all'];

export default function AdminWithdrawals() {
  const [status, setStatus] = useState('pending');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [action, setAction] = useState(null); // { kind: 'approve' | 'reject', row }

  const load = useCallback(async () => {
    setLoading(true);
    let q = supabase
      .from('withdrawals')
      .select('*, user:profiles!withdrawals_user_id_fkey(username, phone)')
      .order('created_at', { ascending: status === 'pending' })
      .limit(200);
    if (status !== 'all') q = q.eq('status', status);
    const { data, error: err } = await q;
    setError(err ? friendlyDbError(err) : '');
    setRows(data ?? []);
    setLoading(false);
  }, [status]);

  useEffect(() => {
    load();
  }, [load]);

  async function runAction(note) {
    const { kind, row } = action;
    const { error: err } = await supabase.rpc('process_withdrawal', {
      p_withdrawal_id: row.id,
      p_approve: kind === 'approve',
      p_note: note || null,
    });
    if (err) return friendlyDbError(err);
    setAction(null);
    setSuccess(
      kind === 'approve'
        ? `Marked ${formatRs(row.amount)} to @${row.user?.username} as paid.`
        : `Rejected and refunded ${formatRs(row.amount)} to @${row.user?.username}.`,
    );
    load();
    return null;
  }

  return (
    <div>
      <PageHeader title="Withdrawals" subtitle="Pay out or reject & refund" />
      <div className="flex items-center justify-between">
        <StatusFilter options={STATUSES} value={status} onChange={setStatus} />
        <button type="button" onClick={load} className="mb-4 ml-2 rounded-full p-2 text-gold-200 hover:bg-maroon-800" aria-label="Refresh">
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>

      <div className="space-y-3">
        <Notice type="success" message={success} onClose={() => setSuccess('')} />
        <Notice type="error" message={error} />

        {loading ? (
          <div className="card">
            <CardLoader />
          </div>
        ) : rows.length === 0 ? (
          <div className="card">
            <EmptyState title={`No ${status === 'all' ? '' : status} withdrawals`} />
          </div>
        ) : (
          rows.map((w) => (
            <article key={w.id} className="card p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-display text-xl font-bold text-maroon-900">{formatRs(w.amount)}</p>
                  <p className="text-sm font-semibold text-maroon-800">
                    @{w.user?.username ?? 'unknown'}{' '}
                    {w.user?.phone && <span className="font-normal text-maroon-800/60">· {w.user.phone}</span>}
                  </p>
                  <p className="text-[11px] text-maroon-800/55">{formatDateTime(w.created_at)}</p>
                </div>
                <StatusBadge status={w.status} />
              </div>

              <div className="mt-2 rounded-2xl bg-white/70 px-3 py-2 text-sm">
                <CopyField label="Method" value={methodName(w.method) + (w.bank_name ? ` — ${w.bank_name}` : '')} />
                <CopyField label="Account Number" value={w.account_number} />
                <CopyField label="Account Holder" value={w.account_name} />
              </div>
              {w.admin_note && <p className="mt-2 text-xs text-maroon-800/80">Note: {w.admin_note}</p>}

              {w.status === 'pending' && (
                <div className="mt-3 flex gap-2">
                  <button type="button" className="btn-success flex-1 py-2" onClick={() => setAction({ kind: 'approve', row: w })}>
                    <Check className="h-4 w-4" /> Mark Paid
                  </button>
                  <button type="button" className="btn-danger flex-1 py-2" onClick={() => setAction({ kind: 'reject', row: w })}>
                    <X className="h-4 w-4" /> Reject &amp; Refund
                  </button>
                </div>
              )}
            </article>
          ))
        )}
      </div>

      <ActionModal
        open={Boolean(action)}
        title={action?.kind === 'approve' ? 'Mark as Paid' : 'Reject Withdrawal'}
        confirmLabel={action?.kind === 'approve' ? 'Mark Paid' : 'Reject & Refund'}
        danger={action?.kind === 'reject'}
        withNote
        onClose={() => setAction(null)}
        onConfirm={runAction}
        description={
          action && (
            <p className="text-sm text-maroon-900/85">
              {action.kind === 'approve' ? (
                <>
                  Confirm you have sent <b>{formatRs(action.row.amount)}</b> to <b>{action.row.account_name}</b> (
                  {methodName(action.row.method)} {action.row.account_number}).
                </>
              ) : (
                <>
                  Reject this request and refund <b>{formatRs(action.row.amount)}</b> to <b>@{action.row.user?.username}</b>&apos;s
                  wallet?
                </>
              )}
            </p>
          )
        }
      />
    </div>
  );
}
