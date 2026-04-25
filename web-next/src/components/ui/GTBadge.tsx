import type { HTMLAttributes, ReactNode } from "react";
import styles from "./GTBadge.module.css";

export type GTBadgeTone = "pending" | "approved" | "needsReview";

const toneClass: Record<GTBadgeTone, string> = {
  pending: styles.pending,
  approved: styles.approved,
  needsReview: styles.needsReview,
};

export type GTBadgeProps = HTMLAttributes<HTMLSpanElement> & {
  tone: GTBadgeTone;
  children: ReactNode;
};

export function GTBadge({ tone, children, className, ...rest }: GTBadgeProps) {
  return (
    <span className={[styles.root, toneClass[tone], className].filter(Boolean).join(" ")} {...rest}>
      {children}
    </span>
  );
}
