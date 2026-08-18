-- SQLite schema for core API (W0). W1 tracks add routers only — do not alter db.ts.

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  initial TEXT NOT NULL,
  age INTEGER,
  city TEXT,
  headline TEXT,
  publishing_since TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);

CREATE TABLE IF NOT EXISTS edition_settings (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  edition_name TEXT NOT NULL,
  show_edition_tag INTEGER NOT NULL DEFAULT 1,
  interview_reminder_at TEXT
);

CREATE TABLE IF NOT EXISTS profile_stats (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  stories_published INTEGER NOT NULL DEFAULT 0,
  flashes INTEGER NOT NULL DEFAULT 0,
  facts INTEGER NOT NULL DEFAULT 0,
  drafts_in_progress INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS profile_meta (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  section_counts_json TEXT NOT NULL DEFAULT '[]',
  archive_json TEXT NOT NULL DEFAULT '[]'
);

CREATE TABLE IF NOT EXISTS edition_state (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  edition_number INTEGER NOT NULL DEFAULT 1,
  date_long TEXT NOT NULL DEFAULT '',
  date_short TEXT NOT NULL DEFAULT '',
  ticker_json TEXT NOT NULL DEFAULT '[]',
  digests_json TEXT NOT NULL DEFAULT '[]',
  open_draft_title TEXT,
  open_draft_summary TEXT
);

CREATE TABLE IF NOT EXISTS stories (
  id TEXT NOT NULL,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  section TEXT NOT NULL,
  section_name TEXT NOT NULL,
  edition_label TEXT NOT NULL,
  headline TEXT NOT NULL,
  standfirst TEXT NOT NULL DEFAULT '',
  body_json TEXT NOT NULL DEFAULT '[]',
  angle TEXT NOT NULL DEFAULT '',
  byline TEXT NOT NULL DEFAULT '',
  published_at TEXT NOT NULL,
  image_caption TEXT,
  placement TEXT NOT NULL CHECK (placement IN ('lead', 'secondary', 'list')),
  PRIMARY KEY (user_id, id)
);

CREATE INDEX IF NOT EXISTS idx_stories_user_section ON stories(user_id, section);
CREATE INDEX IF NOT EXISTS idx_stories_user_placement ON stories(user_id, placement);

CREATE TABLE IF NOT EXISTS flashes (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  time TEXT NOT NULL,
  text TEXT NOT NULL,
  story_id TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_flashes_user_id ON flashes(user_id);

CREATE TABLE IF NOT EXISTS facts (
  id TEXT NOT NULL,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (category IN ('personal', 'work', 'family', 'routine')),
  text TEXT NOT NULL,
  used_in_stories INTEGER NOT NULL DEFAULT 0,
  updated_label TEXT,
  PRIMARY KEY (user_id, id)
);

CREATE TABLE IF NOT EXISTS connections (
  id TEXT NOT NULL,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  connected_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  initial TEXT NOT NULL,
  relation_label TEXT NOT NULL,
  relation TEXT NOT NULL,
  section TEXT NOT NULL,
  section_name TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('connected', 'pending_them', 'pending_you')),
  story_count INTEGER NOT NULL DEFAULT 0,
  last_published TEXT,
  settings_json TEXT NOT NULL DEFAULT '{}',
  PRIMARY KEY (user_id, id)
);

CREATE TABLE IF NOT EXISTS invitations (
  id TEXT NOT NULL,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  target_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  initial TEXT NOT NULL,
  detail TEXT NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('incoming', 'outgoing')),
  PRIMARY KEY (user_id, id)
);

CREATE TABLE IF NOT EXISTS readers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  initial TEXT NOT NULL,
  detail TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_readers_name ON readers(name);
