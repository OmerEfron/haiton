import { Link, NavLink } from "react-router";
import { useQuery } from "@tanstack/react-query";
import styles from "./Masthead.module.css";
import { ButtonLink } from "../ui/Button";
import { brand, common, nav } from "../../copy/common";
import { getCircleSummary } from "../../api/core/connections";
import { qk } from "../../lib/queryKeys";

interface Props {
  dateLong?: string;
  dateShort?: string;
  editionNumber?: number;
  editionName?: string;
}

function navClass({ isActive }: { isActive: boolean }) {
  return [styles.navLink, isActive && styles.navActive].filter(Boolean).join(" ");
}

/** Masthead per mockup 2d, the design doc's own refinement of 1a/1g/1h. */
export function Masthead({ dateLong, dateShort, editionNumber, editionName }: Props) {
  const summary = useQuery({ queryKey: qk.circleSummary, queryFn: getCircleSummary });
  const pending = summary.data?.pending ?? 0;

  return (
    <header className={styles.masthead}>
      <div className={styles.inner}>
        <div className={styles.brand}>
          <Link to="/" className={styles.logo}>
            {brand.name}
          </Link>
          <span className={styles.dateline}>
            <span className={styles.desktopOnly}>{dateLong ?? dateShort ?? ""}</span>
            <span className={styles.mobileOnly}>
              {dateShort ?? dateLong ?? ""}
              {editionNumber !== undefined ? ` · מהדורה ${editionNumber}` : ""}
            </span>
            {editionNumber !== undefined && (
              <span className={styles.desktopOnly}>
                מהדורה {editionNumber}
                {editionName ? ` · ${editionName}` : ""}
              </span>
            )}
          </span>
        </div>

        <nav className={`${styles.nav} ${styles.desktopOnly}`} aria-label="ניווט ראשי">
          <span className={styles.deskStatus}>{common.deskOpen}</span>
          <NavLink to="/karteset" className={navClass}>
            {nav.karteset}
          </NavLink>
          <NavLink
            to="/circle"
            className={({ isActive }) =>
              [styles.circleLink, isActive && styles.navActive].filter(Boolean).join(" ")
            }
          >
            {nav.circle}
            {pending > 0 && <span className={styles.badge}>{pending}</span>}
          </NavLink>
          <NavLink to="/profile" className={navClass}>
            {nav.profile}
          </NavLink>
          <ButtonLink to="/interview" size="md">
            {nav.interview}
          </ButtonLink>
        </nav>

        <div className={styles.mobileOnly}>
          <span className={styles.deskStatus}>{common.live}</span>
        </div>
      </div>
    </header>
  );
}
