# Start Here With AI

This repository is designed for **human + AI collaborative comprehension**.

You are encouraged to point an AI coding agent (Claude Code, Cursor, etc.) at this repo and explore it together. The architecture is deep enough that AI synthesis reveals patterns that linear reading misses.

---

## How to Explore

Clone the repo, open it in your terminal, and start asking questions.

### Understand the Philosophy

```
"Read PHILOSOPHY.md and README.md. Explain the core architecture in your own words."
```

```
"What is the relationship between AI and determinism in this system?"
```

```
"How does the TPS/manufacturing influence show up in the architecture?"
```

### Trace the Evolution

```
"Read through history/ in order (1G -> 4G). How did each generation solve a different problem?"
```

```
"Read the PromptCore materials. How did they predict the current architecture?"
```

```
"Compare the 3G NovaSyn IPC bridge pattern to what the 4G DSL generates. What disappeared?"
```

### Explore the DSL

```
"Read dsl/grammar.md and docs/dsl-reference.md. Write an Agicore DSL definition for a simple CRM application."
```

```
"Clone https://github.com/Binary-Blender/agicore-examples and pick any showcase file. Extend it with a new entity and workflow."
```

```
"What would a DSL definition look like for a compliance review system?"
```

### Go Deeper

```
"Explain the Agicore orchestration runtime architecture."
```

```
"How would you add a new compilation target (e.g., web API instead of desktop app)?"
```

```
"Design an expert system module using the RULE/WHEN/THEN DSL primitives."
```

```
"Generate a deterministic workflow module using existing patterns."
```

---

## What You Will Find

### /dsl
The formal grammar specification for the Agicore DSL (`grammar.md`). This is the constraint boundary — the language that sits between probabilistic AI generation and deterministic system execution.

### /core
The compiler toolchain. `core/parser/` turns `.agi` files into an AST (843 tests). `core/compiler/` turns the AST into a complete Tauri project — Rust commands, TypeScript types, Zustand store, React components, SQLite migrations, Tauri config — plus the static validator (1,576 + 34 tests).

### /history
The evolutionary lineage of the architecture. Four generations of AI-native development, from coding standards to platform to systems language. Includes PromptCore (the orchestration language that predicted this architecture before it was fully understood) and the foundational Agicore concept documents.

### /apps/novasyn-chat
The canary application — a real multi-provider AI chat client generated from `novasyn_chat.agi`. Used as a regression test for the framework itself: if a framework change breaks the canary, the framework change is wrong.

### /docs
Tutorial, getting-started guide, DSL reference, cookbook, and a literary case-study (Meridian).

### Where does the AI live?
The Agicore *runtime* never calls an LLM. AI participates as a **build-time author**, typically a human pair-programming with an AI assistant (Claude Code, Cursor, etc.) to write the `.agi` source. The compiler itself is fully deterministic. A future `compiler/ai-compiler/` package will package the "natural-language → DSL" workflow as a CLI; today that workflow is "open Claude Code in this repo and ask."

---

## The Key Insight

Most AI repositories are designed for humans to read sequentially.

This one is designed for **AI to synthesize semantically**.

The architectural patterns are consistent across hundreds of files. The naming conventions are deliberate. The layering is intentional. An AI agent pointed at this repo can understand the system deeply enough to generate new modules, trace design decisions, and extend the architecture.

That is not an accident. It is the central thesis of the project:

> AI is most powerful when operating within structured, constrained, semantically rich environments.

This repository is both the proof and the product of that thesis.

---

## What This Is Not

- It is not a tutorial. There is no hand-holding walkthrough.
- It is not minimal. The architecture has real depth.
- It is not finished. This is a living system under active development.

If you want something simple, this is not the project for you.

If you want something deep -- point your AI at it and start exploring.
