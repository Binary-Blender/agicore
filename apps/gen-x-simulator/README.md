# The Gen-X Layer Simulator

**A cognitive-substrate training environment built on Agicore.**

Companion application to *The Gen-X Layer: An Archaeology of AI's Cognitive
Substrate* (Synmatic, 2026 — Volume III of the CSE / Agicore / Gen-X Layer
trilogy).

The textbook argues that the cognitive patterns AI inherited from the
early-computing cohort were forged by the constraints of the environments
themselves. This system reconstructs those environments — strict,
period-correct, frustrating in exactly the ways the originals were
frustrating — and lets new minds run the same loops.

---

## What it is

A multi-platform 1980s-computing simulator. The user picks an era machine
— **Commodore 64**, Apple ][, IBM PC, Atari 800 — and works through a
library of type-in programming lessons drawn from period magazines.

The deterministic core is sacred: real BASIC dialects with real error
semantics, period-correct peripherals (cassette tapes that fail, modems
killed by incoming voice calls), and **lessons whose listings contain
real defects** the user has to find and correct, the way Gen-X kids
did in 1984.

The cultural-texture layer (forums, BBS sysops, magazine editorial voice)
is optionally LLM-augmented when an API key is configured. Without one,
the app runs entirely offline on canned cultural content.

The architectural split — **deterministic where determinism matters, AI
augmentation where authenticity benefits from variance** — is the
canonical demonstration of Agicore's mixed-fidelity application pattern.

---

## What playing it should feel like

You sit down. You pick "Commodore 64." A booting screen materializes:

```
    **** COMMODORE 64 BASIC V2 ****

 64K RAM SYSTEM  38911 BASIC BYTES FREE

READY.
█
```

You open the Magazine Rack. *COMPUTE!'s Gazette*, October 1984, page 47:
"TYPE THIS PROGRAM AND IT WILL DRAW A STARFIELD." You type the program
in. You hit RUN.

```
?SYNTAX ERROR IN 80
READY.
█
```

You re-read line 80. It looks right. You check the magazine. You re-check
line 80. Everything matches.

A small note at the bottom of the magazine: "Errata to last month's
issue, page 12, line 80 of the SPRITES.BAS listing: the second comma
should be a colon."

You go back. You fix line 80. You hit RUN.

The screen fills with stars.

You have just learned, through your hands, the skill the rest of the
training corpus describes only in the abstract: **how to find a fault
when the documentation is wrong.**

That is the simulator's only feature. Every lesson teaches one variation
of it.

---

## Why this is an Agicore showcase

The architecture maps directly onto Agicore's primitives:

| Primitive    | Role                                                           |
|--------------|----------------------------------------------------------------|
| `APP`        | Tauri window + platform target                                 |
| `ENTITY`     | Profile, Platform, Magazine, Lesson, Attempt, SkillState       |
| `MODULE`     | One per platform — Commodore64, AppleII, IBMPc, Atari800       |
| `PERIPHERAL` | Cross-platform deterministic hardware sims (tape, floppy, modem) |
| `SCORE`      | Progression metrics (debugging, persistence, peripheral fluency) |
| `PERSONA`    | LLM-driven cultural-texture personas (sysop, editor, flamer)   |
| `AI_SERVICE` | Optional — declared with `OPTIONAL true`; app runs without it  |

The whole system is expressed in one `.agi` file. The Tauri application
is generated from that file.

---

## Status

| Component                     | State                                     |
|-------------------------------|-------------------------------------------|
| `gen_x_simulator.agi`         | Complete — 280 lines                      |
| Commodore 64 platform module  | Vertical slice with one complete lesson   |
| Apple ][ platform module      | Honest stub — community contribution open |
| IBM PC platform module        | Honest stub                               |
| Atari 800 platform module     | Honest stub                               |
| BASIC v2 interpreter (subset) | Implemented (PRINT, INPUT, GOTO, IF/THEN, FOR/NEXT, LET, line numbers, integer math, string vars) |
| Magazine viewer               | Implemented                               |
| Tape/floppy/modem simulators  | Declared in `.agi`; tape implemented      |
| LLM cultural layer            | Deferred to v2; v1 uses canned content    |
| Lesson library — C64          | 1 lesson shipped; community-extensible    |

V2/v3 platforms and additional lessons are intentionally open contributions.
See `CONTRIBUTING_PLATFORMS.md` for the platform-implementation guide and
`content/c64/lessons/` for the lesson authoring format.

---

## Building

```bash
cd apps/gen-x-simulator
npm install
npm run tauri:dev    # development
npm run tauri:build  # production binary
```

---

## License

MIT. See `LICENSE` at the agicore repo root.
