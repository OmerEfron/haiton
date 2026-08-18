import {
  connectionsSeed,
  invitationsSeed,
  readerDirectory,
} from "../../frontend/src/mocks/fixtures/connections.ts";
import { factsSeed } from "../../frontend/src/mocks/fixtures/facts.ts";
import { flashesSeed, tickerSeed } from "../../frontend/src/mocks/fixtures/flashes.ts";
import {
  editionSeed,
  profileSeed,
  userSeed,
} from "../../frontend/src/mocks/fixtures/profile.ts";
import { digestsSeed, storiesSeed } from "../../frontend/src/mocks/fixtures/stories.ts";
import { hashPassword } from "./auth/password.ts";
import { getDb } from "./db.ts";

const DEFAULT_EMAIL = "omer@example.com";
const DEFAULT_PASSWORD = "iton-dev";

/** Idempotent seed from frontend fixtures (skips interview-script). */
export function seed(): void {
  const email = process.env.SEED_USER_EMAIL?.trim() || DEFAULT_EMAIL;
  const password = process.env.SEED_USER_PASSWORD?.trim() || DEFAULT_PASSWORD;
  const db = getDb();

  const existing = db
    .prepare("SELECT id FROM users WHERE email = ? COLLATE NOCASE")
    .get(email) as { id: string } | undefined;
  if (existing) return;

  const userId = userSeed.id;

  db.prepare(
    `INSERT INTO users (id, name, email, password_hash, initial, age, city, headline, publishing_since)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    userId,
    userSeed.name,
    email,
    hashPassword(password),
    userSeed.initial,
    userSeed.age ?? null,
    userSeed.city ?? null,
    userSeed.headline ?? null,
    profileSeed.publishingSince,
  );

  const { settings, sectionCounts, archive } = profileSeed;
  const stats = {
    storiesPublished: storiesSeed.length,
    flashes: flashesSeed.length,
    facts: factsSeed.length,
    draftsInProgress: 0,
  };

  db.prepare(
    `INSERT INTO edition_settings (user_id, edition_name, show_edition_tag, interview_reminder_at)
     VALUES (?, ?, ?, ?)`,
  ).run(
    userId,
    settings.editionName,
    settings.showEditionTag ? 1 : 0,
    settings.interviewReminderAt ?? null,
  );

  db.prepare(
    `INSERT INTO profile_stats (user_id, stories_published, flashes, facts, drafts_in_progress)
     VALUES (?, ?, ?, ?, ?)`,
  ).run(
    userId,
    stats.storiesPublished,
    stats.flashes,
    stats.facts,
    stats.draftsInProgress,
  );

  db.prepare(
    `INSERT INTO profile_meta (user_id, section_counts_json, archive_json)
     VALUES (?, ?, ?)`,
  ).run(userId, JSON.stringify(sectionCounts), JSON.stringify(archive));

  db.prepare(
    `INSERT INTO edition_state (user_id, edition_number, date_long, date_short, ticker_json, digests_json)
     VALUES (?, ?, ?, ?, ?, ?)`,
  ).run(
    userId,
    editionSeed.editionNumber,
    editionSeed.dateLong,
    editionSeed.dateShort,
    JSON.stringify(tickerSeed),
    JSON.stringify(digestsSeed),
  );

  const insertStory = db.prepare(
    `INSERT INTO stories (
      id, user_id, section, section_name, edition_label, headline, standfirst,
      body_json, angle, byline, published_at, image_caption, placement
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );

  for (const story of storiesSeed) {
    insertStory.run(
      story.id,
      userId,
      story.section,
      story.sectionName,
      story.editionLabel,
      story.headline,
      story.standfirst,
      JSON.stringify(story.body),
      story.angle,
      story.byline,
      story.publishedAt,
      story.imageCaption ?? null,
      story.placement,
    );
  }

  const insertFlash = db.prepare(
    `INSERT INTO flashes (id, user_id, time, text, story_id, sort_order)
     VALUES (?, ?, ?, ?, ?, ?)`,
  );

  flashesSeed.forEach((flash, index) => {
    insertFlash.run(
      flash.id,
      userId,
      flash.time,
      flash.text,
      flash.storyId ?? null,
      index,
    );
  });

  const insertFact = db.prepare(
    `INSERT INTO facts (id, user_id, category, text, used_in_stories, updated_label)
     VALUES (?, ?, ?, ?, ?, ?)`,
  );

  for (const fact of factsSeed) {
    insertFact.run(
      fact.id,
      userId,
      fact.category,
      fact.text,
      fact.usedInStories,
      fact.updatedLabel ?? null,
    );
  }

  const insertConnection = db.prepare(
    `INSERT INTO connections (
      id, user_id, name, initial, relation_label, relation, section, section_name,
      status, story_count, last_published, settings_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );

  for (const connection of connectionsSeed) {
    insertConnection.run(
      connection.id,
      userId,
      connection.name,
      connection.initial,
      connection.relationLabel,
      connection.relation,
      connection.section,
      connection.sectionName,
      connection.status,
      connection.storyCount,
      connection.lastPublished ?? null,
      JSON.stringify(connection.settings),
    );
  }

  const insertInvitation = db.prepare(
    `INSERT INTO invitations (id, user_id, name, initial, detail, direction)
     VALUES (?, ?, ?, ?, ?, ?)`,
  );

  for (const invitation of invitationsSeed) {
    insertInvitation.run(
      invitation.id,
      userId,
      invitation.name,
      invitation.initial,
      invitation.detail,
      invitation.direction,
    );
  }

  const insertReader = db.prepare(
    `INSERT OR IGNORE INTO readers (id, name, initial, detail) VALUES (?, ?, ?, ?)`,
  );

  for (const reader of readerDirectory) {
    insertReader.run(reader.id, reader.name, reader.initial, reader.detail);
  }
}
