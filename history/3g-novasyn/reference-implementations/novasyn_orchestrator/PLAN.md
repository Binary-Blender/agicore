# NovaSyn Orchestrator — Port Plan

> **Status:** Pre-development planning
> **Source:** Binary Blender Orchestrator (web app)
> **Target:** Electron desktop app matching NovaSyn AI architecture
> **Prerequisite:** Ship NovaSyn AI v1.0 first

---

## Overview

NovaSyn Orchestrator ports the Binary Blender Orchestrator web app to a standalone
Electron desktop app. It is the second app in the NovaSyn Suite, sharing the NS Core
layer (API keys, settings, SQLite, provider abstraction) with NovaSyn AI.

The orchestrator lets users build multi-step AI workflows using a row-based visual
builder. Each row is an execution level; modules within a row run in parallel. This
is simpler than a free-form node canvas and maps cleanly to a React component tree.

---

## Source Repos (Web Version)

| Repo | Language | Role |
|------|----------|------|
| `binary-blender-orchestrator-engine` | Python 3.11 / FastAPI | BFS workflow executor |
| `binary-blender-orchestrator-frontend` | Vue 3 (CDN, uncompiled) | Builder UI + runtime view |
| `binary-blender-orchestrator-assets` | Python / FastAPI | Asset metadata microservice |

All three repos live at `C:\Users\Chris\Documents\_DevProjects\`.

---

## Architecture Mapping

### What Changes

| Web Component | Electron Equivalent | Notes |
|---|---|---|
| FastAPI engine (port 8000) | TypeScript `WorkflowEngine` class | Same BFS logic, ~300 lines |
| FastAPI assets service (port 8001) | Collapsed into same SQLite DB | Eliminates separate process |
| PostgreSQL | SQLite (via `better-sqlite3`) | Already used in NovaSyn AI |
| Vue 3 CDN frontend | React + TypeScript | Rebuild from scratch |
| JWT auth layer | **Dropped entirely** | Single-user desktop, no auth needed |
| CORS / API gateway | **Dropped** | Direct IPC, no HTTP between renderer and engine |

### What Stays the Same

- Row-based workflow paradigm (numbered rows = execution levels)
- Module palette → canvas → config panel layout
- Module types and their input/output contracts
- Asset lineage tracking concept
- Job instruction / template system

---

## Execution Model

The engine's core insight is **BFS level grouping**:

```
Level 0: [Module A]                  ← runs first
Level 1: [Module B, Module C]        ← runs in parallel after A
Level 2: [Module D]                  ← runs after B and C both complete
```

The Python `asyncio.gather()` becomes TypeScript `Promise.all()`. The logic is
identical — just different syntax.

```typescript
// WorkflowEngine.ts (simplified)
for (const level of buildExecutionLevels(workflow)) {
  await Promise.all(level.map(module => executeModule(module, context)));
}
```

---

## Project Structure (Target)

```
novasyn_orchestrator/
├── src/
│   ├── main/
│   │   ├── index.ts                  # Electron main process
│   │   ├── ipc/
│   │   │   ├── workflowHandlers.ts   # IPC for workflow CRUD + execution
│   │   │   └── assetHandlers.ts      # IPC for asset operations
│   │   ├── engine/
│   │   │   ├── WorkflowEngine.ts     # BFS executor (port of workflow_engine.py)
│   │   │   ├── ModuleRegistry.ts     # Module type definitions + execution
│   │   │   └── modules/              # One file per module type
│   │   │       ├── TextGenerationModule.ts
│   │   │       ├── ImageGenerationModule.ts
│   │   │       └── ...
│   │   └── db/
│   │       ├── schema.ts             # SQLite schema (workflows, assets, runs)
│   │       └── queries.ts            # Typed query helpers
│   ├── renderer/
│   │   ├── App.tsx
│   │   ├── components/
│   │   │   ├── WorkflowBuilder/
│   │   │   │   ├── BuilderCanvas.tsx     # Row-based canvas
│   │   │   │   ├── ModulePalette.tsx     # Left panel, draggable modules
│   │   │   │   ├── WorkflowRow.tsx       # Single execution level row
│   │   │   │   ├── ModuleCard.tsx        # Module within a row
│   │   │   │   └── ConfigPanel.tsx       # Right panel, selected module config
│   │   │   ├── WorkflowRunner/
│   │   │   │   ├── RunnerView.tsx        # Live execution view
│   │   │   │   └── ModuleStatusCard.tsx  # Per-module status + output
│   │   │   ├── AssetLibrary/
│   │   │   │   └── AssetBrowser.tsx      # Browse/preview saved assets
│   │   │   └── Sidebar.tsx
│   │   └── store/
│   │       └── orchestratorStore.ts      # Zustand store
│   ├── preload/
│   │   └── index.ts
│   └── shared/
│       └── types.ts                      # Workflow, Module, Asset, Run types
├── package.json
├── tsconfig.json
└── electron-builder.config.js
```

---

## SQLite Schema

```sql
-- Workflow definitions
CREATE TABLE workflows (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  definition JSON NOT NULL,   -- rows[], each row has modules[]
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Execution runs
CREATE TABLE runs (
  id TEXT PRIMARY KEY,
  workflow_id TEXT REFERENCES workflows(id),
  status TEXT CHECK(status IN ('pending','running','completed','failed')),
  inputs JSON,
  outputs JSON,
  started_at DATETIME,
  completed_at DATETIME,
  error TEXT
);

-- Per-module run results
CREATE TABLE run_steps (
  id TEXT PRIMARY KEY,
  run_id TEXT REFERENCES runs(id),
  module_id TEXT NOT NULL,
  module_type TEXT NOT NULL,
  level INTEGER NOT NULL,
  status TEXT CHECK(status IN ('pending','running','completed','failed')),
  inputs JSON,
  outputs JSON,
  started_at DATETIME,
  completed_at DATETIME,
  error TEXT
);

-- Assets (images, text, audio, video produced by runs)
CREATE TABLE assets (
  id TEXT PRIMARY KEY,
  run_id TEXT REFERENCES runs(id),
  step_id TEXT REFERENCES run_steps(id),
  asset_type TEXT CHECK(asset_type IN ('image','text','audio','video')),
  filename TEXT,
  file_path TEXT,
  metadata JSON,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

---

## Module System

Each module type is a TypeScript class implementing `IModule`:

```typescript
interface IModule {
  type: string;
  label: string;
  description: string;
  inputSchema: JSONSchema;
  outputSchema: JSONSchema;
  execute(inputs: Record<string, unknown>, context: RunContext): Promise<Record<string, unknown>>;
}
```

Initial module types to port from Binary Blender:
- `text-generation` — calls AI provider (reuses NovaSyn AI's ChatService)
- `image-generation` — DALL-E / Stable Diffusion
- `text-transform` — prompt template rendering, string ops
- `file-input` — read local file into workflow context
- `file-output` — write asset to disk
- `conditional` — branch on output value
- `aggregator` — collect parallel outputs into array

---

## NS Core Integration

NovaSyn Orchestrator reuses from NovaSyn AI:
- `settingsStore.ts` — same API key storage
- `ChatService.ts` — text-generation modules call this directly
- `better-sqlite3` setup — extend existing schema pattern
- Electron boilerplate (main process, preload, IPC pattern)

Strategy: extract shared code into a local `packages/ns-core/` workspace when
building the second app, rather than duplicating files.

---

## Build Phases

### Phase 1 — Engine + Schema (Foundation)
- [ ] Scaffold Electron project (copy from NovaSyn AI)
- [ ] Define shared TypeScript types (`Workflow`, `Module`, `Run`, `Asset`)
- [ ] Implement SQLite schema + query helpers
- [ ] Port `WorkflowEngine.ts` (BFS + `Promise.all`)
- [ ] Implement `ModuleRegistry` with 2-3 basic module types
- [ ] Wire up IPC handlers for workflow CRUD and execution

### Phase 2 — Builder UI
- [ ] `BuilderCanvas.tsx` — vertical row list, add/remove rows
- [ ] `ModulePalette.tsx` — sidebar with module types, drag to add
- [ ] `WorkflowRow.tsx` — horizontal module cards, reorderable
- [ ] `ModuleCard.tsx` — name, type badge, delete button
- [ ] `ConfigPanel.tsx` — dynamic form from module's `inputSchema`

### Phase 3 — Runner View
- [ ] `RunnerView.tsx` — live execution with per-module status
- [ ] Streaming output display per module (reuse NovaSyn AI streaming pattern)
- [ ] Run history list
- [ ] Asset output preview

### Phase 4 — Asset Library
- [ ] Asset browser with type filter
- [ ] Preview panel (text, image, audio)
- [ ] Lineage view (which run/step produced this asset)

### Phase 5 — Polish + Templates
- [ ] Workflow template library (pre-built job instructions)
- [ ] Export/import workflow JSON
- [ ] Settings integration (API keys carried over from NS Core)
- [ ] Auto-updater (same pattern as NovaSyn AI)

---

## Key Decisions (Made)

1. **No HTTP between main and renderer** — direct IPC only. The Python FastAPI
   servers are replaced entirely by main-process TypeScript classes.

2. **Drop auth** — single-user desktop app, no JWT, no user table.

3. **SQLite over PostgreSQL** — simpler distribution, no server process, already
   proven in NovaSyn AI.

4. **React rebuild over Vue port** — consistency with NovaSyn AI, better TypeScript
   support, easier to share NS Core components later.

5. **Row-based UI preserved** — the row paradigm from Binary Blender is intuitive
   and simpler to implement than a free-form canvas (no need for react-flow or
   similar). Keep it.

6. **Reuse ChatService** — `text-generation` modules call the same provider
   abstraction already built for NovaSyn AI, including all 14 models.

---

## Reference Files

- Web engine: `C:\Users\Chris\Documents\_DevProjects\binary-blender-orchestrator-engine\app\workflow_engine.py`
- Web builder: `C:\Users\Chris\Documents\_DevProjects\binary-blender-orchestrator-frontend\builder.html`
- Web assets: `C:\Users\Chris\Documents\_DevProjects\binary-blender-orchestrator-assets\app\main.py`
- Docs: `C:\Users\Chris\Documents\_DevProjects\binary-blender-orchestrator-docs\`
- NovaSyn AI (pattern reference): `C:\Users\Chris\Documents\_DevProjects\novasynai\`
