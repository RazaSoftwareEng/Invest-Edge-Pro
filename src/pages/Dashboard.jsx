import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  CalendarClock,
  ChevronRight,
  Crown,
  Gem,
  Headphones,
  History as HistoryIcon,
  MessageCircle,
  Plus,
  Receipt,
  UserRound,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { daysLeft, formatDate, formatRs, initials } from '../lib/format';
import { SUPPORT } from '../config';
import TransactionRow from '../components/TransactionRow';
import EmptyState from '../components/EmptyState';
import { CardLoader } from '../components/Spinner';

const SHORTCUTS = [
  { to: '/deposit', label: 'Deposit', icon: ArrowDownToLine },
  { to: '/withdraw', label: 'Withdraw', icon: ArrowUpFromLine },
  { to: '/plans', label: 'Plans', icon: Gem },
  { to: '/history', label: 'History', icon: HistoryIcon },
  { to: '/profile', label: 'Profile', icon: UserRound },
];

export default function Dashboard() {
  const { user, profile, refreshProfile } = useAuth();
  const [subscription, setSubscription] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  const username = profile?.username ?? user?.user_metadata?.username ?? 'Investor';
  const displayName = profile?.full_name || username;

  useEffect(() => {
    let active = true;
    refreshProfile();
    (async () => {
      const [subRes, txnRes] = await Promise.all([
        supabase
          .from('subscriptions')
          .select('*')
          .eq('user_id', user.id)
          .gt('expires_at', new Date().toISOString())
          .order('expires_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from('transactions')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(5),
      ]);
      if (!active) return;
      setSubscription(subRes.data ?? null);
      setTransactions(txnRes.data ?? []);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [user.id, refreshProfile]);

  return (
    <div className="space-y-5">
      {/* Greeting */}
      <div className="flex items-center gap-3">
        <div className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-gold-400 bg-gradient-to-br from-gold-200 to-gold-500 font-display text-lg font-bold text-maroon-900 shadow-gold">
          {initials(displayName)}
        </div>
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-widest text-gold-200/70">Good to see you</p>
          <h1 className="truncate font-display text-2xl font-bold text-cream-50">
            Welcome, <span className="gold-text">{username}</span>
          </h1>
        </div>
      </div>

      {/* Wallet */}
      <section className="card-dark relative overflow-hidden">
        <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-gold-400/15 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-12 -left-8 h-36 w-36 rounded-full bg-gold-200/10 blur-2xl" />
        <p className="text-xs uppercase tracking-[0.25em] text-gold-200/80">Available Balance</p>
        <p className="mt-2 font-display text-4xl font-bold gold-text">{formatRs(profile?.balance ?? 0)}</p>
        <div className="mt-5 flex items-center justify-between gap-3">
          <p className="text-xs text-cream-100/60">Wallet ID · {user.id.slice(0, 8).toUpperCase()}</p>
          <Link to="/deposit" className="btn-gold px-5 py-2.5">
            <Plus className="h-4 w-4" />
            Deposit
          </Link>
        </div>
      </section>

      {/* Shortcuts */}
      <section className="grid grid-cols-5 gap-2">
        {SHORTCUTS.map(({ to, label, icon: Icon }) => (
          <Link key={to} to={to} className="group flex flex-col items-center gap-1.5">
            <span className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-gold-400 bg-gradient-to-br from-cream-50 to-cream-100 text-maroon-700 shadow-gold transition group-hover:-translate-y-0.5 group-active:scale-95">
              <Icon className="h-6 w-6" />
            </span>
            <span className="text-[11px] font-medium text-cream-100/90">{label}</span>
          </Link>
        ))}
      </section>

      {/* Active plan */}
      <section className="card">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="section-title flex items-center gap-2">
            <Crown className="h-5 w-5 text-gold-600" /> My Active Plan
          </h2>
          <Link to="/plans" className="flex items-center text-xs font-semibold text-maroon-600 hover:underline">
            {subscription ? 'Upgrade' : 'View plans'} <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
        {loading ? (
          <CardLoader />
        ) : subscription ? (
          <div className="flex items-center gap-4 rounded-2xl border border-gold-400/60 bg-white/70 p-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-maroon-600 to-maroon-900 text-gold-200">
              <Gem className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <p className="font-display text-lg font-bold text-maroon-900">{subscription.plan_name}</p>
              <p className="flex items-center gap-1 text-xs text-maroon-800/70">
                <CalendarClock className="h-3.5 w-3.5" /> Expires {formatDate(subscription.expires_at)}
              </p>
            </div>
            <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800 ring-1 ring-emerald-300">
              {daysLeft(subscription.expires_at)} days left
            </span>
          </div>
        ) : (
          <EmptyState icon={Crown} title="No active plan" text="Choose a membership plan to unlock premium benefits." />
        )}
      </section>

      {/* Recent transactions */}
      <section className="card">
        <div className="mb-1 flex items-center justify-between">
          <h2 className="section-title flex items-center gap-2">
            <Receipt className="h-5 w-5 text-gold-600" /> Recent Transactions
          </h2>
          <Link to="/history" className="flex items-center text-xs font-semibold text-maroon-600 hover:underline">
            See all <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
        {loading ? (
          <CardLoader />
        ) : transactions.length ? (
          <ul className="divide-y divide-gold-400/30">
            {transactions.map((t) => (
              <TransactionRow key={t.id} txn={t} />
            ))}
          </ul>
        ) : (
          <EmptyState icon={Receipt} title="No transactions yet" text="Your deposits, purchases and withdrawals will appear here." />
        )}
      </section>

      {/* Support */}
      <section className="card">
        <h2 className="section-title mb-1 flex items-center gap-2">
          <Headphones className="h-5 w-5 text-gold-600" /> Support
        </h2>
        <p className="mb-3 text-xs text-maroon-800/70">{SUPPORT.hours}</p>
        <div className="space-y-2">
          {SUPPORT.links.map((link) => (
            <a
              key={link.url}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 rounded-2xl border border-gold-400/60 bg-white/70 p-3 transition hover:bg-white"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#25D366] text-white">
                <MessageCircle className="h-5 w-5" />
              </span>
              <span className="flex-1">
                <span className="block text-sm font-semibold text-maroon-900">{link.label}</span>
                <span className="block text-xs text-maroon-800/65">{link.description}</span>
              </span>
              <ChevronRight className="h-5 w-5 text-maroon-600" />
            </a>
          ))}
        </div>
      </section>
    </div>
  );
}
