"use client";

import type { ReactNode } from "react";
import styles from "@/styles/theme.module.css";

export const theme = {
  parentTheme: styles.parentTheme,
} as const;

type ParentThemeProps = {
  children: ReactNode;
  className?: string;
};

export function ParentTheme({ children, className }: ParentThemeProps) {
  return (
    <div className={[theme.parentTheme, className].filter(Boolean).join(" ")}>{children}</div>
  );
}
