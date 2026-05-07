# NovaSyn Shared Infrastructure

## Shared API Keys

All NovaSyn apps read and write API keys from a single shared file:

**Location**: `%APPDATA%\NovaSyn\api-keys.json`

```json
{
  "anthropic": "sk-ant-...",
  "openai": "sk-...",
  "google": "AIza...",
  "xai": "xai-...",
  "elevenlabs": "sk_..."
}
```

### Reading API Keys (Main Process)

```typescript
import { app } from 'electron';
import fs from 'fs';
import path from 'path';

const apiKeysPath = path.join(app.getPath('appData'), 'NovaSyn', 'api-keys.json');

function loadApiKeys(): Record<string, string> {
  try {
    const data = fs.readFileSync(apiKeysPath, 'utf-8');
    return JSON.parse(data);
  } catch {
    return {};
  }
}

function saveApiKeys(keys: Record<string, string>): void {
  fs.mkdirSync(path.dirname(apiKeysPath), { recursive: true });
  fs.writeFileSync(apiKeysPath, JSON.stringify(keys, null, 2));
}
```

### IPC Channels for API Keys

```typescript
GET_API_KEYS: 'get-api-keys',
SAVE_API_KEYS: 'save-api-keys',
```

### Which Apps Use Which Keys

| Key | NovaSyn AI | Studio | Writer | Council | Academy |
|-----|-----------|--------|--------|---------|---------|
| anthropic | ✅ | | ✅ | ✅ | ✅ |
| openai | ✅ | ✅ | ✅ | ✅ | ✅ |
| google | ✅ | ✅ | ✅ | ✅ | ✅ |
| xai | ✅ | ✅ | ✅ | ✅ | ✅ |
| elevenlabs | | ✅ | | | |

## Theme System

### CSS Custom Properties

All apps use the same CSS variable system in `globals.css`:

```css
:root,
[data-theme="dark"] {
  --bg-page: #1a1a2e;
  --bg-panel: #16213e;
  --bg-input: #1a1a2e;
  --border: #2a2a4a;
  --text-primary: #e9ecef;
  --text-heading: #f8f9fa;
  --text-muted: #adb5bd;
  --text-placeholder: #6c6f85;
  --scrollbar-track: #16213e;
  --scrollbar-thumb: #4a4e69;
  --scrollbar-thumb-hover: #6c6f85;
}

[data-theme="light"] {
  --bg-page: #f5f5f5;
  --bg-panel: #ffffff;
  --bg-input: #f1f5f9;
  --border: #e0e0e0;
  --text-primary: #1a1a1a;
  --text-heading: #111111;
  --text-muted: #666666;
  --text-placeholder: #999999;
  --scrollbar-track: #f0f0f0;
  --scrollbar-thumb: #c0c0c0;
  --scrollbar-thumb-hover: #a0a0a0;
}
```

### Theme Switching

Theme is toggled by setting a `data-theme` attribute on `<html>`:

```typescript
// In App.tsx
useEffect(() => {
  document.documentElement.setAttribute('data-theme', settings.theme || 'dark');
}, [settings.theme]);
```

### Tailwind Color Palette

All apps share the same primary (blue) and accent (yellow) color palette:

```javascript
// tailwind.config.js
colors: {
  primary: {
    50: '#eff6ff', 100: '#dbeafe', 200: '#bfdbfe', 300: '#93c5fd',
    400: '#60a5fa', 500: '#3b82f6', 600: '#2563eb', 700: '#1d4ed8',
    800: '#1e40af', 900: '#1e3a8a',
  },
  accent: {
    50: '#fefce8', 100: '#fef9c3', 200: '#fef08a', 300: '#fde047',
    400: '#facc15', 500: '#eab308', 600: '#ca8a04', 700: '#a16207',
    800: '#854d0e', 900: '#713f12',
  },
}
```

### Using Theme Variables

```tsx
// Background colors
<div className="bg-[var(--bg-page)]">       // Page background
<div className="bg-[var(--bg-panel)]">       // Panel/card background
<input className="bg-[var(--bg-input)]">     // Input fields

// Text colors
<h1 className="text-[var(--text-heading)]">  // Headings
<p className="text-[var(--text-primary)]">    // Body text
<span className="text-[var(--text-muted)]">   // Secondary text

// Borders
<div className="border border-[var(--border)]">

// Primary color (from Tailwind)
<button className="bg-primary-500 hover:bg-primary-600">
<div className="ring-2 ring-primary-500">
```

## Database Per App

Each app has its own SQLite database in the Electron userData path:

| App | Database Name |
|-----|--------------|
| NovaSyn AI | novasyn.db |
| NovaSyn Studio | studio.db |
| NovaSyn Writer | novasyn-writer.db |
| NovaSyn Council | council.db |
| NovaSyn Academy | academy.db |

**Location**: `%APPDATA%\<app-name>\<db-name>.db`

## Port Assignments

Each app uses a unique Vite dev server port:

| App | Port |
|-----|------|
| NovaSyn AI | 5173 |
| NovaSyn Studio | 5173 |
| NovaSyn Writer | 5174 |
| NovaSyn Council | 5175 |
| NovaSyn Academy | 5176 |

**Note**: AI and Studio share port 5173 because they are never run simultaneously during development. New apps should use 5177+.

## Debug Logger

All NovaSyn apps include a file-based debug logger that users can enable in Settings. Disabled by default — zero overhead when off.

### Location

- **NovaSyn apps**: `Documents/NovaSyn/<app-name>/debug.log`
- **Setting**: `debugLog: boolean` in the app's settings store

### Implementation

Place in `src/main/services/logger.ts`:

```typescript
import { app } from 'electron';
import path from 'path';
import fs from 'fs';
import { loadSettings } from '../config/settingsStore';

let logPath: string | null = null;
let logStream: fs.WriteStream | null = null;
let enabled: boolean | null = null;

function isEnabled(): boolean {
  if (enabled === null) {
    try {
      const settings = loadSettings();
      enabled = !!(settings as any).debugLog;
    } catch {
      enabled = false;
    }
  }
  return enabled;
}

export function refreshLoggerEnabled(): void {
  const wasEnabled = enabled;
  enabled = null;
  if (wasEnabled && !isEnabled()) closeLogger();
}

function getLogPath(): string {
  if (!logPath) {
    const docsPath = app.getPath('documents');
    const logDir = path.join(docsPath, 'NovaSyn');
    fs.mkdirSync(logDir, { recursive: true });
    logPath = path.join(logDir, 'debug.log');
  }
  return logPath;
}

function ensureStream(): fs.WriteStream | null {
  if (!isEnabled()) return null;
  if (!logStream) {
    const filePath = getLogPath();
    logStream = fs.createWriteStream(filePath, { flags: 'w' }); // truncate on start
    logStream.write(`=== NovaSyn Debug Log ===\nStarted: ${new Date().toISOString()}\nVersion: ${app.getVersion()}\n\n`);
  }
  return logStream;
}

function formatArgs(args: any[]): string {
  return args.map((a) => {
    if (typeof a === 'string') return a;
    try { return JSON.stringify(a, null, 2); } catch { return String(a); }
  }).join(' ');
}

export function trace(...args: any[]): void {
  const stream = ensureStream();
  if (!stream) return;
  const timestamp = new Date().toISOString().slice(11, 23);
  stream.write(`[${timestamp}] ${formatArgs(args)}\n`);
}

export function traceError(label: string, error: any): void {
  if (!isEnabled()) return;
  const msg = error instanceof Error ? error.message : String(error);
  trace(`ERROR [${label}]`, msg);
  if (error instanceof Error && error.stack) trace('  Stack:', error.stack);
}

export function closeLogger(): void {
  if (logStream) {
    logStream.write(`\nClosed: ${new Date().toISOString()}\n`);
    logStream.end();
    logStream = null;
  }
}

export function getLogFilePath(): string {
  return getLogPath();
}
```

### Integration Checklist

1. **Settings**: Add `debugLog: boolean` (default `false`) to UISettings interface and DEFAULT_SETTINGS
2. **Settings Panel**: Add a toggle switch labeled "Debug Log" with the file path shown when enabled
3. **Settings Save Handler**: Call `refreshLoggerEnabled()` when `debugLog` changes
4. **App Lifecycle**: Call `closeLogger()` in the `before-quit` handler
5. **Usage**: Import `trace` and `traceError` in services that need logging:
   ```typescript
   import { trace, traceError } from './logger';
   trace('[ServiceName] Operation:', { key: 'value' });
   traceError('ServiceName', error);
   ```

### What to Log

| Category | Examples |
|----------|---------|
| API calls | Provider, model, token estimate, response status |
| Image generation | Provider, prompt (truncated), success/failure |
| Database | Migration results, save/load operations |
| Errors | Full error message + stack trace |

### Design Rules

- **Disabled by default** — no file I/O when off
- **Truncates on each app start** — prevents unbounded growth
- **Writes to Documents folder** — easy for users to find and email
- **No sensitive data** — never log API keys, only first/last 4 chars if needed
- **Async-safe** — uses `fs.WriteStream`, won't block the main process

## Cross-App Communication (Future)

### Send-To Protocol

Planned protocol for sending data between NovaSyn apps:

```typescript
interface SendToPayload {
  sourceApp: string;      // 'novasyn-ai'
  targetApp: string;      // 'novasyn-studio'
  assetType: string;      // 'text' | 'image' | 'prompt' | 'conversation'
  data: unknown;          // App-specific payload
  metadata: Record<string, string>;
}
```

### Universal Asset Format (Future)

Planned standard format for shareable assets:

```typescript
interface UniversalAsset {
  id: string;
  type: 'text' | 'image' | 'audio' | 'video' | 'prompt' | 'template';
  sourceApp: string;
  title: string;
  content: string | Buffer;
  tags: string[];
  createdAt: string;
}
```

These features are planned for NS Orchestrator and NS Vault but not yet implemented.

## Shared npm Scripts

All apps use these same script names:

```json
{
  "scripts": {
    "dev": "npm run dev:renderer & npm run dev:main",
    "dev:renderer": "vite",
    "dev:main": "tsc -p tsconfig.main.json && xcopy /E /I /Y src\\main\\database\\migrations dist\\main\\main\\database\\migrations && set NODE_ENV=development&& electron .",
    "build": "npm run build:main && npm run build:renderer",
    "build:main": "tsc -p tsconfig.main.json && xcopy /E /I /Y src\\main\\database\\migrations dist\\main\\main\\database\\migrations",
    "build:renderer": "vite build",
    "type-check": "tsc --noEmit -p tsconfig.main.json && tsc --noEmit -p tsconfig.renderer.json",
    "package": "npm run build && electron-builder"
  }
}
```

**Important**: The `dev:main` script copies migration files to the dist directory because TypeScript compilation doesn't include `.sql` files.

## NS Vault — Shared Asset Library

NS Vault is a shared SQLite database that acts as the universal asset library across all NovaSyn apps. Any app can store, retrieve, search, tag, and annotate assets. Provenance chains track how assets flow between apps.

**Location**: `%APPDATA%\NovaSyn\vault.db`

**Mode**: WAL (Write-Ahead Logging), `busy_timeout = 5000ms`

### Database Schema

```sql
CREATE TABLE vault_migrations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  applied_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE vault_items (
  id TEXT PRIMARY KEY,
  item_type TEXT NOT NULL,          -- chat_exchange | generation | document | image | video | audio | code_snippet | prompt_template | note
  source_app TEXT NOT NULL,         -- novasyn-chat | novasyn-studio | novasyn-writer | etc.
  title TEXT NOT NULL,
  content TEXT,                     -- inline text content (nullable for binary assets)
  file_path TEXT,                   -- absolute path to file on disk (images, video, audio)
  output_type_hint TEXT,            -- MIME or logical hint for downstream consumers (e.g. 'image/png', 'text/markdown')
  parent_id TEXT,                   -- FK → vault_items.id (provenance: what asset spawned this one)
  metadata TEXT,                    -- JSON blob for app-specific data
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (parent_id) REFERENCES vault_items(id) ON DELETE SET NULL
);

CREATE TABLE vault_tags (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE vault_item_tags (
  item_id TEXT NOT NULL,
  tag_id TEXT NOT NULL,
  PRIMARY KEY (item_id, tag_id),
  FOREIGN KEY (item_id) REFERENCES vault_items(id) ON DELETE CASCADE,
  FOREIGN KEY (tag_id) REFERENCES vault_tags(id) ON DELETE CASCADE
);

CREATE TABLE vault_annotations (
  id TEXT PRIMARY KEY,
  item_id TEXT NOT NULL,
  source_app TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (item_id) REFERENCES vault_items(id) ON DELETE CASCADE
);

CREATE INDEX idx_vault_items_type ON vault_items(item_type);
CREATE INDEX idx_vault_items_source ON vault_items(source_app);
CREATE INDEX idx_vault_items_parent ON vault_items(parent_id);
CREATE INDEX idx_vault_annotations_item ON vault_annotations(item_id);
```

### TypeScript Interfaces

```typescript
// src/main/vault/vaultTypes.ts

export interface VaultItem {
  id: string;
  itemType: 'chat_exchange' | 'generation' | 'document' | 'image' | 'video' | 'audio' | 'code_snippet' | 'prompt_template' | 'note';
  sourceApp: string;
  title: string;
  content: string | null;
  filePath: string | null;
  outputTypeHint: string | null;
  parentId: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

export interface VaultTag {
  id: string;
  name: string;
  createdAt: string;
}

export interface VaultAnnotation {
  id: string;
  itemId: string;
  sourceApp: string;
  content: string;
  createdAt: string;
}

export interface VaultSearchOptions {
  query?: string;           // full-text search on title + content
  itemType?: string;        // filter by item_type
  sourceApp?: string;       // filter by source_app
  tags?: string[];          // filter by tag names (AND logic)
  parentId?: string;        // filter by provenance parent
  limit?: number;           // default 50
  offset?: number;          // pagination
  sortBy?: 'created_at' | 'updated_at' | 'title';
  sortOrder?: 'asc' | 'desc';
}
```

### IPC Channels

```typescript
// Vault IPC channel constants
VAULT_LIST:             'vault:list',             // (options: VaultSearchOptions) → VaultItem[]
VAULT_STORE:            'vault:store',            // (item: Partial<VaultItem>) → VaultItem
VAULT_GET:              'vault:get',              // (id: string) → VaultItem | null
VAULT_DELETE:           'vault:delete',           // (id: string) → void
VAULT_SEARCH:           'vault:search',           // (options: VaultSearchOptions) → VaultItem[]
VAULT_GET_TAGS:         'vault:get-tags',         // (itemId: string) → VaultTag[]
VAULT_ADD_TAG:          'vault:add-tag',          // (itemId: string, tagName: string) → VaultTag
VAULT_ANNOTATE:         'vault:annotate',         // (itemId: string, content: string) → VaultAnnotation
VAULT_GET_ANNOTATIONS:  'vault:get-annotations',  // (itemId: string) → VaultAnnotation[]
VAULT_GET_PROVENANCE:   'vault:get-provenance',   // (itemId: string) → VaultItem[] (ancestor chain)
```

### File Structure

```
src/main/vault/
  vaultTypes.ts       -- interfaces and type definitions
  vaultService.ts     -- database init, CRUD, search, tag, annotate, provenance queries
```

### Concurrency Rules

Multiple NovaSyn apps may access `vault.db` simultaneously. The following rules prevent corruption:

1. **WAL mode** — set at database creation (`PRAGMA journal_mode=WAL`). Allows concurrent readers with a single writer.
2. **busy_timeout(5000)** — if the database is write-locked, SQLite will retry for up to 5 seconds before throwing `SQLITE_BUSY`.
3. **Short transactions only** — never hold a write transaction open while performing network I/O or user-facing work. Read → compute → write in the smallest possible window.
4. **No long-lived prepared statements** — finalize statements promptly so WAL checkpointing is not blocked.

### Per-App Integration

| App | What It Stores | item_type | Notes |
|-----|---------------|-----------|-------|
| NovaSyn Chat | Saved exchanges, starred messages | `chat_exchange` | `metadata` includes model, token counts |
| NovaSyn Studio | Generated images, videos, audio | `generation`, `image`, `video`, `audio` | `file_path` points to output file, `metadata` includes prompt + parameters |
| NovaSyn Writer | Chapters, outlines, research notes | `document`, `note` | `metadata` includes project name, chapter number |
| NovaSyn Council | Council session transcripts | `chat_exchange`, `document` | `metadata` includes council configuration |
| NovaSyn Academy | Lesson plans, student work, code snippets | `document`, `code_snippet`, `prompt_template` | `metadata` includes course and module info |

### VaultBrowser.tsx Shared UI Component

Each app embeds a `VaultBrowser` component that provides a consistent vault browsing experience:

```typescript
// Shared component spec
interface VaultBrowserProps {
  filterSourceApp?: string;       // pre-filter to current app's assets (optional)
  filterItemType?: string;        // pre-filter by type
  onSelect?: (item: VaultItem) => void;   // callback when user picks an asset
  onInsert?: (item: VaultItem) => void;   // callback to insert asset into current workflow
  mode?: 'browse' | 'pick';      // 'pick' mode shows a selection UI, 'browse' is read-only
}
```

The component provides: search bar, tag filter chips, item type filter dropdown, sortable table/grid view, provenance breadcrumb trail, inline annotation panel, and a detail drawer for metadata inspection.

## Macro Registry — App-Callable Operations

The Macro Registry is a shared JSON file where each running NovaSyn app advertises the operations it can perform. Other apps read the registry to discover what cross-app actions are available.

**Location**: `%APPDATA%\NovaSyn\macro-registry.json`

### Registry Format

```json
{
  "version": 1,
  "lastUpdated": "2026-03-15T12:00:00.000Z",
  "apps": {
    "novasyn-chat": {
      "displayName": "NovaSyn Chat",
      "pid": 12345,
      "registeredAt": "2026-03-15T11:58:00.000Z",
      "macros": {
        "chat.send_prompt": {
          "description": "Send a prompt to a model and return the response",
          "input": {
            "prompt": "string",
            "model": "string (optional)",
            "systemPrompt": "string (optional)"
          },
          "output": {
            "response": "string",
            "model": "string",
            "tokenUsage": "{ prompt: number, completion: number }"
          }
        },
        "chat.summarize": {
          "description": "Summarize the provided text using the active model",
          "input": { "text": "string", "maxLength": "number (optional)" },
          "output": { "summary": "string" }
        }
      }
    }
  }
}
```

### Naming Convention

Macro names follow the pattern `appname.action`:

- **Prefix** = short app identifier (e.g., `chat`, `studio`, `writer`, `council`, `academy`)
- **Action** = verb_noun describing the operation

### Registration Flow

1. **App startup** — read `macro-registry.json` (create if missing).
2. **Update own entry** — set `pid` to current `process.pid`, update `registeredAt`, write full macro list.
3. **Write atomically** — write to a temp file first, then `fs.renameSync` to the registry path (atomic on Windows NTFS).

### Shutdown

On app close (`app.on('will-quit')`):

1. Read the registry.
2. Remove `pid` from own entry (set to `null`). Keep the macro list so other apps can see what operations exist even when the app is offline.
3. Write atomically.

Other apps check `pid !== null` to determine if an app is currently running and reachable.

### File Structure

```
src/main/vault/
  macroRegistry.ts    -- read, write, register, unregister, list available macros
```

### IPC Channels

```typescript
MACRO_GET_REGISTRY:   'macro:get-registry',   // () → full registry JSON
MACRO_GET_AVAILABLE:  'macro:get-available',   // () → macros from apps with non-null pid only
MACRO_GET_ALL:        'macro:get-all',         // () → all macros (including offline apps)
```

### Example Macros by App

| App | Macro | Description |
|-----|-------|-------------|
| NovaSyn Chat | `chat.send_prompt` | Send a prompt to a model, return the response |
| NovaSyn Chat | `chat.summarize` | Summarize provided text using the active model |
| NovaSyn Studio | `studio.generate_image` | Generate an image from a text prompt |
| NovaSyn Studio | `studio.generate_video` | Generate a video from a text prompt |
| NovaSyn Studio | `studio.upscale_image` | Upscale an existing image |
| NovaSyn Writer | `writer.insert_chapter` | Insert text as a new chapter in the active project |
| NovaSyn Writer | `writer.get_outline` | Return the current project outline |
| NovaSyn Writer | `writer.rewrite_passage` | Rewrite a selected passage with AI |
| NovaSyn Council | `council.run_session` | Run a council deliberation on a topic |
| NovaSyn Council | `council.get_verdict` | Return the final verdict from a session |
| NovaSyn Academy | `academy.generate_lesson` | Generate a lesson plan for a topic |
| NovaSyn Academy | `academy.evaluate_code` | Evaluate a code snippet and return feedback |

## Cross-App Communication — File-Based Queue

Cross-app communication uses a file-based message queue. Each app has its own inbox directory. To invoke a macro on another app, you write a request file to that app's inbox. The target app polls its inbox, executes the macro, and writes a response file back to the source app's inbox.

**Location**: `%APPDATA%\NovaSyn\macro-queue\<app-name>\`

Each app gets its own inbox directory (e.g., `macro-queue\novasyn-chat\`, `macro-queue\novasyn-studio\`).

### Protocol

1. **Source app** writes `req_<uuid>.json` to the **target app's** inbox directory.
2. **Target app** detects the file on its next poll cycle, reads the request, and executes the macro.
3. **Target app** writes `res_<uuid>.json` (same UUID) to the **source app's** inbox directory.
4. **Source app** detects the response file and resolves the pending invocation.
5. Both apps delete their respective consumed files after processing.

### Request Format

```json
{
  "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "sourceApp": "novasyn-chat",
  "targetApp": "novasyn-studio",
  "macro": "studio.generate_image",
  "input": {
    "prompt": "A sunset over mountains in watercolor style",
    "width": 1024,
    "height": 1024
  },
  "vaultParentId": "vault-item-id-of-the-chat-message",
  "createdAt": "2026-03-15T12:05:00.000Z",
  "status": "pending",
  "ttl": 60000
}
```

| Field | Type | Description |
|-------|------|-------------|
| `id` | `string` | UUIDv4, used to correlate request and response |
| `sourceApp` | `string` | Identifier of the requesting app |
| `targetApp` | `string` | Identifier of the target app |
| `macro` | `string` | Fully qualified macro name (e.g., `studio.generate_image`) |
| `input` | `object` | Macro-specific input payload |
| `vaultParentId` | `string?` | Optional vault item ID — if set, the result is stored in the vault with this as `parent_id`, creating a provenance chain |
| `createdAt` | `string` | ISO 8601 timestamp |
| `status` | `string` | `pending` on creation |
| `ttl` | `number` | Time-to-live in milliseconds. Target app ignores requests older than `createdAt + ttl` |

### Response Format

```json
{
  "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "sourceApp": "novasyn-studio",
  "targetApp": "novasyn-chat",
  "macro": "studio.generate_image",
  "output": {
    "filePath": "C:\\Users\\Chris\\AppData\\Roaming\\novasyn-studio\\generations\\img_20260315_120512.png",
    "vaultItemId": "new-vault-item-id"
  },
  "status": "completed",
  "error": null,
  "completedAt": "2026-03-15T12:05:12.000Z"
}
```

| Field | Type | Description |
|-------|------|-------------|
| `id` | `string` | Same UUID from the request |
| `sourceApp` | `string` | The app that executed the macro (was the target) |
| `targetApp` | `string` | The app that requested the macro (was the source) |
| `macro` | `string` | The macro that was executed |
| `output` | `object` | Macro-specific output payload |
| `status` | `string` | `completed` or `failed` |
| `error` | `string?` | Error message if `status` is `failed`, otherwise `null` |
| `completedAt` | `string` | ISO 8601 timestamp |

### Polling Strategy

Each app polls its own inbox directory every **2 seconds** using `fs.readdirSync`:

```typescript
// In queueWatcher.ts
const POLL_INTERVAL = 2000; // ms

function pollInbox(): void {
  const inboxPath = path.join(app.getPath('appData'), 'NovaSyn', 'macro-queue', APP_NAME);
  fs.mkdirSync(inboxPath, { recursive: true });

  const files = fs.readdirSync(inboxPath).filter(f => f.endsWith('.json'));
  for (const file of files) {
    const filePath = path.join(inboxPath, file);
    const content = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

    if (file.startsWith('req_')) {
      handleIncomingRequest(content, filePath);
    } else if (file.startsWith('res_')) {
      handleIncomingResponse(content, filePath);
    }
  }
}

setInterval(pollInbox, POLL_INTERVAL);
```

**Why `fs.readdirSync` instead of `fs.watch`?** — `fs.watch` on Windows is unreliable with network drives and has known double-fire issues on NTFS. Polling at 2-second intervals is simple, predictable, and sufficient for user-facing cross-app workflows.

### File Structure

```
src/main/vault/
  queueWatcher.ts     -- inbox polling, file read/write, request/response routing
  macroExecutor.ts    -- dispatches incoming requests to the correct macro handler, returns results
```

### IPC Channels

```typescript
MACRO_INVOKE:         'macro:invoke',         // (targetApp: string, macro: string, input: object, vaultParentId?: string) → { id: string }
MACRO_INVOKE_STATUS:  'macro:invoke-status',  // (id: string) → { status, output?, error? }
MACRO_GET_PENDING:    'macro:get-pending',    // () → incoming requests awaiting execution
```

### Provenance via Vault

When a request includes `vaultParentId`, the following provenance chain is created automatically:

1. The source app has an existing vault item (e.g., a chat message with `id = "abc"`).
2. The request sets `vaultParentId: "abc"`.
3. The target app executes the macro and stores the result in the vault with `parentId: "abc"`.
4. The response includes the new `vaultItemId` so the source app can reference or display the result.

This means a user can trace any asset back through its full creation history — for example: a chat prompt (Chat) → generated image (Studio) → annotated image (Writer) — all linked via `parent_id` in `vault_items`.
