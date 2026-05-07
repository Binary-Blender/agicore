# NovaSyn Writer — Component Guide

## Overview

All React components live in `src/renderer/components/`. The root component is `src/renderer/App.tsx`. All components consume state from the Zustand store (`useWriterStore`).

## Layout

```
┌─────────────────────────────────────────────────────────────────────┐
│ TitleBar (App.tsx — drag region + window controls)                  │
├──────────┬───────────────────────────────────────┬──────────────────┤
│          │ EditorToolbar             [Preview]    │                  │
│ Sidebar  ├──────────────────┬────────────────────┤   AIPanel        │
│ (resize) │                  │ PreviewPane        │ (toggle, 320px)  │
│ 200-400  │ Editor           │ (toggle, 50%)      │                  │
│          │ (TipTap)         │ Print-style WYSIWYG│   CommentsPanel  │
│          │                  │                    │ (toggle, 264px)  │
│          ├──────────────────┴────────────────────┤                  │
│          │ Status bar: words | chars | sentences │                  │
│          │ | paragraphs | read time | Flesch     │                  │
├──────────┴───────────────────────────────────────┴──────────────────┤
│ Modals: SettingsPanel, ExportModal, EncyclopediaEditor,             │
│         OutlineEditor, VersionHistoryPanel, AiOperationLog,         │
│         SessionPanel, DiscoveryLog, ContinuityPanel,                │
│         KnowledgeBasePanel, ModelComparisonPanel,                   │
│         BrainDumpPanel, PipelinePanel, AnalysisPanel,               │
│         RelationshipMapPanel, SubmissionPackagePanel,               │
│         WritingDashboardPanel, AmbientSoundsPanel (popover),        │
│         CoverDesignerPanel, PublishingPresetsPanel,                  │
│         TrackedChangesPanel, WritingSprintPanel, PageSetupPanel,    │
│         FeedbackDashboardPanel, PluginsPanel, ExchangePanel,        │
│         WritingGuidePanel, GlobalSearchPanel, TimelinePanel,        │
│         StoryboardPanel, OnboardingScreen                           │
└─────────────────────────────────────────────────────────────────────┘
```

## Component Reference

### `App.tsx` — Root Component

**Role**: Layout orchestrator, keyboard shortcuts, initial data loading.

**Layout**: Three-panel flex row — Sidebar | Editor area | AI Panel (conditional).

**Key behaviors**:
- On mount: calls `loadProjects()`, `loadSettings()`, `loadModels()`, `loadApiKeys()`
- Shows `OnboardingScreen` when `projects.length === 0`
- Shows "No chapter selected" placeholder when `currentChapter` is null
- Keyboard shortcuts: `Ctrl+Shift+A` (toggle AI), `Ctrl+N` (new chapter), `Ctrl+Shift+E` (Expand), `Ctrl+Shift+R` (Rewrite), `Ctrl+Shift+C` (Continue), `F11` (distraction-free), `Esc` (exit distraction-free)
- Distraction-free mode: hides TitleBar, Sidebar, EditorToolbar, AI Panel; shows floating "Exit (F11)" button on hover

**Contains**: `TitleBar` inner component (frameless window controls).

**Store dependencies**: `projects`, `currentProject`, `currentChapter`, `aiPanelOpen`, `distractionFree`, `settings`, `showSettings`, `showExport`, `showEncyclopediaEditor`, `showOutlineEditor`, `showVersionHistory`, `showAiLog`, `showSessionPanel`, `showDiscoveryLog`, `showContinuityPanel`, `showKnowledgeBase`, `showModelComparison`, `showBrainDump`, `showPipelines`, `showAnalysis`, `showAmbientSounds`, `showRelationshipMap`, `showSubmissionPackage`, `showDashboard`, `showCoverDesigner`, `showPublishingPresets`, `showGlobalSearch`, `showTimeline`, `showStoryboard`

---

### `Sidebar.tsx` — Navigation Panel

**Role**: Project selection, chapter/section tree, encyclopedia list, bottom toolbar.

**Width**: Resizable via drag handle (200–400px, stored in `sidebarWidth`).

**Sections (top to bottom)**:
1. **Project selector** — `<select>` dropdown, triggers `selectProject()`
2. **Chapter list** — click to select, double-click to rename, delete on `x` hover button. Chapters are draggable for reorder (HTML5 drag-and-drop). Template picker dropdown ("T" button) next to "+ New" chapter button.
3. **Sections** — nested under each chapter (expand/collapse toggle), only visible for the currently selected chapter
4. **Encyclopedia** — collapsible, click entry opens `EncyclopediaEditor` in edit mode
5. **Bottom toolbar** — Dashboard, Import, Backup, Restore, Sessions, Continuity, Knowledge, Dump, Compare, Pipelines, Analyze, Relations, Submit, Cover, Publish, Sounds, Outline, History, AI Log, Export, Settings buttons

**Chapter Templates**: Defined as `CHAPTER_TEMPLATES` constant — 6 templates (Blank, Scene, Flashback, Action Sequence, Dialogue Heavy, Opening Chapter). Each template provides TipTap JSON content with placeholder text. Template picker is a dropdown next to the "+ New" button; selecting a template creates a new chapter and applies the template content.

**Drag & Drop Reorder**: Chapters use HTML5 drag-and-drop attributes (`draggable`, `onDragStart`, `onDragOver`, `onDrop`, `onDragEnd`). Visual feedback: dragged item becomes semi-transparent (opacity 0.5), drop target shows a blue top border. On drop, calls the existing `reorderChapters` IPC with the new order.

**Local state**:
- `renamingChapterId` / `renameValue` — inline chapter rename
- `expandedSections: Set<string>` — which chapters have sections expanded
- `showEncyclopedia: boolean` — encyclopedia list toggle
- `showTemplateDropdown: boolean` — template picker dropdown visibility
- `draggedChapterId: string | null` — currently dragged chapter
- `dragOverChapterId: string | null` — current drop target chapter
- `isResizing: Ref` — resize drag state

**Word count display**: `chapter.wordCount ?? 0` (row mappers handle snake_case conversion)

---

### `Editor.tsx` — TipTap Rich Text Editor

**Role**: Main writing surface. Loads chapter content as TipTap JSON, debounced auto-save.

**TipTap extensions**:
- `StarterKit` (bold, italic, strike, headings, lists, blockquote, code block, HR, history)
- `Placeholder` ("Start writing...")
- `CharacterCount`
- `Highlight`

**Key behaviors**:
- Loads `currentChapter.content` via `editor.commands.setContent(JSON.parse(content))`
- `isSettingContent` ref guard prevents auto-save when programmatically loading content
- `onUpdate` fires debounced save: `updateChapter(id, { content: JSON.stringify(editor.getJSON()), wordCount: editor.storage.characterCount.words() })`
- Debounce interval from `settings.autoSaveInterval` (default 2000ms)
- Exposes editor globally via `window.__tiptapEditor` for toolbar and AI panel access

**Discovery integration**: When `discoveryMode` is true, resets the discovery pause timer on every keystroke and renders `DiscoveryPanel` as a floating overlay.

**Screenplay mode**: When `settings.screenplayMode` is enabled, applies the `screenplay-mode` CSS class to the editor container. This triggers CSS rules in `globals.css` that remap TipTap elements to screenplay formatting (H1=Scene Heading, H2=Character Name, H3=Parenthetical, Blockquote=Dialogue, Code=Transition) with Courier New monospace font.

**Poetry mode**: When `settings.poetryMode` is enabled, applies the `poetry-mode` CSS class to the editor container. CSS rules in `globals.css` center text and remap elements (H1=Title, H2=Section, H3=Note, HR=Stanza Break, Blockquote=Epigraph). Mutually exclusive with Screenplay Mode and Article Mode.

**Article mode**: When `settings.articleMode` is enabled, applies the `article-mode` CSS class to the editor container. CSS rules in `globals.css` apply Georgia serif font, pull quote styling, and sidebar note formatting. Mutually exclusive with Screenplay Mode and Poetry Mode.

**Typewriter mode**: When `settings.typewriterMode` is enabled, scrolls the active line to the vertical center of the editor. CSS in `globals.css` adds 45vh padding to create the centered writing effect.

**Focus mode**: When `settings.focusMode` is enabled, applies the `focus-mode` CSS class and uses `@tiptap/extension-focus` to dim non-active paragraphs, keeping attention on the current paragraph.

**Chapter notes**: Inline chapter notes panel with auto-save functionality. Notes are per-chapter and persisted via GET_CHAPTER_NOTES / SAVE_CHAPTER_NOTE IPC channels using the `writer_chapter_notes` table.

**Typography**: Reads `settings.fontFamily`, `settings.fontSize`, and `settings.lineHeight` and sets inline CSS custom properties (`--editor-font`, `--editor-font-size`, `--editor-line-height`) on the editor container. `globals.css` applies these variables to the TipTap editor content.

**Find & Replace**: Handles `Ctrl+F` keydown to toggle the `FindReplaceBar` component. The bar renders inside the editor container, positioned absolute top-right.

**Split preview pane**: When `settings.showPreview` is enabled, renders the `PreviewPane` component alongside the editor in a side-by-side layout (50/50 split). Toggle via "Preview" button in EditorToolbar.

**Inline comments**: Renders `CommentsPanel` as a 264px sidebar when `showComments` state is true. Comments are anchored to text ranges (fromPos/toPos) and support CRUD, filtering (All/Open/Resolved), and click-to-navigate.

**Enhanced status bar**: Shows word count, character count, sentence count, paragraph count, reading time (250 wpm), and Flesch Reading Ease score. The Flesch score is color-coded: green (60+, easy), yellow (30-59, moderate), red (<30, difficult). Uses a `countSyllables` helper function for Flesch computation.

**Store dependencies**: `currentChapter`, `settings.autoSaveInterval`, `settings.screenplayMode`, `settings.poetryMode`, `settings.articleMode`, `settings.typewriterMode`, `settings.focusMode`, `settings.showPreview`, `settings.fontFamily`, `settings.fontSize`, `settings.lineHeight`, `updateChapter`, `discoveryMode`, `resetDiscoveryPause`

---

### `EditorToolbar.tsx` — Formatting Controls

**Role**: Toolbar buttons for text formatting commands.

**Buttons**: Bold, Italic, Strike, Highlight, H1, H2, H3, Bullet List, Ordered List, Blockquote, Code Block, HR, Undo, Redo, Screenplay Mode toggle, Poetry Mode toggle, Article Mode toggle, Typewriter Mode (TW) toggle, Focus Mode toggle, Preview toggle, Discovery Mode toggle, AI Panel toggle

**Screenplay Mode**: Toggle button that enables/disables `settings.screenplayMode`. When active, shows a formatting legend mapping TipTap elements to screenplay roles (H1=Scene Heading, H2=Character Name, H3=Parenthetical, Blockquote=Dialogue, Code=Transition). Toggling on disables Poetry Mode and Article Mode.

**Poetry Mode**: Toggle button that enables/disables `settings.poetryMode`. When active, shows a formatting legend mapping TipTap elements to poetry roles (H1=Title, H2=Section, H3=Note, HR=Stanza Break, Blockquote=Epigraph). Toggling on disables Screenplay Mode and Article Mode.

**Article Mode**: Toggle button that enables/disables `settings.articleMode`. When active, shows a formatting legend for article-specific styling (Georgia serif, pull quotes, sidebar notes). Toggling on disables Screenplay Mode and Poetry Mode. All three writing modes (Screenplay, Poetry, Article) are mutually exclusive.

**Typewriter Mode**: Toggle button (labeled "TW") that enables/disables `settings.typewriterMode`. Scrolls the active line to the vertical center of the editor for a focused writing experience.

**Focus Mode**: Toggle button that enables/disables `settings.focusMode`. Dims non-active paragraphs using @tiptap/extension-focus so only the current paragraph is fully visible.

**Editor access**: Reads `window.__tiptapEditor` global.

**Active state**: Buttons highlight when the corresponding format is active at the cursor position (e.g., `editor.isActive('bold')`).

**Command pattern**: `editor.chain().focus().toggleBold().run()`

---

### `AIPanel.tsx` — AI Writing Assistant

**Role**: Slide-in right panel (320px) for AI-powered writing tools.

**AI tools** (defined in `AI_TOOLS` array):
| ID | Label | Behavior |
|----|-------|----------|
| `continue` | Continue Writing | Generates 2-3 paragraphs continuing from current text |
| `expand` | Expand | Adds detail and depth to selected/current text |
| `rewrite` | Rewrite | Improves clarity, flow, engagement |
| `brainstorm` | Brainstorm | Provides 3-5 creative suggestions |
| `dialogue` | Dialogue Polish | Makes dialogue sound natural and distinctive |
| `show` | Show Don't Tell | Rewrites prose with sensory details |
| `compress` | Compress | Tightens verbose passages |
| `tone` | Tone Shift | Shifts tone (6 presets: darker, lighter, tense, reflective, urgent, dreamlike) |
| `summarize` | Summarize | Concise summary of selected text |
| `scene` | Scene from Beat | Generates full scene from outline beat |
| `voice` | Voice Match | Analyzes writing sample, rewrites selected text to match voice/style |
| `dialogueGen` | Dialogue Gen | Select two encyclopedia characters + scene, generates dialogue |
| `custom` | Custom Prompt | User enters free-form prompt |

**Context injection**:
- If text is selected in the editor, it's appended to the prompt as "Selected text:"
- Encyclopedia entries can be toggled via checkboxes
- Current chapter content is always included (assembled in store)

**Workflow**: Generate → stream response → display → Accept & Insert (inserts at cursor, marks operation accepted) or Discard (marks operation rejected)

**Cancel**: During streaming, Generate button becomes Cancel button (calls `cancelStream()` IPC).

**Local state**: `selectedTool`, `customPrompt`, `selectedModel`, `selectedEntryIds`, `selectedKbIds`, `selectedTone`, `voiceSample`, `dialogueCharA`, `dialogueCharB`, `dialogueScene`

**Store dependencies**: `aiResponse`, `aiStreaming`, `settings`, `models`, `apiKeys`, `encyclopediaEntries`, `kbEntries`, `sendAiPrompt`, `acceptAiResult`, `discardAiResult`

---

### `EncyclopediaEditor.tsx` — Enhanced Entry Create/Edit Modal

**Role**: Modal for creating/editing encyclopedia entries with structured profiles and AI-powered features.

**Tabs**:
- **Edit/Create** — entry form with name, category, content, section templates
- **Extract from Manuscript** — AI scans chapters and suggests new entries not yet tracked
- **Check Consistency** — AI compares encyclopedia against manuscript for inconsistencies

**Fields**:
- Name (text input)
- Category (select: Character, Location, Item, Lore, Other)
- Content (textarea) with optional section templates

**AI Features**:
- **Insert Template** — adds structured section headers for Character (Physical, Personality, Voice, Arc, Relationships, Strengths, Notable) or Location (Description, Atmosphere, History, Features, Characters, Sensory)
- **AI Generate Profile** — sends notes to AI, returns structured profile text (replaces content)
- **Extract from Manuscript** — scans all chapters for untracked characters, locations, items, lore; shows "Add" button per result
- **Check Consistency** — compares encyclopedia entries against manuscript text; shows inconsistencies with suggestions

**Modes**: Create (blank form) or Edit (pre-filled from `editingEncyclopediaEntry`).

**Token display**: Shows `Math.ceil(content.length / 4)` as approximate token count.

**Local state**: `name`, `category`, `content`, `generating`, `extracting`, `checking`, `extractedEntries`, `consistencyIssues`, `activeTab`

**Store dependencies**: `editingEncyclopediaEntry`, `encyclopediaEntries`, `createEncyclopediaEntry`, `updateEncyclopediaEntry`, `deleteEncyclopediaEntry`, `setShowEncyclopediaEditor`

---

### `OutlineEditor.tsx` — Chapter Beat Outline

**Role**: Modal for managing a chapter's outline beats (ordered string list).

**Features**:
- Add new beat (text input + Enter to submit)
- Edit existing beat (double-click → inline edit)
- Delete beat
- Reorder beats (Move Up / Move Down buttons)
- Auto-saves on every change via `saveOutline(beats)`

**Data**: Beats are stored as `JSON string[]` in the `outlines` table. One outline per chapter (UNIQUE constraint on `chapter_id`).

**Store dependencies**: `outline`, `currentChapter`, `saveOutline`, `setShowOutlineEditor`

---

### `ExportModal.tsx` — Export Dialog

**Role**: Modal for exporting project content.

**Options**:
- Format: Markdown, Plain Text, Word (.docx), EPUB (.epub), HTML (.html), Audiobook Script (.txt), PDF (.pdf)
- Scope: All Chapters or Current Chapter only
- DOCX: Manuscript Format (Times New Roman 12pt, double-spaced), Include Title Page, Include TOC
- EPUB/HTML/PDF: Author Name input, Include Title Page, Include TOC
- PDF: Uses Electron's built-in `printToPDF` via hidden BrowserWindow (no new dependencies)
- Audiobook: TTS-ready .txt with [CHAPTER], [PAUSE], [END OF BOOK] markers; text normalization (whitespace, ellipsis to pause commas, em-dash spacing)
- Book formats (DOCX/EPUB/HTML/PDF) share common options panel

**Flow**: Calls `exportProject(projectId, { format, scope, chapterId?, manuscriptFormat?, includeTitlePage?, includeToc?, authorName? })` → main process shows native save dialog → writes file.

**Store dependencies**: `currentProject`, `currentChapter`, `setShowExport`

---

### `SettingsPanel.tsx` — App Settings Modal

**Role**: Modal for configuring app settings and API keys.

**Sections**:
1. **Model Selection** — Radio buttons grouped by provider (Anthropic, OpenAI, Google, xAI)
2. **API Keys** — Masked input per provider. Shows "Shared with NovaSyn Suite" note
3. **System Prompt** — Textarea for custom AI system prompt
4. **Auto-Save Interval** — Range slider (500ms–10000ms)
5. **Theme** — Dark, Light, Sepia selector with color preview swatches. Live preview on click.
6. **Typography** — Font family dropdown (7 options: System Default, Georgia, Garamond, Palatino, Times New Roman, Merriweather, Lora), font size slider (12–24px), line height slider (1.0–3.0). Persisted in WriterSettings.

**Store dependencies**: `settings`, `models`, `apiKeys`, `saveSettings`, `setApiKey`, `setShowSettings`

---

### `OnboardingScreen.tsx` — First-Run Screen

**Role**: Shown when no projects exist. Guides user to create first project.

**UI**: Centered card with project name input, optional description, and "Create Project" button. Includes feature highlights (Rich Editor, AI Assistant, Encyclopedia).

**Flow**: On submit, calls `createProject(name, description)` which also creates Chapter 1.

**Store dependencies**: `createProject`

---

### `EditorContextMenu.tsx` — Right-Click AI Menu

**Role**: Positioned popup showing AI tools when text is selected and right-clicked in the editor.

**Triggers**: `onContextMenu` in `Editor.tsx` — only shows when text is selected (from !== to).

**Tools shown**: Rewrite, Expand, Compress, Show Don't Tell, Dialogue Polish, Summarize.

**Behavior**: Clicking a tool opens the AI panel (if closed) and immediately sends the prompt with the selected text. Closes on outside click or Escape.

**Props**: `x`, `y` (mouse coordinates), `selectedText`, `onClose`, `onToolSelect`

---

### `VersionHistoryPanel.tsx` — Version History Modal

**Role**: Modal showing all version snapshots for the current chapter, with side-by-side diff comparison.

**Features**:
- "Save Checkpoint" button → prompts for name, creates manual version
- Version list with source badges (Auto / Checkpoint / AI), relative timestamps, word count with diff
- Restore button (with confirmation — creates pre-restore auto-snapshot)
- Delete button (with confirmation)
- **Compare flow**: Two-click selection — click Compare on first version (highlights it), click Compare on second → shows diff view
- **Diff view**: Expanded modal (900px), LCS-based diff algorithm, color-coded lines (green=added, red=removed, prefixed +/-/space)
- **Helper functions**: `computeDiff()` (LCS algorithm), `extractText()`, `versionToText()`

**Data**: Loads versions on mount via `loadVersions()`. Versions sorted by `created_at DESC`.

**Local state**: `snapshotName`, `showNameInput`, `diffVersionA`, `diffVersionB`, `showDiff`

**Store dependencies**: `versions`, `currentChapter`, `loadVersions`, `createVersion`, `restoreVersion`, `deleteVersion`, `setShowVersionHistory`

---

### `AiOperationLog.tsx` — AI Operation Log Modal

**Role**: Modal showing all AI operations for the current project with ratings and contribution metrics.

**Features**:
- Summary stats bar: total operations, accepted %, total tokens, average rating, contribution metrics (human % / AI %)
- **Star ratings**: `StarRating` component with hover+click on each operation row (1-5 stars)
- **Contribution bar**: Visual progress bar showing human (primary) vs AI (accent) word contribution
- Expandable operation rows with: operation type badge (color-coded), model, prompt preview, star rating, accepted/rejected status, tokens, timestamp
- Expanded view shows full prompt and response with detailed token breakdown
- **Contribution calculation**: AI words estimated from accepted operation response word counts

**Data**: Loads operations on mount via `loadAiOperations()`. Operations sorted by `created_at DESC`, limited to 100.

**Sub-components**: `StarRating` (hover+click 5-star widget), `OperationRow` (expandable row)

**Store dependencies**: `aiOperations`, `chapters`, `loadAiOperations`, `setShowAiLog`

---

### `SessionPanel.tsx` — Session Tracking & Goals Modal

**Role**: Modal showing writing session stats and daily word count goals.

**Features**:
- Current session stats (duration, words added, AI words accepted, AI ops)
- Session stats summary (today words, week words, avg session minutes, total sessions, most productive hour)
- Daily goal management (set target, view current/longest streak)
- Past sessions list with word count diffs

**Data**: Loads sessions, stats, and goals on mount.

**Store dependencies**: `currentSession`, `sessions`, `sessionStats`, `goals`, `sessionActive`, `loadSessions`, `loadSessionStats`, `loadGoals`, `setGoal`, `deleteGoal`, `setShowSessionPanel`

---

### `DiscoveryPanel.tsx` — Floating Suggestion Panel

**Role**: Floating panel anchored to bottom-right of editor area (not a modal — stays visible while writing).

**Sections (top to bottom)**:
1. **Header**: "Discovery Mode" with off button
2. **Surprise slider**: Temperature control (0.5–1.5), labeled "Focused" to "Wild"
3. **Follow Thread**: Text input for direction guidance
4. **Generate button**: Manual trigger for suggestions
5. **Suggestions**: Up to 3 cards, each with text + Insert/Replace/New ¶/Dismiss actions
6. **Footer**: Accepted count + "View Log" link

**Position**: `absolute bottom-4 right-4` within the editor container (Editor.tsx has `relative` positioning).

**Store dependencies**: `discoverySuggestions`, `discoveryLoading`, `discoverySurprise`, `discoveryFollowThread`, `discoverySession`, `discoveryMode`, `toggleDiscoveryMode`, `generateSuggestions`, `acceptSuggestion`, `dismissSuggestion`, `setFollowThread`, `setDiscoverySurprise`, `setShowDiscoveryLog`

---

### `DiscoveryLog.tsx` — Discovery Session History Modal

**Role**: Modal showing discovery session history and export functionality.

**Features**:
- Current active session stats (if discovery mode is on)
- Past sessions list with date, generated/accepted counts, follow thread
- Export button per session — extracts accepted suggestions as copyable text
- Copy to clipboard button for exported text

**Store dependencies**: `discoverySession`, `discoverySessions`, `discoveryMode`, `setShowDiscoveryLog`, `loadDiscoverySessions`

---

### `ContinuityPanel.tsx` — Continuity Tracking Modal

**Role**: Modal with tabbed interface for tracking narrative continuity.

**Tabs**:
1. **Plants** — Foreshadowing setup→payoff pairs. Add/edit plants with name, setup chapter, setup content, payoff chapter, payoff content, status (planned/setup/resolved), notes. AI "Scan for Plants" button scans manuscript.
2. **Threads** — Unresolved plot questions. Add/edit threads with question, raised chapter, target chapter, status (open/resolved), notes. AI "Scan for Threads" button scans manuscript.
3. **Knowledge** — Character knowledge states per chapter. Track what characters know/don't know. AI "Verify" button checks for consistency violations.

**AI scan results**: Displayed as cards below the form area with formatted suggestions/issues.

**Store dependencies**: `plants`, `threads`, `characterKnowledge`, `chapters`, `encyclopediaEntries`, `continuityScanning`, `continuityScanResults`, `knowledgeVerifyResults`, `createPlant`, `updatePlant`, `deletePlant`, `createThread`, `updateThread`, `deleteThread`, `createCharacterKnowledge`, `updateCharacterKnowledge`, `deleteCharacterKnowledge`, `scanForPlants`, `scanForThreads`, `verifyKnowledge`, `setShowContinuityPanel`, `clearScanResults`

---

### `KnowledgeBasePanel.tsx` — Knowledge Base Modal

**Role**: Modal for managing knowledge base entries — a flexible store for ideas, writing samples, frameworks, voice profiles, and research.

**Features**:
- **Category filter** dropdown (All / Ideas / Stories / Frameworks / Voice Profile / Research)
- **Scope filter** (All / Project / Global) — global entries visible across all projects
- **Add Entry** form with title, category select, content textarea, global toggle
- **Inline editing** — click any entry to edit in place
- **AI tools**: "Find Connections" (between entries), "Suggest Gaps" (what's missing), "Analyze Voice" (on Voice Profile/Stories entries)
- **AI results section** — displays voice analysis, connection suggestions, or gap suggestions as cards

**Category badge colors**: Ideas (blue), Stories (purple), Frameworks (green), Voice Profile (orange), Research (cyan)

**Local state**: `categoryFilter`, `scopeFilter`, `editingId`, `addingEntry`, `form`

**Store dependencies**: `kbEntries`, `kbScanning`, `kbScanResults`, `currentProject`, `setShowKnowledgeBase`, `createKbEntry`, `updateKbEntry`, `deleteKbEntry`, `kbAnalyzeVoice`, `kbFindConnections`, `kbSuggestGaps`, `clearKbScanResults`

---

### `ModelComparisonPanel.tsx` — Side-by-Side Model Comparison

**Role**: Modal for sending the same prompt to 2-3 AI models simultaneously and comparing results side by side.

**Features**:
- **Model selector** — click to toggle models (max 3), shows available models with API keys
- **Writing tool selector** — Continue, Expand, Rewrite, Brainstorm, Custom
- **Encyclopedia context** — checkboxes to include encyclopedia entries
- **Side-by-side results** — 2-col or 3-col grid depending on model count
- **Accept & Insert** — pick the best result, inserts into editor
- **Star rating** — rate each model's output (1-5 stars)
- **Auto-logs** each result as an AI operation

**Local state**: `selectedTool`, `customPrompt`, `selectedModelIds`, `selectedEntryIds`, `pickedIndex`

**Store dependencies**: `models`, `apiKeys`, `encyclopediaEntries`, `comparisonResults`, `comparisonLoading`, `compareModels`, `setShowModelComparison`, `clearComparisonResults`

---

### `BrainDumpPanel.tsx` — Brain Dump Mode

**Role**: Modal for zero-friction thought capture with AI extraction into structured content.

**Features**:
- **Text capture** — large textarea for stream-of-consciousness writing (Ctrl+Enter to save)
- **AI extraction** — parses dumps into: ideas, encyclopedia entries, outline beats, questions
- **Apply results** — "Add" buttons for encyclopedia entries, "Add All to Outline" for beats
- **CRUD** — create, edit, delete brain dumps; extraction status badge
- **Dump list** — reverse-chronological with relative timestamps

**Local state**: `dumpText`, `editingId`, `editText`

**Store dependencies**: `brainDumps`, `brainDumpExtracting`, `brainDumpExtraction`, `loadBrainDumps`, `createBrainDump`, `updateBrainDump`, `deleteBrainDump`, `extractBrainDump`, `clearBrainDumpExtraction`, `setShowBrainDump`, `createEncyclopediaEntry`, `saveOutline`, `outline`

---

### `PipelinePanel.tsx` — Transformation Pipelines

**Role**: Modal for building and running multi-step AI transformation pipelines.

**Features**:
- **Run tab** — select a pipeline, provide input text (or use editor selection), run and view step-by-step results
- **Build tab** — create custom pipelines with named steps and prompt templates using `{{input}}` variable
- **Pre-built templates** — Expand & Polish, Draft→Edit→Tighten, Show Don't Tell→Dialogue, Outline→Scene→Refine
- **Step-by-step results** — each step's output displayed with token count and error handling
- **Accept final result** — insert the last step's output into editor
- **Pipeline management** — edit/delete custom pipelines

**Local state**: `activeTab`, `selectedPipelineId`, `inputText`, `builderName`, `builderDesc`, `builderSteps`, `editingPipelineId`

**Store dependencies**: `pipelines`, `pipelineRunning`, `pipelineResults`, `loadPipelines`, `createPipeline`, `updatePipeline`, `deletePipeline`, `runPipeline`, `clearPipelineResults`, `setShowPipelines`

---

### `AnalysisPanel.tsx` — Manuscript Analysis Modal

**Role**: Modal with 4-tab interface for running various manuscript analyses.

**Tabs**:
1. **Readability** — Instant local computation (no AI). Flesch-Kincaid grade level, average sentence/word length, paragraph count, dialogue percentage, overused words (stop-word filtered), sentence length histogram.
2. **Pacing** — AI-powered. Classifies each chapter's content into segments (Action, Dialogue, Description, Exposition, Reflection, Transition) with proportions. Displays as stacked horizontal bars per chapter.
3. **Voice Audit** — AI-powered. Compares dialogue voice across characters. Shows similarity scores, examples, and suggestions per character pair.
4. **Consistency** — AI-powered. Cross-references encyclopedia entries against manuscript text. Shows contradiction cards with entry name, chapter, quoted text, and suggestion.

**Features**:
- **Scope selector** — Whole project or current chapter
- **Analysis history** — past results stored in DB, re-viewable from a list
- **Delete analysis** — remove stored results

**Local state**: `activeTab`, `scope`

**Store dependencies**: `showAnalysis`, `analysisRunning`, `analysisType`, `analysisResults`, `readabilityResults`, `analyses`, `currentProject`, `currentChapter`, `chapters`, `setShowAnalysis`, `runAnalysis`, `loadAnalyses`, `deleteAnalysis`, `loadReadability`, `clearAnalysisResults`

---

### `AmbientSoundsPanel.tsx` — Ambient Sounds Popover

**Role**: Floating popover (not full modal) anchored to bottom-left of the screen for background ambient sound mixing.

**Features**:
- **6 sound cards**: Rain, Coffee Shop, Forest, Fireplace, Ocean, Night — each with emoji icon
- **Per-sound controls**: Play/pause toggle button, volume slider
- **Master volume** slider affecting all sounds
- **"Stop All"** button
- **Animated bars** indicator when a sound is playing
- **Click-outside** to close

**Audio implementation**:
- Uses HTML5 `Audio` API with module-level `Map<string, HTMLAudioElement>` cache
- Audio elements persist across component re-renders
- Sound files expected at `./sounds/{id}.mp3` relative to renderer
- `useEffect` syncs Zustand store state with actual audio playback

**Local state**: None (all state in Zustand store for persistence)

**Store dependencies**: `showAmbientSounds`, `ambientSounds`, `ambientMasterVolume`, `setShowAmbientSounds`, `setAmbientSoundPlaying`, `setAmbientSoundVolume`, `setAmbientMasterVolume`, `stopAllSounds`

---

### `RelationshipMapPanel.tsx` — Character Relationship Map

**Role**: Modal with visual graph and list views for managing character relationships.

**Tabs**:
1. **Map** — Canvas-based graph visualization. Characters rendered as draggable circular nodes. Relationships as color-coded lines between nodes. Nodes arranged in a circle initially, drag to rearrange.
2. **List** — Tabular list of all relationships with inline edit and delete.

**Features**:
- **Add Relationship** — Select two characters, pick relationship type, add description
- **AI Scan** — Scans manuscript to auto-detect character relationships
- **Drag nodes** — Click and drag character nodes on the canvas
- **Color-coded edges** — Each relationship type has a distinct color with legend
- **9 relationship types**: family, romantic, friend, rival, mentor, ally, enemy, colleague, acquaintance

**Canvas implementation**: Uses HTML5 Canvas API with manual hit-testing for node interaction. Renders edges first (lines with midpoint labels), then nodes (circles with text).

**Local state**: `activeTab`, `addingRelationship`, form fields, `editingId`, `nodes` (position state), `draggingNode`, `hoveredNode`

**Store dependencies**: `relationships`, `encyclopediaEntries`, `relationshipScanning`, `relationshipScanResults`, `setShowRelationshipMap`, `createRelationship`, `updateRelationship`, `deleteRelationship`, `scanRelationships`, `clearRelationshipScanResults`

---

### `SubmissionPackagePanel.tsx` — Submission Package Generator

**Role**: Modal for generating AI-powered submission materials from manuscript.

**Features**:
- **Generate Package** — Single button sends manuscript + encyclopedia to AI, receives complete package
- **4 output sections**: Logline (1 sentence), Synopsis (~500 words), Query Letter (~300 words), Author Bio (template with [placeholders])
- **Collapsible sections** with color-coded headers (purple, blue, green, orange)
- **Copy per section** or **Copy All** to clipboard
- **Regenerate** — Clear and re-run

**Local state**: `copiedField` (for copy feedback)

**Store dependencies**: `currentProject`, `chapters`, `submissionGenerating`, `submissionResult`, `setShowSubmissionPackage`, `generateSubmissionPackage`, `clearSubmissionResult`

---

### `WritingDashboardPanel.tsx` — Writing Dashboard Modal

**Role**: Modal displaying comprehensive writing statistics and visualizations for the current project.

**Features**:
- **8 stat cards**: Total Words, Total Chapters, Avg Words/Chapter, Longest Chapter, Shortest Chapter, Encyclopedia Entries, AI Operations (with accept rate), Session Stats
- **Daily Words chart** — Canvas-based vertical bar chart showing words written per day over the last 30 days
- **Words by Chapter chart** — Canvas-based horizontal bar chart showing word count per chapter
- **Data loading** — Fetches `WritingStats` via `GET_WRITING_STATS` IPC on mount

**Canvas implementation**: Uses HTML5 Canvas API for both bar charts. Vertical bars for daily word history, horizontal bars for chapter word breakdown. Axes and labels drawn programmatically.

**Local state**: None (all state in Zustand store)

**Store dependencies**: `showDashboard`, `dashboardStats`, `dashboardLoading`, `setShowDashboard`, `loadDashboardStats`

---

### `CoverDesignerPanel.tsx` — Cover Designer Modal

**Role**: Modal for designing book covers using a canvas-based editor with genre templates.

**Features**:
- **8 genre templates**: Minimal, Classic, Modern, Nature, Romance, Thriller, Sci-Fi, Literary — each pre-configures colors, font sizes, and layout
- **Title controls**: Text input, color picker, font size adjustment
- **Subtitle**: Optional subtitle text input
- **Author controls**: Text input, color picker, font size adjustment
- **Background color**: Color picker for full cover background
- **Border**: Optional border toggle
- **Canvas preview**: Live HTML5 Canvas rendering with automatic text wrapping
- **Export as PNG**: Calls `EXPORT_COVER` IPC with base64 PNG data URL, main process shows native save dialog

**Canvas implementation**: Uses HTML5 Canvas API. Draws background fill, optional border, title (with word wrapping), subtitle, and author name. Text is centered and wraps automatically based on canvas width.

**Local state**: `template`, `title`, `subtitle`, `author`, `titleColor`, `titleSize`, `authorColor`, `authorSize`, `bgColor`, `showBorder`

**Store dependencies**: `showCoverDesigner`, `setShowCoverDesigner`, `currentProject`

---

### `PublishingPresetsPanel.tsx` — Publishing Presets Modal

**Role**: Modal for validating and exporting project content against publishing platform requirements.

**Features**:
- **5 publishing presets**: KDP (Amazon Kindle Direct Publishing), IngramSpark, Draft2Digital, Smashwords, Blog
- **Validation** — Each preset checks the project against platform-specific requirements (word count, formatting, metadata, cover, etc.) via VALIDATE_PUBLISHING_PRESET IPC
- **One-click export** — After validation passes, export in the required format(s) for the selected platform
- **Preset details** — Each preset shows required formats, typical requirements, and validation status

**Local state**: `selectedPreset`, `validationResult`, `validating`

**Store dependencies**: `currentProject`, `showPublishingPresets`, `setShowPublishingPresets`

---

### `FindReplaceBar.tsx` — Find & Replace Bar

**Role**: Inline find-and-replace bar for the editor, positioned absolute top-right of the editor container.

**Features**:
- **Find** — Text input with ProseMirror text traversal to locate matches
- **Match highlighting** — Uses ProseMirror Plugin with DecorationSet to highlight all matches (`find-result` CSS class) and the active match (`find-result-active` CSS class)
- **Navigate** — Enter for next match, Shift+Enter for previous match
- **Case sensitivity** — Toggle button for case-sensitive/insensitive search
- **Replace** — Replace current match or replace all matches
- **Close** — Escape key or close button dismisses the bar

**Activation**: `Ctrl+F` in `Editor.tsx` toggles the bar open.

**Local state**: `searchTerm`, `replaceTerm`, `caseSensitive`, `matchIndex`, `matchCount`. All state is component-local (no Zustand store fields).

**Store dependencies**: None (reads editor instance via `window.__tiptapEditor`).

---

### `PreviewPane.tsx` — Live WYSIWYG Preview

**Role**: Inline panel rendered alongside the TipTap editor in a 50/50 split layout, showing a live formatted preview of the current chapter content.

**Features**:
- **Live rendering** — Converts TipTap JSON to formatted HTML in real-time as the user types
- **Print-style layout** — Georgia serif font, 6.5in max width, text indentation for paragraphs, page-like visual appearance
- **Heading styles** — H1, H2, H3 with appropriate sizing and margins
- **Block element rendering** — Blockquotes, code blocks, horizontal rules, ordered/unordered lists all rendered with appropriate styling
- **Mark support** — Bold, italic, strike, highlight, code marks properly rendered

**Activation**: Toggle via "Preview" button in EditorToolbar. Persisted as `settings.showPreview`.

**CSS**: `.preview-content` styles in `globals.css` provide the print-like layout.

**Props**: Receives chapter content from Editor.tsx parent component.

**Store dependencies**: `settings.showPreview`

---

### `CommentsPanel.tsx` — Inline Comments Sidebar

**Role**: 264px sidebar panel for managing inline comments anchored to text ranges in the editor.

**Features**:
- **Comment CRUD** — Create comments with text and position anchoring (fromPos/toPos), edit comment text, delete comments
- **Filter tabs** — All, Open, Resolved — filter the comment list by status
- **Resolve/Reopen** — Toggle comment resolved status
- **Click-to-navigate** — Clicking a comment scrolls the editor to the comment's anchored text position
- **Author field** — Each comment has an author (default "Author")
- **Timestamps** — Created and updated timestamps displayed

**Activation**: Toggle via showComments state in Editor.tsx.

**IPC channels**: GET_COMMENTS, CREATE_COMMENT, UPDATE_COMMENT, DELETE_COMMENT

**Data**: Comments stored in `writer_comments` table (migration 014).

**Store dependencies**: `currentChapter`

---

### `TrackedChangesPanel.tsx` — Tracked Changes Modal

**Role**: Modal for reviewing, accepting, and rejecting tracked changes (insertions and deletions) in the current chapter, with DOCX and PDF import support.

**Features**:
- **Track Changes toggle** — checkbox to enable/disable `settings.trackChanges`
- **Summary bar** — shows insertion count (green) and deletion count (red)
- **Import DOCX** — imports tracked changes from a `.docx` file via `importDocxChanges` IPC
- **Import PDF** — imports annotations from a PDF file via `importPdfAnnotations` IPC
- **Accept All** — accepts all tracked changes at once (clears tracking records)
- **Change list** — color-coded cards (green for insertions, red for deletions) with old/new text, author, timestamp
- **Per-change actions**: Accept (removes tracking record), Reject (reverts the change in the editor for insertions), Go To (click card to select the text range in editor)

**Editor integration**: Reads `window.__tiptapEditor` to navigate to change positions and revert rejected insertions via `deleteRange`.

**IPC channels**: `getTrackedChanges`, `deleteTrackedChange`, `clearTrackedChanges`, `importDocxChanges`, `importPdfAnnotations`

**Local state**: `changes`, `importing`, `importResult`

**Store dependencies**: `currentChapter`, `settings`, `saveSettings`, `setShowTrackedChanges`

---

### `WritingSprintPanel.tsx` — Writing Sprint Modal

**Role**: Modal for timed writing sprints with word count goals and sprint history.

**Features**:
- **Duration presets** — 5, 10, 15, 25, 30 minute quick-select buttons
- **Word goal** — numeric input (50–10,000 words, step 50)
- **Active sprint display** — large countdown timer (mm:ss), live word count vs target, progress bar (blue, turns green at 100%), "Goal reached!" indicator
- **Auto-end** — sprint automatically ends when timer reaches zero
- **End Sprint** — manual end button, calculates words written from chapter word count diff
- **Sprint history** — list of recent sprints (up to 10) with date, duration, words written vs target, checkmark for goal met

**Word count calculation**: Computes total words across all chapters at sprint start and end, calculates the difference.

**IPC channels**: `getSprints`, `startSprint`, `endSprint`

**Local state**: `sprints`, `activeSprint`, `timeLeft`, `startWordCount`, `duration`, `targetWords`, `timerRef`

**Store dependencies**: `currentProject`, `chapters`, `setShowWritingSprint`

---

### `PageSetupPanel.tsx` — Page Setup Modal

**Role**: Modal for configuring page dimensions, margins, headers/footers, page numbers, and bleed settings for export/print.

**Features**:
- **7 page sizes** — US Letter, A4, A5, Trade (6x9), Digest (5.5x8.5), Small (5x8), Mass Market (4.25x6.87)
- **7 layout templates** — Novel 6x9, Digest, Mass Market, Small 5x8, Standard Letter, Academic A4, A5 Booklet — each pre-configures page size and margins
- **Custom Master Pages** — save the current configuration as a named master page preset, load/delete saved presets. Persisted via `createMasterPage` / `getMasterPages` / `deleteMasterPage` IPC
- **Margin controls** — individual numeric inputs for top, bottom, left, right margins (inches, 0.25–3.0)
- **Header/Footer text** — free-form text inputs for page header and footer
- **Page numbers** — toggle on/off, position selector (Bottom Center, Bottom Right, Top Right)
- **Bleed margins** — toggle on/off with configurable bleed margin size (0.0625–0.5 inches)
- **Live preview** — scaled page preview showing margin boundaries, header/footer text, and page number position
- **Reset Defaults** — restores US Letter with 1" top/bottom and 1.25" left/right margins

**Data**: Configuration stored as `settings.pageSetup` (type `PageSetupConfig`). Master pages stored via IPC.

**Local state**: `config` (PageSetupConfig), `masterPages`, `showSaveMaster`, `masterName`, `masterDesc`

**Store dependencies**: `settings`, `saveSettings`, `setShowPageSetup`

---

### `FeedbackDashboardPanel.tsx` — Feedback Dashboard Modal

**Role**: Modal that analyzes open comments across all chapters and generates an AI-powered prioritized revision plan.

**Features**:
- **Generate Plan** — sends manuscript comments to AI, receives a structured revision plan with summary and categorized tasks
- **Revision plan display** — summary card with plan overview and timestamp
- **Tasks by priority** — grouped into High (red), Medium (yellow), Low (gray) priority sections
- **Task cards** — each task has a category badge (Plot, Character, Pacing, Style, Continuity, Other — color-coded), optional chapter reference, description text, and completion checkbox
- **Task completion** — checkbox toggles strikethrough styling (local state only, not persisted)
- **Previous plans** — list of older revision plans with date, task count, and delete button

**Category badge colors**: Plot (blue), Character (purple), Pacing (orange), Style (green), Continuity (cyan), Other (gray)

**IPC channels**: `getRevisionPlans`, `generateRevisionPlan`, `deleteRevisionPlan`

**Local state**: `plans`, `generating`, `completedTasks` (Set of plan:task keys)

**Store dependencies**: `currentProject`, `aiStreaming`, `setShowFeedbackDashboard`

---

### `PluginsPanel.tsx` — Plugins Modal

**Role**: Modal for managing and running writer plugins with enable/disable toggles and inline result display.

**Features**:
- **Plugin list** — displays all available plugins with name, version, built-in badge, description
- **Enable/Disable** — per-plugin checkbox toggle via `togglePlugin` IPC
- **Run** — executes an enabled plugin with the current editor text (selected text if any, otherwise full document text) and chapter content
- **Result display** — shows plugin output with title, basic markdown bold rendering, and scrollable content area
- **Insert into Editor** — for applicable plugins (e.g., lorem-ipsum), inserts the result content at cursor position
- **Footer stats** — shows count of enabled plugins vs total

**Editor integration**: Reads `window.__tiptapEditor` for input text extraction and result insertion.

**IPC channels**: `getPlugins`, `togglePlugin`, `runPlugin`

**Local state**: `plugins`, `running`, `result`

**Store dependencies**: `currentChapter`, `setShowPlugins`

---

### `ExchangePanel.tsx` — NovaSyn Exchange Modal

**Role**: Modal for sending and receiving content between NovaSyn suite apps via a shared exchange directory (`%APPDATA%/NovaSyn/exchange/`).

**Tabs**:
1. **Send To** — send content from NovaSyn Writer to other NovaSyn apps
2. **Receive From** — view and import incoming content from other NovaSyn apps

**Send options**:
- **Send Current Chapter** — extracts text from TipTap JSON, sends as `chapter` content type with project name, chapter title, and word count metadata
- **Send Selected Text** — sends the current editor selection as `selection` content type
- **Send Encyclopedia** — sends all encyclopedia entries formatted as markdown sections as `encyclopedia` content type

**Receive features**:
- **Packet list** — incoming exchange packets with content type badge (color-coded: chapter/blue, selection/purple, encyclopedia/green, image/orange, research/cyan, prompt/yellow), title, source app, timestamp
- **Preview** — expandable content preview (up to 2000 chars) in monospace font
- **Import** — inserts packet content into the editor at cursor position
- **Delete** — removes an exchange packet
- **Refresh** — re-fetches available packets

**IPC channels**: `sendToExchange`, `receiveFromExchange`, `deleteExchangePacket`

**Local state**: `tab`, `packets`, `sending`, `sendResult`, `expandedPacket`

**Store dependencies**: `currentProject`, `currentChapter`, `encyclopediaEntries`, `setShowExchange`

---

### `WritingGuidePanel.tsx` — AI Writing Guide

**Role**: Persistent chat interface with an AI writing coach that has full project context. Provides conversational guidance on craft, plot, character development, pacing, and more.

**Features**:
- **Journey starters** — pre-built prompts to help writers begin a conversation (e.g., "Help me develop my characters", "Analyze my pacing", "Brainstorm plot ideas")
- **Markdown rendering** — AI responses rendered as formatted markdown for readability
- **Conversation history** — messages persisted in `writer_guide_messages` table, loaded on project select
- **Clear functionality** — clears all guide messages for the current project

**Key behaviors**:
- AI has full project context: chapters, encyclopedia entries, outlines, inline comments, knowledge base entries, continuity plants, continuity threads, and analyses
- Messages displayed in a scrollable chat view with user/assistant role styling
- Auto-scrolls to latest message
- Loading indicator during AI response generation

**IPC channels**: `getGuideMessages`, `sendGuideMessage`, `clearGuideMessages`

**Store dependencies**: `currentProject`, `showWritingGuide`, `guideMessages`, `guideLoading`, `setShowWritingGuide`, `loadGuideMessages`, `sendGuideMessage`, `clearGuideMessages`

---

### `GlobalSearchPanel.tsx` — Global Search Modal

**Role**: Spotlight-style modal for searching across all project content types — chapters, encyclopedia entries, knowledge base entries, chapter notes, and timeline events.

**Features**:
- **Spotlight-style modal** — centered overlay with large search input, opens via keyboard shortcut or sidebar button
- **Type filter pills** — filter results by content type: Chapters, Encyclopedia, KB, Notes, Timeline
- **Debounced search** — 300ms debounce on keystroke input to avoid excessive IPC calls
- **Click-to-navigate** — clicking a result navigates to the relevant panel/chapter/entry
- **Result grouping** — results grouped by type with icons and highlighted match excerpts
- **Result metadata** — shows chapter title, category, or entry type alongside each result

**Activation**: `Ctrl+K` keyboard shortcut in App.tsx, or "Search" button in Sidebar.

**IPC channels**: `globalSearch`

**Local state**: `query`, `typeFilter`, `results`, `loading`

**Store dependencies**: `currentProject`, `showGlobalSearch`, `setShowGlobalSearch`, `selectChapter`, `chapters`

---

### `TimelinePanel.tsx` — Timeline View Modal

**Role**: Modal displaying a vertical visual timeline of story events across the manuscript, with CRUD operations and chapter linking.

**Features**:
- **Vertical timeline** — events rendered as cards on a vertical line with timestamps/chapter references
- **CRUD operations** — create, read, update, and delete timeline events
- **Chapter linking** — associate events with specific chapters via dropdown selector
- **Color coding** — events color-coded by type (Plot, Character, Setting, Theme, Other)
- **Inline editing** — click an event card to edit title, description, chapter link, and color in place
- **Sort order** — events ordered by user-defined sort position, drag-to-reorder
- **Empty state** — onboarding prompt when no events exist

**IPC channels**: `getTimelineEvents`, `createTimelineEvent`, `updateTimelineEvent`, `deleteTimelineEvent`

**Local state**: `events`, `editingEvent`, `newEventForm`, `dragIndex`

**Store dependencies**: `currentProject`, `chapters`, `showTimeline`, `setShowTimeline`

---

### `StoryboardPanel.tsx` — Storyboard / Scene Cards Modal

**Role**: Modal presenting a card-based visual overview of all chapters with synopsis, status tracking, POV character assignment, word count targets, and drag-to-reorder.

**Features**:
- **Chapter cards** — each chapter displayed as a card showing title, synopsis excerpt, word count, and progress bar
- **Status tracking** — per-chapter status badges: Draft, Writing, Revision, Done, Outline — click to cycle
- **POV character** — assign a point-of-view character to each chapter from encyclopedia character entries
- **Word count targets** — set per-chapter word count goals with visual progress bars (blue, turns green at 100%)
- **Drag-to-reorder** — HTML5 drag-and-drop to rearrange chapter order (calls existing `reorderChapters` IPC)
- **Synopsis editing** — inline editable synopsis text per card
- **Filter by status** — filter cards by status type

**IPC channels**: `getChapterTargets`, `setChapterTarget`, `deleteChapterTarget`, `reorderChapters`

**Local state**: `targets`, `dragIndex`, `statusFilter`, `editingSynopsis`

**Store dependencies**: `currentProject`, `chapters`, `encyclopediaEntries`, `showStoryboard`, `setShowStoryboard`, `reorderChapters`, `updateChapter`

---

## Adding a New Component

1. Create file in `src/renderer/components/NewComponent.tsx`
2. Import and use `useWriterStore` for state access
3. Add to `App.tsx`:
   - For panels: add to the flex layout
   - For modals: add conditional render at the bottom with a `showNewComponent` state flag
4. Add toggle state to `writerStore.ts` if needed (follow `showSettings` pattern)
5. Add styles to `globals.css` if needed

## Component Communication Patterns

| Pattern | Example | When to Use |
|---------|---------|-------------|
| Zustand store | All components | Primary communication method |
| Window global | `window.__tiptapEditor` | Editor ↔ Toolbar, AI Panel → Editor |
| Props | None currently | For tightly coupled parent-child pairs |
| IPC | `window.electronAPI.*` | Component → main process (via store actions) |

## Modal Pattern

All modals follow the same pattern:

```tsx
// Store state
showMyModal: boolean;
setShowMyModal: (show: boolean) => void;

// In App.tsx
{showMyModal && <MyModal />}

// In the modal component
const { setShowMyModal } = useWriterStore();
// Backdrop click or close button calls setShowMyModal(false)
```

Modals render as fixed overlays with a semi-transparent backdrop (`bg-black/50`) and centered content panel.
