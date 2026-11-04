import type { AdminAuthResult } from '@eaternity/shared';
import { useToast } from '@eaternity/ui';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { ADMIN_TOKEN_KEY, api, setUnauthorizedHandler } from '../lib/api';

const EMAIL_KEY = 'eaternity.admin.email';

interface AdminAuthValue {
  email: string | null;
  isSignedIn: boolean;
  signIn: (result: AdminAuthResult) => void;
  signOut: () => void;
}

const AdminAuthContext = createContext<AdminAuthValue | null>(null);

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const toast = useToast();
  const [token, setToken] = useState(() => localStorage.getItem(ADMIN_TOKEN_KEY));
  const [email, setEmail] = useState(() => localStorage.getItem(EMAIL_KEY));

  const signOut = useCallback(() => {
    localStorage.removeItem(ADMIN_TOKEN_KEY);
    localStorage.removeItem(EMAIL_KEY);
    setToken(null);
    setEmail(null);
  }, []);

  const signIn = useCallback((result: AdminAuthResult) => {
    localStorage.setItem(ADMIN_TOKEN_KEY, result.token);
    localStorage.setItem(EMAIL_KEY, result.email);
    setToken(result.token);
    setEmail(result.email);
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      signOut();
      toast.info('Your session has ended. Please sign in again.');
    });
  }, [signOut, toast]);

  // Check a stored session once on load; the handler above signs out if it has expired.
  useEffect(() => {
    if (localStorage.getItem(ADMIN_TOKEN_KEY)) api.me().catch(() => {});
  }, []);

  const value = useMemo(
    () => ({ email, isSignedIn: Boolean(token), signIn, signOut }),
    [email, token, signIn, signOut],
  );
  return <AdminAuthContext.Provider value={value}>{children}</AdminAuthContext.Provider>;
}

export function useAdminAuth(): AdminAuthValue {
  const context = useContext(AdminAuthContext);
  if (!context) throw new Error('useAdminAuth must be used inside AdminAuthProvider');
  return context;
}
