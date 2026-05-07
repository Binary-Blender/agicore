-- NovaSyn Academy — Sprint 2: Skills, Assessments, Reading Log

CREATE TABLE academy_skills (
    id TEXT PRIMARY KEY,
    student_id TEXT NOT NULL,
    subject_id TEXT NOT NULL,
    name TEXT NOT NULL,
    proficiency INTEGER DEFAULT 1,
    notes TEXT DEFAULT '',
    times_practiced INTEGER DEFAULT 0,
    last_practiced TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES academy_students(id) ON DELETE CASCADE,
    FOREIGN KEY (subject_id) REFERENCES academy_subjects(id) ON DELETE CASCADE
);

CREATE TABLE academy_assessments (
    id TEXT PRIMARY KEY,
    student_id TEXT NOT NULL,
    subject_id TEXT NOT NULL,
    school_year_id TEXT NOT NULL,
    title TEXT NOT NULL,
    assessment_type TEXT DEFAULT 'quiz',
    questions TEXT DEFAULT '[]',
    answers TEXT DEFAULT '[]',
    total_points INTEGER DEFAULT 0,
    earned_points INTEGER DEFAULT 0,
    score_percent REAL,
    status TEXT DEFAULT 'pending',
    graded_at TEXT,
    notes TEXT DEFAULT '',
    ai_generated INTEGER DEFAULT 0,
    model_used TEXT,
    generation_cost REAL DEFAULT 0,
    lesson_ids TEXT DEFAULT '[]',
    skill_ids TEXT DEFAULT '[]',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES academy_students(id) ON DELETE CASCADE,
    FOREIGN KEY (subject_id) REFERENCES academy_subjects(id) ON DELETE CASCADE,
    FOREIGN KEY (school_year_id) REFERENCES academy_school_years(id) ON DELETE CASCADE
);

CREATE TABLE academy_reading_log (
    id TEXT PRIMARY KEY,
    student_id TEXT NOT NULL,
    school_year_id TEXT NOT NULL,
    title TEXT NOT NULL,
    author TEXT DEFAULT '',
    genre TEXT DEFAULT '',
    total_pages INTEGER,
    pages_read INTEGER DEFAULT 0,
    status TEXT DEFAULT 'reading',
    start_date TEXT,
    finish_date TEXT,
    total_minutes INTEGER DEFAULT 0,
    rating INTEGER,
    review TEXT DEFAULT '',
    notes TEXT DEFAULT '',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES academy_students(id) ON DELETE CASCADE,
    FOREIGN KEY (school_year_id) REFERENCES academy_school_years(id) ON DELETE CASCADE
);

-- Indexes
CREATE INDEX idx_academy_skills_student ON academy_skills(student_id);
CREATE INDEX idx_academy_skills_subject ON academy_skills(subject_id);
CREATE INDEX idx_academy_assessments_student ON academy_assessments(student_id);
CREATE INDEX idx_academy_assessments_subject ON academy_assessments(subject_id);
CREATE INDEX idx_academy_assessments_status ON academy_assessments(status);
CREATE INDEX idx_academy_reading_student ON academy_reading_log(student_id);
CREATE INDEX idx_academy_reading_status ON academy_reading_log(status);
