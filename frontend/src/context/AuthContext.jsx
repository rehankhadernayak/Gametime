import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { apiRequest } from '../api/client.js';

const AuthContext = createContext(null);

const USER_ROLE_COOKIE = 'user_role';

export function readUserRoleCookie() {
  if (typeof document === 'undefined') return '';
  const parts = document.cookie.split(';');
  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed.startsWith(`${USER_ROLE_COOKIE}=`)) continue;
    const value = decodeURIComponent(trimmed.slice(USER_ROLE_COOKIE.length + 1)).trim();
    if (value === 'parent' || value === 'child') return value;
  }
  return '';
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState('');
  const [role, setRole] = useState('');
  const [user, setUser] = useState(null);
  const [sessionChecked, setSessionChecked] = useState(false);
  const [cookieRole, setCookieRole] = useState(() => readUserRoleCookie());
  const [parentNavUnlocked, setParentNavUnlocked] = useState(false);

  const refreshCookieRole = useCallback(() => {
    setCookieRole(readUserRoleCookie());
  }, []);

  useEffect(() => {
    const onCookieRefresh = () => refreshCookieRole();
    window.addEventListener('gametime:cookie-role-refresh', onCookieRefresh);
    return () => window.removeEventListener('gametime:cookie-role-refresh', onCookieRefresh);
  }, [refreshCookieRole]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await apiRequest('/auth/me', { suppressErrorToast: true });
        if (cancelled) return;
        setRole(data.role || '');
        setUser(data.user || null);
        setToken('');
        try {
          await apiRequest('/auth/sync-cookies', { method: 'POST', suppressErrorToast: true });
        } catch {
          /* optional — older backends */
        }
        refreshCookieRole();
      } catch {
        if (!cancelled) {
          setRole('');
          setUser(null);
          setToken('');
        }
      } finally {
        if (!cancelled) setSessionChecked(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshCookieRole]);

  const setAuth = useCallback((next) => {
    setToken(next.token || '');
    setRole(next.role || '');
    setUser(next.user ?? null);
    refreshCookieRole();
  }, [refreshCookieRole]);

  const clearAuth = useCallback(() => {
    setToken('');
    setRole('');
    setUser(null);
    setParentNavUnlocked(false);
    refreshCookieRole();
  }, [refreshCookieRole]);

  const unlockParentNav = useCallback(() => {
    setParentNavUnlocked(true);
    refreshCookieRole();
  }, [refreshCookieRole]);

  const lockParentNav = useCallback(() => {
    setParentNavUnlocked(false);
  }, []);

  const hasSession = Boolean((token || user) && role);

  const showParentChrome = useMemo(() => {
    if (role === 'parent') return true;
    if (role === 'child' && parentNavUnlocked) return true;
    return false;
  }, [role, parentNavUnlocked]);

  const value = useMemo(
    () => ({
      token,
      role,
      user,
      cookieRole,
      sessionChecked,
      hasSession,
      showParentChrome,
      parentNavUnlocked,
      setAuth,
      clearAuth,
      refreshCookieRole,
      unlockParentNav,
      lockParentNav
    }),
    [
      token,
      role,
      user,
      cookieRole,
      sessionChecked,
      hasSession,
      showParentChrome,
      parentNavUnlocked,
      setAuth,
      clearAuth,
      refreshCookieRole,
      unlockParentNav,
      lockParentNav
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
