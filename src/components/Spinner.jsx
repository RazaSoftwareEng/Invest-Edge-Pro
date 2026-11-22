import { Loader2 } from 'lucide-react';
import Logo from './Logo';

export function Spinner({ className = 'h-5 w-5' }) {
  return <Loader2 className={`animate-spin ${className}`} />;
}

export function FullScreenLoader() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4">
      <div className="animate-pulse">
        <Logo size={64} />
      </div>
      <Spinner className="h-6 w-6 text-gold-300" />
    </div>
  );
}

export function CardLoader({ label = 'Loading…' }) {
  return (
    <div className="flex items-center justify-center gap-2 py-8 text-sm text-maroon-800/70">
      <Spinner className="h-4 w-4" />
      {label}
    </div>
  );
}
