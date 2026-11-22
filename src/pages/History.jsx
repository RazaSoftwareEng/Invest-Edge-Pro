import { useCallback, useEffect, useMemo, useState } from 'react';
import { Receipt } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { methodName } from '../lib/format';
import PageHeader from '../components/PageHeader';
import TransactionRow from '../components/TransactionRow';
import EmptyState from '../components/EmptyState';
import { CardLoader, Spinner } from '../components/Spinner';

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'deposit', label: 'Deposits' },
  { id: 'purchase', label: 'Purchases' },
  { id: 'withdrawal', label: 'Withdrawals' },
  { id: 'refund', label: 'Refunds' },
  { id: 'adjustment', label: 'Adjustments' },
];
const PAGE_SIZE = 25;

export default function History() {
  const { user } = useAuth();
  const [filter, setFilter] = useState('all');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);

  const fetchPage = useCallback(
    async (offset) => {
      let q = supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .range(offset, offset + PAGE_SIZE - 1);
      if (filter !== 'all') q = q.eq('type', filter);
      const { data } = await q;
      return data ?? [];
    },
    [user.id, filter],
  );

  useEffect(() => {
    let active = true;
    setLoading(true);
    fetchPage(0).then((data) => {
      if (!active) return;
      setRows(data);
      setHasMore(data.length === PAGE_SIZE);
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [fetchPage]);

  // Deposits that haven't moved money yet (pending / rejected) + withdrawal statuses
  const [depositRequests, setDepositRequests] = useState([]);
  const [withdrawalStatus, setWithdrawalStatus] = useState({});

  useEffect(() => {
    let active = true;
    Promise.all([
      supabase
        .from('deposits')
        .select('id, method, amount, transaction_id, status, admin_note, created_at')
        .eq('user_id', user.id)
        .in('status', ['pending', 'rejected'])
        .order('created_at', { ascending: false })
        .limit(100),
      supabase.from('withdrawals').select('id, status').eq('user_id', user.id).limit(500),
    ]).then(([dep, wd]) => {
      if (!active) return;
      setDepositRequests(dep.data ?? []);
      const map = {};
      (wd.data ?? []).forEach((w) => {
        map[w.id] = w.status;
      });
      setWithdrawalStatus(map);
    });
    return () => {
      active = false;
    };
  }, [user.id]);

  async function loadMore() {
    setLoadingMore(true);
    const data = await fetchPage(rows.length);
    setRows((r) => [...r, ...data]);
    setHasMore(data.length === PAGE_SIZE);
    setLoadingMore(false);
  }

  const display = useMemo(() => {
    const txns = rows.map((t) => ({
      ...t,
      status: t.type === 'withdrawal' ? withdrawalStatus[t.ref_id] : undefined,
    }));
    if (filter !== 'all' && filter !== 'deposit') return txns;

    // Only merge requests inside the loaded date range (older ones appear after "Load more")
    const oldest = hasMore && rows.length ? rows[rows.length - 1].created_at : null;
    const requests = depositRequests
      .filter((d) => !oldest || d.created_at >= oldest)
      .map((d) => ({
        id: `dep-${d.id}`,
        type: 'deposit',
        amount: d.amount,
        note: `${methodName(d.method)} · TID ${d.transaction_id}${d.status === 'rejected' && d.admin_note ? ` — ${d.admin_note}` : ''}`,
        created_at: d.created_at,
        balance_after: null,
        status: d.status,
        isRequest: true,
      }));
    return [...txns, ...requests].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }, [rows, depositRequests, withdrawalStatus, filter, hasMore]);

  const totals = rows.reduce(
    (acc, t) => {
      const n = Number(t.amount);
      if (n >= 0) acc.in += n;
      else acc.out += Math.abs(n);
      return acc;
    },
    { in: 0, out: 0 },
  );

  return (
    <div>
      <PageHeader title="Transaction History" subtitle="Every movement in your wallet" />

      <div className="no-scrollbar -mx-4 mb-4 flex gap-2 overflow-x-auto px-4">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFilter(f.id)}
            className={`chip ${filter === f.id ? 'chip-active' : 'chip-idle'}`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {!loading && rows.length > 0 && (
        <div className="mb-4 grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-emerald-400/40 bg-emerald-950/30 px-4 py-3">
            <p className="text-[11px] uppercase tracking-wider text-emerald-200/80">Money in (shown)</p>
            <p className="font-bold text-emerald-300">+Rs {totals.in.toLocaleString('en-PK')}</p>
          </div>
          <div className="rounded-2xl border border-red-400/40 bg-red-950/30 px-4 py-3">
            <p className="text-[11px] uppercase tracking-wider text-red-200/80">Money out (shown)</p>
            <p className="font-bold text-red-300">-Rs {totals.out.toLocaleString('en-PK')}</p>
          </div>
        </div>
      )}

      <section className="card">
        {loading ? (
          <CardLoader />
        ) : display.length === 0 ? (
          <EmptyState icon={Receipt} title="No transactions found" text="Transactions appear here once you deposit, buy a plan or withdraw." />
        ) : (
          <>
            <ul className="divide-y divide-gold-400/30">
              {display.map((t) => (
                <TransactionRow key={t.id} txn={t} />
              ))}
            </ul>
            {hasMore && (
              <button type="button" className="btn-outline mt-3 w-full" onClick={loadMore} disabled={loadingMore}>
                {loadingMore && <Spinner className="h-4 w-4" />}
                Load more
              </button>
            )}
          </>
        )}
      </section>
    </div>
  );
}
