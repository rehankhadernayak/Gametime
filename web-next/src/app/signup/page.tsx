'use client';

import ParentSignUp from '@gametime/frontend/pages/ParentSignUp.jsx';
import { useGametimeAuth } from '@/hooks/useGametimeAuth';

export default function SignUpPage() {
  const { setAuth } = useGametimeAuth();
  return <ParentSignUp onAuth={setAuth} />;
}
