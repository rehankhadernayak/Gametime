"use client";

import type { ReactNode } from "react";
import styles from "./ChildGamerHub.module.css";

export type GTCardProps = {
  children: ReactNode;
  /** Frosted glass surface */
  glass?: boolean;
  /** Console-style hover lift + tap scale */
  interactive?: boolean;
  className?: string;
};

export function GTCard({ children, glass = false, interactive = false, className }: GTCardProps) {
  const classes = [
    styles.gtCard,
    glass ? styles.gtCardGlass : "",
    interactive ? styles.gtCardInteractive : "",
    className ?? "",
  ]
    .filter(Boolean)
    .join(" ");

  return <div className={classes}>{children}</div>;
}
