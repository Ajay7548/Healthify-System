import { lazy, Suspense } from 'react';
import { useAuth } from '@/context/auth-context';
import { useLatestReport, useReportHistory } from '@/hooks/use-reports';
import { DataState } from '@/components/data-state';
import { Skeleton } from '@/components/ui/skeleton';
import { LatestReportCard } from '@/components/latest-report-card';

// Recharts is sizeable and only the dashboard uses it, so load it in its own
// chunk rather than bloating the initial bundle for every page.
const HealthTrendChart = lazy(() =>
  import('@/components/health-trend-chart').then((m) => ({ default: m.HealthTrendChart })),
);

export function DashboardPage() {
  const { user } = useAuth();
  const latest = useLatestReport();
  const history = useReportHistory({ page: 1, pageSize: 12 });

  const firstName = user.fullName.split(' ')[0];
  const recent = history.data?.items ?? [];
  const previous = recent[1] ?? null;
  const chronological = [...recent].reverse();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Welcome back, {firstName}</h1>
        <p className="text-muted-foreground">Here’s an overview of your health.</p>
      </div>

      <DataState
        isLoading={latest.isLoading}
        isError={latest.isError}
        error={latest.error}
        isEmpty={!latest.isLoading && !latest.data}
        onRetry={() => latest.refetch()}
        loadingFallback={<Skeleton className="h-64 w-full rounded-xl" />}
        emptyTitle="No reports yet"
        emptyMessage="Your health reports will appear here once they’ve been uploaded."
      >
        {latest.data ? <LatestReportCard report={latest.data} previous={previous} /> : null}
      </DataState>

      {chronological.length > 1 ? (
        <Suspense fallback={<Skeleton className="h-80 w-full rounded-xl" />}>
          <HealthTrendChart reports={chronological} />
        </Suspense>
      ) : null}
    </div>
  );
}
