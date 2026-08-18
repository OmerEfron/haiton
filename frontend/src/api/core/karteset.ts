/* CORE API — the karteset (the reporter's standing background file).
 * Later: GET/POST /karteset/facts, PATCH/DELETE /karteset/facts/:id. */

import type { Fact, FactCategory } from "../types";
import { ApiError, clone, delay, nextId } from "../client";
import { db } from "../../mocks/db";

export async function listFacts(): Promise<Fact[]> {
  await delay(240);
  return clone(db.facts);
}

export async function addFact(input: { text: string; category: FactCategory }): Promise<Fact> {
  await delay(360);
  if (!input.text.trim()) throw new ApiError("אי אפשר לרשום עובדה ריקה");
  const fact: Fact = {
    id: nextId("k"),
    category: input.category,
    text: input.text.trim(),
    usedInStories: 0,
    updatedLabel: "נרשם עכשיו",
  };
  db.facts.unshift(fact);
  db.profile.stats.facts += 1;
  return clone(fact);
}

export async function updateFact(input: {
  id: string;
  text: string;
  category?: FactCategory;
}): Promise<Fact> {
  await delay(300);
  const fact = db.facts.find((f) => f.id === input.id);
  if (!fact) throw new ApiError("העובדה לא נמצאה בכרטסת", 404);
  if (!input.text.trim()) throw new ApiError("אי אפשר לרשום עובדה ריקה");
  fact.text = input.text.trim();
  if (input.category) fact.category = input.category;
  fact.updatedLabel = "עודכן עכשיו";
  return clone(fact);
}

export async function removeFact(id: string): Promise<void> {
  await delay(260);
  const i = db.facts.findIndex((f) => f.id === id);
  if (i === -1) throw new ApiError("העובדה לא נמצאה בכרטסת", 404);
  db.facts.splice(i, 1);
  db.profile.stats.facts = Math.max(0, db.profile.stats.facts - 1);
}
