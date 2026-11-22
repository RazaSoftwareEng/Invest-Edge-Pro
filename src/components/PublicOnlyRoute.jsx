import { useRef } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { isPreview } from '../lib/preview';
import { FullScreenLoader } from './Spinner';
import PreviewBanner from './PreviewBanner';

/**
 * Login / Register pages. If the visitor was ALREADY signed in when the page opened,
 * send them to their home. Fresh sign-ins are redirected by the page itself
 * (so admins can be routed to /admin once their profile has loaded).
 * Admins in Guest Preview see the page as a logged-out visitor would (forms disabled).
 */
export default function PublicOnlyRoute({ children }) {
  const { session, loading, isAdmin } = useAuth();
  const initialSession = useRef(undefined);

  if (loading) return <FullScreenLoader />;
  if (initialSession.current === undefined) initialSession.current = session;

  if (initialSession.current && isAdmin && isPreview()) {
    return (
      <>
        <PreviewBanner label="Guest preview — forms are disabled" />
        {children}
      </>
    );
  }
  if (initialSession.current) return <Navigate to={isAdmin ? '/admin' : '/dashboard'} replace />;
  return children;
}
