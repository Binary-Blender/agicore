# NovaSyn AI-to-AI Collaboration Protocols

**How multiple AI agents collaborate on NovaSyn apps**

---

## Collaboration Scenarios

### Scenario 1: Human -> AI (Most Common)
Human provides requirements, AI implements using this dev stack documentation.

### Scenario 2: AI -> AI (Handoff)
One AI starts work (builds Sprint 1), session ends. Another AI continues (builds Sprint 2). The sprint plan and docs folder are the handoff mechanism.

### Scenario 3: AI -> Human -> AI (Review)
AI implements, human tests the app manually, AI fixes issues.

---

## Protocol 1: Sprint-Based Development

NovaSyn apps are built in sprints. Each sprint follows the schema-first pipeline (see [06_SCHEMA_FIRST.md](06_SCHEMA_FIRST.md)).

### Sprint Plan Format

Every app has a `docs/SPRINT_PLAN.md`:

```markdown
## Sprint 1: Foundation
**Goal**: Core CRUD flows work end-to-end

### Step 1: Scaffold & Config Files
- package.json, vite.config.ts, tsconfig*.json, tailwind.config.js, etc.

### Step 2: Database
- src/main/database/db.ts, migrations/001_core.sql

### Step 3: Shared Types
- src/shared/types.ts

### Step 4: Main Process
- src/main/index.ts, window.ts, models.ts, services/aiService.ts

### Step 5: Preload
- src/preload/index.ts

### Step 6: Renderer Shell
- index.html, index.tsx, globals.css, App.tsx

### Step 7: Store
- src/renderer/store/appStore.ts

### Step 8: Components
- All UI components

### Step 9: Verify
- Type-check, launch, full CRUD flow
```

### How AI Uses the Sprint Plan

1. Read `SPRINT_PLAN.md` to understand current state
2. Identify which sprint is next (marked as not complete)
3. Follow the steps in order
4. After completing all steps, mark the sprint complete
5. Update docs (ARCHITECTURE.md, DATABASE_SCHEMA.md, IPC_REFERENCE.md)

---

## Protocol 2: Documentation as Handoff

Every NovaSyn app maintains a `docs/` folder:

```
docs/
  SPRINT_PLAN.md        # What to build, in what order
  ARCHITECTURE.md       # Current architecture overview
  DATABASE_SCHEMA.md    # All tables, columns, indexes
  IPC_REFERENCE.md      # All IPC channels with types
```

These docs serve as the handoff mechanism between AI sessions:
- **SPRINT_PLAN.md** tells the next AI what's been built and what's next
- **ARCHITECTURE.md** tells the next AI how the app is structured
- **DATABASE_SCHEMA.md** tells the next AI what data exists
- **IPC_REFERENCE.md** tells the next AI what IPC channels exist

### Keeping Docs Updated

After each sprint, update ALL docs to reflect the current state. This is critical for handoff.

---

## Protocol 3: Type-Driven Collaboration

The `src/shared/types.ts` file is the contract between all layers:

1. **AI A** defines interfaces and IPC channels in `types.ts`
2. **AI B** implements handlers in `main/index.ts` using those types
3. **AI C** builds components using the store that uses those types

The TypeScript compiler enforces that everyone agrees on the contract.

---

## Protocol 4: Verification After Each Sprint

After completing a sprint, verify all 10 points:

```
✅ Migration file creates tables without error
✅ types.ts has interfaces for all new entities
✅ IPC_CHANNELS has entries for all new operations
✅ ElectronAPI has method signatures for all channels
✅ preload/index.ts wires all new channels
✅ main/index.ts has handlers for all new channels
✅ Row mappers exist for all new tables
✅ Store has state + actions for all new operations
✅ Components render and interact correctly
✅ Sidebar + App.tsx routing updated
```

This checklist ensures the next AI session starts with a working app.

---

## Protocol 5: Commit Message Format

```
Sprint N Step M: Brief description

- What was added/changed
- Which files were created/modified
- Any notable decisions made

Co-Authored-By: Claude <noreply@anthropic.com>
```

---

## Protocol 6: Counting Consistency

Keep running totals to catch wiring errors:

```markdown
## IPC Channel Counts
- Sprint 1: 28 channels
- Sprint 2: +15 = 43 total
- Sprint 3: +15 = 58 total
- Sprint 4: +13 = 71 total
- Sprint 5: +11 = 82 total

These counts must match across:
- IPC_CHANNELS object in types.ts
- ElectronAPI interface methods in types.ts
- Preload bridge methods in preload/index.ts
- ipcMain.handle calls in main/index.ts
```

---

## Best Practices

### For AI Starting Work
1. Read `docs/SPRINT_PLAN.md` first
2. Read `docs/ARCHITECTURE.md` for current state
3. Check which sprint is next
4. Follow the schema-first pipeline exactly

### For AI Finishing Work
1. Verify all 10 checkpoint items
2. Update all docs in `docs/` folder
3. Mark sprint as complete in `SPRINT_PLAN.md`
4. Leave the app in a launchable state

### For All AIs
1. Follow the IPC bridge pattern exactly
2. One file per concern (don't merge unrelated features)
3. Row mappers for every table
4. Error handling in every IPC handler
5. Use CSS variables for theming, never hardcode colors

**The goal**: Any AI should be able to pick up where another AI left off by reading the docs folder.
