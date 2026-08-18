import styles from "./Interview.module.css";
import type { Draft, SectionId } from "../../api/types";
import { LivePill } from "../ui/Bits";
import { Button } from "../ui/Button";
import { Chip } from "../ui/Chip";
import { desk } from "../../copy/desk";
import { draftSections } from "../../mocks/fixtures/interview-script";

export function DraftPanel({
  draft,
  onSection,
  onPublish,
  publishing,
  onDiscard,
}: {
  draft: Draft;
  onSection: (section: SectionId) => void;
  onPublish: () => void;
  publishing: boolean;
  onDiscard: () => void;
}) {
  const ready = draft.status === "ready" && Boolean(draft.section);

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

        {draft.status !== "empty" && (
          <div className={styles.sectionRow}>
            <span className={styles.sectionLabel}>{desk.section}</span>
            {draftSections.map((s) => (
              <Chip key={s.id} active={draft.section === s.id} onClick={() => onSection(s.id)}>
                {s.name}
              </Chip>
            ))}
          </div>
        )}
      </div>

      <div className={styles.draftFoot}>
        <Button size="xl" block onClick={onPublish} disabled={!ready || publishing}>
          {publishing ? "מפרסם…" : desk.publish}
        </Button>
        <div className={styles.footRow}>
          <Button variant="outline" size="md" block disabled>
            {desk.editManually}
          </Button>
          <Button variant="quiet" size="md" block onClick={onDiscard}>
            {desk.saveDraft}
          </Button>
        </div>
        <p className={styles.footNote}>
          {draft.status === "ready" && !draft.section
            ? "בחרו מדור כדי לפרסם"
            : desk.publishNote}
        </p>
      </div>
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
