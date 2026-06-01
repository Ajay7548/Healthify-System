import { api } from '@/lib/api-client';

export async function fetchLatestReport() {
  const { data } = await api.get('/me/reports/latest');
  return data; // a report DTO, or null when the user has none
}

export async function fetchReportHistory({ page = 1, pageSize = 10, from, to } = {}) {
  const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
  if (from) params.set('from', from);
  if (to) params.set('to', to);
  const { data, meta } = await api.get(`/me/reports?${params.toString()}`);
  return { items: data, pagination: meta?.pagination ?? null };
}
