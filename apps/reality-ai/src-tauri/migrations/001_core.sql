-- Reality.AI core schema. Generated from reality_ai.agi ENTITY declarations.
-- DO NOT EDIT BY HAND. Edit reality_ai.agi and regenerate.

CREATE TABLE IF NOT EXISTS conversations (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL DEFAULT 'New Conversation',
  message_count INTEGER NOT NULL DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user','assistant')),
  content TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS memories (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL,
  category TEXT NOT NULL,
  content TEXT NOT NULL,
  extracted_topic TEXT NOT NULL DEFAULT '',
  turn_number INTEGER NOT NULL DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS game_states (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL UNIQUE,
  layer INTEGER NOT NULL DEFAULT 1,
  turn_count INTEGER NOT NULL DEFAULT 0,
  turns_in_current_layer INTEGER NOT NULL DEFAULT 0,
  easter_eggs_found TEXT NOT NULL DEFAULT '[]',
  easter_egg_count INTEGER NOT NULL DEFAULT 0,
  active_persona TEXT,
  has_won INTEGER NOT NULL DEFAULT 0,
  win_method TEXT,
  -- Persona state machine + score state, serialized as JSON for now.
  -- A future migration will normalize into per-persona tables once codegen lands.
  persona_state TEXT NOT NULL DEFAULT '{}',
  scores TEXT NOT NULL DEFAULT '{}',
  scored_markers TEXT NOT NULL DEFAULT '{}',
  completed_modules TEXT NOT NULL DEFAULT '[]',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_memories_conversation ON memories(conversation_id);
CREATE INDEX IF NOT EXISTS idx_game_states_conversation ON game_states(conversation_id);
