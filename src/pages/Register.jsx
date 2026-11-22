import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Lock, Phone, ShieldCheck, User, UserPlus } from 'lucide-react';
import AuthShell from '../components/AuthShell';
import Input from '../components/Input';
import Notice from '../components/Notice';
import { Spinner } from '../components/Spinner';
import { useAuth } from '../context/AuthContext';
import { normalizePkPhone } from '../lib/format';

const USERNAME_RE = /^[a-zA-Z0-9_]{3,20}$/;

export default function Register() {
  const { signUp } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: '', phone: '', password: '', confirm: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  function validate() {
    if (!USERNAME_RE.test(form.username.trim()))
      return 'Username must be 3–20 characters: letters, numbers or underscore only.';
    if (!normalizePkPhone(form.phone)) return 'Enter a valid mobile number, e.g. 03001234567.';
    if (form.password.length < 6) return 'Password must be at least 6 characters.';
    if (form.password !== form.confirm) return 'Passwords do not match.';
    return '';
  }

  async function onSubmit(e) {
    e.preventDefault();
    const problem = validate();
    setError(problem);
    if (problem) return;

    setBusy(true);
    try {
      await signUp({
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
          icon={User}
          label="Username"
          placeholder="e.g. ali_khan"
          autoComplete="username"
          autoCapitalize="none"
          value={form.username}
          onChange={set('username')}
          hint="Letters, numbers and underscore. Used to log in."
        />
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
        <Input
          icon={ShieldCheck}
          type="password"
          label="Confirm Password"
          placeholder="Re-enter password"
          autoComplete="new-password"
          value={form.confirm}
          onChange={set('confirm')}
        />
        <button type="submit" className="btn-primary mt-2 w-full py-3.5" disabled={busy}>
          {busy ? <Spinner className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
          {busy ? 'Creating account…' : 'Register'}
        </button>
      </form>
    </AuthShell>
  );
}
