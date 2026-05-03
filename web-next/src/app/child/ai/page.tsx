'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ChildAiPage from '@gametime/frontend/pages/ChildAiPage.jsx';
import { useGametimeAuth } from '@/hooks/useGametimeAuth';

export default function ChildAiPageRoute() {
  const router = useRouter();
  const { auth, authHydrated } = useGametimeAuth();

  useEffect(() => {
    if (!authHydrated) return;
    if (auth.role !== 'child') router.replace('/login');
  }, [auth.role, authHydrated, router]);

  if (!authHydrated || auth.role !== 'child') return null;

  return <ChildAiPage token={auth.token} childName={auth.user?.name} />;
}
