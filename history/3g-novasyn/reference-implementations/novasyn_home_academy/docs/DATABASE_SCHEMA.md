# NovaSyn Academy — Database Schema

**Database file**: `%APPDATA%/NovaSyn/academy.db`
**Engine**: better-sqlite3 with WAL mode and foreign keys enforced

---

## Sprint 1 Tables

### `academy_students`
The core entity. Each child in the family is a student.

```sql
CREATE TABLE academy_students (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    birth_date TEXT,                    -- YYYY-MM-DD
    grade_level TEXT,                   -- 'K', '1st', '2nd', ..., '12th'
    state TEXT,                         -- US state for compliance
    avatar_emoji TEXT DEFAULT '🎓',
    interests TEXT DEFAULT '[]',        -- JSON array of strings
    learning_style TEXT DEFAULT '{}',   -- JSON: { visual: 0.8, auditory: 0.5, kinesthetic: 0.7 }
    strengths TEXT DEFAULT '[]',        -- JSON array of strings
    struggles TEXT DEFAULT '[]',        -- JSON array of strings
    notes TEXT DEFAULT '',              -- Parent freeform notes
    teaching_philosophy TEXT DEFAULT 'eclectic', -- 'traditional','charlotte_mason','classical','unit_study','montessori','unschooling','eclectic'
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);
```

### `academy_school_years`
Academic year tracking per student.

```sql
CREATE TABLE academy_school_years (
    id TEXT PRIMARY KEY,
    student_id TEXT NOT NULL,
    name TEXT NOT NULL,                 -- '2025-2026'
    start_date TEXT NOT NULL,           -- YYYY-MM-DD
    end_date TEXT NOT NULL,             -- YYYY-MM-DD
    target_school_days INTEGER DEFAULT 180,
    actual_school_days INTEGER DEFAULT 0,
    is_current INTEGER NOT NULL DEFAULT 1,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES academy_students(id) ON DELETE CASCADE
);
```

### `academy_subjects`
Subjects per student per school year.

```sql
CREATE TABLE academy_subjects (
    id TEXT PRIMARY KEY,
    student_id TEXT NOT NULL,
    school_year_id TEXT NOT NULL,
    name TEXT NOT NULL,                 -- 'Math', 'Reading', 'Science', etc.
    color TEXT DEFAULT '#4c6ef5',       -- Hex color for UI badges
    target_hours_per_week REAL DEFAULT 5.0,
    actual_hours REAL DEFAULT 0,
    philosophy TEXT,                    -- Override per-subject: 'traditional', 'charlotte_mason', etc.
    notes TEXT DEFAULT '',
    sort_order INTEGER DEFAULT 0,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES academy_students(id) ON DELETE CASCADE,
    FOREIGN KEY (school_year_id) REFERENCES academy_school_years(id) ON DELETE CASCADE
);
```

### `academy_lessons`
Individual lesson plans. Can be AI-generated or manually created.

```sql
CREATE TABLE academy_lessons (
    id TEXT PRIMARY KEY,
    student_id TEXT NOT NULL,
    subject_id TEXT NOT NULL,
    school_year_id TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    scheduled_date TEXT,                -- YYYY-MM-DD
    estimated_minutes INTEGER DEFAULT 30,
    actual_minutes INTEGER,
    lesson_content TEXT DEFAULT '',     -- Full lesson plan text/JSON
    materials_needed TEXT DEFAULT '[]', -- JSON array of strings
    objectives TEXT DEFAULT '[]',       -- JSON array of strings
    status TEXT DEFAULT 'planned',      -- 'planned','in_progress','completed','skipped'
    completion_notes TEXT DEFAULT '',   -- Parent notes after completion
    sort_order INTEGER DEFAULT 0,      -- Order within a day
    ai_generated INTEGER DEFAULT 0,
    model_used TEXT,
    generation_cost REAL DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES academy_students(id) ON DELETE CASCADE,
    FOREIGN KEY (subject_id) REFERENCES academy_subjects(id) ON DELETE CASCADE,
    FOREIGN KEY (school_year_id) REFERENCES academy_school_years(id) ON DELETE CASCADE
);
```

### `academy_attendance`
Daily attendance log. Auto-created when lessons are completed.

```sql
CREATE TABLE academy_attendance (
    id TEXT PRIMARY KEY,
    student_id TEXT NOT NULL,
    school_year_id TEXT NOT NULL,
    date TEXT NOT NULL,                 -- YYYY-MM-DD
    status TEXT DEFAULT 'present',      -- 'present','absent','half_day','field_trip','co_op'
    total_minutes INTEGER DEFAULT 0,    -- Total instructional minutes
    subjects_completed TEXT DEFAULT '[]', -- JSON: array of subject names
    notes TEXT DEFAULT '',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES academy_students(id) ON DELETE CASCADE,
    FOREIGN KEY (school_year_id) REFERENCES academy_school_years(id) ON DELETE CASCADE,
    UNIQUE(student_id, date)
);
```

### `academy_ai_log`
Tracks all AI generation calls for cost analysis.

```sql
CREATE TABLE academy_ai_log (
    id TEXT PRIMARY KEY,
    student_id TEXT,
    feature TEXT NOT NULL,              -- 'lesson_plan','weekly_plan','assessment','tutor','resource'
    model_used TEXT NOT NULL,
    tokens_in INTEGER DEFAULT 0,
    tokens_out INTEGER DEFAULT 0,
    cost REAL DEFAULT 0,
    response_time_ms INTEGER DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
```

---

## Indexes

```sql
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
```

---

## Relationships

```
academy_students 1──* academy_school_years
academy_students 1──* academy_subjects
academy_students 1──* academy_lessons
academy_students 1──* academy_attendance
academy_students 1──* academy_skills
academy_students 1──* academy_assessments
academy_students 1──* academy_reading_log
academy_students 1──* academy_tutor_sessions
academy_students 1──* academy_resources
academy_students 1──1 academy_gamification_settings
academy_students 1──* academy_xp_log
academy_students 1──* academy_badges_earned
academy_students 1──1 academy_streaks
academy_students 1──* academy_goals
academy_school_years 1──* academy_subjects
academy_school_years 1──* academy_lessons
academy_school_years 1──* academy_attendance
academy_school_years 1──* academy_assessments
academy_school_years 1──* academy_reading_log
academy_school_years 1──* academy_tutor_sessions
academy_school_years 1──* academy_resources
academy_subjects 1──* academy_lessons
academy_subjects 1──* academy_skills
academy_subjects 1──* academy_assessments
academy_tutor_sessions 1──* academy_tutor_messages
```

---

## Row Mapper Pattern

Each table has a corresponding row mapper in `src/main/index.ts`:

```typescript
function mapStudent(row: any): Student {
  return {
    id: row.id,
    name: row.name,
    birthDate: row.birth_date,
    gradeLevel: row.grade_level,
    state: row.state,
    avatarEmoji: row.avatar_emoji,
    interests: JSON.parse(row.interests || '[]'),
    learningStyle: JSON.parse(row.learning_style || '{}'),
    strengths: JSON.parse(row.strengths || '[]'),
    struggles: JSON.parse(row.struggles || '[]'),
    notes: row.notes,
    teachingPhilosophy: row.teaching_philosophy,
    isActive: !!row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
```

Row mappers exist for: Student, SchoolYear, Subject, Lesson, Attendance, Skill, Assessment, ReadingEntry, TutorSession, TutorMessage, Resource, GamificationSettings, XPLogEntry, BadgeEarned, Goal.

---

## Sprint 2 Tables

Migration: `002_skills_assessments_reading.sql`

### `academy_skills`
Per-student, per-subject skill proficiency tracking.

```sql
CREATE TABLE academy_skills (
    id TEXT PRIMARY KEY,
    student_id TEXT NOT NULL,
    subject_id TEXT NOT NULL,
    name TEXT NOT NULL,
    proficiency INTEGER DEFAULT 1,       -- 1-5 scale
    notes TEXT DEFAULT '',
    times_practiced INTEGER DEFAULT 0,
    last_practiced TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES academy_students(id) ON DELETE CASCADE,
    FOREIGN KEY (subject_id) REFERENCES academy_subjects(id) ON DELETE CASCADE
);
```

### `academy_assessments`
AI-generated or manual quizzes/tests with grading.

```sql
CREATE TABLE academy_assessments (
    id TEXT PRIMARY KEY,
    student_id TEXT NOT NULL,
    subject_id TEXT NOT NULL,
    school_year_id TEXT NOT NULL,
    title TEXT NOT NULL,
    assessment_type TEXT DEFAULT 'quiz',  -- 'quiz','test','exam'
    questions TEXT DEFAULT '[]',          -- JSON array of question objects
    answers TEXT DEFAULT '[]',            -- JSON array of answer objects
    total_points INTEGER DEFAULT 0,
    earned_points INTEGER DEFAULT 0,
    score_percent REAL,
    status TEXT DEFAULT 'pending',        -- 'pending','in_progress','graded'
    graded_at TEXT,
    notes TEXT DEFAULT '',
    ai_generated INTEGER DEFAULT 0,
    model_used TEXT,
    generation_cost REAL DEFAULT 0,
    lesson_ids TEXT DEFAULT '[]',         -- JSON: linked lesson IDs
    skill_ids TEXT DEFAULT '[]',          -- JSON: linked skill IDs
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES academy_students(id) ON DELETE CASCADE,
    FOREIGN KEY (subject_id) REFERENCES academy_subjects(id) ON DELETE CASCADE,
    FOREIGN KEY (school_year_id) REFERENCES academy_school_years(id) ON DELETE CASCADE
);
```

### `academy_reading_log`
Book tracking with pages, time, ratings, and reviews.

```sql
CREATE TABLE academy_reading_log (
    id TEXT PRIMARY KEY,
    student_id TEXT NOT NULL,
    school_year_id TEXT NOT NULL,
    title TEXT NOT NULL,
    author TEXT DEFAULT '',
    genre TEXT DEFAULT '',
    total_pages INTEGER,
    pages_read INTEGER DEFAULT 0,
    status TEXT DEFAULT 'reading',        -- 'reading','completed','abandoned'
    start_date TEXT,
    finish_date TEXT,
    total_minutes INTEGER DEFAULT 0,
    rating INTEGER,                       -- 1-5 stars
    review TEXT DEFAULT '',
    notes TEXT DEFAULT '',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES academy_students(id) ON DELETE CASCADE,
    FOREIGN KEY (school_year_id) REFERENCES academy_school_years(id) ON DELETE CASCADE
);
```

### Sprint 2 Indexes

```sql
CREATE INDEX idx_academy_skills_student ON academy_skills(student_id);
CREATE INDEX idx_academy_skills_subject ON academy_skills(subject_id);
CREATE INDEX idx_academy_assessments_student ON academy_assessments(student_id);
CREATE INDEX idx_academy_assessments_subject ON academy_assessments(subject_id);
CREATE INDEX idx_academy_assessments_status ON academy_assessments(status);
CREATE INDEX idx_academy_reading_student ON academy_reading_log(student_id);
CREATE INDEX idx_academy_reading_status ON academy_reading_log(status);
```

---

## Sprint 3 Tables

Migration: `003_tutor_resources.sql`

### `academy_tutor_sessions`
AI tutor conversation sessions with safety tracking.

```sql
CREATE TABLE academy_tutor_sessions (
    id TEXT PRIMARY KEY,
    student_id TEXT NOT NULL,
    subject_id TEXT,
    school_year_id TEXT NOT NULL,
    topic TEXT NOT NULL,
    mode TEXT DEFAULT 'guided',           -- 'guided','free','review'
    status TEXT DEFAULT 'active',         -- 'active','ended'
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
```

### `academy_tutor_messages`
Individual messages in a tutor session.

```sql
CREATE TABLE academy_tutor_messages (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    role TEXT NOT NULL,                   -- 'student','assistant','system'
    content TEXT NOT NULL,
    filtered INTEGER DEFAULT 0,          -- 1 if safety-filtered
    filter_reason TEXT,                   -- Category of safety flag
    tokens_in INTEGER DEFAULT 0,
    tokens_out INTEGER DEFAULT 0,
    cost REAL DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES academy_tutor_sessions(id) ON DELETE CASCADE
);
```

### `academy_resources`
AI-generated printable resources (worksheets, flashcards, etc).

```sql
CREATE TABLE academy_resources (
    id TEXT PRIMARY KEY,
    student_id TEXT NOT NULL,
    subject_id TEXT,
    school_year_id TEXT NOT NULL,
    title TEXT NOT NULL,
    resource_type TEXT NOT NULL,          -- 'worksheet','flashcards','quiz','coloring','puzzle'
    topic TEXT DEFAULT '',
    difficulty TEXT DEFAULT 'medium',     -- 'easy','medium','hard'
    content TEXT DEFAULT '',              -- HTML/text content
    answer_key TEXT DEFAULT '',           -- Separate answer key content
    ai_generated INTEGER DEFAULT 0,
    model_used TEXT,
    generation_cost REAL DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES academy_students(id) ON DELETE CASCADE,
    FOREIGN KEY (subject_id) REFERENCES academy_subjects(id) ON DELETE SET NULL,
    FOREIGN KEY (school_year_id) REFERENCES academy_school_years(id) ON DELETE CASCADE
);
```

### Sprint 3 Indexes

```sql
CREATE INDEX idx_academy_tutor_sessions_student ON academy_tutor_sessions(student_id);
CREATE INDEX idx_academy_tutor_sessions_status ON academy_tutor_sessions(status);
CREATE INDEX idx_academy_tutor_messages_session ON academy_tutor_messages(session_id);
CREATE INDEX idx_academy_resources_student ON academy_resources(student_id);
CREATE INDEX idx_academy_resources_type ON academy_resources(resource_type);
```

---

## Sprint 4 Tables

Migration: `004_gamification.sql`

### `academy_gamification_settings`
Per-student gamification configuration. Controls XP amounts, display options, badge toggles, and theme.

```sql
CREATE TABLE academy_gamification_settings (
    id TEXT PRIMARY KEY,
    student_id TEXT NOT NULL UNIQUE,
    enabled INTEGER NOT NULL DEFAULT 1,
    theme TEXT DEFAULT 'medieval_quest',  -- 'medieval_quest','space_explorer','nature_ranger'
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
    -- Badge category toggles
    badges_math INTEGER DEFAULT 1,
    badges_reading INTEGER DEFAULT 1,
    badges_streak INTEGER DEFAULT 1,
    badges_subject INTEGER DEFAULT 1,
    badges_special INTEGER DEFAULT 1,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES academy_students(id) ON DELETE CASCADE
);
```

### `academy_xp_log`
Tracks every XP award event.

```sql
CREATE TABLE academy_xp_log (
    id TEXT PRIMARY KEY,
    student_id TEXT NOT NULL,
    amount INTEGER NOT NULL,
    reason TEXT NOT NULL,                 -- Human-readable description
    category TEXT DEFAULT 'general',      -- 'lesson','assessment','reading','streak','bonus','general'
    metadata TEXT DEFAULT '{}',           -- JSON for extra context
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES academy_students(id) ON DELETE CASCADE
);
```

### `academy_badges_earned`
Unlocked badges per student.

```sql
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
```

### `academy_streaks`
Daily learning streak tracking per student.

```sql
CREATE TABLE academy_streaks (
    id TEXT PRIMARY KEY,
    student_id TEXT NOT NULL UNIQUE,
    current_streak INTEGER DEFAULT 0,
    longest_streak INTEGER DEFAULT 0,
    last_school_date TEXT,               -- Last date a lesson was completed
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES academy_students(id) ON DELETE CASCADE
);
```

### `academy_goals`
XP-based goals with reward text.

```sql
CREATE TABLE academy_goals (
    id TEXT PRIMARY KEY,
    student_id TEXT NOT NULL,
    title TEXT NOT NULL,
    goal_type TEXT DEFAULT 'weekly',      -- 'weekly','monthly','custom'
    target_xp INTEGER NOT NULL,
    earned_xp INTEGER DEFAULT 0,
    reward_text TEXT DEFAULT '',           -- Parent-defined reward
    status TEXT DEFAULT 'active',         -- 'active','completed','expired'
    start_date TEXT NOT NULL,
    end_date TEXT NOT NULL,
    completed_at TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES academy_students(id) ON DELETE CASCADE
);
```

### Sprint 4 Indexes

```sql
CREATE INDEX idx_academy_xp_log_student ON academy_xp_log(student_id);
CREATE INDEX idx_academy_xp_log_date ON academy_xp_log(created_at);
CREATE INDEX idx_academy_xp_log_category ON academy_xp_log(category);
CREATE INDEX idx_academy_badges_student ON academy_badges_earned(student_id);
CREATE INDEX idx_academy_goals_student ON academy_goals(student_id);
CREATE INDEX idx_academy_goals_status ON academy_goals(status);
```

---

## Future Sprint Tables (Not Built Yet)

| Sprint | Tables |
|--------|--------|
| Sprint 5 | `academy_compliance`, `academy_compliance_status`, `academy_portfolio` |
