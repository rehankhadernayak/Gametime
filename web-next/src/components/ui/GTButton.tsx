"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import styles from "./gt-ui.module.css";

type GTButtonVariant = "primary" | "secondary" | "ghost" | "danger";

const variantClass: Record<GTButtonVariant, string> = {
  primary: styles.btnPrimary,
  secondary: styles.btnSecondary,
  ghost: styles.btnGhost,
  danger: styles.btnDanger,
};

type GTButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  variant?: GTButtonVariant;
  size?: "md" | "sm";
  className?: string;
};

export function GTButton({
  children,
  variant = "primary",
  size = "md",
  className,
  type = "button",
  ...rest
}: GTButtonProps) {
  const sizeCls = size === "sm" ? styles.btnSm : styles.btnMd;
  return (
    <button
      type={type}
      className={[styles.btn, variantClass[variant], sizeCls, className].filter(Boolean).join(" ")}
      {...rest}
    >
      {children}
    </button>
  );
}
