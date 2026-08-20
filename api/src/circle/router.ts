import { Hono } from "hono";
import { getDb } from "../db.ts";
import type { RelationKind, SectionId } from "../types.ts";
import { CONNECTION_NOT_FOUND, SECTION_NAMES } from "./constants.ts";
import { deleteConnectionPair } from "./graph.ts";
import { registerInviteRoutes } from "./invites.ts";
import { rowToConnection } from "./rows.ts";
import { requireUser } from "./session.ts";

export function createCircleRouter(): Hono {
  const app = new Hono();

  app.get("/connections", (c) => {
    const userId = requireUser(c);
    if (userId instanceof Response) return userId;

    const rows = getDb()
      .prepare(
        `SELECT c.id, c.connected_user_id, u.name, u.initial, c.relation_label, c.relation,
                c.section, c.section_name, c.status, c.story_count, c.last_published
         FROM connections c
         JOIN users u ON u.id = c.connected_user_id
         WHERE c.user_id = ? AND c.status = 'connected'`,
      )
      .all(userId);

    return c.json(rows.map((row) => rowToConnection(row as never)));
  });

  app.get("/connections/summary", (c) => {
    const userId = requireUser(c);
    if (userId instanceof Response) return userId;

    const connected = getDb()
      .prepare(
        `SELECT COUNT(*) AS n FROM connections
         WHERE user_id = ? AND status = 'connected' AND connected_user_id IS NOT NULL`,
      )
      .get(userId) as { n: number };

    const pending = getDb()
      .prepare(`SELECT COUNT(*) AS n FROM invitations WHERE user_id = ?`)
      .get(userId) as { n: number };

    const updated = getDb()
      .prepare(
        `SELECT COUNT(*) AS n FROM connections
         WHERE user_id = ? AND last_published IS NOT NULL`,
      )
      .get(userId) as { n: number };

    return c.json({
      connections: connected.n,
      pending: pending.n,
      updatedThisWeek: updated.n,
    });
  });

  app.patch("/connections/:id", async (c) => {
    const userId = requireUser(c);
    if (userId instanceof Response) return userId;

    const connectionId = c.req.param("id");
    const body = (await c.req.json()) as {
      relation?: RelationKind;
      relationLabel?: string;
      section?: SectionId;
    };

    const existing = getDb()
      .prepare(
        `SELECT c.id, c.connected_user_id, u.name, u.initial, c.relation_label, c.relation,
                c.section, c.section_name, c.status, c.story_count, c.last_published
         FROM connections c
         JOIN users u ON u.id = c.connected_user_id
         WHERE c.user_id = ? AND c.id = ?`,
      )
      .get(userId, connectionId) as Record<string, unknown> | undefined;

    if (!existing) return c.json({ message: CONNECTION_NOT_FOUND }, 404);

    const relation = body.relation ?? (existing.relation as RelationKind);
    const relationLabel = body.relationLabel ?? (existing.relation_label as string);
    const section = body.section ?? (existing.section as SectionId);
    const sectionName = body.section
      ? (SECTION_NAMES[body.section] ?? (existing.section_name as string))
      : (existing.section_name as string);

    getDb()
      .prepare(
        `UPDATE connections
         SET relation = ?, relation_label = ?, section = ?, section_name = ?
         WHERE user_id = ? AND id = ?`,
      )
      .run(relation, relationLabel, section, sectionName, userId, connectionId);

    const updated = getDb()
      .prepare(
        `SELECT c.id, c.connected_user_id, u.name, u.initial, c.relation_label, c.relation,
                c.section, c.section_name, c.status, c.story_count, c.last_published
         FROM connections c
         JOIN users u ON u.id = c.connected_user_id
         WHERE c.user_id = ? AND c.id = ?`,
      )
      .get(userId, connectionId);

    return c.json(rowToConnection(updated as never));
  });

  app.delete("/connections/:id", (c) => {
    const userId = requireUser(c);
    if (userId instanceof Response) return userId;

    if (!deleteConnectionPair(getDb(), userId, c.req.param("id"))) {
      return c.json({ message: CONNECTION_NOT_FOUND }, 404);
    }
    return c.body(null, 204);
  });

  registerInviteRoutes(app);
  return app;
}
