-- Gen-X Simulator core schema. Generated from gen_x_simulator.agi ENTITY declarations.

CREATE TABLE IF NOT EXISTS profiles (
  id TEXT PRIMARY KEY,
  handle TEXT NOT NULL UNIQUE,
  current_platform TEXT,
  total_play_time_seconds INTEGER NOT NULL DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS platforms (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  release_year INTEGER NOT NULL,
  cultural_lineage TEXT NOT NULL,
  is_implemented INTEGER NOT NULL DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS attempts (
  id TEXT PRIMARY KEY,
  profile_id TEXT NOT NULL,
  lesson_id TEXT NOT NULL,
  typed_program TEXT NOT NULL,
  outcome TEXT NOT NULL CHECK (outcome IN ('syntax_error','runtime_error','wrong_output','success','abandoned')),
  error_message TEXT,
  output TEXT,
  duration_seconds INTEGER NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS skill_states (
  id TEXT PRIMARY KEY,
  profile_id TEXT NOT NULL,
  platform TEXT NOT NULL,
  lessons_completed INTEGER NOT NULL DEFAULT 0,
  total_attempts INTEGER NOT NULL DEFAULT 0,
  total_syntax_errors INTEGER NOT NULL DEFAULT 0,
  defects_found INTEGER NOT NULL DEFAULT 0,
  hints_consulted INTEGER NOT NULL DEFAULT 0,
  current_streak INTEGER NOT NULL DEFAULT 0,
  scores TEXT NOT NULL DEFAULT '{}',
  completed_lesson_ids TEXT NOT NULL DEFAULT '[]',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  UNIQUE(profile_id, platform),
  FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_attempts_profile ON attempts(profile_id);
CREATE INDEX IF NOT EXISTS idx_attempts_lesson ON attempts(lesson_id);
CREATE INDEX IF NOT EXISTS idx_skill_states_profile ON skill_states(profile_id);

-- Seed the four platform rows (one row per declared MODULE).
INSERT OR IGNORE INTO platforms (id, name, display_name, release_year, cultural_lineage, is_implemented) VALUES
  ('p-c64',     'Commodore64', 'Commodore 64', 1982, 'Blue-collar polyglot: BASIC + assembly + gaming.', 1),
  ('p-apple2',  'AppleII',     'Apple ][',     1977, 'Structured thinking: Pascal + LOGO + education.', 0),
  ('p-ibm-pc',  'IBMPc',       'IBM PC',       1981, 'Serious-business pragmatist.', 0),
  ('p-atari',   'Atari800',    'Atari 800',    1979, 'Audiovisual hacker: demoscene + arcade + sound.', 0);
