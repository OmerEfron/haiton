import type { InputHTMLAttributes, TextareaHTMLAttributes } from "react";
import { useId } from "react";
import styles from "./Field.module.css";

interface Base {
  label?: string;
  error?: string;
  ltr?: boolean;
}

export function TextField({
  label,
  error,
  ltr,
  className,
  ...rest
}: Base & InputHTMLAttributes<HTMLInputElement>) {
  const id = useId();
  return (
    <div className={styles.field}>
      {label && (
        <label className={styles.label} htmlFor={id}>
          {label}
        </label>
      )}
      <input
        id={id}
        className={[styles.control, ltr && styles.ltr, className].filter(Boolean).join(" ")}
        aria-invalid={error ? true : undefined}
        {...rest}
      />
      {error && <p className={styles.error}>{error}</p>}
    </div>
  );
}

export function TextArea({
  label,
  error,
  className,
  ...rest
}: Base & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const id = useId();
  return (
    <div className={styles.field}>
      {label && (
        <label className={styles.label} htmlFor={id}>
          {label}
        </label>
      )}
      <textarea
        id={id}
        className={[styles.control, styles.area, className].filter(Boolean).join(" ")}
        aria-invalid={error ? true : undefined}
        {...rest}
      />
      {error && <p className={styles.error}>{error}</p>}
    </div>
  );
}
