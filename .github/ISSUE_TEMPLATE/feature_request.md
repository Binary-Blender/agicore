---
name: Feature request
about: A proposal for a new DSL primitive or framework capability
title: "[feature] "
labels: enhancement
---

## What problem are you trying to solve?

Describe the real application or use case. **Agicore evolves from operational pressure** (see [`EVOLVING.md`](../../EVOLVING.md)) — feature requests grounded in a concrete app stress are far more likely to land.

## Proposed syntax

Sketch the DSL surface you wish existed. Even rough syntax helps.

```agicore
// What you want to write
NEW_DECL MyThing {
  FIELD value
}
```

## What should it generate?

- Rust:
- TypeScript:
- SQL:
- React component(s):

## Which existing application(s) would use this?

Reference the `.agi` file in [agicore-examples](https://github.com/Binary-Blender/agicore-examples) or the canary (`apps/novasyn-chat/novasyn_chat.agi`) where this feature would land.

## Alternatives considered

What ugly workaround exists today? Why isn't it good enough?

## Acceptance criteria

- [ ] Lexer change
- [ ] Parser change + tests
- [ ] Codegen for target language(s)
- [ ] Validator check (if applicable)
- [ ] Entry in `docs/dsl-reference.md`
- [ ] Entry in `dsl/grammar.md`
- [ ] Cookbook example (if user-facing)
