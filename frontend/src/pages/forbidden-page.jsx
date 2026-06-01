import { Link } from 'react-router-dom';
import { ShieldX } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function ForbiddenPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
      <ShieldX className="h-12 w-12 text-danger" aria-hidden="true" />
      <div>
        <h1 className="text-xl font-semibold">Access denied</h1>
        <p className="text-muted-foreground">You don’t have permission to view that page.</p>
      </div>
      <Link to="/" className={cn(buttonVariants({ variant: 'primary' }))}>
        Back to dashboard
      </Link>
    </div>
  );
}
