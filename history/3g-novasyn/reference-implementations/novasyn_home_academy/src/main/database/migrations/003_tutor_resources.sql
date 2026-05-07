-- NovaSyn Academy — Sprint 3: AI Tutor, Resources, PDF Export

CREATE TABLE academy_tutor_sessions (
    id TEXT PRIMARY KEY,
    student_id TEXT NOT NULL,
    subject_id TEXT,
    school_year_id TEXT NOT NULL,
    topic TEXT NOT NULL,
    mode TEXT DEFAULT 'guided',
    status TEXT DEFAULT 'active',
    total_messages INTEGER DEFAULT 0,
    student_messages INTEGER DEFAULT 0,
    questions_asked INTEGER DEFAULT 0,
    correct_answers INTEGER DEFAULT 0,
    safety_alerts INTEGER DEFAULT 0,
    content_flags INTEGER DEFAULT 0,
    redirections INTEGER DEFAULT 0,
    duration_seconds INTEGER DEFAULT 0,
    ai_summary TEXT DEFAULT '',
    model_used TEXT,
    total_cost REAL DEFAULT 0,
    started_at TEXT DEFAULT CURRENT_TIMESTAMP,
    ended_at TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES academy_students(id) ON DELETE CASCADE,
    FOREIGN KEY (subject_id) REFERENCES academy_subjects(id) ON DELETE SET NULL,
    FOREIGN KEY (school_year_id) REFERENCES academy_school_years(id) ON DELETE CASCADE
);

CREATE TABLE academy_tutor_messages (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    filtered INTEGER DEFAULT 0,
    filter_reason TEXT,
    tokens_in INTEGER DEFAULT 0,
    tokens_out INTEGER DEFAULT 0,
    cost REAL DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES academy_tutor_sessions(id) ON DELETE CASCADE
);

CREATE TABLE academy_resources (
    id TEXT PRIMARY KEY,
    student_id TEXT NOT NULL,
    subject_id TEXT,
    school_year_id TEXT NOT NULL,
    title TEXT NOT NULL,
    resource_type TEXT NOT NULL,
    topic TEXT DEFAULT '',
    difficulty TEXT DEFAULT 'medium',
    content TEXT DEFAULT '',
    answer_key TEXT DEFAULT '',
    ai_generated INTEGER DEFAULT 0,
    model_used TEXT,
    generation_cost REAL DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES academy_students(id) ON DELETE CASCADE,
    FOREIGN KEY (subject_id) REFERENCES academy_subjects(id) ON DELETE SET NULL,
    FOREIGN KEY (school_year_id) REFERENCES academy_school_years(id) ON DELETE CASCADE
);

-- Indexes
CREATE INDEX idx_academy_tutor_sessions_student ON academy_tutor_sessions(student_id);
CREATE INDEX idx_academy_tutor_sessions_status ON academy_tutor_sessions(status);
CREATE INDEX idx_academy_tutor_messages_session ON academy_tutor_messages(session_id);
CREATE INDEX idx_academy_resources_student ON academy_resources(student_id);
CREATE INDEX idx_academy_resources_type ON academy_resources(resource_type);
