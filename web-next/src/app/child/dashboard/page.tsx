'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ChildDashboard from '@gametime/frontend/pages/ChildDashboard.jsx';
import { useGametimeAuth } from '@/hooks/useGametimeAuth';

export default function ChildDashboardPage() {
  const router = useRouter();
  const { auth } = useGametimeAuth();

  useEffect(() => {
    if (auth.role !== 'child') router.replace('/login');
  }, [auth.role, router]);

  if (auth.role !== 'child') return null;

  return <ChildDashboard token={auth.token} />;
}
