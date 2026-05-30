import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Activity, LayoutDashboard, FileText, Users, LogOut, Menu, X } from 'lucide-react';
import { useAuth } from '@/features/auth/auth-context';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// Navigation is role-driven: patients see their own data, admins see the
// management views. Items are added to these arrays as each feature lands.
const NAV_ITEMS = {
  USER: [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/reports', label: 'My Reports', icon: FileText },
  ],
  ADMIN: [{ to: '/admin/users', label: 'Patients', icon: Users }],
};

function SidebarContent({ items, user, onLogout, onNavigate }) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center gap-2 border-b border-border px-6 text-primary">
        <Activity className="h-6 w-6" aria-hidden="true" />
        <span className="font-semibold text-foreground">Healthcare</span>
      </div>

      <nav className="flex-1 space-y-1 p-4">
        {items.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground',
              )
            }
          >
            <Icon className="h-4 w-4" aria-hidden="true" />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-border p-4">
        <div className="mb-3 px-1">
          <p className="truncate text-sm font-medium">{user.fullName}</p>
          <p className="truncate text-xs text-muted-foreground">{user.email}</p>
        </div>
        <Button variant="outline" size="sm" className="w-full" onClick={onLogout}>
          <LogOut className="h-4 w-4" aria-hidden="true" />
          Sign out
        </Button>
      </div>
    </div>
  );
}

// Authenticated layout: a fixed sidebar on large screens, a slide-in drawer on
// small ones, and the routed page in the main column.
export function AppShell() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const items = NAV_ITEMS[user.role] ?? NAV_ITEMS.USER;

  async function handleLogout() {
    await logout();
    navigate('/login', { replace: true });
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-border bg-surface lg:block">
        <SidebarContent items={items} user={user} onLogout={handleLogout} />
      </aside>

      {/* Mobile drawer */}
      {mobileOpen ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            type="button"
            aria-label="Close menu"
            className="absolute inset-0 bg-foreground/30"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="absolute inset-y-0 left-0 w-64 bg-surface shadow-xl">
            <SidebarContent
              items={items}
              user={user}
              onLogout={handleLogout}
              onNavigate={() => setMobileOpen(false)}
            />
          </aside>
        </div>
      ) : null}

      <div className="lg:pl-64">
        {/* Mobile top bar */}
        <header className="flex h-16 items-center gap-3 border-b border-border bg-surface px-4 lg:hidden">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Open menu"
            onClick={() => setMobileOpen(true)}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
          <span className="font-semibold text-primary">Healthcare</span>
        </header>

        <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
