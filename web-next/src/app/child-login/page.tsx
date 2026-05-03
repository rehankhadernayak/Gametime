'use client';

import ChildLogin from '@gametime/frontend/pages/ChildLogin.jsx';
import { useGametimeAuth } from '@/hooks/useGametimeAuth';
import type { GametimeAuthState } from '@/app/providers';
import { syncDashboardSessionCookies } from '@/lib/auth/syncWebSession';

export default function ChildLoginPage() {
  const { setAuth } = useGametimeAuth();

  async function onAuth(next: GametimeAuthState) {
    setAuth(next);
    await syncDashboardSessionCookies(next.token);
  }

  return <ChildLogin onAuth={onAuth} />;
}
