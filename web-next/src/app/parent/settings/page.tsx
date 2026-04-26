'use client';

import { Suspense, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import SettingsPage from '@gametime/frontend/pages/SettingsPage.jsx';
import { useGametimeAuth } from '@/hooks/useGametimeAuth';

function ParentSettingsInner() {
  const router = useRouter();
  const { auth, authHydrated } = useGametimeAuth();

  useEffect(() => {
    if (!authHydrated) return;
    if (auth.role !== 'parent') router.replace('/login');
  }, [auth.role, authHydrated, router]);

  if (auth.role !== 'parent') return null;

  return (
    <SettingsPage
      token={auth.token}
      parentName={auth.user?.name}
    />
  );
}

export default function ParentSettingsPage() {
  return (
    <Suspense fallback={null}>
      <ParentSettingsInner />
    </Suspense>
  );
}
