import { keepPreviousData, useQuery } from '@tanstack/react-query';
import * as reportsApi from '@/api/reports-api';

export function useLatestReport() {
  return useQuery({
    queryKey: ['reports', 'latest'],
    queryFn: reportsApi.fetchLatestReport,
  });
}

export function useReportHistory(params) {
  return useQuery({
    queryKey: ['reports', 'history', params],
    queryFn: () => reportsApi.fetchReportHistory(params),
    // Keep the previous page visible while the next one loads — no flash to empty.
    placeholderData: keepPreviousData,
  });
}
