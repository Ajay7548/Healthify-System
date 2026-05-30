import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as uploadsApi from './uploads-api';

export function useUploads(params) {
  return useQuery({
    queryKey: ['admin', 'uploads', params],
    queryFn: () => uploadsApi.fetchUploads(params),
    placeholderData: keepPreviousData,
  });
}

export function useUploadCsv() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: uploadsApi.uploadCsv,
    onSuccess: () => {
      // An import can change the audit log, every "last report" date, and any
      // open report view — refresh all three.
      queryClient.invalidateQueries({ queryKey: ['admin', 'uploads'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      queryClient.invalidateQueries({ queryKey: ['reports'] });
    },
  });
}
