# NovaSyn Academy — Architecture

**Created**: 2026-03-03
**Status**: Active — Sprint 4 complete

---

## Overview

NovaSyn Academy is an AI-powered homeschool learning management system (LMS) built as a standalone Electron desktop app within the NovaSyn Suite. It helps homeschool parents plan lessons, track progress, manage compliance, and leverage AI for personalized education.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Electron 28 |
| Frontend | React 18, TypeScript, Vite |
| State | Zustand 4 |
| Styling | Tailwind CSS 3, CSS Variables (dark/light theme) |
| Database | SQLite via better-sqlite3 (WAL mode, FK enforced) |
| AI | Multi-provider: Anthropic, OpenAI, Google, xAI (shared API keys) |
| Build | electron-builder (Windows portable) |

---

## Directory Structure

```
novasyn_home_academy/
├── docs/                              # Documentation
│   ├── novasyn_home_academy.md        # Original brainstorming document
│   ├── ARCHITECTURE.md                # This file
│   ├── DATABASE_SCHEMA.md             # Table definitions + relationships
│   ├── IPC_REFERENCE.md               # All IPC channels with params/returns
│   └── SPRINT_PLAN.md                 # Sprint breakdown + status
├── src/
│   ├── main/                          # Electron main process (CommonJS)
│   │   ├── index.ts                   # App lifecycle, IPC handlers, row mappers
│   │   ├── window.ts                  # BrowserWindow creation (frameless, dark)
│   │   ├── models.ts                  # AI model definitions (multi-provider)
│   │   ├── database/
│   │   │   ├── db.ts                  # DB init, WAL mode, migration runner
│   │   │   └── migrations/            # Auto-applied SQL files
│   │   │       ├── 001_academy_core.sql          # Students, years, subjects, lessons, attendance, ai_log
│   │   │       ├── 002_skills_assessments_reading.sql  # Skills, assessments, reading_log
│   │   │       ├── 003_tutor_resources.sql        # Tutor sessions/messages, resources
│   │   │       └── 004_gamification.sql           # Gamification settings, XP, badges, streaks, goals
│   │   └── services/
│   │       └── aiService.ts           # Multi-provider AI: streaming, cost calc
│   ├── preload/
│   │   └── index.ts                   # contextBridge: IPC channel wiring
│   ├── renderer/                      # React app (ESNext)
│   │   ├── App.tsx                    # Root layout, view routing, modals
│   │   ├── index.tsx                  # ReactDOM entry
│   │   ├── index.html                 # Shell HTML
│   │   ├── store/
│   │   │   └── academyStore.ts        # Zustand single store
│   │   ├── components/                # UI components
│   │   │   ├── TitleBar.tsx           # Frameless window controls
│   │   │   ├── Sidebar.tsx            # Left nav (12 views)
│   │   │   ├── Dashboard.tsx          # Family overview + today's schedule
│   │   │   ├── StudentProfile.tsx     # Student setup/edit
│   │   │   ├── SubjectManager.tsx     # Subject CRUD per student
│   │   │   ├── LessonPlanner.tsx      # AI lesson plan generation
│   │   │   ├── DailySchedule.tsx      # Today's lesson cards + completion
│   │   │   ├── WeeklyView.tsx         # Week overview
│   │   │   ├── SkillTracker.tsx       # Skill proficiency per subject
│   │   │   ├── AssessmentManager.tsx  # AI quiz/test generation + grading
│   │   │   ├── ReadingLog.tsx         # Book tracking
│   │   │   ├── ProgressCharts.tsx     # Progress visualization
│   │   │   ├── AITutor.tsx            # Streaming AI tutor chat
│   │   │   ├── ResourceGenerator.tsx  # Printable resource generation
│   │   │   ├── LearningQuest.tsx      # Gamified student dashboard
│   │   │   ├── GamificationSettings.tsx # Parent gamification controls
│   │   │   └── SettingsPanel.tsx      # API keys, app settings
│   │   └── styles/
│   │       └── globals.css            # Theme variables + Tailwind base
│   └── shared/
│       └── types.ts                   # Interfaces, IPC_CHANNELS, ElectronAPI
├── package.json
├── vite.config.ts                     # Vite renderer (port 5176)
├── tsconfig.json                      # Base TypeScript config
├── tsconfig.main.json                 # Main process (CommonJS, ES2021)
├── tsconfig.renderer.json             # Renderer (ESNext, JSX)
├── tailwind.config.js                 # NovaSyn theme colors
├── postcss.config.js                  # Tailwind + autoprefixer
└── .gitignore
```

---

## Key Architecture Decisions

### 1. Standalone App (Not Integrated into Studio/Writer)
- **Why**: Academy targets a different user (parent/educator vs. creator). Different daily workflow (structured school day vs. creative sessions). The feature scope is as large as Studio itself.
- **Shared**: API keys via `%APPDATA%/NovaSyn/api-keys.json`, same design system, same Electron patterns.

### 2. Template from NovaSyn Council
- Reused: Electron scaffold, window.ts, db.ts + migration runner, aiService.ts (multi-provider), IPC bridge pattern, Zustand single-store, Tailwind theming, TitleBar/Sidebar/Settings components.
- Adapted: Domain-specific tables, IPC channels, store state, and components.

### 3. Single Store (Zustand)
- All state + actions in one `academyStore.ts` file.
- Components access via `useAcademyStore()`.
- Pattern: `loadX()` fetches from IPC → sets state. `createX()` / `updateX()` / `deleteX()` call IPC → refresh state.

### 4. Database: SQLite with Auto-Migrations
- DB file: `%APPDATA%/NovaSyn/academy.db`
- Migrations auto-apply on startup via `runMigrations()`.
- All tables prefixed with `academy_` to avoid collisions if sharing a DB in the future.
- UUIDs for primary keys (`crypto.randomUUID()`).
- JSON columns stored as TEXT, parsed in row mappers.
- Timestamps as ISO strings.

### 5. AI Integration: Multi-Provider via aiService.ts
- Same provider support as Council: Anthropic, OpenAI, Google, xAI.
- **Streaming**: AI Tutor uses real-time streaming (Anthropic native SDK, OpenAI/xAI SSE, Gemini non-streaming fallback).
- **Non-streaming**: JSON responses for lesson generation, assessment generation, resource generation, multi-child scheduling.
- **Safety filter**: Regex-based content filtering for tutor messages (personal info, distress, inappropriate).
- Cost tracking per AI call (stored in DB).

### 6. Gamification Engine (Sprint 4)
- Per-student XP system with 10 levels (Beginner → Master).
- 14 badge definitions across 5 categories (math, reading, streak, subject, special).
- Auto-XP awarding hooks on lesson completion, assessment grading, and reading completion.
- Streak tracking with weekend-gap tolerance.
- Goals system (weekly/monthly/custom) with progress tracking and reward text.

---

## Data Flow

```
User Action (React Component)
    ↓
Zustand Store Action
    ↓
window.electronAPI.methodName(params)     [Preload Bridge]
    ↓
ipcRenderer.invoke(IPC_CHANNEL, params)   [IPC]
    ↓
ipcMain.handle(IPC_CHANNEL, handler)      [Main Process]
    ↓
better-sqlite3 query / AI service call
    ↓
Return typed result → Store updates → Component re-renders
```

---

## Vite Dev Server

- Port: **5176** (Council uses 5175, Studio uses 5173)
- Two terminals: `npm run dev:renderer` (T1) then `npm run dev:main` (T2)
- Run from **Windows PowerShell** (Electron is a GUI app)

---

## NovaSyn Ecosystem Integration

| Feature | Integration |
|---------|------------|
| API Keys | Shared `%APPDATA%/NovaSyn/api-keys.json` |
| AI Models | Same model list as Council (Anthropic, OpenAI, Google, xAI) |
| Future: Send-To | Academy → Studio (generate illustrations, coloring pages) |
| Future: Send-To | Academy → Writer (report cards, college essays) |
| Future: Orchestrator | Weekly lesson prep pipeline |
