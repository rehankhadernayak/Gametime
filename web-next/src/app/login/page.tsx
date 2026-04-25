'use client';

import ParentLogin from '@gametime/frontend/pages/ParentLogin.jsx';
import { useGametimeAuth } from '@/hooks/useGametimeAuth';

export default function LoginPage() {
  const { setAuth } = useGametimeAuth();
  return <ParentLogin onAuth={setAuth} />;
}
