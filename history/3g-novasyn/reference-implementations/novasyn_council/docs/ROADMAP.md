# NovaSyn Council — Roadmap

## Phase 1: Core (Sprints 1–5)

Persona system with skill docs, persistent memory, and solo chat.

### Sprint 1: Project Scaffolding + Persona CRUD ✅
- Electron + Vite + React + Tailwind + Zustand setup
- SQLite database with migration system
- Migration 001: personas, skill_docs, memories, settings tables
- Shared API key loading from `%APPDATA%/NovaSyn/api-keys.json`
- Model definitions (Anthropic, OpenAI, Google, xAI)
- Types, preload, IPC handlers for: settings, API keys, models, persona CRUD
- Store: personas, settings, basic UI state
- Components: App, TitleBar, Sidebar, Dashboard, PersonaBuilder, PersonaDetail, SettingsPanel
- Window controls (min/max/close)
- 7 built-in persona templates

### Sprint 2: Skill Docs System ✅
- IPC handlers for skill doc CRUD
- Store actions for skill docs
- SkillDocEditor modal (create, edit, all fields)
- PersonaDetail tabs (Overview / Skill Docs / Memories)
- Category badges (domain, technical, business, persona_specific, meta)
- Loading rule selector (always / available / manual)
- Token count auto-computation
- Global vs persona-specific docs

### Sprint 3: Solo Chat — AI Integration ✅
- aiService.ts: Multi-provider support (Anthropic SDK, OpenAI/xAI/Gemini fetch)
- Non-streaming chat with full context building
- Migration 002: persona_conversations, conversation_messages tables
- IPC handlers: GET/CREATE/DELETE conversations, GET messages, SEND_PERSONA_MESSAGE
- Store: conversations, sendMessage with optimistic updates
- SoloChat component: conversation list, message bubbles, auto-scroll, typing indicator
- Markdown rendering (code blocks, headers, lists, bold, inline code)
- Token/cost tracking per message + conversation + persona aggregates

### Sprint 4: Memory System ✅
- Memory CRUD IPC handlers + SEARCH
- MemoryEditor modal (type selector, content, importance slider, relevance tags, shared toggle)
- PersonaDetail Memories tab with search, persona/shared sections
- Memory type badges with color coding
- Importance indicator bars
- Manual memory creation

### Sprint 5: AI Memory Extraction ✅
- EXTRACT_MEMORIES IPC handler
- AI-powered memory extraction from conversations
- MemoryReviewPanel: review extracted memories (accept/edit/reject)
- Memory superseding (SUPERSEDE_MEMORY handler)
- Importance scoring + relevance tag generation by AI

---

## Phase 2: Meetings (Sprints 6–11)

Multi-persona meetings with intelligence, streaming, and post-meeting tools.

### Sprint 6: Meeting Foundation ✅
- Migration 003: meetings, meeting_messages tables
- Meeting CRUD IPC handlers (GET/CREATE/DELETE/END)
- MeetingCreator component (participant selection, agenda, meeting type)
- MeetingRoom component (transcript, input, end meeting)
- Sequential persona responses: human speaks → all personas respond in order
- Meeting stats (duration, messages, tokens, cost)
- Dashboard: meetings section with recent meetings
- Sidebar: meeting view navigation

### Sprint 7: Meeting Intelligence ✅
- ANALYZE_MEETING IPC handler (AI-powered)
- Real-time meeting analysis: consensus detection, insights, disagreements, action items
- IntelPanel sidebar in MeetingRoom
- Intelligence categories: consensus, insight, disagreement, action_item, missing_perspective
- Auto-analysis triggered after each round of persona responses

### Sprint 8: Action Items & Decision Records ✅
- Migration 004: action_items, decision_records tables
- Action item CRUD IPC handlers (GET/CREATE/UPDATE/DELETE)
- Decision record CRUD IPC handlers (GET/CREATE/DELETE)
- ItemsPanel in MeetingRoom: full CRUD for action items + decisions
- Status cycling for action items (pending → in_progress → completed → cancelled)
- Accept action items from IntelPanel suggestions
- Save meeting consensus as decision records
- Dashboard: pending action items section

### Sprint 9: Streaming AI Responses ✅
- SSE streaming for all 4 providers (Anthropic SDK stream, OpenAI/xAI/Gemini fetch SSE)
- `parseSSEStream()` helper for generic SSE parsing
- `onChunk` callback pattern in aiService.ts
- IPC streaming: `STREAM_CHUNK` + `STREAM_PERSONA_START` channels
- Real-time text rendering with animated cursor in SoloChat and MeetingRoom
- Per-persona streaming in meetings (shows persona avatar + name with their streaming text)

### Sprint 10: Conversation Enhancements ✅
- Inline conversation title editing
- Copy-to-clipboard on messages with "Copied" feedback
- Regenerate last AI response (REGENERATE_RESPONSE handler)
- Export conversation as markdown (EXPORT_CONVERSATION handler with save dialog)

### Sprint 11: Meeting Export & Conversation Search ✅
- Export meeting as markdown (EXPORT_MEETING handler): transcript + action items + decisions
- Conversation search in SoloChat: Ctrl+F shortcut, real-time filtering, match count, highlight ring

---

### Sprint 12: Persona Relationships ✅
- Migration 005: persona_relationships table
- Relationship CRUD IPC handlers (GET/CREATE/UPDATE/DELETE) + SUGGEST_RELATIONSHIPS
- RelationshipPanel component (manage relationships between personas)
- AI-powered relationship suggestions via suggestRelationships()
- Relationship context injected into meeting system prompts (--- YOUR RELATIONSHIPS --- section)
- "Relationships" button in PersonaDetail header and MeetingRoom header

### Sprint 13: Global Search ✅
- GLOBAL_SEARCH IPC handler searching 7 tables (personas, conversations, conversation_messages, meetings, meeting_messages, memories, skill_docs, action_items)
- SearchPanel component (command palette with Ctrl+K, keyboard navigation)
- LIKE-based queries with snippets and deduplication
- Search button in Sidebar + Ctrl+K global shortcut

### Sprint 14: Cost Analytics Dashboard ✅
- GET_COST_ANALYTICS IPC handler aggregating token/cost data across conversations and meetings
- AnalyticsPanel component (cost breakdowns by persona, model, time period)
- Dashboard integration with analytics summary

---

## Phase 3: Advanced Features (Future Sprints)

### Sprint 15+: Planned
- Task management (TaskBoard, task execution, review workflow)
- Tool system (file operations, web search, tool permissions)
- Pipeline modes (sequential, brainstorm, review, debate)
- MCP component integration
- NovaSyn ecosystem integration (Send-To Writer, Studio, etc.)

---

## Status Key

| Symbol | Meaning |
|--------|---------|
| ✅ | Complete |
| 🔄 | In progress |
| ⬜ | Not started |
