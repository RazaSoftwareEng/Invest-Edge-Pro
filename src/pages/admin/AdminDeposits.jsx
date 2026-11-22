import { useCallback, useEffect, useState } from 'react';
import { Check, ExternalLink, ImageIcon, RefreshCw, X } from 'lucide-react';
import { supabase, friendlyDbError } from '../../lib/supabase';
import { formatDateTime, formatRs, methodName } from '../../lib/format';
import StatusBadge from '../../components/StatusBadge';
import PageHeader from '../../components/PageHeader';
import EmptyState from '../../components/EmptyState';
import Modal from '../../components/Modal';
import Notice from '../../components/Notice';
import { CardLoader, Spinner } from '../../components/Spinner';
import StatusFilter from './StatusFilter';
import ActionModal from './ActionModal';

const STATUSES = ['pending', 'approved', 'rejected', 'all'];

export default function AdminDeposits() {
  const [status, setStatus] = useState('pending');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [proof, setProof] = useState({ open: false, url: '', loading: false, error: '' });
  const [action, setAction] = useState(null); // { kind: 'approve' | 'reject', row }

  const load = useCallback(async () => {
    setLoading(true);
    let q = supabase
      .from('deposits')
      .select('*, user:profiles!deposits_user_id_fkey(username, phone)')
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

  async function viewProof(row) {
    setProof({ open: true, url: '', loading: true, error: '' });
    if (!row.proof_path) {
      setProof({ open: true, url: '', loading: false, error: 'No screenshot was uploaded.' });
      return;
    }
    const { data, error: err } = await supabase.storage.from('proofs').createSignedUrl(row.proof_path, 60 * 10);
    setProof({ open: true, url: data?.signedUrl ?? '', loading: false, error: err ? err.message : '' });
  }

  async function runAction(note) {
    const { kind, row } = action;
    const { error: err } =
      kind === 'approve'
        ? await supabase.rpc('approve_deposit', { p_deposit_id: row.id })
        : await supabase.rpc('reject_deposit', { p_deposit_id: row.id, p_note: note || null });
    if (err) return friendlyDbError(err);
    setAction(null);
    setSuccess(
      kind === 'approve'
        ? `Approved ${formatRs(row.amount)} for @${row.user?.username}. Balance credited.`
        : `Rejected deposit of ${formatRs(row.amount)} from @${row.user?.username}.`,
    );
    load();
    return null;
  }

  return (
    <div>
      <PageHeader title="Deposits" subtitle="Verify payment proofs and credit wallets" />
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
            <EmptyState title={`No ${status === 'all' ? '' : status} deposits`} />
          </div>
        ) : (
          rows.map((d) => (
            <article key={d.id} className="card p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-display text-xl font-bold text-maroon-900">{formatRs(d.amount)}</p>
                  <p className="text-sm font-semibold text-maroon-800">
                    @{d.user?.username ?? 'unknown'}{' '}
                    {d.user?.phone && <span className="font-normal text-maroon-800/60">· {d.user.phone}</span>}
                  </p>
                </div>
                <StatusBadge status={d.status} />
              </div>
              <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 rounded-2xl bg-white/70 p-3 text-xs">
                <span className="text-maroon-800/60">Method</span>
                <span className="text-right font-semibold text-maroon-900">{methodName(d.method)}</span>
                <span className="text-maroon-800/60">Transaction ID</span>
                <span className="break-all text-right font-semibold text-maroon-900">{d.transaction_id}</span>
                <span className="text-maroon-800/60">Submitted</span>
                <span className="text-right text-maroon-900">{formatDateTime(d.created_at)}</span>
                {d.processed_at && (
                  <>
                    <span className="text-maroon-800/60">Processed</span>
                    <span className="text-right text-maroon-900">{formatDateTime(d.processed_at)}</span>
                  </>
                )}
              </div>
              {d.admin_note && <p className="mt-2 text-xs text-red-700">Note: {d.admin_note}</p>}

              <div className="mt-3 flex flex-wrap gap-2">
                <button type="button" className="btn-outline flex-1 py-2" onClick={() => viewProof(d)}>
                  <ImageIcon className="h-4 w-4" /> Proof
                </button>
                {d.status === 'pending' && (
                  <>
                    <button type="button" className="btn-success flex-1 py-2" onClick={() => setAction({ kind: 'approve', row: d })}>
                      <Check className="h-4 w-4" /> Approve
                    </button>
                    <button type="button" className="btn-danger flex-1 py-2" onClick={() => setAction({ kind: 'reject', row: d })}>
                      <X className="h-4 w-4" /> Reject
                    </button>
                  </>
                )}
              </div>
            </article>
          ))
        )}
      </div>

      <Modal open={proof.open} onClose={() => setProof((p) => ({ ...p, open: false }))} title="Payment Proof" wide>
        {proof.loading ? (
          <div className="flex justify-center py-10">
            <Spinner className="h-6 w-6 text-maroon-700" />
          </div>
        ) : proof.error ? (
          <Notice type="error" message={proof.error} />
        ) : (
          <div className="space-y-3">
            <img src={proof.url} alt="Deposit proof" className="max-h-[65vh] w-full rounded-2xl border border-gold-400/60 bg-white object-contain" />
            <a href={proof.url} target="_blank" rel="noopener noreferrer" className="btn-outline w-full">
              <ExternalLink className="h-4 w-4" /> Open full size
            </a>
          </div>
        )}
      </Modal>

      <ActionModal
        open={Boolean(action)}
        title={action?.kind === 'approve' ? 'Approve Deposit' : 'Reject Deposit'}
        confirmLabel={action?.kind === 'approve' ? 'Approve & Credit' : 'Reject'}
        danger={action?.kind === 'reject'}
        withNote={action?.kind === 'reject'}
        onClose={() => setAction(null)}
        onConfirm={runAction}
        description={
          action && (
            <p className="text-sm text-maroon-900/85">
              {action.kind === 'approve' ? 'Credit ' : 'Reject '}
              <b>{formatRs(action.row.amount)}</b> {action.kind === 'approve' ? 'to' : 'from'} <b>@{action.row.user?.username}</b> via{' '}
              {methodName(action.row.method)} (TID {action.row.transaction_id})?
              {action.kind === 'approve' && ' Make sure you have received this payment.'}
            </p>
          )
        }
      />
    </div>
  );
}
