# NovaSyn Council — Conventions

## Code Style

Shared conventions with NovaSyn AI and Writer. NovaSyn AI is the closer architectural sibling — Council's chat, context injection, and streaming patterns are ported from AI's `ChatService`, `Folder` system, and `Tag` system. This document covers Council-specific patterns.

### TypeScript
- Strict mode enabled
- Interfaces over types for object shapes
- `Record<string, string>` for key-value maps
- JSON columns stored as TEXT in SQLite, parsed in row mappers

### React
- Functional components only
- `useCouncilStore()` hook for all state access
- No prop drilling — components read from store directly
- Modals use boolean `showX` pattern: `{showX && <X />}`

### Database
- UUIDs generated via `crypto.randomUUID()` in main process
- Timestamps as ISO strings (`new Date().toISOString()`)
- JSON columns stored as TEXT, parsed in mappers
- All queries use parameterized `?` placeholders (no string interpolation)
- Row mappers named `mapPersona(row)`, `mapSkillDoc(row)`, etc.
- Foreign keys enforced (`PRAGMA foreign_keys = ON`)

### IPC
- Channel names: `SCREAMING_SNAKE_CASE` (e.g., `GET_PERSONAS`, `CREATE_MEETING`)
- ElectronAPI methods: `camelCase` (e.g., `getPersonas()`, `createMeeting()`)
- All IPC calls return promises
- Error handling: try/catch in store actions, errors logged to console

### Store
- Single Zustand store (`councilStore.ts`)
- Actions call `window.electronAPI.*` and update local state
- Optimistic updates where appropriate (e.g., adding a message to the list before AI responds)
- Loading states: `loading` (general), `aiLoading` (AI calls)
- Streaming state: `streamingContent`, `streamingPersonaId`

### Components
- One component per file
- File name matches component name: `PersonaBuilder.tsx` → `PersonaBuilder`
- Sub-components in the same file if small and only used by parent
- No `index.tsx` barrel files

### Naming
- Persona-related: `persona`, `personaId`, `currentPersona`
- Skill docs: `skillDoc`, `skillDocs`, `SkillDoc`
- Memories: `memory`, `memories`, `Memory`
- Meetings: `meeting`, `meetingMessages`, `MeetingMessage`
- Action items: `actionItem`, `actionItems`, `ActionItem`
- Decision records: `decisionRecord`, `decisionRecords`, `DecisionRecord`
- Relationships: `relationship`, `relationships`, `Relationship`, `RelationshipType`
- Search: `searchResult`, `searchResults`, `SearchResult`, `SearchResultType`
- Analytics: `costAnalytics`, `CostAnalytics`, `AnalyticsFilters`

## AI Context Building

When sending a message to a persona (solo chat or meeting), the main process builds the full context:

```
System prompt = [
  persona.system_prompt,
  "\n\n--- SKILL DOCS ---\n",
  ...always-loaded skill docs,
  ...relevant skill docs (matched by tags),
  "\n\n--- MEMORIES ---\n",
  ...top N memories by importance + recency,
  "\n\n--- YOUR RELATIONSHIPS ---\n",
  ...relationship descriptions with other meeting participants (from persona_relationships table),
]
```

### Memory Loading Rules
1. Load all memories where `persona_id = current persona` OR `persona_id IS NULL` (shared)
2. Filter out superseded memories (`superseded_by IS NOT NULL`)
3. Sort by importance DESC, then by recency
4. Take top 20 (configurable) to stay within context limits
5. Increment `times_referenced` for loaded memories

### Skill Doc Loading Rules
1. `always` docs: Always included in context
2. `available` docs: Included if relevance_tags overlap with conversation topic
3. `manual` docs: Only included if explicitly selected by user
4. Token budget: Sum token_count, stop loading when budget reached (~8000 tokens default)

## Persona Templates

Pre-built persona templates for quick creation (stored as JS objects, not in DB):

| Template | Role | Model | Temp | Key Traits |
|----------|------|-------|------|------------|
| Developer | Senior Developer | claude-sonnet-4 | 0.5 | Technical, pragmatic, estimates conservatively |
| Marketing | Marketing Strategist | gpt-4o | 0.7 | Data-driven, brand-aware, audience-focused |
| Designer | UX Designer | claude-sonnet-4 | 0.7 | User-centric, visual thinker, detail-oriented |
| Analyst | Data Analyst | gpt-4o | 0.3 | Numbers-focused, evidence-based, skeptical |
| Strategist | Business Strategist | claude-sonnet-4 | 0.7 | Big-picture, competitive-aware, ROI-focused |
| Editor | Editor | claude-sonnet-4 | 0.4 | Precision, clarity, style-conscious |
| Researcher | Research Analyst | claude-sonnet-4 | 0.5 | Thorough, source-citing, nuanced |

## File Organization

```
Features are grouped by domain:
- Persona system: PersonaBuilder, PersonaDetail, SoloChat
- Meeting system: MeetingCreator, MeetingRoom (includes IntelPanel + ItemsPanel + RelationshipPanel)
- Knowledge system: SkillDocEditor, MemoryEditor, MemoryReviewPanel
- Search system: SearchPanel
- Analytics system: AnalyticsPanel
- Navigation: Dashboard, Sidebar, TitleBar
- Settings: SettingsPanel
```
