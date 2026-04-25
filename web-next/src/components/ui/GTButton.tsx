"use client";

import { motion, useReducedMotion, type HTMLMotionProps } from "framer-motion";
import type { ReactNode } from "react";
import styles from "./GTButton.module.css";

export type GTButtonVariant = "primary" | "secondary" | "ghost";
export type GTButtonSize = "sm" | "md" | "lg";

export type GTButtonProps = Omit<HTMLMotionProps<"button">, "children"> & {
  variant?: GTButtonVariant;
  size?: GTButtonSize;
  fullWidth?: boolean;
  children: ReactNode;
};

const variantClass: Record<GTButtonVariant, string> = {
  primary: styles.primary,
  secondary: styles.secondary,
  ghost: styles.ghost,
};

const sizeClass: Record<GTButtonSize, string> = {
  sm: styles.sm,
  md: "",
  lg: styles.lg,
};

export function GTButton({
  variant = "primary",
  size = "md",
  fullWidth,
  className,
  children,
  type = "button",
  ...rest
}: GTButtonProps) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.button
      type={type}
      className={[
        styles.root,
        variantClass[variant],
        sizeClass[size],
        fullWidth ? styles.fullWidth : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      whileTap={reduceMotion ? undefined : { scale: 0.97 }}
      transition={{ type: "spring", stiffness: 520, damping: 32 }}
      {...rest}
    >
      {children}
    </motion.button>
  );
}
