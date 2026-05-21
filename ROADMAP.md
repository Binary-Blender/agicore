# Agicore Roadmap

## Current Status — MVP Complete (May 2026)

**The full pipeline is proven end-to-end.** A single `.agi` file compiles to a running Tauri application. The reference app (NovaSyn Chat 2.0) runs in production with streaming AI, multi-provider support, conversation management, folder-based knowledge, and semantic state transitions — all from generated code.

| Milestone | Tests | Status |
|---|---|---|
| DSL Parser | 800 passing | Complete |
| Tauri Codegen | 1511 passing | Complete |
| Static Validator | 34 passing | Complete |
| Reference App (NovaSyn Chat 2.0) | End-to-end verified | **MVP Complete** |
| Phase 7 — Adaptive Intelligence Layer | 40 declaration types | Complete (7.1 + 7.2 + 7.3) |
| Phase 8.1 — Distributed Orchestration | 41 declaration types | Complete (MESH, NODE network fields, CHANNEL OVERFLOW_TO) |
| Phase 8.2 — EVENT-Driven Distributed Workflows | 41 declaration types | Complete (EVENT SUBSCRIBERS, CHANNEL FROM/TO_NODE, AUTHORITY GOVERNS) |
| **Total** | **2,385 passing, 0 failures** | |

---

## Phase 1: DSL Foundation — COMPLETE

**Goal:** A formal, parseable DSL grammar that can express everything the NovaSyn stack currently does manually.

Deliverables:
- [x] Formal grammar specification (`dsl/grammar.md`) — 34 declaration types across 7 layers
- [x] DSL parser (TypeScript, `.agi` files → AST) — 547 tests passing
- [x] 12 working example files
- [x] Static validator — 18 semantic checks, errors abort generation, warnings continue

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

Result: NovaSyn Chat 2.0 (`apps/novasyn-chat/`) — a multi-provider AI chat client generated from `novasyn_chat.agi` (~590 lines of DSL → 54+ generated files, 10-sprint port from 3G Electron to 4G Tauri complete).

- [x] Complete `.agi` definition for a production application
- [x] Generated Tauri application — builds clean (`cargo build` + `tsc --noEmit`)
- [x] Streaming AI responses verified (Anthropic, OpenAI, Google, xAI)
- [x] API key management with first-run onboarding screen
- [x] Model selection with visibility toggles and per-model context window overrides
- [x] Council mode — parallel multi-model responses with tab UI
- [x] Broadcast mode — one model per provider simultaneously
- [x] Response synthesis — merge council/broadcast alternatives via configurable model
- [x] Context window viewer — reconstruct exact AI context from store state
- [x] Conversation history with auto-prune when context window fills
- [x] Session search/filter, system prompt per session
- [x] Folder-based knowledge — upload .txt/.md/.epub/.csv/.rst files, inline edit, move, delete
- [x] Save chat session to folder as chat-export item
- [x] Tag management, exchange library, document editor
- [x] Semantic state transitions ("Send To" compilers)
- [x] ANSI color rendering in terminal (cargo/npm/git output)
- [x] Auto-update infrastructure (tauri-plugin-updater wired, endpoint configurable)
- [x] User preferences persisted to localStorage (model selection, hidden models, context overrides)
- [x] Framework enhancements identified: FE-1 through FE-5 (pending implementation in Agicore core)
- [x] Framework bugs discovered during build → fixed in core (module naming, layout, permissions, initial view)

---

## Phase 4: Hardening and Expansion

**Goal:** Extend codegen coverage and eliminate remaining hand-written seams.

Codegen gaps (completed):
- [x] ACTION emitter — Rust AI dispatch from ACTION declarations, pattern-based real bodies
- [x] VIEW LAYOUT `document_editor` — split list + editor panel scaffold
- [x] VIEW LAYOUT `settings` — API key management + about section
- [x] WORKFLOW visual execution trace in UI — step-by-step trace with AI-driven step execution
- [x] Session export as Markdown — browser Blob download, no extra Rust required
- [x] `/search` slash command — DuckDuckGo web context injection into AI prompt

Validator expansion (completed):
- [x] Cross-entity referential integrity (HAS_MANY ↔ BELONGS_TO symmetry — check 16)
- [x] WORKFLOW step action references must be declared ACTIONs (check 14)
- [x] COMPILER FROM/TO target cross-check against sessions and entities (check 17)
- [x] COMPILER EXTRACT field cross-check against FROM entity fields (check 18)
- [x] TRIGGER fires.target cross-check by kind (check 15)
- [x] AI_SERVICE model provider consistency (check 13)

- [x] Multi-window support — any view can be popped out into a native Tauri window via NavRail

**Phase 4 is complete.**

---

## Phase 5: Ecosystem Integration

**Goal:** Integrate cooperative intelligence primitives and enable module composition.

- [x] REASONER runtime — periodic AI analysis loops with scheduled execution
- [x] TRIGGER runtime — reactive event binding, debounce, rate limiting
- [x] CHANNEL runtime — typed message passing between modules
- [x] PACKET validation engine — typed payload validation, TTL, condition rules, rejection audit log
- [x] IDENTITY + FEED — creator-owned DID, deterministic signing, Atom 1.0 syndication
- [x] SESSION — semantic operating modes with persistent key-value memory per mode
- [x] MODULE — composable expert-system bundles with score-based runtime activation
- [x] AUTHORITY — trust governance layers for channels and packet signing chains
- [x] SEMANTIC MEMORY — shared cross-session intelligence store (Vault evolution)

**Phase 5 is complete. All 34 declaration types implemented. 1,382 tests passing.**

---

## Phase 6: Community and Ecosystem

**Goal:** Build an open ecosystem around the platform.

- [ ] Framework enhancements FE-1 through FE-5 (identified during NovaSyn Chat 2.0 port — see `apps/novasyn-chat/PORT_PLAN.md`)
- [ ] Comprehensive documentation and tutorial series
- [ ] Additional compilation targets (web API, CLI tools, automation pipelines)
- [ ] Community-contributed modules and module registry
- [ ] Plugin architecture for custom codegen backends
- [ ] Integration guides for enterprise environments

---

## Phase 7: Adaptive Intelligence Layer

**Goal:** Turn Agicore from a systems-authoring tool into a self-optimizing operational platform.

### Phase 7.1 — New Declaration Types (complete)

- [x] **EVENT** — named async pub/sub events; fills the gap between TRIGGER (direct fire) and CHANNEL (point-to-point routing); enables loosely-coupled distributed orchestration
- [x] **NBVE** — Non-Blocking Variant Evaluation; shadow-runs a smaller/cheaper AI model alongside production, governed by SPC thresholds; promotes automatically when quality meets the bar — the mechanism for progressive AI cost optimization without production risk
- [x] **CONTRACT** — machine-readable service agreements; PARTIES, TERMS, DELIVERABLES, PAYMENT, GOVERNANCE blocks; generates TypeScript schema + SQLite state machine; non-custodial (Agicore coordinates, external providers move money)

Total after Phase 7.1: **37 declaration types, ~1,500 tests passing.**

### Phase 7.2 — Commerce Layer (complete)

- [x] **REPUTATION** — SPC-driven trust scoring (METRICS/SPC/DECAY blocks); generates TypeScript metric interface + SPC config + lifecycle state type (new → maturing → mature)
- [x] **SUBSCRIPTION** — recurring creator support (PROVIDER/SUBSCRIBER/TERMS/PAYMENT); generates TypeScript record interface + config constant with typed perks array
- [x] **DISPUTE** — structured conflict resolution (CONTRACT ref, STATES, RESOLUTION blocks); generates state + resolution union types, record interface, and transition map state machine

**Total after Phase 7.2: 40 declaration types, 629 parser tests + 908 compiler tests passing.**

### Phase 7.3 — Codegen Completions (complete)

- [x] **EVENT** — Tauri event bus commands (`emit_event`, `get_event_registry`) + TypeScript typed `listen${Name}()` / `emit${Name}()` wrappers
- [x] **NBVE** — shadow runner class with SPC threshold checks (`isReadyForPromotion()`), `getActiveModel()` promotion logic, per-NBVE config `as const`
- [x] **CONTRACT** — SQLite lifecycle table (draft→pending_signature→signed→active→completed→cancelled→disputed) + Rust CRUD commands + TypeScript invoke wrappers
- [x] **REPUTATION** — SQLite `reputation_scores` table + TypeScript Tracker class with `addSample()` / `getState()` / `isEligibleForDecay()` + `parseHalfLife()` utility
- [x] **SUBSCRIPTION** — SQLite subscriptions table + Rust `create_subscription` / `list_subscriptions` / `cancel_subscription` + TypeScript config constants
- [x] **DISPUTE** — SQLite disputes table + Rust CRUD + TypeScript state machine (state/resolution union types, `${Name}Transitions` map)

**Total after Phase 7.3: 40 declaration types, 629 parser + 908 compiler = 1,537 tests passing.**

See `idea factory/NEXT_CAPABILITIES.md` for the full Phase 7 through Phase 10 roadmap.

---

## Non-Goals

These are explicitly out of scope:

- **Autonomous AI agents** — Agicore generates deterministic systems, not autonomous entities
- **Real-time AI decision-making** — AI operates at build time, not runtime
- **GUI builder / drag-and-drop** — the DSL is a language, not a visual tool
- **Model training or fine-tuning** — Agicore uses existing models as compilers
- **Cloud platform / SaaS** — this is infrastructure, not a hosted service
