'use client';

import React, { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import { flushSync } from 'react-dom';
import { usePathname, useRouter } from 'next/navigation';
import { Toaster, toast } from 'sonner';
import { StringTuneRoot } from '@/components/StringTuneRoot';
import shell from './app-shell.module.css';
import { apiRequest } from '@gametime/frontend/api/client.js';
import NavBar from '@gametime/frontend/components/NavBar.jsx';
import { trackEvent } from '@gametime/frontend/utils/analytics.js';
import {
  clearDashboardSessionCookies,
  restoreAuthFromCookieSession,
  switchToChildSession,
} from '@/lib/auth/syncWebSession';

export type GametimeAuthState = {
  token: string;
  role: string;
  user: { id?: string; name?: string; email?: string; isAdmin?: boolean } | null;
};

type ToastDetail = { type?: string; title?: string; message?: string };

function emitGametimeToast(detail: ToastDetail) {
  const title = detail.title?.trim();
  const message = detail.message?.trim();
  const type = detail.type;
  const opts =
    title && message && title !== message ? ({ description: message } as const) : undefined;
  const headline = title || message || 'Update';

  if (type === 'error') {
    toast.error(opts ? title! : headline, opts);
    return;
  }
  if (type === 'warning') {
    toast.warning(opts ? title! : headline, opts);
    return;
  }
  if (type === 'success') {
    toast.success(opts ? title! : headline, opts);
    return;
  }
  if (opts) {
    toast(headline, opts);
    return;
  }
  toast(headline);
}

function BackIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false">
      <path
        d="M15 5l-7 7 7 7"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function HomeIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false">
      <path
        d="M3 10.5L12 3l9 7.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M6 10v10h12V10"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const defaultAuth: GametimeAuthState = { token: '', role: '', user: null };

function readStoredAuth(): GametimeAuthState {
  if (typeof window === 'undefined') return defaultAuth;
  try {
    const raw = localStorage.getItem('gametime_auth');
    return raw ? JSON.parse(raw) : defaultAuth;
  } catch {
    return defaultAuth;
  }
}

export const GametimeAuthContext = createContext<{
  auth: GametimeAuthState;
  authHydrated: boolean;
  setAuth: (next: GametimeAuthState) => void;
  logout: () => Promise<void>;
  switchToChild: (childId: string) => Promise<void>;
} | null>(null);

export function Providers({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [auth, setAuth] = useState<GametimeAuthState>(defaultAuth);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const fromLs = readStoredAuth();
      if (fromLs.token) {
        if (!cancelled) {
          setAuth(fromLs);
          setHydrated(true);
        }
        return;
      }
      const restored = await restoreAuthFromCookieSession();
      if (cancelled) return;
      const latest = readStoredAuth();
      if (latest.token) {
        setAuth(latest);
        setHydrated(true);
        return;
      }
      if (restored?.token) {
        setAuth({
          token: restored.token,
          role: restored.role,
          user: restored.user as GametimeAuthState['user'],
        });
      } else {
        setAuth(fromLs);
      }
      setHydrated(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem('gametime_auth', JSON.stringify(auth));
    } catch {
      // ignore
    }
  }, [auth, hydrated]);

  const handleLogout = useCallback(async () => {
    try {
      if (auth.token) {
        await apiRequest('/auth/logout', { method: 'POST', token: auth.token });
      }
    } catch {
      // Always continue local logout even if server logout fails.
    } finally {
      setAuth(defaultAuth);
      try {
        localStorage.removeItem('gametime_auth');
      } catch {
        // ignore
      }
      try {
        await clearDashboardSessionCookies();
      } catch {
        // ignore
      }
      trackEvent('logout', { fromPath: pathname });
    }
  }, [auth.token, pathname]);

  useEffect(() => {
    const onToast = (event: Event) => {
      const ce = event as CustomEvent<ToastDetail>;
      emitGametimeToast(ce.detail || { message: 'Update' });
    };
    const onSessionExpired = async () => {
      if (!auth.token) return;
      await handleLogout();
      router.replace('/login');
      toast.warning('Session expired', { description: 'Please sign in again.' });
    };

    window.addEventListener('gametime:toast', onToast as EventListener);
    window.addEventListener('gametime:session-expired', onSessionExpired);
    return () => {
      window.removeEventListener('gametime:toast', onToast as EventListener);
      window.removeEventListener('gametime:session-expired', onSessionExpired);
    };
  }, [auth.token, handleLogout, pathname, router]);

  const switchToChild = useCallback(
    async (childId: string) => {
      try {
        const response = await switchToChildSession(auth.token, childId);
        flushSync(() => {
          setAuth({ token: response.token, role: 'child', user: response.child as GametimeAuthState['user'] });
        });
        router.replace('/child/dashboard');
        trackEvent('switch_to_child_success', { childId });
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Please try again.';
        trackEvent('switch_to_child_failed', { childId, error: message });
        toast.error('Unable to open child view', {
          description: message || 'Please try again.',
        });
      }
    },
    [auth.token, router]
  );

  /** Hide on auth routes — legacy `.utility-bar` can sit above the fold and eat clicks on Sign in / signup. */
  const hideUtilityChrome =
    pathname === '/login' ||
    pathname === '/signup' ||
    pathname === '/forgot-password' ||
    pathname === '/reset-password' ||
    pathname === '/child-login';
  const showUtility = !auth.token && !hideUtilityChrome;

  const authValue = useMemo(
    () => ({ auth, authHydrated: hydrated, setAuth, logout: handleLogout, switchToChild }),
    [auth, hydrated, handleLogout, switchToChild]
  );

  return (
    <GametimeAuthContext.Provider value={authValue}>
      <StringTuneRoot />
      <Toaster position="bottom-right" richColors expand closeButton />
      {showUtility && (
        <div className="utility-bar" aria-label="Global navigation controls">
          <button
            type="button"
            className="icon-button"
            aria-label="Go back"
            onClick={() => (typeof window !== 'undefined' && window.history.length > 1 ? router.back() : router.push('/'))}
          >
            <BackIcon />
          </button>
          <button type="button" className="icon-button" aria-label="Go home" onClick={() => router.push('/')}>
            <HomeIcon />
          </button>
          <span className="utility-path">{pathname}</span>
        </div>
      )}

      {auth.token ? (
        <NavBar
          role={auth.role}
          token={auth.token}
          onLogout={handleLogout}
          isAdmin={Boolean(auth.user?.isAdmin)}
        />
      ) : null}

      <main className={shell.appMain}>{children}</main>
    </GametimeAuthContext.Provider>
  );
}
