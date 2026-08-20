import type { Hono } from "hono";
import { getDb } from "../db.ts";
import type { JoinResult } from "../types.ts";
import { INVITE_NOT_FOUND, SELF_JOIN, TOKEN_NOT_FOUND } from "./constants.ts";
import { areConnected, insertConnectionPair, resolveInviter } from "./graph.ts";
import { nextId, rowToInvitation } from "./rows.ts";
import { requireUser } from "./session.ts";

export function registerInviteRoutes(app: Hono): void {
  app.get("/invitations/preview/:token", (c) => {
    const inviter = resolveInviter(getDb(), c.req.param("token"));
    if (!inviter) return c.json({ message: TOKEN_NOT_FOUND }, 404);
    return c.json({ id: inviter.id, name: inviter.name, initial: inviter.initial });
  });

  app.post("/invitations/join", async (c) => {
    const userId = requireUser(c);
    if (userId instanceof Response) return userId;

    const body = (await c.req.json()) as { token?: string };
    const token = body.token?.trim() ?? "";
    if (!token) return c.json({ message: TOKEN_NOT_FOUND }, 400);

    const db = getDb();
    const inviter = resolveInviter(db, token);
    if (!inviter) return c.json({ message: TOKEN_NOT_FOUND }, 404);
    if (inviter.id === userId) return c.json({ message: SELF_JOIN }, 400);

    if (areConnected(db, userId, inviter.id)) {
      const result: JoinResult = { connected: true, inviterId: inviter.id };
      return c.json(result);
    }

    const existing = db
      .prepare(`SELECT id FROM invitations WHERE user_id = ? AND from_user_id = ?`)
      .get(userId, inviter.id) as { id: string } | undefined;
    if (existing) {
      return c.json({
        connected: false,
        inviterId: inviter.id,
        invitationId: existing.id,
      } satisfies JoinResult);
    }

    const id = nextId("i");
    db.prepare(
      `INSERT INTO invitations
       (id, user_id, target_user_id, from_user_id, name, initial, detail, direction)
       VALUES (?, ?, ?, ?, ?, ?, 'מבקש חיבור', 'incoming')`,
    ).run(id, userId, inviter.id, inviter.id, inviter.name, inviter.initial);

    return c.json({
      connected: false,
      inviterId: inviter.id,
      invitationId: id,
    } satisfies JoinResult);
  });

  app.get("/invitations", (c) => {
    const userId = requireUser(c);
    if (userId instanceof Response) return userId;

    const rows = getDb()
      .prepare(
        `SELECT id, name, initial, detail, direction, from_user_id
         FROM invitations WHERE user_id = ?`,
      )
      .all(userId);

    return c.json(rows.map((row) => rowToInvitation(row as never)));
  });

  app.post("/invitations/:id/respond", async (c) => {
    const userId = requireUser(c);
    if (userId instanceof Response) return userId;

    const invitationId = c.req.param("id");
    const body = (await c.req.json()) as { accept?: boolean };
    const db = getDb();

    const row = db
      .prepare(
        `SELECT id, from_user_id FROM invitations WHERE user_id = ? AND id = ?`,
      )
      .get(userId, invitationId) as { id: string; from_user_id: string | null } | undefined;

    if (!row) return c.json({ message: INVITE_NOT_FOUND }, 404);

    db.prepare(`DELETE FROM invitation_meta WHERE user_id = ? AND invitation_id = ?`).run(
      userId,
      invitationId,
    );
    db.prepare(`DELETE FROM invitations WHERE user_id = ? AND id = ?`).run(userId, invitationId);

    if (body.accept && row.from_user_id) {
      insertConnectionPair(db, userId, row.from_user_id);
    }

    return c.body(null, 204);
  });
}
