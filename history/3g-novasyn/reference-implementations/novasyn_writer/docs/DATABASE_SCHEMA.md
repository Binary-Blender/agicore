# NovaSyn Writer — Database Schema

## Current Tables (Phase 1 — Implemented)

### `users`
Single-user mode. Default user `id = 'default'`.

| Column | Type | Notes |
|--------|------|-------|
| id | TEXT PK | `'default'` |
| email | TEXT | |
| name | TEXT | |
| created_at | TEXT | ISO timestamp |

### `projects`
Top-level writing projects.

| Column | Type | Notes |
|--------|------|-------|
| id | TEXT PK | UUID |
| user_id | TEXT FK→users | |
| name | TEXT NOT NULL | |
| description | TEXT | |
| created_at | TEXT | |
| updated_at | TEXT | |

### `chapters`
Chapters within a project. Content stored as TipTap JSON.

| Column | Type | Notes |
|--------|------|-------|
| id | TEXT PK | UUID |
| project_id | TEXT FK→projects | CASCADE delete |
| title | TEXT NOT NULL | |
| sort_order | INTEGER | 0-based |
| content | TEXT | TipTap JSON string. Default: empty doc |
| word_count | INTEGER | Updated on auto-save |
| created_at | TEXT | |
| updated_at | TEXT | |

### `sections`
Sub-sections within chapters. Same content pattern as chapters.

| Column | Type | Notes |
|--------|------|-------|
| id | TEXT PK | UUID |
| chapter_id | TEXT FK→chapters | CASCADE delete |
| title | TEXT NOT NULL | |
| sort_order | INTEGER | 0-based |
| content | TEXT | TipTap JSON string |
| word_count | INTEGER | |
| created_at | TEXT | |
| updated_at | TEXT | |

### `encyclopedia_entries`
World-building reference entries. Used as AI context.

| Column | Type | Notes |
|--------|------|-------|
| id | TEXT PK | UUID |
| project_id | TEXT FK→projects | CASCADE delete |
| name | TEXT NOT NULL | Entry name (e.g. "Elara Nightwhisper") |
| category | TEXT | `Character`, `Location`, `Item`, `Lore`, `Other` |
| content | TEXT | Free-form description |
| tokens | INTEGER | Approximate token count (content.length / 4) |
| created_at | TEXT | |
| updated_at | TEXT | |

### `outlines`
Per-chapter beat outlines. One outline per chapter (UNIQUE constraint).

| Column | Type | Notes |
|--------|------|-------|
| id | TEXT PK | UUID |
| chapter_id | TEXT FK→chapters UNIQUE | CASCADE delete |
| beats | TEXT | JSON array of strings |
| created_at | TEXT | |
| updated_at | TEXT | |

### `writer_versions` (Phase 2 — Implemented, migration 002)
Version history for chapters. Auto-snapshots created on content save (throttled to 5-minute intervals). Manual checkpoints created by user.

| Column | Type | Notes |
|--------|------|-------|
| id | TEXT PK | UUID |
| chapter_id | TEXT FK→chapters | CASCADE delete |
| content | TEXT NOT NULL | Full TipTap JSON snapshot |
| word_count | INTEGER | Default 0 |
| snapshot_name | TEXT | NULL = auto-snapshot, or user-provided name |
| source | TEXT | `'auto'`, `'manual'`, `'ai-operation'`. Default `'auto'` |
| created_at | TEXT | Default CURRENT_TIMESTAMP |

**Indexes**: `idx_versions_chapter` on `(chapter_id, created_at DESC)`

### `writer_ai_operations` (Phase 2 — Implemented, migration 003)
Log of every AI operation performed. Auto-logged by `SEND_PROMPT` handler.

| Column | Type | Notes |
|--------|------|-------|
| id | TEXT PK | UUID |
| project_id | TEXT FK→projects | CASCADE delete |
| chapter_id | TEXT | nullable |
| operation_type | TEXT NOT NULL | `'continue'`, `'expand'`, `'rewrite'`, `'brainstorm'`, `'dialogue'`, `'show'`, `'compress'`, `'tone'`, `'summarize'`, `'scene'`, `'custom'` |
| model | TEXT NOT NULL | Model ID used |
| prompt | TEXT NOT NULL | Full prompt sent |
| context_tokens | INTEGER | Default 0 |
| response | TEXT | Full AI response (nullable during stream) |
| response_tokens | INTEGER | Default 0 |
| accepted | INTEGER | 0 = pending/rejected, 1 = accepted. Default 0 |
| created_at | TEXT | Default CURRENT_TIMESTAMP |

**Indexes**: `idx_ai_ops_project` on `(project_id, created_at DESC)`

### `writer_sessions` (Phase 2 — Implemented, migration 004)
Writing session tracking. Auto-started on project select, auto-ended on 15min idle. Heartbeat updates every 30s.

| Column | Type | Notes |
|--------|------|-------|
| id | TEXT PK | UUID |
| project_id | TEXT FK→projects | CASCADE delete |
| started_at | TEXT NOT NULL | ISO timestamp |
| ended_at | TEXT | NULL while session active |
| duration_seconds | INTEGER | Default 0 |
| words_added | INTEGER | Default 0. `end_word_count - start_word_count` |
| ai_words_accepted | INTEGER | Default 0 |
| ai_ops_count | INTEGER | Default 0 |
| start_word_count | INTEGER | Default 0 |
| end_word_count | INTEGER | Default 0 |

**Indexes**: `idx_sessions_project` on `(project_id, started_at DESC)`

### `writer_goals` (Phase 2 — Implemented, migration 004)
Word count goals with streak tracking.

| Column | Type | Notes |
|--------|------|-------|
| id | TEXT PK | UUID |
| project_id | TEXT FK→projects | CASCADE delete |
| goal_type | TEXT NOT NULL | `'daily'` |
| target_words | INTEGER NOT NULL | |
| current_streak | INTEGER | Default 0 |
| longest_streak | INTEGER | Default 0 |
| last_met_date | TEXT | `YYYY-MM-DD` or NULL |
| created_at | TEXT | Default CURRENT_TIMESTAMP |
| updated_at | TEXT | Default CURRENT_TIMESTAMP |

**Indexes**: `idx_goals_project` on `(project_id, goal_type)`

### `writer_discovery_sessions` (Phase 2 — Implemented, migration 005)
Discovery Writing Mode sessions. One per activation of Discovery Mode.

| Column | Type | Notes |
|--------|------|-------|
| id | TEXT PK | UUID |
| project_id | TEXT FK→projects | CASCADE delete |
| chapter_id | TEXT FK→chapters | SET NULL on delete |
| started_at | TEXT NOT NULL | ISO timestamp |
| ended_at | TEXT | NULL while session active |
| suggestions_generated | INTEGER | Default 0 |
| suggestions_accepted | INTEGER | Default 0 |
| follow_thread | TEXT | User-specified direction, nullable |
| created_at | TEXT | Default CURRENT_TIMESTAMP |

**Indexes**: `idx_discovery_project` on `(project_id, started_at DESC)`

### `writer_discovery_suggestions` (Phase 2 — Implemented, migration 005)
Individual AI-generated "what if" suggestions within a discovery session.

| Column | Type | Notes |
|--------|------|-------|
| id | TEXT PK | UUID |
| session_id | TEXT FK→writer_discovery_sessions | CASCADE delete |
| suggestion_text | TEXT NOT NULL | The "What if..." suggestion |
| suggestion_type | TEXT NOT NULL | Default `'what_if'` |
| accepted | INTEGER | Default 0. 1 = user accepted |
| created_at | TEXT | Default CURRENT_TIMESTAMP |

**Indexes**: `idx_discovery_suggestions` on `(session_id, created_at DESC)`

### `writer_continuity_plants` (Phase 2C — Implemented, migration 006)
Foreshadowing setup→payoff tracking.

| Column | Type | Notes |
|--------|------|-------|
| id | TEXT PK | UUID |
| project_id | TEXT FK→projects | CASCADE delete |
| name | TEXT NOT NULL | Short descriptive name |
| setup_chapter_id | TEXT FK→chapters | SET NULL on delete |
| setup_content | TEXT | Description of the setup |
| payoff_chapter_id | TEXT FK→chapters | SET NULL on delete |
| payoff_content | TEXT | Description of the payoff (nullable) |
| status | TEXT | `'planned'`, `'setup'`, `'resolved'`. Default `'planned'` |
| notes | TEXT | Free-form notes |
| created_at | TEXT | Default CURRENT_TIMESTAMP |
| updated_at | TEXT | Default CURRENT_TIMESTAMP |

**Indexes**: `idx_plants_project` on `(project_id)`

### `writer_continuity_threads` (Phase 2C — Implemented, migration 006)
Unresolved plot threads and questions.

| Column | Type | Notes |
|--------|------|-------|
| id | TEXT PK | UUID |
| project_id | TEXT FK→projects | CASCADE delete |
| question | TEXT NOT NULL | The thread/question |
| raised_chapter_id | TEXT FK→chapters | SET NULL on delete |
| target_chapter_id | TEXT FK→chapters | SET NULL on delete |
| status | TEXT | `'open'`, `'resolved'`. Default `'open'` |
| notes | TEXT | Free-form notes |
| created_at | TEXT | Default CURRENT_TIMESTAMP |
| updated_at | TEXT | Default CURRENT_TIMESTAMP |

**Indexes**: `idx_threads_project` on `(project_id)`

### `writer_character_knowledge` (Phase 2C — Implemented, migration 006)
Per-chapter tracking of what each character knows or doesn't know.

| Column | Type | Notes |
|--------|------|-------|
| id | TEXT PK | UUID |
| project_id | TEXT FK→projects | CASCADE delete |
| character_id | TEXT NOT NULL | References encyclopedia_entries.id |
| chapter_id | TEXT FK→chapters | CASCADE delete |
| knows | TEXT | What the character knows at this point |
| does_not_know | TEXT | What the character doesn't know |
| created_at | TEXT | Default CURRENT_TIMESTAMP |
| updated_at | TEXT | Default CURRENT_TIMESTAMP |

**Indexes**: `idx_charknow_project` on `(project_id)`, `idx_charknow_character` on `(character_id)`

### `writer_kb` (Phase 2D — Implemented, migration 007)
Knowledge Base entries. Can be project-scoped or global (shared across all projects).

| Column | Type | Notes |
|--------|------|-------|
| id | TEXT PK | UUID |
| project_id | TEXT FK→projects | CASCADE delete. NULL when `is_global = 1` |
| title | TEXT NOT NULL | Entry title |
| category | TEXT NOT NULL | `'Ideas'`, `'Stories'`, `'Frameworks'`, `'Voice Profile'`, `'Research'`. Default `'Ideas'` |
| content | TEXT NOT NULL | Free-form content. Default `''` |
| tokens | INTEGER NOT NULL | Approximate token count (`Math.ceil(content.length / 4)`). Default 0 |
| is_global | INTEGER NOT NULL | 0 = project-scoped, 1 = global. Default 0 |
| created_at | TEXT | Default CURRENT_TIMESTAMP |
| updated_at | TEXT | Default CURRENT_TIMESTAMP |

**Indexes**: `idx_kb_project` on `(project_id)`, `idx_kb_global` on `(is_global)`

### AI Operation Rating (Phase 2F — Implemented, migration 008)
Adds rating column to `writer_ai_operations`.

| Column | Type | Notes |
|--------|------|-------|
| rating | INTEGER | 1-5 star rating, NULL = unrated |

### `writer_brain_dumps` (Phase 2I — Implemented, migration 009)
Zero-friction brain dump capture with AI extraction.

| Column | Type | Notes |
|--------|------|-------|
| id | TEXT PK | UUID |
| project_id | TEXT FK→projects | CASCADE delete |
| content | TEXT NOT NULL | Raw dump text |
| extracted | INTEGER | 0 = not extracted, 1 = AI extracted |
| created_at | TEXT | Default CURRENT_TIMESTAMP |
| updated_at | TEXT | Default CURRENT_TIMESTAMP |

**Indexes**: `idx_brain_dumps_project` on `(project_id)`

### `writer_pipelines` (Phase 2K — Implemented, migration 010)
Transformation pipelines for chaining AI operations.

| Column | Type | Notes |
|--------|------|-------|
| id | TEXT PK | UUID |
| project_id | TEXT FK→projects | CASCADE delete |
| name | TEXT NOT NULL | |
| description | TEXT | |
| steps | TEXT | JSON array of `{id, label, prompt}` |
| is_preset | INTEGER | 0 = custom, 1 = preset |
| created_at | TEXT | Default CURRENT_TIMESTAMP |
| updated_at | TEXT | Default CURRENT_TIMESTAMP |

**Indexes**: `idx_pipelines_project` on `(project_id)`

### `writer_analyses` (Phase 4A — Implemented, migration 011)
Stored manuscript analysis results.

| Column | Type | Notes |
|--------|------|-------|
| id | TEXT PK | UUID |
| project_id | TEXT FK→projects NOT NULL | CASCADE delete |
| analysis_type | TEXT NOT NULL | `'pacing'`, `'readability'`, `'voice_audit'`, `'consistency'` |
| chapter_id | TEXT | NULL = whole project |
| results | TEXT | JSON results object |
| created_at | TEXT | Default CURRENT_TIMESTAMP |

**Indexes**: `idx_analyses_project` on `(project_id)`

### `writer_character_relationships` (Phase 2J — Implemented, migration 012)
Character relationship connections for the relationship map.

| Column | Type | Notes |
|--------|------|-------|
| id | TEXT PK | UUID |
| project_id | TEXT FK→projects NOT NULL | CASCADE delete |
| character_a_id | TEXT NOT NULL | References encyclopedia_entries.id |
| character_b_id | TEXT NOT NULL | References encyclopedia_entries.id |
| relationship_type | TEXT NOT NULL | `'family'`, `'romantic'`, `'friend'`, `'rival'`, `'mentor'`, `'ally'`, `'enemy'`, `'colleague'`, `'acquaintance'`. Default `'knows'` |
| description | TEXT NOT NULL | Default `''` |
| created_at | TEXT | Default CURRENT_TIMESTAMP |
| updated_at | TEXT | Default CURRENT_TIMESTAMP |

**Indexes**: `idx_relationships_project` on `(project_id)`

### `writer_chapter_notes` (QoL — Implemented, migration 013)
Per-chapter notes for authors to track ideas, reminders, and annotations alongside their writing.

| Column | Type | Notes |
|--------|------|-------|
| id | TEXT PK | UUID |
| chapter_id | TEXT FK→chapters | CASCADE delete |
| content | TEXT NOT NULL | Note content |
| created_at | TEXT | Default CURRENT_TIMESTAMP |
| updated_at | TEXT | Default CURRENT_TIMESTAMP |

**Indexes**: `idx_chapter_notes_chapter` on `(chapter_id)`

### `writer_comments` (Phase 4C — Implemented, migration 014)
Inline comments anchored to text ranges within chapters. Used for review and annotation.

| Column | Type | Notes |
|--------|------|-------|
| id | TEXT PK | UUID |
| chapter_id | TEXT FK→chapters NOT NULL | CASCADE delete |
| from_pos | INTEGER NOT NULL | Start position in TipTap document (ProseMirror position) |
| to_pos | INTEGER NOT NULL | End position in TipTap document (ProseMirror position) |
| text | TEXT NOT NULL | Comment text. Default `''` |
| author | TEXT NOT NULL | Comment author. Default `'Author'` |
| resolved | INTEGER NOT NULL | 0 = open, 1 = resolved. Default 0 |
| created_at | TEXT | Default CURRENT_TIMESTAMP |
| updated_at | TEXT | Default CURRENT_TIMESTAMP |

**Indexes**: `idx_comments_chapter` on `(chapter_id)`

### `writer_tracked_changes` (Sprint 9 — Implemented, migration 015)
Tracked insertions and deletions within chapters for review/accept/reject workflow.

| Column | Type | Notes |
|--------|------|-------|
| id | TEXT PK | UUID |
| chapter_id | TEXT FK→chapters NOT NULL | CASCADE delete |
| change_type | TEXT NOT NULL | `'insertion'`, `'deletion'`. Default `'insertion'` |
| from_pos | INTEGER NOT NULL | Start position in TipTap document |
| to_pos | INTEGER NOT NULL | End position in TipTap document |
| old_text | TEXT NOT NULL | Original text (empty for insertions). Default `''` |
| new_text | TEXT NOT NULL | New text (empty for deletions). Default `''` |
| author | TEXT NOT NULL | Change author. Default `'Author'` |
| created_at | TEXT | Default CURRENT_TIMESTAMP |

**Indexes**: `idx_tracked_changes_chapter` on `(chapter_id)`

### `writer_sprints` (Sprint 9 — Implemented, migration 015)
Timed writing sprint sessions with word count targets.

| Column | Type | Notes |
|--------|------|-------|
| id | TEXT PK | UUID |
| project_id | TEXT FK→projects NOT NULL | CASCADE delete |
| duration_seconds | INTEGER NOT NULL | Sprint duration. Default 0 |
| target_words | INTEGER NOT NULL | Word count goal. Default 0 |
| words_written | INTEGER NOT NULL | Actual words written. Default 0 |
| started_at | TEXT | Default CURRENT_TIMESTAMP |
| ended_at | TEXT | NULL while sprint active |

**Indexes**: `idx_sprints_project` on `(project_id)`

### `writer_custom_templates` (Sprint 9 — Implemented, migration 015)
User-created chapter templates with saved TipTap content.

| Column | Type | Notes |
|--------|------|-------|
| id | TEXT PK | UUID |
| name | TEXT NOT NULL | Template name |
| description | TEXT NOT NULL | Default `''` |
| content | TEXT NOT NULL | TipTap JSON string. Default `''` |
| created_at | TEXT | Default CURRENT_TIMESTAMP |

### `writer_revision_plans` (Sprint 10 — Implemented, migration 016)
AI-generated revision plans from the Feedback Dashboard, containing categorized and prioritized tasks.

| Column | Type | Notes |
|--------|------|-------|
| id | TEXT PK | UUID |
| project_id | TEXT FK→projects NOT NULL | CASCADE delete |
| tasks | TEXT NOT NULL | JSON array of `RevisionTask` objects. Default `'[]'` |
| summary | TEXT NOT NULL | AI-generated summary. Default `''` |
| created_at | TEXT | Default CURRENT_TIMESTAMP |

**Indexes**: `idx_revision_plans_project` on `(project_id)`

### `writer_master_pages` (Sprint 11 — Implemented, migration 017)
Saved master page layout presets for The Press page setup.

| Column | Type | Notes |
|--------|------|-------|
| id | TEXT PK | UUID |
| name | TEXT NOT NULL | Preset name |
| description | TEXT NOT NULL | Default `''` |
| page_size | TEXT NOT NULL | `'letter'`, `'a4'`, `'a5'`, `'6x9'`, `'5.5x8.5'`, `'5x8'`, `'4.25x6.87'`. Default `'letter'` |
| margin_top | REAL NOT NULL | Inches. Default 1.0 |
| margin_bottom | REAL NOT NULL | Inches. Default 1.0 |
| margin_left | REAL NOT NULL | Inches. Default 1.25 |
| margin_right | REAL NOT NULL | Inches. Default 1.25 |
| header_text | TEXT NOT NULL | Default `''` |
| footer_text | TEXT NOT NULL | Default `''` |
| show_page_numbers | INTEGER NOT NULL | 0 = hidden, 1 = visible. Default 1 |
| page_number_position | TEXT NOT NULL | `'bottom-center'`, `'bottom-right'`, `'top-right'`. Default `'bottom-center'` |
| columns | INTEGER NOT NULL | 1, 2, or 3. Default 1 |
| created_at | TEXT | Default CURRENT_TIMESTAMP |

### `writer_guide_messages` (Sprint 17 — Implemented, migration 018)
AI Writing Guide conversation messages. Stores persistent chat history between the user and the AI writing coach.

| Column | Type | Notes |
|--------|------|-------|
| id | TEXT PK | UUID |
| project_id | TEXT FK→projects NOT NULL | CASCADE delete |
| role | TEXT NOT NULL | `'user'`, `'assistant'` |
| content | TEXT NOT NULL | Message text |
| created_at | TEXT | Default CURRENT_TIMESTAMP |

**Indexes**: `idx_guide_messages_project` on `(project_id, created_at ASC)`

### `writer_timeline_events` (Sprint 18 — Implemented, migration 019)
Visual timeline events linked to chapters. Used by the Timeline panel for story event tracking.

| Column | Type | Notes |
|--------|------|-------|
| id | TEXT PK | UUID |
| project_id | TEXT FK→projects NOT NULL | CASCADE delete |
| title | TEXT NOT NULL | Event title |
| description | TEXT NOT NULL | Default `''` |
| chapter_id | TEXT FK→chapters | SET NULL on delete |
| color | TEXT NOT NULL | Event color for timeline display. Default `'#6366f1'` |
| sort_order | INTEGER NOT NULL | Display order on timeline. Default 0 |
| created_at | TEXT | Default CURRENT_TIMESTAMP |
| updated_at | TEXT | Default CURRENT_TIMESTAMP |

**Indexes**: `idx_timeline_events_project` on `(project_id)`

### `writer_chapter_targets` (Sprint 18 — Implemented, migration 019)
Per-chapter word count targets for the Storyboard panel. One target per chapter (UNIQUE constraint on chapter_id).

| Column | Type | Notes |
|--------|------|-------|
| id | TEXT PK | UUID |
| chapter_id | TEXT FK→chapters UNIQUE | CASCADE delete |
| target_words | INTEGER NOT NULL | Word count goal |
| created_at | TEXT | Default CURRENT_TIMESTAMP |
| updated_at | TEXT | Default CURRENT_TIMESTAMP |

**Indexes**: `idx_chapter_targets_chapter` on `(chapter_id)`

---

## Future Tables (Phase 3+)

These tables are planned but NOT yet created. Add them via new migration files.

### `writer_templates` (Phase 3)
Layout templates for The Press.

| Column | Type | Notes |
|--------|------|-------|
| id | TEXT PK | |
| name | TEXT | |
| category | TEXT | `'book'`, `'document'`, `'creative'`, `'academic'` |
| page_width | REAL | inches |
| page_height | REAL | inches |
| margins | TEXT | JSON `{ top, bottom, inside, outside }` |
| typography | TEXT | JSON (font families, sizes, styles) |
| master_pages | TEXT | JSON (layout definitions) |
| is_builtin | INTEGER | 1 = shipped with app |
| created_at | TEXT | |

---

## Migration Pattern

Migrations live in `src/main/database/migrations/` as sequentially numbered `.sql` files:

```
001_initial_schema.sql      ← Phase 1 (core tables)
002_version_history.sql     ← Phase 2E (versions)
003_ai_operations.sql       ← Phase 2F (AI operation log)
004_session_tracking.sql    ← Phase 2G (sessions + goals)
005_discovery_mode.sql      ← Phase 2B (discovery sessions + suggestions)
006_continuity.sql          ← Phase 2C (plants + threads + character knowledge)
007_knowledge_base.sql      ← Phase 2D (KB entries)
008_ai_operation_rating.sql ← Phase 2F (adds rating column)
009_brain_dumps.sql         ← Phase 2I (brain dumps)
010_pipelines.sql           ← Phase 2K (transformation pipelines)
011_analyses.sql            ← Phase 4A (manuscript analyses)
012_character_relationships.sql ← Phase 2J (character relationship map)
013_chapter_notes.sql          ← QoL (chapter notes)
014_inline_comments.sql        ← Phase 4C (inline comments)
015_tracked_changes.sql        ← Sprint 9 (tracked changes + sprints + custom templates)
016_revision_plans.sql         ← Sprint 10 (revision plans)
017_master_pages.sql           ← Sprint 11 (master page presets)
018_guide_messages.sql         ← Sprint 17 (AI writing guide messages)
019_timeline_targets.sql       ← Sprint 18 (timeline events + chapter word count targets)
```

The migration runner (`db.ts:runMigrations()`) auto-discovers and applies pending files in order. Migrations MUST be safe to run on existing data.

**Important**: Migration SQL files must be copied to `dist/` at build time. The `dev:main` and `build:main` scripts include an `xcopy` command for this.
