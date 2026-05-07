-- NovaSyn Academy — Sprint 5: Compliance, Portfolio, Reports

-- State compliance requirements (reference data)
CREATE TABLE academy_compliance (
    id TEXT PRIMARY KEY,
    state TEXT NOT NULL,
    requirement_type TEXT NOT NULL,       -- 'notification','testing','subjects','attendance','records','teacher_qual'
    description TEXT NOT NULL,
    is_required INTEGER NOT NULL DEFAULT 1,
    details TEXT DEFAULT '{}',            -- JSON: specific requirements/thresholds
    source_url TEXT DEFAULT '',
    last_verified TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Per-student compliance status tracking
CREATE TABLE academy_compliance_status (
    id TEXT PRIMARY KEY,
    student_id TEXT NOT NULL,
    school_year_id TEXT NOT NULL,
    compliance_id TEXT NOT NULL,
    status TEXT DEFAULT 'not_started',    -- 'not_started','in_progress','completed','not_applicable'
    completion_date TEXT,
    notes TEXT DEFAULT '',
    documentation_path TEXT DEFAULT '',   -- path to uploaded proof
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES academy_students(id) ON DELETE CASCADE,
    FOREIGN KEY (school_year_id) REFERENCES academy_school_years(id) ON DELETE CASCADE,
    FOREIGN KEY (compliance_id) REFERENCES academy_compliance(id) ON DELETE CASCADE,
    UNIQUE(student_id, school_year_id, compliance_id)
);

-- Portfolio items (work samples, photos, artifacts)
CREATE TABLE academy_portfolio (
    id TEXT PRIMARY KEY,
    student_id TEXT NOT NULL,
    school_year_id TEXT NOT NULL,
    subject_id TEXT,
    lesson_id TEXT,
    assessment_id TEXT,
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    item_type TEXT NOT NULL,              -- 'writing_sample','artwork','project_photo','test_result','certificate','book_report','other'
    file_path TEXT DEFAULT '',            -- path to attached file
    content TEXT DEFAULT '',              -- inline text content (for writing samples, etc.)
    tags TEXT DEFAULT '[]',              -- JSON array of strings
    notes TEXT DEFAULT '',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES academy_students(id) ON DELETE CASCADE,
    FOREIGN KEY (school_year_id) REFERENCES academy_school_years(id) ON DELETE CASCADE,
    FOREIGN KEY (subject_id) REFERENCES academy_subjects(id) ON DELETE SET NULL,
    FOREIGN KEY (lesson_id) REFERENCES academy_lessons(id) ON DELETE SET NULL,
    FOREIGN KEY (assessment_id) REFERENCES academy_assessments(id) ON DELETE SET NULL
);

-- Indexes
CREATE INDEX idx_academy_compliance_state ON academy_compliance(state);
CREATE INDEX idx_academy_compliance_type ON academy_compliance(requirement_type);
CREATE INDEX idx_academy_compliance_status_student ON academy_compliance_status(student_id);
CREATE INDEX idx_academy_compliance_status_year ON academy_compliance_status(school_year_id);
CREATE INDEX idx_academy_portfolio_student ON academy_portfolio(student_id);
CREATE INDEX idx_academy_portfolio_year ON academy_portfolio(school_year_id);
CREATE INDEX idx_academy_portfolio_type ON academy_portfolio(item_type);
