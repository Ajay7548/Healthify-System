import { useInsights } from '@/features/insights/use-insights';
import {
  StatCard,
  CategoryBars,
  GenderDonut,
  AbnormalByMetric,
  ReportsTrend,
} from '@/features/insights/insight-charts';
import { PageHeader } from '@/components/common/page-header';
import { DataState } from '@/components/common/data-state';
import { Skeleton } from '@/components/ui/skeleton';

function InsightsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-72 w-full rounded-xl" />
      <div className="grid gap-6 lg:grid-cols-2">
        <Skeleton className="h-80 w-full rounded-xl" />
        <Skeleton className="h-80 w-full rounded-xl" />
      </div>
    </div>
  );
}

export function AdminInsightsPage() {
  const { data, isLoading, isError, error, refetch } = useInsights();

  return (
    <div className="space-y-6">
      <PageHeader title="Insights" description="Population analytics across all clients and reports." />

      <DataState
        isLoading={isLoading}
        isError={isError}
        error={error}
        onRetry={() => refetch()}
        loadingFallback={<InsightsSkeleton />}
      >
        {data ? (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <StatCard label="Clients" value={data.totals.clients.toLocaleString()} />
              <StatCard label="Reports" value={data.totals.reports.toLocaleString()} />
              <StatCard label="Avg reports / client" value={data.totals.avgReportsPerClient} />
              <StatCard
                label="Clients flagged"
                value={`${Math.round(data.totals.abnormalLatestRate * 100)}%`}
                hint="≥1 out-of-range metric on latest report"
              />
            </div>

            <AbnormalByMetric data={data.abnormalByMetric} />

            <div className="grid gap-6 lg:grid-cols-2">
              <CategoryBars title="By health condition" data={data.byHealthCondition} horizontal color="#6366f1" />
              <CategoryBars title="By state (top 10)" data={data.byState} horizontal color="#0ea5e9" />
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <CategoryBars title="By age group" data={data.byAgeBucket} color="#10b981" />
              <GenderDonut data={data.byGender} />
            </div>

            <CategoryBars title="By beauty goal" data={data.byBeautyGoal} color="#ec4899" />

            <ReportsTrend data={data.reportsByMonth} />
          </div>
        ) : null}
      </DataState>
    </div>
  );
}
