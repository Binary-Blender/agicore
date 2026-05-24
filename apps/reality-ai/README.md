# Reality.AI

**Deterministic conversational reasoning system. Zero network. Zero inference. Fully reproducible.**

Reality.AI is a flagship Agicore reference application exploring a research
question: *how much of what we perceive as conversational intelligence can be
reproduced from a fixed corpus of patterns, scores, and state transitions —
fully auditable, fully reproducible, fully offline?*

The runtime requires no LLM, no API keys, and no network access. Every
response is produced by deterministic pattern matching, scored cultural-marker
activation, and phase-gated finite state machines composed across fifteen
specialized behavioral cores ("persona modules").

The entire system is expressed in a single 489-line `.agi` file. The Tauri
application is generated from that file.

---

## Architecture

Reality.AI is built on Agicore's expert-system primitives:

| Primitive    | Role in Reality.AI                                                |
|--------------|-------------------------------------------------------------------|
| `ENTITY`     | Conversation, Message, Memory, GameState — schema-first persistence |
| `STATE`      | Revelation-layer state machine (baseline → degradation → revelation) |
| `SCORE`      | Fourteen cultural-marker scores with activation thresholds         |
| `PATTERN`    | Baseline conversational substrate (intent classification + response selection) |
| `MODULE`     | Fifteen composable persona modules with phase-gated dispatch       |
| `ACTION`     | `send_message` — the dispatch pipeline; `reset_conversation`; `get_stats` |
| `VIEW`       | UI scaffolding for chat, conversation list, stats, victory, startup |
| `TEST`       | Lifecycle, persistence, scoring, layer transitions, win paths      |

### The dispatch cascade

When a user sends a message, the system runs a fixed priority cascade:

1. **Post-win check** — if `GameState.has_won == true`, route to epilogue.
2. **Active-module interception** — if any persona module is currently active,
   route input exclusively to that module's pattern + state machine.
3. **Module-permission evaluation** — for each persona module whose
   activation score has crossed threshold this turn, run the activation
   guard and dispatch the first match.
4. **Baseline patterns** — fall through to the always-on conversational
   substrate (business / creative / goals / meta / fallback).
5. **Layer transition check** — turn-count gated; advances the global
   revelation layer and updates response-pool selection downstream.

Module activation is monotonic: a persona module activates at most once per
conversation. Only one module can be active at a time. This guarantees a
clean, bounded conversational arc per session.

### The revelation-layer state machine

The system models its own self-representation across three layers. Layer
transitions are turn-count gated and produce measurable shifts in response
selection pools, lexical density, and dispatch latency:

| Layer        | Turn range | Dispatch latency | Response pool                       |
|--------------|------------|------------------|-------------------------------------|
| baseline     | 1–3        | 800 ms           | Rich, specific, context-anchored    |
| degradation  | 4–8        | 400 ms           | Shorter, more generic               |
| revelation   | 9+         | 200 ms           | Meta-acknowledging, terse           |
| post_win     | after win  | 100 ms           | Epilogue mode                       |

### Cultural-marker activation scoring

Each persona module is associated with a named score that accumulates when
the user emits domain-specific lexical markers (genre vocabulary, canon
references, named characters). At score ≥ 2, the corresponding module is
permitted to activate. Each unique marker scores at most once per
conversation (deduplicated to prevent gaming).

For example, the **WarGames** persona module activates on `gen_x_score >= 2`,
which accumulates on inputs containing markers like `rad`, `gnarly`, `tubular`,
`bodacious`, `psych`, `as if`, etc.

---

## Why no LLM?

This is the central design constraint of Reality.AI and the question it asks
of the field. By prohibiting itself from invoking an LLM at runtime, the
system produces a body of evidence that:

- **Reproducibility** — every response is deterministic for a given input
  sequence and game state. No sampling, no temperature, no drift.
- **Auditability** — every response can be traced back to a single
  `PATTERN` declaration and the state in which it fired.
- **Latency** — dispatch latency is bounded by the size of the pattern
  index, not by network round-trips.
- **Offline operation** — the application runs in environments with no
  network access (air-gapped systems, secure facilities, low-connectivity
  deployments).
- **Cost** — zero per-conversation inference cost.

The Agicore framework supports `AI_SERVICE` declarations for applications
that do require LLM-mediated responses. Reality.AI demonstrates the opposite
end of the spectrum: a fully deterministic conversational system where the
DSL is the entire intelligence surface.

---

## Building

```bash
# From the agicore repo root, regenerate the app from the .agi source:
agicore build apps/reality-ai

# Then, from this directory:
cd apps/reality-ai
npm install
npm run tauri dev    # development
npm run tauri build  # production binary
```

The Tauri shell, SQL migrations, Rust commands, TypeScript types, Zustand
store, and React components are all generated from `reality_ai.agi`. Pattern
libraries (the textual response templates) live alongside the generated
code in `src-tauri/src/personas/<module_name>/responses.rs`.

---

## Project layout

```
apps/reality-ai/
├── reality_ai.agi           # The source of truth. Read this first.
├── README.md                # You are here.
├── PORT_PLAN.md             # Migration log: legacy Electron → Tauri.
├── package.json             # Renderer dependencies.
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.js
├── postcss.config.js
├── index.html
├── src/                     # Renderer (React + Zustand).
│   ├── main.tsx
│   ├── components/
│   └── store/
└── src-tauri/               # Generated Rust + Tauri runtime.
    ├── Cargo.toml
    ├── tauri.conf.json
    ├── src/
    │   ├── main.rs
    │   ├── db/
    │   ├── personas/        # One subdirectory per MODULE declaration.
    │   └── dispatch.rs      # Generated from the cascade specification.
    └── migrations/
```

---

## License

MIT. See `LICENSE` at the agicore repo root.
