-- Projects managed by Forge
CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  path TEXT NOT NULL,
  package_name TEXT NOT NULL,
  display_name TEXT NOT NULL,
  port INTEGER NOT NULL,
  db_name TEXT NOT NULL,
  app_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);

-- Features being built via the 10-step pipeline
CREATE TABLE IF NOT EXISTS features (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  entity_name TEXT NOT NULL,
  table_name TEXT NOT NULL,
  current_step INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'in_progress',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_features_project ON features(project_id);

-- Generated code for each pipeline step
CREATE TABLE IF NOT EXISTS feature_steps (
  id TEXT PRIMARY KEY,
  feature_id TEXT NOT NULL REFERENCES features(id) ON DELETE CASCADE,
  step_number INTEGER NOT NULL,
  step_name TEXT NOT NULL,
  generated_code TEXT DEFAULT '',
  is_applied INTEGER DEFAULT 0,
  applied_at TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_feature_steps_feature ON feature_steps(feature_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_feature_steps_unique ON feature_steps(feature_id, step_number);

-- AI conversations per project/role
CREATE TABLE IF NOT EXISTS conversations (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  title TEXT DEFAULT 'New Conversation',
  messages TEXT NOT NULL DEFAULT '[]',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_conversations_project ON conversations(project_id);

-- Architectural decisions log
CREATE TABLE IF NOT EXISTS decisions (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  feature_id TEXT REFERENCES features(id) ON DELETE SET NULL,
  summary TEXT NOT NULL,
  reasoning TEXT DEFAULT '',
  source_role TEXT NOT NULL,
  tags TEXT DEFAULT '[]',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_decisions_project ON decisions(project_id);

-- AI usage log
CREATE TABLE IF NOT EXISTS ai_log (
  id TEXT PRIMARY KEY,
  project_id TEXT,
  model_id TEXT NOT NULL,
  provider TEXT NOT NULL,
  operation TEXT NOT NULL,
  input_tokens INTEGER DEFAULT 0,
  output_tokens INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- App settings (key/value)
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- Triggers for updated_at
CREATE TRIGGER IF NOT EXISTS trg_projects_updated AFTER UPDATE ON projects
FOR EACH ROW BEGIN UPDATE projects SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id; END;

CREATE TRIGGER IF NOT EXISTS trg_features_updated AFTER UPDATE ON features
FOR EACH ROW BEGIN UPDATE features SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id; END;

CREATE TRIGGER IF NOT EXISTS trg_feature_steps_updated AFTER UPDATE ON feature_steps
FOR EACH ROW BEGIN UPDATE feature_steps SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id; END;

CREATE TRIGGER IF NOT EXISTS trg_conversations_updated AFTER UPDATE ON conversations
FOR EACH ROW BEGIN UPDATE conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id; END;
