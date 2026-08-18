import { Hono } from "hono";
import { getDb } from "../db.ts";
import type { Connection, RelationKind, SectionId } from "../types.ts";
import { DEFAULT_ACCEPT_SETTINGS, SECTION_NAMES } from "./constants.ts";
import { nextId, parseSettings, rowToConnection, rowToInvitation } from "./rows.ts";
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

  app.get("/connections/suggested", (c) => {
    const userId = requireUser(c);
    if (userId instanceof Response) return userId;

    const connections = getDb()
      .prepare(`SELECT name, connected_user_id FROM connections WHERE user_id = ?`)
      .all(userId) as { name: string; connected_user_id: string | null }[];

    const connectedNames = new Set(connections.map((row) => row.name));
    const connectedIds = new Set(
      connections.flatMap((row) => (row.connected_user_id ? [row.connected_user_id] : [])),
    );

    const readers = getDb()
      .prepare(`SELECT id, name, initial, detail FROM readers`)
      .all() as { id: string; name: string; initial: string; detail: string }[];

    const suggested = readers.filter(
      (reader) => !connectedNames.has(reader.name) && !connectedIds.has(reader.id),
    );

    return c.json(suggested);
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

    const relation = body.relation ?? "friend";
    const section = body.section ?? "friends";
    const note = body.note?.trim() || null;
    const settings = body.settings ?? DEFAULT_ACCEPT_SETTINGS;

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

    getDb()
      .prepare(
        `INSERT INTO invitation_meta (user_id, invitation_id, relation, section, note, settings_json)
         VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT(user_id, invitation_id) DO UPDATE SET
           relation = excluded.relation,
           section = excluded.section,
           note = excluded.note,
           settings_json = excluded.settings_json`,
      )
      .run(userId, id, relation, section, note, JSON.stringify(settings));

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

    const meta = getDb()
      .prepare(
        `SELECT relation, section, settings_json
         FROM invitation_meta WHERE user_id = ? AND invitation_id = ?`,
      )
      .get(userId, invitationId) as
      | { relation: RelationKind; section: SectionId; settings_json: string }
      | undefined;

    getDb()
      .prepare(`DELETE FROM invitation_meta WHERE user_id = ? AND invitation_id = ?`)
      .run(userId, invitationId);

    getDb()
      .prepare(`DELETE FROM invitations WHERE user_id = ? AND id = ?`)
      .run(userId, invitationId);

    if (body.accept && row.direction === "incoming") {
      const relation = meta?.relation ?? "friend";
      const section = meta?.section ?? "friends";
      const settings = meta ? parseSettings(meta.settings_json) : DEFAULT_ACCEPT_SETTINGS;
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
          relation,
          section,
          SECTION_NAMES[section] ?? SECTION_NAMES.friends,
          JSON.stringify(settings),
        );
    }

    return c.body(null, 204);
  });

  app.delete("/invitations/:id", (c) => {
    const userId = requireUser(c);
    if (userId instanceof Response) return userId;

    const invitationId = c.req.param("id");
    getDb()
      .prepare(`DELETE FROM invitation_meta WHERE user_id = ? AND invitation_id = ?`)
      .run(userId, invitationId);

    getDb()
      .prepare(`DELETE FROM invitations WHERE user_id = ? AND id = ?`)
      .run(userId, invitationId);

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
