# Agicore Roadmap

## Current Status

**Phase 1 and Phase 2 are complete.** The DSL grammar covers 21 declaration types across 4 layers. The parser (253 tests) and compiler (161 tests) are working. 5 example files compile to complete Tauri projects with expert system and orchestration runtimes.

---

## Phase 1: DSL Foundation -- COMPLETE

**Goal:** A formal, parseable DSL grammar that can express everything the NovaSyn stack currently does manually.

Deliverables:
- [x] Formal grammar specification (`dsl/grammar.md`) -- 21 declaration types
- [x] DSL parser (TypeScript, `.agi` files -> AST) -- 253 tests passing
- [x] Example DSL files -- 5 working examples
- [ ] Static validator (conflict detection, type checking, missing references)

The DSL covers 21 declarations across 4 layers:
- **Application:** APP, ENTITY, ACTION, VIEW, AI_SERVICE, TEST
- **Orchestration:** WORKFLOW, PIPELINE, QC, VAULT
- **Expert System:** RULE, FACT, STATE, PATTERN, SCORE, MODULE
- **Cooperative Intelligence:** ROUTER, SKILL, LIFECYCLE, BREED

---

## Phase 2: Tauri Codegen -- COMPLETE

**Goal:** A code generation backend that compiles DSL into working Tauri applications.

Deliverables:
- [x] SQL migration generator
- [x] Rust struct + Tauri command generator
- [x] TypeScript type + invoke wrapper generator
- [x] Zustand store slice generator
- [x] React component scaffold generator
- [x] Tauri configuration generator
- [x] Expert system runtime generator (652 lines)
- [x] Orchestration runtime generator with SPC (394 lines)
- [x] CLI tool: `agicore generate <file.agi>`

---

## Phase 3: Reference Build

**Goal:** Port one real NovaSyn application from Electron to Tauri using the DSL, proving the full pipeline works.

Target: NovaSyn Home Academy (23 tables, 5 completed sprints, representative complexity).

Deliverables:
- [ ] `home_academy.agi` -- complete DSL definition
- [ ] Generated Tauri application
- [ ] Generated test suite (passing)
- [ ] Side-by-side comparison: manual 3G vs generated 4G
- [ ] Documentation of what the DSL eliminated

Success criteria: the generated app builds, runs, and passes all tests without manual code modifications.

---

## Phase 4: Expert Systems Layer

**Goal:** Extend the DSL to support deterministic expert system generation alongside application development.

New DSL primitives:
- `RULE` / `WHEN` / `THEN` -- condition-action rules
- `STATE` / `TRANSITION` -- state machines
- `WORKFLOW` / `STEP` -- multi-stage orchestration
- `SCORE` / `TRUST_LEVEL` -- confidence scoring
- `CONSTRAINT` -- boundary enforcement

Deliverables:
- [ ] Extended grammar specification
- [ ] Expert system runtime engine
- [ ] AI-generated rule sets with validation
- [ ] Test framework for deterministic rule execution
- [ ] Example: invoice approval expert system
- [ ] Example: eligibility determination engine

---

## Phase 5: Orchestration Kernel

**Goal:** Extract and generalize the orchestration patterns from NovaSyn into a reusable kernel.

Capabilities:
- Workflow execution graphs
- Dependency resolution
- Parallel execution
- Event orchestration
- Execution lineage
- Cross-module coordination

Source material: NovaSyn Orchestrator, Council meeting pipelines, Writer workflows.

---

## Phase 6: Ecosystem Integration

**Goal:** Integrate BabyAI cooperative intelligence and enable module composition.

Deliverables:
- [ ] BabyAI router integration
- [ ] Skill document system
- [ ] Module spawning (`spawn compliance.workflow`)
- [ ] Shared semantic memory (NS Vault evolution)
- [ ] Cross-app macro system (evolved from NovaSyn macros)
- [ ] Module marketplace / registry

---

## Phase 7: Community and Ecosystem

**Goal:** Build an open ecosystem around the platform.

Activities:
- [ ] Comprehensive documentation
- [ ] Tutorial series
- [ ] Additional compilation targets (web API, CLI tools, automation pipelines)
- [ ] Community-contributed modules
- [ ] Plugin architecture for custom codegen backends
- [ ] Integration guides for enterprise environments

---

## Non-Goals

These are explicitly out of scope:

- **Autonomous AI agents** -- Agicore generates deterministic systems, not autonomous entities
- **Real-time AI decision-making** -- AI operates at build time, not runtime
- **GUI builder / drag-and-drop** -- the DSL is a language, not a visual tool
- **Model training or fine-tuning** -- Agicore uses existing models as compilers
- **Cloud platform / SaaS** -- this is infrastructure, not a hosted service
