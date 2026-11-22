import { useCallback, useEffect, useRef, useState } from 'react';
import { Banknote, Hash, ImagePlus, Info, Receipt, Send, Trash2 } from 'lucide-react';
import { supabase, friendlyDbError } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { MAX_PROOF_SIZE_MB, MIN_DEPOSIT, PAYMENT_METHODS } from '../config';
import { formatDateTime, formatRs, methodName } from '../lib/format';
import PageHeader from '../components/PageHeader';
import MethodPicker from '../components/MethodPicker';
import CopyField from '../components/CopyField';
import Input from '../components/Input';
import Notice from '../components/Notice';
import StatusBadge from '../components/StatusBadge';
import EmptyState from '../components/EmptyState';
import { CardLoader, Spinner } from '../components/Spinner';

const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/webp'];

export default function Deposit() {
  const { user } = useAuth();
  const [method, setMethod] = useState(PAYMENT_METHODS[0].id);
  const [amount, setAmount] = useState('');
  const [txnId, setTxnId] = useState('');
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState({ type: 'info', message: '' });
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const fileRef = useRef(null);

  const selected = PAYMENT_METHODS.find((m) => m.id === method);

  const loadHistory = useCallback(async () => {
    const { data } = await supabase
      .from('deposits')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);
    setHistory(data ?? []);
    setHistoryLoading(false);
  }, [user.id]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  useEffect(
    () => () => {
      if (preview) URL.revokeObjectURL(preview);
    },
    [preview],
  );

  function onFileChange(e) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!ALLOWED_TYPES.includes(f.type)) {
      setNotice({ type: 'error', message: 'Please upload a PNG, JPG or WEBP image.' });
      e.target.value = '';
      return;
    }
    if (f.size > MAX_PROOF_SIZE_MB * 1024 * 1024) {
      setNotice({ type: 'error', message: `Screenshot must be smaller than ${MAX_PROOF_SIZE_MB} MB.` });
      e.target.value = '';
      return;
    }
    setNotice({ type: 'info', message: '' });
    setFile(f);
    setPreview(URL.createObjectURL(f));
  }

  function clearFile() {
    setFile(null);
    setPreview('');
    if (fileRef.current) fileRef.current.value = '';
  }

  async function onSubmit(e) {
    e.preventDefault();
    const amt = Number(amount);
    if (!amt || amt < MIN_DEPOSIT) {
      setNotice({ type: 'error', message: `Minimum deposit is ${formatRs(MIN_DEPOSIT)}.` });
      return;
    }
    if (txnId.trim().length < 4) {
      setNotice({ type: 'error', message: 'Please enter a valid transaction ID.' });
      return;
    }
    if (!file) {
      setNotice({ type: 'error', message: 'Please upload a screenshot of your payment.' });
      return;
    }

    setBusy(true);
    setNotice({ type: 'info', message: '' });

    const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg';
    const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from('proofs')
      .upload(path, file, { contentType: file.type, upsert: false });

    if (uploadError) {
      setBusy(false);
      setNotice({ type: 'error', message: `Upload failed: ${uploadError.message}` });
      return;
    }

    const { error: insertError } = await supabase.from('deposits').insert({
      user_id: user.id,
      method,
      amount: Math.round(amt * 100) / 100,
      transaction_id: txnId.trim(),
      proof_path: path,
    });

    if (insertError) {
      await supabase.storage.from('proofs').remove([path]);
      setBusy(false);
      setNotice({ type: 'error', message: friendlyDbError(insertError) });
      return;
    }

    setBusy(false);
    setAmount('');
    setTxnId('');
    clearFile();
    setNotice({
      type: 'success',
      message: 'Deposit submitted! It is now pending review — your balance updates once the admin approves it.',
    });
    loadHistory();
  }

  return (
    <div className="space-y-5">
      <PageHeader title="Deposit Funds" subtitle="Add money to your wallet" />

      <section className="card space-y-4">
        <div>
          <p className="label">1 · Choose payment method</p>
          <MethodPicker value={method} onChange={setMethod} />
        </div>

        <div className="rounded-2xl border border-gold-400/60 bg-white/70 p-4">
          <p className="mb-1 flex items-center gap-1.5 text-sm font-bold text-maroon-900">
            <Banknote className="h-4 w-4 text-gold-600" /> Send payment to
          </p>
          {selected.bankName && <CopyField label="Bank" value={selected.bankName} />}
          <CopyField label="Account Title" value={selected.accountTitle} />
          <CopyField label={selected.id === 'bank' ? 'Account Number' : 'Mobile Account'} value={selected.accountNumber} />
          {selected.iban && <CopyField label="IBAN" value={selected.iban} />}
          <p className="mt-2 flex items-start gap-1.5 text-xs text-maroon-800/70">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            {selected.instructions}
          </p>
        </div>
      </section>

      <form onSubmit={onSubmit} className="card space-y-4" noValidate>
        <p className="label">2 · Submit payment details</p>
        <Notice type={notice.type} message={notice.message} onClose={() => setNotice({ type: 'info', message: '' })} />

        <Input
          icon={Banknote}
          type="number"
          inputMode="decimal"
          min={MIN_DEPOSIT}
          step="1"
          label="Amount (Rs)"
          placeholder={`Minimum ${MIN_DEPOSIT}`}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
        <Input
          icon={Hash}
          label="Transaction ID"
          placeholder="e.g. 0123456789"
          value={txnId}
          onChange={(e) => setTxnId(e.target.value)}
          maxLength={64}
        />

        <div>
          <p className="label">Payment Screenshot</p>
          {preview ? (
            <div className="relative overflow-hidden rounded-2xl border border-gold-400/70 bg-white">
              <img src={preview} alt="Payment proof preview" className="max-h-64 w-full object-contain" />
              <button
                type="button"
                onClick={clearFile}
                className="absolute right-2 top-2 flex items-center gap-1 rounded-full bg-maroon-900/85 px-3 py-1 text-xs font-semibold text-gold-200"
              >
                <Trash2 className="h-3.5 w-3.5" /> Remove
              </button>
            </div>
          ) : (
            <label className="flex cursor-pointer flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-gold-400/70 bg-white/60 px-4 py-6 text-center transition hover:bg-white">
              <ImagePlus className="h-7 w-7 text-maroon-600" />
              <span className="text-sm font-semibold text-maroon-800">Tap to upload screenshot</span>
              <span className="text-[11px] text-maroon-800/60">PNG, JPG or WEBP · max {MAX_PROOF_SIZE_MB} MB</span>
              <input
                ref={fileRef}
                type="file"
                accept={ALLOWED_TYPES.join(',')}
                onChange={onFileChange}
                className="hidden"
              />
            </label>
          )}
        </div>

        <button type="submit" className="btn-primary w-full py-3.5" disabled={busy}>
          {busy ? <Spinner className="h-4 w-4" /> : <Send className="h-4 w-4" />}
          {busy ? 'Submitting…' : 'Submit Deposit'}
        </button>
      </form>

      <section className="card">
        <h2 className="section-title mb-2 flex items-center gap-2">
          <Receipt className="h-5 w-5 text-gold-600" /> Deposit History
        </h2>
        {historyLoading ? (
          <CardLoader />
        ) : history.length === 0 ? (
          <EmptyState title="No deposits yet" text="Your submitted deposits will be listed here." />
        ) : (
          <ul className="divide-y divide-gold-400/30">
            {history.map((d) => (
              <li key={d.id} className="py-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-maroon-900">{formatRs(d.amount)}</p>
                    <p className="truncate text-xs text-maroon-800/65">
                      {methodName(d.method)} · TID {d.transaction_id}
                    </p>
                    <p className="text-[11px] text-maroon-800/50">{formatDateTime(d.created_at)}</p>
                  </div>
                  <StatusBadge status={d.status} />
                </div>
                {d.status === 'rejected' && d.admin_note && (
                  <p className="mt-1.5 rounded-xl bg-red-50 px-3 py-1.5 text-xs text-red-700">Reason: {d.admin_note}</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
