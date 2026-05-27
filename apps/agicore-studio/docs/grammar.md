# `.agi` grammar reference

The `.agi` DSL is line-oriented with curly-brace blocks. Declarations
are top-level (no nesting). Inside a declaration, fields are
either single-line `KEY value` or block `BLOCK { ... }` form.

> **Status:** This reference is being filled in during RC. The
> canonical source today is the parser itself
> (`src/lib/agi-parser.ts`) and the emitter (`src/lib/agi-emitter.ts`).
> When this reference and the parser disagree, the parser wins.

## Declarations

The DSL recognizes these top-level declarations. Studio's authoring
flow exercises `APP` and `WORKFLOW` first; the rest land on the
canvas as Alpha / Beta features.

| Declaration  | Purpose                                        |
|--------------|------------------------------------------------|
| `APP`        | App-level metadata (title, db, identifier)     |
| `WORKFLOW`   | A directed graph of nodes and edges            |
| `ENTITY`     | A persistent data shape                        |
| `ACTION`     | A reusable operation                           |
| `STATE`      | A state machine                                |
| `PATTERN`    | A reusable subgraph                            |
| `ROUTER`     | A routing table                                |
| `AI_SERVICE` | Provider/model config bound by name            |
| `PERSONA`    | A named voice for AI calls                     |
| `SCORE`      | A grading rubric                               |
| `SEED`       | Initial data for a fresh DB                    |
| `TEST`       | Assertions over a workflow run                 |
| `MODULE`     | A bundle of related declarations               |
| `NODE`       | (inside `WORKFLOW`) one step in the graph      |
| `EDGE`       | (inside `WORKFLOW`) one connection             |

## Common fields

Most blocks share a small vocabulary:

- `TITLE "string"` — human-readable name
- `DESCRIPTION "string"` — long-form description
- `INPUT  name: type` — typed input parameter
- `OUTPUT name: type` — typed output
- `TYPE node_kind` — for `NODE` blocks, selects the runtime behavior

## Node kinds

A NODE's `TYPE` selects from this set. The full list and per-kind
properties is in [node-kinds.md](node-kinds.md).

- `start`
- `http_call`
- `ai_call`
- `qc_checkpoint`
- `router_call`
- `parallel_fanout`
- `loop`
- `branch`
- `end`

## Expressions

Wherever a value is allowed, Studio supports a small expression
language for referring to other nodes' outputs and the workflow's
inputs.

```
{{input.field_name}}             — workflow input
{{node_name.output_field}}       — output of an upstream node
{{node_name.output == "value"}}  — equality check, used in WHEN
```

`WHEN` is a per-edge gate — the edge is followed only if the
expression evaluates truthy at runtime. See `persona_dispatch.agi`
for a worked example.

## TODO

This reference is incomplete. The full grammar belongs here during
RC. Until it's done, treat the parser as authoritative and use the
bundled examples as worked patterns.
