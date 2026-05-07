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
"Read dsl/grammar.md. Write an Agicore DSL definition for a simple CRM application."
```

```
"Take the invoice-approval example and extend it with a new entity and workflow."
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
The formal grammar specification for the Agicore DSL. This is the constraint boundary -- the language that sits between probabilistic AI generation and deterministic system execution.

### /core
The parser, validator, runtime engine, and test runner. These take DSL definitions and produce working, verified systems.

### /compiler
The AI compiler layer. Takes natural language intent and generates valid DSL. This is where AI creativity is useful -- but its output is constrained by the DSL grammar and validated before execution.

### /history
The evolutionary lineage of the architecture. Four generations of AI-native development, from coding standards to platform to systems language. Includes PromptCore (the orchestration language that predicted this architecture before it was fully understood) and the foundational Agicore concept documents.

### /examples
Working examples that demonstrate the full pipeline: intent -> DSL -> compiled system -> passing tests.

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
