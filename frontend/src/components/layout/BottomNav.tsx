import { NavLink } from "react-router";
import { useQuery } from "@tanstack/react-query";
import styles from "./BottomNav.module.css";
import { nav } from "../../copy/common";
import { getSession } from "../../api/reporter/interview";
import { listInvitations } from "../../api/core/connections";
import { qk } from "../../lib/queryKeys";
import { useSession } from "../../lib/session";

function cls({ isActive }: { isActive: boolean }) {
  return [styles.item, isActive && styles.active].filter(Boolean).join(" ");
}

/** Mobile tab bar from mockups 1b and 2c. */
export function BottomNav() {
  const { session } = useSession();
  const interview = useQuery({ queryKey: qk.interview, queryFn: getSession });
  const invitations = useQuery({
    queryKey: qk.invitations,
    queryFn: listInvitations,
    enabled: Boolean(session),
  });
  const hasDraft = interview.data?.draft.status && interview.data.draft.status !== "empty";
  const pending = (invitations.data ?? []).filter((i) => i.direction !== "outgoing").length;

  return (
    <nav className={styles.nav} aria-label="ניווט מובייל">
      <NavLink to="/" end className={cls}>
        <span className={styles.glyph}>ע</span>
        {nav.home}
      </NavLink>
      <NavLink to="/briefs" className={cls}>
        <span className={styles.glyph}>●</span>
        {nav.briefs}
      </NavLink>
      <NavLink
        to="/interview"
        className={({ isActive }) => `${cls({ isActive })} ${styles.cta}`}
      >
        {nav.interviewShort}
        {hasDraft && <span className={styles.ctaNote}>1 טיוטה</span>}
      </NavLink>
      <NavLink to="/karteset" className={cls}>
        <span className={styles.glyph}>כ</span>
        {nav.karteset}
      </NavLink>
      <NavLink to="/profile" className={cls}>
        <span className={styles.glyph}>מ</span>
        {nav.circleShort}
        {pending > 0 && <span className={styles.badge}>{pending}</span>}
      </NavLink>
    </nav>
  );
}
