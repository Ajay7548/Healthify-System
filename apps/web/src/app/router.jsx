import { createBrowserRouter } from 'react-router-dom';
import { AuthLayout } from '@/layouts/auth-layout';
import { AppShell } from '@/layouts/app-shell';
import { RequireAuth, RequireRole, RoleHomeRedirect } from './guards';
import { LoginPage } from '@/pages/login-page';
import { DashboardPage } from '@/pages/dashboard-page';
import { ReportsPage } from '@/pages/reports-page';
import { AdminUsersPage } from '@/pages/admin/users-page';
import { AdminUserDetailPage } from '@/pages/admin/user-detail-page';
import { ForbiddenPage } from '@/pages/forbidden-page';
import { NotFoundPage } from '@/pages/not-found-page';

// Route tree. The authenticated branch shares the AppShell; admin-only routes
// sit behind an additional RequireRole guard.
export const router = createBrowserRouter([
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
              { path: '/admin/users', element: <AdminUsersPage /> },
              { path: '/admin/users/:userId', element: <AdminUserDetailPage /> },
            ],
          },
        ],
      },
    ],
  },
  { path: '/forbidden', element: <ForbiddenPage /> },
  { path: '*', element: <NotFoundPage /> },
]);
