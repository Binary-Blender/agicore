# `prompts/` — Planned (v2)

This directory will hold the curated system prompts and few-shot examples that drive
the forthcoming [`compiler/ai-compiler/`](../compiler/ai-compiler/) CLI — the
packaged "natural-language → `.agi`" authoring workflow.

## Planned contents

```
prompts/
├── system/
│   ├── author.md                 # Top-level system prompt: "You are an Agicore DSL author..."
│   ├── grammar-primer.md         # Compressed grammar with golden patterns
│   └── validation-repair.md      # System prompt for the error-repair loop
├── examples/
│   ├── crud-app.agi              # Canonical CRUD example
│   ├── ai-chat.agi               # Canonical AI chat example (slim version of novasyn-chat)
│   ├── expert-system.agi         # RULE/FACT/STATE/PATTERN/SCORE in concert
│   ├── orchestration.agi        # WORKFLOW/PIPELINE/REASONER/TRIGGER
│   └── embedded.agi              # NODE/SENSOR/ZONE/ACTUATOR
└── archetypes/
    ├── single-window-desktop.md
    ├── multi-tenant-web.md
    ├── creator-tool.md
    └── compliance-system.md
```

## Status: not yet implemented

Today, authoring an `.agi` file is done by reading [`dsl/grammar.md`](../dsl/grammar.md)
and [`docs/dsl-reference.md`](../docs/dsl-reference.md) with an AI coding assistant
open in the repo. That works — and produced every showcase in
[agicore-examples](https://github.com/Binary-Blender/agicore-examples).
But a packaged, prompt-driven CLI would lower the floor significantly.

See the sibling [`compiler/ai-compiler/README.md`](../compiler/ai-compiler/README.md)
for context on the broader plan.
