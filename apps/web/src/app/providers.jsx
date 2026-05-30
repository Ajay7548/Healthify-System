import { QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from 'react-router-dom';
import { queryClient } from './query-client';
import { router } from './router';
import { AuthProvider } from '@/features/auth/auth-provider';

// AuthProvider wraps the router so route guards and pages can call useAuth().
export function Providers() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </QueryClientProvider>
  );
}
