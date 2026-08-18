import styles from "./Ticker.module.css";
import { common } from "../../copy/common";
import { tickerLine } from "../../lib/format";

export function Ticker({ items }: { items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div className={styles.ticker} aria-label={common.now}>
      <span className={styles.label}>{common.now}</span>
      <div className={styles.track}>
        <span className={styles.line}>{tickerLine(items)}</span>
      </div>
    </div>
  );
}
