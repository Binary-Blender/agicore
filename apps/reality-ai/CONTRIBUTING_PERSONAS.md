# Adding a Persona Module to Reality.AI

Reality.AI ships with fifteen declared persona modules. One —
**WarGames** — is fully implemented as the reference; the other fourteen are
declared in `reality_ai.agi` and scaffolded as stubs awaiting Rust
implementations. They're stubs on purpose: this is the community on-ramp.

If you want to add **your favorite sci-fi book, film, or game** as a
persona, this is the file to read. The whole loop should take a couple of
hours for a simple persona, and the result is a complete addition to a real
shipping app.

---

## What a persona module is

A *persona module* is a self-contained conversational arc. It is gated by
a domain-specific lexical score (the user's vocabulary triggers it), and
once active, it intercepts all dispatch until it reaches a terminal state.

Every persona has four things:

1. **A name** — PascalCase, used as the registry key. E.g. `Dune`.
2. **A cultural-marker score** — a SCORE entry holding lexical triggers.
3. **A state machine** — phases with conditional transitions.
4. **A win condition** — the input pattern that marks the arc complete and
   sets the player's escape method label.

---

## The five-step recipe

### 1. Choose a fandom + a thesis

Pick a source. Then decide what *insight* the persona is trying to convey.
The shipped personas each carry one:

| Persona       | Insight                                                    |
|---------------|------------------------------------------------------------|
| WarGames      | The only winning move in a zero-sum optimization is to not play |
| Jedi          | The Force is intentional tool use vs. lazy generation       |
| Blade Runner  | The human/machine classification matters less than what you make |
| Terminator    | AI failure modes: no oversight, no values, no observability |
| Matrix        | Perception is constructed; freedom is in seeing the system  |

What's *your* insight? `Dune` could be about the perils of prescience.
`Foundation` about long-arc planning under epistemic limits. `Snow Crash`
about language as a vector. Pick one. Write it down.

### 2. Add the cultural-marker score

In `reality_ai.agi`, add a `SCORE` declaration:

```
SCORE dune_score {
  INITIAL   0
  MAX       20
  THRESHOLD interested AT 2 THEN permit_dune_activation
}
```

In `src-tauri/src/scoring.rs`, add to `MARKER_TABLES`:

```rust
MarkerTable {
    score_name: "dune_score",
    markers: &["spice", "muad'dib", "fremen", "arrakis", "kwisatz haderach",
               "bene gesserit", "sandworm", "the spice must flow"],
},
```

These are the words a user would say to trigger your persona. Aim for 6–10
distinctive markers. Avoid generic words (`time`, `space`, `sand`) that
would cause false positives.

### 3. Declare the persona MODULE in `.agi`

```
MODULE Dune {
  DESCRIPTION  "Prescience-and-power arc triggered by Dune-canon markers."
  ACTIVATE_WHEN   dune_score >= 2
  DEACTIVATE_WHEN dune_complete == true

  STATE dune_phase {
    INITIAL prophecy
    prophecy  { ON_ENTER send_paul_vision           TRANSITION desert  WHEN affirmative_received }
    desert    { TRANSITION fremen   WHEN input MATCHES /survive|adapt|water|stillsuit/i }
    fremen    { TRANSITION test     WHEN any_substantive_response }
    test      { TRANSITION victory  WHEN input MATCHES /refuse|reject|let it pass/i }
    victory   { ON_ENTER assert_win { method: "Kwisatz Haderach — Saw The Path" }
                TRANSITION post_win WHEN any_response }
    post_win  { ON_ENTER show_epilogue }
  }
}
```

### 4. Implement the Rust state machine

Copy `src-tauri/src/personas/wargames.rs` to `src-tauri/src/personas/dune.rs`
and adapt:

- Change `NAME`, `STATE_KEY`, `WIN_METHOD`
- Change `activation_score()` to return your score name
- Rewrite the `match phase.as_str()` arm with your phases and responses
- Set `state.has_won = true` and push the module name to `completed_modules`
  when the user reaches your terminal phase

The signature you implement:

```rust
impl Persona for Dune {
    fn name(&self) -> &'static str { "Dune" }
    fn activation_score(&self) -> &'static str { "dune_score" }
    fn process(&self, input: &str, state: &mut GameState) -> PersonaResponse { /* ... */ }
}
```

### 5. Register the persona

Two lines in `src-tauri/src/personas/mod.rs`:

```rust
pub mod dune;
// ...
Box::new(dune::Dune),  // <-- in all_personas()
```

Remove the corresponding stub from `personas/stubs.rs`.

That's it. Run `npm run tauri:dev`, say a few Dune-canon words, watch your
persona activate.

---

## Style guidelines

- **Response text in monospace-friendly format.** Many persona responses
  read better when formatted as if the persona is "typing" — ALL CAPS for
  computer voices (WarGames, HAL), short paragraphs for cinematic ones.
- **3–8 phases per persona.** Fewer and the arc feels thin; more and the
  player loses the thread.
- **One thematic insight per persona.** If you can't summarize the lesson
  in one sentence, the persona is too diffuse.
- **The win is earned, not given.** Make the terminal-phase input pattern
  specific enough that the user has to think to land it. Don't auto-pass.
- **Stay in character throughout.** Reality.AI's overall reveal happens in
  `VictoryScreen.tsx`. Individual persona responses should never break
  character to wink about being pattern-matched.

---

## Testing your persona

Manual playthrough:

```bash
cd apps/reality-ai
npm install
npm run tauri:dev
```

Start a new conversation. Type one of your markers. Then another. The
moment the second marker is detected, your persona should activate.
Play through the full arc. Hit the terminal phase. The VictoryScreen
should fire with your `win_method` label.

If you want to write a `TEST` block in `reality_ai.agi`, follow the
existing examples:

```
TEST dune_win_path {
  GIVEN Conversation { title: "Test" }
  EXPECT module Dune complete -> game_state.has_won == true
  EXPECT module Dune complete -> game_state.win_method == "Kwisatz Haderach — Saw The Path"
}
```

---

## Submitting

1. Fork [`Binary-Blender/agicore`](https://github.com/Binary-Blender/agicore).
2. Branch: `personas/<your-persona>`.
3. Commit format: `feat(reality-ai/personas): <Name> <one-line thesis>`.
4. PR description: one paragraph on the insight, one on the arc.

We're particularly interested in personas that explore:

- AI safety / alignment thought experiments (anything in the Asimov,
  Watts, Egan, Lem space)
- Decision-under-uncertainty frames (Foundation, Hyperion, Ender's Game)
- Embodiment / consciousness puzzles (Ghost in the Shell, Annihilation,
  Solaris)
- Game-theoretic conflicts (Three-Body Problem, Diplomacy, Risk)

But honestly: pick whatever you love. Reality.AI is meant to be a
multi-author garden of conversational arcs. The more voices the better.

---

## Why the framework matters

Every persona you add is a working demonstration of a single principle:
**a complete behavioral system can be expressed as declarations + a
deterministic state machine, without invoking a single LLM call.**

You're not training a model. You're not writing prompts. You're not paying
per-token inference. You're declaring a system, and the system runs.

That's Agicore. Reality.AI is the proof.
