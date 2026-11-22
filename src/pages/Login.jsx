import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Lock, LogIn, User } from 'lucide-react';
import AuthShell from '../components/AuthShell';
import Input from '../components/Input';
import Notice from '../components/Notice';
import { Spinner } from '../components/Spinner';
import { useAuth } from '../context/AuthContext';
import { getRememberMe, getRememberedUsername, setRememberMe } from '../lib/supabase';
import { isPreview } from '../lib/preview';

export default function Login() {
  const { signIn, session } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState(() => ({ username: getRememberedUsername(), password: '' }));
  const [remember, setRemember] = useState(() => getRememberMe());
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const from = location.state?.from?.pathname;
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    if (session && isPreview()) {
      setError('Preview mode — login is disabled. Click "Exit preview" to return.');
      return;
    }
    if (!form.username.trim() || !form.password) {
      setError('Please enter your username/email and password.');
      return;
    }
    setBusy(true);
    setRememberMe(remember, form.username);
    try {
      const res = await signIn(form.username, form.password);
      // Admins land on the admin console, users on their dashboard
      navigate(from || (res.profile?.is_admin ? '/admin' : '/dashboard'), { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell
      title="Welcome Back"
      subtitle="Sign in to continue to your account"
      footer={
        <>
          Don&apos;t have an account?{' '}
          <Link to="/register" className="font-semibold text-gold-300 underline-offset-4 hover:underline">
            Create one
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <Notice type="error" message={error} />
        <Input
          icon={User}
          label="Username or Email"
          placeholder="Enter username or email"
          autoComplete="username"
          autoCapitalize="none"
          value={form.username}
          onChange={set('username')}
        />
        <Input
          icon={Lock}
          type="password"
          label="Password"
          placeholder="Enter your password"
          autoComplete="current-password"
          value={form.password}
          onChange={set('password')}
        />
        <label className="flex cursor-pointer select-none items-center gap-2.5 pl-2">
          <input
            type="checkbox"
            checked={remember}
            onChange={(e) => setRemember(e.target.checked)}
            className="h-4 w-4 rounded border-gold-400 accent-maroon-600"
          />
          <span className="text-sm text-maroon-800">Remember me</span>
        </label>
        <button type="submit" className="btn-primary mt-2 w-full py-3.5" disabled={busy}>
          {busy ? <Spinner className="h-4 w-4" /> : <LogIn className="h-4 w-4" />}
          {busy ? 'Signing in…' : 'Login'}
        </button>
      </form>
    </AuthShell>
  );
}
