/* CORE API — authentication and session.
 * Later: POST /auth/sign-in, /auth/sign-up, /auth/sign-out, GET /auth/session. */

import type { Session } from "../types";
import { ApiError, clone, delay } from "../client";
import { db } from "../../mocks/db";
import { userSeed } from "../../mocks/fixtures/profile";

export async function getSession(): Promise<Session | null> {
  await delay(120);
  return clone(db.session);
}

export async function signIn(input: { email: string; password: string }): Promise<Session> {
  await delay(420);
  if (!input.email.trim() || !input.password.trim()) {
    throw new ApiError("צריך דוא״ל וסיסמה כדי להיכנס");
  }
  db.session = { user: userSeed, editionName: db.profile.settings.editionName };
  return clone(db.session);
}

export async function signUp(input: {
  name: string;
  email: string;
  password: string;
}): Promise<Session> {
  await delay(520);
  if (!input.name.trim() || !input.email.trim() || !input.password.trim()) {
    throw new ApiError("צריך שם, דוא״ל וסיסמה כדי לפתוח מהדורה");
  }
  const user = { ...userSeed, name: input.name, email: input.email, initial: input.name[0] };
  db.profile.user = user;
  db.profile.settings.editionName = `המהדורה של ${input.name}`;
  db.session = { user, editionName: db.profile.settings.editionName };
  return clone(db.session);
}

export async function signOut(): Promise<void> {
  await delay(160);
  db.session = null;
}
