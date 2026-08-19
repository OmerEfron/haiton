import styles from "./Interview.module.css";
import type { Draft } from "../../api/types";
import { LivePill } from "../ui/Bits";
import { Button } from "../ui/Button";
import { desk } from "../../copy/desk";

export function DraftPanel({
  draft,
  onPublish,
  publishing,
  onSave,
  readOnly,
}: {
  draft: Draft;
  onPublish?: () => void;
  publishing?: boolean;
  onSave?: () => void;
  readOnly?: boolean;
}) {
  const ready = draft.status === "ready";

  return (
    <div className={styles.draft}>
      <div className={styles.draftHead}>
        <h3 className={styles.draftTitle}>{desk.draft}</h3>
        {draft.status !== "empty" && <LivePill tone="outlineRed">{desk.editing}</LivePill>}
      </div>

      <div className={styles.draftBody}>
        <Field label={desk.angle}>
          <p className={`${styles.box} ${styles.boxAngle}`}>
            {draft.angle ?? <span className={styles.empty}>הכתב עוד לא בחר זווית</span>}
          </p>
        </Field>

        <Field label={desk.headline}>
          <div
            className={[styles.box, styles.boxHeadline, draft.headline && styles.boxLive]
              .filter(Boolean)
              .join(" ")}
          >
            {draft.headline ?? <span className={styles.empty}>הכותרת תיכתב אחרי שתי תשובות</span>}
          </div>
        </Field>

        <Field label={desk.standfirst}>
          <div className={styles.box}>
            {draft.standfirst ?? <span className={styles.empty}>עוד לא נוסחה</span>}
          </div>
        </Field>

        <Field label={desk.body}>
          <div className={`${styles.box} ${styles.boxBody}`}>
            {draft.paragraphs.length === 0 && !draft.pendingParagraph && (
              <p className={styles.empty}>הגוף ייכתב כשיהיו מספיק עובדות נעולות</p>
            )}
            {draft.paragraphs.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
            {draft.pendingParagraph && <p className={styles.pending}>{draft.pendingParagraph}</p>}
          </div>
        </Field>

        {draft.checks.length > 0 && (
          <div className={styles.checks}>
            <p className={styles.checksTitle}>{desk.deskChecks}</p>
            <div className={styles.checkList}>
              {draft.checks.map((check) => (
                <span
                  key={check.label}
                  className={[styles.check, !check.done && styles.checkOff]
                    .filter(Boolean)
                    .join(" ")}
                >
                  <span className={check.done ? styles.mark : styles.markOff}>
                    {check.done ? "✓" : "○"}
                  </span>
                  {check.label}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {!readOnly && (
      <div className={styles.draftFoot}>
        <Button size="xl" block onClick={onPublish} disabled={!ready || publishing}>
          {publishing ? "מפרסם…" : desk.publish}
        </Button>
        <div className={styles.footRow}>
          <Button variant="outline" size="md" block disabled>
            {desk.editManually}
          </Button>
          <Button variant="quiet" size="md" block onClick={onSave}>
            {desk.saveDraft}
          </Button>
        </div>
        <p className={styles.footNote}>{desk.publishNote}</p>
      </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className={styles.fieldLabel}>{label}</p>
      {children}
    </div>
  );
}
