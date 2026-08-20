import { useState } from "react";
import { Link } from "react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import styles from "./Interview.module.css";
import { Chip, ChipRow } from "../ui/Chip";
import { Button } from "../ui/Button";
import { TextField } from "../ui/Field";
import { Modal } from "../ui/Modal";
import type { FactCategory } from "../../api/types";
import { addFact } from "../../api/core/karteset";
import { qk } from "../../lib/queryKeys";
import { desk } from "../../copy/desk";
import { karteset } from "../../copy/karteset";
import { common } from "../../copy/common";

const CATEGORIES: FactCategory[] = ["personal", "work", "family", "routine"];

function clip(text: string): string {
  return text.length > 28 ? `${text.slice(0, 27)}…` : text;
}

export function KartesetStrip({
  facts,
  lockNow,
  onRelock,
}: {
  facts: { id: string; category: string; text: string }[];
  lockNow: boolean;
  onRelock: () => void;
}) {
  const client = useQueryClient();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [category, setCategory] = useState<FactCategory>("personal");
  const [queued, setQueued] = useState(false);

  const create = useMutation({
    mutationFn: () => addFact({ text: text.trim(), category }),
    onSuccess: async () => {
      setText("");
      setOpen(false);
      await client.invalidateQueries({ queryKey: qk.facts });
      await client.invalidateQueries({ queryKey: qk.profile });
      if (lockNow) onRelock();
      else setQueued(true);
    },
  });

  return (
    <div className={styles.strip}>
      <p className={styles.stripHow}>{facts.length === 0 ? desk.kartesetEmptyHow : desk.kartesetHow}</p>
      {facts.length > 0 && (
        <ChipRow>
          {facts.map((fact) => (
            <Chip key={fact.id} title={fact.text}>
              {clip(fact.text)}
            </Chip>
          ))}
        </ChipRow>
      )}
      <div className={styles.stripActions}>
        <Button variant="outline" size="md" onClick={() => setOpen(true)}>
          {desk.addToKarteset}
        </Button>
        <Link to="/karteset" className={styles.stripLink}>
          {desk.allKarteset}
        </Link>
      </div>
      {queued && <p className={styles.stripNote}>{desk.kartesetNextInterview}</p>}
      {open && (
        <Modal title={desk.addToKarteset} onClose={() => setOpen(false)}>
          <form
            className={styles.stripForm}
            onSubmit={(e) => {
              e.preventDefault();
              if (text.trim()) create.mutate();
            }}
          >
            <TextField
              label={karteset.factLabel}
              placeholder={karteset.emptyPlaceholder}
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
            <ChipRow>
              {CATEGORIES.map((c) => (
                <Chip key={c} active={category === c} onClick={() => setCategory(c)}>
                  {karteset.categories[c]}
                </Chip>
              ))}
            </ChipRow>
            <Button type="submit" size="lg" block disabled={create.isPending || !text.trim()}>
              {karteset.submit}
            </Button>
            <Button variant="quiet" size="md" block onClick={() => setOpen(false)}>
              {common.cancel}
            </Button>
            {create.error ? <p className={styles.stripNote}>{(create.error as Error).message}</p> : null}
          </form>
        </Modal>
      )}
    </div>
  );
}
