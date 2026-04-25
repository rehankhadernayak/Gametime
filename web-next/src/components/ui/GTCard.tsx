"use client";

import { type ReactNode } from "react";
import { motion, type HTMLMotionProps } from "framer-motion";
import theme from "@/styles/theme.module.css";
import styles from "./GTCard.module.css";

export type GTCardProps = {
  children?: ReactNode;
  /** Use frosted glass background */
  glass?: boolean;
  /** Padding preset */
  padding?: "sm" | "md" | "lg";
  className?: string;
  title?: ReactNode;
  description?: ReactNode;
  headerExtra?: ReactNode;
  /** Use h3 for nested cards inside another card. */
  titleLevel?: "h2" | "h3";
} & Omit<HTMLMotionProps<"div">, "children">;

export function GTCard({
  children,
  glass = false,
  padding = "md",
  className = "",
  title,
  description,
  headerExtra,
  titleLevel = "h2",
  ...rest
}: GTCardProps) {
  const padClass =
    padding === "sm" ? styles.paddingSm : padding === "lg" ? styles.paddingLg : styles.paddingMd;

  const classNames = [styles.card, theme.gtPremiumBorder, glass ? styles.glass : "", padClass, className]
    .filter(Boolean)
    .join(" ");

  const hasHeader = title != null || description != null || headerExtra != null;
  const TitleTag = titleLevel;

  return (
    <motion.div
      className={classNames}
      initial={false}
      whileHover={{ y: -3, transition: { type: "spring", stiffness: 420, damping: 26 } }}
      whileTap={{ scale: 0.995 }}
      transition={{ type: "spring", stiffness: 400, damping: 32 }}
      {...rest}
    >
      {hasHeader ? (
        <>
          <header className={styles.cardHeader}>
            <div>
              {title != null ? <TitleTag className={styles.cardTitle}>{title}</TitleTag> : null}
              {description != null ? <p className={styles.cardDescription}>{description}</p> : null}
            </div>
            {headerExtra}
          </header>
          <div className={styles.cardBody}>{children}</div>
        </>
      ) : (
        children
      )}
    </motion.div>
  );
}
