import { Link } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import Logo from './Logo';
import { APP_NAME } from '../config';
import { useAuth } from '../context/AuthContext';

export default function Header() {
  const { isAdmin } = useAuth();

  return (
    <header className="sticky top-0 z-30 border-b border-gold-400/20 bg-maroon-950/40 backdrop-blur-md">
      <div className="mx-auto flex max-w-[480px] items-center justify-between px-4 py-3">
        <Link to="/dashboard" className="flex items-center gap-2.5">
          <Logo size={38} />
          <div className="leading-tight">
            <p className="font-display text-lg font-bold gold-text">{APP_NAME}</p>
            <p className="text-[10px] uppercase tracking-[0.25em] text-gold-200/60">Grow with confidence</p>
          </div>
        </Link>

        {isAdmin && (
          <Link
            to="/admin"
            className="inline-flex items-center gap-1.5 rounded-full border border-gold-400/60 bg-maroon-900/60 px-3 py-1.5 text-xs font-semibold text-gold-200 transition hover:bg-maroon-800"
          >
            <ShieldCheck className="h-4 w-4" />
            Admin
          </Link>
        )}
      </div>
    </header>
  );
}
