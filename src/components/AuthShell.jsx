import Logo from './Logo';
import { APP_NAME, APP_TAGLINE } from '../config';

export default function AuthShell({ title, subtitle, children, footer }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-[420px] animate-pop">
        <div className="mb-6 flex flex-col items-center text-center">
          <Logo size={72} />
          <h1 className="mt-3 font-display text-3xl font-bold gold-text">{APP_NAME}</h1>
          <p className="mt-1 text-xs uppercase tracking-[0.3em] text-gold-200/70">{APP_TAGLINE}</p>
        </div>

        <div className="card px-6 py-7">
          <div className="mb-6 text-center">
            <h2 className="font-display text-2xl font-bold text-maroon-900">{title}</h2>
            {subtitle && <p className="mt-1 text-sm text-maroon-800/70">{subtitle}</p>}
            <div className="mx-auto mt-3 h-0.5 w-14 rounded-full bg-gradient-to-r from-gold-200 via-gold-400 to-gold-200" />
          </div>
          {children}
        </div>

        {footer && <div className="mt-6 text-center text-sm text-cream-100/80">{footer}</div>}
      </div>
    </div>
  );
}
