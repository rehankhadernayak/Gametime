"use client";

import { type ReactNode } from "react";
import { motion, type HTMLMotionProps } from "framer-motion";
import styles from "./GTBadge.module.css";

export type GTBadgeTone = "neutral" | "success" | "warning" | "danger" | "accent" | "info";
export type GTBadgeSize = "sm" | "md";

export type GTBadgeProps = {
  children?: ReactNode;
  tone?: GTBadgeTone;
  size?: GTBadgeSize;
} & Omit<HTMLMotionProps<"span">, "children">;

const toneClass: Record<GTBadgeTone, string> = {
  neutral: styles.neutral,
  success: styles.success,
  warning: styles.warning,
  danger: styles.danger,
  accent: styles.accent,
  info: styles.info,
};

export function GTBadge({
  children,
  tone = "neutral",
  size = "md",
  className = "",
  ...rest
}: GTBadgeProps) {
  const classNames = [styles.badge, toneClass[tone] ?? styles.neutral, styles[size], className]
    .filter(Boolean)
    .join(" ");

  return (
    <motion.span
      className={classNames}
      whileHover={{ scale: 1.04, y: -0.5 }}
      whileTap={{ scale: 0.97 }}
      transition={{ type: "spring", stiffness: 500, damping: 28 }}
      {...rest}
    >
      {children}
    </motion.span>
  );
}
