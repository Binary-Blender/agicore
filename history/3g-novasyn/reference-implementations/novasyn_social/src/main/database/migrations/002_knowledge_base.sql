-- NovaSyn Social: Knowledge Base Schema
-- Migration 002 — KB entries for RAG-powered draft generation

-- ============================================================
-- KB_ENTRIES — Style examples, opinions, gold standard replies
-- ============================================================
CREATE TABLE IF NOT EXISTS kb_entries (
  id            TEXT PRIMARY KEY,
  entry_type    TEXT NOT NULL CHECK (entry_type IN ('style_example','opinion','gold_reply','persona_note','topic_brief')),
  title         TEXT NOT NULL,
  content       TEXT NOT NULL,
  channel_type  TEXT,
  response_mode TEXT,
  tags          TEXT, -- JSON array of strings
  embedding     TEXT, -- JSON array of floats (1536-dim for OpenAI, variable for others)
  source        TEXT DEFAULT 'manual' CHECK (source IN ('manual','accepted_draft','imported')),
  source_id     TEXT, -- draft_id or message_id if auto-ingested
  is_active     INTEGER DEFAULT 1,
  created_at    TEXT DEFAULT (datetime('now')),
  updated_at    TEXT DEFAULT (datetime('now'))
);

CREATE TRIGGER IF NOT EXISTS trg_kb_entries_updated_at
AFTER UPDATE ON kb_entries
FOR EACH ROW
BEGIN
  UPDATE kb_entries SET updated_at = datetime('now') WHERE id = NEW.id;
END;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_kb_entries_type ON kb_entries (entry_type);
CREATE INDEX IF NOT EXISTS idx_kb_entries_channel ON kb_entries (channel_type);
CREATE INDEX IF NOT EXISTS idx_kb_entries_mode ON kb_entries (response_mode);
CREATE INDEX IF NOT EXISTS idx_kb_entries_active ON kb_entries (is_active);
CREATE INDEX IF NOT EXISTS idx_kb_entries_source ON kb_entries (source);
