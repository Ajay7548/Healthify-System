import { createContext, useContext } from 'react';

// Holds { user, status, login, logout }. status is one of:
//   'loading'         — still checking for an existing session on first load
//   'authenticated'   — user is set
//   'unauthenticated' — no valid session
export const AuthContext = createContext(null);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used inside an <AuthProvider>');
  }
  return context;
}
