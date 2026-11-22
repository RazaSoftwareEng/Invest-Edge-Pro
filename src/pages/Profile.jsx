import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AtSign, ChevronRight, KeyRound, Lock, LogOut, Mail, Phone, Save, ShieldCheck, User } from 'lucide-react';
import { supabase, friendlyDbError } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { formatDate, formatRs, initials, normalizePkPhone } from '../lib/format';
import PageHeader from '../components/PageHeader';
import Input from '../components/Input';
import Notice from '../components/Notice';
import { Spinner } from '../components/Spinner';

export default function Profile() {
  const { user, profile, refreshProfile, updatePassword, signOut, isAdmin } = useAuth();
  const navigate = useNavigate();

  const [info, setInfo] = useState({ full_name: '', phone: '' });
  const [savingInfo, setSavingInfo] = useState(false);
  const [infoNotice, setInfoNotice] = useState({ type: 'info', message: '' });

  const [pw, setPw] = useState({ password: '', confirm: '' });
  const [savingPw, setSavingPw] = useState(false);
  const [pwNotice, setPwNotice] = useState({ type: 'info', message: '' });

  useEffect(() => {
    if (profile) setInfo({ full_name: profile.full_name ?? '', phone: profile.phone ?? '' });
  }, [profile]);

  const username = profile?.username ?? user?.user_metadata?.username ?? '';

  async function saveInfo(e) {
    e.preventDefault();
    const phone = normalizePkPhone(info.phone);
    if (!info.full_name.trim()) {
      setInfoNotice({ type: 'error', message: 'Full name cannot be empty.' });
      return;
    }
    if (!phone) {
      setInfoNotice({ type: 'error', message: 'Enter a valid mobile number, e.g. 03001234567.' });
      return;
    }
    setSavingInfo(true);
    const { error } = await supabase
      .from('profiles')
      .update({ full_name: info.full_name.trim(), phone })
      .eq('id', user.id);
    setSavingInfo(false);
    if (error) {
      setInfoNotice({ type: 'error', message: friendlyDbError(error) });
      return;
    }
    setInfoNotice({ type: 'success', message: 'Profile updated.' });
    refreshProfile();
  }

  async function savePassword(e) {
    e.preventDefault();
    if (pw.password.length < 6) {
      setPwNotice({ type: 'error', message: 'Password must be at least 6 characters.' });
      return;
    }
    if (pw.password !== pw.confirm) {
      setPwNotice({ type: 'error', message: 'Passwords do not match.' });
      return;
    }
    setSavingPw(true);
    try {
      await updatePassword(pw.password);
      setPw({ password: '', confirm: '' });
      setPwNotice({ type: 'success', message: 'Password changed successfully.' });
    } catch (err) {
      setPwNotice({ type: 'error', message: err.message });
    } finally {
      setSavingPw(false);
    }
  }

  async function logout() {
    await signOut();
    navigate('/login', { replace: true });
  }

  return (
    <div className="space-y-5">
      <PageHeader title="My Account" subtitle="Manage your profile and security" />

      <section className="card-dark flex items-center gap-4">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border-2 border-gold-400 bg-gradient-to-br from-gold-200 to-gold-500 font-display text-xl font-bold text-maroon-900">
          {initials(profile?.full_name || username)}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-xl font-bold text-cream-50">{profile?.full_name || username}</p>
          <p className="text-xs text-gold-200/80">@{username}</p>
          <p className="mt-1 text-xs text-cream-100/60">
            Balance {formatRs(profile?.balance ?? 0)} · Joined {formatDate(profile?.created_at)}
          </p>
        </div>
      </section>

      {isAdmin && (
        <Link to="/admin" className="card flex items-center gap-3 py-4 transition hover:brightness-105">
          <ShieldCheck className="h-6 w-6 text-maroon-600" />
          <span className="flex-1 font-semibold text-maroon-900">Open Admin Panel</span>
          <ChevronRight className="h-5 w-5 text-maroon-600" />
        </Link>
      )}

      <form onSubmit={saveInfo} className="card space-y-4" noValidate>
        <h2 className="section-title">Personal Information</h2>
        <Notice
          type={infoNotice.type}
          message={infoNotice.message}
          onClose={() => setInfoNotice({ type: 'info', message: '' })}
        />
        <Input icon={AtSign} label="Username" value={username} disabled readOnly hint="Username cannot be changed." />
        {profile?.email && <Input icon={Mail} label="Email" value={profile.email} disabled readOnly />}
        <Input
          icon={User}
          label="Full Name"
          placeholder="Your full name"
          value={info.full_name}
          onChange={(e) => setInfo((s) => ({ ...s, full_name: e.target.value }))}
          maxLength={80}
        />
        <Input
          icon={Phone}
          type="tel"
          label="Phone Number"
          placeholder="03XXXXXXXXX"
          value={info.phone}
          onChange={(e) => setInfo((s) => ({ ...s, phone: e.target.value }))}
        />
        <button type="submit" className="btn-primary w-full" disabled={savingInfo}>
          {savingInfo ? <Spinner className="h-4 w-4" /> : <Save className="h-4 w-4" />}
          Save Changes
        </button>
      </form>

      <form onSubmit={savePassword} className="card space-y-4" noValidate>
        <h2 className="section-title flex items-center gap-2">
          <KeyRound className="h-5 w-5 text-gold-600" /> Change Password
        </h2>
        <Notice type={pwNotice.type} message={pwNotice.message} onClose={() => setPwNotice({ type: 'info', message: '' })} />
        <Input
          icon={Lock}
          type="password"
          label="New Password"
          placeholder="At least 6 characters"
          autoComplete="new-password"
          value={pw.password}
          onChange={(e) => setPw((s) => ({ ...s, password: e.target.value }))}
        />
        <Input
          icon={ShieldCheck}
          type="password"
          label="Confirm New Password"
          placeholder="Re-enter new password"
          autoComplete="new-password"
          value={pw.confirm}
          onChange={(e) => setPw((s) => ({ ...s, confirm: e.target.value }))}
        />
        <button type="submit" className="btn-primary w-full" disabled={savingPw}>
          {savingPw ? <Spinner className="h-4 w-4" /> : <KeyRound className="h-4 w-4" />}
          Update Password
        </button>
      </form>

      <button type="button" onClick={logout} className="btn-gold w-full py-3.5">
        <LogOut className="h-4 w-4" /> Logout
      </button>
    </div>
  );
}
