import { useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import { useUsers, useFacets } from '@/hooks/use-admin';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { PageHeader } from '@/components/page-header';
import { Pagination } from '@/components/pagination';
import { DataState } from '@/components/data-state';
import { UsersTable } from '@/components/users-table';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export function AdminUsersPage() {
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('');
  const [status, setStatus] = useState('');
  const [healthCondition, setHealthCondition] = useState('');
  const [stateFilter, setStateFilter] = useState('');
  const [gender, setGender] = useState('');
  const [page, setPage] = useState(1);

  const debouncedSearch = useDebouncedValue(search, 350);
  const { data: facets } = useFacets();

  // A new filter should always start from page 1, or you can land on an empty
  // page that "looks" broken.
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, role, status, healthCondition, stateFilter, gender]);

  const { data, isLoading, isError, error, isFetching, refetch } = useUsers({
    page,
    pageSize: 10,
    search: debouncedSearch,
    role,
    isActive: status,
    healthCondition,
    state: stateFilter,
    gender,
  });

  const items = data?.items ?? [];

  return (
    <div className="space-y-6">
      <PageHeader title="Patients" description="Search and filter the client base." />

      <Card>
        <CardContent className="space-y-4 p-4">
          <div className="space-y-3">
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by name or email"
                className="pl-9"
                aria-label="Search patients"
              />
            </div>
            <div className="flex flex-wrap gap-3">
              <Select
                value={healthCondition}
                onChange={(event) => setHealthCondition(event.target.value)}
                aria-label="Filter by health condition"
              >
                <option value="">All conditions</option>
                {(facets?.healthConditions ?? []).map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </Select>
              <Select
                value={stateFilter}
                onChange={(event) => setStateFilter(event.target.value)}
                aria-label="Filter by state"
              >
                <option value="">All states</option>
                {(facets?.states ?? []).map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </Select>
              <Select
                value={gender}
                onChange={(event) => setGender(event.target.value)}
                aria-label="Filter by gender"
              >
                <option value="">All genders</option>
                {(facets?.genders ?? []).map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </Select>
              <Select
                value={role}
                onChange={(event) => setRole(event.target.value)}
                aria-label="Filter by role"
              >
                <option value="">All roles</option>
                <option value="USER">Patients</option>
                <option value="ADMIN">Admins</option>
              </Select>
              <Select
                value={status}
                onChange={(event) => setStatus(event.target.value)}
                aria-label="Filter by status"
              >
                <option value="">All statuses</option>
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </Select>
            </div>
          </div>

          <DataState
            isLoading={isLoading}
            isError={isError}
            error={error}
            onRetry={() => refetch()}
            isEmpty={!isLoading && items.length === 0}
            loadingFallback={
              <div className="space-y-2 py-2">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            }
            emptyTitle="No patients found"
            emptyMessage="Try adjusting your search or filters."
          >
            <UsersTable users={items} />
          </DataState>
        </CardContent>
      </Card>

      {data?.pagination ? (
        <Pagination pagination={data.pagination} onPageChange={setPage} isFetching={isFetching} />
      ) : null}
    </div>
  );
}
