# Sprint 0 — Foundation Notes

*Date completed: 2026-05-26*

The exit criteria for Sprint 0 (per `PROJECT_PLAN.md`) was: **"No unknown
unknowns about the tech stack. We can write tickets for MVP with
confidence."** This document records what was validated, what was decided,
and what MVP can now proceed on.

---

## Tech-stack bench results

### React Flow (`@xyflow/react` 12.3.5) — PASS

Renders the five-node canonical workflow with custom node components,
typed handles, animated edges, mini-map, controls, and a dotted
background. Pan/zoom/drag interactions feel native. The `NodeTypes`
extension API is straightforward — one component handles all node
variants via the `data.nodeType` discriminator.

**Concern to revisit during MVP:** stress-test with 200+ nodes and
500+ edges. The 5-node bench tells us nothing about performance at
the upper bound of our planned scale.

**Decision:** proceed with `@xyflow/react` 12.x as the canvas library
through 1.0. Fallback candidates if 200+ nodes degrade (Reaflow,
Rete.js, custom d3-zoom) stay as risk-mitigation only.

### CodeMirror 6 — PASS

Renders the canonical `.agi` source with the custom language extension.
Keyword / type / class-name / string / number / comment / operator
tokens all highlight correctly. Line numbers, active-line highlight,
bracket matching, history all in place. Extension surface is exactly
as advertised — no surprises.

**Sprint 0 limitation:** the `.agi` language extension is a
`StreamLanguage` (regex-based tokenizer). It's perfect for
highlighting but insufficient for Alpha-milestone features
(autocomplete with awareness of the surrounding context, semantic
highlighting that knows whether `Profile` refers to an entity or a
field). Alpha work will replace it with a proper Lezer grammar.

**Decision:** proceed with CodeMirror 6 as the text editor through
1.0. The StreamLanguage path stays through MVP; Lezer migration is
the first Alpha ticket.

### Tauri 2 + React 18 + Zustand + Vite — PASS

Consistent with apps/reality-ai/ and apps/gen-x-simulator/. No new
risks discovered. Port 5182 reserved for this app.

---

## Open questions — locked

The six open questions from `PROJECT_PLAN.md § Open Questions` are
resolved as follows. Each is locked per the plan's recommended "lean."

### OQ-1: CLI separation — LOCKED: separate `agicore-cli` binary

Studio shells out to a separate `agicore-cli` binary for compile, run,
and deploy. The CLI is not part of this app's repo (it lives elsewhere
in the agicore monorepo). Studio invokes it via `tauri::process` /
`std::process::Command` and reads its event stream over a local-only
websocket (see OQ-2).

**Why:** keeps the headless story first-class. Anything Studio can
do, a script can do. CI/CD systems do not need a GUI. Studio's
"Run" button is a convenience, not the only path.

### OQ-2: Run-event protocol — LOCKED: local-only websocket from CLI

When Studio invokes `agicore-cli run …`, the CLI opens a websocket on
a random unused localhost port and prints `{"event":"listening","port":N}`
on its stdout. Studio parses that line, connects, and consumes the
stream of `{event, node, payload}` JSON messages until the CLI emits
`{"event":"complete"}` or `{"event":"error"}`.

**Why:** named pipes are platform-specific; file-tail is awkward to
multiplex. Websockets on localhost are well-supported by Tauri's
sandbox, work identically on every OS, and the CLI's port-pinning
prevents external listeners.

### OQ-3: QC checkpoint UX — LOCKED: sidebar-notify + on-disk persistence

When a workflow hits a QC checkpoint, the Studio:
1. Displays a notification in the bottom Inspector pane (not a modal)
2. Adds an entry to a persistent "Awaiting QC" panel in the rail
3. Writes the pause state to `runs/<run_id>.qc-pending.json` so the
   workflow can be resumed across Studio restarts

The user can leave the Studio, come back tomorrow, find the pending
QC waiting in the rail, decide, and the workflow resumes.

**Why:** modals make multi-workflow editing painful. On-disk
persistence honors AD-5 (QC is first-class) — a real Human QC node
must survive operator absence.

### OQ-4: AI provider key storage — LOCKED: shared `api-keys.json`

Studio reads/writes the same `%APPDATA%/Agicore/api-keys.json` file
used by reality-ai and novasyn-chat. Key entry UI lives in Studio's
Settings panel. No per-project key isolation in v1 — single user,
single machine, shared keychain.

**Why:** consistency with sibling apps; lets users configure once
and use everywhere; matches AI_SERVICE declaration conventions.

### OQ-5: Repo placement — LOCKED: stay in agicore monorepo through Beta

Studio lives at `apps/agicore-studio/` inside the agicore monorepo
until Beta ships. Spin-out (if at all) becomes a Beta-exit decision
based on release-cadence pain.

**Why:** premature repo splits are expensive to undo. The monorepo
co-locates Studio with the framework it serves, which simplifies
breaking-change coordination.

### OQ-6: Naming — LOCKED: "Agicore Studio"

The name is locked. Renaming after MVP would churn docs, settings
paths, install bundle identifiers, and external references.

---

## Sprint 0 deliverables

All files exist and were committed in this sprint:

| File                                                 | Purpose                          |
|------------------------------------------------------|----------------------------------|
| `agicore_studio.agi`                                 | Studio's own data model (source of truth) |
| `examples/canonical_workflow.agi`                    | The fixture that drives every milestone demo |
| `package.json`, `tsconfig.json`, `vite.config.ts`    | Frontend toolchain               |
| `tailwind.config.js`, `postcss.config.js`, `index.html` | UI plumbing                  |
| `src-tauri/Cargo.toml`, `tauri.conf.json`, `main.rs` | Minimal Tauri shell              |
| `src/main.tsx`, `App.tsx`, `TitleBar.tsx`            | App skeleton                     |
| `src/components/Canvas.tsx`, `StudioNode.tsx`        | React Flow bench                 |
| `src/components/AgiEditor.tsx`                       | CodeMirror 6 bench               |
| `src/lib/agi-language.ts`                            | `.agi` language extension (Sprint 0 StreamLanguage version) |
| `src/lib/canonical-workflow.ts`                      | Hardcoded node graph for the bench |
| `src/lib/canonical-source.ts`                        | Inlined `.agi` source for the bench |
| `src/styles/globals.css`                             | Theme + React Flow dark overrides |
| `PROJECT_PLAN.md`, `README.md`, `SPRINT_0_NOTES.md`  | Governance + onboarding         |

---

## Ready for MVP

**Yes.** All Sprint 0 exit criteria met. Open questions locked. Tech-stack
risks bounded. MVP work can begin against a known-good foundation.

### First MVP tickets (suggested order)

1. **Replace `StreamLanguage` with a Lezer grammar for `.agi`.**
   Required for autocomplete; required before two-way text↔canvas binding
   in Alpha. Worth doing first because it's the longest-pole item.

2. **Wire Rust commands for project I/O.**
   `create_project`, `open_project`, `read_agi_file`, `write_agi_file`,
   layout-sidecar load/save. Generated from `agicore_studio.agi`.

3. **Parse `.agi` text → canvas node graph (one-way).**
   Replace the hardcoded `CANONICAL_NODES`/`CANONICAL_EDGES` with a
   parser that reads a WORKFLOW declaration and produces React Flow
   nodes/edges. Read-only for MVP — canvas reflects text, not the
   other way around.

4. **Implement the canonical workflow's run path against a stub
   `agicore-cli`.**
   Even before the real CLI exists, the Studio should be able to
   invoke a fake binary that produces the expected event stream so
   the Inspector and run-time canvas painting can be developed.

5. **QC checkpoint pause/resume.**
   The single hardest thing in MVP. Inspector renders the pending
   upstream output; user approves/rejects/edits; resume signal goes
   back to the (stub) CLI.

6. **Polish to ship criteria.**
   Five-minute install-to-canvas. Canonical workflow runs cleanly.
   `git diff` of the .agi after edits looks human. 90-second screen
   recording lands without external explanation.
