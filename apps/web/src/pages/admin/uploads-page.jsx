import { useState } from 'react';
import { useUploads } from '@/features/uploads/use-uploads';
import { CsvUploadDialog } from '@/features/uploads/csv-upload-dialog';
import { UploadsTable } from '@/features/uploads/uploads-table';
import { PageHeader } from '@/components/common/page-header';
import { Pagination } from '@/components/common/pagination';
import { DataState } from '@/components/common/data-state';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export function AdminUploadsPage() {
  const [page, setPage] = useState(1);
  const { data, isLoading, isError, error, isFetching, refetch } = useUploads({
    page,
    pageSize: 10,
  });
  const items = data?.items ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Uploads"
        description="Import patient health reports from CSV."
        actions={<CsvUploadDialog />}
      />

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
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            }
            emptyTitle="No uploads yet"
            emptyMessage="Use “Upload CSV” to import your first batch of reports."
          >
            <UploadsTable batches={items} />
          </DataState>
        </CardContent>
      </Card>

      {data?.pagination ? (
        <Pagination pagination={data.pagination} onPageChange={setPage} isFetching={isFetching} />
      ) : null}
    </div>
  );
}
