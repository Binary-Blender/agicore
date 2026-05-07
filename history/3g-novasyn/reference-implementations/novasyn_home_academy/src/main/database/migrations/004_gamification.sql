-- NovaSyn Academy — Sprint 4: Gamification & Multi-Child Scheduling

CREATE TABLE academy_gamification_settings (
    id TEXT PRIMARY KEY,
    student_id TEXT NOT NULL UNIQUE,
    enabled INTEGER NOT NULL DEFAULT 1,
    theme TEXT DEFAULT 'medieval_quest',

    -- XP reward amounts
    xp_complete_lesson INTEGER DEFAULT 15,
    xp_assessment_pass INTEGER DEFAULT 25,
    xp_assessment_perfect INTEGER DEFAULT 50,
    xp_complete_daily INTEGER DEFAULT 30,
    xp_reading_session INTEGER DEFAULT 10,
    xp_streak_day INTEGER DEFAULT 5,
    xp_bonus_challenge INTEGER DEFAULT 50,
    xp_help_sibling INTEGER DEFAULT 20,

    -- Display options
    show_xp_numbers INTEGER DEFAULT 1,
    show_skill_tree INTEGER DEFAULT 1,
    show_streak INTEGER DEFAULT 1,
    show_badges INTEGER DEFAULT 1,

    -- Badge toggles
    badges_math INTEGER DEFAULT 1,
    badges_reading INTEGER DEFAULT 1,
    badges_streak INTEGER DEFAULT 1,
    badges_subject INTEGER DEFAULT 1,
    badges_special INTEGER DEFAULT 1,

    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES academy_students(id) ON DELETE CASCADE
);

CREATE TABLE academy_xp_log (
    id TEXT PRIMARY KEY,
    student_id TEXT NOT NULL,
    amount INTEGER NOT NULL,
    reason TEXT NOT NULL,
    category TEXT DEFAULT 'general',
    metadata TEXT DEFAULT '{}',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES academy_students(id) ON DELETE CASCADE
);

CREATE TABLE academy_badges_earned (
    id TEXT PRIMARY KEY,
    student_id TEXT NOT NULL,
    badge_id TEXT NOT NULL,
    badge_name TEXT NOT NULL,
    badge_icon TEXT NOT NULL,
    badge_description TEXT DEFAULT '',
    badge_category TEXT DEFAULT 'general',
    earned_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES academy_students(id) ON DELETE CASCADE,
    UNIQUE(student_id, badge_id)
);

CREATE TABLE academy_streaks (
    id TEXT PRIMARY KEY,
    student_id TEXT NOT NULL UNIQUE,
    current_streak INTEGER DEFAULT 0,
    longest_streak INTEGER DEFAULT 0,
    last_school_date TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES academy_students(id) ON DELETE CASCADE
);

CREATE TABLE academy_goals (
    id TEXT PRIMARY KEY,
    student_id TEXT NOT NULL,
    title TEXT NOT NULL,
    goal_type TEXT DEFAULT 'weekly',
    target_xp INTEGER NOT NULL,
    earned_xp INTEGER DEFAULT 0,
    reward_text TEXT DEFAULT '',
    status TEXT DEFAULT 'active',
    start_date TEXT NOT NULL,
    end_date TEXT NOT NULL,
    completed_at TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES academy_students(id) ON DELETE CASCADE
);

-- Indexes
CREATE INDEX idx_academy_xp_log_student ON academy_xp_log(student_id);
CREATE INDEX idx_academy_xp_log_date ON academy_xp_log(created_at);
CREATE INDEX idx_academy_xp_log_category ON academy_xp_log(category);
CREATE INDEX idx_academy_badges_student ON academy_badges_earned(student_id);
CREATE INDEX idx_academy_goals_student ON academy_goals(student_id);
CREATE INDEX idx_academy_goals_status ON academy_goals(status);
