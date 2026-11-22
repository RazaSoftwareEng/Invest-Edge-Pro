import { NavLink } from 'react-router-dom';
import { Gem, History, Home, UserRound, Wallet } from 'lucide-react';

const ITEMS = [
  { to: '/dashboard', label: 'Home', icon: Home },
  { to: '/plans', label: 'Plans', icon: Gem },
  { to: '/deposit', label: 'Deposit', icon: Wallet },
  { to: '/history', label: 'History', icon: History },
  { to: '/profile', label: 'Account', icon: UserRound },
];

export default function BottomNav() {
  return (
    <nav className="fixed inset-x-0 bottom-3 z-40 px-4 pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto flex max-w-[448px] items-center justify-around rounded-full border border-gold-400/40 bg-maroon-950/85 px-2 py-1.5 shadow-[0_15px_40px_-10px_rgba(0,0,0,0.7)] backdrop-blur-md">
        {ITEMS.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `relative flex flex-1 flex-col items-center gap-0.5 rounded-full px-1 pb-2 pt-1.5 text-[11px] font-medium transition ${
                isActive ? 'text-gold-300' : 'text-cream-100/55 hover:text-gold-200'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon className={`h-5 w-5 transition ${isActive ? 'scale-110' : ''}`} strokeWidth={isActive ? 2.4 : 2} />
                <span>{label}</span>
                <span
                  className={`absolute bottom-0.5 h-[3px] rounded-full bg-gradient-to-r from-gold-200 to-gold-500 transition-all duration-300 ${
                    isActive ? 'w-6 opacity-100' : 'w-0 opacity-0'
                  }`}
                />
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
