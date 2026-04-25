import type { HTMLAttributes, ReactNode } from "react";
import theme from "@/styles/theme.module.css";

export type ThemeSurfaceVariant = "parent" | "child";

export type ThemeSurfaceProps = HTMLAttributes<HTMLDivElement> & {
  variant: ThemeSurfaceVariant;
  children: ReactNode;
};

/**
 * Applies parent or child dashboard tokens (--gt-*) plus a stable global class
 * (`gt-dashboard-parent` / `gt-dashboard-child`) so UI modules can style descendants.
 */
export function ThemeSurface({ variant, className, children, ...rest }: ThemeSurfaceProps) {
  const hook = variant === "parent" ? "gt-dashboard-parent" : "gt-dashboard-child";
  const surfaceClass = variant === "parent" ? theme.parentTheme : theme.childTheme;

  return (
    <div className={[surfaceClass, hook, className].filter(Boolean).join(" ")} {...rest}>
      {children}
    </div>
  );
}
