import { useId, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

/**
 * Rounded pill input with optional left icon. For type="password" an eye toggle is shown.
 */
export default function Input({ icon: Icon, label, type = 'text', hint, className = '', id, ...props }) {
  const [show, setShow] = useState(false);
  const autoId = useId();
  const inputId = id || autoId;
  const isPassword = type === 'password';

  return (
    <div>
      {label && (
        <label htmlFor={inputId} className="label">
          {label}
        </label>
      )}
      <div className="relative">
        {Icon && (
          <Icon className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-maroon-600/70" />
        )}
        <input
          id={inputId}
          type={isPassword && show ? 'text' : type}
          className={`input-field ${Icon ? 'pl-11' : 'pl-4'} ${isPassword ? 'pr-12' : 'pr-4'} ${className}`}
          {...props}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-2 text-maroon-600/70 transition hover:bg-maroon-50 hover:text-maroon-700"
            aria-label={show ? 'Hide password' : 'Show password'}
            tabIndex={-1}
          >
            {show ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
          </button>
        )}
      </div>
      {hint && <p className="mt-1 pl-3 text-[11px] text-maroon-800/60">{hint}</p>}
    </div>
  );
}
