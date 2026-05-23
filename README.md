# Agicore

**A deterministic systems-authoring platform for AI-native organizations.**

Agicore separates AI intelligence from runtime execution. AI handles interpretation, planning, and generation. Deterministic runtimes handle execution, validation, and reliability. The boundary between them is a DSL.

```
Human Intent
    |
Author (human, often pair-programming with an AI assistant)
    |
Agicore DSL (.agi file — the constraint boundary)
    |
Agicore Compiler (deterministic codegen)
    |
Generated Tauri Application (Rust + TypeScript + SQLite)
    |
Validated, Reproducible System
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
|-- dsl/                       # Formal grammar specification (grammar.md)
|-- core/                      # The compiler toolchain (TypeScript)
|   |-- parser/                # .agi -> AST (843 tests)
|   +-- compiler/              # AST -> Tauri project + static validator (1,610 tests)
|
|-- history/                   # Evolutionary lineage (1G -> 4G)
|   |-- 1g-coding-standards/
|   |-- 2g-web-stack/
|   |-- 3g-novasyn/
|   |-- promptcore/
|   +-- agicore-foundation/
|
|-- apps/                      # Reference applications living in-repo
|   +-- novasyn-chat/          # Canary: multi-provider AI chat client
|-- docs/                      # Tutorial, getting-started, DSL reference, cookbook, case studies
|-- skills/                    # Skill docs for AI assistants (Baby Step + Super Skill Doc)
|-- Idea Factory/              # In-flight feature proposals + sprint aftermath notes
+-- LICENSE                    # MIT
```

> Showcase apps (Accelerando suite, pattern demos, additional reference apps) live in the separate [agicore-examples](https://github.com/Binary-Blender/agicore-examples) repository so platform releases stay focused on the canary.

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

### The Accelerando Stack — Eighteen `.agi` Files, One Enterprise Platform

```
// ── Enterprise Core ───────────────────────────────────────────────────────
accelerando_erp.agi              →  ERP/CRM web service              (Axum + React + PostgreSQL)
accelerando_billing.agi          →  Medical billing engine            (Axum + React, self-updating rules)
accelerando_legal.agi            →  eDiscovery + legal hygiene        (Axum + React, 6 connectors)
accelerando_lms.agi              →  Compliance training LMS           (Axum + React, daily micro-assessment)
accelerando_pi_coe.agi           →  Process improvement CoE           (Axum + React, TPS/Six Sigma/anti-backslide)
accelerando_qms.agi              →  Quality management system         (Axum + React, ISO 9001:2015)
accelerando_oie.agi              →  Intelligence layer                (Tauri desktop, AI reasoning)
accelerando_es.agi               →  Governance layer                  (Tauri desktop, deterministic rules)
accelerando_chatbot.agi          →  Customer service chatbot          (Axum + React, web)
accelerando_eliza.agi            →  Operator interface                (Tauri desktop, macro executor)
accelerando_config.agi           →  Self-configuration advisor        (Tauri desktop, configuration ES)
accelerando_interchange.agi      →  Standard interchange layer        (Axum web service)

// ── EMR / Healthcare Stack ────────────────────────────────────────────────
accelerando_scheduling.agi       →  Patient scheduling engine         (Axum + React, PORT 3008)
accelerando_clinical.agi         →  Clinical documentation + CDS      (Axum + React, PORT 3009)
accelerando_radiology.agi        →  RIS + DICOM + peer review         (Axum + React, PORT 3010)
accelerando_pharmacy.agi         →  E-prescribing + PDMP + formulary  (Axum + React, PORT 3011)
accelerando_population_health.agi →  Care gaps + risk + HEDIS/MIPS   (Axum + React, PORT 3012)
accelerando_patient_portal.agi   →  Patient self-service portal       (Axum + React, PORT 3013)
```

> **Sources moved.** Each app's `.agi` source has been migrated to the [agicore-examples](https://github.com/Binary-Blender/agicore-examples) repo under `accelerando/`. The per-app deep-dive narratives — entity catalogs, MODULE breakdowns, design rationale — live in [`ACCELERANDO.md`](./ACCELERANDO.md) here in the main repo (it's the architectural document for what the suite proves about Agicore). This README keeps just the bird's-eye summary.

The eighteen apps cluster into two arcs:

**Enterprise Core (12 apps)** — ERP/CRM with a self-updating billing engine, legal hygiene, compliance LMS, process improvement and quality systems, deterministic governance and intelligence layers, a chatbot that cannot hallucinate, a macro-executing operator interface, a configuration advisor, and an industry-wire-format interchange layer.

**EMR / Healthcare Stack (6 apps)** — Scheduling, clinical documentation with drug-and-allergy safety at order entry, radiology with critical-finding tracking, pharmacy with PDMP enforcement, population health with care-gap closure, and a patient portal that integrates the whole clinical stack.

For per-app architectural detail (entity catalogs, state machines, integration topology, the rule sets that make each domain deterministic), read [`ACCELERANDO.md`](./ACCELERANDO.md). For the `.agi` source you'd run, clone [agicore-examples](https://github.com/Binary-Blender/agicore-examples).


---

The eighteen apps are coherent: **Interchange** receives external messages and translates industry wire formats → **Billing** processes claims against payer rules that self-update from denial patterns → **Legal** governs all data under hold and scans for liability-creating language → **LMS** ensures every employee's knowledge is current and proven → **QMS** captures every nonconformance and drives it to root cause → **PI CoE** eliminates systemic problems permanently and enforces improvement sustainability → **Config** advisor configures the ERP for each organization → **ERP** stores business data across the full enterprise → **ES** enforces internal governance policy → **Chatbot** serves customers deterministically → **Eliza** executes operator workflows → **OIE** surfaces intelligence across all telemetry streams → **Scheduling** manages the full patient access lifecycle → **Clinical** documents care and enforces drug and allergy safety at order entry → **Radiology** tracks every critical finding communication and every dose → **Pharmacy** enforces PDMP compliance and formulary rules at dispense → **Population Health** finds the patients who haven't called and surfaces them before the ER does → **Patient Portal** gives patients access to their own health on terms the care team controls. Every action in every layer is auditable. Nothing trusts an LLM at runtime.

See the README in each app directory for architecture details, rule rationale, and integration topology.

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

## Skill Docs — Teach an AI to use Agicore in one file

The [`skills/`](skills/) directory ships packaged skill documents that turn any AI assistant into a competent practitioner — for both **authoring** the DSL and for **deploying** the Accelerando enterprise stack.

**For authoring `.agi` files (mechanical self-check — parser verifies output):**

- [**`agicore.baby.skill.md`**](skills/agicore.baby.skill.md) — ~7.5k tokens. Fits any small open-source model. Maximum semantic density: anti-patterns, error→fix table, 5 worked examples that all parse and compile. Use when you want a 7B-class model to produce valid `.agi`.
- [**`agicore.super.skill.md`**](skills/agicore.super.skill.md) — ~18k tokens. For frontier models (Claude Code, Cursor). All 58 declarations with full syntax, 14 verified recipes, anti-pattern catalog, edge cases, 12 self-check prompts.

**For deploying the Accelerando manufacturing stack (rubric self-check — checklist verifies output):**

- [**`accelerando.manufacturing.baby.skill.md`**](skills/accelerando.manufacturing.baby.skill.md) — ~8.3k tokens. Catalog of all 12 Enterprise Core apps in manufacturing context. The "Acme Machining" 18-month deployment walked end-to-end. 10 anti-patterns from real ERP failures (Hershey, FoxMeyer, HP, Lidl) with corrective mitigations. 5 rubric self-checks.
- [**`accelerando.manufacturing.super.skill.md`**](skills/accelerando.manufacturing.super.skill.md) — ~25k tokens. Full deployment playbook. 5 industry archetypes (greenfield, legacy replacement, multi-plant, M&A, customer-pressure rescue). Per-app deployment guidance with configuration decisions, integration patterns, common configurations per archetype, gotchas. KPI framework. Change-management playbook. 20 anti-patterns. 10 rubric self-checks.

All four follow the [Skill Doc format spec](skills/SKILL_FORMAT.md) (v1.1) — a portable convention for packaging "teach an AI to do this domain well" as a single Markdown file with YAML frontmatter. The format supports two self-check modes: **mechanical** (Agicore-style: parser verifies the output structurally) and **rubric** (Accelerando-style: checklist verifies substantively). Both modes are valid; the format isn't Agicore-specific — any domain (Tauri ACL, Rust ownership, k8s, SQL injection prevention, ERP deployment consulting) can ship its own Baby Step and Super Skill Doc using the same shape.

**To use a skill doc:** attach it as a system prompt or a file in your AI coding/consulting session. The doc tells the model what to do, what anti-patterns to avoid, and how to self-verify — either against a parser (Agicore) or against a structured rubric (Accelerando).

---

## Status — v1.0 (May 2026)

**The full pipeline works end-to-end.** A single `.agi` file compiles to a running Tauri application. The canary app (NovaSyn Chat 2.0) compiles cleanly and runs in production: API key entry, multi-provider streaming AI responses, conversation history, folder-based knowledge, tag management, and exchange library all work from generated code.

| Layer | Tests | Status |
|---|---|---|
| Parser | 843 passing | Complete |
| Compiler | 1,576 passing | Complete |
| Static Validator | 34 passing | Complete |
| **Total** | **2,453 passing** | **0 failures** |

The DSL covers **58 declaration types across 10 layers**:

- **Application** (7): APP, ENTITY, ACTION, VIEW, AI_SERVICE, TEST, PREFERENCE
- **Orchestration** (5): WORKFLOW, PIPELINE, QC, VAULT, STAGES
- **Expert System** (6): RULE, FACT, STATE, PATTERN, SCORE, MODULE
- **Cooperative Intelligence** (10): ROUTER, SKILL, SKILLDOC, REASONER, TRIGGER, LIFECYCLE, BREED, COGNITION_ROLE, ESCALATION_CHAIN, QC_MESH
- **Semantic Infrastructure** (5): PACKET, AUTHORITY, CHANNEL, IDENTITY, FEED
- **Adaptive Intelligence** (6): EVENT, NBVE, CONTRACT, REPUTATION, SUBSCRIPTION, DISPUTE
- **Semantic Operating Environment** (2): SESSION, COMPILER
- **Ambient + Embedded** (8): NODE, SENSOR, ZONE, MESH, ACTUATOR, PLATFORM, NULLCLAW, BRAIN_BODY
- **Deployment** (3): TARGET, AUTH, TENANT
- **Primitives** (6): MACRO, MACRO_REGISTRY, LOG, THEME, SEED, TYPE

See [`dsl/grammar.md`](dsl/grammar.md) for the formal grammar and [`docs/dsl-reference.md`](docs/dsl-reference.md) for the quick reference.

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
