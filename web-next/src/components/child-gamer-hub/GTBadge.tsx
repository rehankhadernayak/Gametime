"use client";

import type { ReactNode } from "react";
import styles from "./ChildGamerHub.module.css";

export type GTBadgeProps = {
  children: ReactNode;
  tone?: "accent" | "default";
  className?: string;
};

export function GTBadge({ children, tone = "default", className }: GTBadgeProps) {
  const classes = [
    styles.gtBadge,
    tone === "accent" ? styles.gtBadgeAccent : "",
    className ?? "",
  ]
    .filter(Boolean)
    .join(" ");

  return <span className={classes}>{children}</span>;
}
