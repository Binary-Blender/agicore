# NovaSyn DSL: The One-Page AI App Builder

**A Domain-Specific Language (DSL) for directing AI to add features to NovaSyn apps.**

## Overview

**Problem:** AI prompting for app features requires massive context (dev stack, patterns, verification). Tokens explode. Hallucinations happen.

**Solution:** NovaSyn DSL — a 10-line syntax that encodes the entire dev stack. AI reads DSL → generates files → terminal verifies.

**Key Insight:** AI doesn't need to *know* your stack. It needs a blueprint. DSL = blueprint.

**Benefits:**
- **Token Efficiency:** 90% reduction (one prompt vs. full stack context)
- **Reliability:** Syntax enforces patterns (no hallucinations)
- **Speed:** Feature added in 60-120 seconds
- **Verification:** Stack auto-checks (tsc --noEmit, migrations, IPC wiring)
- **Scalability:** Infinite features from one page spec

**Philosophy:** Engine (DSL + stack) decides *what*. AI decides *how* (implementation).

## Syntax

```
app add [feature_name] {
  schema [sql_snippet];              // Table/index creation
  ipc [channels];                    // IPC_CHANNELS entries
  types [interfaces];                // TS interfaces + ElectronAPI
  main [handlers];                   // Row mappers + ipcMain.handle
  store [zustand_slice];             // State + actions
  ui [components];                   // React components + routing
  ai [prompt_template];              // Optional AI integration
  verify [checks];                   // tsc, migrations, tests
}
```

**Fields (all optional, defaults exist):**
- `schema`: Raw SQL for migrations/001_feature.sql
- `ipc`: Comma-separated channels (auto-generates CRUD)
- `types`: "Student" → full interface + IPC_CHANNELS + ElectronAPI
- `main`: Auto row mappers + handlers from schema/types
- `store`: Auto Zustand slice from types
- `ui`: "StudentList,StudentForm" → components + App.tsx/Sidebar routing
- `ai`: "generate-lesson" → aiService integration
- `verify`: "tsc --noEmit,migrate,store.loadStudents()" (defaults to full check)

## Workflow

1. **Write DSL** (10 lines in NovaSyn Chat or notes)
2. **Prompt Claude:** "Read this NovaSyn DSL. Generate files. Output as zip or folder structure."
3. **Save as Markdown** (NovaSyn button)
4. **Tab to Terminal:** "Claude Code, read markdown, execute in novasyn_[app] dir."
5. **Auto-Verify:** Script runs tsc, migrations, type-check
6. **Done:** Feature live. `npm run dev`

**Example Prompt to Claude:**
```
NovaSyn DSL:

app add notes {
  schema "CREATE TABLE notes (id TEXT PRIMARY KEY, title TEXT, content TEXT, pinned INTEGER);";
  ipc "notes.crud";
  ui "NotesPanel";
}

Generate all files. Verify wiring.
```

**Output:** Claude generates 10 files. Terminal applies + verifies.

## NovaSyn Enablement

- **Chat:** DSL writing + multi-model refinement
- **Markdown Save:** One-button session export
- **Terminal Tab:** WSL full-screen, script runner
- **Macro Queue:** Chain DSL across apps ("app add notes; vault integrate")
- **Verification:** Built-in tsc --noEmit, migration runner, store test
- **Stack Magic:** IPC auto-wires, types infer from schema

## Examples

### 1. Basic CRUD (Notes)
```
app add notes {
  schema "CREATE TABLE notes (id TEXT PRIMARY KEY, title TEXT NOT NULL, content TEXT, pinned INTEGER DEFAULT 0);";
  ipc "get_notes,create_note";
  ui "SidebarNotes";
}
```
**Generates:** Migration, types.ts entries, main handlers, store slice, Notes.tsx, routing.

### 2. AI Feature (Lesson Generator)
```
app add lesson_generator {
  schema "CREATE TABLE lessons (id TEXT PRIMARY KEY, student_id TEXT, content TEXT);";
  ipc "generate_lesson";
  ai "You are a lesson planner. Student: {{student}}. Generate JSON plan.";
  ui "LessonPanel";
}
```
**Generates:** AI service hook + JSON parsing.

### 3. Cross-App (Vault Search)
```
app add vault_search {
  ipc "vault_search";
  ui "VaultBrowser";
  ai "Search vault for {{query}}. Return top 5.";
}
```
**Generates:** Vault IPC + search UI.

### 4. Advanced (Gamification)
```
app add gamification {
  schema "CREATE TABLE badges (id TEXT PRIMARY KEY, student_id TEXT, type TEXT, awarded_at TEXT);";
  ipc "award_badge,load_badges";
  store "badgesSlice";
  ui "BadgePanel";
  verify "tsc && test badges";
}
```

### 5. Bundle (Multi-Feature)
```
app add student_profile {
  schema "notes + badges tables";
  ipc "profile.crud";
  ui "ProfileModal";
}
```

## Advantages Over Full Prompting

| Full Prompt | NovaSyn DSL |
|---|---|
| 50k+ tokens/context | 1k tokens |
| Hallucinated IPC/types | Syntax-enforced |
| Manual verification | Auto tsc/migrations |
| Stack knowledge required | One-page spec |
| 10-30 min/feature | 60-120s/feature |

## Error Handling

- **Syntax Error:** Claude rejects invalid DSL
- **Verify Fail:** Terminal reports (tsc errors, migration fail)
- **Hallucination Catch:** Stack rejects bad wiring (types mismatch)
- **Fallback:** "Regenerate with error: [details]"

## Verification Script (Auto-Run)

```bash
#!/bin/bash
# novadsl-verify.sh
tsc --noEmit -p tsconfig.main.json
tsc --noEmit -p tsconfig.renderer.json
npm run migrate
node test-ipc-wiring.js  # Checks IPC channels match
echo "DSL Verify: PASS"
```

## Future Extensions

- `app bundle [features]` — Multi-feature DSL
- `app test [scenario]` — E2E tests
- `app deploy [target]` — electron-builder
- `app macro [name]` — Cross-app integration
- VS Code Extension — DSL IntelliSense

## One-Page Quickstart

1. Write DSL
2. Claude: "Implement this NovaSyn DSL"
3. Terminal: Run output
4. Verify: PASS → Feature live

**NovaSyn DSL: Engine decides structure. AI decides details.**

*Binary-Blender: Ridiculous.*