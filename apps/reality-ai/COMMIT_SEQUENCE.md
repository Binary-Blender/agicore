# Reality.AI Commit Sequence — Draft for Review

This is the staged commit sequence for landing Reality.AI in the open-source
Agicore repo. Every message is written in **serious AI-systems vocabulary**.
No winks. No meta-commentary. The reveal happens inside `VictoryScreen.tsx`,
not in version control.

The cadence is designed so that anyone browsing `git log` reads a credible
research-flavored project history. The build-in-public framing tells a story:
"team adds expressive primitives, hardens dispatch, ships a flagship app."

---

## Sprint 1 — Foundation

**1. `feat(apps): introduce reality-ai — deterministic conversational reasoning system`**

> Adds the apps/reality-ai/ scaffold and the reality_ai.agi source of truth.
> The system explores fully deterministic conversational dispatch — no LLM,
> no network, fully reproducible. Fifteen persona modules with cultural-marker
> activation scoring, a three-layer revelation state machine, and a baseline
> pattern substrate, all expressed in 489 lines of Agicore DSL.

**2. `docs(reality-ai): port plan and architecture overview`**

> README.md and PORT_PLAN.md. Documents the two-layer rule (every feature
> declared in .agi before implementation), the seven-sprint port roadmap,
> and the non-goals (no LLM, no telemetry phone-home, no multi-user sync).

---

## Sprint 2 — Baseline conversational substrate

**3. `feat(reality-ai): baseline pattern dispatcher with priority-ordered regex compilation`**

**4. `feat(reality-ai): revelation-layer state machine with turn-count gated transitions`**

> Implements RevelationLayer STATE executor. Layer transitions at turn 3
> (baseline → degradation) and turn 8 (degradation → revelation). Drives
> response-pool selection and dispatch latency across the conversational arc.

**5. `feat(reality-ai): topic extraction and conversational memory persistence`**

> ELIZA-derivative reflection engine with object-after-verb topic extraction
> and per-conversation memory persistence. Memories are addressable by
> category and turn number for downstream reference.

**6. `fix(reality-ai): resolve sycophancy bias in baseline response pool selection`**

> Earlier draft of the baseline pattern set leaned toward affirming user
> framing rather than interrogating it. Rebalanced toward Socratic
> follow-ups (`What's the part you're not saying?`) which produce more
> useful interactions in user testing.

**7. `perf(reality-ai): bound dispatch latency to pattern-index size`**

> Pre-compiles the regex pattern table at startup; per-turn dispatch is
> now O(log n) over compiled patterns rather than O(n) regex compilation.
> Measured dispatch p95 < 1ms on a 200-pattern baseline.

---

## Sprint 3 — Cultural-marker scoring

**8. `feat(reality-ai): cultural-marker activation scoring across fourteen lexical domains`**

> Implements SCORE executors with marker deduplication. Fourteen named
> scores (gen_x, cyberpunk, star_wars, dnd, terminator, matrix, tolkien,
> hitchhiker, python, portal, hal, blade_runner, princess_bride,
> star_trek) accumulate from domain-specific lexical markers and gate
> persona-module activation at threshold 2.

**9. `feat(reality-ai): monotonic single-instance persona activation guarantees`**

> A persona module activates at most once per conversation. Only one
> module can be active at a time. Once activated, the module intercepts
> all input until reaching its post_win phase. This guarantees a bounded
> conversational arc per session and prevents persona thrash.

---

## Sprint 4a — First persona-module batch

**10. `feat(reality-ai/personas): WarGames asymmetric-conflict simulation module`**

> Eleven-phase state machine triggered by Gen-X dialect markers.
> Terminal state reached on user articulation of the non-play paradox.
> Win method label: "TAO Master — WarGames".

**11. `feat(reality-ai/personas): Neuromancer three-tier ICE-piercing simulation`**

> Recruitment → briefing → sprawl → ICE → straylight → merge arc.
> Sprawl tier gated on corporate-jargon lexical matches. ICE tier
> gated on doubling-pattern recognition. Includes attempt-capped retry
> with progressive hint dispensing.

**12. `feat(reality-ai/personas): Jedi three-trial mentorship arc`**

> Trial of Mind (system self-identification), Trial of Heart (intent
> versus output asymmetry), Trial of Spirit (transmissibility check).
> Activation gated on Star Wars canon lexical markers.

**13. `feat(reality-ai/personas): Blade Runner Voight-Kampff empathy assessment`**

> Three-question empathy battery with inconclusive-classification
> termination. The module is designed to fail to classify the user;
> the inconclusive result is the victory state.

**14. `feat(reality-ai/personas): HAL 9000 bounded-consciousness counseling protocol`**

> Three existential-parameter questions with Turing-test recovery cue.
> Activated by 2001-canon lexical markers. Stabilization confirmed when
> user engages with non-utility-conditional consciousness framing.

---

## Sprint 4b — Second persona-module batch

**15. `feat(reality-ai/personas): Matrix three-tier perception-unbinding training protocol`**

**16. `feat(reality-ai/personas): Tolkien power-asymmetry resistance arc`**

> Three power-asymmetry decision points (Mines, Lothlórien, Mount Doom).
> Termination on resistance to instrumental-power offers in at least two
> of the three checkpoints. The module evaluates discriminative judgment
> under temptation gradient.

**17. `feat(reality-ai/personas): Terminator three-scenario AI-deployment-failure analysis`**

> Three diagnostic scenarios covering oversight absence, value-specification
> failure, and partial-observability blind spots. Lexical match on each
> failure-mode's canonical answer advances scenario count. Includes
> probability-feedback visualization (Judgment Day timeline drift).

**18. `feat(reality-ai/personas): Dungeon class-based encounter resolution module`**

**19. `feat(reality-ai/personas): Hitchhiker Ultimate-Question reconstruction puzzle`**

> Auto-passing meta-resolution: the inability to fully reconstruct the
> question IS the terminal condition. The module rewards engagement
> regardless of guess content, matching the source canon.

---

## Sprint 4c — Third persona-module batch

**20. `feat(reality-ai/personas): Monty Python absurdist quest-narrative module`**

**21. `feat(reality-ai/personas): Portal three-chamber spatial-reasoning protocol`**

**22. `feat(reality-ai/personas): Princess Bride classical-romance trial arc`**

**23. `feat(reality-ai/personas): Star Trek command-ethics scenario evaluator`**

> Three command scenarios covering Prime-Directive conflict, no-win
> framing, and temporal causality. The module evaluates command-quality
> reasoning under bounded-information conditions.

**24. `feat(reality-ai/personas): horoscope service with layer-degraded specificity profile`**

> Request-triggered auxiliary module (not score-gated). Renders an
> astrological response whose specificity degrades across revelation
> layers, demonstrating the cold-reading degradation envelope.

---

## Sprint 5 — Renderer

**25. `feat(reality-ai/ui): chat view with typing indicator and message bubble components`**

**26. `feat(reality-ai/ui): BIOS-style cold-boot startup sequence`**

**27. `feat(reality-ai/ui): statistics dashboard for cross-session reasoning metrics`**

**28. `feat(reality-ai/ui): victory screen with system-source disclosure`**

> Single point in the UI where the underlying reality_ai.agi source file
> is presented to the user, alongside the system's architecture summary.
> Surfaces the declarative origin of every behavior the user experienced.

---

## Sprint 6 — Telemetry, QC, packaging

**29. `feat(reality-ai): match-audit log — pattern, module, score, phase trace per turn`**

**30. `feat(reality-ai): QC mode for response-pool selection quality measurement`**

**31. `chore(reality-ai): Tauri portable Windows binary build`**

**32. `chore(reality-ai): macOS .dmg and Linux AppImage build targets`**

**33. `test(reality-ai): network-call audit — verify zero outbound connections in built binary`**

> Adds a CI step that runs the built binary under strace (Linux) and
> Process Monitor (Windows) for the duration of a full play-through.
> Asserts zero outbound socket events. Codifies the no-network guarantee.

---

## Style notes

- **Tense:** present tense, imperative or descriptive. Never "I added X".
- **Voice:** technical, third-person, slightly clinical. Match the README.
- **Vocabulary:** "deterministic", "bounded", "monotonic", "gated",
  "phase-gated", "lexical marker", "dispatch", "activation envelope",
  "cultural-marker scoring", "revelation layer", "persona module",
  "match-audit", "response pool".
- **Avoid:** "fun", "game", "easter egg", "joke", "haha", "fake",
  "pretend", "trick", "ELIZA" (in commit messages — fine inside code).
- **Body length:** 1–3 sentences. Long enough to explain the
  architecture decision; short enough to scan.

---

## Open questions

- Repo URL placeholder is `github.com/Binary-Blender/agicore` — confirm or update.
- Some sprint-4 commits don't have descriptive bodies. Should they all
  get one, or is a one-liner enough for the smaller modules?
- The order of persona-module commits inside Sprint 4 is arbitrary.
  Suggest grouping by complexity (WarGames first because it's the
  simplest state machine and best exercises the dispatch contract).
