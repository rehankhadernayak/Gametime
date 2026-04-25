'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ParentOnboarding from '@gametime/frontend/pages/ParentOnboarding.jsx';
import { useGametimeAuth } from '@/hooks/useGametimeAuth';

export default function ParentOnboardingPage() {
  const router = useRouter();
  const { auth } = useGametimeAuth();

  useEffect(() => {
    if (auth.role !== 'parent') router.replace('/login');
  }, [auth.role, router]);

  if (auth.role !== 'parent') return null;

  return <ParentOnboarding token={auth.token} />;
}
