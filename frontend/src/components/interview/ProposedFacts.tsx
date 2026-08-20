import styles from "./Interview.module.css";
import type { ProposedFact } from "../../api/types";
import { desk } from "../../copy/desk";
import { karteset } from "../../copy/karteset";

export function ProposedFacts({
  facts,
  selected,
  onToggle,
}: {
  facts: ProposedFact[];
  selected: Set<number>;
  onToggle: (index: number) => void;
}) {
  return (
    <div className={styles.propose}>
      <p className={styles.proposeTitle}>{desk.proposedFactsTitle}</p>
      {facts.map((fact, i) => (
        <label key={`${fact.category}-${fact.text}`} className={styles.proposeRow}>
          <input
            type="checkbox"
            checked={selected.has(i)}
            onChange={() => onToggle(i)}
          />
          <span>
            <span className={styles.proposeCat}>{karteset.categories[fact.category]}</span>
            {fact.text}
          </span>
        </label>
      ))}
    </div>
  );
}
