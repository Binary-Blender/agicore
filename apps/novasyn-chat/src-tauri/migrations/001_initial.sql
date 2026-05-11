-- Agicore Generated Migration
-- App: novasyn_chat
-- Generated: 2026-05-10

PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS workspaces (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  db_path TEXT NOT NULL,
  is_active INTEGER DEFAULT 0,
  user_id TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_workspaces_user_id ON workspaces(user_id);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  user_id TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);

CREATE TABLE IF NOT EXISTS folders (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  parent_id TEXT,
  total_tokens INTEGER DEFAULT 0,
  user_id TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_folders_user_id ON folders(user_id);

CREATE TABLE IF NOT EXISTS folder_items (
  id TEXT PRIMARY KEY,
  content TEXT NOT NULL,
  tokens INTEGER NOT NULL,
  item_type TEXT,
  filename TEXT,
  source_type TEXT,
  folder_id TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (folder_id) REFERENCES folders(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_folder_items_folder_id ON folder_items(folder_id);

CREATE TABLE IF NOT EXISTS tags (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#FCD34D',
  usage_count INTEGER DEFAULT 0,
  user_id TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_tags_user_id ON tags(user_id);

CREATE TABLE IF NOT EXISTS chat_messages (
  id TEXT PRIMARY KEY,
  user_message TEXT NOT NULL,
  ai_message TEXT NOT NULL,
  user_tokens INTEGER NOT NULL,
  ai_tokens INTEGER NOT NULL,
  total_tokens INTEGER NOT NULL,
  model TEXT NOT NULL,
  provider TEXT NOT NULL,
  selected_folders TEXT DEFAULT '[]',
  selected_tags TEXT DEFAULT '[]',
  is_excluded INTEGER DEFAULT 0,
  is_pruned INTEGER DEFAULT 0,
  is_saved INTEGER DEFAULT 0,
  is_archived INTEGER DEFAULT 0,
  exchange_id TEXT,
  system_prompt TEXT,
  context_history_ids TEXT DEFAULT '[]',
  alternatives TEXT,
  babyai_request_id TEXT,
  timestamp TEXT,
  user_id TEXT NOT NULL,
  session_id TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_user_id ON chat_messages(user_id);

CREATE INDEX IF NOT EXISTS idx_chat_messages_session_id ON chat_messages(session_id);

CREATE TABLE IF NOT EXISTS chat_message_tags (
  id TEXT PRIMARY KEY,
  chat_message_id TEXT NOT NULL,
  tag_id TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (chat_message_id) REFERENCES chat_messages(id) ON DELETE CASCADE,
  FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_chat_message_tags_chat_message_id ON chat_message_tags(chat_message_id);

CREATE INDEX IF NOT EXISTS idx_chat_message_tags_tag_id ON chat_message_tags(tag_id);

CREATE TABLE IF NOT EXISTS chat_message_folders (
  id TEXT PRIMARY KEY,
  chat_message_id TEXT NOT NULL,
  folder_id TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (chat_message_id) REFERENCES chat_messages(id) ON DELETE CASCADE,
  FOREIGN KEY (folder_id) REFERENCES folders(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_chat_message_folders_chat_message_id ON chat_message_folders(chat_message_id);

CREATE INDEX IF NOT EXISTS idx_chat_message_folders_folder_id ON chat_message_folders(folder_id);

CREATE TABLE IF NOT EXISTS exchanges (
  id TEXT PRIMARY KEY,
  prompt TEXT NOT NULL,
  response TEXT NOT NULL,
  model TEXT NOT NULL,
  provider TEXT NOT NULL,
  rating INTEGER,
  success INTEGER DEFAULT 1,
  user_id TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_exchanges_user_id ON exchanges(user_id);

CREATE TABLE IF NOT EXISTS exchange_tags (
  id TEXT PRIMARY KEY,
  exchange_id TEXT NOT NULL,
  tag_id TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (exchange_id) REFERENCES exchanges(id) ON DELETE CASCADE,
  FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_exchange_tags_exchange_id ON exchange_tags(exchange_id);

CREATE INDEX IF NOT EXISTS idx_exchange_tags_tag_id ON exchange_tags(tag_id);

CREATE TABLE IF NOT EXISTS documents (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  file_path TEXT NOT NULL,
  language TEXT DEFAULT 'markdown',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS orchestrations (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  steps TEXT DEFAULT '[]',
  is_template INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS orchestration_runs (
  id TEXT PRIMARY KEY,
  status TEXT DEFAULT 'pending',
  current_step_index INTEGER DEFAULT 0,
  step_results TEXT DEFAULT '[]',
  error TEXT,
  started_at TEXT,
  paused_at TEXT,
  completed_at TEXT,
  orchestration_id TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (orchestration_id) REFERENCES orchestrations(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_orchestration_runs_orchestration_id ON orchestration_runs(orchestration_id);

-- SEED: idempotent INSERT OR IGNORE rows from ENTITY SEED blocks
INSERT OR IGNORE INTO users (id, email, name, created_at, updated_at) VALUES ('default-user', 'you@local', 'You', datetime('now'), datetime('now'));