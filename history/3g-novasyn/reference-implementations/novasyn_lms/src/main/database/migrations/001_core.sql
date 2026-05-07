-- NovaSyn LMS Core Schema
-- Music Video Compliance Training

-- Training Modules (the core content unit)
CREATE TABLE IF NOT EXISTS training_modules (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT,
  difficulty_level TEXT DEFAULT 'beginner',
  estimated_duration_minutes INTEGER,
  is_active INTEGER DEFAULT 1,
  policy_document_path TEXT,
  policy_document_filename TEXT,
  policy_summary_text TEXT,
  emphasis_prompt TEXT,
  ai_song_lyrics TEXT,
  ai_overlay_texts TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Videos (uploaded files or YouTube links)
CREATE TABLE IF NOT EXISTS videos (
  id TEXT PRIMARY KEY,
  training_module_id TEXT REFERENCES training_modules(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  file_path TEXT,
  youtube_url TEXT,
  duration_seconds INTEGER,
  genre TEXT,
  is_primary INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_videos_module ON videos(training_module_id);

-- Users (employees taking training)
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT,
  department TEXT,
  role TEXT DEFAULT 'employee',
  preferred_genre TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Quizzes
CREATE TABLE IF NOT EXISTS quizzes (
  id TEXT PRIMARY KEY,
  training_module_id TEXT REFERENCES training_modules(id) ON DELETE CASCADE,
  passing_score REAL DEFAULT 80,
  questions TEXT NOT NULL DEFAULT '[]',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_quizzes_module ON quizzes(training_module_id);

-- Watch Sessions
CREATE TABLE IF NOT EXISTS watch_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  video_id TEXT NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  watch_percentage REAL DEFAULT 0,
  started_at TEXT DEFAULT CURRENT_TIMESTAMP,
  completed_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_watch_sessions_user ON watch_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_watch_sessions_video ON watch_sessions(video_id);

-- Quiz Attempts
CREATE TABLE IF NOT EXISTS quiz_attempts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  quiz_id TEXT NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  score REAL,
  passed INTEGER DEFAULT 0,
  attempt_number INTEGER DEFAULT 1,
  answers TEXT DEFAULT '{}',
  completed_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_quiz_attempts_user ON quiz_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_quiz ON quiz_attempts(quiz_id);

-- Progress (per user per module)
CREATE TABLE IF NOT EXISTS progress (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  training_module_id TEXT NOT NULL REFERENCES training_modules(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'not_started',
  watch_count INTEGER DEFAULT 0,
  quiz_attempt_count INTEGER DEFAULT 0,
  best_score REAL DEFAULT 0,
  completed_at TEXT,
  last_activity TEXT DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, training_module_id)
);

CREATE INDEX IF NOT EXISTS idx_progress_user ON progress(user_id);
CREATE INDEX IF NOT EXISTS idx_progress_module ON progress(training_module_id);

-- Playlists (learning paths)
CREATE TABLE IF NOT EXISTS playlists (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  is_required INTEGER DEFAULT 0,
  auto_play INTEGER DEFAULT 1,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS playlist_items (
  id TEXT PRIMARY KEY,
  playlist_id TEXT NOT NULL REFERENCES playlists(id) ON DELETE CASCADE,
  training_module_id TEXT NOT NULL REFERENCES training_modules(id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  require_completion INTEGER DEFAULT 1,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(playlist_id, position),
  UNIQUE(playlist_id, training_module_id)
);

CREATE INDEX IF NOT EXISTS idx_playlist_items_playlist ON playlist_items(playlist_id);

-- AI Assets (generated audio, images, videos)
CREATE TABLE IF NOT EXISTS ai_assets (
  id TEXT PRIMARY KEY,
  training_module_id TEXT REFERENCES training_modules(id) ON DELETE SET NULL,
  asset_type TEXT DEFAULT 'audio',
  title TEXT,
  description TEXT,
  status TEXT DEFAULT 'pending',
  file_path TEXT,
  metadata TEXT DEFAULT '{}',
  duration_seconds INTEGER,
  style TEXT,
  source TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  approved_at TEXT,
  deleted_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_ai_assets_module ON ai_assets(training_module_id);
CREATE INDEX IF NOT EXISTS idx_ai_assets_status ON ai_assets(status);

-- QC Tasks
CREATE TABLE IF NOT EXISTS qc_tasks (
  id TEXT PRIMARY KEY,
  asset_id TEXT NOT NULL REFERENCES ai_assets(id) ON DELETE CASCADE,
  asset_type TEXT DEFAULT 'audio',
  status TEXT DEFAULT 'pending',
  reviewer TEXT,
  notes TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  completed_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_qc_tasks_status ON qc_tasks(status);

-- Settings
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT
);

-- Audit Log
CREATE TABLE IF NOT EXISTS audit_log (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  action TEXT NOT NULL,
  resource_type TEXT,
  resource_id TEXT,
  metadata TEXT DEFAULT '{}',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_audit_log_user ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_action ON audit_log(action);
