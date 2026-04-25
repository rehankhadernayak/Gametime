'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AiWorkspacePage from '@gametime/frontend/pages/AiWorkspacePage.jsx';
import { useGametimeAuth } from '@/hooks/useGametimeAuth';

export default function ParentAiPage() {
  const router = useRouter();
  const { auth } = useGametimeAuth();

  useEffect(() => {
    if (auth.role !== 'parent') router.replace('/login');
  }, [auth.role, router]);

  if (auth.role !== 'parent') return null;

  return <AiWorkspacePage token={auth.token} parentName={auth.user?.name} />;
}
