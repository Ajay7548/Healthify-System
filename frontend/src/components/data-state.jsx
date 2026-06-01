import { AlertCircle, Inbox } from 'lucide-react';
import { Spinner } from '@/components/ui/spinner';
import { Button } from '@/components/ui/button';

// One place to render the three states every data view shares — loading, error
// (with retry) and empty — so each page handles the happy path only. This is the
// small investment that makes the whole app feel considered rather than blank.
export function DataState({
  isLoading,
  isError,
  error,
  isEmpty,
  onRetry,
  loadingFallback,
  emptyTitle = 'Nothing here yet',
  emptyMessage = 'There’s no data to show.',
  children,
}) {
  if (isLoading) {
    return loadingFallback ?? <CenteredSpinner />;
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-border bg-surface p-10 text-center">
        <AlertCircle className="h-8 w-8 text-danger" aria-hidden="true" />
        <div>
          <p className="font-medium">Something went wrong</p>
          <p className="text-sm text-muted-foreground">
            {error?.message ?? 'Please try again in a moment.'}
          </p>
        </div>
        {onRetry ? (
          <Button variant="outline" size="sm" onClick={onRetry}>
            Try again
          </Button>
        ) : null}
      </div>
    );
  }

  if (isEmpty) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-surface p-10 text-center">
        <Inbox className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
        <p className="font-medium">{emptyTitle}</p>
        <p className="text-sm text-muted-foreground">{emptyMessage}</p>
      </div>
    );
  }

  return children;
}

function CenteredSpinner() {
  return (
    <div className="flex items-center justify-center p-10 text-muted-foreground">
      <Spinner className="h-6 w-6 text-primary" />
    </div>
  );
}
