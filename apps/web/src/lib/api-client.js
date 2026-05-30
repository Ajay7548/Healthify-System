import { tokenStore } from './token-store';

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? '/api/v1';

// Thrown for any non-success response so callers can branch on a stable `code`
// and show `message` directly to the user.
export class ApiError extends Error {
  constructor(message, { code, status, details } = {}) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

// Refresh is single-flight: if several requests hit a 401 at once, they all wait
// on one refresh instead of stampeding the endpoint with N rotations.
let refreshPromise = null;
// Set by the auth provider so a failed refresh can drop the app back to /login.
let onUnauthorized = () => {};

export function setUnauthorizedHandler(handler) {
  onUnauthorized = handler;
}

async function rawFetch(path, { method = 'GET', body, auth = true, headers = {} } = {}) {
  const finalHeaders = { ...headers };
  let payload = body;

  if (body !== undefined && !(body instanceof FormData)) {
    finalHeaders['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }
  if (auth) {
    const token = tokenStore.getAccess();
    if (token) finalHeaders.Authorization = `Bearer ${token}`;
  }

  return fetch(`${API_BASE}${path}`, { method, headers: finalHeaders, body: payload });
}

async function parse(response) {
  let body = null;
  try {
    body = await response.json();
  } catch {
    // Non-JSON (or empty) body — handled by the checks below.
  }

  if (response.ok && body?.success) return body;

  const error = body?.error ?? {};
  throw new ApiError(error.message || response.statusText || 'Request failed', {
    code: error.code,
    status: response.status,
    details: error.details,
  });
}

async function refreshSession() {
  const refreshToken = tokenStore.getRefresh();
  if (!refreshToken) throw new ApiError('No active session', { code: 'UNAUTHORIZED', status: 401 });

  const response = await rawFetch('/auth/refresh', {
    method: 'POST',
    body: { refreshToken },
    auth: false,
  });
  const body = await parse(response);
  tokenStore.set(body.data);
  return body.data;
}

// Core request: attaches the access token, and on a 401 tries exactly one
// transparent refresh-and-retry before giving up and ending the session.
export async function apiRequest(path, options = {}) {
  let response = await rawFetch(path, options);

  if (response.status === 401 && options.auth !== false && !options.__retried) {
    try {
      refreshPromise ??= refreshSession().finally(() => {
        refreshPromise = null;
      });
      await refreshPromise;
    } catch {
      tokenStore.clear();
      onUnauthorized();
      return parse(response); // throws the original 401 in the standard shape
    }
    response = await rawFetch(path, { ...options, __retried: true });
  }

  return parse(response);
}

export const api = {
  get: (path, options) => apiRequest(path, { ...options, method: 'GET' }),
  post: (path, body, options) => apiRequest(path, { ...options, method: 'POST', body }),
  patch: (path, body, options) => apiRequest(path, { ...options, method: 'PATCH', body }),
  delete: (path, options) => apiRequest(path, { ...options, method: 'DELETE' }),
};
