'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ParentDashboard from '@gametime/frontend/pages/ParentDashboard.jsx';
import { useGametimeAuth } from '@/hooks/useGametimeAuth';

export default function ParentDashboardPage() {
  const router = useRouter();
  const { auth, switchToChild } = useGametimeAuth();

  useEffect(() => {
    if (auth.role !== 'parent') router.replace('/login');
  }, [auth.role, router]);

  if (auth.role !== 'parent') return null;

  return (
    <ParentDashboard
      token={auth.token}
      onSwitchToChild={switchToChild}
      parentName={auth.user?.name}
    />
  );
}
