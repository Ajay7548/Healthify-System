import { Spinner } from '@/components/ui/spinner';

export function FullPageSpinner({ label = 'Loading…' }) {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="flex flex-col items-center gap-3 text-muted-foreground">
        <Spinner className="h-8 w-8 text-primary" />
        <p className="text-sm">{label}</p>
      </div>
    </div>
  );
}
