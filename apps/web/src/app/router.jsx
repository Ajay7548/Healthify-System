import { lazy } from 'react';
import { createBrowserRouter } from 'react-router-dom';
import { AuthLayout } from '@/layouts/auth-layout';
import { AppShell } from '@/layouts/app-shell';
import { RequireAuth, RequireRole, RoleHomeRedirect } from './guards';
import { LoginPage } from '@/pages/login-page';
import { DashboardPage } from '@/pages/dashboard-page';
import { ForbiddenPage } from '@/pages/forbidden-page';
import { NotFoundPage } from '@/pages/not-found-page';

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
