# Contributing to Agicore

Agicore is open to contributors. Read this short page before opening a PR.

---

## How Agicore evolves

The framework evolves through **operational pressure**: real applications stress it, gaps surface as feature requests, and framework sessions close those gaps across lexer → parser → codegen → tests before returning to the application.

A great contribution starts with **a real application that ran into a real limitation.** A great PR closes that limitation everywhere — not just at the call site that surfaced it.

See [`EVOLVING.md`](EVOLVING.md) for the full methodology and feature-request template.

---

## What does (and doesn't) belong in this repo

**Belongs:**
- New declaration types (with grammar + parser + codegen + validator + tests + dsl-reference entry)
- New compilation targets (web, CLI, library — see `TARGET` declaration)
- New `core/compiler/` emitters
- New static-validator checks
- Bug fixes in parser, compiler, or generated runtime
- Doc improvements that bring [`dsl/grammar.md`](dsl/grammar.md), [`docs/dsl-reference.md`](docs/dsl-reference.md), or [`docs/cookbook.md`](docs/cookbook.md) closer to truth
- Tightening the canary ([`apps/novasyn-chat/`](apps/novasyn-chat/))

**Belongs elsewhere:**
- Showcase applications → [agicore-examples](https://github.com/Binary-Blender/agicore-examples)
- The forthcoming NL→DSL authoring CLI → [`compiler/ai-compiler/`](compiler/ai-compiler/) (planned for v2)

---

## Development workflow

```bash
# Clone agicore AND agicore-examples as siblings.
# Some tests load fixture .agi files from agicore-examples; the relative
# paths assume the two repos sit side-by-side.
git clone https://github.com/Binary-Blender/agicore.git
git clone https://github.com/Binary-Blender/agicore-examples.git

cd agicore
npm install                # installs both workspaces via root package.json
npm test                   # runs parser + compiler + validator suites
npm run build              # tsc on both packages
```

If `agicore-examples` isn't a sibling directory, the test suites will fail fast with a message telling you where to clone it. Inline-DSL tests (the bulk of the 2,459-test suite) work without it; only the fixture-loading tests need the sibling.

To run a single package's tests:

```bash
npm run test:parser
npm run test:compiler
```

To compile a real `.agi` file end-to-end:

```bash
node core/compiler/dist/cli.js generate path/to/app.agi --output ./out
```

---

## Pull request rules

1. **Tests, full stop.** Parser and compiler each run 800-1,600+ tests. Add to that count when you add features; never lower it. Zero failures, always.
2. **Update the docs.** A new declaration without a [`docs/dsl-reference.md`](docs/dsl-reference.md) entry, a [`dsl/grammar.md`](dsl/grammar.md) entry, and (for user-facing patterns) a [`docs/cookbook.md`](docs/cookbook.md) recipe will be asked for revisions.
3. **Keep `tsc --noEmit` clean.** Run `npm run type-check`.
4. **Don't regenerate the canary in your PR.** It carries app-specific UX iteration. If your codegen change affects it, mention so in the PR description; we'll coordinate the regeneration commit separately.
5. **Commit messages should explain why.** The diff shows what.

---

## Branching

There are no long-lived branches. The maintainer commits directly to `main` for personal projects, and uses PRs from contributors. If you're an outside contributor, fork → PR. Squash merges preferred.

---

## Code style

- TypeScript strict mode, ES2022 target, Node 16 module resolution. Don't loosen.
- The parser and emitters use a hand-rolled recursive-descent style — no parser generators. New declarations follow the same pattern (see existing `parse${Decl}` functions for the template).
- Generated code (in compiler emitters) prefers explicit, boring Rust/TS over clever Rust/TS. We optimize for the user understanding `cargo build` errors.
- No emojis in code or comments unless you have a good reason.

---

## License

MIT. By contributing, you agree your contribution is licensed the same way.
