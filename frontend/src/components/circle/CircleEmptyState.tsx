import { useState } from "react";
import styles from "../../routes/CirclePage.module.css";
import { Avatar } from "../ui/Bits";
import { Button } from "../ui/Button";
import { EmptyState } from "../ui/EmptyState";
import type { ReaderSearchResult } from "../../api/types";
import { circle } from "../../copy/circle";

export function CircleEmptyState({
  suggested,
  onAdd,
}: {
  suggested: ReaderSearchResult[] | undefined;
  onAdd: () => void;
}) {
  const [copied, setCopied] = useState(false);

  const shareInvite = async () => {
    await navigator.clipboard.writeText(window.location.origin);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  };

  return (
    <>
      <EmptyState
        mark="+"
        title={circle.emptyTitle}
        body={circle.emptyBody}
        compact
        actions={
          <>
            <Button size="lg" block onClick={onAdd}>
              {circle.emptyCta}
            </Button>
            <Button variant="link" size="md" onClick={shareInvite}>
              {copied ? "הועתק" : circle.shareLink}
            </Button>
          </>
        }
      />
      {suggested?.length ? (
        <div className={styles.suggested}>
          <p className={styles.suggestedTitle}>{circle.suggestedTitle}</p>
          <div className={styles.suggestedList}>
            {suggested.map((s) => (
              <div key={s.id} className={styles.suggestedRow}>
                <Avatar initial={s.initial} size={32} />
                <span className={styles.suggestedName}>
                  {s.name} — {s.detail}
                </span>
                <Button variant="link" size="sm" onClick={onAdd}>
                  {circle.invite}
                </Button>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </>
  );
}
