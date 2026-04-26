"use client";

import { useInsertionEffect, useRef, type HTMLAttributes, type ReactNode } from "react";
import styles from "./DashboardPageShell.module.css";

export type DashboardGridSpan = "full" | "half" | "third" | "twoThirds";

const spanClass: Record<DashboardGridSpan, string | undefined> = {
  full: styles.span12,
  half: styles.span6,
  third: styles.span4,
  twoThirds: styles.span8,
};

export type DashboardPageShellProps = HTMLAttributes<HTMLDivElement> & {
  title?: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
};

/**
 * Consistent dashboard padding and responsive widget grid.
 * Place direct children as widget roots; on wide screens they flow in a 12-column grid
 * unless you wrap them in DashboardWidget with span props.
 */
export function DashboardPageShell({
  title,
  subtitle,
  actions,
  children,
  className,
  ...rest
}: DashboardPageShellProps) {
  const hasHeader = title != null || subtitle != null || actions != null;
  const titleText = typeof title === "string" ? title : null;
  const titleRevealRef = useRef<HTMLSpanElement>(null);

  useInsertionEffect(() => {
    const el = titleRevealRef.current;
    if (!el || titleText == null) return;
    el.textContent = titleText;
  }, [titleText]);

  return (
    <div className={[styles.outer, className].filter(Boolean).join(" ")} {...rest}>
      <div className={styles.inner}>
        {hasHeader ? (
          <header className={styles.header}>
            <div>
              {title ? (
                titleText != null ? (
                  <h1 className={styles.title} aria-label={titleText}>
                    <span
                      key={titleText}
                      ref={titleRevealRef}
                      className={styles.titleReveal}
                      string="split"
                      string-split="char[start]|word[start]"
                      aria-hidden="true"
                    />
                  </h1>
                ) : (
                  <h1 className={styles.title}>{title}</h1>
                )
              ) : null}
              {subtitle ? <p className={styles.subtitle}>{subtitle}</p> : null}
            </div>
            {actions ? <div className={styles.actions}>{actions}</div> : null}
          </header>
        ) : null}
        <div className={styles.grid}>{children}</div>
      </div>
    </div>
  );
}

export type DashboardWidgetProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
  span?: DashboardGridSpan;
};

/** Optional wrapper so a widget participates in the 12-column layout on large screens. */
export function DashboardWidget({
  children,
  span = "full",
  className,
  ...rest
}: DashboardWidgetProps) {
  return (
    <div className={[spanClass[span], className].filter(Boolean).join(" ")} {...rest}>
      {children}
    </div>
  );
}
