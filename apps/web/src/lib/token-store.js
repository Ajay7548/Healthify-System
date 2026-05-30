// Where the JWTs live on the client.
//
// Trade-off, stated plainly: tokens in localStorage are readable by any script
// running on the page, so this leans on a clean dependency tree and a strict CSP
// rather than being immune to XSS. The access token is deliberately short-lived
// (15 min) to bound the damage, and refresh tokens can be revoked server-side.
// The more XSS-resistant alternative (refresh token in an httpOnly cookie) was
// considered; we chose header-based transport to keep cross-origin deployment
// simple. See the README for the full reasoning.
const ACCESS_KEY = 'hc.accessToken';
const REFRESH_KEY = 'hc.refreshToken';

export const tokenStore = {
  getAccess() {
    return localStorage.getItem(ACCESS_KEY);
  },
  getRefresh() {
    return localStorage.getItem(REFRESH_KEY);
  },
  set({ accessToken, refreshToken }) {
    localStorage.setItem(ACCESS_KEY, accessToken);
    localStorage.setItem(REFRESH_KEY, refreshToken);
  },
  clear() {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
  },
  hasSession() {
    return Boolean(localStorage.getItem(ACCESS_KEY) || localStorage.getItem(REFRESH_KEY));
  },
};
