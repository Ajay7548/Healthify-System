import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as uploadsApi from '@/api/uploads-api';

export function useUploads(params) {
  return useQuery({
    queryKey: ['admin', 'uploads', params],
    queryFn: () => uploadsApi.fetchUploads(params),
    placeholderData: keepPreviousData,
  });
}

export function useUploadDataset() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: uploadsApi.uploadDataset,
    onSuccess: () => {
      // An import can change the audit log, the client list + its facets, the
      // insights aggregates, every "last report" date, and any open report view.
      queryClient.invalidateQueries({ queryKey: ['admin', 'uploads'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'facets'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'insights'] });
      queryClient.invalidateQueries({ queryKey: ['reports'] });
    },
  });
}
