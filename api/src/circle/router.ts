import { Hono } from "hono";
import { getDb } from "../db.ts";
import type { Connection, RelationKind, SectionId } from "../types.ts";
import {
  DEFAULT_ACCEPT_SETTINGS,
  SECTION_NAMES,
  SUGGESTED_FROM_INTERVIEWS,
  UPDATED_THIS_WEEK,
} from "./constants.ts";
import { nextId, rowToConnection, rowToInvitation } from "./rows.ts";
import { requireUser } from "./session.ts";

export function createCircleRouter(): Hono {
  const app = new Hono();

  app.get("/connections", (c) => {
    const userId = requireUser(c);
    if (userId instanceof Response) return userId;

    const rows = getDb()
      .prepare(
        `SELECT id, name, initial, relation_label, relation, section, section_name,
                status, story_count, last_published, settings_json
         FROM connections WHERE user_id = ?`,
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
         WHERE user_id = ? AND status = 'connected'`,
      )
      .get(userId) as { n: number };

    const pending = getDb()
      .prepare(`SELECT COUNT(*) AS n FROM invitations WHERE user_id = ?`)
      .get(userId) as { n: number };

    return c.json({
      connections: connected.n,
      pending: pending.n,
      updatedThisWeek: UPDATED_THIS_WEEK,
    });
  });

  app.get("/connections/suggested", (c) => {
    const auth = requireUser(c);
    if (auth instanceof Response) return auth;
    return c.json(SUGGESTED_FROM_INTERVIEWS);
  });

  app.get("/invitations", (c) => {
    const userId = requireUser(c);
    if (userId instanceof Response) return userId;

    const rows = getDb()
      .prepare(
        `SELECT id, name, initial, detail, direction
         FROM invitations WHERE user_id = ?`,
      )
      .all(userId);

    return c.json(rows.map((row) => rowToInvitation(row as never)));
  });

  app.post("/invitations", async (c) => {
    const userId = requireUser(c);
    if (userId instanceof Response) return userId;

    const body = (await c.req.json()) as {
      readerId?: string;
      name?: string;
      relation?: RelationKind;
      section?: SectionId;
      note?: string;
      settings?: Connection["settings"];
    };

    let name = body.name?.trim() ?? "";
    let initial = name[0] ?? "";
    let targetUserId: string | null = null;

    if (body.readerId) {
      const reader = getDb()
        .prepare(`SELECT id, name, initial FROM readers WHERE id = ?`)
        .get(body.readerId) as { id: string; name: string; initial: string } | undefined;
      if (reader) {
        targetUserId = reader.id;
        if (!name) {
          name = reader.name;
          initial = reader.initial;
        }
      }
    }

    if (!name) {
      return c.json({ message: "צריך לבחור קורא או להזין שם" }, 400);
    }

    const id = nextId("i");
    const invitation = {
      id,
      name: `${name} — הזמנה שאתה שלחת`,
      initial: initial || name[0],
      detail: "ממתין לתשובה · נשלח עכשיו",
      direction: "outgoing" as const,
    };

    getDb()
      .prepare(
        `INSERT INTO invitations
         (id, user_id, target_user_id, name, initial, detail, direction)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        id,
        userId,
        targetUserId,
        invitation.name,
        invitation.initial,
        invitation.detail,
        invitation.direction,
      );

    return c.json(invitation);
  });

  app.post("/invitations/:id/respond", async (c) => {
    const userId = requireUser(c);
    if (userId instanceof Response) return userId;

    const invitationId = c.req.param("id");
    const body = (await c.req.json()) as { accept?: boolean };

    const row = getDb()
      .prepare(
        `SELECT id, name, initial, detail, direction
         FROM invitations WHERE user_id = ? AND id = ?`,
      )
      .get(userId, invitationId) as
      | { id: string; name: string; initial: string; detail: string; direction: "incoming" | "outgoing" }
      | undefined;

    if (!row) return c.json({ message: "ההזמנה לא נמצאה" }, 404);

    getDb()
      .prepare(`DELETE FROM invitations WHERE user_id = ? AND id = ?`)
      .run(userId, invitationId);

    if (body.accept && row.direction === "incoming") {
      const connectionId = nextId("c");
      getDb()
        .prepare(
          `INSERT INTO connections
           (id, user_id, name, initial, relation_label, relation, section, section_name,
            status, story_count, settings_json)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'connected', 0, ?)`,
        )
        .run(
          connectionId,
          userId,
          row.name,
          row.initial,
          "חדש במעגל",
          "friend",
          "friends",
          SECTION_NAMES.friends,
          JSON.stringify(DEFAULT_ACCEPT_SETTINGS),
        );
    }

    return c.body(null, 204);
  });

  app.delete("/invitations/:id", (c) => {
    const userId = requireUser(c);
    if (userId instanceof Response) return userId;

    getDb()
      .prepare(`DELETE FROM invitations WHERE user_id = ? AND id = ?`)
      .run(userId, c.req.param("id"));

    return c.body(null, 204);
  });

  app.patch("/connections/:id", async (c) => {
    const userId = requireUser(c);
    if (userId instanceof Response) return userId;

    const connectionId = c.req.param("id");
    const body = (await c.req.json()) as {
      relation?: RelationKind;
      relationLabel?: string;
      section?: SectionId;
      settings?: Partial<Connection["settings"]>;
    };

    const existing = getDb()
      .prepare(
        `SELECT id, name, initial, relation_label, relation, section, section_name,
                status, story_count, last_published, settings_json
         FROM connections WHERE user_id = ? AND id = ?`,
      )
      .get(userId, connectionId) as Record<string, unknown> | undefined;

    if (!existing) return c.json({ message: "החיבור לא נמצא" }, 404);

    const relation = body.relation ?? (existing.relation as RelationKind);
    const relationLabel = body.relationLabel ?? (existing.relation_label as string);
    const section = body.section ?? (existing.section as SectionId);
    const sectionName = body.section
      ? (SECTION_NAMES[body.section] ?? (existing.section_name as string))
      : (existing.section_name as string);

    const settings = {
      ...JSON.parse(existing.settings_json as string),
      ...body.settings,
    };

    getDb()
      .prepare(
        `UPDATE connections
         SET relation = ?, relation_label = ?, section = ?, section_name = ?, settings_json = ?
         WHERE user_id = ? AND id = ?`,
      )
      .run(
        relation,
        relationLabel,
        section,
        sectionName,
        JSON.stringify(settings),
        userId,
        connectionId,
      );

    const updated = getDb()
      .prepare(
        `SELECT id, name, initial, relation_label, relation, section, section_name,
                status, story_count, last_published, settings_json
         FROM connections WHERE user_id = ? AND id = ?`,
      )
      .get(userId, connectionId);

    return c.json(rowToConnection(updated as never));
  });

  app.delete("/connections/:id", (c) => {
    const userId = requireUser(c);
    if (userId instanceof Response) return userId;

    const result = getDb()
      .prepare(`DELETE FROM connections WHERE user_id = ? AND id = ?`)
      .run(userId, c.req.param("id"));

    if (result.changes === 0) {
      return c.json({ message: "החיבור לא נמצא" }, 404);
    }

    return c.body(null, 204);
  });

  app.get("/readers", (c) => {
    const auth = requireUser(c);
    if (auth instanceof Response) return auth;

    const q = (c.req.query("q") ?? "").trim();
    if (!q) return c.json([]);

    const rows = getDb()
      .prepare(`SELECT id, name, initial, detail FROM readers`)
      .all() as { id: string; name: string; initial: string; detail: string }[];

    const matches = rows.filter((r) => r.name.includes(q) || r.detail.includes(q));
    return c.json(matches);
  });

  return app;
}
