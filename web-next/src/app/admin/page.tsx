'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AdminPage from '@gametime/frontend/pages/AdminPage.jsx';
import { useGametimeAuth } from '@/hooks/useGametimeAuth';

export default function AdminRoutePage() {
  const router = useRouter();
  const { auth } = useGametimeAuth();

  useEffect(() => {
    if (auth.role !== 'parent' || !auth.user?.isAdmin) {
      router.replace('/login');
    }
  }, [auth.role, auth.user?.isAdmin, router]);

  if (auth.role !== 'parent' || !auth.user?.isAdmin) return null;

  return <AdminPage token={auth.token} />;
}
