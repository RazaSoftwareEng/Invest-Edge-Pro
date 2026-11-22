import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FullScreenLoader } from './Spinner';

export default function AdminRoute({ children }) {
  const { profile, profileLoading, isAdmin } = useAuth();

  if (!profile && profileLoading) return <FullScreenLoader />;
  if (!isAdmin) return <Navigate to="/dashboard" replace />;
  return children;
}
