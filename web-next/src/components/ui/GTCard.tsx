"use client";

import { type ReactNode } from "react";
import { motion, useReducedMotion, type HTMLMotionProps } from "framer-motion";
import theme from "@/styles/theme.module.css";
import styles from "./GTCard.module.css";

export type GTCardProps = {
  children?: ReactNode;
  /** Use frosted glass background */
  glass?: boolean;
  /** Padding preset */
  padding?: "sm" | "md" | "lg";
  className?: string;
} & Omit<HTMLMotionProps<"div">, "children">;

export function GTCard({
  children,
  glass = false,
  padding = "md",
  className = "",
  ...rest
}: GTCardProps) {
  const reduceMotion = useReducedMotion();
  const padClass =
    padding === "sm" ? styles.paddingSm : padding === "lg" ? styles.paddingLg : styles.paddingMd;

  const classNames = [styles.card, theme.gtPremiumBorder, glass ? styles.glass : "", padClass, className]
    .filter(Boolean)
    .join(" ");

  return (
    <motion.div
      className={classNames}
      initial={false}
      whileHover={reduceMotion ? undefined : { y: -3, transition: { type: "spring", stiffness: 420, damping: 26 } }}
      whileTap={reduceMotion ? undefined : { scale: 0.995 }}
      transition={{ type: "spring", stiffness: 400, damping: 32 }}
      {...rest}
    >
      {children}
    </motion.div>
  );
}
