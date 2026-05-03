'use client';

import NextLink from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';

export function useAppRouter() {
  const router = useRouter();
  return {
    push: (href) => router.push(href),
    replace: (href) => router.replace(href),
    back: () => router.back()
  };
}

export function useAppSearchParams() {
  return useSearchParams();
}

export function GametimeLink({ href, children, className, ...props }) {
  return (
    <NextLink href={href} className={className} {...props}>
      {children}
    </NextLink>
  );
}
