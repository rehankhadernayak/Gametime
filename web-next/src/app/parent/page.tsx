'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useGametimeAuth } from '@/hooks/useGametimeAuth';

export default function ParentIndexPage() {
  const router = useRouter();
  const { auth } = useGametimeAuth();

  useEffect(() => {
    if (auth.role === 'parent') {
      router.replace('/parent/ai');
    } else {
      router.replace('/login');
    }
  }, [auth.role, router]);

  return null;
}
