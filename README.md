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
|-- START_HERE_WITH_AI.md      # AI-assisted exploration guide
|-- PHILOSOPHY.md              # Core architectural philosophy
|-- ROADMAP.md                 # Development roadmap
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

## Reference Application: NovaSyn Chat 2.0

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

## Status — MVP Complete (May 2026)

**The full pipeline works end-to-end.** A single `.agi` file compiles to a running Tauri application. The reference app has been tested in production: API key entry, multi-provider streaming AI responses, conversation history, folder-based knowledge, tag management, and exchange library all work from generated code.

| Layer | Tests | Status |
|---|---|---|
| Parser (547 tests) | 547 passing | Complete |
| Compiler (606 tests) | 606 passing | Complete |
| Static Validator (20 tests) | 20 passing | Complete |
| **Total** | **1,173 passing** | **0 failures** |

The DSL covers 34 declaration types across 7 layers:

- **Application:** APP, ENTITY, ACTION, VIEW, AI_SERVICE, TEST
- **Orchestration:** WORKFLOW, PIPELINE, QC, VAULT
- **Expert System:** RULE, FACT, STATE, PATTERN, SCORE, MODULE
- **Cooperative Intelligence:** ROUTER, SKILL, SKILLDOC, REASONER, TRIGGER, LIFECYCLE, BREED
- **Semantic Infrastructure:** PACKET, AUTHORITY, CHANNEL, IDENTITY, FEED
- **Ambient Intelligence:** NODE, SENSOR, ZONE
- **Semantic Operating Environment:** SESSION, COMPILER

**What the compiler generates from a single `.agi` file:**

- SQLite migration with all entity tables, indexes, timestamps, and seed rows
- Rust Tauri commands for full CRUD, relationships, and custom operations
- TypeScript invoke wrappers with correct signatures (auto-generated via specta)
- Zustand store with entity state, current-entity navigation, and AI model selection
- React components: list views, form modals, AI chat with streaming, model picker, API key modal
- Expert system runtime (RULE/FACT/STATE/PATTERN/SCORE) and orchestration engine (WORKFLOW/PIPELINE with BFS parallel execution and SPC sampling)
- ROUTER with multi-tier fallback and per-tier circuit breakers
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
