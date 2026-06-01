import { api } from '@/lib/api-client';

function buildQuery(params) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      search.set(key, String(value));
    }
  }
  return search.toString();
}

export async function fetchUsers(params = {}) {
  const { data, meta } = await api.get(`/admin/users?${buildQuery(params)}`);
  return { items: data, pagination: meta?.pagination ?? null };
}

export async function fetchFacets() {
  const { data } = await api.get('/admin/facets');
  return data;
}

export async function fetchUserDetail(userId) {
  const { data } = await api.get(`/admin/users/${userId}`);
  return data;
}

export async function fetchUserReports(userId, params = {}) {
  const { data, meta } = await api.get(`/admin/users/${userId}/reports?${buildQuery(params)}`);
  return { items: data, pagination: meta?.pagination ?? null };
}
