"use client";

import { type ReactNode } from "react";
import { motion, useReducedMotion, type HTMLMotionProps } from "framer-motion";
import styles from "./GTBadge.module.css";

export type GTBadgeBaseTone = "neutral" | "success" | "warning" | "danger" | "accent" | "info";
export type GTBadgeChoreTone = "pending" | "approved" | "needsReview";
export type GTBadgeTone = GTBadgeBaseTone | GTBadgeChoreTone;
export type GTBadgeSize = "sm" | "md";

export type GTBadgeProps = {
  children?: ReactNode;
  tone?: GTBadgeTone;
  size?: GTBadgeSize;
} & Omit<HTMLMotionProps<"span">, "children">;

export function GTBadge({
  children,
  tone = "neutral",
  size = "md",
  className = "",
  ...rest
}: GTBadgeProps) {
  const reduceMotion = useReducedMotion();
  const toneClass = styles[tone] ?? styles.neutral;
  const classNames = [styles.badge, toneClass, styles[size], className].filter(Boolean).join(" ");

  return (
    <motion.span
      className={classNames}
      whileHover={reduceMotion ? undefined : { scale: 1.04, y: -0.5 }}
      whileTap={reduceMotion ? undefined : { scale: 0.97 }}
      transition={{ type: "spring", stiffness: 500, damping: 28 }}
      {...rest}
    >
      {children}
    </motion.span>
  );
}
