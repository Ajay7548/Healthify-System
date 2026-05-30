import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/features/auth/auth-context';
import { FullPageSpinner } from '@/components/common/full-page-spinner';

// Gate a branch of the route tree behind authentication. While the session is
// being restored we show a spinner rather than flashing the login screen.
export function RequireAuth() {
  const { status } = useAuth();
  const location = useLocation();

  if (status === 'loading') return <FullPageSpinner />;
  if (status !== 'authenticated') {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  return <Outlet />;
}

// Gate a branch behind a specific role. The server enforces this for real; this
// just keeps the UI honest.
export function RequireRole({ role }) {
  const { user, status } = useAuth();

  if (status === 'loading') return <FullPageSpinner />;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== role) return <Navigate to="/forbidden" replace />;
  return <Outlet />;
}

// Send each role to its natural home: admins manage patients, patients see their
// own dashboard.
export function RoleHomeRedirect() {
  const { user } = useAuth();
  return <Navigate to={user?.role === 'ADMIN' ? '/admin/users' : '/dashboard'} replace />;
}
