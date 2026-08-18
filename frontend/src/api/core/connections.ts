/* CORE API — the social graph ("מעגל הקרובים"). */

import type {
  Connection,
  Invitation,
  ReaderSearchResult,
  RelationKind,
  SectionId,
} from "../types";
import { request } from "../client";

export async function listConnections(): Promise<Connection[]> {
  return request<Connection[]>("/connections");
}

export async function listInvitations(): Promise<Invitation[]> {
  return request<Invitation[]>("/invitations");
}

export async function getCircleSummary(): Promise<{
  connections: number;
  pending: number;
  updatedThisWeek: number;
}> {
  return request("/connections/summary");
}

export async function searchReaders(query: string): Promise<ReaderSearchResult[]> {
  const q = encodeURIComponent(query);
  return request<ReaderSearchResult[]>(`/readers?q=${q}`);
}

export async function listSuggestedConnections(): Promise<ReaderSearchResult[]> {
  return request<ReaderSearchResult[]>("/connections/suggested");
}

export async function sendInvitation(input: {
  readerId?: string;
  name: string;
  relation: RelationKind;
  note?: string;
  settings: Connection["settings"];
}): Promise<Invitation> {
  return request<Invitation>("/invitations", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function respondToInvitation(input: {
  id: string;
  accept: boolean;
}): Promise<void> {
  await request<void>(`/invitations/${input.id}/respond`, {
    method: "POST",
    body: JSON.stringify({ accept: input.accept }),
  });
}

export async function cancelInvitation(id: string): Promise<void> {
  await request<void>(`/invitations/${id}`, { method: "DELETE" });
}

export async function updateConnection(input: {
  id: string;
  relation?: RelationKind;
  relationLabel?: string;
  section?: SectionId;
  settings?: Partial<Connection["settings"]>;
}): Promise<Connection> {
  return request<Connection>(`/connections/${input.id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export async function removeConnection(id: string): Promise<void> {
  await request<void>(`/connections/${id}`, { method: "DELETE" });
}
