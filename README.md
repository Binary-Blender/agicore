# Agicore

**A deterministic systems-authoring platform for AI-native organizations.**

Agicore separates AI intelligence from runtime execution. AI handles interpretation, planning, and generation. Deterministic runtimes handle execution, validation, and reliability. The boundary between them is a DSL.

```
Human Intent
    |
AI Compiler / Orchestration
    |
Agicore DSL (constraint boundary)
    |
Deterministic Runtime
    |
Validated System
```

This is not an agent framework. It is not a chatbot. It is not no-code.

It is infrastructure for building AI-generated systems you can actually trust.

---

## Core Principle

> AI is never trusted at runtime.

AI is used at **build time** for interpretation, translation, and system generation. The output is constrained by a DSL, validated by tests, and executed deterministically. Every decision is traceable. Every output is reproducible.

---

## The Architecture

Agicore is built around a DSL that acts as an intermediate representation between human intent and executable systems:

```
APP home_academy {
  TITLE "Home Academy"
  WINDOW 1200x800 frameless
  DB academy.db
}

ENTITY Student {
  name: string
  grade: string
  active: bool = true
}

ACTION generate_lesson {
  INPUT  student_id: string, subject: string
  OUTPUT lesson: Lesson
  AI     "Generate a lesson plan for {{student}} on {{subject}}"
}

VIEW StudentList {
  ENTITY Student
  LAYOUT table
  ACTIONS create, edit, delete
}

TEST student_crud {
  GIVEN Student { name: "Alice", grade: "5th" }
  EXPECT create -> id IS NOT NULL
  EXPECT get_by_id -> name == "Alice"
}
```

The DSL compiles to working applications with full type safety, database schemas, API layers, UI scaffolds, and test suites. Two compilers verify correctness: `cargo build` + `tsc --noEmit`. If it builds, it works.

---

## Evolutionary Lineage

Agicore is the 4th generation of an AI-native development architecture. Each generation solved a different class of problem:

### 1G -- AI Native Coding Standards
Process thinking. Eight golden rules for AI-maintainable software. Metadata-driven, schema-first, deterministic generation patterns. PromptCore: a structured language for AI orchestration.

### 2G -- Web Development Stack
Infrastructure thinking. Workflow systems, orchestration patterns, reusable architecture for AI-assisted web application delivery.

### 3G -- NovaSyn
Platform thinking. A mature ecosystem of 9+ interoperable Electron applications sharing a common runtime: schema-first SQLite, single Zustand stores, 5-layer IPC bridge, shared vault, macro registry, cross-app orchestration. Zero-defect philosophy: rigid patterns, type-verified wiring, if `tsc --noEmit` passes it works.

### 4G -- Agicore
Systems-language thinking. The NovaSyn architecture generalized into a DSL-driven platform. Tauri replaces Electron (5MB apps instead of 200MB). The DSL replaces manual wiring. Expert systems join application development as first-class compilation targets. The platform becomes recursive: AI generates systems that generate systems.

---

## Repository Structure

```
agicore/
|
|-- README.md                  # You are here
|-- BUILD_WITH_AI.md           # Builder's guide — start here when building an app
|-- START_HERE_WITH_AI.md      # AI-assisted exploration guide (architecture / philosophy)
|-- EVOLVING.md                # How to extend the framework when it's missing something
|-- TECH_STACK.md              # Exact pinned versions for all dependencies
|-- CODING_STANDARDS.md        # Naming conventions, generated structure, anti-patterns
|-- PHILOSOPHY.md              # Core architectural philosophy
|-- ROADMAP.md                 # Development roadmap
|-- TESTING.md                 # TEST declarations and generated Rust integration tests
|-- VAULT.md                   # VAULT declaration: shared cross-app asset storage
|-- CHANNEL.md                 # CHANNEL + PACKET: typed SQLite-backed message queues
|-- LOGGING.md                 # LOG declaration: file-based Rust logger (no new deps)
|-- MACROS.md                  # MACRO + MACRO_REGISTRY: cross-app capability exposure
|-- EMBEDDED.md                # NODE, SENSOR, ZONE, ACTUATOR, PLATFORM, BRAIN_BODY: robots + IoT
|-- NULLCLAW.md                # NullClaw agent runtime: tool bindings, providers, safety
|-- SKILLDOCS.md               # SKILLDOC governance: signed skill docs, clearance, audit
|-- LICENSE                    # MIT
|
|-- dsl/                       # DSL grammar specification
|-- core/                      # Parser, validator, runtime, test runner
|   |-- parser/
|   |-- validator/
|   |-- runtime/
|   +-- test-runner/
|-- compiler/                  # AI compiler (natural language -> DSL)
|   +-- ai-compiler/
|
|-- history/                   # Evolutionary lineage (1G -> 4G)
|   |-- 1g-coding-standards/
|   |-- 2g-web-stack/
|   |-- 3g-novasyn/
|   |-- promptcore/
|   +-- agicore-foundation/
|
|-- examples/                  # Compact .agi demos of individual DSL features
|-- apps/                      # Real applications built on Agicore
|   +-- novasyn-chat/          # First flagship: multi-provider AI chat client
|-- docs/                      # Technical documentation
+-- prompts/                   # AI compiler prompt templates
```

---

## Reference Applications

### NovaSyn Chat 2.0 — Desktop AI Client

The `apps/novasyn-chat/` directory contains the first real application built on Agicore — a multi-provider AI chat client generated from a single `.agi` source file. **This application is proven working end-to-end.**

Verified features (all from generated code):
- Multi-provider streaming AI responses (Anthropic, OpenAI, Google, xAI)
- Encrypted API key storage and runtime model selection
- Conversation history with session management
- Folder-based knowledge organization with context injection
- Tag management and exchange library for reuse
- Semantic "Send To" transitions (save conversations to exchanges, folders, or documents)
- Frameless window with system tray and global hotkey

The app drives Agicore's evolution: every bug encountered while building it became a framework fix; every hand-extension is a codegen candidate. The commit history tracks framework hardening alongside the app's development.

See [`apps/novasyn-chat/README.md`](apps/novasyn-chat/README.md) for setup and architecture notes.

---

### Accelerando ERP/CRM + OIE — The Startup Machine

Two `.agi` files. One `docker-compose up`. A complete AI-native business platform.

**`apps/accelerando-erp/`** — Full-spec ERP/CRM (web target):
- 32 entities across 10 modules: CRM, Finance/GL, Sales, Service, Procurement, Inventory, Manufacturing, Projects, HR
- 12 STAGES state machines: Lead pipeline, Opportunity funnel, Invoice approval, PO lifecycle, Manufacturing orders, Project/Task, Timesheet approval, and more
- 32 business actions with EMIT telemetry — full coverage of the Accelerando service catalog
- 3 WORKFLOWs: high-value invoice review, deal-won project creation, inventory replenishment
- Compiles to: Axum REST API, React frontend, PostgreSQL, multi-stage Docker, JWT auth, row-level tenant isolation

**`apps/accelerando-oie/`** — Organizational Intelligence Engine (desktop):
- Ingests every ERP/CRM action via typed CHANNEL
- 4 REASONERs (daily batch, weekly trend, on-demand, personal coach)
- QC_MESH: 4 independent evaluators, majority consensus, exceeds 5σ quality detection
- ESCALATION_CHAIN + NBVE: statistical model quality governance under load
- Compiles to: Tauri desktop app, SQLite, frameless window, system tray

The OIE's demo insights (invoice bottleneck, quote-to-cash gap, escalation spike) trace directly to activity in the ERP. The seed data is coherent across both apps.

See [`apps/accelerando-erp/README.md`](apps/accelerando-erp/README.md) and [`apps/accelerando-oie/README.md`](apps/accelerando-oie/README.md).

---

## Philosophy

Most AI systems today blur the line between generation and execution. They generate at runtime, which means they hallucinate at runtime.

Agicore draws a hard boundary:

- **Build time**: AI interprets, plans, translates, generates. Uncertainty is useful here.
- **Run time**: Deterministic systems execute validated logic. Correctness is required here.

This separation comes from Toyota Production System thinking applied to AI workflows: build quality in, don't inspect it out. Constrain the space of possible behavior rather than trying to convince a model to behave.

The result is systems that are:
- **Predictable** -- same input, same output
- **Explainable** -- every decision traceable
- **Testable** -- AI generates validation suites alongside systems
- **Composable** -- modules snap together through shared semantics
- **Evolvable** -- AI regenerates and revalidates as requirements change

---

## How Agicore Evolves

Agicore does not evolve through centralized roadmap planning. It evolves through **operational pressure** — real applications stress the framework, gaps surface as structured feature requests, and framework sessions close those gaps across every layer (lexer, parser, codegen, tests) before returning to the application. The loop repeats.

This model exists because AI collapses the cost of implementing a well-specified primitive. What remains expensive — and what this model demands — is the discipline to specify gaps precisely rather than work around them silently.

The workflow:

1. **Build a real application** — treat it as a framework stress test, not a demo
2. **Detect friction** — missing primitives, repeated patterns, rejected syntax
3. **Write a structured feature request** — syntax proposal, expected output, which app needs it
4. **Open a framework session** — implement across lexer → types → parser → codegen → tests
5. **Return to the application** — now with the primitive it needs, expressed in the DSL

Phase 8 was triggered entirely by writing `benders_killer_app.agi`. Six gaps surfaced, were documented in a single feature request file, and were implemented in one session: `ACTION IMPL`, `ACTION PATTERN`, `PREFERENCE`, union output types, `ACTION EMIT`, and `ENTITY SINGLETON`. Parser gained 22 tests, compiler gained 35. One conversation.

See [EVOLVING.md](EVOLVING.md) for the full methodology, the feature request template, and why this approach wasn't practical before AI.

---

## Status — MVP Complete (May 2026)

**The full pipeline works end-to-end.** A single `.agi` file compiles to a running Tauri application. The reference app has been tested in production: API key entry, multi-provider streaming AI responses, conversation history, folder-based knowledge, tag management, and exchange library all work from generated code.

| Layer | Tests | Status |
|---|---|---|
| Parser | 763 passing | Complete |
| Compiler | 1,181 passing | Complete |
| Static Validator | 34 passing | Complete |
| **Total** | **1,978 passing** | **0 failures** |

The DSL covers 53 declaration types across 9 layers:

- **Application:** APP, ENTITY, ACTION, VIEW, AI_SERVICE, TEST, PREFERENCE
- **Orchestration:** WORKFLOW, PIPELINE, QC, VAULT, STAGES
- **Expert System:** RULE, FACT, STATE, PATTERN, SCORE, MODULE
- **Cooperative Intelligence:** ROUTER, SKILL, SKILLDOC, REASONER, TRIGGER, LIFECYCLE, BREED, COGNITION_ROLE, ESCALATION_CHAIN, QC_MESH
- **Semantic Infrastructure:** PACKET, AUTHORITY, CHANNEL, IDENTITY, FEED
- **Ambient Intelligence:** NODE, SENSOR, ZONE
- **Semantic Operating Environment:** SESSION, COMPILER
- **Adaptive Intelligence:** EVENT, NBVE, CONTRACT, REPUTATION, SUBSCRIPTION, DISPUTE
- **Deployment:** TARGET, AUTH, TENANT

**What the compiler generates from a single `.agi` file:**

- SQLite migration with all entity tables, indexes, timestamps, and seed rows
- Rust Tauri commands for full CRUD, relationships, and custom operations
- TypeScript invoke wrappers with correct signatures (auto-generated via specta)
- Zustand store with entity state, current-entity navigation, and AI model selection
- React components: list views, form modals, AI chat with streaming, model picker, API key modal
- Expert system runtime (RULE/FACT/STATE/PATTERN/SCORE) and orchestration engine (WORKFLOW/PIPELINE with BFS parallel execution and SPC sampling)
- ROUTER with multi-tier fallback and per-tier circuit breakers
- ESCALATION_CHAIN dynamic model escalation engine with SPC-triggered role promotion, stability-window de-escalation, and cooldown enforcement; NBVE CHAIN field wires shadow runners to chain engines
- COMPILER semantic transitions ("Send To" — save conversations to exchanges, folders, or documents)
- Tauri configuration, capabilities ACL, tray icon, global hotkey, system tray
- Static validation before generation: 12 semantic checks, errors abort, warnings continue

---

## Community & Resources

**Free training and community:** [TAO — Tactical AI Orchestration on Skool](https://www.skool.com/tao-tactical-ai-orchestration-4733)

**Tools and skill documents:** [Binary Blender](https://binary-blender.myshopify.com/)

See [COMMUNITY.md](COMMUNITY.md) for details.

---

## Contributing

This project is designed for human + AI collaborative exploration. Point Claude Code at this repo and ask it questions. Generate modules. Trace patterns. Synthesize systems.

If this direction resonates with you, open an issue or start a discussion. We are looking for people who think in systems, not just code.

---

## License

MIT. Open source helped build this ecosystem. Agicore contributes back.
