# NovaSyn Writer — Feature Roadmap

## Phase 1: The Core (IMPLEMENTED)

Phase 1 delivers the minimum viable writing experience.

### Completed Features
- [x] Project scaffolding (Electron 28, React 18, TypeScript, Vite, Tailwind, Zustand)
- [x] Frameless window with custom title bar and window controls
- [x] SQLite database with migration system
- [x] Shared API key store (`%APPDATA%/NovaSyn/api-keys.json`)
- [x] Multi-provider AI streaming (Anthropic, OpenAI, Google, xAI)
- [x] 9 text models across 4 providers
- [x] Project CRUD with auto-created first chapter
- [x] Chapter CRUD with reorder support
- [x] Section CRUD with reorder support
- [x] TipTap rich text editor with StarterKit + Placeholder + CharacterCount + Highlight
- [x] Editor toolbar (Bold, Italic, Strike, Highlight, H1-H3, Lists, Blockquote, Code, HR, Undo/Redo)
- [x] Debounced auto-save (configurable interval)
- [x] Word count + character count in status bar
- [x] Encyclopedia entries (Character, Location, Item, Lore, Other) with token count
- [x] Chapter outline editor (beats with add/edit/delete/reorder)
- [x] AI Panel with 5 tools: Continue Writing, Expand, Rewrite, Brainstorm, Custom Prompt
- [x] AI context injection: current chapter content + selected encyclopedia entries
- [x] AI streaming with Accept & Insert / Discard workflow
- [x] Resizable sidebar (200-400px)
- [x] Project selector dropdown
- [x] Expandable sections per chapter in sidebar
- [x] Encyclopedia section in sidebar with category icons
- [x] Export: Markdown and Plain Text (all chapters or single chapter)
- [x] Settings panel: model selection, API keys, system prompt, auto-save interval
- [x] Onboarding screen for first-run project creation
- [x] Keyboard shortcuts: Ctrl+Shift+A (AI panel), Ctrl+N (new chapter)
- [x] Zustand store with full state management

### Phase 1.5: Polish (IMPLEMENTED)
- [x] Row mapping (snake_case DB → camelCase TypeScript) in all IPC handlers
- [x] 6 additional AI tools: Dialogue Polish, Show Don't Tell, Compress, Tone Shift (6 presets), Summarize, Scene from Beat
- [x] Right-click context menu on selected text (6 AI tools)
- [x] Stream cancellation via AbortController (all 4 providers)
- [x] AI keyboard shortcuts: Ctrl+Shift+E (Expand), Ctrl+Shift+R (Rewrite), Ctrl+Shift+C (Continue)

### Source Files

```
novasyn_writer/
├── package.json
├── vite.config.ts
├── tsconfig.json / tsconfig.main.json / tsconfig.renderer.json
├── tailwind.config.js / postcss.config.js
├── .gitignore
├── src/
│   ├── shared/types.ts
│   ├── main/
│   │   ├── index.ts
│   │   ├── window.ts
│   │   ├── models.ts
│   │   ├── database/db.ts
│   │   ├── database/migrations/001_initial_schema.sql
│   │   ├── database/migrations/002_version_history.sql
│   │   ├── database/migrations/003_ai_operations.sql
│   │   ├── database/migrations/004_session_tracking.sql
│   │   ├── database/migrations/005_discovery_mode.sql
│   │   ├── database/migrations/006_continuity.sql
│   │   ├── database/migrations/007_knowledge_base.sql
│   │   ├── database/migrations/008_ai_operation_rating.sql
│   │   ├── database/migrations/009_brain_dumps.sql
│   │   ├── database/migrations/010_pipelines.sql
│   │   ├── database/migrations/011_analyses.sql
│   │   ├── database/migrations/012_character_relationships.sql
│   │   ├── database/migrations/013_chapter_notes.sql
│   │   ├── database/migrations/014_inline_comments.sql
│   │   ├── database/migrations/015_tracked_changes_sprints_templates.sql
│   │   ├── database/migrations/016_revision_plans.sql
│   │   ├── database/migrations/017_master_pages.sql
│   │   ├── database/migrations/018_guide_messages.sql
│   │   ├── database/migrations/019_timeline_targets.sql
│   │   ├── config/apiKeyStore.ts
│   │   └── services/aiService.ts
│   ├── preload/index.ts
│   └── renderer/
│       ├── index.html / index.tsx
│       ├── styles/globals.css
│       ├── store/writerStore.ts
│       ├── App.tsx
│       └── components/
│           ├── Sidebar.tsx
│           ├── Editor.tsx
│           ├── EditorToolbar.tsx
│           ├── EditorContextMenu.tsx
│           ├── AIPanel.tsx
│           ├── EncyclopediaEditor.tsx
│           ├── OutlineEditor.tsx
│           ├── ExportModal.tsx
│           ├── SettingsPanel.tsx
│           ├── OnboardingScreen.tsx
│           ├── VersionHistoryPanel.tsx
│           ├── AiOperationLog.tsx
│           ├── SessionPanel.tsx
│           ├── DiscoveryPanel.tsx
│           ├── DiscoveryLog.tsx
│           ├── ContinuityPanel.tsx
│           ├── KnowledgeBasePanel.tsx
│           ├── ModelComparisonPanel.tsx
│           ├── BrainDumpPanel.tsx
│           ├── PipelinePanel.tsx
│           ├── AnalysisPanel.tsx
│           ├── AmbientSoundsPanel.tsx
│           ├── RelationshipMapPanel.tsx
│           ├── SubmissionPackagePanel.tsx
│           ├── WritingDashboardPanel.tsx
│           ├── CoverDesignerPanel.tsx
│           ├── FindReplaceBar.tsx
│           ├── PublishingPresetsPanel.tsx
│           ├── PreviewPane.tsx
│           ├── CommentsPanel.tsx
│           ├── TrackedChangesPanel.tsx
│           ├── WritingSprintPanel.tsx
│           ├── PageSetupPanel.tsx
│           ├── FeedbackDashboardPanel.tsx
│           ├── PluginsPanel.tsx
│           ├── ExchangePanel.tsx
│           ├── WritingGuidePanel.tsx
│           ├── GlobalSearchPanel.tsx
│           ├── TimelinePanel.tsx
│           └── StoryboardPanel.tsx
```

---

## Phase 2: The Intelligence

Phase 2 adds the smart features that differentiate Writer from basic editors.

### 2A: Enhanced AI Tools (IMPLEMENTED)
- [x] **Dialogue Polish** — Rewrites dialogue for natural, distinctive character voices
- [x] **Show Don't Tell** — Rewrites "telling" prose into sensory "showing"
- [x] **Compress Selection** — Tightens verbose passages
- [x] **Tone Shift** — 6 presets: darker, lighter, tense, reflective, urgent, dreamlike
- [x] **Voice Match** — Analyze a writing sample, rewrite selected text to match that voice
- [x] **Write Scene from Beat** — Generates full scene from outline beat with encyclopedia context
- [x] **Dialogue Generator** — Select two characters from encyclopedia, describe the scene, AI generates dialogue in their voices
- [x] Right-click context menu for AI tools on selected text
- [x] Keyboard shortcuts: Ctrl+Shift+E (Expand), Ctrl+Shift+R (Rewrite), Ctrl+Shift+C (Continue)

### 2B: Discovery Writing Mode (IMPLEMENTED)
- [x] New mode toggle in editor toolbar ("Discovery" button)
- [x] AI generates 3 "what if" suggestions when user pauses typing (15s configurable pause trigger)
- [x] Adjustable temperature/surprise level slider (0.5–1.5, passed to all 4 AI providers)
- [x] Multiple suggestions displayed as pickable cards (Insert / Replace / New Paragraph)
- [x] Follow Thread — tell AI a direction and get suggestions along that line
- [x] Discovery Log — modal tracks session history with stats
- [x] Convert Discovery Session — export accepted suggestions as text for encyclopedia/outline
- [x] Stored in `writer_discovery_sessions` + `writer_discovery_suggestions` tables (migration 005)
- [x] Floating DiscoveryPanel anchored to bottom-right of editor area
- [x] DiscoveryLog modal with session history and export

### 2C: Continuity Tracking (IMPLEMENTED)
- [x] **Plants tracker** — Log foreshadowing setup→payoff pairs with status (planned/setup/resolved)
- [x] **Thread tracker** — Track unresolved plot questions with target resolution chapters
- [x] **Character Knowledge States** — Per-chapter tracking of what each character knows/doesn't know
- [x] AI: Scan manuscript for untracked plants
- [x] AI: Find threads the user missed
- [x] AI: Verify character knowledge against manuscript
- [x] Continuity Panel modal with Plants/Threads/Knowledge tabs
- [x] New tables: `writer_continuity_plants`, `writer_continuity_threads`, `writer_character_knowledge` (migration 006)

### 2D: Knowledge Base (IMPLEMENTED)
- [x] KB entries with categories: Ideas, Stories, Frameworks, Voice Profile, Research
- [x] Scope: project-specific or global (shared across all projects)
- [x] AI: Analyze voice profile from KB writing samples
- [x] AI: Find connections between ideas
- [x] AI: Suggest what's missing from KB
- [x] KB entries usable as AI context (checkboxes in AI Panel, like encyclopedia entries)
- [x] Knowledge Base Panel modal with category/scope filtering
- [x] New table: `writer_kb` (migration 007)

### 2E: Version History (IMPLEMENTED)
- [x] Auto-snapshot on content save (throttled to 5-minute intervals)
- [x] Named snapshots (manual "Save Checkpoint" with custom name)
- [x] Side-by-side diff comparison with highlighting (LCS-based algorithm)
- [x] Restore from any version (creates pre-restore backup automatically)
- [x] Delete versions
- [x] Version History modal with source badges, relative timestamps, word count diffs
- [x] Two-click Compare flow: select two versions → color-coded diff view (green=added, red=removed)
- [x] New table: `writer_versions` (migration 002)

### 2F: AI Operation Log (IMPLEMENTED)
- [x] Log every AI operation: prompt, model, response, tokens, operation type
- [x] User can rate results (1-5 stars) — StarRating component with hover+click
- [x] Track accepted vs discarded (auto-tracked on Accept/Discard buttons)
- [x] Contribution metrics (human % vs AI %) — visual progress bar
- [x] Average rating display in stats bar
- [x] AI Operation Log modal with summary stats, expandable entries
- [x] New table: `writer_ai_operations` (migration 003)
- [x] Migration 008: Added `rating` column to `writer_ai_operations`

### 2G: Session Tracking & Goals (IMPLEMENTED)
- [x] Track writing sessions: duration, words added, AI words accepted, AI ops count
- [x] Auto-start on project select, auto-end on 15min idle, heartbeat every 30s
- [x] Daily word count goals with streak tracking (current + longest streak)
- [x] Session stats: today words, week words, avg session minutes, most productive hour
- [x] Session Panel modal with stats, session list, and goal management
- [x] Safety-net session close on app quit (before-quit handler)
- [x] New tables: `writer_sessions`, `writer_goals` (migration 004)

### 2H: Side-by-Side Model Comparison (IMPLEMENTED)
- [x] Send same prompt to 2-3 models simultaneously (Promise.allSettled)
- [x] Display results side by side (2-col or 3-col grid)
- [x] Pick best result and insert into editor
- [x] Rate preferences with star ratings per result
- [x] Writing tool selector (Continue, Expand, Rewrite, Brainstorm, Custom)
- [x] Encyclopedia context injection
- [x] Auto-logs each model's response as AI operation
- [x] ModelComparisonPanel modal, "Compare" button in sidebar

### 2I: Brain Dump Mode (IMPLEMENTED)
- [x] Zero-friction capture mode (no formatting, just thoughts)
- [x] AI extraction: parse brain dump into ideas, encyclopedia entries, outline beats, questions
- [x] Apply extraction results: add entries to encyclopedia, append beats to outline
- [x] CRUD for brain dumps with edit/delete
- [x] Extraction status tracking (extracted badge)
- [x] BrainDumpPanel modal, "Dump" button in sidebar
- [x] New table: `writer_brain_dumps` (migration 009)

### 2J: Enhanced Encyclopedia (IMPLEMENTED)
- [x] Structured character profiles: physical, psychological, voice, arc, relationships
- [x] Location profiles: description, atmosphere, significance
- [x] Profile section templates (Insert Template button for Character/Location)
- [x] AI: Generate full profile from notes (AI Generate Profile button)
- [x] AI: Extract encyclopedia entries from manuscript (scan for mentions)
- [x] AI: Compare encyclopedia against manuscript for inconsistencies
- [x] Enhanced EncyclopediaEditor with tabbed AI features (Edit/Extract/Consistency)
- [x] Relationship map (visual canvas graph of character connections with AI scan)
- [x] RelationshipMapPanel modal with Map/List views, drag-to-arrange nodes
- [x] New table: `writer_character_relationships` (migration 012)

### 2K: Transformation Pipelines (IMPLEMENTED)
- [x] Chain multiple AI operations together (sequential execution with {{input}} variable)
- [x] Pre-built pipeline templates: Expand & Polish, Draft→Edit→Tighten, Show Don't Tell→Dialogue Polish, Outline→Scene→Refine
- [x] Custom pipeline builder with add/remove/edit steps
- [x] Pipeline runner with step-by-step results display
- [x] Accept final result and insert into editor
- [x] Use editor selection as pipeline input
- [x] PipelinePanel modal with Run/Build tabs, "Pipelines" button in sidebar
- [x] New table: `writer_pipelines` (migration 010)

---

## Phase 3: The Press (Layout & Publishing)

Phase 3 adds professional publishing capabilities.

### 3A: Chapter Templates & Template System (FULLY IMPLEMENTED)
- [x] 6 pre-built chapter templates: Blank, Scene, Flashback, Action Sequence, Dialogue Heavy, Opening Chapter
- [x] Templates defined as `CHAPTER_TEMPLATES` constant with TipTap JSON content and placeholder text
- [x] Template picker dropdown ("T" button) next to "+ New" chapter button in sidebar
- [x] Creates chapter then applies template content
- [x] Custom template creation (Sprint 9 — writer_custom_templates table, integrated into Sidebar template picker, 3 IPC channels)
- [x] Page layout templates (Sprint 13 — 7 presets: Novel 6x9, Digest 5.5x8.5, Mass Market 4.25x6.87, Small 5x8, Standard Letter, Academic A4, A5 Booklet; one-click applies page size + margins in PageSetupPanel; 3 new page sizes added to PageSetupConfig)

### 3B: Typography Controls (FULLY IMPLEMENTED)
- [x] Font family selection (7 options: System Default, Georgia, Garamond, Palatino, Times New Roman, Merriweather, Lora)
- [x] Font size control (12–24px range slider)
- [x] Line height control (1.0–3.0 range slider)
- [x] Persisted in WriterSettings, applied via CSS custom properties (`--editor-font`, `--editor-font-size`, `--editor-line-height`)
- [x] Named styles (Sprint 10 — 8 paragraph style presets: Default, Manuscript, Literary, Dialogue, Journal Entry, Letter, Minimal, Vintage; applied via CSS classes in EditorToolbar dropdown, persisted in `settings.namedStyle`)
- [x] Drop caps (Sprint 10 — 3 styles: Classic, Raised, Hanging; applied via CSS `::first-letter` pseudo-element, cycle toggle in EditorToolbar, persisted in `settings.dropCapStyle`)
- [x] Paragraph controls (Sprint 11 — spacing slider 0–3em, indent slider 0–3em, text alignment left/center/right/justify in SettingsPanel; CSS custom properties applied via Editor.tsx)
- [x] Additional font slots (Sprint 12 — heading font selector, code font selector independent from body font; CSS variable-driven via Editor.tsx)
- [x] Character controls: small caps, letter spacing (Sprint 12 — SC toggle button in EditorToolbar, letter spacing slider -0.05 to 0.2em in SettingsPanel; CSS variable-driven)
- [x] AI: Suggest font pairings (Sprint 12 — SUGGEST_FONT_PAIRINGS IPC channel, AI analyzes genre/mood and suggests 3 body+heading+code font pairings with rationale, one-click Apply button in SettingsPanel)
- [x] Kerning controls (Sprint 13 — kerning slider -0.05 to 0.1em in SettingsPanel, applied via CSS custom properties in Editor.tsx)
- [x] Ligatures toggle (Sprint 13 — ligatures on/off toggle in SettingsPanel, applied via CSS custom properties in Editor.tsx)

### 3C: Page Setup & Master Pages (FULLY IMPLEMENTED)
- [x] Page Setup (Sprint 9 — PageSetupPanel with page size, margins, headers, footers, page numbers; stored in settings; 0 new IPC channels)
- [x] Chapter Opener (Sprint 12 — ChapterOpenerConfig in WriterSettings with title size small/medium/large/xlarge, lower start 0–8em drop, ornamental dividers none/line/dots/fleuron/diamond/stars, title alignment, "Chapter" label toggle, page break toggle; applied in PreviewPane with ornament CSS classes)
- [x] Front Matter (Sprint 13 — FrontMatterConfig in WriterSettings with title page, copyright page with auto-generated text, dedication page, epigraph page with attribution; rendered in PDF export with proper page breaks; front matter checkbox in ExportModal)
- [x] Multi-Column Layout (Sprint 14 — CSS column-count 1/2/3 via --editor-columns CSS var, Col:1/2/3 toggle in EditorToolbar, column setting in SettingsPanel, multi-column CSS in globals.css)
- [x] Custom Master Pages (Sprint 14 — writer_master_pages table, migration 017, MasterPagePreset type, CRUD IPC handlers in main/index.ts, "Save Current" to save page config as preset, list/apply/delete in PageSetupPanel)
- [x] Full Page Image / Bleed (Sprint 15 — bleed margin settings in PageSetupPanel, full-page-image CSS class in PDF export, INSERT_IMAGE IPC handler with file dialog + base64 conversion + dimension extraction, IMG button in EditorToolbar)

### 3D: Live WYSIWYG Preview (FULLY IMPLEMENTED)
- [x] Split preview pane — side-by-side live preview panel alongside the editor (toggle via "Preview" button in EditorToolbar)
- [x] Print-style layout — Georgia serif font, 6.5in width, text indentation, page-like rendering
- [x] Live rendering of TipTap JSON as formatted HTML (PreviewPane component)
- [x] Persisted in WriterSettings as `showPreview`
- [x] Zoom controls (Sprint 11 — 50–200% zoom range in PreviewPane)
- [x] Heading navigation (Sprint 11 — heading navigation dropdown with scroll-to-heading in PreviewPane)
- [x] Spread view (Sprint 12 — two-page spread toggle in PreviewPane toolbar, content split across side-by-side pages with book-like layout)

### 3E: PDF Export (FULLY IMPLEMENTED)
- [x] PDF export via Electron's built-in `printToPDF` (hidden BrowserWindow renders HTML to PDF)
- [x] Title page, table of contents, author name support
- [x] Added as 7th format option in ExportModal (no new dependencies)
- [x] Screen PDF (Sprint 13 — Letter size, standard margins)
- [x] Print-Ready PDF (Sprint 13 — 6x9 trade format with page setup margin integration)
- [x] Front matter integration (Sprint 13 — title, copyright, dedication, epigraph pages with proper page breaks)
- [x] TOC with internal anchors, centered chapter titles with proper drop (Sprint 13)
- [x] PDF quality selector in ExportModal: Screen / Print-Ready (Sprint 13)
- [x] Interactive PDF (Sprint 15 — clickable TOC links with dotted borders, bookmark-level CSS on chapter headings, hyperlink styling in PDF export)

### 3F: EPUB Export (IMPLEMENTED)
- [x] EPUB 3.0 (reflowable, valid structure via JSZip)
- [x] Cover image embedded (Sprint 11 — SELECT_COVER_IMAGE IPC handler with file dialog → base64, cover image selector in SettingsPanel, cover embedding in both EPUB and Kindle exports with proper OPF metadata)
- [x] Chapter navigation (nav.xhtml with proper EPUB 3 nav)
- [x] Metadata (author, title, description, language, modified date)
- [x] Optional title page and TOC
- [x] Embedded stylesheet (Georgia serif, proper typography)

### 3G: Additional Exports (IMPLEMENTED)
- [x] Kindle EPUB (Sprint 10 — Kindle-optimized EPUB with NCX for backward compatibility, KF8-compatible CSS, Bookerly font hints, proper guide element; added as 8th format option "Kindle (.epub)" in ExportModal)
- [x] DOCX (Microsoft Word, manuscript format option with title page and TOC)
- [x] HTML (self-contained with embedded CSS, dark/light mode support, responsive typography)
- [x] Audiobook Script Export (TTS-ready .txt with [CHAPTER], [PAUSE], [END OF BOOK] markers, text normalization)

### 3H: Cover Designer (MOSTLY IMPLEMENTED)
- [x] Canvas-based cover designer modal (CoverDesignerPanel)
- [x] 8 genre templates: Minimal, Classic, Modern, Nature, Romance, Thriller, Sci-Fi, Literary
- [x] Controls: title text/color/size, subtitle, author text/color/size, background color picker, optional border
- [x] Automatic text wrapping on canvas
- [x] Export as PNG via EXPORT_COVER IPC (saves base64 PNG to file via native save dialog)
- [x] Cover layout editor — front, back, spine (Sprint 15 — full rewrite of CoverDesignerPanel with front/back/spine canvas rendering, full-wrap export, page count slider, spine width calculation, back cover blurb + ISBN barcode placeholder)
- [x] Layer system (Sprint 16 — full layer system with background/image/text layers, z-order, opacity sliders, visibility toggles, layer reordering up/down, upload image for image layers, text properties with font/size/bold/italic/position, tabbed UI with Layers/Templates/Full Wrap, templates update layer colors, UPLOAD_COVER_IMAGE IPC handler)
- [ ] AI: Generate cover concept via NS Studio integration — future

### 3I: Publishing Presets (IMPLEMENTED)
- [x] Amazon KDP Package (interior PDF + cover + KPF ebook) — validation + one-click export
- [x] IngramSpark Package (PDF/X-1a interior + cover) — validation + one-click export
- [x] Draft2Digital Package (EPUB + cover + metadata) — validation + one-click export
- [x] Smashwords Package (EPUB + DOCX + cover) — validation + one-click export
- [x] Submission Package (AI-generated synopsis, query letter, logline, author bio)
- [x] Blog/Newsletter Package (HTML per chapter + social cards) — validation + one-click export
- [x] PublishingPresetsPanel with 5 presets, VALIDATE_PUBLISHING_PRESET IPC channel

---

## Phase 4: The Polish (Ongoing)

### 4A: Analysis Tools (IMPLEMENTED)
- [x] Consistency check (scan against encyclopedia, AI-powered)
- [x] Pacing analysis (action/dialogue/reflection/description heat map per chapter)
- [x] Readability metrics (Flesch-Kincaid, sentence variation, overused words, dialogue %)
- [x] Character voice audit (detect when characters sound too similar, AI-powered)
- [x] Analysis Panel modal with 4 tabs, scope selector (project/chapter), analysis history
- [x] New table: `writer_analyses` (migration 011)

### 4B: Specialized Writing Modes (IMPLEMENTED)
- [x] Screenplay Mode (CSS-based formatting toggle — H1=Scene Heading, H2=Character Name, H3=Parenthetical, Blockquote=Dialogue, Code=Transition; Courier New monospace; toggle in EditorToolbar + persisted in settings)
- [x] Poetry Mode (CSS-based formatting toggle — centered text, H1=Title, H2=Section, H3=Note, HR=Stanza Break, Blockquote=Epigraph; toggle in EditorToolbar + persisted as `settings.poetryMode`; mutually exclusive with Screenplay Mode)
- [x] Article Mode (CSS-based formatting toggle — Georgia serif, pull quotes, sidebar notes; toggle in EditorToolbar + persisted as `settings.articleMode`; mutually exclusive with Screenplay and Poetry modes)

### 4C: Collaboration (FULLY IMPLEMENTED)
- [x] Inline comments — Comment CRUD with text range anchoring (from_pos/to_pos), author field, resolved status, filter (All/Open/Resolved), click-to-navigate to comment location in editor (CommentsPanel component, writer_comments table, 4 IPC channels)
- [x] Tracked changes (Sprint 9 — TrackedChangesPanel, writer_tracked_changes table, migration 015, 4 IPC channels)
- [x] Feedback dashboard (Sprint 10 — FeedbackDashboardPanel, AI-generated revision plan from open comments across all chapters, prioritized tasks with categories: Plot/Character/Pacing/Style/Continuity/Other, writer_revision_plans table, migration 016, 3 IPC channels)
- [x] Export review copies (Sprint 11 — EXPORT_REVIEW_COPY IPC handler generates styled HTML with chapters, inline comments, and reader feedback questionnaire; Review button in Sidebar)
- [x] Import tracked changes from DOCX (Sprint 14 — IMPORT_DOCX_CHANGES IPC handler uses dialog.showOpenDialog + JSZip to parse `<w:ins>` and `<w:del>` revision markup from .docx files, creates tracked change records; "Import DOCX" button in TrackedChangesPanel)
- [x] Import PDF annotations (Sprint 15 — IMPORT_PDF_ANNOTATIONS handler parses PDF binary for /Annot objects, extracts Text/Highlight/Underline/StrikeOut/FreeText annotations, creates tracked change records; "Import PDF" button in TrackedChangesPanel)

### 4D: NovaSyn Ecosystem Integration (PARTIALLY IMPLEMENTED)
- [x] Send-To protocol (Sprint 16 — SEND_TO_EXCHANGE IPC handler, shared exchange directory %APPDATA%/NovaSyn/exchange/, three send options: current chapter, selected text, all encyclopedia entries; JSON packets with sourceApp, contentType, title, content, metadata; ExchangePanel modal Send To tab)
- [x] Receive-From protocol (Sprint 16 — RECEIVE_FROM_EXCHANGE/LIST_EXCHANGE_PACKETS/DELETE_EXCHANGE_PACKET IPC handlers, ExchangePanel modal Receive From tab, lists packets from other NovaSyn apps with content type badges, preview/expand, import to editor, delete)
- [ ] NS Vault integration for asset management
- [ ] NS Orchestrator automation workflows

### 4E: Quality of Life (MOSTLY IMPLEMENTED)
- [x] Distraction-free mode (F11 — hides sidebar, toolbar, title bar; Esc to exit)
- [x] Ambient sounds (rain, coffee shop, forest, fireplace, ocean, night) with per-sound volume mixing
- [x] Theme support (Dark/Light/Sepia) via CSS custom properties, live preview in settings
- [x] Writing Dashboard (WritingDashboardPanel — stat cards + canvas bar charts for daily words and chapter words; totals, averages, longest/shortest chapter, encyclopedia count, AI ops with accept rate, session stats, 30-day word history)
- [x] Project Import (multi-file import of .txt/.md/.markdown/.text, converts to TipTap JSON chapters; "Import" button in sidebar)
- [x] Find & Replace (FindReplaceBar — Ctrl+F to open, ProseMirror text traversal + decoration highlights, case-sensitive toggle, navigate with Enter/Shift+Enter, replace one or all)
- [x] Drag & Drop Chapter Reorder (HTML5 drag-and-drop in sidebar — draggable chapters with visual feedback, semi-transparent drag item, blue top border drop target, calls existing `reorderChapters` IPC)
- [x] Chapter Notes (per-chapter notes inline in Editor with auto-save, writer_chapter_notes table, GET_CHAPTER_NOTES + SAVE_CHAPTER_NOTE IPC channels)
- [x] Typewriter Mode (EditorToolbar toggle — scroll-to-center active line, 45vh padding via CSS; persisted as `settings.typewriterMode`)
- [x] Focus Mode (EditorToolbar toggle — dims non-active paragraphs via CSS + @tiptap/extension-focus; persisted as `settings.focusMode`)
- [x] Enhanced Status Bar (sentences, paragraphs, reading time at 250 wpm, Flesch Reading Ease score with color-coded indicator: green/yellow/red)
- [x] Project Backup & Restore (BACKUP_PROJECT exports project+chapters+encyclopedia+outlines+notes+comments as JSON; RESTORE_PROJECT imports from JSON, remaps IDs, creates new project with "(Restored)" suffix; Backup/Restore buttons in sidebar)
- [x] Writing Sprints (Sprint 9 — WritingSprintPanel, writer_sprints table, migration 015, 3 IPC channels)
- [x] Extension/plugin system (Sprint 16 — plugin registry with 4 built-in plugins: Word Frequency top 50 words, Reading Time 250 wpm silent/150 wpm aloud with sentences/paragraphs/dialogue lines, Lorem Ipsum 5 paragraphs insert to editor, Text Statistics vocab richness/avg word and sentence length/long and short sentences; enable/disable toggle with file persistence; GET_PLUGINS/TOGGLE_PLUGIN/RUN_PLUGIN IPC handlers; PluginsPanel modal)
- [x] Auto-updater (Sprint 14 — CHECK_FOR_UPDATES IPC handler fetches remote JSON manifest and compares semver versions; "Automatically check for updates on launch" toggle in SettingsPanel; `autoCheckUpdates` field in WriterSettings)
- [x] AI Writing Guide (Sprint 17 — WritingGuidePanel persistent chat with AI writing coach, full project context injection — chapters, encyclopedia, outlines, comments, KB, plants, threads, analyses; journey starters, markdown rendering, conversation history, clear functionality; writer_guide_messages table, migration 018, 3 IPC channels)
- [x] Global Search (Sprint 18 — GlobalSearchPanel Spotlight-style modal, Ctrl+K shortcut, searches across chapters/encyclopedia/KB/notes/timeline, type filter pills, debounced search, click-to-navigate, grouped results with highlighted excerpts; GLOBAL_SEARCH IPC channel)
- [x] Timeline View (Sprint 18 — TimelinePanel vertical visual timeline of story events, CRUD operations, chapter linking, color coding by event type, inline editing, drag-to-reorder; writer_timeline_events table, migration 019, 4 IPC channels)
- [x] Scene Cards / Storyboard (Sprint 18 — StoryboardPanel card-based visual chapter overview, synopsis editing, status tracking Draft/Writing/Revision/Done/Outline, POV character assignment from encyclopedia, word count targets with progress bars, drag-to-reorder, filter by status; writer_chapter_targets table, migration 019, 3 IPC channels)
- [x] Word Count Targets (Sprint 18 — per-chapter word count goals in writer_chapter_targets table with upsert pattern, visual progress bars in StoryboardPanel; integrated into SET_CHAPTER_TARGET/GET_CHAPTER_TARGETS/DELETE_CHAPTER_TARGET IPC channels)
