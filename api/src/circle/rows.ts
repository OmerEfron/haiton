import { getLogger } from "../log/logger.ts";
import type { Connection, ConnectionStatus, Invitation, RelationKind, SectionId } from "../types.ts";

interface ConnectionRow {
  id: string;
  name: string;
  initial: string;
  relation_label: string;
  relation: RelationKind;
  section: SectionId;
  section_name: string;
  status: ConnectionStatus;
  story_count: number;
  last_published: string | null;
  settings_json: string;
}

interface InvitationRow {
  id: string;
  name: string;
  initial: string;
  detail: string;
  direction: "incoming" | "outgoing";
}

export function parseSettings(json: string): Connection["settings"] {
  try {
    const parsed = JSON.parse(json) as Connection["settings"];
    return {
      seesMyEdition: Boolean(parsed?.seesMyEdition),
      showsFullName: Boolean(parsed?.showsFullName),
      notifyOnPublish: Boolean(parsed?.notifyOnPublish),
    };
  } catch {
    getLogger().warn({ event: "settings.parse_failed" }, "settings parse failed");
    return { seesMyEdition: true, showsFullName: true, notifyOnPublish: false };
  }
}

export function rowToConnection(row: ConnectionRow): Connection {
  const connection: Connection = {
    id: row.id,
    name: row.name,
    initial: row.initial,
    relationLabel: row.relation_label,
    relation: row.relation,
    section: row.section,
    sectionName: row.section_name,
    status: row.status,
    storyCount: row.story_count,
    settings: parseSettings(row.settings_json),
  };
  if (row.last_published) connection.lastPublished = row.last_published;
  return connection;
}

export function rowToInvitation(row: InvitationRow): Invitation {
  return {
    id: row.id,
    name: row.name,
    initial: row.initial,
    detail: row.detail,
    direction: row.direction,
  };
}

export function nextId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID().replace(/-/g, "").slice(0, 10)}`;
}
