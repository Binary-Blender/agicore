CREATE TABLE IF NOT EXISTS writer_discovery_sessions (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  chapter_id TEXT REFERENCES chapters(id) ON DELETE SET NULL,
  started_at TEXT NOT NULL,
  ended_at TEXT,
  suggestions_generated INTEGER DEFAULT 0,
  suggestions_accepted INTEGER DEFAULT 0,
  follow_thread TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_discovery_project ON writer_discovery_sessions(project_id, started_at DESC);

CREATE TABLE IF NOT EXISTS writer_discovery_suggestions (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES writer_discovery_sessions(id) ON DELETE CASCADE,
  suggestion_text TEXT NOT NULL,
  suggestion_type TEXT NOT NULL DEFAULT 'what_if',
  accepted INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_discovery_suggestions ON writer_discovery_suggestions(session_id, created_at DESC);
