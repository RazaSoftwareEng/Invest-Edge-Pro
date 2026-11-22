import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AtSign, Lock, Mail, Phone, UserPlus, UserRound } from 'lucide-react';
import AuthShell from '../components/AuthShell';
import Input from '../components/Input';
import Notice from '../components/Notice';
import { Spinner } from '../components/Spinner';
import { useAuth } from '../context/AuthContext';
import { nameFromEmail, normalizePkPhone } from '../lib/format';
import { isPreview } from '../lib/preview';

const USERNAME_RE = /^[a-zA-Z0-9_]{3,15}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** "Ali.Khan-92@gmail.com" -> "alikhan92" (letters/numbers/underscore, 3–15 chars) */
function usernameFromEmail(email) {
  let base = String(email.split('@')[0] || '')
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '')
    .slice(0, 15);
  if (base && base.length < 3) base = (base + Math.floor(100 + Math.random() * 900)).slice(0, 15);
  return base;
}

export default function Register() {
  const { signUp, session } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', fullName: '', username: '', phone: '', password: '' });
  const [usernameEdited, setUsernameEdited] = useState(false);
  const [nameEdited, setNameEdited] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  function onEmailChange(e) {
    const email = e.target.value;
    setForm((f) => ({
      ...f,
      email,
      username: usernameEdited ? f.username : usernameFromEmail(email),
      fullName: nameEdited ? f.fullName : nameFromEmail(email),
    }));
  }

  function onNameChange(e) {
    setNameEdited(true);
    setForm((f) => ({ ...f, fullName: e.target.value.slice(0, 40) }));
  }

  function onUsernameChange(e) {
    const value = e.target.value;
    // Browser autofill (or a paste) may drop a full email here — keep only the username part.
    if (value.includes('@')) {
      setForm((f) => ({ ...f, username: usernameFromEmail(value) }));
      return;
    }
    setUsernameEdited(true);
    setForm((f) => ({ ...f, username: value.replace(/[^a-zA-Z0-9_]/g, '').slice(0, 15) }));
  }

  function validate() {
    if (!EMAIL_RE.test(form.email.trim())) return 'Please enter a valid email address.';
    if (form.fullName.trim().length < 2) return 'Please enter your full name.';
    if (!USERNAME_RE.test(form.username.trim()))
      return 'Username must be 3–15 characters: letters, numbers or underscore only.';
    if (!normalizePkPhone(form.phone)) return 'Enter a valid mobile number, e.g. 03001234567.';
    if (form.password.length < 6) return 'Password must be at least 6 characters.';
    return '';
  }

  async function onSubmit(e) {
    e.preventDefault();
    if (session && isPreview()) {
      setError('Preview mode — registration is disabled. Click "Exit preview" to return.');
      return;
    }
    const problem = validate();
    setError(problem);
    if (problem) return;

    setBusy(true);
    try {
      await signUp({
        email: form.email.trim(),
        fullName: form.fullName.trim(),
        username: form.username.trim(),
        phone: normalizePkPhone(form.phone),
        password: form.password,
      });
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell
      title="Create Account"
      subtitle="Join in seconds — no verification needed"
      footer={
        <>
          Already have an account?{' '}
          <Link to="/login" className="font-semibold text-gold-300 underline-offset-4 hover:underline">
            Login
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <Notice type="error" message={error} />
        <Input
          icon={Mail}
          type="email"
          label="Email"
          placeholder="you@example.com"
          autoComplete="email"
          autoCapitalize="none"
          inputMode="email"
          value={form.email}
          onChange={onEmailChange}
        />
        <div>
          <div className="grid grid-cols-2 gap-3">
            <Input
              icon={UserRound}
              label="Full Name"
              placeholder="Your name"
              autoComplete="name"
              value={form.fullName}
              onChange={onNameChange}
            />
            <Input
              icon={AtSign}
              label="Username"
              placeholder="username"
              autoComplete="off"
              name="new-username"
              maxLength={15}
              autoCapitalize="none"
              value={form.username}
              onChange={onUsernameChange}
            />
          </div>
          <p className="mt-1 pl-3 text-[11px] text-maroon-800/60">
            Auto-filled from your email — you can edit both. Log in with email or username.
          </p>
        </div>
        <Input
          icon={Phone}
          type="tel"
          label="Phone Number"
          placeholder="03XXXXXXXXX"
          autoComplete="tel"
          inputMode="tel"
          value={form.phone}
          onChange={set('phone')}
        />
        <Input
          icon={Lock}
          type="password"
          label="Password"
          placeholder="At least 6 characters"
          autoComplete="new-password"
          value={form.password}
          onChange={set('password')}
        />
        <button type="submit" className="btn-primary mt-2 w-full py-3.5" disabled={busy}>
          {busy ? <Spinner className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
          {busy ? 'Creating account…' : 'Register'}
        </button>
      </form>
    </AuthShell>
  );
}
