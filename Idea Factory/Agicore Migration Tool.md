# Agicore Migration Tool

## Automatic backwards compatibility for `.agi` files

### The problem we are not solving by pinning

The conventional answer to "how do I keep yesterday's app working against tomorrow's framework" is **version pinning** — each `.agi` file declares the Agicore version it was authored against, and old apps require old framework installations to build. We considered this for `agicore-examples` and rejected it. Pinning loses on three axes:

- Every example becomes a museum exhibit. `agicore-examples/accelerando/billing/` would stay frozen at the Agicore version it shipped against, regardless of how much better the framework gets.
- New users hit installation friction. "This example wants Agicore 0.3, you have 0.5, please install 0.3 alongside" is the kind of paper cut that kills adoption.
- The maintainer of the example gets no signal when the framework breaks. The example silently rots.

We want the opposite property: **examples and apps should always compile against the latest Agicore, with the framework itself handling the upgrade automatically.**

This is the same pattern Rust solved with editions, Python with `2to3`, Go with `gofix`, JavaScript with codemods (jscodeshift). The pattern works because:

1. The language has a parseable AST — you don't regex source code, you transform syntax trees.
2. Breaking changes follow regular patterns — rename a keyword, add a required field, reorder arguments. These are mechanical transformations expressible as code.
3. The tool ships *with the framework that broke things* — so the framework's maintainers, who already understand the change, are the ones writing the migration.

Agicore is uniquely well-positioned for this approach. The parser already exists (`core/parser/src/parser.ts`), the AST is already typed (`core/parser/src/types.ts`), and the DSL is constrained enough that most breaking changes are syntactic. The same TypeScript that knows how to parse `.agi` files knows how to rewrite them.

---

## The proposal

A new Agicore CLI subcommand:

```bash
agicore migrate path/to/app.agi
```

What it does:

1. Reads the `.agi` file.
2. Looks for a top-of-file `AGICORE_VERSION "0.4.x"` declaration. If absent, prompts the author to declare one.
3. Walks the **migration registry** — an ordered list of versioned transformations shipped with the Agicore compiler — applying each migration from the file's declared version to current.
4. Writes the result back, **emitting a diff for review** rather than blindly overwriting. The author confirms or aborts.
5. On success, updates the `AGICORE_VERSION` declaration to current.

Run it in batch mode (`agicore migrate --recurse path/to/repo/`) and an entire showcase repo updates in one pass.

### What's NOT in this proposal

- **Automatic migration during `agicore compile`.** Silent source rewrites on every build are too scary for a first version. Migrations are an explicit opt-in. Maybe a later Agicore release adds a `compile --auto-migrate` flag once we trust the tool.
- **Migrating generated code.** The compiled output (Rust, React, SQL) regenerates from the source on every build. Migrations operate on `.agi` files only. Hand-edited generated files (everything not marked `// @agicore-protected`) are clobbered on regen anyway, which we already document.
- **Semantic migrations.** A change like "RULE evaluation order is now strictly priority-descending instead of declaration-order" can't be detected from syntax — the rules still parse fine. The migration tool surfaces a warning when entering a version that has semantic changes, points at release notes, and continues. Some breaking changes still require human attention.

---

## How a migration is authored

A migration is a TypeScript module in `core/compiler/src/migrations/`:

```ts
// core/compiler/src/migrations/0.5.0-rename-skill-to-skilldoc.ts
import { Migration } from './types';

export const migration: Migration = {
  from: '0.4.x',
  to:   '0.5.0',
  summary: 'SKILL declarations renamed to SKILLDOC for cognition pipeline alignment',
  releaseNotes: 'docs/CHANGELOG.md#050',

  // Operates on the parsed AST. The migration receives the typed
  // program and returns a transformed one.
  transform(program) {
    for (const decl of program.declarations) {
      if (decl.kind === 'SKILL') {
        decl.kind = 'SKILLDOC';
        // Rename any cross-references too — STATE_GRAPH triggers,
        // INVOKES targets, etc.
      }
    }
    return program;
  },

  // Validation: assert the transformed AST is parseable AND
  // semantically equivalent where that's checkable. The framework
  // provides helpers for the common assertions.
  verify(before, after) {
    return countDeclarations(after, 'SKILL') === 0
        && countDeclarations(after, 'SKILLDOC') === countDeclarations(before, 'SKILL');
  },
};
```

The registry is just `core/compiler/src/migrations/index.ts` — an ordered array. Adding a migration is one file + one line in the index.

### Tests for migrations

Each migration ships with golden-file tests:

```
core/compiler/src/migrations/__tests__/0.5.0-rename-skill-to-skilldoc/
├── input.agi      # Pre-migration source
└── expected.agi   # Post-migration source
```

The compiler's test suite runs every migration against its golden input and asserts byte-equality with `expected.agi`. A migration that doesn't round-trip cleanly fails CI before shipping.

---

## The version declaration

A new top-of-file declaration:

```agi
AGICORE_VERSION "0.5.0"

APP my_app {
  TITLE "My App"
  // ...
}
```

Semantics:

- **Required for `agicore migrate` to operate.** Without it, the tool prompts: "this file has no AGICORE_VERSION; assume current version? (y/n)".
- **Optional for `agicore compile`.** Compile against latest regardless. The version is purely about *upgrades*, not about which parser to use. We don't want to maintain multiple parsers.
- **Authoritative at write time.** When a new app is generated by `agicore new`, the CLI writes the current version. Authors don't have to think about it; it just appears.

This is similar to Rust's `edition = "2021"` in `Cargo.toml`. The declaration is small and inert until you need it.

---

## The first migration

Even before anything actually breaks, ship a no-op migration as part of the tool:

```ts
// 0.0.0 → 1.0.0: declare AGICORE_VERSION at top of file
```

This bootstrap migration adds the `AGICORE_VERSION` declaration to existing files that don't have one. Run `agicore migrate --recurse` on `agicore-examples` and every app picks up a version stamp without any other change. From that point forward, every meaningful migration ratchets the version.

This also forces the conversation about what the "current Agicore version" is — turning the implicit "whatever main is at" into an explicit number. Good hygiene independent of the migration tool itself.

---

## CLI ergonomics

```bash
# Single file
agicore migrate path/to/app.agi

# Recursive
agicore migrate --recurse path/to/repo/

# Dry run — show the diff, don't write
agicore migrate --dry-run path/to/app.agi

# Show what migrations would be applied without running them
agicore migrate --plan path/to/app.agi

# Force the from-version (when AGICORE_VERSION is wrong or missing)
agicore migrate --from 0.3.0 path/to/app.agi

# After upgrading, show release notes for everything skipped due to
# semantic-only changes that the tool couldn't migrate
agicore migrate --notes path/to/app.agi
```

Default behavior is interactive: shows the diff, asks for confirmation, writes on `y`. `--yes` skips the prompt for scripting. Failed migrations leave the file untouched and exit non-zero.

---

## What this unlocks for `agicore-examples`

A CI workflow in the examples repo, runnable on every push:

```yaml
- run: agicore migrate --recurse --dry-run examples/
  # If anything would change, fail — the example needs to be migrated.
```

Better yet, a periodic job that runs `agicore migrate --recurse --yes examples/` on a fresh PR branch and opens an automated PR titled "Migrate examples to Agicore X.Y.Z". The maintainer reviews the diff, confirms semantic-change warnings, merges. Showcase repos stay current with negligible human effort.

The same workflow extends to the `agicore` repo itself for `apps/novasyn-chat/` — when the framework changes, the canary auto-migrates and the diff makes it obvious whether the framework change broke anything user-visible in the reference app.

---

## What this doesn't solve, honestly

- **Semantic changes.** Already noted. The tool warns; humans still do the work.
- **Generated-code-shaped expectations.** If a downstream consumer hard-codes "the generated Rust file has function `foo_handler`" and Agicore renames the generator output to `handle_foo`, the migration tool doesn't help. That's a downstream-of-codegen problem, not a `.agi` problem.
- **Multi-version skips with stacked semantic changes.** Going from 0.3 → 0.7 might apply four syntactic migrations cleanly while accumulating four semantic warnings. The author sees a clean diff but the program no longer behaves the way it did. The right answer is "warn loudly, link release notes, and slow migrations down for any major version with semantic changes" — but the floor is still human judgment.

---

## Where this fits in the Agicore roadmap

This is a one- or two-sprint project, not a roadmap pivot. Concrete scope:

**Sprint A:** Migration runtime + the bootstrap "add AGICORE_VERSION" migration. CLI surface (`migrate`, `--dry-run`, `--plan`, `--recurse`). Tests. Doc: `MIGRATIONS.md` in the main repo.

**Sprint B:** Backfill migrations for whatever the most recent breaking change was (likely SKILL → SKILLDOC if that already happened, or something similar). Then a CI workflow in `agicore-examples` that runs the migration in dry-run mode on every push. Open the first auto-PR.

After that the discipline is "every breaking change ships with a migration." That's a small additional cost per platform release (write the codemod, write its golden test) in exchange for showcase apps that stay current forever.

---

## Decision points to resolve before starting

1. **`AGICORE_VERSION` syntax.** Top-of-file declaration, or magic comment (`// agicore-version: 0.5.0`), or block field on `APP`? Recommend the declaration form for consistency with the rest of the DSL.
2. **Version range semantics.** Does `0.4.x` match `0.4.99`? Does it match `0.5.0`? Semver or its own scheme? Recommend strict semver, with `x` matching minor and patch.
3. **Migration ordering when multiple versions stack.** Apply in declaration order in the index file, or topologically by `from`/`to`? Recommend topological — protects against misordered registry entries.
4. **What happens to `.agi` files in the main `agicore` repo's own test corpus?** The migration tool should be runnable against them but probably shouldn't be required to leave them current — they exist to test the parser, including against intentionally-old syntax. Probably exclude `core/parser/__tests__/` from `--recurse` by default.

None of these are blockers. They're the kind of small choices that get made in the first week of the sprint.

---

## TL;DR

Don't pin examples to old Agicore versions. Ship a migration tool with the framework. When you break something, write a small TypeScript codemod that fixes existing `.agi` files. Run it on showcase repos automatically.

This is the same pattern Rust, Python, Go, and JavaScript have all converged on for ecosystem upgrades. Agicore's parseable AST and TypeScript-native compiler make it a natural fit. The first version is one sprint of work; the ongoing cost is one codemod per breaking change.

The alternative — pinning — is what every framework that *failed* at backwards compatibility did.
