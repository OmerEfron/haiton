/* CORE API — the karteset (the reporter's standing background file).
 * GET/POST /karteset/facts, PATCH/DELETE /karteset/facts/:id. */

import type { Fact, FactCategory } from "../types";
import { request } from "../client";

export async function listFacts(): Promise<Fact[]> {
  return request<Fact[]>("/karteset/facts");
}

export async function addFact(input: { text: string; category: FactCategory }): Promise<Fact> {
  return request<Fact>("/karteset/facts", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function updateFact(input: {
  id: string;
  text: string;
  category?: FactCategory;
}): Promise<Fact> {
  const { id, text, category } = input;
  return request<Fact>(`/karteset/facts/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ text, category }),
  });
}

export async function removeFact(id: string): Promise<void> {
  await request<void>(`/karteset/facts/${id}`, { method: "DELETE" });
}
