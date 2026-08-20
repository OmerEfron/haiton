import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import styles from "../../routes/CirclePage.module.css";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { Chip, ChipRow } from "../ui/Chip";
import { TextArea, TextField } from "../ui/Field";
import { Avatar } from "../ui/Bits";
import type { Connection, RelationKind } from "../../api/types";
import { searchReaders, sendInvitation } from "../../api/core/connections";
import { qk } from "../../lib/queryKeys";
import { circle } from "../../copy/circle";

const RELATIONS: RelationKind[] = ["friend", "family", "work", "neighbour", "other"];

const DEFAULT_SETTINGS: Connection["settings"] = {
  seesMyEdition: true,
  showsFullName: true,
  notifyOnPublish: false,
};

/** Mockup 2b. */
export function AddConnectionDialog({ onClose }: { onClose: () => void }) {
  const client = useQueryClient();

  const [term, setTerm] = useState("");
  const [query, setQuery] = useState("");
  const [chosenId, setChosenId] = useState<string | null>(null);
  const [chosenName, setChosenName] = useState("");
  const [relation, setRelation] = useState<RelationKind>("friend");
  const [note, setNote] = useState("");

  const results = useQuery({
    queryKey: qk.readerSearch(query),
    queryFn: () => searchReaders(query),
    enabled: query.length > 0,
  });

  const send = useMutation({
    mutationFn: () =>
      sendInvitation({
        readerId: chosenId ?? undefined,
        name: chosenName || term,
        relation,
        note,
        settings: DEFAULT_SETTINGS,
      }),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: qk.invitations });
      await client.invalidateQueries({ queryKey: qk.circleSummary });
      onClose();
    },
  });

  const extrasOpen = Boolean(chosenId) || term.includes("@");

  return (
    <Modal title={circle.dialog.title} onClose={onClose}>
      <p className={styles.dialogIntro}>{circle.dialog.intro}</p>

      <div className={styles.searchRow}>
        <TextField
          label={circle.dialog.searchLabel}
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && setQuery(term)}
        />
        <Button size="lg" onClick={() => setQuery(term)} disabled={!term.trim()}>
          {circle.dialog.search}
        </Button>
      </div>

      {query && (
        <div className={styles.results}>
          <p className={styles.resultsHead}>{circle.dialog.resultsTitle}</p>
          {results.isPending ? (
            <div className={styles.resultRow}>…</div>
          ) : results.data && results.data.length > 0 ? (
            results.data.map((reader) => (
              <div key={reader.id} className={styles.resultRow}>
                <Avatar initial={reader.initial} size={34} />
                <span style={{ flex: 1 }}>
                  <span className={styles.resultName}>{reader.name}</span>
                  <span className={styles.detail}>{reader.detail}</span>
                </span>
                <Button
                  variant={chosenId === reader.id ? "solid" : "quiet"}
                  size="sm"
                  onClick={() => {
                    setChosenId(reader.id);
                    setChosenName(reader.name);
                  }}
                >
                  {chosenId === reader.id ? circle.dialog.chosen : circle.dialog.choose}
                </Button>
              </div>
            ))
          ) : (
            <div className={styles.resultRow}>
              <span className={styles.detail}>{circle.dialog.noResults}</span>
            </div>
          )}
        </div>
      )}

      {extrasOpen && (
        <div className={styles.group}>
          <span className={styles.groupLabel}>{circle.dialog.relationLabel}</span>
          <ChipRow>
            {RELATIONS.map((r) => (
              <Chip key={r} active={relation === r} onClick={() => setRelation(r)}>
                {circle.relations[r]}
              </Chip>
            ))}
          </ChipRow>

          <div className={styles.noteField}>
            <TextArea
              label={circle.dialog.noteLabel}
              placeholder={circle.dialog.notePlaceholder}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
            />
          </div>
        </div>
      )}

      <div className={styles.dialogActions}>
        <Button
          size="xl"
          block
          onClick={() => send.mutate()}
          disabled={send.isPending || !(chosenId || term.includes("@"))}
        >
          {send.isPending ? "שולח…" : circle.dialog.send}
        </Button>
        <Button variant="quiet" size="lg" onClick={onClose}>
          ביטול
        </Button>
      </div>
      {send.error ? <p className={styles.dialogError}>{(send.error as Error).message}</p> : null}
    </Modal>
  );
}
