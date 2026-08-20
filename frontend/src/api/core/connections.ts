/* CORE API — the social graph ("מעגל הקרובים"). */

import type {
  Connection,
  Invitation,
  InvitePreview,
  JoinResult,
  RelationKind,
} from "../types";
import { request } from "../client";

export async function listConnections(): Promise<Connection[]> {
  return request<Connection[]>("/connections");
}

export async function listInvitations(): Promise<Invitation[]> {
  return request<Invitation[]>("/invitations");
}

export async function previewInvitation(token: string): Promise<InvitePreview> {
  return request<InvitePreview>(`/invitations/preview/${encodeURIComponent(token)}`);
}

export async function joinInvitation(token: string): Promise<JoinResult> {
  return request<JoinResult>("/invitations/join", {
    method: "POST",
    body: JSON.stringify({ token }),
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

export async function updateConnection(input: {
  id: string;
  relation?: RelationKind;
  relationLabel?: string;
}): Promise<Connection> {
  return request<Connection>(`/connections/${input.id}`, {
    method: "PATCH",
    body: JSON.stringify({ relation: input.relation, relationLabel: input.relationLabel }),
  });
}

export async function removeConnection(id: string): Promise<void> {
  await request<void>(`/connections/${id}`, { method: "DELETE" });
}
