# NovaSyn Writer — AI Service Guide

## Overview

The AI service (`src/main/services/aiService.ts`) handles multi-provider streaming for all AI writing tools. It uses the same 4-provider pattern as NovaSyn AI but with a writing-focused system prompt.

## Supported Providers

| Provider | Models | API Endpoint | Auth |
|----------|--------|-------------|------|
| Anthropic | Claude Sonnet 4.6, Opus 4.6, Haiku 4.5 | SDK (`@anthropic-ai/sdk`) | `apiKey` param |
| OpenAI | GPT-4o, GPT-4o Mini | `https://api.openai.com/v1/chat/completions` | `Bearer` header |
| Google | Gemini 2.5 Flash, Gemini 2.5 Pro | `https://generativelanguage.googleapis.com/v1beta/models/{model}:streamGenerateContent` | `key` query param |
| xAI | Grok 3, Grok 3 Mini | `https://api.x.ai/v1/chat/completions` | `Bearer` header |

## Model Definitions

Models are defined in `src/main/models.ts` as `AVAILABLE_MODELS: AIModel[]`. Each model has:

```ts
{
  id: string;          // API model ID (e.g., 'claude-sonnet-4-6')
  name: string;        // Display name
  provider: string;    // 'anthropic' | 'openai' | 'google' | 'xai'
  contextWindow: number;
  isDefault?: boolean;
  requiresKey: boolean;
}
```

When adding new models, add them to this array. The renderer automatically picks them up.

## Streaming Pattern

All providers use server-sent events (SSE) for streaming:

1. Main process receives `send-prompt` IPC call
2. `aiService.streamCompletion()` dispatches to provider-specific handler
3. Handler sends HTTP request with `stream: true` (or SSE endpoint)
4. As chunks arrive, `onDelta(text)` callback fires
5. Main process forwards deltas via `event.sender.send('ai-stream-delta', text)`
6. Renderer listens via `window.electronAPI.onAiDelta(callback)`
7. Zustand store accumulates `aiResponse` string

### Anthropic (Special Case)
Uses the official `@anthropic-ai/sdk` with its built-in streaming:
```ts
const stream = client.messages.stream({ ... });
stream.on('text', (text) => onDelta(text));
const finalMessage = await stream.finalMessage();
```

### OpenAI / xAI (Same Pattern)
Both use OpenAI-compatible SSE format:
```
data: {"choices":[{"delta":{"content":"Hello"}}]}
data: {"choices":[{"delta":{"content":" world"}}]}
data: [DONE]
```

### Google Gemini
Uses a different SSE format:
```
data: {"candidates":[{"content":{"parts":[{"text":"Hello"}]}}]}
```
Token usage comes from `usageMetadata.promptTokenCount` / `candidatesTokenCount`.

## Context Assembly

When the AI panel sends a prompt, context is assembled in `src/main/index.ts`:

```
=== CURRENT CHAPTER ===
[chapter content as plain text extracted from TipTap JSON]

=== ENCYCLOPEDIA ===
[Category: Entry Name]
Entry content...
---
[Category: Entry Name]
Entry content...
```

Knowledge Base entries (when selected in the AI Panel) are appended to the prompt by the renderer:

```
=== KNOWLEDGE BASE CONTEXT ===
[KB: Category - Title]
Entry content...
---
[KB: Category - Title]
Entry content...
```

This context string is passed to the AI service, which incorporates it into the system prompt.

## System Prompt

The base system prompt is writing-focused:

> "You are a skilled creative writing assistant. Help the user with their writing by providing thoughtful, well-crafted prose. Match the tone and style of their existing work. Be creative but stay consistent with the established narrative."

Context (chapter content + encyclopedia) and user-defined system prompt are appended.

## Adding a New AI Tool

To add a new AI writing tool (e.g., "Dialogue Polish"):

1. **AIPanel.tsx** — Add to `AI_TOOLS` array:
   ```ts
   { id: 'dialogue-polish', label: 'Dialogue Polish', prompt: 'Polish this dialogue...' }
   ```

2. **No backend changes needed** — All tools use the same `sendPrompt` IPC channel. The only difference is the prompt text.

3. For tools that need **special context** (e.g., character voice profiles), modify the context assembly in `src/main/index.ts` to include additional data.

## Adding a New Provider

1. **models.ts** — Add model entries with the new provider name
2. **aiService.ts** — Add a new `handleXxxStream()` function following the existing pattern
3. **aiService.ts** — Add a `case` in the `switch` statement in `streamCompletion()`
4. **apiKeyStore.ts** — No changes needed (already generic key-value)
5. **SettingsPanel.tsx** — Add the provider name to the `providers` array and `providerNames` map

## Token Counting

Token counts are approximate: `Math.ceil(content.length / 4)`. This is used for:
- Encyclopedia entry token display
- Context budget estimation

For precise counting, use the `tiktoken` dependency (already in package.json but not yet wired up).

## Temperature Control (IMPLEMENTED)

The `streamCompletion()` method accepts an optional `temperature?: number` parameter. When provided, it overrides the default temperature for all providers:

| Provider | How Temperature Is Applied |
|----------|---------------------------|
| Anthropic | `temperature` field in `client.messages.stream()` params |
| OpenAI | `temperature` field in request body (default: 0.7) |
| Google | `generationConfig.temperature` (default: 0.7) |
| xAI/Grok | `temperature` field in request body (default: 0.7) |

When `temperature` is `undefined`, providers use their hardcoded defaults (0.7 for OpenAI/Google/Grok, provider default for Anthropic).

**Usage**: Discovery Mode passes the user's "surprise" slider value (0.5–1.5) as temperature. The `GENERATE_SUGGESTIONS` IPC handler passes it directly to `aiService.streamCompletion()`.

## Stream Cancellation (IMPLEMENTED)

The `CANCEL_STREAM` IPC channel is fully implemented using `AbortController`:

1. `AIService` stores an `AbortController` reference per stream
2. The `signal` is passed to all `fetch()` calls (OpenAI, xAI, Google)
3. For Anthropic SDK: `signal.addEventListener('abort', () => stream.abort(), { once: true })`
4. On cancel, the stream resolves with partial content accumulated so far
5. The renderer's Cancel button calls `window.electronAPI.cancelStream()` which invokes `aiService.cancelStream()`

## AI Operation Logging (IMPLEMENTED)

The `SEND_PROMPT` handler auto-logs every AI operation to `writer_ai_operations`:

1. Before streaming: inserts a row with prompt, model, operation type, project/chapter IDs
2. After streaming completes: updates the row with response text and response tokens
3. Returns `operationId` to the renderer
4. Accept/Discard buttons in AIPanel update the `accepted` field (1 = accepted, 0 = rejected)
5. Star ratings (1–5) stored in the `rating` column, set from the AI Operation Log

## Model Comparison (IMPLEMENTED)

The `COMPARE_MODELS` IPC handler sends the same prompt to multiple models in parallel:

1. Receives `prompt`, `modelIds[]`, and `context` from the renderer
2. Uses `Promise.allSettled()` to call `aiService.streamCompletion()` for each model simultaneously
3. Each call accumulates its own response (no streaming deltas to renderer — full responses returned)
4. Each result is auto-logged as an AI operation with `operationType: 'comparison'`
5. Returns `ModelComparisonResult[]` — each entry has `modelId`, `modelName`, `content`, `totalTokens`, and optional `error`
6. Failed models return an error string instead of throwing, so partial results are always available

## Brain Dump AI Extraction (IMPLEMENTED)

The `EXTRACT_BRAIN_DUMP` IPC handler parses unstructured text into structured creative writing data:

1. Fetches the brain dump content from the database
2. Sends to AI with a structured extraction prompt requesting JSON output with 4 categories:
   - `ideas` — story ideas and plot threads (string array)
   - `encyclopediaEntries` — characters, locations, items detected (`{ name, category, content }[]`)
   - `outlineBeats` — narrative beats and scene ideas (string array)
   - `questions` — unresolved questions to explore (string array)
3. Parses the JSON response (with regex extraction for markdown-wrapped JSON)
4. Marks the brain dump as `extracted = 1` in the database
5. Returns `BrainDumpExtraction` to the renderer for display and selective application

## Encyclopedia AI Features (IMPLEMENTED)

Three AI-powered encyclopedia handlers:

### `ENCYCLOPEDIA_GENERATE_PROFILE`
- Takes an entry ID, fetches the entry from the database
- Sends content to AI with **category-specific** prompts:
  - **Character**: Requests physical appearance, personality, speech patterns, role, arc, relationships
  - **Location**: Requests physical description, atmosphere, history, significance, sensory details
  - **Other**: General structured profile
- Returns the analysis text as a string

### `ENCYCLOPEDIA_EXTRACT_ENTRIES`
- Gathers all chapter content for the project (using `extractText()` on TipTap JSON)
- Fetches existing entry names to avoid duplicates
- Sends manuscript text to AI: "Find characters, locations, items, and lore not yet tracked"
- Returns `{ name, category, content }[]` for the renderer to selectively add

### `ENCYCLOPEDIA_CHECK_CONSISTENCY`
- Gathers all encyclopedia entries and all chapter content
- Sends both to AI: "Compare entries against the manuscript and identify contradictions"
- Returns `{ entry, issue, suggestion }[]` for display in the Consistency tab

## Manuscript Analysis (IMPLEMENTED)

The analysis system combines local computation with AI-powered analysis:

### Local Analysis: Readability

The `GET_READABILITY` IPC handler computes metrics locally (no AI call needed):

1. Gathers chapter texts using `getChapterTexts()` helper (whole project or single chapter)
2. `computeReadability()` calculates:
   - **Flesch-Kincaid Grade Level**: `0.39 * (totalWords/totalSentences) + 11.8 * (totalSyllables/totalWords) - 15.59`
   - **Average sentence length** and **average word length**
   - **Paragraph count**
   - **Dialogue percentage**: ratio of text within quotation marks
   - **Overused words**: words appearing 5+ times, filtered against a stop-word list (100+ common words)
   - **Sentence lengths**: array for histogram visualization
3. `countSyllables()` uses vowel-group heuristic with adjustments for silent-e, -le endings

### `GET_OVERUSED_WORDS`
- Lightweight variant that only returns the overused words array
- Same stop-word filtering logic

### AI Analysis: Pacing (`RUN_ANALYSIS` with type `'pacing'`)

1. Gathers all chapter texts
2. Sends to AI: "Analyze the pacing of this manuscript. For each chapter, classify the content into segments: Action, Dialogue, Description, Exposition, Reflection, Transition. Return JSON with `chapters[]` containing `chapterTitle` and `segments[]` with `type` and `proportion` (0-1)."
3. Stores parsed JSON result in `writer_analyses` table
4. Renderer displays as stacked horizontal bars per chapter with color-coded segments

### AI Analysis: Voice Audit (`RUN_ANALYSIS` with type `'voice_audit'`)

1. Gathers all chapter texts
2. Sends to AI: "Analyze character dialogue across the manuscript. For each pair of characters with significant dialogue, rate similarity (0-100), provide examples, and suggest how to differentiate their voices. Return JSON with `pairs[]`."
3. Stores result in `writer_analyses` table
4. Renderer shows similarity cards per character pair

### AI Analysis: Consistency (`RUN_ANALYSIS` with type `'consistency'`)

1. Gathers all chapter texts + all encyclopedia entries
2. Sends to AI: "Cross-reference encyclopedia entries against the manuscript. Find contradictions, inconsistencies, or deviations. Return JSON with `issues[]` containing `entry`, `chapter`, `quote`, and `suggestion`."
3. Stores result in `writer_analyses` table
4. Renderer shows issue cards with quoted text and suggestions

### Helper: `getChapterTexts()`

Shared helper used by all analysis handlers:
- Takes `projectId` and optional `chapterId`
- If `chapterId` provided, returns single chapter text
- Otherwise, returns all chapters for the project
- Extracts plain text from TipTap JSON using `extractText()`
- Returns `{ title, text }[]`

## Transformation Pipelines (IMPLEMENTED)

The `RUN_PIPELINE` IPC handler executes multi-step AI transformations sequentially:

1. Fetches the pipeline definition (name, steps) from the database
2. Loads settings to determine the selected model and API key
3. Iterates through `PipelineStep[]` in order:
   - Step 1: `{{input}}` is replaced with the user-provided input text
   - Step N: `{{input}}` is replaced with the previous step's output
4. Each step calls `aiService.streamCompletion()` (no streaming deltas — full response collected)
5. Results accumulated as `PipelineRunResult[]` with `stepLabel`, `content`, `tokens`, and optional `error`
6. Execution **stops on first error** — subsequent steps are not attempted
7. The renderer displays each step's result, and the user can accept & insert the final output

## Character Relationship Scanning (IMPLEMENTED)

The `SCAN_RELATIONSHIPS` IPC handler uses AI to detect character relationships from the manuscript:

1. Gathers all chapter texts for the project
2. Fetches encyclopedia Character entries to build known character list
3. Sends manuscript text + character names to AI: "Identify relationships between characters"
4. Requests JSON array: `[{ characterAName, characterBName, relationshipType, description }]`
5. Returns results to renderer for selective addition (user clicks "Add" per detected relationship)
6. Relationship types: family, romantic, friend, rival, mentor, ally, enemy, colleague, acquaintance

## Submission Package Generation (IMPLEMENTED)

The `GENERATE_SUBMISSION_PACKAGE` IPC handler generates a complete publishing submission package:

1. Fetches project metadata (name, description)
2. Gathers all chapter texts with word count
3. Gathers all encyclopedia entries for context
4. Sends manuscript (~25,000 chars) + encyclopedia (~5,000 chars) to AI with a structured prompt requesting 4 components:
   - **Logline**: One compelling sentence (<50 words)
   - **Synopsis**: ~500 words covering characters, conflict, turning points, resolution
   - **Query Letter**: ~300 words with hook, pitch paragraph, bio placeholder, professional closing
   - **Author Bio**: 100-word template with [placeholders] for personal details
5. Parses JSON response: `{ logline, synopsis, queryLetter, authorBio }`
6. Returns `SubmissionPackageResult` to renderer for display and clipboard copying
