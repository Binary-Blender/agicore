-- AI operation log (tracks every AI prompt/response with accept/reject)

CREATE TABLE IF NOT EXISTS writer_ai_operations (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  chapter_id TEXT,
  operation_type TEXT NOT NULL,
  model TEXT NOT NULL,
  prompt TEXT NOT NULL,
  context_tokens INTEGER DEFAULT 0,
  response TEXT,
  response_tokens INTEGER DEFAULT 0,
  accepted INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ai_ops_project ON writer_ai_operations(project_id, created_at DESC);
