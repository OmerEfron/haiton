import type { Connection, ConnectionStatus, Invitation, RelationKind, SectionId } from "../types.ts";

interface ConnectionRow {
  id: string;
  connected_user_id: string | null;
  name: string;
  initial: string;
  relation_label: string;
  relation: RelationKind;
  section: SectionId;
  section_name: string;
  status: ConnectionStatus;
  story_count: number;
  last_published: string | null;
}

interface InvitationRow {
  id: string;
  name: string;
  initial: string;
  detail: string;
  direction: "incoming" | "outgoing";
  from_user_id: string | null;
}

export function rowToConnection(row: ConnectionRow): Connection {
  const connection: Connection = {
    id: row.id,
    connectedUserId: row.connected_user_id ?? "",
    name: row.name,
    initial: row.initial,
    relationLabel: row.relation_label,
    relation: row.relation,
    section: row.section,
    sectionName: row.section_name,
    status: row.status,
    storyCount: row.story_count,
  };
  if (row.last_published) connection.lastPublished = row.last_published;
  return connection;
}

export function rowToInvitation(row: InvitationRow): Invitation {
  const invitation: Invitation = {
    id: row.id,
    name: row.name,
    initial: row.initial,
    detail: row.detail,
    direction: row.direction,
  };
  if (row.from_user_id) invitation.fromUserId = row.from_user_id;
  return invitation;
}

export function nextId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID().replace(/-/g, "").slice(0, 10)}`;
}
