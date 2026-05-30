import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AuthLayout } from '@/layouts/auth-layout';
import { AppShell } from '@/layouts/app-shell';
import { RequireAuth } from './guards';
import { LoginPage } from '@/pages/login-page';
import { DashboardPage } from '@/pages/dashboard-page';
import { ReportsPage } from '@/pages/reports-page';
import { ForbiddenPage } from '@/pages/forbidden-page';
import { NotFoundPage } from '@/pages/not-found-page';

// Route tree. Feature routes are added under the authenticated branch as they
// land; admin-only routes will sit behind a RequireRole guard.
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
          { index: true, element: <Navigate to="/dashboard" replace /> },
          { path: '/dashboard', element: <DashboardPage /> },
          { path: '/reports', element: <ReportsPage /> },
        ],
      },
    ],
  },
  { path: '/forbidden', element: <ForbiddenPage /> },
  { path: '*', element: <NotFoundPage /> },
]);
