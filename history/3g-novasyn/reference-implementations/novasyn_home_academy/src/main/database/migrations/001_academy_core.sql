-- NovaSyn Academy — Core Tables (Sprint 1)

CREATE TABLE academy_students (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    birth_date TEXT,
    grade_level TEXT,
    state TEXT,
    avatar_emoji TEXT DEFAULT '🎓',
    interests TEXT DEFAULT '[]',
    learning_style TEXT DEFAULT '{}',
    strengths TEXT DEFAULT '[]',
    struggles TEXT DEFAULT '[]',
    notes TEXT DEFAULT '',
    teaching_philosophy TEXT DEFAULT 'eclectic',
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE academy_school_years (
    id TEXT PRIMARY KEY,
    student_id TEXT NOT NULL,
    name TEXT NOT NULL,
    start_date TEXT NOT NULL,
    end_date TEXT NOT NULL,
    target_school_days INTEGER DEFAULT 180,
    actual_school_days INTEGER DEFAULT 0,
    is_current INTEGER NOT NULL DEFAULT 1,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES academy_students(id) ON DELETE CASCADE
);

CREATE TABLE academy_subjects (
    id TEXT PRIMARY KEY,
    student_id TEXT NOT NULL,
    school_year_id TEXT NOT NULL,
    name TEXT NOT NULL,
    color TEXT DEFAULT '#4c6ef5',
    target_hours_per_week REAL DEFAULT 5.0,
    actual_hours REAL DEFAULT 0,
    philosophy TEXT,
    notes TEXT DEFAULT '',
    sort_order INTEGER DEFAULT 0,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES academy_students(id) ON DELETE CASCADE,
    FOREIGN KEY (school_year_id) REFERENCES academy_school_years(id) ON DELETE CASCADE
);

CREATE TABLE academy_lessons (
    id TEXT PRIMARY KEY,
    student_id TEXT NOT NULL,
    subject_id TEXT NOT NULL,
    school_year_id TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    scheduled_date TEXT,
    estimated_minutes INTEGER DEFAULT 30,
    actual_minutes INTEGER,
    lesson_content TEXT DEFAULT '',
    materials_needed TEXT DEFAULT '[]',
    objectives TEXT DEFAULT '[]',
    status TEXT DEFAULT 'planned',
    completion_notes TEXT DEFAULT '',
    sort_order INTEGER DEFAULT 0,
    ai_generated INTEGER DEFAULT 0,
    model_used TEXT,
    generation_cost REAL DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES academy_students(id) ON DELETE CASCADE,
    FOREIGN KEY (subject_id) REFERENCES academy_subjects(id) ON DELETE CASCADE,
    FOREIGN KEY (school_year_id) REFERENCES academy_school_years(id) ON DELETE CASCADE
);

CREATE TABLE academy_attendance (
    id TEXT PRIMARY KEY,
    student_id TEXT NOT NULL,
    school_year_id TEXT NOT NULL,
    date TEXT NOT NULL,
    status TEXT DEFAULT 'present',
    total_minutes INTEGER DEFAULT 0,
    subjects_completed TEXT DEFAULT '[]',
    notes TEXT DEFAULT '',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES academy_students(id) ON DELETE CASCADE,
    FOREIGN KEY (school_year_id) REFERENCES academy_school_years(id) ON DELETE CASCADE,
    UNIQUE(student_id, date)
);

CREATE TABLE academy_ai_log (
    id TEXT PRIMARY KEY,
    student_id TEXT,
    feature TEXT NOT NULL,
    model_used TEXT NOT NULL,
    tokens_in INTEGER DEFAULT 0,
    tokens_out INTEGER DEFAULT 0,
    cost REAL DEFAULT 0,
    response_time_ms INTEGER DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_academy_students_active ON academy_students(is_active);
CREATE INDEX idx_academy_school_years_student ON academy_school_years(student_id);
CREATE INDEX idx_academy_school_years_current ON academy_school_years(is_current);
CREATE INDEX idx_academy_subjects_student ON academy_subjects(student_id);
CREATE INDEX idx_academy_subjects_year ON academy_subjects(school_year_id);
CREATE INDEX idx_academy_lessons_student ON academy_lessons(student_id);
CREATE INDEX idx_academy_lessons_subject ON academy_lessons(subject_id);
CREATE INDEX idx_academy_lessons_date ON academy_lessons(scheduled_date);
CREATE INDEX idx_academy_lessons_status ON academy_lessons(status);
CREATE INDEX idx_academy_attendance_student ON academy_attendance(student_id);
CREATE INDEX idx_academy_attendance_date ON academy_attendance(date);
CREATE INDEX idx_academy_ai_log_date ON academy_ai_log(created_at);
