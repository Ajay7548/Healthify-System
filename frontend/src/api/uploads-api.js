import { api } from '@/lib/api-client';

export async function uploadDataset(file) {
  const form = new FormData();
  form.append('file', file);
  // FormData body: the api client leaves Content-Type unset so the browser adds
  // the multipart boundary itself.
  const { data } = await api.post('/admin/reports/upload', form);
  return data;
}

export async function fetchUploads({ page = 1, pageSize = 10 } = {}) {
  const { data, meta } = await api.get(`/admin/uploads?page=${page}&pageSize=${pageSize}`);
  return { items: data, pagination: meta?.pagination ?? null };
}
