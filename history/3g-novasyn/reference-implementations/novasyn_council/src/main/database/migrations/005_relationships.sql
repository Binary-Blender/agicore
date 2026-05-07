-- Persona Relationships
CREATE TABLE IF NOT EXISTS persona_relationships (
  id TEXT PRIMARY KEY,
  persona_id TEXT NOT NULL REFERENCES personas(id) ON DELETE CASCADE,
  related_persona_id TEXT NOT NULL REFERENCES personas(id) ON DELETE CASCADE,
  relationship_type TEXT NOT NULL DEFAULT 'neutral',
  description TEXT NOT NULL DEFAULT '',
  dynamic TEXT,
  strength REAL NOT NULL DEFAULT 0.5,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_relationships_persona ON persona_relationships(persona_id);
CREATE INDEX IF NOT EXISTS idx_relationships_related ON persona_relationships(related_persona_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_relationships_pair ON persona_relationships(persona_id, related_persona_id);
