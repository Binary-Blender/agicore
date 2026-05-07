-- Version history for chapters (auto-snapshots + named checkpoints)

CREATE TABLE IF NOT EXISTS writer_versions (
  id TEXT PRIMARY KEY,
  chapter_id TEXT NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  word_count INTEGER DEFAULT 0,
  snapshot_name TEXT,
  source TEXT DEFAULT 'auto',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_versions_chapter ON writer_versions(chapter_id, created_at DESC);
