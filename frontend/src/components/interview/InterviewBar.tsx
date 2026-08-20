import { Link } from "react-router";
import styles from "../../routes/InterviewRoom.module.css";
import { LivePill } from "../ui/Bits";
import { brand, common } from "../../copy/common";
import { desk } from "../../copy/desk";

export function heDate(raw: string) {
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? raw : d.toLocaleString("he-IL");
}

export function InterviewBar({
  startedAt,
  elapsedLabel,
  factsLocked,
  closed,
  testMode,
  onToggleTestMode,
  creditsRemaining,
}: {
  startedAt: string;
  elapsedLabel: string;
  factsLocked: number;
  closed: boolean;
  testMode?: boolean;
  onToggleTestMode?: () => void;
  creditsRemaining?: number;
}) {
  const started = heDate(startedAt);
  const showTest = import.meta.env.DEV;
  const testing = showTest && testMode;
  const liveLabel = testing ? desk.testModeLive : desk.liveInterview;
  const liveShort = testing ? desk.testModeLive : common.live;
  return (
    <div className={styles.bar}>
      <div className={styles.barStart}>
        <Link to="/" className={styles.logo}>
          {brand.name}
        </Link>
        <span className={styles.sep} />
        <span className={styles.roomName}>
          <span className={styles.roomNameFull}>{desk.interviewRoomFull}</span>
          <span className={styles.roomNameShort}>{desk.interviewRoom}</span>
        </span>
        <LivePill tone={closed ? "outlineRed" : "red"}>
          {closed ? (
            desk.interviewEnded
          ) : (
            <>
              <span className={styles.roomNameFull}>{liveLabel}</span>
              <span className={styles.roomNameShort}>{liveShort}</span>
            </>
          )}
        </LivePill>
        {showTest && (
          <button
            type="button"
            className={styles.testModeBtn}
            aria-pressed={Boolean(testMode)}
            disabled={!onToggleTestMode}
            onClick={onToggleTestMode}
            title={desk.testModeHint}
          >
            {desk.testMode}
          </button>
        )}
      </div>
      <div className={styles.barEnd}>
        {creditsRemaining != null && (
          <span className={styles.credits}>{desk.creditsLeft(creditsRemaining)}</span>
        )}
        <span className={styles.barMeta}>
          {started} · {elapsedLabel}
        </span>
        <Link to="/karteset" className={styles.kartesetLink}>
          {desk.kartesetBar(factsLocked)}
        </Link>
        <Link to="/" className={styles.close}>
          {desk.close}
        </Link>
      </div>
    </div>
  );
}
