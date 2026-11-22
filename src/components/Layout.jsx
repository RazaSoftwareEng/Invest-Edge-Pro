import { Navigate, Outlet } from 'react-router-dom';
import Header from './Header';
import BottomNav from './BottomNav';
import PreviewBanner from './PreviewBanner';
import { useAuth } from '../context/AuthContext';
import { isPreview } from '../lib/preview';

export default function Layout() {
  const { isAdmin } = useAuth();
  const preview = isPreview();

  // Admins live in the admin console; they only see the user app through Guest Preview.
  if (isAdmin && !preview) return <Navigate to="/admin" replace />;

  return (
    <div className="min-h-screen">
      {preview && isAdmin && <PreviewBanner label="Guest preview — user app (showing your own wallet data)" />}
      <Header />
      <main className="mx-auto max-w-[480px] px-4 pb-32 pt-5 animate-fade">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
}
