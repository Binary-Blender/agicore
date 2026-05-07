CREATE TABLE IF NOT EXISTS writer_continuity_plants (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  setup_chapter_id TEXT REFERENCES chapters(id) ON DELETE SET NULL,
  setup_content TEXT NOT NULL DEFAULT '',
  payoff_chapter_id TEXT REFERENCES chapters(id) ON DELETE SET NULL,
  payoff_content TEXT,
  status TEXT NOT NULL DEFAULT 'planned',
  notes TEXT NOT NULL DEFAULT '',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_plants_project ON writer_continuity_plants(project_id);

CREATE TABLE IF NOT EXISTS writer_continuity_threads (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  raised_chapter_id TEXT REFERENCES chapters(id) ON DELETE SET NULL,
  target_chapter_id TEXT REFERENCES chapters(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'open',
  notes TEXT NOT NULL DEFAULT '',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_threads_project ON writer_continuity_threads(project_id);

CREATE TABLE IF NOT EXISTS writer_character_knowledge (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  character_id TEXT NOT NULL REFERENCES encyclopedia_entries(id) ON DELETE CASCADE,
  chapter_id TEXT NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
  knows TEXT NOT NULL DEFAULT '',
  does_not_know TEXT NOT NULL DEFAULT '',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(character_id, chapter_id)
);
CREATE INDEX IF NOT EXISTS idx_knowledge_project ON writer_character_knowledge(project_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_character ON writer_character_knowledge(character_id);
