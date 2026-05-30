import { useState } from 'react';
import { useReportHistory } from '@/features/reports/use-reports';
import { PageHeader } from '@/components/common/page-header';
import { Pagination } from '@/components/common/pagination';
import { DataState } from '@/components/common/data-state';
import { ReportsTable } from '@/features/reports/reports-table';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export function ReportsPage() {
  const [page, setPage] = useState(1);
  const { data, isLoading, isError, error, isFetching, refetch } = useReportHistory({
    page,
    pageSize: 10,
  });

  const items = data?.items ?? [];

  return (
    <div className="space-y-6">
      <PageHeader title="My Reports" description="Your full health-report history." />

      <Card>
        <CardContent className="p-0 sm:p-2">
          <DataState
            isLoading={isLoading}
            isError={isError}
            error={error}
            onRetry={() => refetch()}
            isEmpty={!isLoading && items.length === 0}
            loadingFallback={
              <div className="space-y-2 p-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            }
            emptyTitle="No reports yet"
            emptyMessage="Reports uploaded for you will appear here."
          >
            <ReportsTable reports={items} />
          </DataState>
        </CardContent>
      </Card>

      {data?.pagination ? (
        <Pagination pagination={data.pagination} onPageChange={setPage} isFetching={isFetching} />
      ) : null}
    </div>
  );
}
