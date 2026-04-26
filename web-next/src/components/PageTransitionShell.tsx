"use client";

import { AnimatePresence } from "framer-motion";
import { usePathname } from "next/navigation";
import { PageWrapper } from "./PageWrapper";
import shellStyles from "./page-transition-shell.module.css";

export function PageTransitionShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <AnimatePresence mode="wait">
      <PageWrapper key={pathname} className={shellStyles.transitionRoot}>
        {children}
      </PageWrapper>
    </AnimatePresence>
  );
}
