CREATE TABLE IF NOT EXISTS writer_sessions (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  started_at TEXT NOT NULL,
  ended_at TEXT,
  duration_seconds INTEGER DEFAULT 0,
  words_added INTEGER DEFAULT 0,
  ai_words_accepted INTEGER DEFAULT 0,
  ai_ops_count INTEGER DEFAULT 0,
  start_word_count INTEGER DEFAULT 0,
  end_word_count INTEGER DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_sessions_project ON writer_sessions(project_id, started_at DESC);

CREATE TABLE IF NOT EXISTS writer_goals (
  id TEXT PRIMARY KEY,
  project_id TEXT,
  goal_type TEXT NOT NULL DEFAULT 'daily',
  target_words INTEGER NOT NULL DEFAULT 500,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  last_met_date TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_goals_project ON writer_goals(project_id);
