# @agicore/compiler

[![Tests](https://img.shields.io/badge/tests-1%2C616%20passing-brightgreen)](../../README.md)
[![Declarations](https://img.shields.io/badge/declarations-58-blue)](../../dsl/grammar.md)
[![License](https://img.shields.io/badge/license-MIT-green)](../../LICENSE)

The Agicore DSL compiler — turns a `.agi` AST into a complete Tauri application: Rust commands, TypeScript types, Zustand store, React components, SQLite migrations, Tauri config, and an integration test suite.

Depends on [`@agicore/parser`](../parser/). 1,582 codegen tests + 34 validator tests, zero failures.

## Install

```bash
npm install -g @agicore/compiler
```

Or use without install via npx:

```bash
npx @agicore/compiler generate path/to/app.agi --output ./out
```

## CLI

```bash
agicore generate <file.agi> [--output <dir>]   # compile to a Tauri project
agicore parse    <file.agi>                     # print the AST as JSON
agicore --help
```

The generated project builds with `cargo build` + `tsc --noEmit`. If both pass, it works.

## Programmatic

```ts
import { compile } from '@agicore/compiler';

const { files, diagnostics } = compile(agiSource);
// files: Map<string, string>   — relative path → file content
// diagnostics: Diagnostic[]    — warnings + errors from the validator
```

## What it generates

From a single `.agi` file:

- **Rust** — `src-tauri/src/commands/*.rs` with full CRUD, AI dispatch, ROUTER fallback, REASONER scheduler, TRIGGER dispatcher, CHANNEL message bus, PACKET validation, AUTHORITY enforcement
- **TypeScript** — typed `invoke` wrappers (via specta), Zustand store, React component scaffolds, model picker, API-key modal, settings panel
- **SQLite** — initial migration with all entity tables, indexes, timestamps, seed rows, packet log, channel queue, reasoner runs, trigger log, mesh accounting
- **Tauri config** — capabilities ACL, frameless window, system tray, global hotkey, single-instance, auto-updater wiring
- **Tests** — Rust `#[cfg(test)]` integration tests from every `TEST` declaration
- **Validation** — 34 static checks before codegen; errors abort, warnings continue

## Codegen safety

- Files marked with `// @agicore-protected` on the first line are NEVER overwritten on regeneration. Drop in for hand-written extensions the DSL doesn't yet cover.
- Generated runtime never calls an LLM directly — model invocations are mediated by typed Rust commands that read keys from the encrypted `VAULT`.
- Background tasks use `tauri::async_runtime::spawn` (safe in every Tauri context), never raw `tokio::spawn`.

## Testing

```bash
npm test    # 1,616 tests, 0 failures
```

## License

MIT. See [`LICENSE`](../../LICENSE).
