# Agicore Studio — Project Plan

**The visual authoring environment for Agicore. The app that takes the
framework from "exists" to "used."**

This is the governing document for the project. It defines what we are
building, in what order, and what we are deliberately not building. Read
this before opening a PR.

---

## Vision

Agicore Studio is the visual IDE for the Agicore DSL. It is **not** an
attempt to clone Visual Studio Code — it is a focused tool for one job:
**building, running, and deploying Agicore systems faster than hand-editing
`.agi` files allows.**

The original `make.com`-for-AI concept that seeded the Agicore project
returns here as the central interaction: a canvas of nodes connected by
edges, with Human QC checkpoints as first-class node types. Workflows,
pipelines, and routers are inherently graph-shaped; the canvas is the
*natural* representation, not a forced one. ENTITY/STATE/PATTERN
declarations stay in text — they don't graphify usefully — and are
served by an autocomplete-equipped `.agi` editor.

The Studio is what turns Agicore from a framework into a product.

---

## Key Architectural Decisions

These are settled. Disagreement is welcome but requires a written
amendment to this plan, not a unilateral pivot.

### AD-1 — `.agi` text is the source of truth

The canvas is a **generated projection** of the `.agi` file, not the
other way around. Positional metadata (node coordinates, edge routing,
collapsed groups) lives in a sidecar file (`<project>.agi.layout.json`)
that is gitignored-friendly by default but commit-friendly when a team
wants shared layouts.

*Why:* round-tripping a visual canvas back to text without losing
intent is the historical graveyard of visual programming tools.
Pulumi, CDK, Storybook, and Terraform all solved this the same way:
text wins, visuals are a view. We follow them.

### AD-2 — Tech stack matches the rest of `agicore/apps/`

- **Tauri 2** runtime (matches reality-ai, novasyn-chat, gen-x-simulator)
- **React 18** renderer
- **Zustand** for client state
- **React Flow** for the canvas (MIT, battle-tested, performant, the
  obvious choice)
- **CodeMirror 6** for the `.agi` text editor (better extensibility
  than Monaco for a custom DSL; smaller bundle)
- **Rust** backend for project management, build orchestration, and
  Agicore compiler invocation

### AD-3 — Pragmatic self-hosting, not religious self-hosting

Agicore Studio uses Agicore primitives where they fit and breaks out
where they don't. The project model (Project, File, Run, Deployment)
will be declared in `.agi`. The canvas component itself will not be —
React Flow is the right tool. We dogfood opportunistically, not
ceremonially.

### AD-4 — Workflows-first; everything else later

The MVP, Alpha, and Beta milestones are organized around shipping
the visual `WORKFLOW`/`PIPELINE`/`ROUTER` experience to maturity.
Visual editors for ENTITY (data modelling), VIEW (UI scaffolding),
or STATE (state machines) are post-1.0 considerations. We do one
thing well before we do many things adequately.

### AD-5 — The Human QC checkpoint is a first-class node type from Day 1

The original `make.com`-for-AI vision included Human QC checkpoints
as a core differentiator from competing automation tools. This is
not a v2 feature — it ships in MVP. A QC checkpoint node pauses
the workflow, surfaces the upstream output in the run inspector,
and waits for a human approve/reject/edit decision before
continuing downstream.

### AD-6 — Free and open source, MIT

No paid tier in Studio itself. Monetization (if ever) happens
adjacent: hosted runners, managed deployments, enterprise support.
The tool stays free so Agicore stays adopted.

---

## Naming

Working name: **Agicore Studio**. Parallel to Visual Studio / Android
Studio / RStudio — the convention is well-understood. Open to renaming
before 1.0 if a stronger candidate emerges; not worth churning over
during MVP.

---

## Milestone Cadence

| Stage          | Purpose                                          | Approx. effort  |
|----------------|--------------------------------------------------|-----------------|
| **Sprint 0**   | Resolve open questions, scaffold repo            | 1 week          |
| **MVP**        | One workflow, hand-built, runs end-to-end        | 4–6 weeks       |
| **Alpha**      | Self-sufficient — build real workflows in it     | 8–10 weeks      |
| **Beta**       | External users; debug + deploy mature            | 8–10 weeks      |
| **RC**         | Polish, docs, sample projects                    | 4–6 weeks       |
| **1.0**        | Public launch alongside Agicore framework        | —               |

These are *order-of-magnitude* estimates by a non-tracking developer.
Re-estimate at the start of each stage with whatever the team looks
like at that moment.

---

## Sprint 0 — Foundation (week 1) — ✅ COMPLETE 2026-05-26

Settle the things that would be painful to discover wrong later.

- [x] Bench-test React Flow with the canonical workflow's nodes.
      Extension API supports our planned interaction model. 200+ node
      stress test deferred to MVP work.
- [x] Bench-test CodeMirror 6 with a custom `.agi` language pack:
      keyword / type / string / comment / operator highlighting works.
      StreamLanguage version ships in Sprint 0; Lezer-grammar migration
      is the first Alpha ticket.
- [x] Write the canonical `.agi` test fixture covering WORKFLOW with
      HTTP, AI, QC, and conditional-edge nodes.
      (`examples/canonical_workflow.agi`)
- [x] Locked: separate `agicore-cli` binary, Studio shells out;
      communication via local-only websocket. See SPRINT_0_NOTES.md
      § OQ-1, OQ-2.
- [x] Stubbed `agicore_studio.agi` — Project, AgiFile, LayoutSidecar,
      Run, QcDecision entities + open/load/save/run/qc actions.

**Exit criteria:** ✅ No unknown unknowns about the tech stack. MVP
tickets writable with confidence. Full bench results, locked open
questions, and suggested first MVP tickets in
[`SPRINT_0_NOTES.md`](./SPRINT_0_NOTES.md).

---

## MVP — One Workflow, End to End (4–6 weeks)

**Mission:** A user opens the Studio, creates a new project, builds the
canonical "summarize-then-QC-then-post" workflow on the canvas, hits
Run, watches it execute with live data flowing through nodes, sees
a Human QC checkpoint surface a pending approval, approves it, watches
the workflow complete.

That's the entire MVP scope. Nothing else.

### MVP feature list

- Project create / open / close (single `.agi` file + sidecar layout)
- Canvas with the following node types:
  - **Start** (workflow entry)
  - **HTTP call** (GET/POST with templated URL + body)
  - **AI call** (provider-agnostic, single prompt, returns text or JSON)
  - **Transform** (JS-expression node — operates on prior output)
  - **Branch** (boolean condition → two downstream paths)
  - **QC Checkpoint** (pause-and-await-human node)
  - **End** (workflow exit)
- Drag from palette to canvas, drag-route edges, delete via keyboard
- `.agi` text view: pane that shows the generated `.agi` source, read-only
  in MVP, refreshes on canvas change
- Layout persistence to `<project>.agi.layout.json`
- **Run button** — executes the workflow, streams events back to the
  canvas, paints each node green/red/yellow as it completes
- **Run inspector** — bottom pane showing the live event log + the
  inputs/outputs of each completed node
- **QC pending state** — when a QC node fires, the inspector surfaces
  the upstream output with approve / reject / edit-then-approve controls
- Save / autosave
- Single-window app (no multi-project tab support yet)

### MVP explicit non-features

- No autocomplete in the .agi text pane (text is read-only)
- No debug mode (step / breakpoints / inspect)
- No deploy (run-only, local-only)
- No `.agi` text editing (canvas is the only authoring surface)
- No entity / view / state visual editors
- No multi-file projects
- No tests / test runner integration
- No version control awareness
- No plugin / custom node SDK
- No telemetry, no analytics, no auto-update
- No theme support (one theme — dark)
- No documentation beyond a 200-line README + a 5-minute demo video

### MVP ship criteria

1. A new contributor can install dependencies, run `npm run tauri:dev`,
   and reach the canvas in under five minutes.
2. The canonical workflow runs to completion on a default machine
   without errors.
3. The QC checkpoint flow works end-to-end with a human approve and
   a human reject path.
4. `git diff` of an `.agi` file after a series of canvas edits looks
   like something a human would write — no junk, no positional noise.
5. A 90-second screen recording of the MVP demo lands on Twitter
   without requiring any external explanation.

---

## Alpha — Self-Sufficient (8–10 weeks after MVP)

**Mission:** A user can build *real* workflows in the Studio. The
Studio is good enough that we replace hand-editing of `.agi` files
for new agicore projects internally.

### Alpha additions

- Full `.agi` text editing (two-way binding: text edits update the
  canvas, canvas edits update the text)
- Schema-aware autocomplete (entity names, action names, field names,
  built-in functions) — driven by parsing the in-progress `.agi`
- Hot-reload on text edit (canvas re-layouts when the .agi changes
  outside the Studio — e.g., from a git pull)
- Multi-file project support — workflows can reference entities from
  sibling `.agi` files, autocomplete resolves cross-file
- Project explorer panel (file tree)
- More node types: Loop, Parallel-Fanout, AI-with-tool-use,
  Database-query, Vault-read, Vault-write
- ROUTER node (Agicore's tier-based cooperative-intelligence routing)
- Quick-start templates ("Empty workflow", "RAG pipeline",
  "Multi-step approval", "Web scrape + summarize")
- Settings panel (default AI provider, API key management, theme)
- Crash recovery (autosave + recover-from-crash dialog)
- Search across project files
- "Generated `.agi`" diff view (preview the text changes a canvas edit
  will produce, before committing)

### Alpha ship criteria

1. The Reality.AI `.agi` and Gen-X Simulator `.agi` open correctly in
   Studio — read, render, edit, save round-trips without losing any
   declarations. (These become our regression-test fixtures.)
2. A real new project (something we'd actually ship) is authored
   entirely in Studio with no hand-editing.
3. Text edits and canvas edits never desync — automated test
   asserts this on a randomized edit sequence.
4. Documented limitations file maintained (`KNOWN_LIMITATIONS.md`)
   with a path to resolution for each.

---

## Beta — External Users (8–10 weeks after Alpha)

**Mission:** Open the doors to friendly external users. Debug and
deploy become usable. The Studio survives contact with workflows
authored by people who don't think like us.

### Beta additions

- **Debug mode** — step-through execution, breakpoints on nodes,
  pause-on-error, inspect variables at each step, replay-from-node
- **Deploy targets** — local Tauri build (compile-and-package the
  workflow as a standalone app), Docker container, cloud sidecar
  (initial target: a managed runner; defer cloud-vendor specifics
  until we have user demand pointing at a specific one)
- **Test runner panel** — execute `TEST` declarations from inside
  the Studio, show pass/fail per assertion
- **Version control awareness** — show git status indicator on each
  file in the explorer, simple diff view for `.agi` and layout files,
  no full git client (Studio is not a git tool)
- **Custom node SDK** — community can ship new node types as
  packages; Studio loads them at startup; published as
  `@agicore-studio/node-<name>` on npm
- **Documentation tooltips** — autocomplete shows inline docs from
  the `.agi` grammar reference; node palette shows full per-node docs
- **Performance pass** — canvas should handle 500+ nodes without lag;
  text editor should handle 10K-line `.agi` files without stuttering
- **Telemetry** — opt-in only, anonymous, focused on which node types
  are used, which run outcomes are common, where users get stuck
- **Multi-window** — open multiple projects simultaneously
- **Recent projects list** on startup

### Beta ship criteria

1. Twenty external users build something non-trivial. Their reports
   inform an explicit "what's missing for 1.0" list.
2. A workflow that runs in dev runs identically in a Docker deploy
   target — byte-for-byte reproducible outputs given identical inputs.
3. The "publish a community node" loop is documented and one
   external contributor has shipped a node.
4. Performance budgets met on 500-node canvases / 10K-line files.

---

## RC — Polish and Materials (4–6 weeks after Beta)

**Mission:** Stop adding features. Make the thing solid.

- Bug-fix focus — no new functionality unless it closes a Beta blocker
- Full documentation site (Agicore Studio docs, separate from
  framework docs but cross-linked)
- Tutorial library — five guided walkthroughs covering progressively
  richer workflows
- Sample projects — five reference projects shipping IN the Studio
  (one of them: a tiny port of Reality.AI's persona dispatch as a
  workflow, to show the Studio can build the framework's own showcase
  apps)
- Crash reporting infrastructure (opt-in)
- Auto-update infrastructure (Tauri updater)
- Final accessibility pass (keyboard navigation, screen-reader
  compatibility on the chrome, contrast audit)
- Localization scaffolding (English-only at 1.0, but i18n-ready)
- Marketing site lite — landing page, screenshots, demo video

### RC ship criteria

1. Three weeks of zero critical bugs on the Beta tracker.
2. Docs are complete enough that a new user reaches "first workflow
   running" without asking us a question.
3. The launch announcement draft is reviewed and approved.

---

## 1.0 — Launch

Tag the release. Publish the announcement. Ship the binary.
Coordinate with the Agicore framework release.

After 1.0:

- Visual editors for `ENTITY` (data modelling) and `STATE` (state
  machines) become the v2 focus
- Plugin marketplace
- Collaboration (real-time multi-cursor) — if there's demand
- Cloud sync of project layouts — if there's demand

---

## Non-Goals (Permanently)

These are deliberately out of scope. If they become important later,
they get their own product, not feature-creep into Studio.

- **Not a general-purpose code editor.** We don't compete with VS Code.
  The Studio edits `.agi` files and the small adjacent files that
  Agicore projects need (config JSON, layout sidecars). Generic code
  goes in your code editor.
- **Not a git client.** Status indicators only. Commit/push/merge
  belong in your existing git tool.
- **Not a runtime.** The Studio invokes the Agicore compiler and
  runner — it is not itself an execution environment. Built artifacts
  run via the Agicore runtime, regardless of whether they were
  authored in the Studio or by hand.
- **Not a cloud product.** No hosted Studio. No "log in to use it."
  Local-first, forever.
- **Not a no-code tool.** The audience is developers building
  AI-leveraged systems, not non-technical end users. We pursue
  approachability for developers, not removal of code.

---

## Open Questions (must be resolved before MVP starts)

These are the things to discuss and lock down in Sprint 0.

1. **CLI separation.** Do we ship `agicore-cli` as a standalone
   binary that Studio shells out to, or does Studio invoke the
   compiler in-process? *Lean: separate CLI, Studio shells out.
   Confirm with whoever maintains the compiler.*
2. **Run-event protocol.** Workflow execution emits a stream of
   events that the canvas consumes. What does that protocol look
   like — websocket, named pipe, file-tail? *Lean: websocket from
   the CLI runner on a local-only port; matches Tauri patterns.*
3. **QC checkpoint UX.** When a workflow pauses on QC, does the
   Studio block (modal) or sidebar-notify? What if the user closes
   the Studio with a QC pending — does the workflow persist its
   wait state? *Lean: sidebar-notify, runner persists wait state to
   disk, resumption survives Studio restart.*
4. **AI provider key storage.** Where do we keep API keys for the
   AI-call node type? *Lean: same `%APPDATA%/Agicore/api-keys.json`
   file the other apps use, shared across projects.*
5. **Repository placement.** Does Studio live at
   `apps/agicore-studio/` inside the agicore monorepo (current
   placement), or is it its own repo? *Lean: stay in the monorepo
   through Beta; spin out only if the build/release cadence demands
   separation.*
6. **Naming.** Lock "Agicore Studio" or pick something else before
   MVP ships, to avoid rename churn. *Lean: lock it.*

---

## Risks

- **React Flow may not be performant enough at our target sizes.**
  Mitigation: bench in Sprint 0. If it falls over at 200 nodes,
  evaluate Reaflow, Rete.js, or rolling our own with d3-zoom +
  custom rendering.
- **Two-way text↔canvas binding is historically hard.** Mitigation:
  AD-1 (text is authoritative); canvas edits regenerate text
  unconditionally; never attempt to "merge" simultaneous edits.
  Lock the canvas while text is being externally edited; lock the
  text view while canvas is being edited.
- **Scope creep toward "general IDE."** Mitigation: this document.
  Every PR adding a feature beyond the milestone scope requires an
  amendment.
- **Compiler instability during Studio development.** The Agicore
  compiler is still evolving. Mitigation: Studio pins to a compiler
  version per release; we coordinate Studio versions with framework
  releases, not against `main`.
- **First-user disappointment.** A visual programming tool that
  almost-works is worse than no tool. Mitigation: MVP ships *one*
  canonical workflow that *definitely works.* Polish that one path
  to the floor before extending. Alpha widens the scope only after
  MVP has been stress-tested.

---

## How to use this document

- **Before every PR:** check that the change falls within the
  current milestone's scope. If not, propose an amendment.
- **Before every milestone:** review and refresh. Estimates,
  open questions, and risks all decay.
- **After every milestone:** record what actually happened. The
  next milestone's plan is better when the prior one's reality is
  on the same page.

This is a living document. Edit it. Date your edits. Future-you and
future-team will thank you.

---

*Plan version: 0.1 (Sprint 0 starting)*
*Last meaningful revision: 2026-05-26*
