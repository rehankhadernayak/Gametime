'use client';

import HomePage from '@gametime/frontend/pages/HomePage.jsx';
import { useGametimeAuth } from '@/hooks/useGametimeAuth';

export default function Home() {
  const { auth } = useGametimeAuth();
  return <HomePage auth={auth} />;
}
