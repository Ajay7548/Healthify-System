import { useCallback, useEffect, useMemo, useState } from 'react';
import { tokenStore } from '@/lib/token-store';
import { setUnauthorizedHandler } from '@/lib/api-client';
import { AuthContext } from './auth-context';
import * as authApi from '@/api/auth-api';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [status, setStatus] = useState('loading');

  const clearSession = useCallback(() => {
    tokenStore.clear();
    setUser(null);
    setStatus('unauthenticated');
  }, []);

  // If the api client gives up on a request (refresh failed), drop the session
  // so the route guards bounce the user back to /login.
  useEffect(() => {
    setUnauthorizedHandler(clearSession);
  }, [clearSession]);

  // On first load, rehydrate the session from a stored token (no login flash on
  // refresh). A bad/expired token just resolves to "unauthenticated".
  useEffect(() => {
    let active = true;

    async function restore() {
      if (!tokenStore.hasSession()) {
        setStatus('unauthenticated');
        return;
      }
      try {
        const me = await authApi.fetchCurrentUser();
        if (active) {
          setUser(me);
          setStatus('authenticated');
        }
      } catch {
        if (active) clearSession();
      }
    }

    void restore();
    return () => {
      active = false;
    };
  }, [clearSession]);

  const login = useCallback(async (credentials) => {
    const result = await authApi.login(credentials);
    tokenStore.set(result);
    setUser(result.user);
    setStatus('authenticated');
    return result.user;
  }, []);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      // Even if the server call fails, we still clear the client session.
    }
    clearSession();
  }, [clearSession]);

  const value = useMemo(() => ({ user, status, login, logout }), [user, status, login, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
