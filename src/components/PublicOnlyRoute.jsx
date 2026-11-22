import { useRef } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FullScreenLoader } from './Spinner';

/**
 * Login / Register pages. If the visitor was ALREADY signed in when the page opened,
 * send them to their home. Fresh sign-ins are redirected by the page itself
 * (so admins can be routed to /admin once their profile has loaded).
 */
export default function PublicOnlyRoute({ children }) {
  const { session, loading, isAdmin } = useAuth();
  const initialSession = useRef(undefined);

  if (loading) return <FullScreenLoader />;
  if (initialSession.current === undefined) initialSession.current = session;
  if (initialSession.current) return <Navigate to={isAdmin ? '/admin' : '/dashboard'} replace />;
  return children;
}
