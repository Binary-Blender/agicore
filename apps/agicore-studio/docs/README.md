# Agicore Studio Documentation

Visual authoring for the Agicore DSL. The `.agi` source writes itself
as you build on the canvas.

## Walkthroughs

The walkthroughs are sequential — each one builds on the last. New
authors should read them in order; experienced users can jump.

1. [Your first workflow](01-first-workflow.md) — install, open the
   hello sample, run it. Five minutes.
2. [Authoring on the canvas](02-authoring-on-the-canvas.md) — blank
   canvas to saved file. The full palette / inspector / save tour.
3. [Branching and routing](03-branching-and-routing.md) — the four
   shapes (router_call, WHEN, branch, parallel_fanout) and when each
   is the right one.
4. *Human QC checkpoints* — TODO (RC sprint).
5. *Deploying a workflow* — TODO (RC sprint).

## Reference

- [`.agi` grammar reference](grammar.md) — every declaration, every
  keyword, every property.
- [Node kinds](node-kinds.md) — the palette: what each kind does,
  what properties it takes, how it runs.
- [Accessibility](accessibility.md) — keyboard navigation, screen
  reader support, WCAG status, known gaps.
- [Build and ship](../BUILD.md) — local build, CI matrix, code
  signing.
- [Releasing](../RELEASING.md) — one-time signing-key ceremony,
  per-release tag flow.
- [Contributing custom node kinds](../CONTRIBUTING_NODE_KINDS.md) —
  the SDK guide for shipping new palette entries.

## Bundled samples

Every sample is one click from the Welcome panel. The `.agi` source
for each lives in [`../examples/`](../examples/) for reference.

| Sample              | Pattern                              | What it teaches               |
|---------------------|--------------------------------------|-------------------------------|
| Hello, workflow     | start → ai_call → end                | The smallest useful thing     |
| Canonical example   | http_call → ai_call → QC → http_call | Sequential with a QC pause    |
| Persona dispatch    | router_call → 1-of-N + composer      | Routing exactly one branch    |
| Parallel research   | parallel_fanout → all-of-N + merge   | Concurrent branches           |
| Iterative refinement| ai_call → loop critique/revise       | Iteration to convergence      |
| Validate with branch| ai_call → branch → auto / human QC   | Pass-fail gate with override  |

## Status

Studio is in **RC** as of 2026-05-26. All Beta scorecard items
shipped; this docs site is part of the RC polish phase. See
[PROJECT_PLAN.md](../PROJECT_PLAN.md) for the full milestone history
and what's left for 1.0.

## License

MIT — see [LICENSE](../../../LICENSE) at the repo root.
