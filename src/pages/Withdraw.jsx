import { useCallback, useEffect, useState } from 'react';
import { ArrowUpFromLine, Banknote, ChevronLeft, CreditCard, Landmark, Receipt, Send, UserRound } from 'lucide-react';
import { supabase, friendlyDbError } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { MIN_WITHDRAWAL } from '../config';
import { formatDateTime, formatRs, methodName } from '../lib/format';
import PageHeader from '../components/PageHeader';
import MethodPicker from '../components/MethodPicker';
import Input from '../components/Input';
import Notice from '../components/Notice';
import StatusBadge from '../components/StatusBadge';
import EmptyState from '../components/EmptyState';
import { CardLoader, Spinner } from '../components/Spinner';

const EMPTY = { method: 'jazzcash', amount: '', accountNumber: '', accountName: '', bankName: '' };

export default function Withdraw() {
  const { user, profile, refreshProfile } = useAuth();
  const [form, setForm] = useState(EMPTY);
  const [step, setStep] = useState('form'); // form | review
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState({ type: 'info', message: '' });
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);

  const balance = Number(profile?.balance ?? 0);
  const isBank = form.method === 'bank';
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const loadHistory = useCallback(async () => {
    const { data } = await supabase
      .from('withdrawals')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);
    setHistory(data ?? []);
    setHistoryLoading(false);
  }, [user.id]);

  useEffect(() => {
    refreshProfile();
    loadHistory();
  }, [refreshProfile, loadHistory]);

  function toReview(e) {
    e.preventDefault();
    const amt = Number(form.amount);
    let problem = '';
    if (!amt || amt < MIN_WITHDRAWAL) problem = `Minimum withdrawal is ${formatRs(MIN_WITHDRAWAL)}.`;
    else if (amt > balance) problem = 'Amount exceeds your available balance.';
    else if (isBank && !form.bankName.trim()) problem = 'Please enter your bank name.';
    else if (form.accountNumber.trim().length < 6) problem = 'Please enter a valid account number.';
    else if (form.accountName.trim().length < 3) problem = 'Please enter the account holder name.';
    if (problem) {
      setNotice({ type: 'error', message: problem });
      return;
    }
    setNotice({ type: 'info', message: '' });
    setStep('review');
  }

  async function submit() {
    setBusy(true);
    const { error } = await supabase.rpc('request_withdrawal', {
      p_method: form.method,
      p_amount: Math.round(Number(form.amount) * 100) / 100,
      p_account_number: form.accountNumber.trim(),
      p_account_name: form.accountName.trim(),
      p_bank_name: isBank ? form.bankName.trim() : null,
    });
    setBusy(false);
    if (error) {
      setNotice({ type: 'error', message: friendlyDbError(error) });
      setStep('form');
      return;
    }
    setForm(EMPTY);
    setStep('form');
    setNotice({
      type: 'success',
      message: 'Withdrawal requested! The amount is on hold and will be sent after admin review.',
    });
    refreshProfile();
    loadHistory();
  }

  return (
    <div className="space-y-5">
      <PageHeader title="Withdraw" subtitle="Cash out to your account" back />

      <section className="card-dark flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-gold-200/80">Available Balance</p>
          <p className="mt-1 font-display text-3xl font-bold gold-text">{formatRs(balance)}</p>
        </div>
        <ArrowUpFromLine className="h-10 w-10 text-gold-300/70" />
      </section>

      {step === 'form' ? (
        <form onSubmit={toReview} className="card space-y-4" noValidate>
          <Notice type={notice.type} message={notice.message} onClose={() => setNotice({ type: 'info', message: '' })} />
          <div>
            <p className="label">Withdrawal method</p>
            <MethodPicker value={form.method} onChange={(m) => setForm((f) => ({ ...f, method: m }))} />
          </div>
          <Input
            icon={Banknote}
            type="number"
            inputMode="decimal"
            label="Amount (Rs)"
            placeholder={`Minimum ${MIN_WITHDRAWAL}`}
            value={form.amount}
            onChange={set('amount')}
          />
          {isBank && (
            <Input icon={Landmark} label="Bank Name" placeholder="e.g. Meezan Bank" value={form.bankName} onChange={set('bankName')} />
          )}
          <Input
            icon={CreditCard}
            label={isBank ? 'Account Number / IBAN' : `${methodName(form.method)} Number`}
            placeholder={isBank ? 'PK00XXXX0000000000000000' : '03XXXXXXXXX'}
            value={form.accountNumber}
            onChange={set('accountNumber')}
          />
          <Input
            icon={UserRound}
            label="Account Holder Name"
            placeholder="As registered on the account"
            value={form.accountName}
            onChange={set('accountName')}
          />
          <button type="submit" className="btn-primary w-full py-3.5" disabled={balance <= 0}>
            Review Withdrawal
          </button>
          {balance <= 0 && <p className="text-center text-xs text-maroon-800/60">You have no balance to withdraw.</p>}
        </form>
      ) : (
        <section className="card space-y-4 animate-pop">
          <h2 className="section-title">Review &amp; Confirm</h2>
          <div className="rounded-2xl border border-gold-400/60 bg-white/70 p-4 text-sm">
            <ReviewRow label="Method" value={methodName(form.method)} />
            {isBank && <ReviewRow label="Bank" value={form.bankName} />}
            <ReviewRow label="Account Number" value={form.accountNumber} />
            <ReviewRow label="Account Holder" value={form.accountName} />
            <div className="divider my-2" />
            <ReviewRow label="Amount" value={formatRs(form.amount)} strong />
            <ReviewRow label="Balance after" value={formatRs(balance - Number(form.amount))} />
          </div>
          <Notice
            type="info"
            message="The amount will be held from your balance now. If the admin rejects the request, it is refunded to your wallet."
          />
          <div className="flex gap-3">
            <button type="button" className="btn-outline flex-1" onClick={() => setStep('form')} disabled={busy}>
              <ChevronLeft className="h-4 w-4" /> Edit
            </button>
            <button type="button" className="btn-primary flex-[2]" onClick={submit} disabled={busy}>
              {busy ? <Spinner className="h-4 w-4" /> : <Send className="h-4 w-4" />}
              {busy ? 'Submitting…' : 'Confirm & Submit'}
            </button>
          </div>
        </section>
      )}

      <section className="card">
        <h2 className="section-title mb-2 flex items-center gap-2">
          <Receipt className="h-5 w-5 text-gold-600" /> Withdrawal History
        </h2>
        {historyLoading ? (
          <CardLoader />
        ) : history.length === 0 ? (
          <EmptyState title="No withdrawals yet" text="Your withdrawal requests will be listed here." />
        ) : (
          <ul className="divide-y divide-gold-400/30">
            {history.map((w) => (
              <li key={w.id} className="py-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-maroon-900">{formatRs(w.amount)}</p>
                    <p className="truncate text-xs text-maroon-800/65">
                      {methodName(w.method)} · {w.account_number} · {w.account_name}
                    </p>
                    <p className="text-[11px] text-maroon-800/50">{formatDateTime(w.created_at)}</p>
                  </div>
                  <StatusBadge status={w.status} />
                </div>
                {w.admin_note && (
                  <p
                    className={`mt-1.5 rounded-xl px-3 py-1.5 text-xs ${
                      w.status === 'rejected' ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'
                    }`}
                  >
                    Note: {w.admin_note}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function ReviewRow({ label, value, strong }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1">
      <span className="text-maroon-800/70">{label}</span>
      <span className={`truncate text-right ${strong ? 'font-bold text-maroon-900' : 'font-medium text-maroon-900'}`}>{value}</span>
    </div>
  );
}
