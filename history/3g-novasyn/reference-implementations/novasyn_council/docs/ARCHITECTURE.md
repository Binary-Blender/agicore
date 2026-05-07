# NovaSyn Council — Architecture

## Overview

NovaSyn Council is an Electron desktop application that lets users build AI persona teams, hold multi-persona meetings, chat with individual personas, manage tasks, and leverage persistent organizational memory. Personas are backed by multiple AI providers (Anthropic, OpenAI, Google, xAI) via BYOK.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Electron 28 |
| Frontend | React 18 + TypeScript |
| Build | Vite |
| Styling | Tailwind CSS |
| State | Zustand |
| Database | SQLite (better-sqlite3) |
| AI Providers | Anthropic, OpenAI, Google Gemini, xAI |
| Shared Keys | `%APPDATA%/NovaSyn/api-keys.json` (shared with NovaSyn AI, Studio, Writer) |

## Process Architecture

```
┌─────────────────────────────────┐
│         Main Process            │
│  (Electron + better-sqlite3)    │
│                                 │
│  ┌───────────┐ ┌─────────────┐ │
│  │ Database   │ │ AI Service  │ │
│  │ (SQLite)   │ │ (API calls) │ │
│  └───────────┘ └─────────────┘ │
│  ┌───────────┐ ┌─────────────┐ │
│  │ IPC        │ │ File System │ │
│  │ Handlers   │ │ Service     │ │
│  └───────────┘ └─────────────┘ │
└────────────┬────────────────────┘
             │ IPC (contextBridge)
┌────────────┴────────────────────┐
│       Renderer Process          │
│  (React + Zustand + Tailwind)   │
│                                 │
│  ┌───────────┐ ┌─────────────┐ │
│  │ Store      │ │ Components  │ │
│  │ (Zustand)  │ │ (React)     │ │
│  └───────────┘ └─────────────┘ │
└─────────────────────────────────┘
```

## Directory Structure

```
novasyn_council/
├── docs/                          # Documentation
├── src/
│   ├── main/                      # Electron main process
│   │   ├── index.ts               # Main entry, IPC handlers
│   │   ├── window.ts              # BrowserWindow creation
│   │   ├── models.ts              # AI model definitions
│   │   ├── database/
│   │   │   ├── db.ts              # Database initialization + migration runner
│   │   │   └── migrations/        # SQL migration files (auto-applied)
│   │   │       ├── 001_initial_schema.sql
│   │   │       ├── 002_conversations.sql
│   │   │       ├── 003_meetings.sql
│   │   │       ├── 004_action_items.sql
│   │   │       └── 005_relationships.sql
│   │   └── services/
│   │       └── aiService.ts       # Multi-provider AI calls with streaming
│   ├── preload/
│   │   └── index.ts               # contextBridge IPC wiring (55 channels)
│   ├── renderer/
│   │   ├── App.tsx                # Root component, routing, modals
│   │   ├── index.tsx              # Entry point
│   │   ├── index.html             # HTML shell
│   │   ├── store/
│   │   │   └── councilStore.ts    # Zustand store (single store pattern)
│   │   └── components/
│   │       ├── Dashboard.tsx      # Home screen + action items
│   │       ├── PersonaBuilder.tsx # Create/edit personas
│   │       ├── PersonaDetail.tsx  # Persona view with tabs
│   │       ├── SoloChat.tsx       # 1:1 chat with streaming + search + export
│   │       ├── MeetingRoom.tsx    # Multi-persona meetings with streaming
│   │       ├── MeetingCreator.tsx # Meeting setup modal
│   │       ├── SkillDocEditor.tsx # Skill doc CRUD
│   │       ├── MemoryEditor.tsx   # Memory create/edit
│   │       ├── MemoryReviewPanel.tsx # AI memory extraction review
│   │       ├── RelationshipPanel.tsx # Persona relationship management
│   │       ├── SearchPanel.tsx    # Global search command palette (Ctrl+K)
│   │       ├── AnalyticsPanel.tsx # Cost analytics dashboard
│   │       ├── Sidebar.tsx        # Left navigation
│   │       ├── TitleBar.tsx       # Window title bar
│   │       └── SettingsPanel.tsx  # App settings
│   └── shared/
│       └── types.ts               # Shared types, IPC channels, ElectronAPI
├── package.json
├── tsconfig.main.json
├── tsconfig.renderer.json
├── vite.main.config.ts
├── vite.renderer.config.ts
└── tailwind.config.js
```

## Data Flow

### 5-Layer IPC Pattern (same as NovaSyn Writer)

1. **Types** (`src/shared/types.ts`) — Define interfaces, IPC channel names, ElectronAPI signatures
2. **Preload** (`src/preload/index.ts`) — Wire IPC invoke/on methods via contextBridge
3. **Main** (`src/main/index.ts`) — IPC handlers: DB queries, AI calls, file ops
4. **Store** (`src/renderer/store/councilStore.ts`) — Zustand actions call `window.electronAPI.*`
5. **Components** (`src/renderer/components/*.tsx`) — React UI calls store actions

### AI Request Flow

```
Component → Store action → electronAPI.sendMessage()
  → Main IPC handler
    → Load persona's skill docs (always + relevant)
    → Load persona's memories (by relevance tags)
    → Build system prompt: persona prompt + skill docs + memories + relationship context
    → Call AI provider (aiService.ts)
    → Parse response
    → Extract tool calls (if any) → execute tools → feed back
    → Save message to DB
    → Extract memories (post-conversation)
  → Return response to renderer
```

## Key Architectural Decisions

1. **Single SQLite database** — All data (personas, meetings, memories, action items, decisions) in one DB file at `%APPDATA%/NovaSyn/council.db`
2. **BYOK (Bring Your Own Keys)** — Shared key store with other NovaSyn apps
3. **Streaming for both solo chat and meetings** — Both use IPC event-based streaming (`STREAM_CHUNK` events via `event.sender.send()`). Meetings stream per-persona with `STREAM_PERSONA_START` identification.
4. **Memory is loaded at prompt time** — Relevant memories are fetched from DB and injected into the system prompt, not maintained in a running context window
5. **Migrations auto-apply** — On app start, all `*.sql` files in `migrations/` are applied in order (5 migrations currently)
6. **No teams table** — Meetings use ad-hoc participant selection from all personas (teams deferred to future)

## Patterns Ported from NovaSyn AI

NovaSyn AI (`novasyn_ai/`) is architecturally closer to Council than Writer. Key patterns reused:

| NovaSyn AI Feature | Council Adaptation |
|---|---|
| **ChatService streaming** (4-provider SSE delta parsing) | Port for solo chat; adapt for sequential meeting responses |
| **Folder system** (knowledge items with token tracking) | Maps to **Skill Docs** — same context injection pattern |
| **Tag system** (cross-session context via tags) | Maps to **Memory relevance tags** |
| **Message exclusion** (`isExcluded` flag) | Reuse for meeting message context pruning |
| **Token budget UI** (slider + progress bar with warnings) | Reuse for persona context budget visualization |
| **Session model** (named conversations with history) | Maps to **Solo Conversations** and **Meetings** |
| **Broadcast mode** (same prompt → multiple models) | Adapt to same prompt → **multiple personas** in meetings |
| **File import + PDF parsing** | Reuse for skill doc import from files |

**Reference**: NovaSyn AI source at `../novasyn_ai/src/main/services/ChatService.ts` for streaming implementation.
