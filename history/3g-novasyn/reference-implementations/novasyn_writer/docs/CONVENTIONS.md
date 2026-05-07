# NovaSyn Writer — Coding Conventions

## File Organization

```
src/
├── shared/          # Types and constants shared between main and renderer
│   └── types.ts     # All interfaces, IPC_CHANNELS, ElectronAPI
├── main/            # Electron main process
│   ├── index.ts     # Entry point + all IPC handlers
│   ├── window.ts    # BrowserWindow creation
│   ├── models.ts    # AI model definitions
│   ├── config/      # Configuration (API key store)
│   ├── database/    # SQLite database + migrations
│   └── services/    # Business logic (AI service)
├── preload/         # Electron preload bridge
│   └── index.ts     # contextBridge.exposeInMainWorld
└── renderer/        # React frontend
    ├── index.html
    ├── index.tsx
    ├── App.tsx       # Root layout + TitleBar
    ├── store/        # Zustand state management
    ├── styles/       # CSS (Tailwind + custom)
    └── components/   # All UI components
```

## Naming Conventions

| Item | Convention | Example |
|------|-----------|---------|
| Files | PascalCase for components, camelCase for utilities | `Sidebar.tsx`, `writerStore.ts` |
| Components | PascalCase, default export | `export default function Sidebar()` |
| Store | camelCase for state/actions | `currentChapter`, `loadChapters` |
| IPC channels | kebab-case strings, SCREAMING_SNAKE constants | `'get-chapters'`, `GET_CHAPTERS` |
| Database columns | snake_case | `word_count`, `sort_order`, `created_at` |
| TypeScript types | camelCase properties | `wordCount`, `sortOrder`, `createdAt` |
| CSS classes | Tailwind utilities + `[#hex]` custom colors | `bg-[#1a1a2e]`, `text-primary-400` |

## Row Mapping (snake_case → camelCase)

SQLite returns `snake_case` column names. TypeScript interfaces use `camelCase`. Row mapper functions in `src/main/index.ts` convert all DB rows before returning via IPC:

```ts
// Example mapper
function mapChapter(row: any): Chapter {
  return {
    id: row.id,
    projectId: row.project_id,
    title: row.title,
    sortOrder: row.sort_order,
    content: row.content,
    wordCount: row.word_count,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
```

All 19 entity types have mappers: `mapProject`, `mapChapter`, `mapSection`, `mapEncyclopediaEntry`, `mapOutline`, `mapVersion`, `mapAiOperation`, `mapSession`, `mapGoal`, `mapDiscoverySession`, `mapDiscoverySuggestion`, `mapPlant`, `mapThread`, `mapCharacterKnowledge`, `mapKbEntry`, `mapBrainDump`, `mapPipeline`, `mapAnalysis`, `mapRelationship`. When adding a new entity type, always create a mapper and apply it in the IPC handler.

## IPC Pattern

Every feature that touches persistent data follows this 5-layer pattern:

```
1. types.ts      → IPC_CHANNELS constant + ElectronAPI method signature
2. preload/      → ipcRenderer.invoke() mapping
3. main/index.ts → ipcMain.handle() with SQLite queries
4. writerStore   → async action calling window.electronAPI
5. Component     → calls store action, reads store state
```

Always add all 5 layers when creating a new IPC channel. See `docs/IPC_REFERENCE.md` for the complete channel list and the step-by-step guide.

## Component Patterns

### State Access
- All components use `useWriterStore()` hook — no prop drilling
- Destructure only the state/actions you need (Zustand optimizes re-renders per selector)

### Modal Pattern
- Boolean `showX` state in store
- Rendered conditionally in `App.tsx`: `{showX && <X />}`
- Fixed overlay with `bg-black/50` backdrop
- Close on backdrop click or close button

### Event Handling
- `onClick` handlers on interactive elements
- `onDoubleClick` for rename triggers
- `onKeyDown` for Enter/Escape in inline edits
- `e.stopPropagation()` on nested interactive elements

## Styling Conventions

### Color Palette (Dark Theme)

| Element | Color | Hex |
|---------|-------|-----|
| Page background | Deep navy | `#1a1a2e` |
| Panel background | Darker navy | `#16213e` |
| Borders | Muted purple | `#2a2a4a` |
| Primary text | Light gray | `#e9ecef` |
| Muted text | `surface-500` | Tailwind config |
| Primary accent | Indigo/blue | `primary-400` through `primary-600` |
| Warm accent | Orange | `accent-400` |

### Tailwind Usage
- Use Tailwind utility classes directly (no `@apply` except in `globals.css`)
- Custom colors via `[#hex]` bracket syntax or theme tokens (`primary-400`, `surface-300`)
- Hover states with `hover:` prefix
- Transitions with `transition-colors`
- Group hover with `group` + `group-hover:opacity-100`

### TipTap Editor Styles
- All ProseMirror styles in `globals.css` under `.ProseMirror` selector
- Do not use Tailwind in `.ProseMirror` — use regular CSS

## AI Tool Pattern

To add a new AI writing tool, you only need to touch the renderer:

```ts
// AIPanel.tsx — add to AI_TOOLS array
{ id: 'my-tool', label: 'My Tool', prompt: 'Do something specific...' }
```

All tools use the same `sendPrompt` IPC channel. The only difference is the prompt text. For tools needing special context, modify the context assembly in `src/main/index.ts`.

## Migration Pattern

- Migrations live in `src/main/database/migrations/` as `NNN_description.sql`
- Auto-discovered and applied in order by `db.ts:runMigrations()`
- Migrations **must be idempotent** — use `CREATE TABLE IF NOT EXISTS`, `INSERT OR IGNORE`
- Migration files are copied to `dist/` at build time via `xcopy` in package.json scripts
- Never modify a migration after it's been applied to user databases — create a new one

## Development Notes

### Running the App
- **Must use Windows PowerShell** (Electron is a GUI app, doesn't work from WSL2 terminal)
- Two terminals: `npm run dev:renderer` (T1, Vite on port 5174) then `npm run dev:main` (T2, Electron)
- Port 5174 avoids conflict with NovaSyn AI on 5173

### Shared Resources
- API keys stored at `%APPDATA%/NovaSyn/api-keys.json` — shared across all NovaSyn apps
- Do not duplicate the key store logic — import from `config/apiKeyStore.ts`

### Electron Security
- `contextIsolation: true` — renderer cannot access Node.js directly
- `nodeIntegration: false` — all Node access goes through the preload bridge
- `webSecurity: true` in production

### Build
- `npm run build` compiles main + renderer + copies migrations
- `npm run package` creates distributable via electron-builder
- Output: `release/` directory
