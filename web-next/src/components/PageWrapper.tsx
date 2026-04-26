"use client";

import { motion } from "framer-motion";

const pageTransition = { duration: 0.3, ease: "easeOut" as const };

export type PageWrapperProps = {
  children: React.ReactNode;
  className?: string;
};

export function PageWrapper({ children, className }: PageWrapperProps) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={pageTransition}
    >
      {children}
    </motion.div>
  );
}
