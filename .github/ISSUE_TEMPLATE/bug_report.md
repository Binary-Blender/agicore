---
name: Bug report
about: A reproducible defect in the parser, compiler, validator, or generated code
title: "[bug] "
labels: bug
---

## What happened

<!-- One-sentence description of the bug. -->

## Minimal reproduction

The smallest `.agi` snippet that triggers the bug. Trim everything that isn't load-bearing.

```agicore
APP repro { TITLE "Repro" DB repro.db }

// ...the minimum that fails
```

## Expected behavior

What you expected the compiler / parser / runtime to do.

## Actual behavior

What it actually did. Include the exact error message + line number if there is one.

## Environment

- `@agicore/compiler` version:
- Node.js version (`node --version`):
- OS:
- For Tauri runtime issues: Rust version (`rustc --version`), Tauri version

## Logs / output

```
<paste stack traces, generated-code excerpts, or test output here>
```

## Already tried

- [ ] I ran `npm test` in both `core/parser/` and `core/compiler/` and all tests pass
- [ ] I searched existing issues for this bug
- [ ] I read [`dsl/grammar.md`](../../dsl/grammar.md) and [`docs/dsl-reference.md`](../../docs/dsl-reference.md) for the declaration involved
