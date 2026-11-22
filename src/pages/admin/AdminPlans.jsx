import { useCallback, useEffect, useState } from 'react';
import { CalendarDays, Gem, Pencil, Plus, Power, Save } from 'lucide-react';
import { supabase, friendlyDbError } from '../../lib/supabase';
import { formatRs } from '../../lib/format';
import Modal from '../../components/Modal';
import PageHeader from '../../components/PageHeader';
import Notice from '../../components/Notice';
import Input from '../../components/Input';
import EmptyState from '../../components/EmptyState';
import { CardLoader, Spinner } from '../../components/Spinner';

const BLANK = { id: null, name: '', price: '', duration_days: '', benefits: '', sort_order: '0', active: true };

export default function AdminPlans() {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [togglingId, setTogglingId] = useState(null);

  const load = useCallback(async () => {
    const { data, error: err } = await supabase.from('plans').select('*').order('price', { ascending: true }).order('sort_order');
    setError(err ? friendlyDbError(err) : '');
    setPlans(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function openNew() {
    setFormError('');
    setEditing({ ...BLANK, sort_order: String(plans.length + 1) });
  }

  function openEdit(plan) {
    setFormError('');
    setEditing({
      id: plan.id,
      name: plan.name,
      price: String(plan.price),
      duration_days: String(plan.duration_days),
      benefits: (plan.benefits ?? []).join('\n'),
      sort_order: String(plan.sort_order ?? 0),
      active: plan.active,
    });
  }

  const setField = (key) => (e) => setEditing((f) => ({ ...f, [key]: e.target.value }));

  async function save(e) {
    e.preventDefault();
    const price = Number(editing.price);
    const duration = parseInt(editing.duration_days, 10);
    if (!editing.name.trim()) return setFormError('Plan name is required.');
    if (!price || price <= 0) return setFormError('Price must be greater than 0.');
    if (!duration || duration <= 0) return setFormError('Duration must be at least 1 day.');

    const payload = {
      name: editing.name.trim(),
      price: Math.round(price * 100) / 100,
      duration_days: duration,
      benefits: editing.benefits
        .split('\n')
        .map((b) => b.trim())
        .filter(Boolean),
      sort_order: parseInt(editing.sort_order, 10) || 0,
      active: editing.active,
    };

    setSaving(true);
    const { error: err } = editing.id
      ? await supabase.from('plans').update(payload).eq('id', editing.id)
      : await supabase.from('plans').insert(payload);
    setSaving(false);
    if (err) return setFormError(friendlyDbError(err));

    setSuccess(editing.id ? `Plan "${payload.name}" updated.` : `Plan "${payload.name}" created.`);
    setEditing(null);
    load();
  }

  async function toggleActive(plan) {
    setTogglingId(plan.id);
    const { error: err } = await supabase.from('plans').update({ active: !plan.active }).eq('id', plan.id);
    setTogglingId(null);
    if (err) {
      setError(friendlyDbError(err));
      return;
    }
    setSuccess(`Plan "${plan.name}" ${plan.active ? 'deactivated' : 'activated'}.`);
    load();
  }

  return (
    <div className="space-y-3">
      <PageHeader title="Membership Plans" subtitle="Create, edit and deactivate plans" />
      <button type="button" className="btn-gold w-full" onClick={openNew}>
        <Plus className="h-4 w-4" /> Create New Plan
      </button>

      <Notice type="success" message={success} onClose={() => setSuccess('')} />
      <Notice type="error" message={error} />

      {loading ? (
        <div className="card">
          <CardLoader />
        </div>
      ) : plans.length === 0 ? (
        <div className="card">
          <EmptyState icon={Gem} title="No plans yet" text="Create your first membership plan." />
        </div>
      ) : (
        plans.map((p) => (
          <article key={p.id} className={`card p-4 ${p.active ? '' : 'opacity-70'}`}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-display text-lg font-bold text-maroon-900">{p.name}</h3>
                <p className="text-sm font-semibold text-maroon-700">{formatRs(p.price)}</p>
                <p className="flex items-center gap-1 text-xs text-maroon-800/65">
                  <CalendarDays className="h-3.5 w-3.5" /> {p.duration_days} days · order {p.sort_order}
                </p>
              </div>
              <span
                className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1 ${
                  p.active ? 'bg-emerald-100 text-emerald-800 ring-emerald-300' : 'bg-gray-100 text-gray-600 ring-gray-300'
                }`}
              >
                {p.active ? 'Active' : 'Inactive'}
              </span>
            </div>
            {p.benefits?.length > 0 && (
              <ul className="mt-2 list-inside list-disc text-xs text-maroon-900/75">
                {p.benefits.map((b) => (
                  <li key={b}>{b}</li>
                ))}
              </ul>
            )}
            <div className="mt-3 flex gap-2">
              <button type="button" className="btn-outline flex-1 py-2" onClick={() => openEdit(p)}>
                <Pencil className="h-4 w-4" /> Edit
              </button>
              <button
                type="button"
                className={`${p.active ? 'btn-danger' : 'btn-success'} flex-1 py-2`}
                onClick={() => toggleActive(p)}
                disabled={togglingId === p.id}
              >
                {togglingId === p.id ? <Spinner className="h-4 w-4" /> : <Power className="h-4 w-4" />}
                {p.active ? 'Deactivate' : 'Activate'}
              </button>
            </div>
          </article>
        ))
      )}

      <Modal open={Boolean(editing)} onClose={() => !saving && setEditing(null)} title={editing?.id ? 'Edit Plan' : 'New Plan'}>
        {editing && (
          <form onSubmit={save} className="space-y-3" noValidate>
            <Notice type="error" message={formError} />
            <Input label="Plan Name" placeholder="e.g. Gold" value={editing.name} onChange={setField('name')} maxLength={50} />
            <div className="grid grid-cols-2 gap-3">
              <Input label="Price (Rs)" type="number" inputMode="decimal" value={editing.price} onChange={setField('price')} />
              <Input
                label="Duration (days)"
                type="number"
                inputMode="numeric"
                value={editing.duration_days}
                onChange={setField('duration_days')}
              />
            </div>
            <Input label="Sort Order" type="number" inputMode="numeric" value={editing.sort_order} onChange={setField('sort_order')} />
            <div>
              <label className="label" htmlFor="plan-benefits">
                Benefits (one per line)
              </label>
              <textarea
                id="plan-benefits"
                rows={5}
                className="textarea-field"
                placeholder={'Daily signals\nPriority support'}
                value={editing.benefits}
                onChange={setField('benefits')}
              />
            </div>
            <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-gold-400/60 bg-white/70 px-4 py-3">
              <input
                type="checkbox"
                checked={editing.active}
                onChange={(e) => setEditing((f) => ({ ...f, active: e.target.checked }))}
                className="h-4 w-4 accent-maroon-600"
              />
              <span className="text-sm font-medium text-maroon-900">Active (visible to users)</span>
            </label>
            <button type="submit" className="btn-primary w-full" disabled={saving}>
              {saving ? <Spinner className="h-4 w-4" /> : <Save className="h-4 w-4" />}
              {editing.id ? 'Save Changes' : 'Create Plan'}
            </button>
          </form>
        )}
      </Modal>
    </div>
  );
}
