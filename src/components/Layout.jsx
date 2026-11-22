import { Outlet } from 'react-router-dom';
import Header from './Header';
import BottomNav from './BottomNav';

export default function Layout() {
  return (
    <div className="min-h-screen">
      <Header />
      <main className="mx-auto max-w-[480px] px-4 pb-32 pt-5 animate-fade">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
}
