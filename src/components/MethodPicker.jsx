import { CheckCircle2 } from 'lucide-react';
import { PAYMENT_METHODS } from '../config';

/** Three selectable cards: JazzCash / EasyPaisa / Bank */
export default function MethodPicker({ value, onChange }) {
  return (
    <div className="grid grid-cols-3 gap-2.5">
      {PAYMENT_METHODS.map((m) => {
        const active = value === m.id;
        return (
          <button
            key={m.id}
            type="button"
            onClick={() => onChange(m.id)}
            className={`relative flex flex-col items-center gap-2 rounded-2xl border-2 p-3 transition ${
              active
                ? 'border-gold-400 bg-white shadow-gold'
                : 'border-gold-400/30 bg-white/60 hover:border-gold-400/70'
            }`}
            aria-pressed={active}
          >
            {active && <CheckCircle2 className="absolute right-1.5 top-1.5 h-4 w-4 text-emerald-600" />}
            <span
              className={`flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br text-xs font-bold text-white ${m.accent}`}
            >
              {m.short}
            </span>
            <span className="text-xs font-semibold text-maroon-900">{m.name}</span>
          </button>
        );
      })}
    </div>
  );
}
