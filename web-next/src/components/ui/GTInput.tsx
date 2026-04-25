"use client";

import type { InputHTMLAttributes } from "react";
import styles from "./gt-ui.module.css";

type GTInputProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  id: string;
  className?: string;
};

export function GTInput({ label, id, className, ...rest }: GTInputProps) {
  return (
    <div className={styles.field}>
      <label className={styles.label} htmlFor={id}>
        {label}
      </label>
      <input id={id} className={[styles.input, className].filter(Boolean).join(" ")} {...rest} />
    </div>
  );
}
