# NovaSyn Quick Start — New App Scaffold

## Before You Start

1. Choose a name: `novasyn_<app_name>` (snake_case)
2. Choose a display name: `NovaSyn <AppName>` (title case)
3. Choose a Vite dev port: 5177+ (check [12_APP_REGISTRY.md](12_APP_REGISTRY.md) for used ports)
4. Choose a database name: `<app_name>.db`
5. Plan your core entities (what tables do you need?)

## Step-by-Step Scaffold

### 1. Create Project Directory

```
novasyn_<app_name>/
  src/
    main/
      database/
        migrations/
      services/
    preload/
    renderer/
      components/
      store/
      styles/
    shared/
  docs/
```

### 2. Copy Config Files from Template

Copy these files exactly from [11_PROJECT_TEMPLATE.md](11_PROJECT_TEMPLATE.md):
- `package.json` (change name, description, port)
- `vite.config.ts` (change port)
- `tsconfig.json`
- `tsconfig.main.json`
- `tsconfig.renderer.json`
- `tailwind.config.js`
- `postcss.config.js`
- `.gitignore`

### 3. Copy Shared Boilerplate

Copy these files exactly (they're identical across all apps):
- `src/main/database/db.ts` (change DB name)
- `src/main/window.ts` (change title, port)
- `src/main/models.ts` (same across all apps)
- `src/renderer/index.html`
- `src/renderer/index.tsx`
- `src/renderer/styles/globals.css`

### 4. Create Your First Migration

`src/main/database/migrations/001_<app>_core.sql`:
- Define your core tables
- Include id, created_at, updated_at on every table
- Add settings table
- Add ai_log table (if using AI)

### 5. Define Types

`src/shared/types.ts`:
- Interfaces for each table
- Input types for create operations
- IPC_CHANNELS constant
- ElectronAPI interface
- Settings interface
- AIModel import/re-export

### 6. Wire Preload

`src/preload/index.ts`:
- One line per IPC channel
- contextBridge.exposeInMainWorld

### 7. Build Main Process

`src/main/index.ts`:
- Import database, window, types
- Row mappers for each table
- IPC handlers for each channel
- Window control handlers
- App lifecycle (whenReady, window-all-closed)

### 8. Build Store

`src/renderer/store/<app>Store.ts`:
- All state properties
- All actions (load, create, update, delete for each entity)
- View navigation state
- Settings state

### 9. Build Components

In order:
1. `TitleBar.tsx` — Copy from template, change app name
2. `Sidebar.tsx` — Nav items for your views
3. `App.tsx` — Layout + view switch + modals
4. Feature components — One per view

### 10. Create Docs

```
docs/
  SPRINT_PLAN.md        # Your sprint plan
  ARCHITECTURE.md       # Architecture overview
  DATABASE_SCHEMA.md    # Table definitions
  IPC_REFERENCE.md      # Channel reference
```

### 11. Install & Test

```bash
npm install
npm run type-check       # Should pass
npm run dev:renderer     # Terminal 1 (from Windows PowerShell)
npm run dev:main         # Terminal 2 (from Windows PowerShell)
```

### 12. Verify

- [ ] App launches without errors
- [ ] Database migration auto-applies
- [ ] Settings load and save
- [ ] API keys load from shared store
- [ ] Theme toggle works
- [ ] Window controls (minimize, maximize, close) work
- [ ] CRUD operations work for core entities
- [ ] `tsc --noEmit` passes both configs

## Common Pitfalls

1. **Forgetting to copy migrations to dist**: The `dev:main` script must include `xcopy` for the migrations directory
2. **Wrong port in window.ts**: Must match `vite.config.ts` port
3. **Missing `as const` on IPC_CHANNELS**: Without it, TypeScript treats values as `string` not literal types
4. **Not declaring `window.electronAPI` globally**: Add to types.ts:
   ```typescript
   declare global {
     interface Window {
       electronAPI: ElectronAPI;
     }
   }
   ```
5. **Forgetting `sandbox: false` in webPreferences**: Required for better-sqlite3 native module
6. **Not running from Windows PowerShell**: Electron GUI apps don't launch from WSL terminal
