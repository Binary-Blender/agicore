-- Orchestration system: user-buildable top-to-bottom workflow sequences

CREATE TABLE IF NOT EXISTS orchestrations (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  steps TEXT NOT NULL DEFAULT '[]',
  is_template INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS orchestration_runs (
  id TEXT PRIMARY KEY,
  orchestration_id TEXT NOT NULL REFERENCES orchestrations(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending',
  current_step_index INTEGER DEFAULT 0,
  step_results TEXT NOT NULL DEFAULT '[]',
  error TEXT,
  started_at TEXT DEFAULT CURRENT_TIMESTAMP,
  paused_at TEXT,
  completed_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_orch_runs_orch ON orchestration_runs(orchestration_id);
CREATE INDEX IF NOT EXISTS idx_orch_runs_status ON orchestration_runs(status);
