import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Link } from "react-router";
import styles from "./Button.module.css";

type Variant = "solid" | "outline" | "quiet" | "link";
type Size = "sm" | "md" | "lg" | "xl";

interface Common {
  variant?: Variant;
  size?: Size;
  block?: boolean;
  children: ReactNode;
  className?: string;
}

function cx(variant: Variant, size: Size, block?: boolean, extra?: string) {
  return [styles.base, styles[variant], styles[size], block && styles.block, extra]
    .filter(Boolean)
    .join(" ");
}

export function Button({
  variant = "solid",
  size = "md",
  block,
  className,
  children,
  ...rest
}: Common & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button type="button" className={cx(variant, size, block, className)} {...rest}>
      {children}
    </button>
  );
}

export function ButtonLink({
  to,
  variant = "solid",
  size = "md",
  block,
  className,
  children,
}: Common & { to: string }) {
  return (
    <Link to={to} className={cx(variant, size, block, className)}>
      {children}
    </Link>
  );
}
