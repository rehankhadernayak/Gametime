'use client';

import ChildLogin from '@gametime/frontend/pages/ChildLogin.jsx';
import { useGametimeAuth } from '@/hooks/useGametimeAuth';

export default function ChildLoginPage() {
  const { setAuth } = useGametimeAuth();
  return <ChildLogin onAuth={setAuth} />;
}
