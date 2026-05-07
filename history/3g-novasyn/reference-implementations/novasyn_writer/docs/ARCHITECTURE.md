# NovaSyn Writer — Architecture

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Electron 28 |
| Frontend | React 18, TypeScript 5.3 |
| Build | Vite 5 |
| State | Zustand 4.4 |
| Styling | Tailwind CSS 3.4 |
| Editor | TipTap (ProseMirror) |
| Database | SQLite via better-sqlite3 |
| AI | Multi-provider streaming (Anthropic, OpenAI, Google, xAI) |

## Process Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     MAIN PROCESS                            │
│                                                             │
│  src/main/index.ts          ← App lifecycle + IPC handlers  │
│  src/main/window.ts         ← BrowserWindow (frameless)     │
│  src/main/models.ts         ← AI model definitions          │
│  src/main/database/db.ts    ← SQLite singleton + migrations │
│  src/main/config/apiKeyStore.ts  ← Shared API key store     │
│  src/main/services/aiService.ts  ← Multi-provider streaming │
│                                                             │
│  Database: %APPDATA%/novasyn-writer/novasyn-writer.db       │
│  API Keys: %APPDATA%/NovaSyn/api-keys.json (shared)        │
│  Settings: %APPDATA%/novasyn-writer/writer-settings.json    │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                    PRELOAD BRIDGE                            │
│                                                             │
│  src/preload/index.ts                                       │
│  contextBridge.exposeInMainWorld('electronAPI', {...})       │
│  All IPC methods are typed via ElectronAPI interface         │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                   RENDERER PROCESS                          │
│                                                             │
│  src/renderer/App.tsx       ← Root layout + title bar       │
│  src/renderer/store/writerStore.ts  ← Zustand state/actions │
│  src/renderer/components/   ← All UI components             │
│  src/renderer/styles/globals.css  ← Tailwind + TipTap CSS   │
│                                                             │
│  Dev server: http://localhost:5174 (Vite)                   │
└─────────────────────────────────────────────────────────────┘
```

## IPC Communication Pattern

All communication between renderer and main process uses Electron IPC:

1. **Channel constants** defined in `src/shared/types.ts` → `IPC_CHANNELS`
2. **Preload bridge** maps each channel to a typed method in `ElectronAPI`
3. **Main process** registers handlers via `ipcMain.handle()`
4. **Renderer** calls `window.electronAPI.methodName()` (typed)
5. **Streaming** uses `event.sender.send()` for AI deltas → `ipcRenderer.on()` in preload

```
Renderer                    Preload                     Main
────────                    ───────                     ────
store.sendAiPrompt()
  → window.electronAPI      → ipcRenderer.invoke()      → ipcMain.handle()
     .sendPrompt()             'send-prompt'                aiService.streamCompletion()
                                                              │
                            ← ipcRenderer.on()          ← event.sender.send()
                               'ai-stream-delta'           'ai-stream-delta'
  ← onAiDelta callback
```

## Database

- **File**: `novasyn-writer.db` in Electron's `userData` directory
- **Mode**: WAL (Write-Ahead Logging) for concurrency
- **Foreign keys**: Enabled, with CASCADE deletes
- **Migrations**: Auto-discovered SQL files in `src/main/database/migrations/`
- **Pattern**: Files named `001_initial_schema.sql`, `002_xxx.sql`, etc.
- **Tracking**: `migrations` table records applied migration names

## Shared API Key Store

All NovaSyn Suite apps share a single API key file:

```
%APPDATA%/NovaSyn/api-keys.json
```

Format: `{ "anthropic": "sk-...", "openai": "sk-...", "google": "AI...", "xai": "xai-..." }`

This means if a user sets an API key in NovaSyn AI or NovaSyn Studio, it's automatically available in Writer.

## Window Setup

- **Frameless** (`frame: false`) with custom title bar
- **Size**: 80% of screen, min 1000x700
- **Background**: `#1a1a2e` (dark writer theme)
- **Title bar**: CSS `WebkitAppRegion: drag` for drag, `no-drag` for buttons
- **Dev**: Loads `http://localhost:5174`, opens DevTools
- **Prod**: Loads `dist/renderer/index.html`

## UI Layout

```
┌─────────────────────────────────────────────────────────────────────┐
│  Title Bar (drag region)                          [—] [□] [x]      │
├──────────┬───────────────────────────────────────┬──────────────────┤
│ Sidebar  │  Editor Toolbar         [Preview btn] │  AI Panel        │
│ (resize) │  ┌──────────────┬──────────────────┐  │  (toggleable)    │
│          │  │              │ PreviewPane      │  │                  │
│ Project  │  │  TipTap      │ (toggle, 50%)    │  │  Model selector  │
│ Chapters │  │  Editor      │ Print-style      │  │  Tool selector   │
│ Sections │  │  (auto-save) │ WYSIWYG          │  │  Context picker  │
│ Encycl.  │  │              │                  │  │  Generate button │
│          │  │              │                  │  │  Response + A/D  │
│ [Backup] │  └──────────────┴──────────────────┘  │                  │
│ [Restore]│  Status: 1,247w | 7,023c | 85 sent   │  CommentsPanel   │
│ [bottom] │  | 42 para | 5m read | Flesch 62.3   │  (inline, 264px) │
├──────────┴───────────────────────────────────────┴──────────────────┤
│  Modals: Settings | Export | Encyclopedia | Outline |                │
│          VersionHistory | AiLog | Sessions | Discovery               │
│          Continuity | KnowledgeBase | ModelComparison                │
│          BrainDump | Pipelines | Analysis                            │
│          RelationshipMap | SubmissionPackage                          │
│          WritingDashboard | AmbientSounds (popover)                  │
│          CoverDesigner | PublishingPresets                            │
└─────────────────────────────────────────────────────────────────────┘
```

## Development

Run from **Windows PowerShell** (not WSL — Electron is a GUI app):

```powershell
# Terminal 1: Vite dev server
npm run dev:renderer

# Terminal 2: Electron main process
npm run dev:main
```

Build for production:

```powershell
npm run build:prod
npm run package
```
