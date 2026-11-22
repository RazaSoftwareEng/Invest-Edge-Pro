import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowDownToLine, Eye, LayoutDashboard, LogIn, UserPlus, Users, Wallet } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { formatRs } from '../../lib/format';
import { startPreview } from '../../lib/preview';
import PageHeader from '../../components/PageHeader';
import { CardLoader } from '../../components/Spinner';

export default function AdminOverview() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);

  useEffect(() => {
    let active = true;
    (async () => {
      const [users, deposits] = await Promise.all([
        supabase.from('profiles').select('balance'),
        supabase.from('deposits').select('amount').eq('status', 'approved'),
      ]);
      if (!active) return;
      const u = users.data ?? [];
      const d = deposits.data ?? [];
      setStats({
        users: u.length,
        deposits: d.reduce((s, x) => s + Number(x.amount || 0), 0),
        depositCount: d.length,
        amount: u.reduce((s, x) => s + Number(x.balance || 0), 0),
      });
    })();
    return () => {
      active = false;
    };
  }, []);

  function preview(path) {
    startPreview();
    navigate(path);
  }

  return (
    <div className="space-y-5">
      <PageHeader title="Dashboard" subtitle="Overall platform stats" />

      {!stats ? (
        <div className="card">
          <CardLoader />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <StatCard icon={Users} label="Total Users" value={stats.users.toLocaleString('en-PK')} sub="registered accounts" />
          <StatCard
            icon={ArrowDownToLine}
            label="Total Deposits"
            value={formatRs(stats.deposits)}
            sub={`${stats.depositCount} approved deposit${stats.depositCount === 1 ? '' : 's'}`}
          />
          <StatCard icon={Wallet} label="Total Amount" value={formatRs(stats.amount)} sub="held in user wallets" />
        </div>
      )}

      <section className="card">
        <h2 className="section-title mb-1 flex items-center gap-2">
          <Eye className="h-5 w-5 text-gold-600" /> Guest Preview
        </h2>
        <p className="mb-4 text-xs text-maroon-800/70">
          See the app exactly as users and visitors see it. A gold banner lets you exit back to the admin console.
        </p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <button type="button" className="btn-primary" onClick={() => preview('/dashboard')}>
            <LayoutDashboard className="h-4 w-4" /> User App
          </button>
          <button type="button" className="btn-outline" onClick={() => preview('/login')}>
            <LogIn className="h-4 w-4" /> Login Page
          </button>
          <button type="button" className="btn-outline" onClick={() => preview('/register')}>
            <UserPlus className="h-4 w-4" /> Register Page
          </button>
        </div>
      </section>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, sub }) {
  return (
    <div className="card-dark relative overflow-hidden">
      <div className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-gold-400/15 blur-2xl" />
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full border border-gold-400/60 bg-maroon-950/40">
        <Icon className="h-5 w-5 text-gold-300" />
      </div>
      <p className="text-xs uppercase tracking-[0.2em] text-gold-200/80">{label}</p>
      <p className="mt-1 break-words font-display text-3xl font-bold gold-text">{value}</p>
      <p className="mt-1 text-[11px] text-cream-100/60">{sub}</p>
    </div>
  );
}
