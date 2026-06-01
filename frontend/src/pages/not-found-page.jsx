import { Link } from 'react-router-dom';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
      <p className="text-5xl font-bold text-primary">404</p>
      <div>
        <h1 className="text-xl font-semibold">Page not found</h1>
        <p className="text-muted-foreground">That page doesn’t exist or has moved.</p>
      </div>
      <Link to="/" className={cn(buttonVariants({ variant: 'primary' }))}>
        Back to dashboard
      </Link>
    </div>
  );
}
