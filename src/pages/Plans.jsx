import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarDays, Check, Crown, Gem, ShoppingCart, Sparkles, Wallet } from 'lucide-react';
import { supabase, friendlyDbError } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { daysLeft, formatDate, formatRs } from '../lib/format';
import PageHeader from '../components/PageHeader';
import Modal from '../components/Modal';
import Notice from '../components/Notice';
import EmptyState from '../components/EmptyState';
import { CardLoader, Spinner } from '../components/Spinner';

export default function Plans() {
  const { user, profile, refreshProfile } = useAuth();
  const [plans, setPlans] = useState([]);
  const [activeSub, setActiveSub] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [selected, setSelected] = useState(null);
  const [buying, setBuying] = useState(false);
  const [buyError, setBuyError] = useState('');
  const [success, setSuccess] = useState('');

  const balance = Number(profile?.balance ?? 0);

  const load = useCallback(async () => {
    const [plansRes, subRes] = await Promise.all([
      supabase.from('plans').select('*').eq('active', true).order('price', { ascending: true }).order('sort_order'),
      supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .gt('expires_at', new Date().toISOString())
        .order('expires_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);
    if (plansRes.error) setLoadError(friendlyDbError(plansRes.error));
    setPlans(plansRes.data ?? []);
    setActiveSub(subRes.data ?? null);
    setLoading(false);
  }, [user.id]);

  useEffect(() => {
    load();
  }, [load]);

  function openBuy(plan) {
    setBuyError('');
    setSuccess('');
    setSelected(plan);
  }

  async function confirmBuy() {
    if (!selected) return;
    setBuying(true);
    setBuyError('');
    const { error } = await supabase.rpc('buy_plan', { p_plan_id: selected.id });
    setBuying(false);
    if (error) {
      setBuyError(friendlyDbError(error));
      return;
    }
    setSuccess(`🎉 ${selected.name} plan activated for ${selected.duration_days} days!`);
    setSelected(null);
    await Promise.all([refreshProfile(), load()]);
  }

  const insufficient = selected && balance < Number(selected.price);

  return (
    <div>
      <PageHeader
        title="Membership Plans"
        subtitle="Pick the plan that matches your goals"
        right={
          <div className="rounded-full border border-gold-400/50 bg-maroon-900/60 px-3 py-1.5 text-xs font-semibold text-gold-200">
            <Wallet className="mr-1 inline h-3.5 w-3.5" />
            {formatRs(balance)}
          </div>
        }
      />

      <div className="space-y-4">
        <Notice type="success" message={success} onClose={() => setSuccess('')} />
        <Notice type="error" message={loadError} />

        {activeSub && (
          <div className="flex items-center gap-3 rounded-2xl border border-gold-400/50 bg-maroon-900/50 px-4 py-3 text-sm text-cream-50">
            <Crown className="h-5 w-5 text-gold-300" />
            <p className="flex-1">
              Active: <span className="font-semibold text-gold-200">{activeSub.plan_name}</span> · expires{' '}
              {formatDate(activeSub.expires_at)} ({daysLeft(activeSub.expires_at)} days left)
            </p>
          </div>
        )}

        {loading ? (
          <div className="card">
            <CardLoader label="Loading plans…" />
          </div>
        ) : plans.length === 0 ? (
          <div className="card">
            <EmptyState icon={Gem} title="No plans available" text="Please check back soon." />
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 min-[420px]:grid-cols-2">
            {plans.map((plan, i) => {
              const featured = i === plans.length - 1 && plans.length > 1;
              return (
                <article
                  key={plan.id}
                  className={`card relative flex flex-col p-4 ${featured ? 'ring-2 ring-gold-400' : ''}`}
                >
                  {featured && (
                    <span className="absolute -top-3 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-full bg-gradient-to-r from-gold-200 to-gold-500 px-3 py-0.5 text-[10px] font-bold uppercase tracking-wider text-maroon-900 shadow">
                      <Sparkles className="h-3 w-3" /> Best Value
                    </span>
                  )}
                  <div className="mb-3 flex items-center gap-2">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-maroon-600 to-maroon-900 text-gold-200">
                      <Gem className="h-5 w-5" />
                    </span>
                    <h3 className="font-display text-xl font-bold text-maroon-900">{plan.name}</h3>
                  </div>
                  <p className="font-display text-2xl font-bold text-maroon-700">{formatRs(plan.price)}</p>
                  <p className="mb-3 flex items-center gap-1 text-xs font-medium text-maroon-800/70">
                    <CalendarDays className="h-3.5 w-3.5" /> {plan.duration_days} days access
                  </p>
                  <div className="divider my-2" />
                  <ul className="mb-4 flex-1 space-y-1.5">
                    {(plan.benefits ?? []).map((b) => (
                      <li key={b} className="flex items-start gap-2 text-xs text-maroon-900/85">
                        <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
                        {b}
                      </li>
                    ))}
                  </ul>
                  <button type="button" className="btn-primary w-full py-2.5" onClick={() => openBuy(plan)}>
                    <ShoppingCart className="h-4 w-4" /> Buy Now
                  </button>
                </article>
              );
            })}
          </div>
        )}
      </div>

      <Modal open={Boolean(selected)} onClose={() => !buying && setSelected(null)} title="Confirm Purchase">
        {selected && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-gold-400/60 bg-white/70 p-4 text-sm">
              <Row label="Plan" value={selected.name} />
              <Row label="Duration" value={`${selected.duration_days} days`} />
              <Row label="Price" value={formatRs(selected.price)} strong />
              <div className="divider my-2" />
              <Row label="Your balance" value={formatRs(balance)} />
              <Row
                label="Balance after"
                value={insufficient ? '—' : formatRs(balance - Number(selected.price))}
              />
            </div>

            {activeSub && (
              <Notice
                type="info"
                message={`You already have an active ${activeSub.plan_name} plan. This purchase starts a new membership today.`}
              />
            )}
            <Notice type="error" message={buyError} />

            {insufficient ? (
              <>
                <Notice
                  type="error"
                  message={`Insufficient balance. You need ${formatRs(Number(selected.price) - balance)} more.`}
                />
                <Link to="/deposit" className="btn-primary w-full">
                  <Wallet className="h-4 w-4" /> Deposit Now
                </Link>
              </>
            ) : (
              <button type="button" className="btn-primary w-full" onClick={confirmBuy} disabled={buying}>
                {buying ? <Spinner className="h-4 w-4" /> : <ShoppingCart className="h-4 w-4" />}
                {buying ? 'Processing…' : `Pay ${formatRs(selected.price)}`}
              </button>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}

function Row({ label, value, strong }) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-maroon-800/70">{label}</span>
      <span className={strong ? 'font-bold text-maroon-900' : 'font-medium text-maroon-900'}>{value}</span>
    </div>
  );
}
