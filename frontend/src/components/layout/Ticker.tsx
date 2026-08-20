import styles from "./Ticker.module.css";
import { common } from "../../copy/common";
import { tickerLine } from "../../lib/format";

export function Ticker({ items }: { items: string[] }) {
  if (items.length === 0) return null;
  const line = `${tickerLine(items)} · `;
  return (
    <div className={styles.ticker} aria-label={common.now}>
      <span className={styles.label}>{common.now}</span>
      <div className={styles.track}>
        <div className={styles.line}>
          <span>{line}</span>
          <span aria-hidden="true">{line}</span>
        </div>
      </div>
    </div>
  );
}
