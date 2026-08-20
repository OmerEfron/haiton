import type { ReactNode } from "react";
import styles from "./EmptyState.module.css";

export function EmptyState({
  badge,
  mark,
  title,
  body,
  actions,
  compact,
}: {
  badge?: ReactNode;
  mark?: string;
  title: string;
  body?: string;
  actions?: ReactNode;
  compact?: boolean;
}) {
  return (
    <div className={[styles.wrap, compact && styles.compact].filter(Boolean).join(" ")}>
      {badge && <div className={styles.badge}>{badge}</div>}
      {mark && <span className={styles.mark}>{mark}</span>}
      <h2 className={styles.title}>{title}</h2>
      {body ? <p className={styles.body}>{body}</p> : null}
      {actions && <div className={styles.actions}>{actions}</div>}
    </div>
  );
}
