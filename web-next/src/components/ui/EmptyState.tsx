"use client";

import type { ReactNode } from "react";
import styles from "./EmptyState.module.css";

export type EmptyStateProps = {
  title: string;
  description: string;
  /** Optional primary action (e.g. GTButton) */
  action?: ReactNode;
  className?: string;
};

function DashedIllustration() {
  return (
    <svg
      className={styles.iconSvg}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <rect
        x="6"
        y="10"
        width="36"
        height="28"
        rx="6"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeDasharray="4 3"
        opacity="0.85"
      />
      <path
        d="M16 22h16M16 28h10"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
        strokeDasharray="3 2"
        opacity="0.55"
      />
    </svg>
  );
}

export function EmptyState({ title, description, action, className = "" }: EmptyStateProps) {
  return (
    <div className={[styles.wrap, className].filter(Boolean).join(" ")}>
      <div className={styles.iconWrap}>
        <DashedIllustration />
      </div>
      <h3 className={styles.title}>{title}</h3>
      <p className={styles.description}>{description}</p>
      {action ? <div className={styles.action}>{action}</div> : null}
    </div>
  );
}
