# Getting Started with Agicore

Agicore is a deterministic systems-authoring platform for AI-native organizations. You describe your application in a `.agi` file — a declarative DSL covering entities, actions, views, AI services, and rules. The compiler generates a complete Tauri desktop application: SQL migrations, Rust commands, TypeScript types, Zustand stores, React components, and test suites.

The core principle: **AI is never trusted at runtime.** AI participates at build time — interpreting intent, generating code. The runtime output is constrained by the DSL, validated by a test suite, and executed deterministically. The stack is Tauri (Rust + WebView), SQLite, React, Zustand, and TypeScript, compiled to a single binary desktop app.

---

## Prerequisites

Before you start, make sure you have:

- **Rust + Cargo** via [rustup](https://rustup.rs/)
- **Node.js 18+** and npm or pnpm
- **Tauri CLI** — `cargo install tauri-cli`
- **Git**

To verify your environment:

```bash
rustc --version
node --version
cargo tauri --version
```

---

## Installation

### Clone and install

```bash
git clone https://github.com/Binary-Blender/agicore.git
cd agicore
npm install
```

### Build the compiler

```bash
cd core/compiler
npm install
npm run build
cd ../..
```

### Verify the CLI

```bash
node core/compiler/dist/cli.js --help
```

Expected output:

```
Usage: agicore generate <file.agi> --output <dir>

Options:
  --output, -o  Output directory for generated files
  --help        Show help
```

If that prints, you're ready.

---

## Your First .agi File

Create a file called `task_manager.agi` in your working directory:

```
APP task_manager {
  TITLE "Task Manager"
  WINDOW 1000x700 frameless
  DB tasks.db
}

ENTITY Task {
  title:       string
  description: string
  done:        bool = false
  created_at:  datetime
}

ACTION summarize_tasks {
  INPUT  status: string
  OUTPUT summary: string
  AI     "Summarize the {{status}} tasks in one paragraph. Be concise and actionable."
}

AI_SERVICE claude {
  MODEL claude-haiku-4-5-20251001
  PROVIDER anthropic
}

VIEW TaskList {
  ENTITY Task
  LAYOUT table
  ACTIONS create, edit, delete
}

VIEW TaskForm {
  ENTITY Task
  LAYOUT form
}

TEST task_crud {
  GIVEN Task { title: "Buy groceries", description: "Milk, eggs, bread" }
  EXPECT create -> id IS NOT NULL
  EXPECT get_by_id -> title == "Buy groceries"
  EXPECT update -> done == true
  EXPECT delete -> NOT FOUND
}
```

Walk through what each block does:

- `APP` — application name, window dimensions, and the SQLite database file
- `ENTITY` — a data model; the compiler generates a SQL table, a Rust struct, and a TypeScript type from this single declaration
- `ACTION` — a callable operation; when tagged with `AI`, it calls the named AI service at runtime using the prompt template
- `AI_SERVICE` — declares which model and provider handle AI actions
- `VIEW` — a UI page; `LAYOUT table` produces a sortable, filterable list with inline actions
- `TEST` — integration tests that run against a real SQLite instance; declared here, generated as Rust test functions

---

## Compiling

```bash
node core/compiler/dist/cli.js generate task_manager.agi --output ./my-task-app
```

The compiler runs the following pipeline:

1. **Parse** — converts the `.agi` source to an AST
2. **Validate** — checks semantic correctness (undefined references, type mismatches, missing required fields) before any code is written
3. **Generate** — each generator emits one concern independently

Generated output structure:

```
my-task-app/
  migrations/             SQL schema and migration files
  src-tauri/src/          Rust command handlers
  src-tauri/tauri.conf.json
  src/types/              TypeScript type definitions
  src/stores/             Zustand state stores
  src/components/         React components
  src/views/              Assembled view pages
  src/                    App shell, router, AI service client
  tests/                  Rust integration test suite
```

If validation fails, the compiler exits with a structured error pointing to the offending declaration. No partial output is written.

---

## Running the Generated App

```bash
cd my-task-app
npm install
cargo tauri dev
```

The app opens as a native desktop window with:

- A task list view with sortable columns and create/edit/delete actions
- A form for creating and editing tasks
- An AI action that summarizes filtered tasks using Claude

For the `summarize_tasks` action to call the API, set your Anthropic API key:

```bash
export ANTHROPIC_API_KEY=sk-ant-...
```

---

## Running the Tests

```bash
cd my-task-app
cargo test
```

All `TEST` blocks from the `.agi` file are generated as Rust integration tests. They spin up an in-memory SQLite database, run the declared operations, and assert the expected outcomes. No mocking, no fixtures to maintain — the test suite is derived directly from the schema.

---

## What Just Happened

The `.agi` file is the single source of truth. Nothing in the generated output is written by hand — it is emitted entirely from the DSL declarations.

The pipeline has a clear separation of concerns:

- The **parser** is responsible only for syntax — it produces an AST or fails with a parse error
- The **validator** is responsible only for semantics — it checks that references resolve, types are consistent, and required blocks are present
- Each **generator** is responsible only for its output layer — SQL knows nothing about React; Rust knows nothing about Zustand
- Two compilers verify the result: `cargo build` checks the Rust output and `tsc --noEmit` checks the TypeScript output

If both compilers pass, the generated application is structurally sound. The DSL acts as a constraint boundary — you cannot express undefined behavior in it, so the compiler cannot generate it.

---

## The Protected File Pattern

Any generated file that begins with:

```
// @agicore-protected
```

will not be overwritten on subsequent regeneration. This is how you extend generated code without losing changes when you update the `.agi` file.

The workflow is: generate, mark the files you have customized as protected, then regenerate freely as the schema evolves. Non-protected files are always regenerated from the current `.agi` source.

---

## Next Steps

- [`docs/tutorial.md`](tutorial.md) — build a more complete application step by step, including relationships between entities, routing, and multi-model AI services
- [`docs/dsl-reference.md`](dsl-reference.md) — complete reference for every DSL declaration, field, and modifier
- [`docs/cookbook.md`](cookbook.md) — common patterns with copy-paste examples (authentication, file handling, background jobs, custom views)
- [`examples/`](../examples/) — 14 working `.agi` files covering a range of application types
