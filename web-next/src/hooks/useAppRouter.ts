"use client";

import { useRouter } from "next/navigation";
import { useCallback } from "react";

/**
 * Thin wrapper around Next navigation for parity with the legacy SPA router.
 */
export function useAppRouter() {
  const router = useRouter();

  const push = useCallback(
    (href: string) => {
      router.push(href);
    },
    [router]
  );

  const replace = useCallback(
    (href: string) => {
      router.replace(href);
    },
    [router]
  );

  return { push, replace, back: router.back, refresh: router.refresh };
}
