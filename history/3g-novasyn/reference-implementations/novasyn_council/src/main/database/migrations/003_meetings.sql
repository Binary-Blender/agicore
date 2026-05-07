-- NovaSyn Council — Meetings
-- Multi-persona meeting sessions

CREATE TABLE IF NOT EXISTS meetings (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL DEFAULT 'New Meeting',
  meeting_type TEXT NOT NULL DEFAULT 'brainstorm',
  agenda TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  total_tokens INTEGER DEFAULT 0,
  total_cost REAL DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS meeting_participants (
  id TEXT PRIMARY KEY,
  meeting_id TEXT NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  persona_id TEXT NOT NULL REFERENCES personas(id) ON DELETE CASCADE,
  role_in_meeting TEXT,
  join_order INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_meeting_parts_meeting ON meeting_participants(meeting_id);
CREATE INDEX IF NOT EXISTS idx_meeting_parts_persona ON meeting_participants(persona_id);

CREATE TABLE IF NOT EXISTS meeting_messages (
  id TEXT PRIMARY KEY,
  meeting_id TEXT NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  sender_type TEXT NOT NULL,
  sender_persona_id TEXT REFERENCES personas(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  model_used TEXT,
  tokens_in INTEGER,
  tokens_out INTEGER,
  cost REAL,
  response_time_ms INTEGER,
  skill_docs_loaded TEXT DEFAULT '[]',
  memories_loaded TEXT DEFAULT '[]',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_meeting_msgs_meeting ON meeting_messages(meeting_id);
