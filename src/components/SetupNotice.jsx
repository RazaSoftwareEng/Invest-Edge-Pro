import Logo from './Logo';

export default function SetupNotice() {
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="card w-full max-w-[440px] text-center">
        <div className="mb-3 flex justify-center">
          <Logo size={56} />
        </div>
        <h1 className="section-title mb-2">Supabase is not configured</h1>
        <p className="text-sm text-maroon-900/80">
          Create a <code className="rounded bg-maroon-100 px-1.5 py-0.5">.env</code> file in the project root (copy{' '}
          <code className="rounded bg-maroon-100 px-1.5 py-0.5">.env.example</code>) and set:
        </p>
        <pre className="mt-4 overflow-x-auto rounded-2xl bg-maroon-950 p-4 text-left text-xs text-gold-200">
{`VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...`}
        </pre>
        <p className="mt-4 text-xs text-maroon-900/70">Then stop and restart <code>npm run dev</code>.</p>
      </div>
    </div>
  );
}
