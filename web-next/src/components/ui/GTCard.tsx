"use client";

import type { ReactNode } from "react";
import styles from "./gt-ui.module.css";

type GTCardProps = {
  children: ReactNode;
  className?: string;
  title?: ReactNode;
  description?: ReactNode;
  headerExtra?: ReactNode;
  /** Use h3 for nested cards inside another card. */
  titleLevel?: "h2" | "h3";
};

export function GTCard({
  children,
  className,
  title,
  description,
  headerExtra,
  titleLevel = "h2",
}: GTCardProps) {
  const hasHeader = title != null || description != null || headerExtra != null;
  const TitleTag = titleLevel;

  return (
    <section className={[styles.card, className].filter(Boolean).join(" ")}>
      {hasHeader ? (
        <header className={styles.cardHeader}>
          <div>
            {title != null ? <TitleTag className={styles.cardTitle}>{title}</TitleTag> : null}
            {description != null ? <p className={styles.cardDescription}>{description}</p> : null}
          </div>
          {headerExtra}
        </header>
      ) : null}
      <div className={styles.cardBody}>{children}</div>
    </section>
  );
}
