# NovaSyn Writer — IPC Channel Reference

## Overview

All IPC channels are defined in `src/shared/types.ts` as `IPC_CHANNELS`. The preload bridge exposes them as typed methods on `window.electronAPI`. Handlers are registered in `src/main/index.ts:registerIPCHandlers()`.

## Adding a New IPC Channel

1. **`src/shared/types.ts`** — Add channel constant to `IPC_CHANNELS`
2. **`src/shared/types.ts`** — Add method signature to `ElectronAPI` interface
3. **`src/preload/index.ts`** — Add `ipcRenderer.invoke()` mapping
4. **`src/main/index.ts`** — Add `ipcMain.handle()` handler
5. **Renderer** — Call via `window.electronAPI.newMethod()`

## Channel Reference

### Projects

| Channel | Method | Parameters | Returns |
|---------|--------|-----------|---------|
| `get-projects` | `getProjects()` | — | `Project[]` |
| `create-project` | `createProject(name, description?)` | name: string, description?: string | `Project` (also creates Chapter 1) |
| `update-project` | `updateProject(id, updates)` | id: string, { name?, description? } | `Project` |
| `delete-project` | `deleteProject(id)` | id: string | void (CASCADE deletes chapters, sections, encyclopedia, outlines) |

### Chapters

| Channel | Method | Parameters | Returns |
|---------|--------|-----------|---------|
| `get-chapters` | `getChapters(projectId)` | projectId: string | `Chapter[]` (sorted by sort_order) |
| `create-chapter` | `createChapter(projectId, title)` | projectId: string, title: string | `Chapter` (auto sort_order) |
| `update-chapter` | `updateChapter(id, updates)` | id: string, { title?, content?, wordCount? } | `Chapter` |
| `delete-chapter` | `deleteChapter(id)` | id: string | void (CASCADE deletes sections, outlines) |
| `reorder-chapters` | `reorderChapters(chapterIds)` | chapterIds: string[] | void (sets sort_order = array index) |

### Sections

| Channel | Method | Parameters | Returns |
|---------|--------|-----------|---------|
| `get-sections` | `getSections(chapterId)` | chapterId: string | `Section[]` (sorted by sort_order) |
| `create-section` | `createSection(chapterId, title)` | chapterId: string, title: string | `Section` |
| `update-section` | `updateSection(id, updates)` | id: string, { title?, content?, wordCount? } | `Section` |
| `delete-section` | `deleteSection(id)` | id: string | void |
| `reorder-sections` | `reorderSections(sectionIds)` | sectionIds: string[] | void |

### Encyclopedia

| Channel | Method | Parameters | Returns |
|---------|--------|-----------|---------|
| `get-encyclopedia` | `getEncyclopedia(projectId)` | projectId: string | `EncyclopediaEntry[]` (sorted by name) |
| `create-encyclopedia-entry` | `createEncyclopediaEntry(projectId, entry)` | projectId: string, { name, category, content } | `EncyclopediaEntry` (tokens auto-calculated) |
| `update-encyclopedia-entry` | `updateEncyclopediaEntry(id, updates)` | id: string, { name?, category?, content? } | `EncyclopediaEntry` (tokens recalculated if content changed) |
| `delete-encyclopedia-entry` | `deleteEncyclopediaEntry(id)` | id: string | void |
| `search-encyclopedia` | `searchEncyclopedia(projectId, query)` | projectId: string, query: string | `EncyclopediaEntry[]` (LIKE search on name + content) |

### Outlines

| Channel | Method | Parameters | Returns |
|---------|--------|-----------|---------|
| `get-outline` | `getOutline(chapterId)` | chapterId: string | `Outline \| null` |
| `save-outline` | `saveOutline(chapterId, beats)` | chapterId: string, beats: string[] | `Outline` (upsert — creates or updates) |

### Versions

| Channel | Method | Parameters | Returns |
|---------|--------|-----------|---------|
| `get-versions` | `getVersions(chapterId)` | chapterId: string | `Version[]` (sorted by created_at DESC, limit 50) |
| `create-version` | `createVersion(chapterId, snapshotName?, source?)` | chapterId: string, snapshotName?: string, source?: string | `Version` |
| `restore-version` | `restoreVersion(versionId)` | versionId: string | `Chapter` (creates pre-restore auto-snapshot, overwrites chapter content) |
| `delete-version` | `deleteVersion(versionId)` | versionId: string | void |

### AI Operations

| Channel | Method | Parameters | Returns |
|---------|--------|-----------|---------|
| `get-ai-operations` | `getAiOperations(projectId)` | projectId: string | `AiOperation[]` (last 100, sorted by created_at DESC) |
| `update-ai-operation` | `updateAiOperation(id, updates)` | id: string, { accepted?: number } | void |

### AI

| Channel | Method | Parameters | Returns |
|---------|--------|-----------|---------|
| `send-prompt` | `sendPrompt(prompt, modelId, context)` | prompt: string, modelId: string, { chapterContent?, encyclopediaEntries?, systemPrompt?, projectId?, chapterId?, operationType? } | `{ content, model, totalTokens, operationId? }` |
| `cancel-stream` | `cancelStream()` | — | void (AbortController-based, cancels in-progress stream) |
| — | `onAiDelta(callback)` | callback: (text: string) => void | cleanup function. Listens to `'ai-stream-delta'` event |

### Export

| Channel | Method | Parameters | Returns |
|---------|--------|-----------|---------|
| `export-project` | `exportProject(projectId, options)` | projectId: string, { format: 'markdown'\|'text'\|'docx'\|'epub'\|'html'\|'audiobook'\|'pdf', scope: 'all'\|'chapter', chapterId?, manuscriptFormat?, includeTitlePage?, includeToc?, authorName? } | `{ success, filePath? }` (shows save dialog) |

### Settings

| Channel | Method | Parameters | Returns |
|---------|--------|-----------|---------|
| `get-settings` | `getSettings()` | — | `WriterSettings` |
| `save-settings` | `saveSettings(updates)` | Partial\<WriterSettings\> | void |

### Models & API Keys

| Channel | Method | Parameters | Returns |
|---------|--------|-----------|---------|
| `get-models` | `getModels()` | — | `AIModel[]` |
| `get-api-keys` | `getApiKeys()` | — | `Record<string, string>` |
| `set-api-key` | `setApiKey(provider, key)` | provider: string, key: string | void |

### Sessions

| Channel | Method | Parameters | Returns |
|---------|--------|-----------|---------|
| `start-session` | `startSession(projectId, startWordCount)` | projectId: string, startWordCount: number | `WriterSession` |
| `end-session` | `endSession(sessionId, endWordCount, wordsAdded, aiWordsAccepted, aiOpsCount)` | sessionId: string, endWordCount: number, wordsAdded: number, aiWordsAccepted: number, aiOpsCount: number | `WriterSession` |
| `update-session` | `updateSession(sessionId, durationSeconds, endWordCount, wordsAdded, aiWordsAccepted, aiOpsCount)` | sessionId: string, durationSeconds: number, endWordCount: number, wordsAdded: number, aiWordsAccepted: number, aiOpsCount: number | void |
| `get-sessions` | `getSessions(projectId)` | projectId: string | `WriterSession[]` (last 20, sorted by started_at DESC) |
| `get-session-stats` | `getSessionStats(projectId)` | projectId: string | `SessionStats` (todayWords, weekWords, avgSessionMinutes, totalSessions, mostProductiveHour) |

### Goals

| Channel | Method | Parameters | Returns |
|---------|--------|-----------|---------|
| `get-goals` | `getGoals(projectId)` | projectId: string | `WriterGoal[]` |
| `set-goal` | `setGoal(projectId, goalType, targetWords)` | projectId: string, goalType: string, targetWords: number | `WriterGoal` (upsert — one goal per type per project) |
| `delete-goal` | `deleteGoal(goalId)` | goalId: string | void |

### Discovery

| Channel | Method | Parameters | Returns |
|---------|--------|-----------|---------|
| `start-discovery` | `startDiscovery(projectId, chapterId?)` | projectId: string, chapterId?: string | `DiscoverySession` |
| `end-discovery` | `endDiscovery(sessionId)` | sessionId: string | `DiscoverySession` (computes final stats) |
| `get-discovery-sessions` | `getDiscoverySessions(projectId)` | projectId: string | `DiscoverySession[]` (last 20, sorted by started_at DESC) |
| `generate-suggestions` | `generateSuggestions(sessionId, chapterContent, encyclopediaContext, followThread?, temperature?)` | sessionId: string, chapterContent: string, encyclopediaContext: string, followThread?: string, temperature?: number | `DiscoverySuggestion[]` (3 "what if" suggestions, stored in DB) |
| `accept-suggestion` | `acceptSuggestion(suggestionId)` | suggestionId: string | void (marks accepted, updates session count) |
| `set-follow-thread` | `setFollowThread(sessionId, followThread)` | sessionId: string, followThread: string | void |
| `convert-discovery` | `convertDiscovery(sessionId)` | sessionId: string | `{ suggestions: string[] }` (accepted suggestion texts) |

### Continuity — Plants

| Channel | Method | Parameters | Returns |
|---------|--------|-----------|---------|
| `get-plants` | `getPlants(projectId)` | projectId: string | `ContinuityPlant[]` |
| `create-plant` | `createPlant(projectId, plant)` | projectId: string, { name, setupChapterId?, setupContent?, payoffChapterId?, payoffContent?, status?, notes? } | `ContinuityPlant` |
| `update-plant` | `updatePlant(id, updates)` | id: string, partial plant fields | `ContinuityPlant` |
| `delete-plant` | `deletePlant(id)` | id: string | void |

### Continuity — Threads

| Channel | Method | Parameters | Returns |
|---------|--------|-----------|---------|
| `get-threads` | `getThreads(projectId)` | projectId: string | `ContinuityThread[]` |
| `create-thread` | `createThread(projectId, thread)` | projectId: string, { question, raisedChapterId?, targetChapterId?, status?, notes? } | `ContinuityThread` |
| `update-thread` | `updateThread(id, updates)` | id: string, partial thread fields | `ContinuityThread` |
| `delete-thread` | `deleteThread(id)` | id: string | void |

### Continuity — Character Knowledge

| Channel | Method | Parameters | Returns |
|---------|--------|-----------|---------|
| `get-character-knowledge` | `getCharacterKnowledge(projectId)` | projectId: string | `CharacterKnowledge[]` |
| `create-character-knowledge` | `createCharacterKnowledge(projectId, entry)` | projectId: string, { characterId, chapterId, knows?, doesNotKnow? } | `CharacterKnowledge` |
| `update-character-knowledge` | `updateCharacterKnowledge(id, updates)` | id: string, { knows?, doesNotKnow? } | `CharacterKnowledge` |
| `delete-character-knowledge` | `deleteCharacterKnowledge(id)` | id: string | void |

### Continuity — AI Scans

| Channel | Method | Parameters | Returns |
|---------|--------|-----------|---------|
| `scan-for-plants` | `scanForPlants(projectId)` | projectId: string | `any[]` (AI-detected plant suggestions as JSON) |
| `scan-for-threads` | `scanForThreads(projectId)` | projectId: string | `any[]` (AI-detected thread suggestions as JSON) |
| `verify-knowledge` | `verifyKnowledge(projectId, characterId)` | projectId: string, characterId: string | `any[]` (knowledge inconsistency results as JSON) |

### Knowledge Base

| Channel | Method | Parameters | Returns |
|---------|--------|-----------|---------|
| `get-kb-entries` | `getKbEntries(projectId)` | projectId: string | `KnowledgeBaseEntry[]` (project-scoped + global entries, sorted by category then title) |
| `create-kb-entry` | `createKbEntry(entry)` | { projectId?, title, category, content, isGlobal } | `KnowledgeBaseEntry` (tokens auto-calculated) |
| `update-kb-entry` | `updateKbEntry(id, updates)` | id: string, { title?, category?, content?, isGlobal? } | `KnowledgeBaseEntry` (tokens recalculated if content changed) |
| `delete-kb-entry` | `deleteKbEntry(id)` | id: string | void |
| `search-kb` | `searchKb(projectId, query)` | projectId: string, query: string | `KnowledgeBaseEntry[]` (LIKE search on title + content) |
| `kb-analyze-voice` | `kbAnalyzeVoice(entryId)` | entryId: string | `string` (AI voice profile analysis text) |
| `kb-find-connections` | `kbFindConnections(projectId)` | projectId: string | `any[]` (connection suggestions as JSON array) |
| `kb-suggest-gaps` | `kbSuggestGaps(projectId)` | projectId: string | `any[]` (gap suggestions as JSON array) |

### Encyclopedia AI

| Channel | Method | Parameters | Returns |
|---------|--------|-----------|---------|
| `encyclopedia-generate-profile` | `encyclopediaGenerateProfile(entryId)` | entryId: string | `string` (structured profile text) |
| `encyclopedia-extract-entries` | `encyclopediaExtractEntries(projectId)` | projectId: string | `{name, category, content}[]` |
| `encyclopedia-check-consistency` | `encyclopediaCheckConsistency(projectId)` | projectId: string | `{entry, issue, suggestion}[]` |

### Brain Dumps

| Channel | Method | Parameters | Returns |
|---------|--------|-----------|---------|
| `get-brain-dumps` | `getBrainDumps(projectId)` | projectId: string | `BrainDump[]` |
| `create-brain-dump` | `createBrainDump(projectId, content)` | projectId: string, content: string | `BrainDump` |
| `update-brain-dump` | `updateBrainDump(id, content)` | id: string, content: string | `BrainDump` |
| `delete-brain-dump` | `deleteBrainDump(id)` | id: string | `void` |
| `extract-brain-dump` | `extractBrainDump(id)` | id: string | `BrainDumpExtraction` (ideas, entries, beats, questions) |

### Model Comparison

| Channel | Method | Parameters | Returns |
|---------|--------|-----------|---------|
| `compare-models` | `compareModels(prompt, modelIds, context)` | prompt: string, modelIds: string[], context: object | `ModelComparisonResult[]` |

### Pipelines

| Channel | Method | Parameters | Returns |
|---------|--------|-----------|---------|
| `get-pipelines` | `getPipelines(projectId)` | projectId: string | `Pipeline[]` |
| `create-pipeline` | `createPipeline(projectId, pipeline)` | projectId: string, pipeline: object | `Pipeline` |
| `update-pipeline` | `updatePipeline(id, updates)` | id: string, updates: object | `Pipeline` |
| `delete-pipeline` | `deletePipeline(id)` | id: string | `void` |
| `run-pipeline` | `runPipeline(pipelineId, inputText)` | pipelineId: string, inputText: string | `PipelineRunResult[]` |

### Analysis

| Channel | Method | Parameters | Returns |
|---------|--------|-----------|---------|
| `run-analysis` | `runAnalysis(projectId, type, chapterId?)` | projectId: string, type: string, chapterId?: string | `Analysis` (AI-powered for pacing/voice/consistency) |
| `get-analyses` | `getAnalyses(projectId)` | projectId: string | `Analysis[]` (last 50, sorted by created_at DESC) |
| `delete-analysis` | `deleteAnalysis(id)` | id: string | void |
| `get-readability` | `getReadability(projectId, chapterId?)` | projectId: string, chapterId?: string | `ReadabilityResult` (local computation, no AI) |
| `get-overused-words` | `getOverusedWords(projectId, chapterId?)` | projectId: string, chapterId?: string | `{ word, count }[]` |

### Character Relationships

| Channel | Method | Parameters | Returns |
|---------|--------|-----------|---------|
| `get-relationships` | `getRelationships(projectId)` | projectId: string | `CharacterRelationship[]` |
| `create-relationship` | `createRelationship(projectId, rel)` | projectId: string, { characterAId, characterBId, relationshipType, description } | `CharacterRelationship` |
| `update-relationship` | `updateRelationship(id, updates)` | id: string, { relationshipType?, description? } | `CharacterRelationship` |
| `delete-relationship` | `deleteRelationship(id)` | id: string | void |
| `scan-relationships` | `scanRelationships(projectId)` | projectId: string | `{ characterAName, characterBName, relationshipType, description }[]` (AI-powered) |

### Submission Package

| Channel | Method | Parameters | Returns |
|---------|--------|-----------|---------|
| `generate-submission-package` | `generateSubmissionPackage(projectId)` | projectId: string | `SubmissionPackageResult` (AI-powered: logline, synopsis, queryLetter, authorBio) |

### Dashboard

| Channel | Method | Parameters | Returns |
|---------|--------|-----------|---------|
| `get-writing-stats` | `getWritingStats(projectId)` | projectId: string | `WritingStats` (totalWords, totalChapters, avgWordsPerChapter, longestChapter, shortestChapter, encyclopediaEntries, aiOpsCount, aiAcceptRate, sessionCount, totalSessionMinutes, wordsPerDay: last 30 days, wordsByChapter) |

### Import

| Channel | Method | Parameters | Returns |
|---------|--------|-----------|---------|
| `import-files` | `importFiles(projectId)` | projectId: string | `{ imported: number }` (opens native file dialog for .txt/.md/.markdown/.text, creates chapters from files) |

### Cover Designer

| Channel | Method | Parameters | Returns |
|---------|--------|-----------|---------|
| `export-cover` | `exportCover(dataUrl)` | dataUrl: string (base64 PNG data URL) | `{ success: boolean, filePath?: string }` (shows native save dialog, writes PNG file) |

### Chapter Notes

| Channel | Method | Parameters | Returns |
|---------|--------|-----------|---------|
| `get-chapter-notes` | `getChapterNotes(chapterId)` | chapterId: string | `ChapterNote[]` |
| `save-chapter-note` | `saveChapterNote(chapterId, content)` | chapterId: string, content: string | `ChapterNote` (upsert — creates or updates) |

### Publishing Presets

| Channel | Method | Parameters | Returns |
|---------|--------|-----------|---------|
| `validate-publishing-preset` | `validatePublishingPreset(projectId, preset)` | projectId: string, preset: string (`'kdp'` \| `'ingram-spark'` \| `'d2d'` \| `'smashwords'` \| `'blog'`) | `PresetValidationResult` (checks, warnings, one-click export) |

### Inline Comments

| Channel | Method | Parameters | Returns |
|---------|--------|-----------|---------|
| `get-comments` | `getComments(chapterId)` | chapterId: string | `InlineComment[]` |
| `create-comment` | `createComment(chapterId, comment)` | chapterId: string, { fromPos: number, toPos: number, text: string, author?: string } | `InlineComment` |
| `update-comment` | `updateComment(id, updates)` | id: string, { text?: string, resolved?: number } | `InlineComment` |
| `delete-comment` | `deleteComment(id)` | id: string | void |

### Project Backup & Restore

| Channel | Method | Parameters | Returns |
|---------|--------|-----------|---------|
| `backup-project` | `backupProject(projectId)` | projectId: string | `{ success: boolean, filePath?: string }` (shows native save dialog, exports project+chapters+encyclopedia+outlines+notes+comments as JSON) |
| `restore-project` | `restoreProject()` | — | `{ success: boolean, projectId?: string }` (shows native open dialog, imports JSON backup, remaps IDs, creates new project with "(Restored)" suffix) |

### Tracked Changes

| Channel | Method | Parameters | Returns |
|---------|--------|-----------|---------|
| `get-tracked-changes` | `getTrackedChanges(chapterId)` | chapterId: string | `TrackedChange[]` |
| `create-tracked-change` | `createTrackedChange(change)` | { chapterId: string, changeType: string, fromPos: number, toPos: number, oldText: string, newText: string, author: string } | `TrackedChange` |
| `delete-tracked-change` | `deleteTrackedChange(id)` | id: string | void |
| `clear-tracked-changes` | `clearTrackedChanges(chapterId)` | chapterId: string | void |

### Writing Sprints

| Channel | Method | Parameters | Returns |
|---------|--------|-----------|---------|
| `start-sprint` | `startSprint(projectId, durationSeconds, targetWords)` | projectId: string, durationSeconds: number, targetWords: number | `WritingSprint` |
| `end-sprint` | `endSprint(sprintId, wordsWritten)` | sprintId: string, wordsWritten: number | `WritingSprint` |
| `get-sprints` | `getSprints(projectId)` | projectId: string | `WritingSprint[]` |

### Custom Templates

| Channel | Method | Parameters | Returns |
|---------|--------|-----------|---------|
| `get-custom-templates` | `getCustomTemplates()` | — | `CustomTemplate[]` |
| `create-custom-template` | `createCustomTemplate(template)` | { name: string, description: string, content: string } | `CustomTemplate` |
| `delete-custom-template` | `deleteCustomTemplate(id)` | id: string | void |

### Revision Plans (Feedback Dashboard)

| Channel | Method | Parameters | Returns |
|---------|--------|-----------|---------|
| `generate-revision-plan` | `generateRevisionPlan(projectId)` | projectId: string | `RevisionPlan` (AI-powered: tasks, summary) |
| `get-revision-plans` | `getRevisionPlans(projectId)` | projectId: string | `RevisionPlan[]` |
| `delete-revision-plan` | `deleteRevisionPlan(id)` | id: string | void |

### AI Font Pairings

| Channel | Method | Parameters | Returns |
|---------|--------|-----------|---------|
| `suggest-font-pairings` | `suggestFontPairings(genre, mood)` | genre: string, mood: string | `{ bodyFont, headingFont, codeFont, rationale }[]` (AI-powered) |

### Cover Image

| Channel | Method | Parameters | Returns |
|---------|--------|-----------|---------|
| `select-cover-image` | `selectCoverImage()` | — | `{ filePath: string, dataUrl: string } \| null` (shows native file dialog) |

### Review Copy Export

| Channel | Method | Parameters | Returns |
|---------|--------|-----------|---------|
| `export-review-copy` | `exportReviewCopy(projectId, options)` | projectId: string, { authorName?: string, includeComments?: boolean, includeQuestions?: boolean } | `{ success: boolean, filePath?: string }` |

### Master Page Presets

| Channel | Method | Parameters | Returns |
|---------|--------|-----------|---------|
| `get-master-pages` | `getMasterPages()` | — | `MasterPagePreset[]` |
| `create-master-page` | `createMasterPage(preset)` | { name, description, pageSize, marginTop, marginBottom, marginLeft, marginRight, headerText, footerText, showPageNumbers, pageNumberPosition, columns } | `MasterPagePreset` |
| `delete-master-page` | `deleteMasterPage(id)` | id: string | void |

### Import DOCX Tracked Changes

| Channel | Method | Parameters | Returns |
|---------|--------|-----------|---------|
| `import-docx-changes` | `importDocxChanges(chapterId)` | chapterId: string | `{ imported: number }` (opens native file dialog for .docx) |

### Auto-Updater

| Channel | Method | Parameters | Returns |
|---------|--------|-----------|---------|
| `check-for-updates` | `checkForUpdates()` | — | `{ updateAvailable: boolean, currentVersion: string, latestVersion?: string, downloadUrl?: string, releaseNotes?: string }` |

### Insert Image

| Channel | Method | Parameters | Returns |
|---------|--------|-----------|---------|
| `insert-image` | `insertImage()` | — | `{ dataUrl: string, fileName: string, width: number, height: number } \| null` (shows native file dialog) |

### Import PDF Annotations

| Channel | Method | Parameters | Returns |
|---------|--------|-----------|---------|
| `import-pdf-annotations` | `importPdfAnnotations(chapterId)` | chapterId: string | `{ imported: number }` (opens native file dialog for .pdf) |

### Cover Designer: Full Wrap Export

| Channel | Method | Parameters | Returns |
|---------|--------|-----------|---------|
| `export-cover-full-wrap` | `exportCoverFullWrap(dataUrl, projectName)` | dataUrl: string, projectName: string | `{ success: boolean, filePath?: string }` (shows native save dialog) |

### Cover Designer: Upload Layer Image

| Channel | Method | Parameters | Returns |
|---------|--------|-----------|---------|
| `upload-cover-image` | `uploadCoverImage()` | — | `{ dataUrl: string, fileName: string, width: number, height: number } \| null` (shows native file dialog) |

### Plugin System

| Channel | Method | Parameters | Returns |
|---------|--------|-----------|---------|
| `get-plugins` | `getPlugins()` | — | `WriterPlugin[]` |
| `toggle-plugin` | `togglePlugin(pluginId, enabled)` | pluginId: string, enabled: boolean | void |
| `run-plugin` | `runPlugin(pluginId, context)` | pluginId: string, { text?, chapterContent?, projectId? } | `PluginResult` |

### NovaSyn Ecosystem Exchange

| Channel | Method | Parameters | Returns |
|---------|--------|-----------|---------|
| `send-to-exchange` | `sendToExchange(packet)` | { sourceApp, targetApp, contentType, title, content, metadata } | `{ success: boolean, packetId: string }` |
| `receive-from-exchange` | `receiveFromExchange()` | — | `NovaSynExchangePacket[]` |
| `list-exchange-packets` | `listExchangePackets()` | — | `NovaSynExchangePacket[]` |
| `delete-exchange-packet` | `deleteExchangePacket(packetId)` | packetId: string | void |

### Writing Guide

| Channel | Method | Parameters | Returns |
|---------|--------|-----------|---------|
| `get-guide-messages` | `getGuideMessages(projectId)` | projectId: string | `GuideMessage[]` (sorted by created_at ASC) |
| `send-guide-message` | `sendGuideMessage(projectId, message)` | projectId: string, message: string | `GuideMessage` (AI response with full project context: chapters, encyclopedia, outlines, comments, KB, plants, threads, analyses) |
| `clear-guide-messages` | `clearGuideMessages(projectId)` | projectId: string | void |

### Global Search

| Channel | Method | Parameters | Returns |
|---------|--------|-----------|---------|
| `global-search` | `globalSearch(projectId, query)` | projectId: string, query: string | `GlobalSearchResult[]` (searches chapters, encyclopedia, KB, notes, timeline; returns type, id, title, excerpt, matchField) |

### Timeline Events

| Channel | Method | Parameters | Returns |
|---------|--------|-----------|---------|
| `get-timeline-events` | `getTimelineEvents(projectId)` | projectId: string | `TimelineEvent[]` (sorted by sort_order) |
| `create-timeline-event` | `createTimelineEvent(projectId, event)` | projectId: string, { title, description?, chapterId?, color?, sortOrder? } | `TimelineEvent` |
| `update-timeline-event` | `updateTimelineEvent(id, updates)` | id: string, { title?, description?, chapterId?, color?, sortOrder? } | `TimelineEvent` |
| `delete-timeline-event` | `deleteTimelineEvent(id)` | id: string | void |

### Chapter Word Count Targets

| Channel | Method | Parameters | Returns |
|---------|--------|-----------|---------|
| `get-chapter-targets` | `getChapterTargets(projectId)` | projectId: string | `ChapterTarget[]` |
| `set-chapter-target` | `setChapterTarget(chapterId, targetWords)` | chapterId: string, targetWords: number | `ChapterTarget` (upsert — creates or updates) |
| `delete-chapter-target` | `deleteChapterTarget(chapterId)` | chapterId: string | void |

### Window Controls

| Channel | Method | Parameters | Returns |
|---------|--------|-----------|---------|
| `minimize-window` | `minimizeWindow()` | — | void |
| `maximize-window` | `maximizeWindow()` | — | void (toggles maximize/unmaximize) |
| `close-window` | `closeWindow()` | — | void |

## Row Mapping (RESOLVED)

The database uses `snake_case` columns (e.g., `project_id`, `sort_order`, `word_count`, `created_at`). Row mapper functions in `src/main/index.ts` convert all DB rows to `camelCase` before returning via IPC:

- `mapProject(row)` — projects
- `mapChapter(row)` — chapters
- `mapSection(row)` — sections
- `mapEncyclopediaEntry(row)` — encyclopedia entries
- `mapOutline(row)` — outlines
- `mapVersion(row)` — versions
- `mapAiOperation(row)` — AI operations
- `mapSession(row)` — writing sessions
- `mapGoal(row)` — goals
- `mapDiscoverySession(row)` — discovery sessions
- `mapDiscoverySuggestion(row)` — discovery suggestions
- `mapPlant(row)` — continuity plants
- `mapThread(row)` — continuity threads
- `mapCharacterKnowledge(row)` — character knowledge
- `mapKbEntry(row)` — knowledge base entries (also converts `is_global` int → boolean `isGlobal`)
- `mapBrainDump(row)` — brain dumps (converts `extracted` int → boolean)
- `mapPipeline(row)` — pipelines (converts `is_preset` int → boolean, parses steps JSON)
- `mapAnalysis(row)` — analyses (parses results JSON)
- `mapRelationship(row)` — character relationships
- `mapChapterNote(row)` — chapter notes
- `mapComment(row)` — inline comments
- `mapTrackedChange(row)` — tracked changes
- `mapSprint(row)` — writing sprints
- `mapCustomTemplate(row)` — custom templates
- `mapRevisionPlan(row)` — revision plans (parses tasks JSON)
- `mapMasterPage(row)` — master page presets (converts `show_page_numbers` int to boolean)
- `mapGuideMessage(row)` — guide messages
- `mapTimelineEvent(row)` — timeline events

All IPC handlers apply the appropriate mapper. The renderer can safely use camelCase TypeScript types (e.g., `chapter.wordCount`, `entry.createdAt`).
