import type { CSSProperties, ReactNode } from "react";
import styles from "./Bits.module.css";
import { brand, common } from "../../copy/common";

export function LiveDot({ size = 7, light }: { size?: number; light?: boolean }) {
  return (
    <span
      className={[styles.dot, light && styles.dotLight].filter(Boolean).join(" ")}
      style={{ width: size, height: size }}
      aria-hidden
    />
  );
}

export function LivePill({
  children,
  tone = "default",
}: {
  children: ReactNode;
  tone?: "default" | "red" | "outlineRed";
}) {
  const cls = [
    styles.pill,
    tone === "red" && styles.pillRed,
    tone === "outlineRed" && styles.pillOutlineRed,
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <span className={cls}>
      <LiveDot size={6} light={tone === "red"} />
      {children}
    </span>
  );
}

export function Kicker({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <span className={styles.kicker} style={style}>
      {children}
    </span>
  );
}

export function Avatar({
  initial,
  size = 38,
  tone = "default",
}: {
  initial: string;
  size?: number;
  tone?: "default" | "solid" | "onTint";
}) {
  const cls = [
    styles.avatar,
    tone === "solid" && styles.avatarSolid,
    tone === "onTint" && styles.avatarOnTint,
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <span className={cls} style={{ width: size, height: size, fontSize: Math.round(size * 0.42) }} aria-hidden>
      {initial}
    </span>
  );
}

export function Placeholder({
  height,
  label = common.placeholderImage,
  sub,
}: {
  height: number | string;
  label?: string;
  sub?: string;
}) {
  return (
    <div className={styles.placeholder} style={{ height }} role="img" aria-label={label}>
      <span>{label}</span>
      {sub && <span className={styles.placeholderSub}>{sub}</span>}
    </div>
  );
}

export function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      className={[styles.toggle, checked && styles.toggleOn].filter(Boolean).join(" ")}
      onClick={() => onChange(!checked)}
    >
      <span className={styles.knob} />
    </button>
  );
}

export function StatGrid({
  columns,
  items,
}: {
  columns: number;
  items: { value: number | string; label: string }[];
}) {
  return (
    <div className={styles.stats} style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
      {items.map((item) => (
        <div key={item.label} className={styles.stat}>
          <p className={styles.statValue}>{item.value}</p>
          <p className={styles.statLabel}>{item.label}</p>
        </div>
      ))}
    </div>
  );
}

export function SectionHead({ title, aside }: { title: string; aside?: ReactNode }) {
  return (
    <div className={styles.sectionHead}>
      <h3 className={styles.sectionHeadTitle}>{title}</h3>
      {aside}
    </div>
  );
}

export function Loading({
  label = common.loading,
  framed = false,
}: {
  label?: string;
  framed?: boolean;
}) {
  const status = (
    <p className={styles.state} role="status">
      {label}
    </p>
  );
  if (!framed) return status;
  return (
    <div className={styles.splash}>
      <header className={styles.splashBrand}>{brand.name}</header>
      {status}
    </div>
  );
}

export function ErrorState({ error }: { error: unknown }) {
  const message = error instanceof Error ? error.message : "משהו השתבש בשולחן העורכים";
  return (
    <p className={`${styles.state} ${styles.stateError}`} role="alert">
      {message}
    </p>
  );
}
