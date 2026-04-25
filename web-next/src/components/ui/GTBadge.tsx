"use client";

import type { ReactNode } from "react";
import styles from "./gt-ui.module.css";

const toneClass: Record<string, string> = {
  neutral: styles.badgeNeutral,
  warning: styles.badgeWarning,
  success: styles.badgeSuccess,
  danger: styles.badgeDanger,
  info: styles.badgeInfo,
};

type GTBadgeProps = {
  children: ReactNode;
  tone?: keyof typeof toneClass;
  className?: string;
};

export function GTBadge({ children, tone = "neutral", className }: GTBadgeProps) {
  const toneStyle = toneClass[tone] ?? toneClass.neutral;
  return (
    <span className={[styles.badge, toneStyle, className].filter(Boolean).join(" ")}>
      {children}
    </span>
  );
}
