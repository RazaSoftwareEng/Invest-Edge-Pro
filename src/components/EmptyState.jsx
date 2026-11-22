import { Inbox } from 'lucide-react';

export default function EmptyState({ icon: Icon = Inbox, title = 'Nothing here yet', text }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full border border-gold-400/60 bg-gold-100">
        <Icon className="h-5 w-5 text-maroon-600" />
      </div>
      <p className="text-sm font-semibold text-maroon-800">{title}</p>
      {text && <p className="max-w-[260px] text-xs text-maroon-800/60">{text}</p>}
    </div>
  );
}
