import { useCallback, useEffect, useState } from 'react';
import { Receipt } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
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

  async function loadMore() {
    setLoadingMore(true);
    const data = await fetchPage(rows.length);
    setRows((r) => [...r, ...data]);
    setHasMore(data.length === PAGE_SIZE);
    setLoadingMore(false);
  }

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
        ) : rows.length === 0 ? (
          <EmptyState icon={Receipt} title="No transactions found" text="Transactions appear here once you deposit, buy a plan or withdraw." />
        ) : (
          <>
            <ul className="divide-y divide-gold-400/30">
              {rows.map((t) => (
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
