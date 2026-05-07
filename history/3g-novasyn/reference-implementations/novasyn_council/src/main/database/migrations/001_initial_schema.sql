-- NovaSyn Council — Initial Schema
-- Personas, Skill Docs, Memories, Settings

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT
);

CREATE TABLE IF NOT EXISTS personas (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  department TEXT,
  avatar_emoji TEXT DEFAULT '👤',
  bio TEXT,
  model TEXT NOT NULL,
  fallback_model TEXT,
  temperature REAL DEFAULT 0.7,
  system_prompt TEXT NOT NULL,
  behavior_rules TEXT DEFAULT '[]',
  communication_style TEXT,
  total_conversations INTEGER DEFAULT 0,
  total_tokens_used INTEGER DEFAULT 0,
  total_cost REAL DEFAULT 0,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS persona_skill_docs (
  id TEXT PRIMARY KEY,
  persona_id TEXT REFERENCES personas(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT DEFAULT 'domain',
  loading_rule TEXT DEFAULT 'available',
  token_count INTEGER DEFAULT 0,
  relevance_tags TEXT DEFAULT '[]',
  source TEXT DEFAULT 'manual',
  times_referenced INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_skill_docs_persona ON persona_skill_docs(persona_id);
CREATE INDEX IF NOT EXISTS idx_skill_docs_loading ON persona_skill_docs(loading_rule);

CREATE TABLE IF NOT EXISTS persona_memories (
  id TEXT PRIMARY KEY,
  persona_id TEXT REFERENCES personas(id) ON DELETE CASCADE,
  memory_type TEXT NOT NULL DEFAULT 'fact',
  content TEXT NOT NULL,
  source_meeting_id TEXT,
  source_conversation_id TEXT,
  importance REAL DEFAULT 0.5,
  relevance_tags TEXT DEFAULT '[]',
  times_referenced INTEGER DEFAULT 0,
  superseded_by TEXT,
  applies_to TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_memories_persona ON persona_memories(persona_id);
CREATE INDEX IF NOT EXISTS idx_memories_type ON persona_memories(memory_type);
CREATE INDEX IF NOT EXISTS idx_memories_importance ON persona_memories(importance);
