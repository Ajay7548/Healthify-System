import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useUserDetail, useUserReports } from '@/features/admin/use-admin';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DataState } from '@/components/common/data-state';
import { Pagination } from '@/components/common/pagination';
import { Skeleton } from '@/components/ui/skeleton';
import { ReportsTable } from '@/features/reports/reports-table';
import { formatDate } from '@/lib/format';

function Field({ label, value }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-sm font-medium">{value ?? '—'}</dd>
    </div>
  );
}

export function AdminUserDetailPage() {
  const { userId } = useParams();
  const [page, setPage] = useState(1);

  const detail = useUserDetail(userId);
  const reports = useUserReports(userId, { page, pageSize: 10 });

  const user = detail.data;
  const reportItems = reports.data?.items ?? [];

  return (
    <div className="space-y-6">
      <Link
        to="/admin/users"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Back to patients
      </Link>

      <DataState
        isLoading={detail.isLoading}
        isError={detail.isError}
        error={detail.error}
        onRetry={() => detail.refetch()}
        loadingFallback={<Skeleton className="h-44 w-full rounded-xl" />}
      >
        {user ? (
          <>
            <Card>
              <CardHeader className="flex-row items-center justify-between">
                <div>
                  <CardTitle>{user.fullName}</CardTitle>
                  <p className="text-sm text-muted-foreground">{user.email}</p>
                </div>
                <div className="flex flex-wrap justify-end gap-2">
                  {user.healthCondition ? <Badge tone="accent">{user.healthCondition}</Badge> : null}
                  <Badge tone={user.role === 'ADMIN' ? 'accent' : 'neutral'}>
                    {user.role === 'ADMIN' ? 'Admin' : 'Patient'}
                  </Badge>
                  <Badge tone={user.isActive ? 'normal' : 'neutral'}>
                    {user.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                  <Field label="Age" value={user.age} />
                  <Field label="Gender" value={user.gender} />
                  <Field label="City" value={user.city} />
                  <Field label="State" value={user.state} />
                  <Field label="Occupation" value={user.occupation} />
                  <Field label="Beauty goal" value={user.beautyGoal} />
                  <Field label="Mobile" value={user.mobile} />
                  <Field label="Reports" value={user.reportCount} />
                  <Field label="Member since" value={formatDate(user.createdAt)} />
                  {user.mrn ? <Field label="MRN" value={user.mrn} /> : null}
                  {user.dateOfBirth ? (
                    <Field label="Date of birth" value={formatDate(user.dateOfBirth)} />
                  ) : null}
                </dl>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Reports</CardTitle>
              </CardHeader>
              <CardContent className="p-0 sm:p-2">
                <DataState
                  isLoading={reports.isLoading}
                  isError={reports.isError}
                  error={reports.error}
                  onRetry={() => reports.refetch()}
                  isEmpty={!reports.isLoading && reportItems.length === 0}
                  loadingFallback={
                    <div className="space-y-2 p-4">
                      {Array.from({ length: 4 }).map((_, i) => (
                        <Skeleton key={i} className="h-10 w-full" />
                      ))}
                    </div>
                  }
                  emptyTitle="No reports"
                  emptyMessage="This patient has no reports yet."
                >
                  <ReportsTable reports={reportItems} />
                </DataState>
              </CardContent>
            </Card>

            {reports.data?.pagination ? (
              <Pagination
                pagination={reports.data.pagination}
                onPageChange={setPage}
                isFetching={reports.isFetching}
              />
            ) : null}
          </>
        ) : null}
      </DataState>
    </div>
  );
}
