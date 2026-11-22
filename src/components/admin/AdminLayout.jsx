import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { ArrowDownToLine, ArrowUpFromLine, Eye, Gem, LayoutDashboard, LogOut, Users } from 'lucide-react';
import { startPreview, stopPreview } from '../../lib/preview';
import Logo from '../Logo';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { APP_NAME } from '../../config';

const NAV = [
  { to: '/admin', end: true, label: 'Dashboard', icon: LayoutDashboard },
  { to: '/admin/deposits', label: 'Deposits', icon: ArrowDownToLine, badge: 'deposits' },
  { to: '/admin/withdrawals', label: 'Withdraws', icon: ArrowUpFromLine, badge: 'withdrawals' },
  { to: '/admin/plans', label: 'Plans', icon: Gem },
  { to: '/admin/users', label: 'Users', icon: Users },
];

/** Separate shell for admins: distinct header, wider content, gold nav with pending-count badges. */
export default function AdminLayout() {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [pending, setPending] = useState({ deposits: 0, withdrawals: 0 });

  // Back in the console => leave Guest Preview mode
  useEffect(() => {
    stopPreview();
  }, []);

  function openPreview() {
    startPreview();
    navigate('/dashboard');
  }

  useEffect(() => {
    let active = true;
    Promise.all([
      supabase.from('deposits').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('withdrawals').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    ]).then(([d, w]) => {
      if (active) setPending({ deposits: d.count ?? 0, withdrawals: w.count ?? 0 });
    });
    return () => {
      active = false;
    };
  }, [location.pathname, location.key]);

  async function logout() {
    await signOut();
    navigate('/login', { replace: true });
  }

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b-2 border-gold-400/70 bg-maroon-950/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-[760px] items-center justify-between gap-3 px-4 py-3">
          <Link to="/admin" className="flex min-w-0 items-center gap-2.5">
            <Logo size={36} />
            <div className="min-w-0 leading-tight">
              <p className="truncate font-display text-base font-bold gold-text">{APP_NAME}</p>
              <span className="inline-block rounded-full bg-gradient-to-r from-gold-200 to-gold-500 px-2 py-px text-[9px] font-bold uppercase tracking-[0.2em] text-maroon-900">
                Admin Console
              </span>
            </div>
          </Link>
          <div className="flex items-center gap-2">
            <span className="hidden text-xs text-gold-200/70 sm:inline">@{profile?.username}</span>
            <button
              type="button"
              onClick={openPreview}
              className="inline-flex items-center gap-1 rounded-full border border-gold-400/50 px-3 py-1.5 text-xs font-semibold text-gold-200 transition hover:bg-maroon-800"
              title="Preview the user app"
            >
              <Eye className="h-3.5 w-3.5" /> Preview
            </button>
            <button
              type="button"
              onClick={logout}
              className="rounded-full border border-gold-400/50 p-2 text-gold-200 transition hover:bg-maroon-800"
              aria-label="Logout"
              title="Logout"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[760px] px-4 pb-32 pt-5 animate-fade">
        <Outlet />
      </main>

      <nav className="fixed inset-x-0 bottom-3 z-40 px-4 pb-[env(safe-area-inset-bottom)]">
        <div className="mx-auto flex max-w-[560px] items-center justify-around rounded-full border border-gold-500 bg-gradient-to-r from-gold-200 via-gold-300 to-gold-400 px-2 py-1.5 shadow-[0_15px_40px_-10px_rgba(0,0,0,0.8)]">
          {NAV.map(({ to, end, label, icon: Icon, badge }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `relative flex flex-1 flex-col items-center gap-0.5 rounded-full px-1 py-1.5 text-[11px] font-semibold transition ${
                  isActive ? 'bg-maroon-800 text-gold-200 shadow-inner' : 'text-maroon-900/80 hover:text-maroon-900'
                }`
              }
            >
              <Icon className="h-5 w-5" />
              <span>{label}</span>
              {badge && pending[badge] > 0 && (
                <span className="absolute right-1/2 top-0 translate-x-5 rounded-full bg-red-600 px-1.5 text-[10px] font-bold leading-4 text-white ring-2 ring-gold-300">
                  {pending[badge] > 99 ? '99+' : pending[badge]}
                </span>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
