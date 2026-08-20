import { Link } from "react-router";
import styles from "./Footer.module.css";
import { common, nav } from "../../copy/common";
import { BrandLogo } from "./BrandLogo";

export function Footer() {
  return (
    <footer className={styles.footer}>
      <p className={styles.name}>
        <BrandLogo />
      </p>
      <div className={styles.links}>
        <Link to="/karteset">{nav.karteset}</Link>
        <Link to="/profile">{nav.circleShort}</Link>
      </div>
      <p className={styles.small}>{common.copyright}</p>
    </footer>
  );
}
