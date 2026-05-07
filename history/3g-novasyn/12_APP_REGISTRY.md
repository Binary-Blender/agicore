# NovaSyn App Registry

All existing NovaSyn Electron apps and their configurations.

## Active Apps

### NovaSyn AI
| Property | Value |
|----------|-------|
| Directory | `novasyn_ai` |
| Package Name | `novasyn-ai` |
| Description | Desktop AI Chat Manager for Power Users |
| Port | 5173 |
| Database | `novasyn.db` |
| AppId | `com.novasyn.ai` |
| Status | Production |
| API Keys | anthropic, openai, google, xai |

**Core Features**: Multi-provider AI chat, conversation management, folders/tags, context attachments (text/PDF), token counting, streaming responses, cost tracking, chat search, export

---

### NovaSyn Studio
| Property | Value |
|----------|-------|
| Directory | `novasyn_studio` |
| Package Name | `novasyn-studio` |
| Description | AI Image & Video Generation Studio |
| Port | 5173 |
| Database | `studio.db` |
| AppId | `com.novasyn.studio` |
| Status | Production |
| API Keys | openai, google, xai, elevenlabs |

**Core Features**: Multi-provider image generation (OpenAI gpt-image-1, Google Imagen, xAI Grok Imagine), video generation (OpenAI Sora, xAI Grok Video), sound effects, music generation, TTS (ElevenLabs), gallery management, prompt templates

**Note**: Shares port 5173 with NovaSyn AI (never run simultaneously in dev)

---

### NovaSyn Writer
| Property | Value |
|----------|-------|
| Directory | `novasyn_writer` |
| Package Name | `novasyn-writer` |
| Description | AI-Powered Writing & Document Editor |
| Port | 5174 |
| Database | `novasyn-writer.db` |
| AppId | `com.novasyn.writer` |
| Status | Production |
| API Keys | anthropic, openai, google, xai |

**Core Features**: Document editor, AI writing assistance, multi-format export, project management, AI rewrite/expand/summarize, writing style analysis

---

### NovaSyn Council
| Property | Value |
|----------|-------|
| Directory | `novasyn_council` |
| Package Name | `novasyn-council` |
| Description | AI Panel Discussion & Multi-Perspective Debate |
| Port | 5175 |
| Database | `council.db` |
| AppId | `com.novasyn.council` |
| Status | Production |
| API Keys | anthropic, openai, google, xai |

**Core Features**: Multi-AI panel discussions, configurable panelists (personality, expertise, bias), debate topics, round-based discussion, consensus building, discussion export

---

### NovaSyn Home Academy
| Property | Value |
|----------|-------|
| Directory | `novasyn_home_academy` |
| Package Name | `novasyn-home-academy` |
| Description | AI-Powered Homeschool Management |
| Port | 5176 |
| Database | `academy.db` |
| AppId | `com.novasyn.home-academy` |
| Status | Production (Sprint 5 complete) |
| API Keys | anthropic, openai, google, xai |

**Core Features**: Student profiles, subject management, AI lesson planning, daily/weekly scheduling, attendance tracking, skill tracking, AI assessments, reading log, progress charts, AI tutoring (streaming), resource generation (worksheets/flashcards/quizzes), PDF export/print, gamification (XP/badges/streaks/goals), multi-child scheduling, state compliance tracking, portfolio system, AI report generation (report cards/transcripts/year-end reports)

**Migrations**: 5 migration files, 23 tables

---

### NovaSyn Orchestrator
| Property | Value |
|----------|-------|
| Directory | `novasyn_orchestrator` |
| Package Name | `novasyn-orchestrator` |
| Description | Cross-App Workflow Orchestration |
| Port | TBD |
| Database | `orchestrator.db` |
| AppId | `com.novasyn.orchestrator` |
| Status | Planning |
| API Keys | All |

**Planned Features**: Cross-app workflows, shared asset library (NS Vault), Send-To protocol, batch operations, unified dashboard

---

## Port Assignment Table

| Port | App |
|------|-----|
| 5173 | NovaSyn AI / NovaSyn Studio |
| 5174 | NovaSyn Writer |
| 5175 | NovaSyn Council |
| 5176 | NovaSyn Home Academy |
| 5177+ | Available for new apps |

## Planned Apps (from Suite Vision)

| App | Description | Status |
|-----|-------------|--------|
| NS Research | Deep research with web search + RAG | Planned |
| NS Prompt Lab | Prompt engineering & testing | Planned |
| NS Code | AI code generation & project scaffolding | Planned |
| NS Data | Data analysis & visualization | Planned |
| NS Voice | Voice interface & dictation | Planned |

## Vault Integration Status

How each app integrates with NS Vault (the shared asset library at `%APPDATA%\NovaSyn\vault.db`).

| App | Vault Item Types | Macros | Status |
|-----|-----------------|--------|--------|
| NovaSyn Chat | `chat_exchange`, `prompt_template` | `chat.send_prompt`, `chat.mosh_pit`, `chat.export_thread` | Planned |
| NovaSyn Studio | `generation` (image/video) | `studio.generate_image`, `studio.generate_video` | Planned |
| NovaSyn Writer | `document`, `code_snippet` | `writer.ai_rewrite`, `writer.export_chapter` | Planned |
| NovaSyn Social | `document` (drafts) | `social.draft_email`, `social.classify_inbox` | Planned |
| NovaSyn Council | `document` (summaries) | `council.run_discussion` | Planned |
| NovaSyn Academy | `document` (resources) | `academy.generate_lesson` | Planned |

**Vault Item Types** — what the app writes to the shared vault.
**Macros** — callable operations the app exposes for cross-app workflows via the Macro Registry.

See `NOVASYN_DEV_STACKS.md > Cross-App Infrastructure` for full details on vault architecture, macro registry, cross-app queue, and platform differences.

---

## Shared Across All Apps

- **API Keys**: `%APPDATA%\NovaSyn\api-keys.json`
- **Theme**: Dark/light via CSS custom properties
- **Window**: Frameless, 80% screen, min 1000x700
- **Stack**: Electron 28, React 18, TS 5.3, Vite 5, Zustand 4, Tailwind 3, better-sqlite3 9.2
- **Architecture**: IPC bridge pattern (types -> preload -> main -> store -> components)
- **Build**: electron-builder, portable Windows target
