"use client";

import { forwardRef, useId, type InputHTMLAttributes, type ReactNode } from "react";
import styles from "./GTInput.module.css";

export type GTInputSize = "sm" | "md" | "lg";

type Base = {
  label?: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  size?: GTInputSize;
  className?: string;
};

export type GTInputProps = Base &
  Omit<InputHTMLAttributes<HTMLInputElement>, "size"> & {
    inputClassName?: string;
  };

export const GTInput = forwardRef<HTMLInputElement, GTInputProps>(function GTInput(
  { label, hint, error, size = "md", className = "", inputClassName = "", id, ...rest },
  ref,
) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const errId = `${inputId}-err`;
  const hintId = `${inputId}-hint`;
  const sizeClass = size === "sm" ? styles.sm : size === "lg" ? styles.lg : "";
  const inputClasses = [
    styles.input,
    rest.type === "file" ? styles.file : "",
    error ? styles.inputError : "",
    inputClassName,
  ]
    .filter(Boolean)
    .join(" ");

  const describedBy = [error ? errId : null, !error && hint ? hintId : null].filter(Boolean).join(" ") || undefined;

  return (
    <div className={[styles.field, sizeClass, className].filter(Boolean).join(" ")}>
      {label ? (
        <label className={styles.label} htmlFor={inputId}>
          {label}
        </label>
      ) : null}
      <div className={styles.inputWrap}>
        <input
          ref={ref}
          id={inputId}
          className={inputClasses}
          aria-invalid={Boolean(error) || undefined}
          aria-describedby={describedBy}
          {...rest}
        />
      </div>
      {error ? (
        <p id={errId} className={styles.error} role="alert">
          {error}
        </p>
      ) : hint ? (
        <p id={hintId} className={styles.hint}>
          {hint}
        </p>
      ) : null}
    </div>
  );
});
