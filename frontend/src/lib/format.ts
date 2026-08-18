/** Splits a ticker into the single scrolling line the mockups show. */
export function tickerLine(items: string[]): string {
  return items.join(" · ");
}

/** Hebrew-aware pluralisation for the few counters in the UI. */
export function count(n: number, singular: string, plural: string): string {
  return n === 1 ? `${n} ${singular}` : `${n} ${plural}`;
}
