import { keepPreviousData, useQuery } from '@tanstack/react-query';
import * as adminApi from '@/api/admin-api';

export function useUsers(params) {
  return useQuery({
    queryKey: ['admin', 'users', params],
    queryFn: () => adminApi.fetchUsers(params),
    placeholderData: keepPreviousData,
  });
}

export function useFacets() {
  return useQuery({
    queryKey: ['admin', 'facets'],
    queryFn: adminApi.fetchFacets,
    // Distinct demographic values change rarely — cache for the session.
    staleTime: 5 * 60 * 1000,
  });
}

export function useUserDetail(userId) {
  return useQuery({
    queryKey: ['admin', 'user', userId],
    queryFn: () => adminApi.fetchUserDetail(userId),
    enabled: Boolean(userId),
  });
}

export function useUserReports(userId, params) {
  return useQuery({
    queryKey: ['admin', 'user', userId, 'reports', params],
    queryFn: () => adminApi.fetchUserReports(userId, params),
    enabled: Boolean(userId),
    placeholderData: keepPreviousData,
  });
}
