import { keepPreviousData, useQuery } from '@tanstack/react-query';
import * as adminApi from './admin-api';

export function useUsers(params) {
  return useQuery({
    queryKey: ['admin', 'users', params],
    queryFn: () => adminApi.fetchUsers(params),
    placeholderData: keepPreviousData,
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
