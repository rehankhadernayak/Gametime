'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useGametimeAuth } from '@/hooks/useGametimeAuth';

export default function ParentIndexPage() {
  const router = useRouter();
  const { auth, authHydrated } = useGametimeAuth();

  useEffect(() => {
    if (!authHydrated) return;
    if (auth.role === 'parent') {
      router.replace('/parent/ai');
    } else {
      router.replace('/login');
    }
  }, [auth.role, authHydrated, router]);

  return null;
}
