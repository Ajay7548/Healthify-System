import { useState } from 'react';
import { useUploads } from '@/features/uploads/use-uploads';
import { UploadDialog } from '@/features/uploads/upload-dialog';
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
        description="Import clients and health reports from an Excel workbook or CSV."
        actions={<UploadDialog />}
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
            emptyMessage="Use “Upload data” to import your first workbook or CSV."
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
