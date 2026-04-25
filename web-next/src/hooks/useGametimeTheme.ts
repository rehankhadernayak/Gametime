'use client';

import { useContext } from 'react';
import { GametimeThemeContext } from '@/app/providers';

export function useGametimeTheme() {
  const ctx = useContext(GametimeThemeContext);
  if (!ctx) throw new Error('useGametimeTheme must be used within Providers');
  return ctx;
}
