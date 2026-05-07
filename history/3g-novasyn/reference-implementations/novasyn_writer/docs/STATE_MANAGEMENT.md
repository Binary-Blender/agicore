# NovaSyn Writer — State Management Guide

## Overview

State is managed with [Zustand](https://zustand-demo.pmnd.rs/) in a single store at `src/renderer/store/writerStore.ts`. The store holds all application state and exposes async actions that call IPC methods via `window.electronAPI`.

## Store Structure

### State Groups

```ts
interface WriterState {
  // ── Data ──────────────────────────
  projects: Project[];
  currentProject: Project | null;
  chapters: Chapter[];
  currentChapter: Chapter | null;
  sections: Section[];
  currentSection: Section | null;
  encyclopediaEntries: EncyclopediaEntry[];
  outline: Outline | null;
  versions: Version[];

  // ── AI ────────────────────────────
  aiPanelOpen: boolean;
  aiResponse: string;          // accumulated stream text
  aiStreaming: boolean;
  lastOperationId: string | null;  // for accept/reject tracking
  aiOperations: AiOperation[];

  // ── Sessions & Goals ────────────
  currentSession: WriterSession | null;
  sessions: WriterSession[];
  sessionStats: SessionStats | null;
  sessionActive: boolean;
  sessionHeartbeatTimer: ReturnType<typeof setInterval> | null;
  sessionIdleTimer: ReturnType<typeof setTimeout> | null;
  sessionAiWordsAccepted: number;
  sessionAiOpsCount: number;
  goals: WriterGoal[];
  showSessionPanel: boolean;

  // ── Discovery ──────────────────
  discoveryMode: boolean;             // toggle for discovery mode
  discoverySession: DiscoverySession | null;
  discoverySuggestions: DiscoverySuggestion[];  // current batch
  discoveryLoading: boolean;
  discoveryPauseTimer: ReturnType<typeof setTimeout> | null;
  discoverySurprise: number;          // temperature (0.5–1.5, default 1.0)
  discoveryFollowThread: string;      // current direction text
  showDiscoveryLog: boolean;
  discoverySessions: DiscoverySession[];  // history

  // ── Continuity ──────────────────
  plants: ContinuityPlant[];
  threads: ContinuityThread[];
  characterKnowledge: CharacterKnowledge[];
  showContinuityPanel: boolean;
  continuityScanning: boolean;
  continuityScanResults: any[] | null;
  knowledgeVerifyResults: any[] | null;

  // ── Knowledge Base ────────────
  kbEntries: KnowledgeBaseEntry[];
  showKnowledgeBase: boolean;
  kbScanning: boolean;
  kbScanResults: any[] | null;

  // ── Model Comparison ───────────
  showModelComparison: boolean;
  comparisonResults: ModelComparisonResult[];
  comparisonLoading: boolean;

  // ── Brain Dump ─────────────────
  brainDumps: BrainDump[];
  showBrainDump: boolean;
  brainDumpExtracting: boolean;
  brainDumpExtraction: BrainDumpExtraction | null;

  // ── Pipelines ──────────────────
  pipelines: Pipeline[];
  showPipelines: boolean;
  pipelineRunning: boolean;
  pipelineResults: PipelineRunResult[];

  // ── Ambient Sounds ────────────────
  showAmbientSounds: boolean;
  ambientSounds: { id: string; playing: boolean; volume: number }[];
  ambientMasterVolume: number;

  // ── Analysis ──────────────────────
  showAnalysis: boolean;
  analysisRunning: boolean;
  analysisType: string | null;
  analysisResults: any | null;
  readabilityResults: ReadabilityResult | null;
  analyses: Analysis[];

  // ── Character Relationships ───────
  relationships: CharacterRelationship[];
  showRelationshipMap: boolean;
  relationshipScanning: boolean;
  relationshipScanResults: any[] | null;

  // ── Submission Package ────────────
  showSubmissionPackage: boolean;
  submissionGenerating: boolean;
  submissionResult: SubmissionPackageResult | null;

  // ── Dashboard ───────────────────────
  showDashboard: boolean;
  dashboardStats: WritingStats | null;
  dashboardLoading: boolean;

  // ── Cover Designer ─────────────────
  showCoverDesigner: boolean;

  // ── Publishing Presets ──────────────
  showPublishingPresets: boolean;

  // ── Tracked Changes ─────────────────
  showTrackedChanges: boolean;

  // ── Writing Sprint ──────────────────
  showWritingSprint: boolean;

  // ── Page Setup ──────────────────────
  showPageSetup: boolean;

  // ── Feedback Dashboard ──────────────
  showFeedbackDashboard: boolean;

  // ── Plugin System ───────────────────
  showPlugins: boolean;

  // ── NovaSyn Exchange ────────────────
  showExchange: boolean;

  // ── Writing Guide ──────────────────
  showWritingGuide: boolean;
  guideMessages: GuideMessage[];
  guideLoading: boolean;

  // ── Global Search ────────────────
  showGlobalSearch: boolean;
  globalSearchResults: GlobalSearchResult[];
  globalSearchLoading: boolean;

  // ── Timeline ─────────────────────
  showTimeline: boolean;
  timelineEvents: TimelineEvent[];

  // ── Storyboard ───────────────────
  showStoryboard: boolean;
  chapterTargets: ChapterTarget[];

  // ── Config ────────────────────────
  settings: WriterSettings;
  models: AIModel[];
  apiKeys: Record<string, string>;  // provider → key

  // ── UI ────────────────────────────
  sidebarWidth: number;
  showSettings: boolean;
  showExport: boolean;
  showEncyclopediaEditor: boolean;
  editingEncyclopediaEntry: EncyclopediaEntry | null;
  showOutlineEditor: boolean;
  showVersionHistory: boolean;
  showAiLog: boolean;
  distractionFree: boolean;

  // ── Actions (see below) ───────────
}
```

### Default Values

| State | Default | Notes |
|-------|---------|-------|
| `sidebarWidth` | `280` | Clamped to 200–400 |
| `settings.selectedModel` | `'claude-sonnet-4-6'` | Must match a model ID in models.ts |
| `settings.tokenBudget` | `100000` | |
| `settings.autoSaveInterval` | `2000` | Milliseconds |
| `settings.theme` | `'dark'` | Only dark implemented |
| `settings.poetryMode` | `false` | Mutually exclusive with screenplayMode and articleMode |
| `settings.articleMode` | `false` | Mutually exclusive with screenplayMode and poetryMode |
| `settings.typewriterMode` | `false` | Scroll-to-center active line |
| `settings.focusMode` | `false` | Dims non-active paragraphs |
| `settings.showPreview` | `false` | Split preview pane toggle |
| `settings.fontFamily` | `''` | Empty = system default. 7 options |
| `settings.fontSize` | `16` | Range 12–24px |
| `settings.lineHeight` | `1.6` | Range 1.0–3.0 |
| `showTrackedChanges` | `false` | Tracked changes panel toggle |
| `showWritingSprint` | `false` | Writing sprint panel toggle |
| `showPageSetup` | `false` | Page setup dialog toggle |
| `showFeedbackDashboard` | `false` | Feedback dashboard toggle |
| `showPlugins` | `false` | Plugin system panel toggle |
| `showExchange` | `false` | NovaSyn Exchange panel toggle |
| `showWritingGuide` | `false` | Writing Guide panel toggle |
| `guideMessages` | `[]` | Guide conversation history |
| `guideLoading` | `false` | Loading state for guide AI response |
| `showGlobalSearch` | `false` | Global search modal toggle |
| `globalSearchResults` | `[]` | Current search results |
| `globalSearchLoading` | `false` | Loading state for global search |
| `showTimeline` | `false` | Timeline panel toggle |
| `timelineEvents` | `[]` | Timeline events for current project |
| `showStoryboard` | `false` | Storyboard panel toggle |
| `chapterTargets` | `[]` | Per-chapter word count targets |

## Data Flow

### Startup Sequence

```
App mounts
  → loadProjects()       → GET_PROJECTS IPC → set({ projects })
  → loadSettings()       → GET_SETTINGS IPC → set({ settings })
  → loadModels()         → GET_MODELS IPC   → set({ models })
  → loadApiKeys()        → GET_API_KEYS IPC → set({ apiKeys })
```

### Project Selection

```
selectProject(project)
  → set currentProject, clear chapter/section state
  → loadChapters(project.id)    → GET_CHAPTERS IPC
  → loadEncyclopedia()           → GET_ENCYCLOPEDIA IPC
  → auto-select first chapter    → selectChapter(chapters[0])
  → startSession()               → START_SESSION IPC
  → loadSessions/Stats/Goals
  → loadPlants/Threads/CharacterKnowledge
  → loadKbEntries(project.id)   → GET_KB_ENTRIES IPC
  → loadPipelines()             → GET_PIPELINES IPC
  → loadGuideMessages()         → GET_GUIDE_MESSAGES IPC
```

### Chapter Selection

```
selectChapter(chapter)
  → set currentChapter, clear section state
  → loadSections(chapter.id)     → GET_SECTIONS IPC
  → loadOutline(chapter.id)      → GET_OUTLINE IPC
```

### Auto-Save (Editor → Store → DB)

```
User types in TipTap
  → onUpdate callback fires
  → debounce timer resets (settings.autoSaveInterval ms)
  → after debounce: updateChapter(id, { content, wordCount })
      → UPDATE_CHAPTER IPC → SQLite
      → loadChapters(projectId) to refresh sidebar word counts
```

### AI Streaming

```
sendAiPrompt(prompt, modelId, selectedEntryIds, operationType?)
  → set { aiStreaming: true, aiResponse: '', lastOperationId: null }
  → extract chapter text from TipTap JSON
  → format selected encyclopedia entries
  → subscribe to onAiDelta → accumulate aiResponse
  → call SEND_PROMPT IPC (includes projectId, chapterId, operationType)
  → main process auto-logs operation → returns operationId
  → set { lastOperationId: operationId }
  → on complete: unsubscribe, set { aiStreaming: false }

acceptAiResult()
  → updates AI operation as accepted (accepted=1) via IPC
  → clears aiResponse and lastOperationId

discardAiResult()
  → updates AI operation as rejected (accepted=0) via IPC
  → clears aiResponse and lastOperationId
```

### Session Lifecycle

```
selectProject(project)
  → startSession()
    → START_SESSION IPC → creates DB row
    → starts 30s heartbeat timer (heartbeatSession every 30s)
    → starts 15min idle timer (auto-calls endSession on timeout)

User types → resetIdleTimer() → resets 15min idle timeout
  → if no session active, auto-starts one

heartbeatSession()
  → calculates duration, word diff, AI stats
  → UPDATE_SESSION IPC → updates DB row

endSession()
  → clears heartbeat + idle timers
  → END_SESSION IPC → sets ended_at, computes final stats, updates goal streaks
  → reloads sessions, stats, goals
```

### Discovery Mode

```
toggleDiscoveryMode() ON
  → START_DISCOVERY IPC → creates discovery session
  → starts 15s pause timer

User types → resetDiscoveryPause() → resets 15s timer

User pauses 15s → triggerDiscoveryPause() fires
  → generateSuggestions()
    → extracts chapter text + encyclopedia context
    → GENERATE_SUGGESTIONS IPC → AI generates 3 "what if" suggestions
    → stores in DB, returns to renderer
    → set discoverySuggestions

acceptSuggestion(id, action)
  → ACCEPT_SUGGESTION IPC → marks accepted in DB
  → inserts text into editor (insert/replace/new paragraph)
  → removes from discoverySuggestions

toggleDiscoveryMode() OFF
  → END_DISCOVERY IPC → computes final stats
  → clears all discovery state
```

## Action Patterns

### CRUD Pattern

All entity types follow the same pattern:

```ts
// Create
createEntity: async (params) => {
  await window.electronAPI.createEntity(params);
  await get().loadEntities();  // refresh list
}

// Update
updateEntity: async (id, updates) => {
  await window.electronAPI.updateEntity(id, updates);
  await get().loadEntities();  // refresh list
  // Also update currentEntity if it's the one being edited
  if (currentEntity?.id === id) {
    set({ currentEntity: { ...currentEntity, ...updates } });
  }
}

// Delete
deleteEntity: async (id) => {
  await window.electronAPI.deleteEntity(id);
  await get().loadEntities();  // refresh list
  // Clear current if it was deleted
  if (currentEntity?.id === id) {
    set({ currentEntity: null });
  }
}
```

### UI Toggle Pattern

Simple boolean toggles for modals and panels:

```ts
setShowModal: (show) => set({ showModal: show })
togglePanel: () => set((s) => ({ panelOpen: !s.panelOpen }))
```

### Constrained Value Pattern

For values with min/max bounds:

```ts
setSidebarWidth: (width) => set({ sidebarWidth: Math.max(200, Math.min(400, width)) })
```

## Accessing the Store

### In Components

```tsx
import { useWriterStore } from '../store/writerStore';

function MyComponent() {
  const { currentChapter, updateChapter } = useWriterStore();
  // ...
}
```

### Outside React (e.g., event handlers)

```ts
const state = useWriterStore.getState();
const chapters = state.chapters;
```

### Subscribing to Changes

```ts
// Subscribe to specific state changes
useWriterStore.subscribe(
  (state) => state.currentChapter,
  (chapter) => { /* react to change */ }
);
```

## Helper Functions

### `extractTextFromDoc(node)`

Located at the bottom of `writerStore.ts`. Recursively extracts plain text from TipTap JSON for AI context assembly.

```ts
function extractTextFromDoc(node: any): string {
  if (node.type === 'text') return node.text || '';
  if (node.content && Array.isArray(node.content)) {
    return node.content
      .map(child => extractTextFromDoc(child))
      .join(node.type === 'paragraph' || node.type === 'heading' ? '\n' : '');
  }
  return '';
}
```

**Note**: A duplicate exists in `src/main/index.ts:extractText()` for the export handler. Future work should consolidate these into a shared utility.

## Adding New State

1. Add the state field to `WriterState` interface
2. Add default value in `create<WriterState>((set, get) => ({ ... }))`
3. Add action methods to the interface and implementation
4. For IPC-backed state: add the IPC channel in `types.ts`, preload bridge, and main handler first
5. Use `set()` for synchronous updates, `await` + IPC for persisted data

## Gotchas

- **Stale closures**: Use `get()` inside async actions to read current state, not destructured values from outer scope
- **Re-render optimization**: Zustand only re-renders when the selected state slice changes. Destructure only what you need
- **Load after mutate**: After create/update/delete IPC calls, always reload the entity list to ensure consistency
- **AI delta accumulation**: Uses the functional updater `set((s) => ({ aiResponse: s.aiResponse + text }))` to avoid race conditions during fast streaming
