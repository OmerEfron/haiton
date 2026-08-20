import type { Flash, Story } from "../api/types";

/** Splits a ticker into the single scrolling line the mockups show. */
export function tickerLine(items: string[]): string {
  return items.join(" · ");
}

export function storyPath(story: Pick<Story, "id" | "shareToken">): string {
  return story.shareToken ? `/s/${story.shareToken}` : `/story/${story.id}`;
}

export function storyShareUrl(story: Pick<Story, "shareToken" | "id">): string {
  const path = storyPath(story);
  return `${window.location.origin}${path}`;
}

export function flashPath(flash: Flash): string | null {
  if (flash.shareToken) return `/s/${flash.shareToken}`;
  if (flash.storyId) return `/story/${flash.storyId}`;
  return null;
}

/** Hebrew-aware pluralisation for the few counters in the UI. */
export function count(n: number, singular: string, plural: string): string {
  return n === 1 ? `${n} ${singular}` : `${n} ${plural}`;
}
