import { useState } from "react";
import styles from "./Interview.module.css";
import type { ArticleTypeId, Draft, ToneId } from "../../api/types";
import { ArticleFormChips } from "./ArticleFormChips";
import { LivePill } from "../ui/Bits";
import { Button } from "../ui/Button";
import { desk } from "../../copy/desk";

export function DraftPanel({
  draft,
  writing,
  onPublish,
  publishing,
  onSave,
  onDrop,
  dropping,
  readOnly,
  type,
  tone,
  onFormChange,
  formLocked,
}: {
  draft: Draft;
  writing?: boolean;
  onPublish?: (draft: Draft) => void;
  publishing?: boolean;
  onSave?: () => void;
  onDrop?: () => void;
  dropping?: boolean;
  readOnly?: boolean;
  type?: ArticleTypeId | null;
  tone?: ToneId | null;
  onFormChange?: (patch: { type?: ArticleTypeId | null; tone?: ToneId | null }) => void;
  formLocked?: boolean;
}) {
  const ready = draft.status === "ready";
  const [editing, setEditing] = useState(false);
  const [headline, setHeadline] = useState(draft.headline ?? "");
  const [standfirst, setStandfirst] = useState(draft.standfirst ?? "");
  const [body, setBody] = useState(draft.paragraphs.join("\n\n"));

  function edited(): Draft {
    return {
      ...draft,
      headline: headline.trim() || null,
      standfirst: standfirst.trim() || null,
      paragraphs: body
        .split(/\n\n+/)
        .map((p) => p.trim())
        .filter(Boolean),
    };
  }

  return (
    <div className={styles.draft} aria-live={writing ? "polite" : undefined}>
      <div className={styles.draftHead}>
        <h3 className={styles.draftTitle}>{desk.draft}</h3>
        {writing ? (
          <LivePill tone="outlineRed">{desk.writingDraft}</LivePill>
        ) : (
          draft.status !== "empty" && <LivePill tone="outlineRed">{desk.editing}</LivePill>
        )}
      </div>

      {onFormChange && (
        <ArticleFormChips
          type={type ?? null}
          tone={tone ?? null}
          locked={formLocked ?? true}
          onChange={onFormChange}
        />
      )}

      <div className={styles.draftBody}>
        <Field label={desk.angle}>
          {writing ? (
            <div className={`${styles.box} ${styles.skel}`} />
          ) : (
            <p className={`${styles.box} ${styles.boxAngle}`}>
              {draft.angle ?? <span className={styles.empty}>הכתב עוד לא בחר זווית</span>}
            </p>
          )}
        </Field>

        <Field label={desk.headline}>
          {writing ? (
            <div className={`${styles.box} ${styles.boxHeadline} ${styles.skel}`} />
          ) : editing && ready ? (
            <textarea
              className={`${styles.box} ${styles.boxHeadline} ${styles.boxEdit}`}
              value={headline}
              onChange={(e) => setHeadline(e.target.value)}
              rows={2}
            />
          ) : (
            <div
              className={[styles.box, styles.boxHeadline, draft.headline && styles.boxLive]
                .filter(Boolean)
                .join(" ")}
            >
              {draft.headline ?? (
                <span className={styles.empty}>הכותרת תיכתב אחרי שתי תשובות</span>
              )}
            </div>
          )}
        </Field>

        <Field label={desk.standfirst}>
          {writing ? (
            <div className={`${styles.box} ${styles.skel}`} />
          ) : editing && ready ? (
            <textarea
              className={`${styles.box} ${styles.boxEdit}`}
              value={standfirst}
              onChange={(e) => setStandfirst(e.target.value)}
              rows={3}
            />
          ) : (
            <div className={styles.box}>
              {draft.standfirst ?? (
                <span className={styles.empty}>עוד לא נוסחה</span>
              )}
            </div>
          )}
        </Field>

        <Field label={desk.body}>
          {writing ? (
            <div className={`${styles.box} ${styles.boxBody} ${styles.skel} ${styles.skelBody}`} />
          ) : editing && ready ? (
            <textarea
              className={`${styles.box} ${styles.boxBody} ${styles.boxEdit}`}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={8}
            />
          ) : (
            <div className={`${styles.box} ${styles.boxBody}`}>
              {draft.paragraphs.length === 0 && !draft.pendingParagraph && (
                <p className={styles.empty}>הגוף ייכתב כשיהיו מספיק עובדות נעולות</p>
              )}
              {draft.paragraphs.map((p, i) => (
                <p key={i}>{p}</p>
              ))}
              {draft.pendingParagraph && <p className={styles.pending}>{draft.pendingParagraph}</p>}
            </div>
          )}
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

      {!readOnly && !writing && (
        <div className={styles.draftFoot}>
          <Button
            size="xl"
            block
            onClick={() => onPublish?.(edited())}
            disabled={!ready || publishing}
          >
            {publishing ? "מפרסם…" : desk.publish}
          </Button>
          <div className={styles.footRow}>
            <Button
              variant="outline"
              size="md"
              block
              disabled={!ready}
              onClick={() => setEditing((on) => !on)}
            >
              {desk.editManually}
            </Button>
            <Button variant="quiet" size="md" block onClick={onSave}>
              {desk.saveDraft}
            </Button>
          </div>
          {onDrop && (
            <Button variant="outline" size="md" block onClick={onDrop} disabled={dropping}>
              {desk.startOver}
            </Button>
          )}
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
