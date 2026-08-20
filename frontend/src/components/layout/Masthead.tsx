import { Link, NavLink } from "react-router";
import { useQuery } from "@tanstack/react-query";
import styles from "./Masthead.module.css";
import { ButtonLink } from "../ui/Button";
import { common, nav } from "../../copy/common";
import { BrandLogo } from "./BrandLogo";
import { listInvitations } from "../../api/core/connections";
import { qk } from "../../lib/queryKeys";
import { useSession } from "../../lib/session";

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
  const { session } = useSession();
  const invitations = useQuery({
    queryKey: qk.invitations,
    queryFn: listInvitations,
    enabled: Boolean(session),
  });
  const pending = (invitations.data ?? []).filter((i) => i.direction !== "outgoing").length;

  return (
    <header className={styles.masthead}>
      <div className={styles.inner}>
        <div className={styles.brand}>
          <Link to="/" className={styles.logo}>
            <BrandLogo />
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
            to="/profile"
            className={({ isActive }) =>
              [styles.circleLink, isActive && styles.navActive].filter(Boolean).join(" ")
            }
          >
            {nav.circleShort}
            {pending > 0 && <span className={styles.badge}>{pending}</span>}
          </NavLink>
          <ButtonLink to="/interview" size="md">
            {nav.interview}
          </ButtonLink>
        </nav>

        <div className={styles.mobileOnly}>
          <span className={styles.deskStatus}>{common.deskOpen}</span>
        </div>
      </div>
    </header>
  );
}
