import { forwardRef, useId, type InputHTMLAttributes, type ReactNode } from "react";
import styles from "./GTInput.module.css";

export type GTInputProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: ReactNode;
  error?: string;
};

export const GTInput = forwardRef<HTMLInputElement, GTInputProps>(function GTInput(
  { label, error, id, className, ...rest },
  ref
) {
  const uid = useId();
  const inputId = id ?? (typeof rest.name === "string" ? rest.name : undefined) ?? `gt-input-${uid}`;

  return (
    <div className={styles.field}>
      {label ? (
        <label className={styles.label} htmlFor={inputId}>
          {label}
        </label>
      ) : null}
      <input
        ref={ref}
        id={inputId}
        className={[styles.input, className].filter(Boolean).join(" ")}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${inputId}-err` : undefined}
        {...rest}
      />
      {error ? (
        <p id={`${inputId}-err`} className={styles.error} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
});
