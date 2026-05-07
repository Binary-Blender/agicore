# NovaSyn Writer — Sprint History

## Sprint 18 (Most Recent — COMPLETED)

### Features Implemented

| # | Feature | Phase | New Table | New Panel | IPC Channels |
|---|---------|-------|-----------|-----------|-------------|
| 1 | Global Search | 4E | — | GlobalSearchPanel | 1 (GLOBAL_SEARCH) |
| 2 | Timeline View | 4E | writer_timeline_events | TimelinePanel | 4 (GET_TIMELINE_EVENTS, CREATE_TIMELINE_EVENT, UPDATE_TIMELINE_EVENT, DELETE_TIMELINE_EVENT) |
| 3 | Scene Cards / Storyboard | 4E | writer_chapter_targets | StoryboardPanel | 3 (GET_CHAPTER_TARGETS, SET_CHAPTER_TARGET, DELETE_CHAPTER_TARGET) |
| 4 | Word Count Targets | 4E | — (part of writer_chapter_targets) | — (integrated into StoryboardPanel) | 0 (uses SET_CHAPTER_TARGET) |

### Files Changed

| File | Changes |
|------|---------|
| `src/shared/types.ts` | GlobalSearchResult, TimelineEvent, ChapterTarget interfaces. 8 new IPC channels, 8 new ElectronAPI methods |
| `src/preload/index.ts` | 8 new IPC method mappings |
| `src/main/index.ts` | mapTimelineEvent mapper, extractText helper (for search), GLOBAL_SEARCH handler (searches chapters, encyclopedia, KB, notes, timeline), GET_TIMELINE_EVENTS/CREATE_TIMELINE_EVENT/UPDATE_TIMELINE_EVENT/DELETE_TIMELINE_EVENT handlers, GET_CHAPTER_TARGETS/SET_CHAPTER_TARGET/DELETE_CHAPTER_TARGET handlers |
| `src/main/database/migrations/019_timeline_targets.sql` | **NEW** — writer_timeline_events + writer_chapter_targets tables + indexes |
| `src/renderer/store/writerStore.ts` | showGlobalSearch, globalSearchResults, globalSearchLoading, showTimeline, timelineEvents, showStoryboard, chapterTargets state + setShowGlobalSearch, globalSearch, setShowTimeline, loadTimelineEvents, createTimelineEvent, updateTimelineEvent, deleteTimelineEvent, setShowStoryboard, loadChapterTargets, setChapterTarget, deleteChapterTarget actions |
| `src/renderer/components/GlobalSearchPanel.tsx` | **NEW** — Spotlight-style global search modal with type filter pills, debounced search, click-to-navigate |
| `src/renderer/components/TimelinePanel.tsx` | **NEW** — Visual vertical timeline with CRUD, chapter linking, color coding, inline editing |
| `src/renderer/components/StoryboardPanel.tsx` | **NEW** — Card-based visual chapter overview with synopsis, status badges, POV character, word count targets, drag-to-reorder, progress bars |
| `src/renderer/components/Sidebar.tsx` | "Search", "Timeline", "Storyboard" buttons |
| `src/renderer/App.tsx` | Import and render GlobalSearchPanel, TimelinePanel, StoryboardPanel. Ctrl+K shortcut for global search |

### Notes
- 8 new IPC channels (GLOBAL_SEARCH, GET_TIMELINE_EVENTS, CREATE_TIMELINE_EVENT, UPDATE_TIMELINE_EVENT, DELETE_TIMELINE_EVENT, GET_CHAPTER_TARGETS, SET_CHAPTER_TARGET, DELETE_CHAPTER_TARGET)
- 1 new database migration (019_timeline_targets)
- No new npm dependencies
- 7 new Zustand store fields (showGlobalSearch, globalSearchResults, globalSearchLoading, showTimeline, timelineEvents, showStoryboard, chapterTargets)
- Global Search: Spotlight-style modal (Ctrl+K) that searches across chapters, encyclopedia, knowledge base, chapter notes, and timeline events. Type filter pills, debounced input, grouped results with highlighted excerpts, click-to-navigate.
- Timeline View: vertical timeline of story events with create/edit/delete, chapter linking, color coding by event type, inline editing, drag-to-reorder.
- Scene Cards / Storyboard: card-based visual view of all chapters with synopsis, status tracking (Draft/Writing/Revision/Done/Outline), POV character assignment from encyclopedia, word count targets with progress bars, drag-to-reorder, filter by status.
- Word Count Targets: per-chapter word count goals stored in writer_chapter_targets table (upsert pattern), visual progress bars in storyboard cards.

---

## Sprint 17 (COMPLETED)

### Features Implemented

| # | Feature | Phase | New Table | New Panel | IPC Channels |
|---|---------|-------|-----------|-----------|-------------|
| 1 | AI Writing Guide | 4E | writer_guide_messages | WritingGuidePanel | 3 (GET_GUIDE_MESSAGES, SEND_GUIDE_MESSAGE, CLEAR_GUIDE_MESSAGES) |

### Files Changed

| File | Changes |
|------|---------|
| `src/shared/types.ts` | GuideMessage interface. 3 new IPC channels, 3 new ElectronAPI methods |
| `src/preload/index.ts` | 3 new IPC method mappings |
| `src/main/index.ts` | mapGuideMessage mapper, GET_GUIDE_MESSAGES/SEND_GUIDE_MESSAGE/CLEAR_GUIDE_MESSAGES handlers. SEND_GUIDE_MESSAGE gathers full project context (chapters, encyclopedia, outlines, comments, KB, plants, threads, analyses) |
| `src/main/database/migrations/018_guide_messages.sql` | **NEW** — writer_guide_messages table + index |
| `src/renderer/store/writerStore.ts` | showWritingGuide, guideMessages, guideLoading state + setShowWritingGuide, loadGuideMessages, sendGuideMessage, clearGuideMessages actions |
| `src/renderer/components/WritingGuidePanel.tsx` | **NEW** — AI Writing Guide persistent chat panel with journey starters, markdown rendering, conversation history, clear functionality |
| `src/renderer/components/Sidebar.tsx` | "Guide" button |
| `src/renderer/App.tsx` | Import and render WritingGuidePanel |

### Notes
- 3 new IPC channels (GET_GUIDE_MESSAGES, SEND_GUIDE_MESSAGE, CLEAR_GUIDE_MESSAGES)
- 1 new database migration (018_guide_messages)
- No new npm dependencies
- 3 new Zustand store fields (showWritingGuide, guideMessages, guideLoading)
- AI Writing Guide: persistent chat interface with AI writing coach that has full project context (chapters, encyclopedia entries, outlines, inline comments, KB entries, continuity plants, continuity threads, analyses). Features journey starters for common writing questions, markdown rendering for AI responses, conversation history persisted across sessions, clear functionality to reset the conversation.

---

## Sprint 16 (COMPLETED)

### Features Implemented

| # | Feature | Phase | New Table | New Panel | IPC Channels |
|---|---------|-------|-----------|-----------|-------------|
| 1 | Cover Designer Layer System | 3H | — | — (CoverDesignerPanel rewrite) | 1 (UPLOAD_COVER_IMAGE) |
| 2 | Extension/Plugin System | 4E | — | PluginsPanel | 3 (GET_PLUGINS, TOGGLE_PLUGIN, RUN_PLUGIN) |
| 3 | NovaSyn Send-To Protocol | 4D | — | ExchangePanel | 1 (SEND_TO_EXCHANGE) |
| 4 | NovaSyn Receive-From Protocol | 4D | — | ExchangePanel | 3 (RECEIVE_FROM_EXCHANGE, LIST_EXCHANGE_PACKETS, DELETE_EXCHANGE_PACKET) |

### Files Changed

| File | Changes |
|------|---------|
| `src/shared/types.ts` | CoverLayer, WriterPlugin, PluginResult, NovaSynExchangePacket interfaces. 8 new IPC channels, 8 new ElectronAPI methods |
| `src/preload/index.ts` | 8 new IPC method mappings |
| `src/main/index.ts` | UPLOAD_COVER_IMAGE handler, GET_PLUGINS/TOGGLE_PLUGIN/RUN_PLUGIN handlers with 4 built-in plugins, SEND_TO_EXCHANGE/RECEIVE_FROM_EXCHANGE/LIST_EXCHANGE_PACKETS/DELETE_EXCHANGE_PACKET handlers |
| `src/renderer/store/writerStore.ts` | showPlugins, showExchange state + setters |
| `src/renderer/components/CoverDesignerPanel.tsx` | REWRITTEN with layer system (background/image/text layers, z-order, opacity, visibility, tabbed UI) |
| `src/renderer/components/PluginsPanel.tsx` | **NEW** — Plugin management modal with run/toggle per plugin and result display |
| `src/renderer/components/ExchangePanel.tsx` | **NEW** — NovaSyn Exchange modal with Send To / Receive From tabs |
| `src/renderer/components/Sidebar.tsx` | "Plugins" and "Exchange" buttons |
| `src/renderer/App.tsx` | Import and render PluginsPanel + ExchangePanel |

### Notes
- 8 new IPC channels (UPLOAD_COVER_IMAGE, GET_PLUGINS, TOGGLE_PLUGIN, RUN_PLUGIN, SEND_TO_EXCHANGE, RECEIVE_FROM_EXCHANGE, LIST_EXCHANGE_PACKETS, DELETE_EXCHANGE_PACKET)
- No new database migrations
- No new npm dependencies
- 2 new Zustand store fields (showPlugins, showExchange)
- Cover Designer Layer System: full layer system with background, image, and text layers; z-order, opacity sliders, visibility toggles, layer reordering (up/down); upload image for image layers; text properties (font, size, bold/italic, position); tabbed UI (Layers/Templates/Full Wrap); templates now update layer colors. Completes 3H.
- Extension/Plugin System: plugin registry with 4 built-in plugins — Word Frequency (top 50 words), Reading Time (250 wpm silent/150 wpm aloud, sentences, paragraphs, dialogue lines), Lorem Ipsum (5 paragraphs, insert to editor), Text Statistics (vocab richness, avg word/sentence length, long/short sentences); plugin enable/disable toggle with file persistence; PluginsPanel modal with run/toggle per plugin and result display
- NovaSyn Send-To Protocol: send content to shared exchange directory (%APPDATA%/NovaSyn/exchange/); three send options (current chapter, selected text, all encyclopedia entries); packets are JSON files with sourceApp, contentType, title, content, metadata
- NovaSyn Receive-From Protocol: import content from exchange directory; lists packets from other NovaSyn apps with content type badges, preview/expand, import to editor, delete

---

## Sprint 15 (COMPLETED)

### Features Implemented

| # | Feature | Phase | New Table | New Panel | IPC Channels |
|---|---------|-------|-----------|-----------|-------------|
| 1 | Full Page Image / Bleed | 3C | — | — (PageSetupPanel + EditorToolbar) | 1 (INSERT_IMAGE) |
| 2 | Interactive PDF | 3E | — | — (PDF export) | 0 (extends existing) |
| 3 | Cover Designer Front/Back/Spine | 3H | — | — (CoverDesignerPanel rewrite) | 0 (extends existing EXPORT_COVER) |
| 4 | Import PDF Annotations | 4C | — | — (TrackedChangesPanel) | 1 (IMPORT_PDF_ANNOTATIONS) |

### Notes
- 2 new IPC channels (INSERT_IMAGE, IMPORT_PDF_ANNOTATIONS)
- No new database migrations
- No new npm dependencies
- No new Zustand store fields
- Full Page Image: bleed margin settings in PageSetupPanel, full-page-image CSS class in PDF export, INSERT_IMAGE IPC handler with file dialog + base64 conversion + dimension extraction, IMG button in EditorToolbar
- Interactive PDF: clickable TOC links with dotted borders, bookmark-level CSS on chapter headings, hyperlink styling in PDF export
- Cover Designer rewrite: CoverDesignerPanel now supports front/back/spine canvas rendering, full-wrap export, page count slider, spine width calculation, back cover blurb + ISBN barcode placeholder
- Import PDF Annotations: IMPORT_PDF_ANNOTATIONS handler parses PDF binary for /Annot objects, extracts Text/Highlight/Underline/StrikeOut/FreeText annotations, creates tracked change records; "Import PDF" button in TrackedChangesPanel

---

## Sprint 14 (COMPLETED)

### Features Implemented

| # | Feature | Phase | New Table | New Panel | IPC Channels |
|---|---------|-------|-----------|-----------|-------------|
| 1 | Multi-Column Layout | 3C | — | — (EditorToolbar + SettingsPanel) | 0 (settings persistence) |
| 2 | Custom Master Pages | 3C | writer_master_pages | — (PageSetupPanel) | 5 (master page CRUD) |
| 3 | Import Tracked Changes from DOCX | 4C | — | — (TrackedChangesPanel) | 1 (IMPORT_DOCX_CHANGES) |
| 4 | Auto-Updater | 4E | — | — (SettingsPanel) | 1 (CHECK_FOR_UPDATES) |

### Files Changed

| File | Changes |
|------|---------|
| `src/shared/types.ts` | MasterPagePreset interface, columns and autoCheckUpdates settings fields, 5 new IPC channels, 5 new ElectronAPI methods |
| `src/preload/index.ts` | 5 IPC method mappings |
| `src/main/index.ts` | Master page CRUD handlers, IMPORT_DOCX_CHANGES handler (dialog + JSZip parsing of `<w:ins>`/`<w:del>` revision markup), CHECK_FOR_UPDATES handler (fetches remote JSON manifest, semver comparison) |
| `src/main/database/migrations/017_master_pages.sql` | **NEW** — writer_master_pages table |
| `src/renderer/components/Editor.tsx` | CSS var `--editor-columns` for multi-column layout |
| `src/renderer/components/EditorToolbar.tsx` | Columns toggle button (Col:1/2/3) |
| `src/renderer/styles/globals.css` | Multi-column CSS using `column-count` |
| `src/renderer/components/SettingsPanel.tsx` | Columns setting, "Automatically check for updates on launch" toggle |
| `src/renderer/components/PageSetupPanel.tsx` | Master page save/load/delete UI — "Save Current" to save page config as master page preset, list of saved presets to apply, delete option |
| `src/renderer/components/TrackedChangesPanel.tsx` | "Import DOCX" button for importing tracked changes from .docx files |

### Notes
- 5 new IPC channels (master page CRUD + IMPORT_DOCX_CHANGES + CHECK_FOR_UPDATES)
- 1 new database migration (017_master_pages)
- No new npm dependencies
- No new Zustand store fields
- Multi-column layout is CSS-driven via `column-count` property, toggled from EditorToolbar
- Master pages allow saving current page setup config as reusable presets
- DOCX import parses Word revision markup (`<w:ins>`, `<w:del>`) via JSZip and creates tracked change records
- Auto-updater fetches a remote JSON manifest and compares semver versions; optional auto-check on launch via settings toggle

---

## Sprint 13 (COMPLETED)

### Features Implemented

| # | Feature | Phase | New Table | New Panel | IPC Channels |
|---|---------|-------|-----------|-----------|-------------|
| 1 | Front Matter Pages | 3C | — | — (SettingsPanel + ExportModal) | 0 (settings persistence) |
| 2 | Enhanced PDF Export | 3E | — | — (ExportModal) | 0 (extends existing) |
| 3 | Kerning & Ligatures | 3B | — | — (SettingsPanel) | 0 (settings persistence) |
| 4 | Page Layout Templates | 3A | — | — (PageSetupPanel) | 0 (settings persistence) |

### Files Changed

| File | Changes |
|------|---------|
| `src/shared/types.ts` | FrontMatterConfig + PageLayoutTemplate interfaces. 3 new WriterSettings fields (kerning, ligatures, frontMatter). Extended PageSetupConfig page sizes (5.5x8.5, 5x8, 4.25x6.87). Extended export options (pdfQuality, includeFrontMatter) |
| `src/renderer/components/Editor.tsx` | Added kerning and ligatures CSS vars |
| `src/renderer/components/SettingsPanel.tsx` | Kerning slider (-0.05 to 0.1em), ligatures toggle, front matter section (4 page types with text inputs: title, copyright, dedication, epigraph) |
| `src/renderer/components/PageSetupPanel.tsx` | 7 layout template presets (Novel 6x9, Digest 5.5x8.5, Mass Market 4.25x6.87, Small 5x8, Standard Letter, Academic A4, A5 Booklet), 3 new page sizes |
| `src/renderer/components/ExportModal.tsx` | PDF quality selector (Screen/Print-Ready), front matter checkbox |
| `src/renderer/styles/globals.css` | Kerning and ligatures CSS rules |
| `src/main/index.ts` | Enhanced PDF export with front matter pages (title, copyright, dedication, epigraph), quality modes (Screen Letter / Print-Ready 6x9 trade), page setup margin integration, TOC with internal anchors, centered chapter titles with proper drop |

### Notes
- 0 new IPC channels
- No new database migrations
- No new dependencies
- No new Zustand store fields
- Typography Controls (3B) is now COMPLETE — kerning slider + ligatures toggle finish the remaining items
- Template System (3A) is now COMPLETE — 7 page layout presets with one-click apply
- Front Matter (3C) joins Chapter Opener under Master Pages — FrontMatterConfig with title page, copyright page (auto-generated text), dedication page, epigraph page (with attribution)
- Enhanced PDF Export (3E) — two quality modes: Screen (Letter size, standard margins) and Print-Ready (6x9 trade format); front matter integration; TOC with internal anchors; chapter titles centered with proper drop; uses page setup margins from settings

---

## Sprint 12 (COMPLETED)

### Features Implemented

| # | Feature | Phase | New Table | New Panel | IPC Channels |
|---|---------|-------|-----------|-----------|-------------|
| 1 | Spread View | 3D | — | — (PreviewPane toggle) | 0 (local component state) |
| 2 | Advanced Typography | 3B | — | — (SettingsPanel + EditorToolbar) | 0 (settings persistence) |
| 3 | Chapter Opener Styling | 3C | — | — (SettingsPanel + PreviewPane) | 0 (settings persistence) |
| 4 | AI Font Pairings | 3B | — | — (SettingsPanel) | 1 (SUGGEST_FONT_PAIRINGS) |

### Files Changed

| File | Changes |
|------|---------|
| `src/shared/types.ts` | ChapterOpenerConfig interface. 5 new WriterSettings fields (headingFont, codeFont, smallCaps, letterSpacing, chapterOpener). 1 new IPC channel (SUGGEST_FONT_PAIRINGS). 1 new ElectronAPI method |
| `src/preload/index.ts` | 1 IPC method mapping (suggestFontPairings) |
| `src/main/index.ts` | SUGGEST_FONT_PAIRINGS AI handler (analyzes genre/mood, suggests 3 font pairings with rationale) |
| `src/renderer/components/Editor.tsx` | Added heading font, code font, small caps, letter spacing CSS vars |
| `src/renderer/components/EditorToolbar.tsx` | Small Caps (SC) toggle button |
| `src/renderer/components/SettingsPanel.tsx` | Heading/code font selectors, small caps checkbox, letter spacing slider, AI font pairings section with one-click Apply, chapter opener section (title size, lower start, ornamental dividers, title alignment, chapter label toggle, page break toggle) |
| `src/renderer/components/PreviewPane.tsx` | Spread view toggle (two-page side-by-side book-like layout), chapter opener rendering with ornaments |
| `src/renderer/styles/globals.css` | Advanced typography CSS (heading/code font vars, small-caps-mode), chapter ornament classes (none/line/dots/fleuron/diamond/stars), preview spread layout |

### Notes
- 1 new IPC channel (SUGGEST_FONT_PAIRINGS)
- No new database migrations
- No new npm dependencies
- No new Zustand store fields (all features use settings persistence or local state)
- Heading and code fonts are independent from body font, applied via CSS custom properties
- Small caps toggle via SC button in EditorToolbar
- Letter spacing control range: -0.05 to 0.2em
- Chapter opener config: title size (small/medium/large/xlarge), lower start (0–8em drop), ornamental dividers (none/line/dots/fleuron/diamond/stars), title alignment, "Chapter" label toggle, page break toggle
- AI font pairings: suggests 3 body + heading + code font combinations with rationale, one-click Apply button

---

## Sprint 11 (COMPLETED)

### Features Implemented

| # | Feature | Phase | New Table | New Panel | IPC Channels |
|---|---------|-------|-----------|-----------|-------------|
| 1 | Paragraph Controls | 3B | — | — (SettingsPanel) | 0 (settings persistence) |
| 2 | Preview Zoom & Navigation | 3D | — | — (PreviewPane rewrite) | 0 (local component state) |
| 3 | Cover Image in EPUB | 3F | — | — (SettingsPanel + export) | 1 (SELECT_COVER_IMAGE) |
| 4 | Export Review Copies | 4C | — | — (Sidebar button) | 1 (EXPORT_REVIEW_COPY) |

### Files Changed

| File | Changes |
|------|---------|
| `src/shared/types.ts` | Cover image and paragraph control fields in `WriterSettings`. 2 new IPC channels (SELECT_COVER_IMAGE, EXPORT_REVIEW_COPY). 2 new ElectronAPI methods |
| `src/preload/index.ts` | 2 IPC method mappings (selectCoverImage, exportReviewCopy) |
| `src/main/index.ts` | SELECT_COVER_IMAGE handler (file dialog → base64), EXPORT_REVIEW_COPY handler (generates styled HTML with chapters, inline comments, and reader feedback questionnaire). Cover image embedding in EPUB and Kindle exports with proper OPF metadata |
| `src/renderer/components/SettingsPanel.tsx` | Paragraph controls section: spacing slider (0–3em), indent slider (0–3em), text alignment (left/center/right/justify). Cover image selector button |
| `src/renderer/components/Editor.tsx` | CSS custom properties for paragraph spacing, indent, and alignment |
| `src/renderer/styles/globals.css` | Paragraph control CSS custom properties |
| `src/renderer/components/PreviewPane.tsx` | Rewritten with zoom controls (50–200%), heading navigation dropdown with scroll-to-heading |
| `src/renderer/components/Sidebar.tsx` | "Review" button for export review copies |

### Notes
- 2 new IPC channels (SELECT_COVER_IMAGE, EXPORT_REVIEW_COPY)
- No new database migrations
- No new npm dependencies
- No new Zustand store fields
- Paragraph controls are CSS-driven via settings persistence
- Preview zoom and heading navigation are local component state
- Cover image stored as base64 in settings, embedded in EPUB/Kindle exports
- Review copies export as styled HTML with inline comments and feedback questionnaire

---

## Sprint 10 (COMPLETED)

### Features Implemented

| # | Feature | Phase | New Table | New Panel | IPC Channels |
|---|---------|-------|-----------|-----------|-------------|
| 1 | Named Styles | 3B | — | — (EditorToolbar dropdown) | 0 (settings persistence) |
| 2 | Drop Caps | 3B | — | — (EditorToolbar cycle toggle) | 0 (settings persistence) |
| 3 | Feedback Dashboard | 4C | writer_revision_plans | FeedbackDashboardPanel | 3 (GENERATE_REVISION_PLAN, GET_REVISION_PLANS, DELETE_REVISION_PLAN) |
| 4 | Kindle EPUB Export | 3G | — | — (ExportModal) | 0 (extends existing) |

### Files Changed

| File | Changes |
|------|---------|
| `src/shared/types.ts` | `RevisionTask`, `RevisionPlan` interfaces. `WriterSettings`: added `namedStyle`, `dropCapStyle`. Export format union updated to include `'kindle'`. 3 new IPC channels. 3 new ElectronAPI methods |
| `src/preload/index.ts` | 3 IPC method mappings (generateRevisionPlan, getRevisionPlans, deleteRevisionPlan) |
| `src/main/index.ts` | GENERATE_REVISION_PLAN AI handler (gathers open comments, sends to AI, parses JSON tasks), GET_REVISION_PLANS, DELETE_REVISION_PLAN handlers. Kindle EPUB export handler with NCX + KF8 CSS |
| `src/main/database/migrations/016_revision_plans.sql` | **NEW** — writer_revision_plans table + index |
| `src/renderer/store/writerStore.ts` | `showFeedbackDashboard` state + `setShowFeedbackDashboard` action |
| `src/renderer/components/FeedbackDashboardPanel.tsx` | **NEW** — AI revision plan modal with priority grouping, category badges, checkable tasks |
| `src/renderer/components/EditorToolbar.tsx` | Named Style dropdown (8 presets: Default, Manuscript, Literary, Dialogue, Journal Entry, Letter, Minimal, Vintage), Drop Cap cycle toggle (DC:C/R/H/off) |
| `src/renderer/components/Editor.tsx` | Applies `style-{name}` and `dropcap-{style}` CSS classes |
| `src/renderer/components/ExportModal.tsx` | Added Kindle format option (8th format) |
| `src/renderer/components/Sidebar.tsx` | "Feedback" button |
| `src/renderer/App.tsx` | Import FeedbackDashboardPanel, showFeedbackDashboard state, conditional render |
| `src/renderer/styles/globals.css` | 8 named style CSS blocks + 3 drop cap CSS blocks |

### Notes
- 3 new IPC channels (GENERATE_REVISION_PLAN, GET_REVISION_PLANS, DELETE_REVISION_PLAN)
- 1 new database migration (016_revision_plans)
- No new npm dependencies
- 1 new Zustand store field (showFeedbackDashboard)
- Named styles and drop caps are purely CSS-driven via settings persistence
- Kindle export produces EPUB with NCX for backward compatibility, KF8-compatible CSS, Bookerly font hints, and proper guide element

---

## Sprint 9 (COMPLETED)

### Features Implemented

| # | Feature | Phase | New Table | New Panel | IPC Channels |
|---|---------|-------|-----------|-----------|-------------|
| 1 | Tracked Changes | 4C | writer_tracked_changes | TrackedChangesPanel | 4 |
| 2 | Writing Sprints | QoL | writer_sprints | WritingSprintPanel | 3 |
| 3 | Custom Chapter Templates | 3A | writer_custom_templates | — (integrated into Sidebar template picker) | 3 |
| 4 | Page Setup | 3C | — | PageSetupPanel | 0 (settings persistence) |

### Notes
- 1 new database migration (015)
- 3 new tables (writer_tracked_changes, writer_sprints, writer_custom_templates)
- 10 new IPC channels total (4 tracked changes + 3 writing sprints + 3 custom templates)
- Page Setup stores page size, margins, headers, and footers in settings

---

## Sprint 8 (COMPLETED)

### Features Implemented

| # | Feature | Phase | New Table | New Panel | IPC Channels |
|---|---------|-------|-----------|-----------|-------------|
| 1 | Split Preview Pane | 3D | — | PreviewPane (inline in Editor) | 0 (settings persistence) |
| 2 | Inline Comments | 4C | writer_comments | CommentsPanel (inline in Editor) | 4 (GET_COMMENTS, CREATE_COMMENT, UPDATE_COMMENT, DELETE_COMMENT) |
| 3 | Enhanced Status Bar | QoL | — | — (enhanced Editor status bar) | 0 (local computation) |
| 4 | Project Backup & Restore | QoL | — | — (Sidebar buttons) | 2 (BACKUP_PROJECT, RESTORE_PROJECT) |

### Files Changed

| File | Changes |
|------|---------|
| `src/shared/types.ts` | `InlineComment`, `ProjectBackup` interfaces. `WriterSettings`: added `showPreview`. 6 new IPC channels (4 comments + 2 backup). 6 new ElectronAPI methods |
| `src/preload/index.ts` | 6 IPC method mappings |
| `src/main/index.ts` | mapComment mapper, 4 comment CRUD handlers, BACKUP_PROJECT handler (exports project+chapters+encyclopedia+outlines+notes+comments as JSON), RESTORE_PROJECT handler (imports from JSON, remaps IDs, creates new project with "(Restored)" suffix) |
| `src/main/database/migrations/014_inline_comments.sql` | **NEW** — writer_comments table + index |
| `src/renderer/components/Editor.tsx` | Split preview pane (PreviewPane), comments panel (CommentsPanel), enhanced status bar with sentences, paragraphs, reading time (250 wpm), Flesch Reading Ease score. countSyllables helper. showComments state |
| `src/renderer/components/EditorToolbar.tsx` | "Preview" toggle button for split preview pane |
| `src/renderer/components/PreviewPane.tsx` | **NEW** — Live WYSIWYG preview, renders TipTap JSON as formatted HTML with print-style layout (Georgia serif, 6.5in width, text indentation) |
| `src/renderer/components/CommentsPanel.tsx` | **NEW** — 264px sidebar with comment CRUD, filter (all/open/resolved), click-to-navigate, resolve/reopen/delete actions |
| `src/renderer/components/Sidebar.tsx` | "Backup" and "Restore" buttons in toolbar |
| `src/renderer/styles/globals.css` | Preview pane CSS (.preview-content styles for print-like rendering) |

### Notes
- 6 new IPC channels (GET_COMMENTS, CREATE_COMMENT, UPDATE_COMMENT, DELETE_COMMENT, BACKUP_PROJECT, RESTORE_PROJECT)
- 1 new database migration (014_inline_comments)
- No new npm dependencies
- Preview pane shows live formatted output alongside editor (toggle via toolbar)
- Comments panel has filter tabs (All/Open/Resolved) and click-to-navigate
- Enhanced status bar shows: words, chars, sentences, paragraphs, reading time, Flesch Reading Ease score (color-coded green/yellow/red)
- Backup exports everything: project, chapters, encyclopedia, outlines, chapter notes, inline comments
- Restore creates a new project with "(Restored)" suffix, remaps all IDs

---

## Sprint 7 (COMPLETED)

### Features Implemented

| # | Feature | Phase | New Table | New Panel | IPC Channels |
|---|---------|-------|-----------|-----------|-------------|
| 1 | Article Mode | 4B | — | — (EditorToolbar toggle + CSS) | 0 (settings persistence) |
| 2 | Publishing Presets | 3I | — | PublishingPresetsPanel | 1 (VALIDATE_PUBLISHING_PRESET) |
| 3 | Chapter Notes | QoL | writer_chapter_notes | — (inline in Editor) | 2 (GET_CHAPTER_NOTES, SAVE_CHAPTER_NOTE) |
| 4 | Typewriter/Focus Mode | QoL | — | — (EditorToolbar toggles + CSS) | 0 (settings persistence) |

### Files Changed

| File | Changes |
|------|---------|
| `src/shared/types.ts` | `ChapterNote`, `PublishingPreset`, `PresetValidationResult` interfaces. `WriterSettings`: added `articleMode`, `typewriterMode`, `focusMode`. 3 new IPC channels. 3 new ElectronAPI methods |
| `src/preload/index.ts` | 3 IPC method mappings (getChapterNotes, saveChapterNote, validatePublishingPreset) |
| `src/main/index.ts` | GET_CHAPTER_NOTES + SAVE_CHAPTER_NOTE handlers (upsert pattern), VALIDATE_PUBLISHING_PRESET handler (5 presets: KDP, IngramSpark, D2D, Smashwords, Blog) |
| `src/main/database/migrations/013_chapter_notes.sql` | **NEW** — writer_chapter_notes table + index |
| `src/renderer/store/writerStore.ts` | `showPublishingPresets` state + `setShowPublishingPresets` action |
| `src/renderer/components/Editor.tsx` | Article mode class, typewriter mode scroll-to-center, focus mode class, chapter notes panel with auto-save, @tiptap/extension-focus integration |
| `src/renderer/components/EditorToolbar.tsx` | Article Mode toggle + formatting legend, Typewriter Mode (TW) toggle, Focus Mode toggle. Writing modes (Screenplay/Poetry/Article) are all mutually exclusive |
| `src/renderer/components/PublishingPresetsPanel.tsx` | **NEW** — 5 publishing presets (KDP, IngramSpark, D2D, Smashwords, Blog) with validation + one-click export |
| `src/renderer/components/Sidebar.tsx` | "Publish" button in toolbar |
| `src/renderer/App.tsx` | Import PublishingPresetsPanel, showPublishingPresets state, conditional render |
| `src/renderer/styles/globals.css` | Article mode CSS (Georgia serif, pull quotes, sidebar notes), typewriter mode CSS (45vh padding), focus mode CSS (dim non-active paragraphs) |
| `package.json` | Added `@tiptap/extension-focus` dependency |

### Dependencies Added
- `@tiptap/extension-focus` — For focus mode paragraph highlighting

### Notes
- 3 new IPC channels (GET_CHAPTER_NOTES, SAVE_CHAPTER_NOTE, VALIDATE_PUBLISHING_PRESET)
- 1 new database migration (013_chapter_notes)
- 1 new dependency (@tiptap/extension-focus)
- 1 new Zustand store field (showPublishingPresets)
- Writing modes (Screenplay, Poetry, Article) are mutually exclusive — toggling one disables the others

---

## Sprint 6 (COMPLETED)

### Features Implemented

| # | Feature | Phase | New Table | New Panel | IPC Channels |
|---|---------|-------|-----------|-----------|-------------|
| 1 | Cover Designer | 3H | — | CoverDesignerPanel | 1 (EXPORT_COVER) |
| 2 | Chapter Templates | 3A | — | — (Sidebar template picker) | 0 (uses existing create-chapter) |
| 3 | Drag & Drop Chapter Reorder | 4E | — | — (Sidebar DnD) | 0 (uses existing reorder-chapters) |
| 4 | Cover button in sidebar toolbar | — | — | — | 0 |

### Files Changed

| File | Changes |
|------|---------|
| `src/shared/types.ts` | `ChapterTemplate` interface, `EXPORT_COVER` IPC channel, `exportCover` ElectronAPI method |
| `src/preload/index.ts` | 1 IPC method mapping (exportCover) |
| `src/main/index.ts` | EXPORT_COVER handler (saves base64 PNG via native save dialog) |
| `src/renderer/store/writerStore.ts` | `showCoverDesigner` state, `setShowCoverDesigner` action |
| `src/renderer/components/CoverDesignerPanel.tsx` | **NEW** — Canvas-based cover designer with 8 genre templates, text controls, PNG export |
| `src/renderer/components/Sidebar.tsx` | `CHAPTER_TEMPLATES` constant (6 templates), template picker dropdown ("T" button), drag-and-drop chapter reordering (HTML5 DnD), "Cover" button in toolbar |
| `src/renderer/App.tsx` | Import CoverDesignerPanel, showCoverDesigner state, conditional render |

### Notes
- 1 new IPC channel (EXPORT_COVER)
- No new dependencies
- No new database migrations
- 1 new Zustand store field (showCoverDesigner)

---

## Sprint 5 (COMPLETED)

### Features Implemented

| # | Feature | Phase | New Table | New Panel | IPC Channels |
|---|---------|-------|-----------|-----------|-------------|
| 1 | PDF Export | 3E | — | — (ExportModal) | 0 (extends existing) |
| 2 | Poetry Mode | 4B | — | — (EditorToolbar toggle + CSS) | 0 (settings persistence) |
| 3 | Typography Controls | 3B | — | — (SettingsPanel) | 0 (settings persistence) |
| 4 | Find & Replace | 4E | — | FindReplaceBar (inline) | 0 (local component state) |

### Files Changed

| File | Changes |
|------|---------|
| `src/shared/types.ts` | `WriterSettings`: added `poetryMode`, `fontFamily`, `fontSize`, `lineHeight`. Export format union updated to include `'pdf'` |
| `src/main/index.ts` | PDF export handler using `BrowserWindow.printToPDF()`, updated format type annotation |
| `src/renderer/components/Editor.tsx` | Poetry mode CSS class, typography CSS vars (`--editor-font`, `--editor-font-size`, `--editor-line-height`), `Ctrl+F` handler, FindReplaceBar integration |
| `src/renderer/components/EditorToolbar.tsx` | Poetry Mode toggle button + formatting legend. Screenplay/Poetry mutually exclusive |
| `src/renderer/components/ExportModal.tsx` | PDF format option (7th format), PDF included in book options (title page, TOC, author name) |
| `src/renderer/components/SettingsPanel.tsx` | Typography section: font family dropdown (7 options), font size slider (12–24px), line height slider (1.0–3.0) |
| `src/renderer/components/FindReplaceBar.tsx` | **NEW** — Find/Replace bar with ProseMirror decorations, case-sensitive toggle, navigate + replace |
| `src/renderer/styles/globals.css` | Poetry mode CSS rules, typography CSS custom properties, `find-result` / `find-result-active` decoration classes |

### Notes
- No new IPC channels
- No new dependencies
- No new database migrations
- No new Zustand store state (poetry/typography use existing settings pattern; find/replace is local component state)

---

## Sprint 4 (COMPLETED)

### Features Implemented

| # | Feature | Phase | New Table | New Panel | IPC Channels |
|---|---------|-------|-----------|-----------|-------------|
| 1 | Screenplay Mode | 4B | — | — (EditorToolbar toggle + CSS) | 0 (settings persistence) |
| 2 | Audiobook Script Export | 3G | — | — (ExportModal) | 0 (extends existing) |
| 3 | Writing Dashboard | 4E | — | WritingDashboardPanel | 1 (GET_WRITING_STATS) |
| 4 | Project Import | 4E | — | — (Sidebar button) | 1 (IMPORT_FILES) |

### Files Changed

| File | Changes |
|------|---------|
| `src/shared/types.ts` | `WriterSettings.screenplayMode` field, `WritingStats` interface, 2 IPC channels (GET_WRITING_STATS, IMPORT_FILES), export format union updated to include `'audiobook'`, 2 ElectronAPI methods |
| `src/preload/index.ts` | 2 IPC method mappings (getWritingStats, importFiles) |
| `src/main/index.ts` | Updated export format type, audiobook export handler, GET_WRITING_STATS handler, IMPORT_FILES handler |
| `src/renderer/store/writerStore.ts` | Dashboard state (showDashboard, dashboardStats, dashboardLoading), actions (setShowDashboard, loadDashboardStats, importFiles) |
| `src/renderer/components/Editor.tsx` | Applies `screenplay-mode` CSS class when `settings.screenplayMode` enabled |
| `src/renderer/components/EditorToolbar.tsx` | Screenplay Mode toggle button + formatting legend |
| `src/renderer/components/ExportModal.tsx` | Added audiobook format option (6th format) + audiobook options section |
| `src/renderer/components/WritingDashboardPanel.tsx` | **NEW** — dashboard modal with 8 stat cards + canvas bar charts (daily words, chapter words) |
| `src/renderer/components/Sidebar.tsx` | "Dashboard" and "Import" buttons in bottom toolbar |
| `src/renderer/App.tsx` | Import WritingDashboardPanel, showDashboard state, conditional render |
| `src/renderer/styles/globals.css` | Screenplay mode CSS rules (Courier New, element remapping for scene heading, character, parenthetical, dialogue, transition) |

---

## Sprint 3 (COMPLETED)

### Features Implemented

| # | Feature | Phase | New Table | New Panel | IPC Channels |
|---|---------|-------|-----------|-----------|-------------|
| 1 | EPUB Export | 3F | — | — (ExportModal) | 0 (extends existing) |
| 2 | HTML Export | 3G | — | — (ExportModal) | 0 (extends existing) |
| 3 | Character Relationship Map | 2J | `writer_character_relationships` | RelationshipMapPanel | 5 + 1 AI |
| 4 | Submission Package Generator | 3I | — | SubmissionPackagePanel | 1 AI |

### Files Changed

| File | Changes |
|------|---------|
| `src/main/database/migrations/012_character_relationships.sql` | **NEW** — relationship table + index |
| `src/shared/types.ts` | 2 interfaces (CharacterRelationship, SubmissionPackageResult), 7 IPC channels, 7 ElectronAPI methods, updated export format union |
| `src/preload/index.ts` | 7 IPC method mappings |
| `src/main/index.ts` | `mapRelationship` mapper, EPUB/HTML export handlers, 5 relationship CRUD/scan handlers, 1 submission package AI handler |
| `src/renderer/store/writerStore.ts` | Relationship + submission state, ~10 actions, updated selectProject |
| `src/renderer/components/ExportModal.tsx` | 5 format options (added EPUB + HTML), author name input, shared book options panel |
| `src/renderer/components/RelationshipMapPanel.tsx` | **NEW** — canvas graph + list view, AI scan, drag nodes |
| `src/renderer/components/SubmissionPackagePanel.tsx` | **NEW** — AI submission package with 4 sections + clipboard |
| `src/renderer/components/Sidebar.tsx` | "Relations" and "Submit" buttons in toolbar |
| `src/renderer/App.tsx` | Imports + modal renders for both new panels |
| `package.json` | Added `jszip` dependency |

### Dependencies Added
- `jszip: ^3.10.1` — For EPUB generation (ZIP-based format)

---

## Sprint 2 (COMPLETED)

| # | Feature | Phase |
|---|---------|-------|
| 1 | Analysis Tools | 4A |
| 2 | Theme Support (Dark/Light/Sepia) | 4E |
| 3 | Ambient Sounds | 4E |
| 4 | DOCX Export | 3G |

---

## Sprint 1 (COMPLETED)

| # | Feature | Phase |
|---|---------|-------|
| 1 | Model Comparison | 2H |
| 2 | Brain Dump Mode | 2I |
| 3 | Enhanced Encyclopedia | 2J |
| 4 | Transformation Pipelines | 2K |

---

## Remaining Roadmap Items

### Phase 3 (Publishing)
- [x] Custom Chapter Templates (3A — DONE Sprint 9: writer_custom_templates table, integrated into Sidebar template picker)
- [x] Template System (3A — DONE Sprint 13: 7 page layout presets — Novel 6x9, Digest 5.5x8.5, Mass Market 4.25x6.87, Small 5x8, Standard Letter, Academic A4, A5 Booklet — one-click applies page size + margins in PageSetupPanel; 3 new page sizes added)
- [x] Named Styles (3B — DONE Sprint 10: 8 paragraph style presets via CSS classes, persisted in settings)
- [x] Drop Caps (3B — DONE Sprint 10: 3 styles — Classic, Raised, Hanging — via CSS ::first-letter)
- [x] Paragraph Controls (3B — DONE Sprint 11: spacing slider 0–3em, indent slider 0–3em, text alignment left/center/right/justify in SettingsPanel, CSS custom properties in Editor)
- [x] Additional font slots (3B — DONE Sprint 12: heading font selector, code font selector independent from body font, CSS variable-driven)
- [x] Character controls: small caps, letter spacing (3B — DONE Sprint 12: SC toggle in EditorToolbar, letter spacing slider -0.05 to 0.2em in SettingsPanel)
- [x] AI Font Pairings (3B — DONE Sprint 12: SUGGEST_FONT_PAIRINGS IPC, AI suggests 3 body+heading+code pairings with rationale, one-click Apply in SettingsPanel)
- [x] Typography Controls (3B — DONE Sprint 13: kerning slider -0.05 to 0.1em, ligatures toggle in SettingsPanel; applied via CSS custom properties in Editor.tsx)
- [x] Page Setup (3C — DONE Sprint 9: page size, margins, headers, footers, page numbers via PageSetupPanel)
- [x] Chapter Opener (3C — DONE Sprint 12: ChapterOpenerConfig with title size, lower start 0–8em, ornamental dividers, title alignment, chapter label toggle, page break toggle; rendered in PreviewPane with ornament CSS classes)
- [x] Front Matter (3C — DONE Sprint 13: FrontMatterConfig in WriterSettings with title page, copyright page with auto-generated text, dedication page, epigraph page with attribution; rendered in PDF export with proper page breaks; front matter checkbox in ExportModal)
- [x] Multi-Column Layout (3C — DONE Sprint 14: CSS column-count 1/2/3, toggle in EditorToolbar, CSS var --editor-columns in Editor.tsx and globals.css)
- [x] Custom Master Pages (3C — DONE Sprint 14: writer_master_pages table, migration 017, CRUD handlers, save/load/delete in PageSetupPanel, MasterPagePreset type)
- [x] Full Page Image / Bleed (3C — DONE Sprint 15: bleed margin settings in PageSetupPanel, full-page-image CSS class in PDF export, INSERT_IMAGE IPC handler with file dialog + base64 conversion + dimension extraction, IMG button in EditorToolbar)
- [x] Live WYSIWYG Preview (3D — DONE Sprint 8: split preview pane with print-style layout)
- [x] Preview Zoom & Navigation (3D — DONE Sprint 11: zoom controls 50–200%, heading navigation dropdown with scroll-to-heading in PreviewPane)
- [x] PDF Export Enhanced (3E — DONE Sprint 13: Screen mode — Letter size, standard margins; Print-Ready mode — 6x9 trade format; front matter integration — title, copyright, dedication, epigraph pages; TOC with internal anchors; centered chapter titles with proper drop; page setup margin integration)
- [x] Interactive PDF (3E — DONE Sprint 15: clickable TOC links with dotted borders, bookmark-level CSS on chapter headings, hyperlink styling in PDF export)
- [x] Kindle EPUB Export (3G — DONE Sprint 10: NCX + KF8-compatible CSS + Bookerly font hints + guide element)
- [x] Cover Designer Front/Back/Spine (3H — DONE Sprint 15: full rewrite of CoverDesignerPanel with front/back/spine canvas rendering, full-wrap export, page count slider, spine width calculation, back cover blurb + ISBN barcode placeholder)
- [x] Cover Designer Layer System (3H — DONE Sprint 16: full layer system with background/image/text layers, z-order, opacity sliders, visibility toggles, layer reordering, upload image, text properties, tabbed UI; templates update layer colors; UPLOAD_COVER_IMAGE IPC handler)
- [ ] Cover Designer (3H — remaining: AI cover concepts via NS Studio)

### Phase 4 (Polish)
- [x] Tracked Changes (4C — DONE Sprint 9: TrackedChangesPanel, writer_tracked_changes table, 4 IPC channels)
- [x] Feedback Dashboard (4C — DONE Sprint 10: AI-generated revision plan from open comments, priority grouping, category badges)
- [x] Export Review Copies (4C — DONE Sprint 11: EXPORT_REVIEW_COPY IPC generates styled HTML with chapters, inline comments, and reader feedback questionnaire; Review button in Sidebar)
- [x] Import Tracked Changes from DOCX (4C — DONE Sprint 14: IMPORT_DOCX_CHANGES IPC handler, dialog + JSZip parsing of w:ins/w:del revision markup, "Import DOCX" button in TrackedChangesPanel)
- [x] Import PDF Annotations (4C — DONE Sprint 15: IMPORT_PDF_ANNOTATIONS handler parses PDF binary for /Annot objects, extracts Text/Highlight/Underline/StrikeOut/FreeText annotations, creates tracked change records; "Import PDF" button in TrackedChangesPanel)
- [x] NovaSyn Send-To Protocol (4D — DONE Sprint 16: SEND_TO_EXCHANGE IPC handler, shared exchange directory %APPDATA%/NovaSyn/exchange/, send current chapter/selected text/all encyclopedia entries as JSON packets with sourceApp, contentType, title, content, metadata)
- [x] NovaSyn Receive-From Protocol (4D — DONE Sprint 16: RECEIVE_FROM_EXCHANGE/LIST_EXCHANGE_PACKETS/DELETE_EXCHANGE_PACKET IPC handlers, ExchangePanel modal with Send To/Receive From tabs, content type badges, preview/expand, import to editor, delete)
- [x] Extension/Plugin System (4E — DONE Sprint 16: plugin registry with 4 built-in plugins — Word Frequency, Reading Time, Lorem Ipsum, Text Statistics; enable/disable toggle with file persistence; GET_PLUGINS/TOGGLE_PLUGIN/RUN_PLUGIN IPC handlers; PluginsPanel modal)
- [x] Auto-Updater (4E — DONE Sprint 14: CHECK_FOR_UPDATES IPC handler fetches remote JSON manifest + semver comparison, auto-check on launch toggle in SettingsPanel, autoCheckUpdates field in WriterSettings)
- [x] Writing Sprints (QoL — DONE Sprint 9: WritingSprintPanel, writer_sprints table, 3 IPC channels)
- [x] Project Backup & Restore (QoL — DONE Sprint 8: full JSON backup/restore with ID remapping)
- [x] Enhanced Status Bar (QoL — DONE Sprint 8: sentences, paragraphs, reading time, Flesch score)
- [x] Global Search (4E — DONE Sprint 18: GlobalSearchPanel Spotlight-style modal, Ctrl+K shortcut, searches across chapters/encyclopedia/KB/notes/timeline, type filter pills, debounced search, click-to-navigate; GLOBAL_SEARCH IPC channel)
- [x] Timeline View (4E — DONE Sprint 18: TimelinePanel vertical visual timeline of story events, CRUD, chapter linking, color coding, inline editing, drag-to-reorder; writer_timeline_events table, migration 019, 4 IPC channels)
- [x] Scene Cards / Storyboard (4E — DONE Sprint 18: StoryboardPanel card-based visual chapter overview, synopsis, status tracking, POV character, word count targets with progress bars, drag-to-reorder; writer_chapter_targets table, migration 019, 3 IPC channels)
- [x] Word Count Targets (4E — DONE Sprint 18: per-chapter word count goals in writer_chapter_targets, upsert pattern, visual progress bars in StoryboardPanel)
