'use client';

import { useContext } from 'react';
import { GametimeAuthContext } from '@/app/providers';

export function useGametimeAuth() {
  const ctx = useContext(GametimeAuthContext);
  if (!ctx) throw new Error('useGametimeAuth must be used within Providers');
  return ctx;
}
