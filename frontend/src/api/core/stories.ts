import type { Draft, FrontPage, SharedStory, Story } from "../types";
import { request } from "../client";

export async function getFrontPage(): Promise<FrontPage> {
  return request<FrontPage>("/editions/current");
}

export async function getUserEdition(userId: string): Promise<FrontPage> {
  return request<FrontPage>(`/editions/${encodeURIComponent(userId)}`);
}

export async function getStory(id: string): Promise<Story> {
  return request<Story>(`/stories/${encodeURIComponent(id)}`);
}

export async function getSharedStory(token: string): Promise<SharedStory> {
  return request<SharedStory>(`/stories/share/${encodeURIComponent(token)}`);
}

export async function listStories(section?: string): Promise<Story[]> {
  const query = section ? `?section=${encodeURIComponent(section)}` : "";
  return request<Story[]>(`/stories${query}`);
}

export async function listFlashes(): Promise<{ flashes: FrontPage["flashes"]; dateShort: string }> {
  return request<{ flashes: FrontPage["flashes"]; dateShort: string }>("/flashes");
}

/** Publishing a finished draft: becomes the new lead story plus a flash. */
export async function publishStory(draft: Draft): Promise<Story> {
  return request<Story>("/stories", {
    method: "POST",
    body: JSON.stringify(draft),
  });
}
