"use client";

import type { ReactNode } from "react";
import parentThemeStyles from "./parent-theme.module.css";

export const theme = {
  parentTheme: parentThemeStyles.wrapper,
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
