"use client";

import { useRouter } from "next/navigation";
import { useCallback, useMemo } from "react";

/** Minimal shim for `useNavigate()` from react-router — uses Next.js App Router. */
export function useAppRouter() {
  const router = useRouter();

  const push = useCallback((path: string) => router.push(path), [router]);
  const replace = useCallback((path: string) => router.replace(path), [router]);
  const back = useCallback(() => router.back(), [router]);

  return useMemo(
    () => ({
      push,
      replace,
      back,
    }),
    [push, replace, back],
  );
}
