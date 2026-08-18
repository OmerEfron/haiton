/* CORE API — the reporter's own profile ("כתב הבית").
 * Later: GET /profile, PATCH /profile/edition-settings. */

import type { EditionSettings, Profile } from "../types";
import { clone, delay } from "../client";
import { db } from "../../mocks/db";

export async function getProfile(): Promise<Profile> {
  await delay(280);
  return clone(db.profile);
}

export async function updateEditionSettings(
  patch: Partial<EditionSettings>,
): Promise<EditionSettings> {
  await delay(320);
  db.profile.settings = { ...db.profile.settings, ...patch };
  if (db.session) db.session.editionName = db.profile.settings.editionName;
  return clone(db.profile.settings);
}
