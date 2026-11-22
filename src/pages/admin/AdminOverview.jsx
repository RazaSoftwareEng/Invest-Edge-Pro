import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowDownToLine, ArrowUpFromLine, ChevronRight, Crown, Receipt, ShieldCheck, Users, Wallet } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { formatRs } from '../../lib/format';
import PageHeader from '../../components/PageHeader';
import TransactionRow from '../../components/TransactionRow';
import EmptyState from '../../components/EmptyState';
import { CardLoader } from '../../components/Spinner';

const sum = (rows) => (rows ?? []).reduce((s, r) => s + Number(r.amount ?? r.balance ?? 0), 0);

export default function AdminOverview() {
  const [stats, setStats] = useState(null);
  const [recent, setRecent] = useState([]);

  useEffect(() => {
    let active = true;
    (async () => {
      const now = new Date().toISOString();
      const [users, pendDep, pendWd, approvedDep, paidWd, subs, txns] = await Promise.all([
        supabase.from('profiles').select('id, balance, is_admin'),
        supabase.from('deposits').select('amount').eq('status', 'pending'),
        supabase.from('withdrawals').select('amount').eq('status', 'pending'),
        supabase.from('deposits').select('amount').eq('status', 'approved'),
        supabase.from('withdrawals').select('amount').eq('status', 'paid'),
        supabase.from('subscriptions').select('user_id').gt('expires_at', now),
        supabase
          .from('transactions')
          .select('*, user:profiles(username)')
          .order('created_at', { ascending: false })
          .limit(10),
      ]);
      if (!active) return;
      const u = users.data ?? [];
      setStats({
        users: u.length,
        admins: u.filter((x) => x.is_admin).length,
        wallets: u.reduce((s, x) => s + Number(x.balance || 0), 0),
        pendingDeposits: { count: pendDep.data?.length ?? 0, amount: sum(pendDep.data) },
        pendingWithdrawals: { count: pendWd.data?.length ?? 0, amount: sum(pendWd.data) },
        approvedDeposits: sum(approvedDep.data),
        paidWithdrawals: sum(paidWd.data),
        activeMembers: new Set((subs.data ?? []).map((s) => s.user_id)).size,
      });
      setRecent(txns.data ?? []);
    })();
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="space-y-5">
      <PageHeader title="Overview" subtitle="Platform summary at a glance" />

      {!stats ? (
        <div className="card">
          <CardLoader />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3">
            <ActionTile
              to="/admin/deposits"
              icon={ArrowDownToLine}
              label="Pending deposits"
              count={stats.pendingDeposits.count}
              amount={stats.pendingDeposits.amount}
            />
            <ActionTile
              to="/admin/withdrawals"
              icon={ArrowUpFromLine}
              label="Pending withdrawals"
              count={stats.pendingWithdrawals.count}
              amount={stats.pendingWithdrawals.amount}
            />
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <Stat icon={Users} label="Total users" value={stats.users} sub={`${stats.admins} admin(s)`} to="/admin/users" />
            <Stat icon={Crown} label="Active members" value={stats.activeMembers} sub="with a running plan" />
            <Stat icon={Wallet} label="User wallets" value={formatRs(stats.wallets)} sub="total balance held" />
            <Stat icon={ArrowDownToLine} label="Deposits approved" value={formatRs(stats.approvedDeposits)} sub="all time" />
            <Stat icon={ArrowUpFromLine} label="Withdrawals paid" value={formatRs(stats.paidWithdrawals)} sub="all time" />
            <Stat icon={ShieldCheck} label="Net cash in" value={formatRs(stats.approvedDeposits - stats.paidWithdrawals)} sub="deposits − payouts" />
          </div>
        </>
      )}

      <section className="card">
        <h2 className="section-title mb-1 flex items-center gap-2">
          <Receipt className="h-5 w-5 text-gold-600" /> Latest Activity (all users)
        </h2>
        {!stats ? (
          <CardLoader />
        ) : recent.length === 0 ? (
          <EmptyState title="No activity yet" />
        ) : (
          <ul className="divide-y divide-gold-400/30">
            {recent.map((t) => (
              <TransactionRow key={t.id} txn={t} showUser />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function ActionTile({ to, icon: Icon, label, count, amount }) {
  return (
    <Link
      to={to}
      className={`card-dark flex flex-col gap-1 p-4 transition hover:brightness-110 ${count > 0 ? 'ring-2 ring-gold-400' : ''}`}
    >
      <div className="flex items-center justify-between">
        <Icon className="h-5 w-5 text-gold-300" />
        <ChevronRight className="h-4 w-4 text-gold-300/70" />
      </div>
      <p className="font-display text-3xl font-bold gold-text">{count}</p>
      <p className="text-xs text-cream-100/80">{label}</p>
      <p className="text-[11px] text-gold-200/70">{formatRs(amount)}</p>
    </Link>
  );
}

function Stat({ icon: Icon, label, value, sub, to }) {
  const body = (
    <>
      <Icon className="mb-1 h-4 w-4 text-maroon-600" />
      <p className="text-lg font-bold text-maroon-900">{value}</p>
      <p className="text-xs font-semibold text-maroon-800">{label}</p>
      <p className="text-[10px] text-maroon-800/60">{sub}</p>
    </>
  );
  return to ? (
    <Link to={to} className="card p-3.5 transition hover:brightness-105">
      {body}
    </Link>
  ) : (
    <div className="card p-3.5">{body}</div>
  );
}
