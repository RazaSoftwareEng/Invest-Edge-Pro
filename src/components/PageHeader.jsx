import { ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function PageHeader({ title, subtitle, back = false, right }) {
  const navigate = useNavigate();
  return (
    <div className="mb-5 flex items-center gap-3">
      {back && (
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-gold-400/50 bg-maroon-900/50 text-gold-200 transition hover:bg-maroon-800"
          aria-label="Go back"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
      )}
      <div className="flex-1">
        <h1 className="page-title">{title}</h1>
        {subtitle && <p className="text-xs text-cream-100/65">{subtitle}</p>}
      </div>
      {right}
    </div>
  );
}
