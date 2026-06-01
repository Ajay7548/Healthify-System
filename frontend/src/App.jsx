import { lazy } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import {
  createBrowserRouter,
  RouterProvider,
  Navigate,
  Outlet,
  useLocation,
} from 'react-router-dom';
import { queryClient } from '@/lib/query-client';
import { AuthProvider } from '@/context/auth-provider';
import { useAuth } from '@/context/auth-context';
import { AuthLayout } from '@/components/auth-layout';
import { AppShell } from '@/components/app-shell';
import { FullPageSpinner } from '@/components/full-page-spinner';
import { LoginPage } from '@/pages/login-page';
import { DashboardPage } from '@/pages/dashboard-page';
import { ForbiddenPage } from '@/pages/forbidden-page';
import { NotFoundPage } from '@/pages/not-found-page';

// --- Route guards -----------------------------------------------------------

// Gate a branch of the route tree behind authentication. While the session is
// being restored we show a spinner rather than flashing the login screen.
function RequireAuth() {
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
function RequireRole({ role }) {
  const { user, status } = useAuth();

  if (status === 'loading') return <FullPageSpinner />;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== role) return <Navigate to="/forbidden" replace />;
  return <Outlet />;
}

// Send each role to its natural home: admins manage patients, patients see their
// own dashboard.
function RoleHomeRedirect() {
  const { user } = useAuth();
  return <Navigate to={user?.role === 'ADMIN' ? '/admin/users' : '/dashboard'} replace />;
}

// --- Router -----------------------------------------------------------------

// Code-split the secondary and admin-only pages: a patient never downloads the
// admin bundle, and vice-versa. AppShell provides the Suspense fallback.
const lazyPage = (loader, name) =>
  lazy(() => loader().then((module) => ({ default: module[name] })));
const ReportsPage = lazyPage(() => import('@/pages/reports-page'), 'ReportsPage');
const AdminUsersPage = lazyPage(() => import('@/pages/admin/users-page'), 'AdminUsersPage');
const AdminUserDetailPage = lazyPage(
  () => import('@/pages/admin/user-detail-page'),
  'AdminUserDetailPage',
);
const AdminUploadsPage = lazyPage(() => import('@/pages/admin/uploads-page'), 'AdminUploadsPage');
const AdminInsightsPage = lazyPage(() => import('@/pages/admin/insights-page'), 'AdminInsightsPage');

// Route tree. The authenticated branch shares the AppShell; admin-only routes
// sit behind an additional RequireRole guard.
const router = createBrowserRouter([
  {
    element: <AuthLayout />,
    children: [{ path: '/login', element: <LoginPage /> }],
  },
  {
    element: <RequireAuth />,
    children: [
      {
        element: <AppShell />,
        children: [
          { index: true, element: <RoleHomeRedirect /> },
          { path: '/dashboard', element: <DashboardPage /> },
          { path: '/reports', element: <ReportsPage /> },
          {
            element: <RequireRole role="ADMIN" />,
            children: [
              { path: '/admin/insights', element: <AdminInsightsPage /> },
              { path: '/admin/users', element: <AdminUsersPage /> },
              { path: '/admin/users/:userId', element: <AdminUserDetailPage /> },
              { path: '/admin/uploads', element: <AdminUploadsPage /> },
            ],
          },
        ],
      },
    ],
  },
  { path: '/forbidden', element: <ForbiddenPage /> },
  { path: '*', element: <NotFoundPage /> },
]);

// AuthProvider wraps the router so route guards and pages can call useAuth().
export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </QueryClientProvider>
  );
}
