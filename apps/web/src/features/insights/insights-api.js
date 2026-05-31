import { api } from '@/lib/api-client';

export async function fetchInsights() {
  const { data } = await api.get('/admin/insights');
  return data;
}
