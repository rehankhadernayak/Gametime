"use client";

import type { ReactNode } from "react";
import { AuthProvider } from "@gametime/frontend/context/AuthContext.jsx";
import { Providers } from "@/app/providers";
import { PageTransitionShell } from "@/components/PageTransitionShell";

export function AppRootProviders({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <Providers>
        <PageTransitionShell>{children}</PageTransitionShell>
      </Providers>
    </AuthProvider>
  );
}
