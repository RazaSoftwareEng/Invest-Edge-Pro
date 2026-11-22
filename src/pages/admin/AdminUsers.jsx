import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronRight, Crown, Lock, Mail, Phone, Search, ShieldCheck, User, UserPlus, Users, Wallet } from 'lucide-react';
import { supabase, friendlyDbError, getSignupClient, usernameToEmail } from '../../lib/supabase';
import { formatDate, formatRs, initials, nameFromEmail, normalizePkPhone } from '../../lib/format';
import PageHeader from '../../components/PageHeader';
import Input from '../../components/Input';
import Notice from '../../components/Notice';
import EmptyState from '../../components/EmptyState';
import { CardLoader } from '../../components/Spinner';
import AdminFormModal from './AdminFormModal';

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'active', label: 'Active plan' },
  { id: 'none', label: 'No plan' },
  { id: 'admins', label: 'Admins' },
];

export default function AdminUsers() {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [activeSubs, setActiveSubs] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      const [usersRes, subsRes] = await Promise.all([
        supabase.from('profiles').select('*').order('created_at', { ascending: false }).limit(1000),
        supabase
          .from('subscriptions')
          .select('user_id, plan_name, expires_at')
          .gt('expires_at', new Date().toISOString())
          .order('expires_at', { ascending: true }),
      ]);
      if (!active) return;
      if (usersRes.error) setError(friendlyDbError(usersRes.error));
      // ascending order + overwrite => keeps the latest-expiring active plan per user
      const map = {};
      (subsRes.data ?? []).forEach((s) => {
        map[s.user_id] = s;
      });
      setUsers(usersRes.data ?? []);
      setActiveSubs(map);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return users.filter((u) => {
      if (filter === 'active' && !activeSubs[u.id]) return false;
      if (filter === 'none' && activeSubs[u.id]) return false;
      if (filter === 'admins' && !u.is_admin) return false;
      if (!q) return true;
      return (
        u.username?.toLowerCase().includes(q) ||
        u.full_name?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q) ||
        u.phone?.includes(q)
      );
    });
  }, [users, activeSubs, query, filter]);

  const totalBalance = users.reduce((s, u) => s + Number(u.balance || 0), 0);

  return (
    <div className="space-y-3">
      <PageHeader
        title="Users"
        subtitle="Tap a user to view & manage"
        right={
          <button type="button" className="btn-gold px-4 py-2" onClick={() => setAdding(true)}>
            <UserPlus className="h-4 w-4" /> Add
          </button>
        }
      />

      <div className="grid grid-cols-3 gap-2">
        <Stat icon={Users} label="Users" value={users.length} />
        <Stat icon={Crown} label="Active plans" value={Object.keys(activeSubs).length} />
        <Stat icon={Wallet} label="Total wallets" value={formatRs(totalBalance)} small />
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-maroon-600/70" />
        <input
          className="input-field pl-11 pr-4"
          placeholder="Search username, name, email or phone"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
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

      <Notice type="error" message={error} />

      <section className="card p-2 sm:p-3">
        {loading ? (
          <CardLoader />
        ) : filtered.length === 0 ? (
          <EmptyState icon={Users} title="No users found" />
        ) : (
          <ul className="divide-y divide-gold-400/30">
            {filtered.map((u) => {
              const sub = activeSubs[u.id];
              return (
                <li key={u.id}>
                  <Link to={`/admin/users/${u.id}`} className="flex items-center gap-3 rounded-2xl px-2 py-3 transition hover:bg-white/70">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-gold-400 bg-gradient-to-br from-gold-100 to-gold-300 text-xs font-bold text-maroon-900">
                      {initials(u.full_name || u.username)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-1 truncate text-sm font-semibold text-maroon-900">
                        @{u.username}
                        {u.is_admin && <ShieldCheck className="h-3.5 w-3.5 text-maroon-600" aria-label="Admin" />}
                      </p>
                      <p className="truncate text-xs text-maroon-800/65">
                        {u.full_name || '—'} · {u.phone || 'no phone'}
                      </p>
                      <p className="truncate text-[11px] text-maroon-800/55">
                        {sub ? (
                          <span className="font-semibold text-emerald-700">
                            {sub.plan_name} · until {formatDate(sub.expires_at)}
                          </span>
                        ) : (
                          'No active plan'
                        )}{' '}
                        · joined {formatDate(u.created_at)}
                      </p>
                    </div>
                    <p className="shrink-0 text-sm font-bold text-maroon-800">{formatRs(u.balance)}</p>
                    <ChevronRight className="h-4 w-4 shrink-0 text-maroon-600/60" />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {adding && <AddUserModal onClose={() => setAdding(false)} onCreated={(id) => navigate(`/admin/users/${id}`)} />}
    </div>
  );
}

function AddUserModal({ onClose, onCreated }) {
  const [form, setForm] = useState({ email: '', username: '', full_name: '', phone: '', password: '' });
  const [usernameEdited, setUsernameEdited] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  function onEmailChange(e) {
    const email = e.target.value;
    const auto = email.split('@')[0].toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 15);
    setForm((f) => ({ ...f, email, username: usernameEdited ? f.username : auto, full_name: f.full_name && f.nameEdited ? f.full_name : nameFromEmail(email) }));
  }

  async function submit() {
    const username = form.username.trim();
    const email = form.email.trim().toLowerCase();
    const phone = normalizePkPhone(form.phone);
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return 'Enter a valid email or leave it empty.';
    if (!/^[a-zA-Z0-9_]{3,15}$/.test(username)) return 'Username must be 3–15 letters, numbers or underscore.';
    if (!phone) return 'Enter a valid mobile number, e.g. 03001234567.';
    if (form.password.length < 6) return 'Password must be at least 6 characters.';

    // Isolated client: creating the user does NOT log the admin out.
    const client = getSignupClient();
    const { data, error } = await client.auth.signUp({
      email: usernameToEmail(username),
      password: form.password,
      options: { data: { username, phone, email: email || null, full_name: form.full_name.trim() || username } },
    });
    if (error) {
      if (/already registered|already exists|database error saving/i.test(error.message))
        return 'This username or email is already registered.';
      return error.message;
    }
    if (data.session) await client.auth.signOut({ scope: 'local' });
    if (!data.user?.id) return 'User could not be created.';
    onCreated(data.user.id);
    return null;
  }

  return (
    <AdminFormModal title="Add New User" submitLabel="Create User" onClose={onClose} onSubmit={submit}>
      <Input icon={Mail} type="email" label="Email (optional)" placeholder="user@example.com" autoCapitalize="none" value={form.email} onChange={onEmailChange} />
      <Input
        icon={User}
        label="Username"
        placeholder="Auto-filled from email"
        autoCapitalize="none"
        value={form.username}
        autoComplete="off"
        maxLength={15}
        onChange={(e) => {
          const v = e.target.value;
          if (v.includes('@')) {
            setForm((f) => ({ ...f, username: v.split('@')[0].toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 15) }));
            return;
          }
          setUsernameEdited(true);
          setForm((f) => ({ ...f, username: v.replace(/[^a-zA-Z0-9_]/g, '').slice(0, 15) }));
        }}
      />
      <Input icon={User} label="Full Name" placeholder="Auto-filled from email" value={form.full_name} onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value, nameEdited: true }))} />
      <Input icon={Phone} type="tel" label="Phone" placeholder="03XXXXXXXXX" value={form.phone} onChange={set('phone')} />
      <Input icon={Lock} type="password" label="Password" placeholder="At least 6 characters" value={form.password} onChange={set('password')} />
      <p className="text-xs text-maroon-800/65">The user can log in right away with this username and password.</p>
    </AdminFormModal>
  );
}

function Stat({ icon: Icon, label, value, small }) {
  return (
    <div className="rounded-2xl border border-gold-400/40 bg-maroon-950/40 px-3 py-2.5 text-center">
      <Icon className="mx-auto mb-1 h-4 w-4 text-gold-300" />
      <p className={`font-bold text-gold-200 ${small ? 'text-xs' : 'text-lg'}`}>{value}</p>
      <p className="text-[10px] uppercase tracking-wider text-cream-100/60">{label}</p>
    </div>
  );
}
