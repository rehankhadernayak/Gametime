'use client';

import { Suspense, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import SettingsPage from '@gametime/frontend/pages/SettingsPage.jsx';
import { useGametimeAuth } from '@/hooks/useGametimeAuth';
import { useGametimeTheme } from '@/hooks/useGametimeTheme';

function ParentSettingsInner() {
  const router = useRouter();
  const { auth } = useGametimeAuth();
  const { theme, toggleTheme } = useGametimeTheme();

  useEffect(() => {
    if (auth.role !== 'parent') router.replace('/login');
  }, [auth.role, router]);

  if (auth.role !== 'parent') return null;

  return (
    <SettingsPage
      token={auth.token}
      theme={theme}
      onToggleTheme={toggleTheme}
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
