CREATE TABLE IF NOT EXISTS writer_tracked_changes (
  id TEXT PRIMARY KEY,
  chapter_id TEXT NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
  change_type TEXT NOT NULL DEFAULT 'insertion',
  from_pos INTEGER NOT NULL,
  to_pos INTEGER NOT NULL,
  old_text TEXT NOT NULL DEFAULT '',
  new_text TEXT NOT NULL DEFAULT '',
  author TEXT NOT NULL DEFAULT 'Author',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_tracked_changes_chapter ON writer_tracked_changes(chapter_id);

CREATE TABLE IF NOT EXISTS writer_sprints (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  duration_seconds INTEGER NOT NULL DEFAULT 0,
  target_words INTEGER NOT NULL DEFAULT 0,
  words_written INTEGER NOT NULL DEFAULT 0,
  started_at TEXT DEFAULT CURRENT_TIMESTAMP,
  ended_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_sprints_project ON writer_sprints(project_id);

CREATE TABLE IF NOT EXISTS writer_custom_templates (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  content TEXT NOT NULL DEFAULT '',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
