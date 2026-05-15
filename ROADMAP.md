# Agicore Roadmap

## Current Status — MVP Complete (May 2026)

**The full pipeline is proven end-to-end.** A single `.agi` file compiles to a running Tauri application. The reference app (NovaSyn Chat 2.0) runs in production with streaming AI, multi-provider support, conversation management, folder-based knowledge, and semantic state transitions — all from generated code.

| Milestone | Tests | Status |
|---|---|---|
| DSL Parser | 547 passing | Complete |
| Tauri Codegen | 606 passing | Complete |
| Static Validator | 20 passing | Complete |
| Reference App (NovaSyn Chat 2.0) | End-to-end verified | **MVP Complete** |
| **Total** | **1,173 passing, 0 failures** | |

---

## Phase 1: DSL Foundation — COMPLETE

**Goal:** A formal, parseable DSL grammar that can express everything the NovaSyn stack currently does manually.

Deliverables:
- [x] Formal grammar specification (`dsl/grammar.md`) — 34 declaration types across 7 layers
- [x] DSL parser (TypeScript, `.agi` files → AST) — 547 tests passing
- [x] 12 working example files
- [x] Static validator — 12 semantic checks, errors abort generation, warnings continue

DSL layers:
- **Application:** APP, ENTITY, ACTION, VIEW, AI_SERVICE, TEST
- **Orchestration:** WORKFLOW, PIPELINE, QC, VAULT
- **Expert System:** RULE, FACT, STATE, PATTERN, SCORE, MODULE
- **Cooperative Intelligence:** ROUTER, SKILL, SKILLDOC, REASONER, TRIGGER, LIFECYCLE, BREED
- **Semantic Infrastructure:** PACKET, AUTHORITY, CHANNEL, IDENTITY, FEED
- **Ambient Intelligence:** NODE, SENSOR, ZONE
- **Semantic Operating Environment:** SESSION, COMPILER

---

## Phase 2: Tauri Codegen — COMPLETE

**Goal:** A code generation backend that compiles DSL into working Tauri applications.

Deliverables:
- [x] SQL migration generator (tables, indexes, timestamps, seed rows)
- [x] Rust struct + Tauri command generator (full CRUD, BELONGS_TO push-down, WORKSPACES)
- [x] TypeScript type + invoke wrapper generator
- [x] Zustand store generator (entity state, CURRENT navigation, AI model selection)
- [x] React component generator (list, form, AI chat with streaming, ModelPicker, ApiKeyModal)
- [x] Expert system runtime (RULE/FACT/STATE/PATTERN/SCORE) — 652 lines
- [x] Orchestration runtime (WORKFLOW/PIPELINE with BFS parallel execution + SPC sampling) — 394 lines
- [x] ROUTER with multi-tier fallback and per-tier circuit breakers
- [x] COMPILER semantic transitions (chat→exchange, chat→folder, chat→document)
- [x] SKILL/SKILLDOC/VAULT/QC emitters
- [x] TEST emitter (Rust `#[cfg(test)]` integration tests)
- [x] Tauri config (ACL capabilities, frameless window, system tray, global hotkey)
- [x] CLI: `agicore generate <file.agi> --output <dir>`
- [x] Protected-file skip: `// @agicore-protected` header prevents regen overwrite

---

## Phase 3: Reference Build — COMPLETE

**Goal:** Build a real application using the DSL, proving the full pipeline works beyond toy examples.

Result: NovaSyn Chat 2.0 (`apps/novasyn-chat/`) — a multi-provider AI chat client generated from `novasyn_chat.agi` (~400 lines of DSL → 54+ generated files). End-to-end verified in production.

- [x] Complete `.agi` definition for a production application
- [x] Generated Tauri application — builds clean (`cargo build` + `tsc --noEmit`)
- [x] Streaming AI responses verified (Anthropic, OpenAI, Google, xAI)
- [x] API key management, model selection, conversation history
- [x] Folder-based knowledge, tag management, exchange library
- [x] Semantic state transitions ("Send To" compilers)
- [x] Framework bugs discovered during build → fixed in core (module naming, layout, permissions, initial view)

---

## Phase 4: Hardening and Expansion

**Goal:** Extend codegen coverage and eliminate remaining hand-written seams.

Remaining codegen gaps (things currently hand-extended in novasyn-chat):
- [ ] ACTION emitter — generate Rust AI dispatch from ACTION declarations
- [ ] VIEW LAYOUT `document_editor` — full document editor scaffold
- [ ] VIEW LAYOUT `settings` — settings panel with provider/key management
- [ ] WORKFLOW visual execution trace in UI
- [ ] Multi-window support from a single `.agi` file

Validator expansion:
- [ ] Cross-entity referential integrity (HAS_MANY ↔ BELONGS_TO symmetry check)
- [ ] WORKFLOW step action references must be declared ACTIONs
- [ ] COMPILER EXTRACT field cross-check against entity fields
- [ ] AI_SERVICE provider-model consistency (model declared for each provider)

Additional example applications:
- [ ] `home_academy.agi` — full port of NovaSyn Home Academy (23 entities, 5 views)
- [ ] `invoice_approval.agi` — expert system showcase (RULE/STATE/SCORE)
- [ ] `content_pipeline.agi` — orchestration showcase (PIPELINE/WORKFLOW/QC)

---

## Phase 5: Ecosystem Integration

**Goal:** Integrate cooperative intelligence primitives and enable module composition.

- [ ] REASONER runtime — periodic AI analysis loops with scheduled execution
- [ ] TRIGGER runtime — reactive event binding, debounce, rate limiting
- [ ] CHANNEL runtime — typed message passing between modules
- [ ] PACKET validation engine
- [ ] Cross-app module composition (`spawn compliance.workflow`)
- [ ] IDENTITY + FEED — creator-owned identity and semantic syndication
- [ ] Shared semantic memory (NS Vault evolution)

---

## Phase 6: Community and Ecosystem

**Goal:** Build an open ecosystem around the platform.

- [ ] Comprehensive documentation and tutorial series
- [ ] Additional compilation targets (web API, CLI tools, automation pipelines)
- [ ] Community-contributed modules and module registry
- [ ] Plugin architecture for custom codegen backends
- [ ] Integration guides for enterprise environments

---

## Non-Goals

These are explicitly out of scope:

- **Autonomous AI agents** — Agicore generates deterministic systems, not autonomous entities
- **Real-time AI decision-making** — AI operates at build time, not runtime
- **GUI builder / drag-and-drop** — the DSL is a language, not a visual tool
- **Model training or fine-tuning** — Agicore uses existing models as compilers
- **Cloud platform / SaaS** — this is infrastructure, not a hosted service
