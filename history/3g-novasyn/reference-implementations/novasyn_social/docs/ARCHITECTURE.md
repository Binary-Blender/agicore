# NovaSyn Social — Architecture

## Overview
NovaSyn Social is a NovaSyn Electron desktop app built on the Windows Dev Stack. It orchestrates multi-channel communication using AI classification, draft generation, and statistical process control for progressive automation.

## Stack
- Electron 28 (frameless window)
- React 18 + TypeScript 5.3
- Vite 5 (port 5178)
- SQLite via better-sqlite3 (social.db, WAL mode)
- Zustand 4 (single store)
- Tailwind CSS 3 (dark/light theme via CSS variables)
- AI: Anthropic SDK + raw fetch for OpenAI/Google/xAI

## Architecture: The IPC Bridge
```
SQL Migration → types.ts → preload/index.ts → main/index.ts → store → Component
```

All data flows through the IPC bridge. TypeScript strict mode enforces correctness across all layers.

## File Structure
```
novasyn_social/
├── package.json
├── vite.config.ts (port 5178)
├── tsconfig.json / tsconfig.main.json / tsconfig.renderer.json
├── tailwind.config.js / postcss.config.js
├── .gitignore
├── docs/
│   ├── SPRINT_PLAN.md
│   ├── ARCHITECTURE.md
│   └── DATABASE_SCHEMA.md
└── src/
    ├── main/
    │   ├── index.ts          # App lifecycle + ALL IPC handlers (28 channels)
    │   ├── window.ts         # BrowserWindow creation (frameless, 80% screen)
    │   ├── models.ts         # AI model definitions (6 models, 4 providers)
    │   ├── config/            # (Sprint 2+)
    │   ├── services/          # (Sprint 2+: classification, drafting, SPC)
    │   └── database/
    │       ├── db.ts          # SQLite init, WAL, auto-migration
    │       └── migrations/
    │           └── 001_social_core.sql  # 10 tables
    ├── shared/
    │   └── types.ts           # ALL interfaces, IPC_CHANNELS, ElectronAPI
    ├── preload/
    │   └── index.ts           # contextBridge — 28 channel wirings
    └── renderer/
        ├── index.html
        ├── index.tsx
        ├── styles/
        │   └── globals.css    # Tailwind + dark/light CSS variables
        ├── store/
        │   └── socialStore.ts # Single Zustand store
        └── components/
            ├── App.tsx         # Layout + view router + settings + accounts
            ├── TitleBar.tsx    # Frameless drag + window controls
            ├── Sidebar.tsx     # Icon nav (5 views) + unread badge
            ├── Dashboard.tsx   # Stats cards + recent high-priority messages
            ├── Inbox.tsx       # Unified inbox with filters + message list
            └── MessageDetail.tsx # Full message + classification + drafts
```

## IPC Channel Count: 28
### Messages: 6 (GET_MESSAGES, GET_MESSAGE, CREATE_MESSAGE, UPDATE_MESSAGE, DELETE_MESSAGE, SEARCH_MESSAGES)
### Classifications: 2 (GET_CLASSIFICATION, CLASSIFY_MESSAGE)
### Drafts: 3 (GET_DRAFTS, GENERATE_DRAFT, UPDATE_DRAFT)
### Feedback: 1 (SUBMIT_FEEDBACK)
### SPC: 2 (GET_SPC_METRICS, GET_AUTOMATION_TIERS)
### Accounts: 4 (GET_ACCOUNTS, CREATE_ACCOUNT, UPDATE_ACCOUNT, DELETE_ACCOUNT)
### Stats: 1 (GET_INBOX_STATS)
### Settings: 5 (GET_SETTINGS, SAVE_SETTINGS, GET_API_KEYS, SET_API_KEY, GET_MODELS)
### Window: 3 (MINIMIZE_WINDOW, MAXIMIZE_WINDOW, CLOSE_WINDOW)
### System: 1 (ping)

## Key Patterns
- **Row Mappers**: Every table has a mapper (snake_case → camelCase)
- **Error Handling**: Every handler in try/catch, returns { error: message }
- **Single Store**: One Zustand store (socialStore.ts) holds all state
- **View Navigation**: currentView string, no React Router
- **Theme**: CSS variables toggled via data-theme attribute
- **Shared API Keys**: %APPDATA%\NovaSyn\api-keys.json

## The 4 Response Modes
1. **Standard** — AI-style, emojis, em-dashes, polished. For DMs and emails.
2. **Agree & Amplify** — Enthusiastic, distinctive insights, AI-enhanced. For LinkedIn comments.
3. **Educate** — Compliment sandwich (compliment → educate → wrap). For misaligned posts.
4. **Battle** — Humanized, NO emojis, structured argumentation. ALWAYS Tier 0 (manual only).

## SPC Automation Tiers
- **Tier 0**: Manual only — all drafts require approval (default)
- **Tier 1**: Assisted drafting — drafts generated, no auto-send (50+ samples, 80% acceptance)
- **Tier 2**: Auto low-risk — auto-sends Standard & Agree & Amplify (100+ samples, 95%)
- **Tier 3**: Autonomous — full automation, experimental (500+ samples, 98%)
- **Battle Mode**: Permanently Tier 0. No automation ever.

## NullClaw Integration (Sprint 4)
NullClaw runs as a lightweight background process that:
- Polls platform APIs on schedule (Gmail, LinkedIn, YouTube, Twitter)
- Handles OAuth token refresh
- Pushes new messages to the Electron app
- Bridges the gap between "desktop app" and "always-on service"

## BabyAI Integration (Sprint 2+)
- Classification uses BabyAI/multi-model routing
- Draft generation uses BabyAI with voice profile injection
- Knowledge base uses BabyAI for embedding generation
- All AI calls logged to ai_log table for cost tracking
