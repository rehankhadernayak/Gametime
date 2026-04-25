"use client";

import { forwardRef, type ReactNode } from "react";
import { motion, type HTMLMotionProps } from "framer-motion";
import styles from "./GTButton.module.css";

export type GTButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type GTButtonSize = "sm" | "md" | "lg";

export type GTButtonProps = {
  variant?: GTButtonVariant;
  size?: GTButtonSize;
  loading?: boolean;
  children?: ReactNode;
} & Omit<HTMLMotionProps<"button">, "children">;

const variantClass: Record<GTButtonVariant, string> = {
  primary: styles.primary,
  secondary: styles.secondary,
  ghost: styles.ghost,
  danger: styles.danger,
};

export const GTButton = forwardRef<HTMLButtonElement, GTButtonProps>(function GTButton(
  {
    variant = "primary",
    size = "md",
    loading = false,
    disabled,
    className = "",
    children,
    type = "button",
    ...rest
  },
  ref,
) {
  const isDisabled = Boolean(disabled || loading);
  const classNames = [styles.button, variantClass[variant], styles[size], className]
    .filter(Boolean)
    .join(" ");

  return (
    <motion.button
      ref={ref}
      type={type}
      className={classNames}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      whileHover={isDisabled ? undefined : { scale: 1.02, y: -1 }}
      whileTap={isDisabled ? undefined : { scale: 0.98, y: 0 }}
      transition={{ type: "spring", stiffness: 520, damping: 28 }}
      {...rest}
    >
      {loading ? <span className={styles.spinner} aria-hidden /> : null}
      <span style={{ opacity: loading ? 0.85 : 1 }}>{children}</span>
    </motion.button>
  );
});
