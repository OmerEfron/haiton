import type { ReactNode } from "react";
import { Link } from "react-router";
import styles from "./SectionsBar.module.css";
import { nav } from "../../copy/common";

export function SectionsBar({ active }: { active?: string }) {
  return (
    <nav className={styles.bar} aria-label={`${nav.home} ${nav.briefs}`}>
      <div className={styles.inner}>
        <div className={styles.items}>
          <Link
            to="/"
            className={[styles.item, !active && styles.active].filter(Boolean).join(" ")}
          >
            ראשי
          </Link>
          <Link
            to="/briefs"
            className={[styles.item, active === "flashes" && styles.active].filter(Boolean).join(" ")}
          >
            {nav.briefs}
          </Link>
        </div>
      </div>
    </nav>
  );
}

/** The same red bar reused as a breadcrumb strip on the story page (1d). */
export function CrumbBar({ children }: { children: ReactNode }) {
  return (
    <div className={styles.bar}>
      <div className={`${styles.inner} ${styles.crumbs}`}>{children}</div>
    </div>
  );
}
