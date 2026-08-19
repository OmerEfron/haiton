/* CORE API — the reporter's own profile ("כתב הבית").
 * GET /profile, PATCH /profile, PATCH /profile/edition-settings. */

import type { EditionSettings, Profile, User } from "../types";
import { request } from "../client";

export async function getProfile(): Promise<Profile> {
  return request<Profile>("/profile");
}

export async function updateProfile(
  patch: Partial<Pick<User, "name" | "city" | "headline">>,
): Promise<Profile> {
  return request<Profile>("/profile", {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
}

export async function updateEditionSettings(
  patch: Partial<EditionSettings>,
): Promise<EditionSettings> {
  return request<EditionSettings>("/profile/edition-settings", {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
}
