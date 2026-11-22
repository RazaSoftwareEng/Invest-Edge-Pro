import { useNavigate } from 'react-router-dom';
import { Eye, X } from 'lucide-react';
import { stopPreview } from '../lib/preview';

export default function PreviewBanner({ label = 'Guest preview — this is what users see' }) {
  const navigate = useNavigate();

  function exit() {
    stopPreview();
    navigate('/admin', { replace: true });
  }

  return (
    <div className="sticky top-0 z-50 bg-gradient-to-r from-gold-200 via-gold-400 to-gold-200 text-maroon-900 shadow-lg">
      <div className="mx-auto flex max-w-[760px] items-center gap-2 px-4 py-2 text-xs font-semibold">
        <Eye className="h-4 w-4 shrink-0" />
        <span className="flex-1 truncate">{label}</span>
        <button
          type="button"
          onClick={exit}
          className="inline-flex shrink-0 items-center gap-1 rounded-full bg-maroon-800 px-3 py-1 text-gold-200 transition hover:bg-maroon-700"
        >
          <X className="h-3.5 w-3.5" /> Exit preview
        </button>
      </div>
    </div>
  );
}
