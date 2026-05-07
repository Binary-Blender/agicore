# NovaSyn Council — State Management

## Overview

Single Zustand store at `src/renderer/store/councilStore.ts`. Same pattern as NovaSyn Writer — all state and actions in one store, components access via `useCouncilStore()`.

## Store Shape

```typescript
interface CouncilStore {
  // ── Data ──
  personas: Persona[];
  meetings: Meeting[];
  settings: Settings;
  apiKeys: Record<string, string>;
  models: AIModel[];

  // ── Current Selection ──
  currentPersona: Persona | null;
  currentConversation: Conversation | null;
  currentMeeting: Meeting | null;

  // ── Conversation State ──
  conversations: Conversation[];
  conversationMessages: ConversationMessage[];
  meetingMessages: MeetingMessage[];

  // ── Skill Docs & Memories ──
  skillDocs: SkillDoc[];
  memories: Memory[];

  // ── Action Items & Decisions ──
  actionItems: ActionItem[];
  decisionRecords: DecisionRecord[];

  // ── Relationships ──
  relationships: Relationship[];

  // ── Search ──
  searchResults: SearchResult[];
  showSearchPanel: boolean;
  searching: boolean;

  // ── Analytics ──
  costAnalytics: CostAnalytics | null;
  showAnalytics: boolean;

  // ── Streaming ──
  streamingContent: string;
  streamingPersonaId: string | null;

  // ── UI Panels ──
  currentView: 'dashboard' | 'persona' | 'meeting';
  showPersonaBuilder: boolean;
  showSkillDocEditor: boolean;
  showMemoryEditor: boolean;
  showMemoryReview: boolean;
  showSettings: boolean;
  showMeetingCreator: boolean;

  // ── Editing State ──
  editingPersona: Persona | null;
  editingSkillDoc: SkillDoc | null;
  editingMemory: Memory | null;

  // ── Loading States ──
  loading: boolean;
  aiLoading: boolean;

  // ── Actions (see below) ──
}
```

## Actions

### Initialization
- `loadSettings()` — Load settings from DB
- `loadApiKeys()` — Load from shared key store
- `loadModels()` — Load available AI models
- `loadPersonas()` — Load all personas
- `loadMeetings()` — Load all meetings

### Persona Management
- `selectPersona(persona)` — Set current persona, load their skill docs, memories, conversations, relationships
- `createPersona(input)` — Create and add to list
- `updatePersona(id, updates)` — Update and refresh list
- `deletePersona(id)` — Delete and clear selection if needed

### Skill Docs
- `loadSkillDocs(personaId)` — Load docs for persona + global
- `createSkillDoc(input)` — Create and refresh
- `updateSkillDoc(id, updates)` — Update and refresh
- `deleteSkillDoc(id)` — Delete and refresh

### Memories
- `loadMemories(personaId)` — Load memories for persona + shared
- `createMemory(input)` — Create and refresh
- `updateMemory(id, updates)` — Update and refresh
- `deleteMemory(id)` — Delete and refresh
- `searchMemories(personaId, query)` — Text search
- `extractMemories(conversationId)` — AI extraction
- `supersedeMemory(oldId, newId)` — Mark old memory as superseded

### Solo Conversations
- `loadConversations(personaId)` — Load conversation list
- `createConversation(personaId, title?)` — Create and select
- `selectConversation(conversation)` — Load messages
- `sendMessage(content)` — Send human message, receive persona response (with streaming)
- `renameConversation(id, title)` — Inline title editing
- `regenerateResponse(conversationId)` — Delete last AI msg + re-call AI
- `exportConversation(conversationId)` — Export as markdown
- `deleteConversation(conversationId)` — Delete and clear

### Meetings
- `createMeeting(input)` — Create and start
- `selectMeeting(meeting)` — Load messages, action items, decision records
- `sendMeetingMessage(content)` — Human message → all personas respond (with streaming)
- `analyzeMeeting()` — AI-powered meeting intelligence
- `endMeeting()` — Complete meeting
- `leaveMeeting()` — Return to dashboard, clear meeting state
- `exportMeeting(meetingId)` — Export as markdown
- `deleteMeeting(id)` — Delete meeting

### Action Items
- `loadActionItems(meetingId)` — Load action items for meeting
- `createActionItem(input)` — Create action item
- `updateActionItem(id, updates)` — Update (status cycling, edits)
- `deleteActionItem(id)` — Delete

### Decision Records
- `loadDecisionRecords(meetingId)` — Load decision records for meeting
- `createDecisionRecord(input)` — Create decision record
- `deleteDecisionRecord(id)` — Delete

### Relationships
- `loadRelationships(personaId)` — Load relationships for persona (also called in selectPersona)
- `createRelationship(input)` — Create relationship and refresh
- `updateRelationship(id, updates)` — Update relationship and refresh
- `deleteRelationship(id)` — Delete relationship and refresh
- `suggestRelationships(personaId)` — AI suggests relationships based on meeting history
- `setShowRelationshipPanel(show)` — Toggle RelationshipPanel visibility
- `setSuggestedRelationships(suggestions)` — Store AI suggestions for review
- `acceptSuggestedRelationship(suggestion)` — Create relationship from AI suggestion

### Search
- `globalSearch(query)` — Search across all tables, sets searchResults
- `setShowSearchPanel(show)` — Toggle SearchPanel visibility

### Analytics
- `loadCostAnalytics(filters?)` — Load cost analytics data, sets costAnalytics
- `setShowAnalytics(show)` — Toggle AnalyticsPanel visibility

### UI Navigation
- `setCurrentView(view)` — Switch main view
- `setShowPersonaBuilder(show)` — Toggle modal
- `setShowSkillDocEditor(show)`
- `setShowMemoryEditor(show)`
- `setShowMemoryReview(show)`
- `setShowSettings(show)`
- `setShowMeetingCreator(show)`
- `setEditingPersona(persona | null)`
- `setEditingSkillDoc(doc | null)`
- `setEditingMemory(memory | null)`

## Navigation Pattern

Council uses a **view-based navigation** driven by `currentView`:

```
Dashboard (home)
  ├── Click persona → Persona detail view (chat + skill docs + memories)
  ├── Click meeting → Meeting room view
  └── Settings button → Settings modal
```

Modals (persona builder, skill doc editor, memory editor, memory review, meeting creator, settings) overlay on top.

## Streaming Pattern

Solo chat and meetings both use IPC event-based streaming:

1. Store registers `onStreamChunk` listener before invoking the IPC call
2. Main process sends `STREAM_CHUNK` events via `event.sender.send()` during AI generation
3. Store accumulates chunks into `streamingContent` state
4. For meetings, `STREAM_PERSONA_START` identifies which persona is streaming
5. On invoke resolve/reject, cleanup function removes the listener
6. `streamingContent` is reset to empty string
