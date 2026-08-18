/* CORE API — authentication and session. */

import type { Session } from "../types";
import { request } from "../client";

export async function getSession(): Promise<Session | null> {
  return request<Session | null>("/auth/session");
}

export async function signIn(input: { email: string; password: string }): Promise<Session> {
  return request<Session>("/auth/sign-in", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function signUp(input: {
  name: string;
  email: string;
  password: string;
}): Promise<Session> {
  return request<Session>("/auth/sign-up", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function signOut(): Promise<void> {
  await request<void>("/auth/sign-out", { method: "POST" });
}
