"use client";

import { forwardRef, type ReactNode } from "react";
import { motion, useReducedMotion, type HTMLMotionProps } from "framer-motion";
import styles from "./GTButton.module.css";

export type GTButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type GTButtonSize = "sm" | "md" | "lg";

export type GTButtonProps = {
  variant?: GTButtonVariant;
  size?: GTButtonSize;
  loading?: boolean;
  fullWidth?: boolean;
  children?: ReactNode;
} & Omit<HTMLMotionProps<"button">, "children">;

export const GTButton = forwardRef<HTMLButtonElement, GTButtonProps>(function GTButton(
  {
    variant = "primary",
    size = "md",
    loading = false,
    fullWidth = false,
    disabled,
    className = "",
    children,
    type = "button",
    ...rest
  },
  ref,
) {
  const reduceMotion = useReducedMotion();
  const isDisabled = Boolean(disabled || loading);
  const classNames = [styles.button, styles[variant], styles[size], fullWidth ? styles.fullWidth : "", className]
    .filter(Boolean)
    .join(" ");

  return (
    <motion.button
      ref={ref}
      type={type}
      className={classNames}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      whileHover={reduceMotion || isDisabled ? undefined : { scale: 1.02, y: -1 }}
      whileTap={reduceMotion || isDisabled ? undefined : { scale: 0.97, y: 0 }}
      transition={{ type: "spring", stiffness: 520, damping: 28 }}
      {...rest}
    >
      {loading ? <span className={styles.spinner} aria-hidden /> : null}
      <span style={{ opacity: loading ? 0.85 : 1 }}>{children}</span>
    </motion.button>
  );
});
