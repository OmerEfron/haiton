import type { ReactNode } from "react";
import { Link } from "react-router";
import styles from "./SectionsBar.module.css";
import { nav, sectionNames } from "../../copy/common";

const order = ["work", "family", "friends", "celebrations", "food", "moments", "flashes"] as const;

export function SectionsBar({ active }: { active?: string }) {
  return (
    <nav className={styles.bar} aria-label={nav.sections}>
      <div className={styles.inner}>
        <span className={styles.label}>{nav.sections}</span>
        <span className={styles.divider}>|</span>
        <div className={styles.items}>
          <Link
            to="/"
            className={[styles.item, !active && styles.active].filter(Boolean).join(" ")}
          >
            ראשי
          </Link>
          {order.map((id) => (
            <Link
              key={id}
              to={id === "flashes" ? "/briefs" : `/?section=${id}`}
              className={[styles.item, active === id && styles.active].filter(Boolean).join(" ")}
            >
              {sectionNames[id]}
            </Link>
          ))}
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
