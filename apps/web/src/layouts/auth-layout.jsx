import { Activity } from 'lucide-react';
import { Outlet } from 'react-router-dom';

// Centered, single-column layout for unauthenticated screens (login).
export function AuthLayout() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-12">
      <div className="mb-8 flex items-center gap-2 text-primary">
        <Activity className="h-7 w-7" aria-hidden="true" />
        <span className="text-xl font-semibold tracking-tight text-foreground">
          Healthcare Dashboard
        </span>
      </div>
      <div className="w-full max-w-sm">
        <Outlet />
      </div>
      <p className="mt-8 text-xs text-muted-foreground">A prototype — uses synthetic demo data.</p>
    </div>
  );
}
