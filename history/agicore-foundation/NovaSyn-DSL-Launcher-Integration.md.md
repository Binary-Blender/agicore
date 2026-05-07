# NovaSyn DSL Launcher: Integration Spec

## Core Concept

NovaSyn Chat becomes the **DSL orchestrator** — superior to Claude Code.

**Claude Code limits:**
- Context bloat (no prune)
- No scaffolding
- No verification pipeline
- No multi-model planning

**NovaSyn advantages:**
- Prune dev stack post-planning
- Auto-scaffold app + docs
- DSL execution + verification
- Multi-model requirements gathering

## Workflow Diagram

```
Chat Session (Multi-Model)
  ↓ "Prune Dev Stack" Button (Summarize/Ref)
Context Window → DSL Button → AI → JSON Specs
  ↓ Scaffold Script (Terminal/Macro)
New App Dir + Docs + DSL Instructions
  ↓ Terminal Tab
Claude Code: "Read JSON specs. Execute DSL."
  ↓ Auto-Verify (tsc/migrations/IPC test)
Feature Live
```

## Button 1: "Prune Dev Stack"

**Purpose:** Remove heavy dev stack context post-planning (80% token savings).

**Prompt Sent to AI:**
```
Summarize this dev stack for reference only. Output as compact bullet list. Do not include full details.

Dev Stack Context: [current window]

Reference Format:
- Stack: Electron/React/TS/Zustand/SQLite
- Patterns: Schema-first IPC bridge
- Verify: tsc --noEmit both configs
```

**Result:** Lightweight ref doc. Context freed for feature focus.

## Button 2: "Generate DSL Specs"

**Purpose:** Turn requirements → structured JSON for DSL.

**Prompt Sent to AI (Claude 3.5 Sonnet):**
```
Convert this conversation into NovaSyn DSL JSON specs.

Rules:
- Schema-first: Infer tables from requirements
- IPC: CRUD + custom channels
- UI/Store: Infer from features
- Use NovaSyn patterns (IPC bridge, single Zustand, etc.)

Context: [pruned context window]

Output ONLY valid JSON:
{
  "app_name": "novasyn_[feature]",
  "features": [
    {
      "name": "notes",
      "schema": "SQL string",
      "ipc": ["get_notes"],
      "types": "Interface snippet",
      "main": "Handler summary",
      "store": "Slice summary",
      "ui": "Components list",
      "ai": "Optional prompt template"
    }
  ],
  "instructions": "Implement using NovaSyn DSL syntax."
}
```

## Scaffold Script (Macro/Terminal)

**On DSL JSON Receive:**
```bash
# novadsl-scaffold.sh (auto-run in terminal)
mkdir novasyn_[app_name]
cp -r template/* novasyn_[app_name]/  # Boilerplate
jq -r '.features[] | "app add \(.name) { schema \"\(.schema)\" ... }"' specs.json > dsl.md

echo "DSL specs ready. Prompt Claude Code: 'Read dsl.md. Execute.'"
```

**Generates:**
- App dir with boilerplate
- docs/SPRINT_PLAN.md with DSL
- _project_docs/ with JSON specs

## Terminal Execution

**User Prompt to Claude Code:**
```
Read dsl.md specs. Implement each feature using NovaSyn DSL.

Output folder structure with files.
Verify wiring before finalizing.
```

**Post-Execution Auto-Verify:**
```bash
tsc --noEmit -p tsconfig.main.json && tsc --noEmit -p tsconfig.renderer.json
npm run migrate
node ipc-wiring-test.js  # Custom checker
npm run type-check
```

## UI Implementation

**NovaSyn Chat Renderer Additions:**
- **Prune Button:** `ipcRenderer.invoke('prune_dev_stack')`
- **DSL Button:** `ipcRenderer.invoke('generate_dsl_specs')` → JSON → scaffold
- **Tab Switch:** `setCurrentView('terminal')` (Zustand)

**Main IPC Handlers:**
```
PRUNE_DEV_STACK: Summarize stack → return ref doc
GENERATE_DSL_SPECS: Context → Sonnet → JSON specs
SCAFFOLD_APP: JSON → mkdir/cp/jq → ready dir
```

## Example End-to-End

**Chat:** "Build notes feature."
**Prune:** Dev stack → ref doc
**DSL Button:** → JSON specs
**Scaffold:** novasyn_notes/ ready
**Terminal:** Claude executes DSL → files generated
**Verify:** PASS

**60s/feature.**

## Token Savings

| Without DSL Launcher | With |
|---|---|
| 50k tokens/prompt | 5k tokens (JSON spec) |
| Manual scaffold | Auto |
| No prune | 80% context freed |

## Edge Cases

- **Invalid DSL:** Claude rejects → re-prompt
- **Verify Fail:** Terminal error → "Fix: [details]" back to chat
- **Multi-Feature:** JSON array → parallel agents
- **Cross-App:** `macro "vault_integrate notes"`

## Rollout

1. Add buttons to Chat UI
2. IPC handlers in main
3. Scaffold macro in terminal service
4. Test with "notes" feature

**NovaSyn DSL Launcher: Prompt → Spec → Scaffold → Execute → Verify.**

**Claude Code wishes it had this.**

*Binary-Blender: Ridiculous.*