-- Character relationships for the relationship map
CREATE TABLE IF NOT EXISTS writer_character_relationships (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  character_a_id TEXT NOT NULL,
  character_b_id TEXT NOT NULL,
  relationship_type TEXT NOT NULL DEFAULT 'knows',
  description TEXT NOT NULL DEFAULT '',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_relationships_project ON writer_character_relationships(project_id);
