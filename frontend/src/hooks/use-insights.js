import { useQuery } from '@tanstack/react-query';
import { fetchInsights } from '@/api/insights-api';

export function useInsights() {
  return useQuery({
    queryKey: ['admin', 'insights'],
    queryFn: fetchInsights,
    // Aggregates are expensive and change slowly; don't refetch on every focus.
    staleTime: 60 * 1000,
  });
}
