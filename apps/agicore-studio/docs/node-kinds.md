# Node kinds

Every node on the canvas has a kind. The kind selects the runtime
behavior, the inspector fields, and the palette icon.

> **Status:** Per-kind property docs are RC-in-progress. The
> in-renderer registry (`src/lib/node-kinds/index.ts`) is the
> canonical source today.

## The palette

| Kind              | Short label | What it does                                          |
|-------------------|-------------|-------------------------------------------------------|
| `start`           | start       | Entry point. Required — runs are rooted here.         |
| `http_call`       | http        | Issue a request to a URL. Returns body + status.      |
| `ai_call`         | ai          | Send a prompt to a configured AI provider.            |
| `qc_checkpoint`   | qc          | Pause the run until a human approves / edits / rejects. |
| `router_call`     | router      | Ask an AI to choose among labeled options.            |
| `parallel_fanout` | fanout      | Run downstream branches concurrently.                 |
| `loop`            | loop        | Iterate downstream nodes over a collection.           |
| `branch`          | branch      | Take one downstream path based on a condition.        |
| `end`             | end         | Exit point. Last node before the run finishes.        |

## Pattern guide

Choosing the right structural node is the first authoring decision.
The bundled samples cover each pattern:

- One of many → `router_call` — see `persona_dispatch.agi`
- All of many → `parallel_fanout` — see `parallel_research.agi`
- Repeated cycles → `loop` — see `iterate_refine.agi`
- Conditional skip → `WHEN` on an edge — see canonical example post step
- Human in the loop → `qc_checkpoint` — see `canonical_workflow.agi`

## Contributing new kinds

To ship a new palette entry, see
[CONTRIBUTING_NODE_KINDS.md](../CONTRIBUTING_NODE_KINDS.md). The
node-kind registry is designed to be extended without forking the
Studio.

## TODO

Per-kind reference (inputs, outputs, properties, runtime semantics)
is being filled in during RC. Until it's done, the registry
definitions and the bundled samples are the worked examples.
