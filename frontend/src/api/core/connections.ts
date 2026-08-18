/* CORE API — the social graph ("מעגל הקרובים").
 * Later: GET /connections, GET /invitations, GET /readers?q=,
 *        POST /invitations, POST /invitations/:id/respond,
 *        PATCH/DELETE /connections/:id. */

import type {
  Connection,
  Invitation,
  ReaderSearchResult,
  RelationKind,
  SectionId,
} from "../types";
import { ApiError, clone, delay, nextId } from "../client";
import { db } from "../../mocks/db";
import { readerDirectory, suggestedFromInterviews } from "../../mocks/fixtures/connections";
import { sectionNames } from "../../copy/common";

export async function listConnections(): Promise<Connection[]> {
  await delay(260);
  return clone(db.connections);
}

export async function listInvitations(): Promise<Invitation[]> {
  await delay(200);
  return clone(db.invitations);
}

export async function getCircleSummary(): Promise<{
  connections: number;
  pending: number;
  updatedThisWeek: number;
}> {
  await delay(120);
  return {
    connections: db.connections.filter((c) => c.status === "connected").length,
    pending: db.invitations.length,
    updatedThisWeek: 3,
  };
}

export async function searchReaders(query: string): Promise<ReaderSearchResult[]> {
  await delay(340);
  const q = query.trim();
  if (!q) return [];
  return clone(readerDirectory.filter((r) => r.name.includes(q) || r.detail.includes(q)));
}

export async function listSuggestedConnections() {
  await delay(180);
  return clone(suggestedFromInterviews);
}

export async function sendInvitation(input: {
  readerId?: string;
  name: string;
  relation: RelationKind;
  section: SectionId;
  note?: string;
  settings: Connection["settings"];
}): Promise<Invitation> {
  await delay(560);
  if (!input.name.trim()) throw new ApiError("צריך לבחור קורא או להזין שם");
  const invitation: Invitation = {
    id: nextId("i"),
    name: `${input.name} — הזמנה שאתה שלחת`,
    initial: input.name[0],
    detail: "ממתין לתשובה · נשלח עכשיו",
    direction: "outgoing",
  };
  db.invitations.push(invitation);
  return clone(invitation);
}

export async function respondToInvitation(input: {
  id: string;
  accept: boolean;
}): Promise<void> {
  await delay(380);
  const i = db.invitations.findIndex((inv) => inv.id === input.id);
  if (i === -1) throw new ApiError("ההזמנה לא נמצאה", 404);
  const [invitation] = db.invitations.splice(i, 1);

  if (input.accept && invitation.direction === "incoming") {
    db.connections.push({
      id: nextId("c"),
      name: invitation.name,
      initial: invitation.initial,
      relationLabel: "חדש במעגל",
      relation: "friend",
      section: "friends",
      sectionName: sectionNames.friends,
      status: "connected",
      storyCount: 0,
      settings: { seesMyEdition: true, showsFullName: true, notifyOnPublish: false },
    });
  }
}

export async function cancelInvitation(id: string): Promise<void> {
  await delay(240);
  const i = db.invitations.findIndex((inv) => inv.id === id);
  if (i !== -1) db.invitations.splice(i, 1);
}

export async function updateConnection(input: {
  id: string;
  relation?: RelationKind;
  relationLabel?: string;
  section?: SectionId;
  settings?: Partial<Connection["settings"]>;
}): Promise<Connection> {
  await delay(300);
  const c = db.connections.find((x) => x.id === input.id);
  if (!c) throw new ApiError("החיבור לא נמצא", 404);
  if (input.relation) c.relation = input.relation;
  if (input.relationLabel) c.relationLabel = input.relationLabel;
  if (input.section) {
    c.section = input.section;
    c.sectionName = sectionNames[input.section] ?? c.sectionName;
  }
  if (input.settings) c.settings = { ...c.settings, ...input.settings };
  return clone(c);
}

export async function removeConnection(id: string): Promise<void> {
  await delay(280);
  const i = db.connections.findIndex((c) => c.id === id);
  if (i === -1) throw new ApiError("החיבור לא נמצא", 404);
  db.connections.splice(i, 1);
}
