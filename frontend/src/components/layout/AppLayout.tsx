import { Outlet, useLocation } from "react-router";
import styles from "./AppLayout.module.css";
import { BottomNav } from "./BottomNav";

/** Routes that render their own chrome instead of the newspaper shell.
 *  Both are focused, full-screen surfaces (mockups 1e/1f and 1i), so the
 *  mobile tab bar stays out of the way too. */
const BARE = ["/interview", "/login"];

export function AppLayout() {
  const { pathname } = useLocation();
  const bare = BARE.some((p) => pathname.startsWith(p));

  return (
    <div className={[styles.shell, bare && styles.bare].filter(Boolean).join(" ")}>
      <main className={styles.main}>
        <Outlet />
      </main>
      {!bare && <BottomNav />}
    </div>
  );
}
