import type { ReactNode } from "react";
import styles from "./Chip.module.css";

interface ChipProps {
  children: ReactNode;
  active?: boolean;
  flagged?: boolean;
  count?: number;
  onClick?: () => void;
  title?: string;
}

export function Chip({ children, active, flagged, count, onClick, title }: ChipProps) {
  const className = [styles.chip, active && styles.active, !active && flagged && styles.flagged]
    .filter(Boolean)
    .join(" ");

  const content = (
    <>
      {children}
      {count !== undefined && <span className={styles.count}>· {count}</span>}
    </>
  );

  if (!onClick) {
    return (
      <span className={className} title={title}>
        {content}
      </span>
    );
  }
  return (
    <button type="button" className={className} onClick={onClick} aria-pressed={active} title={title}>
      {content}
    </button>
  );
}

/** The small flat tag used for edition labels on story cards. */
export function Tag({ children }: { children: ReactNode }) {
  return <span className={`${styles.chip} ${styles.plain}`}>{children}</span>;
}

export function ChipRow({ children, scroll }: { children: ReactNode; scroll?: boolean }) {
  return <div className={[styles.row, scroll && styles.scroll].filter(Boolean).join(" ")}>{children}</div>;
}
