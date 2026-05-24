# Reality.AI: Legacy Electron → Agicore Tauri Port Plan

**Legacy app:** `novasyn_suite/reality_ai/` — Electron + Node.js + better-sqlite3
**Ported app:** `agicore/apps/reality-ai/` — Tauri 2 + Rust + SQLite, generated from `reality_ai.agi`
**Last updated:** 2026-05-24

---

## The Two-Layer Rule

Every feature in this port has two layers:

1. **`.agi` source** — declare it in `reality_ai.agi` first
2. **Implementation** — write or regenerate the Rust/TS/SQL the declaration implies

If a feature exists in the implementation but NOT in the `.agi` file, that's
**schema drift** — the `.agi` is no longer the source of truth.

---

## Legacy → DSL mapping

| Legacy component                          | DSL equivalent                                       |
|-------------------------------------------|------------------------------------------------------|
| `src/shared/types.ts` (Conversation/Message/Memory) | `ENTITY` declarations                       |
| `src/main/database/migrations/001_core.sql`         | Auto-generated from `ENTITY` declarations    |
| `src/main/services/elizaEngine.ts` (1,419 LOC)      | Baseline `PATTERN` declarations + revelation `STATE` |
| `src/main/services/conversationTree.ts` (3,479 LOC) | `send_message` ACTION + dispatch cascade specification |
| 15 themed engines (~9,000 LOC combined)             | 15 `MODULE` declarations                    |
| Per-engine state machine (`phase` enums)            | `STATE` declarations inside each `MODULE`    |
| Per-engine pattern matching                         | `PATTERN` declarations inside each `MODULE`  |
| Cultural-marker score arrays                        | `SCORE` declarations with `THRESHOLD`       |
| `GameStateInfo` interface                           | `ENTITY GameState`                          |
| `IPC_CHANNELS` constants                            | Auto-generated from `ACTION` declarations    |
| Renderer components                                 | `VIEW` declarations + manual React components |

---

## Sprint plan

### Sprint 1 — Foundation (current)
- [x] Inventory all 17 legacy engines (persona, phases, transitions, win paths)
- [x] Write `reality_ai.agi` — single source of truth
- [x] Scaffold `apps/reality-ai/` directory matching `apps/novasyn-chat/` layout
- [ ] Generate baseline Rust scaffold (`src-tauri/` from `APP` + `ENTITY` declarations)
- [ ] Generate SQL migration from `ENTITY` declarations
- [ ] Generate TypeScript types + Zustand store slices

### Sprint 2 — Baseline conversational substrate
- [ ] Implement baseline `PATTERN` dispatcher (Rust regex compilation, priority ordering)
- [ ] Port baseline response pools (business / creative / goals / meta / fallback) into
      `src-tauri/src/patterns/baseline/responses.rs`
- [ ] Implement `RevelationLayer` STATE executor with turn-count transitions
- [ ] Wire `send_message` ACTION end-to-end (user input → dispatch → response persistence)
- [ ] Smoke test: baseline conversation works without any persona module activation

### Sprint 3 — Cultural-marker scoring
- [ ] Implement SCORE executors (increment, threshold evaluation, marker dedup)
- [ ] Port the 14 marker keyword lists into `src-tauri/src/scoring/markers.rs`
- [ ] Wire marker detection into the `send_message` pipeline
- [ ] Verify activation thresholds fire correctly (unit tests per score)

### Sprint 4 — Persona module porting (5 modules per sprint)
- [ ] Sprint 4a: WarGames, Neuromancer, Jedi, BladeRunner, HAL9000
- [ ] Sprint 4b: Matrix, Tolkien, Terminator, Dungeon, Hitchhiker
- [ ] Sprint 4c: MontyPython, Portal, PrincessBride, StarTrek, Horoscope

For each module:
1. Generate the STATE executor with transitions
2. Generate the PATTERN matcher with priorities
3. Port the response templates into `src-tauri/src/personas/<module>/responses.rs`
4. Verify activation, full play-through, and win path

### Sprint 5 — Renderer
- [ ] Port `ChatView`, `ConversationList`, `Sidebar`, `StatsView`, `StartupSequence`, `MessageBubble`, `TypingIndicator`, `ToolCallBlock`
- [ ] Rewrite `VictoryScreen` for the Agicore-native experience
- [ ] Wire renderer to generated invoke wrappers
- [ ] Match legacy visual fidelity (dark theme, BIOS-style startup, typing indicator timing)

### Sprint 6 — Telemetry & QC
- [ ] Add `QC` declaration for response-pool selection quality
- [ ] Add `TELEMETRY` mode to ACTION declarations for dispatch tracing
- [ ] Match-audit log: which PATTERN fired, in which MODULE phase, with what score
- [ ] Verify reproducibility: same input sequence → same response sequence

### Sprint 7 — Packaging
- [ ] Tauri portable Windows binary
- [ ] macOS .dmg
- [ ] Linux AppImage
- [ ] Verify zero network calls in built binary (audit with `strace` / Process Monitor)
- [ ] Code-sign the Windows binary

---

## Non-goals

- **No LLM integration.** Reality.AI's central premise is fully deterministic operation. An `AI_SERVICE` declaration would defeat the experiment.
- **No telemetry phone-home.** Match-audit logs stay local.
- **No multi-user / sync.** Single-user local-first app.

---

## Open questions

- Should we expose the match-audit log to the UI as a researcher-mode side panel?
  (Useful for understanding why a particular response fired. Risk: spoils the experience for first-time users.)
- The horoscope module currently activates by input MATCHES rather than by score.
  Consider promoting "request-driven" as a first-class activation mode in the DSL grammar.
- Persona priority when multiple modules cross threshold on the same turn: currently
  first-match-wins (declaration order). Consider a `PRIORITY` field on MODULE.
