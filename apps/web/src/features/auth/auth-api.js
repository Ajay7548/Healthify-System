import { api } from '@/lib/api-client';
import { tokenStore } from '@/lib/token-store';

export async function login(credentials) {
  const { data } = await api.post('/auth/login', credentials, { auth: false });
  return data; // { user, accessToken, refreshToken }
}

export async function fetchCurrentUser() {
  const { data } = await api.get('/auth/me');
  return data;
}

export async function logout() {
  const refreshToken = tokenStore.getRefresh();
  if (!refreshToken) return;
  // auth:false — logout only needs the refresh token, and we don't want a stale
  // access token triggering a refresh attempt on the way out.
  await api.post('/auth/logout', { refreshToken }, { auth: false });
}
