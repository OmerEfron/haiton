import type { ReactNode } from "react";
import type { ArticleTypeId, ToneId } from "../../api/types";
import { desk } from "../../copy/desk";
import { Chip, ChipRow } from "../ui/Chip";
import styles from "./Interview.module.css";

const TYPES: ArticleTypeId[] = ["news", "profile", "feature", "interview", "column"];
const TONES: ToneId[] = ["factual", "magazine", "witty", "dramatic", "intimate"];

export function ArticleFormChips({
  type,
  tone,
  locked,
  onChange,
}: {
  type: ArticleTypeId | null;
  tone: ToneId | null;
  locked: boolean;
  onChange: (patch: { type?: ArticleTypeId | null; tone?: ToneId | null }) => void;
}) {
  return (
    <div className={styles.form}>
      <FormRow label={desk.articleType}>
        <Chip
          active={type === null}
          onClick={locked ? undefined : () => onChange({ type: null })}
        >
          {desk.articleFormAuto}
        </Chip>
        {TYPES.map((id) => (
          <Chip
            key={id}
            active={type === id}
            title={desk.articleTypeHints[id]}
            onClick={locked ? undefined : () => onChange({ type: id })}
          >
            {desk.articleTypes[id]}
          </Chip>
        ))}
      </FormRow>
      <FormRow label={desk.articleTone}>
        <Chip
          active={tone === null}
          onClick={locked ? undefined : () => onChange({ tone: null })}
        >
          {desk.articleFormAuto}
        </Chip>
        {TONES.map((id) => (
          <Chip
            key={id}
            active={tone === id}
            title={desk.articleToneHints[id]}
            onClick={locked ? undefined : () => onChange({ tone: id })}
          >
            {desk.articleTones[id]}
          </Chip>
        ))}
      </FormRow>
    </div>
  );
}

function FormRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className={styles.formRow}>
      <span className={styles.formLabel}>{label}</span>
      <ChipRow scroll>{children}</ChipRow>
    </div>
  );
}
