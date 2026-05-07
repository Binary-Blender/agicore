-- Timeline Events
CREATE TABLE IF NOT EXISTS writer_timeline_events (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  chapter_id TEXT REFERENCES chapters(id) ON DELETE SET NULL,
  character_ids TEXT NOT NULL DEFAULT '[]',
  event_date TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  color TEXT NOT NULL DEFAULT '#6366f1',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_timeline_project ON writer_timeline_events(project_id);

-- Chapter Targets (word count targets per chapter)
CREATE TABLE IF NOT EXISTS writer_chapter_targets (
  id TEXT PRIMARY KEY,
  chapter_id TEXT NOT NULL UNIQUE REFERENCES chapters(id) ON DELETE CASCADE,
  target_words INTEGER NOT NULL DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_chapter_targets_chapter ON writer_chapter_targets(chapter_id);
