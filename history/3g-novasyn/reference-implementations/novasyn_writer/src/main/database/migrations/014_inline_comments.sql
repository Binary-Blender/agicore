CREATE TABLE IF NOT EXISTS writer_comments (
  id TEXT PRIMARY KEY,
  chapter_id TEXT NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
  from_pos INTEGER NOT NULL,
  to_pos INTEGER NOT NULL,
  text TEXT NOT NULL DEFAULT '',
  author TEXT NOT NULL DEFAULT 'Author',
  resolved INTEGER NOT NULL DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_comments_chapter ON writer_comments(chapter_id);
