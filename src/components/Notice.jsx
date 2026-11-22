import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';

const VARIANTS = {
  error: { cls: 'border-red-300 bg-red-50 text-red-800', icon: AlertCircle },
  success: { cls: 'border-emerald-300 bg-emerald-50 text-emerald-800', icon: CheckCircle2 },
  info: { cls: 'border-gold-400 bg-gold-100 text-maroon-800', icon: Info },
};

/** Inline alert. `message` may be null to render nothing. */
export default function Notice({ type = 'info', message, onClose, className = '' }) {
  if (!message) return null;
  const v = VARIANTS[type] ?? VARIANTS.info;
  const Icon = v.icon;
  return (
    <div className={`flex items-start gap-2 rounded-2xl border px-4 py-3 text-sm animate-pop ${v.cls} ${className}`} role="alert">
      <Icon className="mt-0.5 h-4 w-4 shrink-0" />
      <p className="flex-1">{message}</p>
      {onClose && (
        <button type="button" onClick={onClose} className="rounded-full p-0.5 opacity-60 hover:opacity-100" aria-label="Dismiss">
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
