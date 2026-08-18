import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import styles from "./KartesetPage.module.css";
import { PageHeader } from "../components/layout/PageHeader";
import { Footer } from "../components/layout/Footer";
import { Button } from "../components/ui/Button";
import { Chip, ChipRow } from "../components/ui/Chip";
import { TextField } from "../components/ui/Field";
import { ErrorState, Loading } from "../components/ui/Bits";
import type { Fact, FactCategory } from "../api/types";
import { addFact, listFacts, removeFact, updateFact } from "../api/core/karteset";
import { qk } from "../lib/queryKeys";
import { common } from "../copy/common";
import { karteset } from "../copy/karteset";

const CATEGORIES: FactCategory[] = ["personal", "work", "family", "routine"];

export function KartesetPage() {
  const client = useQueryClient();
  const facts = useQuery({ queryKey: qk.facts, queryFn: listFacts });

  const [filter, setFilter] = useState<FactCategory | "all">("all");
  const [draftText, setDraftText] = useState("");
  const [draftCategory, setDraftCategory] = useState<FactCategory>("personal");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");

  const invalidate = () => client.invalidateQueries({ queryKey: qk.facts });

  const create = useMutation({
    mutationFn: () => addFact({ text: draftText, category: draftCategory }),
    onSuccess: async () => {
      setDraftText("");
      await invalidate();
      await client.invalidateQueries({ queryKey: qk.profile });
    },
  });

  const save = useMutation({
    mutationFn: (fact: Fact) => updateFact({ id: fact.id, text: editingText }),
    onSuccess: async () => {
      setEditingId(null);
      await invalidate();
    },
  });

  const drop = useMutation({
    mutationFn: (id: string) => removeFact(id),
    onSuccess: async () => {
      await invalidate();
      await client.invalidateQueries({ queryKey: qk.profile });
    },
  });

  if (facts.isPending) {
    return (
      <>
        <PageHeader />
        <Loading />
      </>
    );
  }
  if (facts.error) {
    return (
      <>
        <PageHeader />
        <ErrorState error={facts.error} />
        <Footer />
      </>
    );
  }

  const all = facts.data;
  const visible = filter === "all" ? all : all.filter((f) => f.category === filter);
  const empty = all.length === 0;

  function submit(e: FormEvent) {
    e.preventDefault();
    if (draftText.trim()) create.mutate();
  }

  return (
    <>
      <PageHeader />
      <div className={styles.wrap}>
        <div className={styles.head}>
          <h1 className={styles.title}>{karteset.title}</h1>
          <p className={empty ? styles.emptyIntro : styles.intro}>
            {empty ? karteset.emptyIntro : karteset.intro}
          </p>
          {!empty && (
            <div className={styles.filters}>
              <ChipRow scroll>
                <Chip active={filter === "all"} count={all.length} onClick={() => setFilter("all")}>
                  {karteset.all}
                </Chip>
                {CATEGORIES.map((c) => (
                  <Chip
                    key={c}
                    active={filter === c}
                    count={all.filter((f) => f.category === c).length}
                    onClick={() => setFilter(c)}
                  >
                    {karteset.categories[c]}
                  </Chip>
                ))}
              </ChipRow>
            </div>
          )}
        </div>

        <form className={styles.composer} onSubmit={submit}>
          <div className={styles.composerRow}>
            <TextField
              label={karteset.factLabel}
              placeholder={empty ? karteset.emptyPlaceholder : karteset.placeholder}
              value={draftText}
              onChange={(e) => setDraftText(e.target.value)}
            />
            <Button
              type="submit"
              size="lg"
              variant={empty ? "outline" : "solid"}
              disabled={create.isPending || !draftText.trim()}
              style={{ alignSelf: "flex-end" }}
            >
              {karteset.submit}
            </Button>
          </div>
          <div className={styles.composerCats}>
            <ChipRow>
              {CATEGORIES.map((c) => (
                <Chip key={c} active={draftCategory === c} onClick={() => setDraftCategory(c)}>
                  {karteset.categories[c]}
                </Chip>
              ))}
            </ChipRow>
          </div>
          {create.error && <p className={styles.error}>{(create.error as Error).message}</p>}
        </form>

        {empty ? (
          <>
            <p className={styles.startersTitle}>{karteset.startersTitle}</p>
            <div className={styles.starters}>
              {karteset.starters.map((starter) => (
                <button
                  key={starter}
                  type="button"
                  className={styles.starter}
                  onClick={() => setDraftText(`${starter}: `)}
                >
                  {starter}
                </button>
              ))}
            </div>
          </>
        ) : (
          <div className={styles.list}>
            {visible.map((fact) =>
              editingId === fact.id ? (
                <div key={fact.id} className={styles.editRow}>
                  <span className={`${styles.cat} ${styles.editCat}`}>
                    {karteset.categories[fact.category]}
                  </span>
                  <TextField
                    value={editingText}
                    onChange={(e) => setEditingText(e.target.value)}
                    autoFocus
                  />
                  <div className={styles.editActions}>
                    <Button size="md" onClick={() => save.mutate(fact)} disabled={save.isPending}>
                      {common.save}
                    </Button>
                    <Button variant="quiet" size="md" onClick={() => setEditingId(null)}>
                      {common.cancel}
                    </Button>
                  </div>
                  {save.error && <p className={styles.error}>{(save.error as Error).message}</p>}
                </div>
              ) : (
                <div
                  key={fact.id}
                  className={`${styles.row} ${fact.usedInStories > 5 ? styles.rowTint : ""}`}
                >
                  <span className={styles.cat}>{karteset.categories[fact.category]}</span>
                  <span className={styles.factText}>
                    {fact.text}
                    {(fact.usedInStories > 0 || fact.updatedLabel) && (
                      <span className={styles.factMeta}>
                        {[
                          fact.usedInStories > 0 ? karteset.usedIn(fact.usedInStories) : null,
                          fact.updatedLabel,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </span>
                    )}
                  </span>
                  <span className={styles.rowActions}>
                    <Button
                      variant="quiet"
                      size="sm"
                      onClick={() => {
                        setEditingId(fact.id);
                        setEditingText(fact.text);
                      }}
                    >
                      {common.edit}
                    </Button>
                    <Button
                      variant="quiet"
                      size="sm"
                      onClick={() => drop.mutate(fact.id)}
                      disabled={drop.isPending}
                    >
                      {common.remove}
                    </Button>
                  </span>
                </div>
              ),
            )}
          </div>
        )}
      </div>
      <Footer />
    </>
  );
}
