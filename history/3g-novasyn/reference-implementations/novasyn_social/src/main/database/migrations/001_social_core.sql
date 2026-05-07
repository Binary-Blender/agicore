-- NovaSyn Social: Core Schema
-- Migration 001 — All tables, triggers, and indexes

PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

-- ============================================================
-- SETTINGS
-- ============================================================
CREATE TABLE IF NOT EXISTS settings (
  key       TEXT PRIMARY KEY,
  value     TEXT NOT NULL,
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TRIGGER IF NOT EXISTS trg_settings_updated_at
AFTER UPDATE ON settings
FOR EACH ROW
BEGIN
  UPDATE settings SET updated_at = datetime('now') WHERE key = NEW.key;
END;

-- ============================================================
-- ACCOUNTS — Platform connections
-- ============================================================
CREATE TABLE IF NOT EXISTS accounts (
  id             TEXT PRIMARY KEY,
  platform       TEXT NOT NULL CHECK (platform IN ('gmail','linkedin','youtube','twitter','manual')),
  account_name   TEXT NOT NULL,
  account_handle TEXT,
  access_token   TEXT,
  refresh_token  TEXT,
  token_expires_at TEXT,
  is_active      INTEGER DEFAULT 1,
  last_sync_at   TEXT,
  created_at     TEXT DEFAULT (datetime('now')),
  updated_at     TEXT DEFAULT (datetime('now'))
);

CREATE TRIGGER IF NOT EXISTS trg_accounts_updated_at
AFTER UPDATE ON accounts
FOR EACH ROW
BEGIN
  UPDATE accounts SET updated_at = datetime('now') WHERE id = NEW.id;
END;

-- ============================================================
-- THREADS — Conversation grouping
-- ============================================================
CREATE TABLE IF NOT EXISTS threads (
  id                 TEXT PRIMARY KEY,
  external_thread_id TEXT,
  platform           TEXT NOT NULL,
  subject            TEXT,
  participant_count  INTEGER DEFAULT 1,
  created_at         TEXT DEFAULT (datetime('now')),
  updated_at         TEXT DEFAULT (datetime('now'))
);

CREATE TRIGGER IF NOT EXISTS trg_threads_updated_at
AFTER UPDATE ON threads
FOR EACH ROW
BEGIN
  UPDATE threads SET updated_at = datetime('now') WHERE id = NEW.id;
END;

-- ============================================================
-- MESSAGES — Unified inbox (core table)
-- ============================================================
CREATE TABLE IF NOT EXISTS messages (
  id               TEXT PRIMARY KEY,
  external_id      TEXT UNIQUE,
  thread_id        TEXT REFERENCES threads(id),
  account_id       TEXT REFERENCES accounts(id),
  channel_type     TEXT NOT NULL CHECK (channel_type IN ('email','linkedin_dm','linkedin_comment','youtube_comment','twitter_dm','manual')),
  direction        TEXT NOT NULL DEFAULT 'inbound' CHECK (direction IN ('inbound','outbound')),
  sender_name      TEXT,
  sender_handle    TEXT,
  subject          TEXT,
  body             TEXT NOT NULL,
  priority_score   INTEGER DEFAULT 50 CHECK (priority_score >= 0 AND priority_score <= 100),
  is_read          INTEGER DEFAULT 0,
  is_archived      INTEGER DEFAULT 0,
  is_starred       INTEGER DEFAULT 0,
  ingestion_status TEXT DEFAULT 'processed',
  raw_metadata     TEXT, -- JSON
  created_at       TEXT DEFAULT (datetime('now')),
  updated_at       TEXT DEFAULT (datetime('now'))
);

CREATE TRIGGER IF NOT EXISTS trg_messages_updated_at
AFTER UPDATE ON messages
FOR EACH ROW
BEGIN
  UPDATE messages SET updated_at = datetime('now') WHERE id = NEW.id;
END;

-- ============================================================
-- CLASSIFICATIONS — AI-generated message metadata
-- ============================================================
CREATE TABLE IF NOT EXISTS classifications (
  id              TEXT PRIMARY KEY,
  message_id      TEXT NOT NULL UNIQUE REFERENCES messages(id),
  opportunity_type TEXT CHECK (opportunity_type IN ('job','partnership','sales_lead','social','logistics','spam','unknown')),
  sentiment       TEXT CHECK (sentiment IN ('positive','neutral','negative','hostile')),
  intent          TEXT CHECK (intent IN ('informational','promotional','confrontational','inquiry')),
  topic_alignment REAL DEFAULT 0,
  hostility_level REAL DEFAULT 0,
  confidence      REAL DEFAULT 0,
  explanation     TEXT,
  model_used      TEXT,
  created_at      TEXT DEFAULT (datetime('now'))
);

-- ============================================================
-- DRAFTS — AI-generated response drafts
-- ============================================================
CREATE TABLE IF NOT EXISTS drafts (
  id            TEXT PRIMARY KEY,
  message_id    TEXT NOT NULL REFERENCES messages(id),
  response_mode TEXT NOT NULL CHECK (response_mode IN ('standard','agree_amplify','educate','battle')),
  draft_text    TEXT NOT NULL,
  confidence    REAL DEFAULT 0,
  rationale     TEXT,
  model_used    TEXT,
  is_accepted   INTEGER DEFAULT 0,
  is_sent       INTEGER DEFAULT 0,
  created_at    TEXT DEFAULT (datetime('now')),
  updated_at    TEXT DEFAULT (datetime('now'))
);

CREATE TRIGGER IF NOT EXISTS trg_drafts_updated_at
AFTER UPDATE ON drafts
FOR EACH ROW
BEGIN
  UPDATE drafts SET updated_at = datetime('now') WHERE id = NEW.id;
END;

-- ============================================================
-- FEEDBACK_EVENTS — User edits as training signal
-- ============================================================
CREATE TABLE IF NOT EXISTS feedback_events (
  id                  TEXT PRIMARY KEY,
  draft_id            TEXT NOT NULL REFERENCES drafts(id),
  final_text          TEXT,
  edit_distance       REAL DEFAULT 0,
  edit_classification TEXT CHECK (edit_classification IN ('tone','factual','structural','other')),
  user_rating         INTEGER,
  was_accepted        INTEGER DEFAULT 0,
  was_sent            INTEGER DEFAULT 0,
  created_at          TEXT DEFAULT (datetime('now'))
);

-- ============================================================
-- SPC_METRICS — SPC tracking per channel/mode
-- ============================================================
CREATE TABLE IF NOT EXISTS spc_metrics (
  id                    TEXT PRIMARY KEY,
  channel_type          TEXT NOT NULL,
  response_mode         TEXT NOT NULL,
  acceptance_rate       REAL DEFAULT 0,
  light_edit_rate       REAL DEFAULT 0,
  heavy_edit_rate       REAL DEFAULT 0,
  misclassification_rate REAL DEFAULT 0,
  sample_size           INTEGER DEFAULT 0,
  control_state         TEXT DEFAULT 'monitoring' CHECK (control_state IN ('in_control','warning','out_of_control','monitoring')),
  upper_control_limit   REAL,
  lower_control_limit   REAL,
  mean_value            REAL,
  created_at            TEXT DEFAULT (datetime('now')),
  updated_at            TEXT DEFAULT (datetime('now')),
  UNIQUE(channel_type, response_mode)
);

CREATE TRIGGER IF NOT EXISTS trg_spc_metrics_updated_at
AFTER UPDATE ON spc_metrics
FOR EACH ROW
BEGIN
  UPDATE spc_metrics SET updated_at = datetime('now') WHERE id = NEW.id;
END;

-- ============================================================
-- AUTOMATION_TIERS — Automation level per channel/mode
-- ============================================================
CREATE TABLE IF NOT EXISTS automation_tiers (
  id            TEXT PRIMARY KEY,
  channel_type  TEXT NOT NULL,
  response_mode TEXT NOT NULL,
  current_tier  INTEGER DEFAULT 0 CHECK (current_tier >= 0 AND current_tier <= 3),
  reason        TEXT,
  updated_at    TEXT DEFAULT (datetime('now')),
  UNIQUE(channel_type, response_mode)
);

CREATE TRIGGER IF NOT EXISTS trg_automation_tiers_updated_at
AFTER UPDATE ON automation_tiers
FOR EACH ROW
BEGIN
  UPDATE automation_tiers SET updated_at = datetime('now') WHERE id = NEW.id;
END;

-- ============================================================
-- AI_LOG — AI usage tracking
-- ============================================================
CREATE TABLE IF NOT EXISTS ai_log (
  id            TEXT PRIMARY KEY,
  model_id      TEXT NOT NULL,
  provider      TEXT NOT NULL,
  operation     TEXT NOT NULL CHECK (operation IN ('classify','draft','style_pass','summarize')),
  input_tokens  INTEGER DEFAULT 0,
  output_tokens INTEGER DEFAULT 0,
  cost          REAL DEFAULT 0,
  created_at    TEXT DEFAULT (datetime('now'))
);

-- ============================================================
-- INDEXES
-- ============================================================

-- Messages indexes
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_priority_score ON messages (priority_score DESC);
CREATE INDEX IF NOT EXISTS idx_messages_channel_type ON messages (channel_type);
CREATE INDEX IF NOT EXISTS idx_messages_is_read ON messages (is_read);
CREATE INDEX IF NOT EXISTS idx_messages_is_archived ON messages (is_archived);
CREATE INDEX IF NOT EXISTS idx_messages_account_id ON messages (account_id);

-- Classifications indexes
CREATE INDEX IF NOT EXISTS idx_classifications_message_id ON classifications (message_id);

-- Drafts indexes
CREATE INDEX IF NOT EXISTS idx_drafts_message_id ON drafts (message_id);

-- Feedback events indexes
CREATE INDEX IF NOT EXISTS idx_feedback_events_draft_id ON feedback_events (draft_id);
