# `compiler/ai-compiler/` — Planned (v2)

This directory is reserved for a forthcoming **natural-language → `.agi`** authoring CLI.

## Status: not yet implemented

In v1.0, the "AI compiler" workflow is a human pair-programming with a coding assistant
(Claude Code, Cursor, etc.) to write `.agi` source by hand. That works well — the
canary application and every showcase in [agicore-examples](https://github.com/Binary-Blender/agicore-examples)
was authored this way.

What's missing is a **packaged** version of that workflow:

- A CLI (`agicore author <intent.md> --output app.agi`) that takes a written intent
  document and a target declaration set, calls a Claude API endpoint with a curated
  system prompt + grammar excerpt + relevant examples, and emits a candidate `.agi`.
- A repair loop that re-prompts on parser errors with the validator's diagnostics
  attached, so the AI iterates against ground truth instead of guessing.
- A library of prompt templates per app archetype (CRUD, AI chat, expert system,
  orchestration pipeline, embedded device) — these will live in
  [`prompts/`](../../prompts/).

## Why not yet?

The compiler toolchain (`core/parser/` + `core/compiler/`) had to land first.
Without a stable grammar, an AI authoring CLI has no target. With v1.0 the grammar
is stable (58 declarations, 2,453 tests passing) — so this package becomes
worth building.

## Tracking

See [`Idea Factory/`](../../Idea%20Factory/) for design notes related to this
package. Contributions welcome; open an issue first to align on the prompt
architecture.
