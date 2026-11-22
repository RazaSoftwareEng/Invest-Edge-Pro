import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  AtSign,
  Ban,
  CalendarPlus,
  Crown,
  Gem,
  KeyRound,
  Lock,
  Minus,
  Pencil,
  Phone,
  Plus,
  ShieldCheck,
  Trash2,
  User,
  UserX,
  Wallet,
} from 'lucide-react';
import { supabase, friendlyDbError } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { daysLeft, formatDate, formatDateTime, formatRs, initials, methodName, normalizePkPhone } from '../../lib/format';
import PageHeader from '../../components/PageHeader';
import Input from '../../components/Input';
import Notice from '../../components/Notice';
import StatusBadge from '../../components/StatusBadge';
import TransactionRow from '../../components/TransactionRow';
import EmptyState from '../../components/EmptyState';
import { CardLoader } from '../../components/Spinner';
import AdminFormModal from './AdminFormModal';

const ACTIVITY_TABS = [
  { id: 'transactions', label: 'Transactions' },
  { id: 'deposits', label: 'Deposits' },
  { id: 'withdrawals', label: 'Withdrawals' },
];

export default function AdminUserDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user: me } = useAuth();
  const [data, setData] = useState(null);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // { type, sub? }
  const [success, setSuccess] = useState('');
  const [tab, setTab] = useState('transactions');

  const load = useCallback(async () => {
    const [p, s, t, d, w, pl] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', id).maybeSingle(),
      supabase.from('subscriptions').select('*').eq('user_id', id).order('created_at', { ascending: false }),
      supabase.from('transactions').select('*').eq('user_id', id).order('created_at', { ascending: false }).limit(50),
      supabase.from('deposits').select('*').eq('user_id', id).order('created_at', { ascending: false }).limit(50),
      supabase.from('withdrawals').select('*').eq('user_id', id).order('created_at', { ascending: false }).limit(50),
      supabase.from('plans').select('*').order('sort_order').order('price'),
    ]);
    setData({
      profile: p.data,
      subs: s.data ?? [],
      transactions: t.data ?? [],
      deposits: d.data ?? [],
      withdrawals: w.data ?? [],
    });
    setPlans(pl.data ?? []);
    setLoading(false);
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  /** Runs an admin RPC; returns an error string or null and refreshes the page on success. */
  const run = useCallback(
    async (fn, args, message) => {
      const { error } = await supabase.rpc(fn, args);
      if (error) return friendlyDbError(error);
      setModal(null);
      setSuccess(message);
      await load();
      return null;
    },
    [load],
  );

  if (loading) {
    return (
      <div className="card">
        <CardLoader label="Loading user…" />
      </div>
    );
  }

  const profile = data?.profile;
  if (!profile) {
    return (
      <div>
        <PageHeader title="User" back />
        <div className="card">
          <EmptyState icon={UserX} title="User not found" text="This account may have been deleted." />
        </div>
      </div>
    );
  }

  const isSelf = profile.id === me?.id;
  const now = Date.now();
  const activeSubs = data.subs.filter((s) => new Date(s.expires_at).getTime() > now);
  const pastSubs = data.subs.filter((s) => new Date(s.expires_at).getTime() <= now);
  const totals = {
    deposited: data.deposits.filter((x) => x.status === 'approved').reduce((s, x) => s + Number(x.amount), 0),
    withdrawn: data.withdrawals.filter((x) => x.status === 'paid').reduce((s, x) => s + Number(x.amount), 0),
  };

  return (
    <div className="space-y-5">
      <PageHeader title="User Details" subtitle={`@${profile.username}`} back />
      <Notice type="success" message={success} onClose={() => setSuccess('')} />

      {/* Profile */}
      <section className="card-dark">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border-2 border-gold-400 bg-gradient-to-br from-gold-200 to-gold-500 font-display text-xl font-bold text-maroon-900">
            {initials(profile.full_name || profile.username)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-1.5 truncate font-display text-xl font-bold text-cream-50">
              {profile.full_name || profile.username}
              {profile.is_admin && <ShieldCheck className="h-4 w-4 text-gold-300" />}
            </p>
            <p className="text-xs text-gold-200/80">
              @{profile.username} · {profile.phone || 'no phone'}
            </p>
            <p className="text-[11px] text-cream-100/60">
              Joined {formatDate(profile.created_at)} · ID {profile.id.slice(0, 8).toUpperCase()}
            </p>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2 text-center">
          <MiniStat label="Balance" value={formatRs(profile.balance)} />
          <MiniStat label="Deposited" value={formatRs(totals.deposited)} />
          <MiniStat label="Withdrawn" value={formatRs(totals.withdrawn)} />
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <DarkBtn icon={Pencil} label="Edit Profile" onClick={() => setModal({ type: 'edit' })} />
          <DarkBtn icon={Wallet} label="Adjust Balance" onClick={() => setModal({ type: 'balance' })} />
          <DarkBtn icon={KeyRound} label="Reset Password" onClick={() => setModal({ type: 'password' })} />
          <DarkBtn icon={Trash2} label="Delete User" danger disabled={isSelf} onClick={() => setModal({ type: 'delete' })} />
        </div>
      </section>

      {/* Plans */}
      <section className="card">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="section-title flex items-center gap-2">
            <Crown className="h-5 w-5 text-gold-600" /> Plans
          </h2>
          <button type="button" className="btn-primary px-4 py-2" onClick={() => setModal({ type: 'assign' })}>
            <Plus className="h-4 w-4" /> Assign Plan
          </button>
        </div>

        {data.subs.length === 0 ? (
          <EmptyState icon={Gem} title="No plans yet" text="This user has never had a membership." />
        ) : (
          <div className="space-y-2.5">
            {[...activeSubs, ...pastSubs].map((s) => {
              const active = new Date(s.expires_at).getTime() > now;
              return (
                <div
                  key={s.id}
                  className={`rounded-2xl border p-3 ${active ? 'border-emerald-300 bg-white/80' : 'border-gold-400/40 bg-white/50 opacity-80'}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-display text-lg font-bold text-maroon-900">{s.plan_name}</p>
                      <p className="text-xs text-maroon-800/70">
                        {formatDate(s.starts_at)} → {formatDate(s.expires_at)} · paid {formatRs(s.price)}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1 ${
                        active ? 'bg-emerald-100 text-emerald-800 ring-emerald-300' : 'bg-gray-100 text-gray-600 ring-gray-300'
                      }`}
                    >
                      {active ? `${daysLeft(s.expires_at)} days left` : 'Expired'}
                    </span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <SmallBtn icon={CalendarPlus} label={active ? 'Extend / Edit' : 'Reactivate'} onClick={() => setModal({ type: 'extend', sub: s })} />
                    {active && <SmallBtn icon={Ban} label="Cancel now" onClick={() => setModal({ type: 'cancel', sub: s })} />}
                    <SmallBtn icon={Trash2} label="Remove" danger onClick={() => setModal({ type: 'removeSub', sub: s })} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Activity */}
      <section className="card">
        <div className="no-scrollbar mb-2 flex gap-2 overflow-x-auto">
          {ACTIVITY_TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`chip ${tab === t.id ? 'border-maroon-700 bg-maroon-700 text-gold-200' : 'border-gold-400/60 bg-white/60 text-maroon-800'}`}
            >
              {t.label} ({data[t.id].length})
            </button>
          ))}
        </div>

        {tab === 'transactions' &&
          (data.transactions.length ? (
            <ul className="divide-y divide-gold-400/30">
              {data.transactions.map((t) => (
                <TransactionRow key={t.id} txn={t} />
              ))}
            </ul>
          ) : (
            <EmptyState title="No transactions" />
          ))}

        {tab === 'deposits' &&
          (data.deposits.length ? (
            <ul className="divide-y divide-gold-400/30">
              {data.deposits.map((d) => (
                <RequestRow
                  key={d.id}
                  amount={d.amount}
                  status={d.status}
                  line={`${methodName(d.method)} · TID ${d.transaction_id}`}
                  date={d.created_at}
                  note={d.admin_note}
                />
              ))}
            </ul>
          ) : (
            <EmptyState title="No deposits" />
          ))}

        {tab === 'withdrawals' &&
          (data.withdrawals.length ? (
            <ul className="divide-y divide-gold-400/30">
              {data.withdrawals.map((w) => (
                <RequestRow
                  key={w.id}
                  amount={w.amount}
                  status={w.status}
                  line={`${methodName(w.method)}${w.bank_name ? ` (${w.bank_name})` : ''} · ${w.account_number} · ${w.account_name}`}
                  date={w.created_at}
                  note={w.admin_note}
                />
              ))}
            </ul>
          ) : (
            <EmptyState title="No withdrawals" />
          ))}
      </section>

      {/* Modals */}
      {modal?.type === 'edit' && <EditProfileModal profile={profile} isSelf={isSelf} run={run} onClose={() => setModal(null)} />}
      {modal?.type === 'balance' && <AdjustBalanceModal profile={profile} run={run} onClose={() => setModal(null)} />}
      {modal?.type === 'password' && <PasswordModal profile={profile} run={run} onClose={() => setModal(null)} />}
      {modal?.type === 'assign' && <AssignPlanModal profile={profile} plans={plans} run={run} onClose={() => setModal(null)} />}
      {modal?.type === 'extend' && <ExtendModal sub={modal.sub} run={run} onClose={() => setModal(null)} />}
      {modal?.type === 'cancel' && (
        <AdminFormModal
          title="Cancel Plan"
          submitLabel="Cancel Plan"
          danger
          onClose={() => setModal(null)}
          onSubmit={() =>
            run(
              'admin_update_subscription',
              { p_sub_id: modal.sub.id, p_expires_at: new Date().toISOString() },
              `${modal.sub.plan_name} plan cancelled.`,
            )
          }
        >
          <p className="text-sm text-maroon-900/85">
            End <b>{modal.sub.plan_name}</b> for <b>@{profile.username}</b> right now? No money is refunded — use Adjust Balance if you want
            to refund.
          </p>
        </AdminFormModal>
      )}
      {modal?.type === 'removeSub' && (
        <AdminFormModal
          title="Remove Plan Record"
          submitLabel="Remove"
          danger
          onClose={() => setModal(null)}
          onSubmit={() => run('admin_delete_subscription', { p_sub_id: modal.sub.id }, 'Plan record removed.')}
        >
          <p className="text-sm text-maroon-900/85">
            Permanently delete this <b>{modal.sub.plan_name}</b> record from @{profile.username}&apos;s history? No money is refunded.
          </p>
        </AdminFormModal>
      )}
      {modal?.type === 'delete' && (
        <DeleteUserModal
          profile={profile}
          onClose={() => setModal(null)}
          onDeleted={() => navigate('/admin/users', { replace: true })}
        />
      )}
    </div>
  );
}

/* ---------------------------------- modals ---------------------------------- */

function EditProfileModal({ profile, isSelf, run, onClose }) {
  const [f, setF] = useState({
    username: profile.username,
    full_name: profile.full_name ?? '',
    phone: profile.phone ?? '',
    is_admin: profile.is_admin,
  });
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));

  function submit() {
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(f.username.trim())) return Promise.resolve('Username must be 3–20 letters, numbers or underscore.');
    const phone = f.phone.trim() ? normalizePkPhone(f.phone) : '';
    if (phone === null) return Promise.resolve('Enter a valid mobile number, e.g. 03001234567.');
    return run(
      'admin_update_user',
      { p_user_id: profile.id, p_username: f.username.trim(), p_full_name: f.full_name, p_phone: phone, p_is_admin: f.is_admin },
      'Profile updated.',
    );
  }

  return (
    <AdminFormModal title="Edit Profile" onClose={onClose} onSubmit={submit}>
      <Input
        icon={AtSign}
        label="Username"
        value={f.username}
        onChange={set('username')}
        hint="Changing the username also changes what the user types to log in."
      />
      <Input icon={User} label="Full Name" value={f.full_name} onChange={set('full_name')} />
      <Input icon={Phone} type="tel" label="Phone" value={f.phone} onChange={set('phone')} />
      <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-gold-400/60 bg-white/70 px-4 py-3">
        <input
          type="checkbox"
          checked={f.is_admin}
          disabled={isSelf}
          onChange={(e) => setF((s) => ({ ...s, is_admin: e.target.checked }))}
          className="h-4 w-4 accent-maroon-600"
        />
        <span className="text-sm font-medium text-maroon-900">
          Admin access {isSelf && <span className="text-xs text-maroon-800/60">(you can’t remove your own)</span>}
        </span>
      </label>
    </AdminFormModal>
  );
}

function AdjustBalanceModal({ profile, run, onClose }) {
  const [mode, setMode] = useState('add');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const amt = Number(amount) || 0;
  const after = Number(profile.balance) + (mode === 'add' ? amt : -amt);

  function submit() {
    if (amt <= 0) return Promise.resolve('Enter an amount greater than 0.');
    if (!note.trim()) return Promise.resolve('Please enter a reason.');
    if (after < 0) return Promise.resolve('Balance cannot go below zero.');
    const signed = mode === 'add' ? amt : -amt;
    return run(
      'admin_adjust_balance',
      { p_user_id: profile.id, p_amount: signed, p_note: note.trim() },
      `${mode === 'add' ? 'Added' : 'Deducted'} ${formatRs(amt)} ${mode === 'add' ? 'to' : 'from'} @${profile.username}.`,
    );
  }

  return (
    <AdminFormModal title="Adjust Balance" submitLabel="Apply" danger={mode === 'deduct'} onClose={onClose} onSubmit={submit}>
      <div className="grid grid-cols-2 gap-2">
        {['add', 'deduct'].map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={`flex items-center justify-center gap-1.5 rounded-full border-2 py-2 text-sm font-semibold transition ${
              mode === m
                ? m === 'add'
                  ? 'border-emerald-600 bg-emerald-50 text-emerald-800'
                  : 'border-red-600 bg-red-50 text-red-700'
                : 'border-gold-400/40 bg-white/60 text-maroon-800'
            }`}
          >
            {m === 'add' ? <Plus className="h-4 w-4" /> : <Minus className="h-4 w-4" />}
            {m === 'add' ? 'Add money' : 'Deduct money'}
          </button>
        ))}
      </div>
      <Input icon={Wallet} type="number" inputMode="decimal" label="Amount (Rs)" value={amount} onChange={(e) => setAmount(e.target.value)} />
      <div>
        <label className="label" htmlFor="adj-note">
          Reason (visible to user)
        </label>
        <textarea
          id="adj-note"
          rows={2}
          className="textarea-field"
          placeholder="e.g. Bonus, correction, manual refund"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={200}
        />
      </div>
      <div className="flex justify-between rounded-2xl bg-white/70 px-4 py-2 text-sm">
        <span className="text-maroon-800/70">Current {formatRs(profile.balance)}</span>
        <span className={`font-bold ${after < 0 ? 'text-red-600' : 'text-maroon-900'}`}>After {formatRs(after)}</span>
      </div>
    </AdminFormModal>
  );
}

function PasswordModal({ profile, run, onClose }) {
  const [pw, setPw] = useState('');
  function submit() {
    if (pw.length < 6) return Promise.resolve('Password must be at least 6 characters.');
    return run('admin_set_password', { p_user_id: profile.id, p_password: pw }, `Password reset for @${profile.username}.`);
  }
  return (
    <AdminFormModal title="Reset Password" submitLabel="Set Password" onClose={onClose} onSubmit={submit}>
      <Input icon={Lock} type="password" label="New Password" placeholder="At least 6 characters" value={pw} onChange={(e) => setPw(e.target.value)} />
      <p className="text-xs text-maroon-800/65">Share the new password with @{profile.username} securely (e.g. WhatsApp).</p>
    </AdminFormModal>
  );
}

function AssignPlanModal({ profile, plans, run, onClose }) {
  const [planId, setPlanId] = useState(plans.find((p) => p.active)?.id ?? plans[0]?.id ?? '');
  const [charge, setCharge] = useState(false);
  const plan = plans.find((p) => p.id === planId);

  function submit() {
    if (!plan) return Promise.resolve('Please choose a plan.');
    if (charge && Number(profile.balance) < Number(plan.price)) return Promise.resolve('User balance is too low to charge this plan.');
    return run(
      'admin_assign_plan',
      { p_user_id: profile.id, p_plan_id: plan.id, p_charge: charge },
      `${plan.name} assigned to @${profile.username}${charge ? ` (charged ${formatRs(plan.price)})` : ' (free)'}.`,
    );
  }

  return (
    <AdminFormModal title="Assign Plan" submitLabel="Assign" onClose={onClose} onSubmit={submit}>
      {plans.length === 0 ? (
        <Notice type="info" message="Create a plan first in the Plans tab." />
      ) : (
        <div className="space-y-2">
          {plans.map((p) => (
            <label
              key={p.id}
              className={`flex cursor-pointer items-center gap-3 rounded-2xl border-2 px-4 py-2.5 transition ${
                planId === p.id ? 'border-gold-400 bg-white shadow-gold' : 'border-gold-400/30 bg-white/60'
              }`}
            >
              <input type="radio" name="plan" checked={planId === p.id} onChange={() => setPlanId(p.id)} className="accent-maroon-600" />
              <span className="flex-1 text-sm font-semibold text-maroon-900">
                {p.name} {!p.active && <span className="text-xs font-normal text-maroon-800/60">(inactive)</span>}
              </span>
              <span className="text-xs text-maroon-800/70">
                {formatRs(p.price)} · {p.duration_days}d
              </span>
            </label>
          ))}
        </div>
      )}
      <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-gold-400/60 bg-white/70 px-4 py-3">
        <input type="checkbox" checked={charge} onChange={(e) => setCharge(e.target.checked)} className="h-4 w-4 accent-maroon-600" />
        <span className="text-sm text-maroon-900">
          Charge user’s wallet <span className="text-xs text-maroon-800/60">(balance {formatRs(profile.balance)})</span>
        </span>
      </label>
      {!charge && <p className="text-xs text-maroon-800/65">Unchecked = free / complimentary plan, no money is deducted.</p>}
    </AdminFormModal>
  );
}

function ExtendModal({ sub, run, onClose }) {
  const toInput = (d) => {
    const x = new Date(d);
    x.setMinutes(x.getMinutes() - x.getTimezoneOffset());
    return x.toISOString().slice(0, 10);
  };
  const [date, setDate] = useState(toInput(sub.expires_at));

  function addDays(n) {
    const base = Math.max(new Date(sub.expires_at).getTime(), Date.now());
    setDate(toInput(base + n * 86_400_000));
  }

  function submit() {
    if (!date) return Promise.resolve('Choose an expiry date.');
    const expires = new Date(`${date}T23:59:59`);
    return run('admin_update_subscription', { p_sub_id: sub.id, p_expires_at: expires.toISOString() }, `${sub.plan_name} now expires ${formatDate(expires)}.`);
  }

  return (
    <AdminFormModal title={`Edit ${sub.plan_name} Expiry`} onClose={onClose} onSubmit={submit}>
      <p className="text-sm text-maroon-900/80">
        Started {formatDateTime(sub.starts_at)} · currently expires {formatDateTime(sub.expires_at)}
      </p>
      <div className="flex flex-wrap gap-2">
        {[7, 30, 90].map((n) => (
          <button key={n} type="button" className="btn-outline px-4 py-1.5" onClick={() => addDays(n)}>
            +{n} days
          </button>
        ))}
      </div>
      <div>
        <label className="label" htmlFor="sub-exp">
          New expiry date
        </label>
        <input id="sub-exp" type="date" className="input-field px-4" value={date} onChange={(e) => setDate(e.target.value)} />
      </div>
    </AdminFormModal>
  );
}

function DeleteUserModal({ profile, onClose, onDeleted }) {
  const [confirm, setConfirm] = useState('');
  async function submit() {
    if (confirm.trim().toLowerCase() !== profile.username.toLowerCase()) return `Type "${profile.username}" to confirm.`;
    const { error } = await supabase.rpc('admin_delete_user', { p_user_id: profile.id });
    if (error) return friendlyDbError(error);
    onDeleted();
    return null;
  }
  return (
    <AdminFormModal title="Delete User" submitLabel="Delete Forever" danger onClose={onClose} onSubmit={submit}>
      <Notice
        type="error"
        message={`This permanently deletes @${profile.username}'s login, wallet (${formatRs(profile.balance)}), plans, deposits, withdrawals and history. This cannot be undone.`}
      />
      <Input label={`Type "${profile.username}" to confirm`} value={confirm} onChange={(e) => setConfirm(e.target.value)} autoCapitalize="none" />
    </AdminFormModal>
  );
}

/* ---------------------------------- bits ---------------------------------- */

function MiniStat({ label, value }) {
  return (
    <div className="rounded-2xl border border-gold-400/30 bg-maroon-950/30 px-2 py-2">
      <p className="truncate text-sm font-bold text-gold-200">{value}</p>
      <p className="text-[10px] uppercase tracking-wider text-cream-100/60">{label}</p>
    </div>
  );
}

function DarkBtn({ icon: Icon, label, onClick, danger, disabled }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center justify-center gap-1.5 rounded-full border px-3 py-2 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-40 ${
        danger ? 'border-red-400/60 text-red-200 hover:bg-red-900/40' : 'border-gold-400/60 text-gold-200 hover:bg-maroon-800'
      }`}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </button>
  );
}

function SmallBtn({ icon: Icon, label, onClick, danger }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-semibold transition ${
        danger ? 'border-red-300 text-red-700 hover:bg-red-50' : 'border-gold-400/70 text-maroon-700 hover:bg-gold-100'
      }`}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </button>
  );
}

function RequestRow({ amount, status, line, date, note }) {
  return (
    <li className="py-3">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-bold text-maroon-900">{formatRs(amount)}</p>
          <p className="truncate text-xs text-maroon-800/65">{line}</p>
          <p className="text-[11px] text-maroon-800/50">{formatDateTime(date)}</p>
        </div>
        <StatusBadge status={status} />
      </div>
      {note && <p className="mt-1 text-xs text-maroon-800/70">Note: {note}</p>}
    </li>
  );
}
