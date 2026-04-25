import type { HTMLAttributes, ReactNode } from "react";
import theme from "@/styles/theme.module.css";
import styles from "./GTCard.module.css";

export type GTCardProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
  /** When true, combines glass background with the card shell. */
  glass?: boolean;
};

export function GTCard({ children, className, glass, ...rest }: GTCardProps) {
  return (
    <div
      className={[styles.root, theme.premiumBorder, glass ? styles.glass : "", className]
        .filter(Boolean)
        .join(" ")}
      {...rest}
    >
      {children}
    </div>
  );
}
