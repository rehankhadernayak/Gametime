"use client";

import { forwardRef, useId, type ReactNode, type SelectHTMLAttributes } from "react";
import styles from "./GTSelect.module.css";

export type GTSelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label?: ReactNode;
  error?: string;
};

export const GTSelect = forwardRef<HTMLSelectElement, GTSelectProps>(function GTSelect(
  { label, error, id, className, children, ...rest },
  ref,
) {
  const uid = useId();
  const selectId = id ?? (typeof rest.name === "string" ? rest.name : undefined) ?? `gt-select-${uid}`;
  const errId = `${selectId}-err`;

  return (
    <div className={styles.field}>
      {label ? (
        <label className={styles.label} htmlFor={selectId}>
          {label}
        </label>
      ) : null}
      <select
        ref={ref}
        id={selectId}
        className={[styles.select, className].filter(Boolean).join(" ")}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errId : undefined}
        {...rest}
      >
        {children}
      </select>
      {error ? (
        <p id={errId} className={styles.error} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
});
