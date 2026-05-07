# NovaSyn Academy — Sprint Plan

**Project Start**: 2026-03-03
**Template**: NovaSyn Council (Electron 28 / React 18 / TS / SQLite / Tailwind / Zustand)

---

## Sprint 1: Foundation — Student Profile, Subjects, Lessons, AI Planner

**Goal**: A parent can open the app, add their child, configure subjects, generate AI lesson plans for a day or week, and track daily completion. This is the MVP loop.

### Step 1: Scaffold & Config Files
- `package.json` — adapted from Council (name, description, appId, port 5176)
- `vite.config.ts` — port 5176
- `tsconfig.json`, `tsconfig.main.json`, `tsconfig.renderer.json` — identical to Council
- `tailwind.config.js`, `postcss.config.js` — identical to Council (same NovaSyn theme)
- `.gitignore` — node_modules, dist, release

### Step 2: Database
- `src/main/database/db.ts` — copied from Council, change DB name to `academy.db`
- `src/main/database/migrations/001_academy_core.sql` — 6 tables: students, school_years, subjects, lessons, attendance, ai_log + indexes

### Step 3: Shared Types
- `src/shared/types.ts` — All interfaces (Student, SchoolYear, Subject, Lesson, Attendance, AICostSummary, AIModel, Settings), IPC_CHANNELS (28), ElectronAPI interface

### Step 4: Main Process
- `src/main/window.ts` — copied from Council, change title to 'NovaSyn Academy', port to 5176
- `src/main/models.ts` — copied from Council (same multi-provider model list)
- `src/main/services/aiService.ts` — copied from Council, adapt for Academy's lesson generation prompts
- `src/main/index.ts` — App lifecycle, row mappers (6), IPC handlers (28): Settings (4), Students (4), SchoolYears (4), Subjects (4), Lessons (6), Attendance (2), AI Log (1), Window (3)

### Step 5: Preload
- `src/preload/index.ts` — Wire all 28 IPC channels

### Step 6: Renderer Shell
- `src/renderer/index.html`, `src/renderer/index.tsx` — React entry
- `src/renderer/styles/globals.css` — copied from Council (dark/light theme vars)
- `src/renderer/App.tsx` — Layout: TitleBar + Sidebar + main content area + modals

### Step 7: Store
- `src/renderer/store/academyStore.ts` — Zustand store with all Sprint 1 state + actions (~30 actions)

### Step 8: Components
- `TitleBar.tsx` — Frameless window controls (adapted from Council)
- `Sidebar.tsx` — Left nav: student selector, Dashboard, Schedule, Subjects, Settings icons
- `Dashboard.tsx` — Today's overview: student cards, daily progress, quick stats
- `StudentProfile.tsx` — Modal: create/edit student (name, DOB, grade, interests, learning style, philosophy)
- `SubjectManager.tsx` — Subject list per student: add/edit/delete, color picker, hours target
- `LessonPlanner.tsx` — AI lesson generation: select student + date range + subjects → generate → review → save
- `DailySchedule.tsx` — Today's lesson cards: subject badge, title, estimated time, start/complete buttons, completion notes
- `WeeklyView.tsx` — 5-day grid showing lessons by subject with status indicators
- `SettingsPanel.tsx` — API keys display (read from shared store), model selection, theme toggle

### Step 9: Verify
- Type-check passes for both `tsconfig.main.json` and `tsconfig.renderer.json`
- App launches, DB migration auto-applies
- Full CRUD flow: add student → add school year → add subjects → generate lessons → complete lessons
- Attendance auto-updates on lesson completion

---

## Sprint 2: Assessment, Skills, Reading (Complete)

- Skill tracking per subject (proficiency levels, trends)
- AI assessment generator (quiz/test from recent lessons)
- Assessment grading + skill level auto-update
- Reading log (book tracking, pages, time, reviews)
- Progress charts per subject/skill

---

## Sprint 3: AI Tutor, Resources (Complete)

- AI Tutor mode (streaming chat with safety system) — `AITutor.tsx`
  - Multi-provider streaming (Anthropic native, OpenAI/xAI SSE, Gemini non-streaming)
  - Session management: create, resume, end, delete sessions
  - Modes: guided (Socratic), free exploration, review
  - Safety filter: personal info, distress, inappropriate content detection
  - Real-time streaming display with optimistic student messages
  - Session sidebar with history, cost tracking, safety alert badges
- Printable resource generator — `ResourceGenerator.tsx`
  - 5 resource types: worksheet, flashcards, quiz, coloring page, puzzle
  - 3 difficulty levels, optional subject/topic binding
  - AI generates content with separate answer key
  - Resource list sidebar with preview
- PDF export and print
  - `EXPORT_PDF` — Save any resource as PDF via hidden BrowserWindow + printToPDF
  - `PRINT_RESOURCE` — Direct print (with/without answer key)
- New files: `AITutor.tsx`, `ResourceGenerator.tsx`
- Modified: `types.ts` (Sprint 3 types already defined), `preload/index.ts` (+14 channels), `main/index.ts` (+3 row mappers, +14 IPC handlers), `aiService.ts` (+safety filter, +streaming tutor, +resource generation), `academyStore.ts` (+Sprint 3 state/actions), `Sidebar.tsx` (+2 nav items), `App.tsx` (+2 view routes)
- Migration: `003_tutor_resources.sql` (3 tables: tutor_sessions, tutor_messages, resources)

---

## Sprint 4: Multi-Child, Gamification (Complete)

- Multi-child scheduling — AI-powered constraint-based scheduling (one parent, multiple children)
  - `GENERATE_MULTI_CHILD_SCHEDULE` IPC handler + `generateMultiChildSchedule()` in aiService
  - Parent constraint awareness: stagger 1-on-1 time, independent work, combined lessons
- Gamification engine (XP, levels, badges, streaks, goals)
  - 10 levels (Beginner → Master) with XP thresholds
  - 14 badge definitions (math, reading, streak, subject, special categories)
  - Per-student gamification settings (XP amounts, display toggles, badge category toggles, themes)
  - Streak tracking with weekend-gap tolerance
  - Goals system (weekly/monthly/custom with target XP and reward text)
  - Auto-XP hooks on lesson completion, assessment grading, reading completion
- Student-facing "Learning Quest" view — `LearningQuest.tsx`
  - Overview tab: daily quests, XP/level display, streak flame, recent badges, active goals
  - Badges tab: full badge collection grid
  - Goals tab: create/manage goals with progress bars, reward text
  - XP Log tab: chronological XP history
  - XP progress bar (level → next level)
- Parent gamification controls — `GamificationSettings.tsx`
  - Enable/disable gamification per student
  - Customize XP reward amounts (8 categories)
  - Display toggle options (XP numbers, skill tree, streak, badges)
  - Badge category toggles (math, reading, streak, subject, special)
  - Theme selection (Medieval Quest, Space Explorer, Nature Ranger)
- New files: `LearningQuest.tsx`, `GamificationSettings.tsx`
- Migration: `004_gamification.sql` (5 tables: gamification_settings, xp_log, badges_earned, streaks, goals + 7 indexes)
- Modified: `types.ts` (+Sprint 4 types/interfaces), `preload/index.ts` (+13 channels), `main/index.ts` (+4 row mappers, +13 IPC handlers, gamification engine helpers, auto-XP hooks), `aiService.ts` (+multi-child schedule), `academyStore.ts` (+Sprint 4 state/actions), `Sidebar.tsx` (+1 nav item), `App.tsx` (+1 view route)

---

## Sprint 5: Compliance, Portfolio, Reports (Complete)

- State compliance tracking
  - `academy_compliance` table for state-specific requirements (type, description, required flag, source URL)
  - `academy_compliance_status` table for per-student/per-year checklist (status, notes, documentation)
  - State selector with all 50 US states
  - Status tracking: not_started → in_progress → completed (or N/A)
  - Year summary stats (school days, subjects, portfolio count)
- Portfolio system — `academy_portfolio` table
  - 7 item types: writing sample, artwork, project photo, test result, certificate, book report, other
  - Links to subjects, lessons, and assessments via foreign keys
  - Tag system (JSON array), content field for inline text, file path for attachments
  - Filterable grid view with type icons, subject labels, tags, and dates
  - Add/delete portfolio items
- AI Report Generation (3 report types)
  - **Report Card** — 4 styles (traditional/narrative/standards-based/hybrid), AI generates complete HTML from student data (subjects, skills, assessments, reading, attendance)
  - **Academic Transcript** — formal transcript across all school years with GPA calculation, credits (hours-based), and attendance summary
  - **Year-End Portfolio Report** — comprehensive document with cover page, TOC, subject narratives, reading log, assessment overview, attendance, portfolio summary, and parent reflection section
  - All reports: HTML preview in-app, Print and Export PDF support
  - Model selection for all AI generation
- Combined component — `CompliancePortfolio.tsx` with 3 tabs: Compliance, Portfolio, Reports
- New files: `CompliancePortfolio.tsx`
- Migration: `005_compliance_portfolio.sql` (3 tables: compliance, compliance_status, portfolio + 7 indexes)
- Modified: `types.ts` (+Sprint 5 types/interfaces), `preload/index.ts` (+11 channels), `main/index.ts` (+3 row mappers, +11 IPC handlers), `aiService.ts` (+callAI helper, +report card/transcript/year-end generation), `academyStore.ts` (+Sprint 5 state/actions), `Sidebar.tsx` (+1 nav item), `App.tsx` (+1 view route)

---

## Files Created Per Sprint 1 Step

| Step | Files | Count |
|------|-------|-------|
| 1 | package.json, vite.config.ts, tsconfig*.json (3), tailwind.config.js, postcss.config.js, .gitignore | 8 |
| 2 | src/main/database/db.ts, migrations/001_academy_core.sql | 2 |
| 3 | src/shared/types.ts | 1 |
| 4 | src/main/index.ts, window.ts, models.ts, services/aiService.ts | 4 |
| 5 | src/preload/index.ts | 1 |
| 6 | src/renderer/index.html, index.tsx, styles/globals.css | 3 |
| 7 | src/renderer/store/academyStore.ts | 1 |
| 8 | src/renderer/components/*.tsx (9 files) | 9 |
| **Total** | | **29 files** |
