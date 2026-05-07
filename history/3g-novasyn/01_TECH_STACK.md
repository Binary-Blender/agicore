# NovaSyn Electron Tech Stack

## Exact Versions (All Apps)

| Technology | Version | Purpose |
|-----------|---------|---------|
| Electron | 28.1.0 | Desktop shell, native APIs |
| React | 18.2.0 | UI framework |
| TypeScript | 5.3.3 | Type safety |
| Vite | 5.0.10 | Renderer bundler + dev server |
| Zustand | 4.4.7 | State management |
| Tailwind CSS | 3.4.0 | Utility-first CSS |
| better-sqlite3 | 9.2.2 | SQLite database |
| electron-builder | 24.9.1 | Packaging + distribution |
| uuid | 9.0.1 | Primary key generation |

## AI Provider SDKs

| SDK | Version | Provider |
|-----|---------|----------|
| @anthropic-ai/sdk | ^0.27.0 | Anthropic (Claude) |
| openai | (via fetch) | OpenAI + xAI (SSE) |
| @google/generative-ai | (via fetch) | Google Gemini |

**Note**: OpenAI, xAI, and Google are called via raw `fetch()` with SSE parsing. Only Anthropic uses its native SDK for streaming.

## Dev Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| @vitejs/plugin-react | 4.2.1 | Vite React support |
| @types/better-sqlite3 | 7.6.8 | SQLite types |
| @types/react | 18.2.47 | React types |
| @types/react-dom | 18.2.18 | React DOM types |
| @types/uuid | 9.0.7 | UUID types |
| @types/node | 20.10.6 | Node.js types |
| autoprefixer | 10.4.16 | PostCSS autoprefixer |
| postcss | 8.4.32 | CSS processing |

## Why These Choices

### Electron 28
- Chromium 120 + Node.js 18
- Frameless window support (all NovaSyn apps are frameless)
- `contextIsolation: true` + preload bridge for security
- Mature, battle-tested for desktop apps

### React 18 (not Next.js)
- Electron renderer is a local SPA, no SSR needed
- Direct DOM rendering via `createRoot`
- No routing library needed - Zustand controls the current view

### Vite 5
- Fast HMR during development
- Each app gets its own port (5173-5176+)
- Builds to static files for production
- `base: './'` for Electron file:// protocol

### better-sqlite3 (not Prisma, not Drizzle)
- Synchronous API = simpler IPC handlers
- WAL mode for concurrent reads
- Foreign keys enforced via `PRAGMA foreign_keys = ON`
- Auto-migrations from `.sql` files on startup
- No ORM overhead, direct SQL

### Zustand 4 (not Redux, not Context)
- Minimal boilerplate (single `create` call)
- One store per app with all state + actions
- Direct store access from any component
- No providers, no reducers, no action types
- Perfect for Electron's single-window architecture

### Tailwind 3 (not CSS Modules, not styled-components)
- Consistent NovaSyn design system via CSS custom properties
- Dark/light theme via `[data-theme]` attribute
- Same `globals.css` across all apps
- Utility classes = predictable, no naming conflicts

### UUID v4 Primary Keys
- All tables use `TEXT PRIMARY KEY` with UUID v4
- Generated via `uuid.v4()` in main process
- Non-sequential, globally unique
- Consistent across all apps

## Runtime Environment

- **Platform**: Windows (primary), macOS/Linux (compatible)
- **Dev environment**: Windows PowerShell (NOT WSL terminal — Electron is a GUI app)
- **Two terminals for dev**:
  - Terminal 1: `npm run dev:renderer` (Vite dev server)
  - Terminal 2: `npm run dev:main` (TypeScript compile + Electron launch)
- **Database location**: `%APPDATA%\NovaSyn\<app-name>\<db-name>.db`
- **API keys location**: `%APPDATA%\NovaSyn\api-keys.json` (shared across all apps)
