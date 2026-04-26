"use client";

import { forwardRef, type HTMLAttributes } from "react";
import styles from "./GTSkeleton.module.css";

export type GTSkeletonProps = HTMLAttributes<HTMLDivElement>;

export const GTSkeleton = forwardRef<HTMLDivElement, GTSkeletonProps>(function GTSkeleton(
  { className = "", ...rest },
  ref,
) {
  return <div ref={ref} className={[styles.block, className].filter(Boolean).join(" ")} {...rest} />;
});
