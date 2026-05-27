# `.agi` grammar reference

The `.agi` DSL is line-oriented with curly-brace blocks. Declarations
are top-level (no nesting). Inside a declaration, fields are either
single-line `KEY value` or block `BLOCK { ... }` form.

This reference documents the surface the **Studio's parser actually
reads today** (`src/lib/agi-parser.ts`) and the surface the **Studio's
emitter writes** (`src/lib/agi-emitter.ts`). Other tools in the wider
Agicore ecosystem may understand more — but the Studio's authoring
loop only round-trips what's described here.

## File shape

```agi
// optional comment header

APP some_name {
  TITLE  "Some Title"
  DB     some_name.db
}

WORKFLOW some_workflow_name {
  DESCRIPTION "What this workflow does."

  INPUT  arg1: string, arg2: number
  OUTPUT result: string

  NODE node_name {
    TYPE      some_kind
    // per-kind fields here
  }

  // more NODE blocks…

  EDGE node_a -> node_b
  EDGE node_b -> node_c  WHEN node_b.field == "value"
}
```

## Top-level blocks

| Block        | Status in Studio's parser today                      |
|--------------|------------------------------------------------------|
| `APP`        | Emitted; **not currently parsed**. Round-trips by re-emission. |
| `WORKFLOW`   | Emitted **and** parsed. The authoring surface today. |
| `ENTITY`     | Not yet handled by Studio. Reserved keyword.         |
| `ACTION`     | Not yet handled by Studio. Reserved keyword.         |
| `STATE`      | Not yet handled by Studio. Reserved keyword.         |
| `PATTERN`    | Not yet handled by Studio. Reserved keyword.         |
| `ROUTER`     | Not yet handled by Studio. Reserved keyword.         |
| `AI_SERVICE` | Not yet handled by Studio. Reserved keyword.         |
| `PERSONA`    | Not yet handled by Studio. Reserved keyword.         |
| `SCORE`      | Not yet handled by Studio. Reserved keyword.         |
| `SEED`       | Not yet handled by Studio. Reserved keyword.         |
| `TEST`       | Parsed by the test-runner; see TESTS surface.        |
| `MODULE`     | Not yet handled by Studio. Reserved keyword.         |

If you hand-write any of the "not yet handled" blocks into a file
the Studio loads, they are preserved on round-trip via a different
path — but the canvas can't edit them. The Studio is honest about
what it can author; future sprints expand this surface.

## `APP` block

```agi
APP <name> {
  TITLE  "<display string>"
  DB     <db_filename>
}
```

The Studio's emitter writes one APP block per file, named
`<workflow_name>_app` by default. The Studio's parser **ignores it**
today — APP-level metadata is reconstructed at save time from the
workflow name, not loaded from the file. Edit the APP block by hand
and your changes survive only until the next Studio save.

## `WORKFLOW` block

```agi
WORKFLOW <name> {
  DESCRIPTION "<string>"     // optional
  INPUT  <field>: <type>, <field>: <type>    // optional, comma-separated
  OUTPUT <field>: <type>, <field>: <type>    // optional, comma-separated

  // NODE blocks…
  // EDGE declarations…
}
```

**Name** must be a single bare word (matching `\w+`). Used as the
workflow's identifier and the default `.agi` filename.

**DESCRIPTION** is a quoted string. Use `\n` for line breaks and
`\"` for literal quotes.

**INPUT / OUTPUT** are comma-separated lists of `name: type` pairs.
The Studio recognizes `string`, `number`, `bool`, and `any` as types
today. Unknown types parse as `string`.

## `NODE` block

```agi
NODE <name> {
  TYPE <kind>
  // per-kind fields…
}
```

**Name** is a bare word. Must be unique within the workflow.
References from other nodes (`{{node_name.field}}`) and from edges
(`EDGE node_name -> ...`) use this name.

**TYPE** is one of nine kinds; see [node-kinds.md](node-kinds.md)
for the complete per-kind field reference. The parser **rejects**
unknown kinds with a "unknown TYPE" error.

Per-kind field summary (full detail in `node-kinds.md`):

| Kind              | Fields                                              |
|-------------------|-----------------------------------------------------|
| `start`           | none                                                |
| `http_call`       | `METHOD`, `URL`, `BODY`                             |
| `ai_call`         | `PROMPT`                                            |
| `qc_checkpoint`   | `PROMPT`, `INPUT <field> FROM <node>.<field>`       |
| `branch`          | `WHEN <expression>`                                 |
| `loop`            | `OVER <expression>`, `AS <bare_word>`               |
| `parallel_fanout` | none                                                |
| `router_call`     | `ROUTER <name>`, `TASK_TYPE <name>`                 |
| `end`             | none                                                |

> **Caveat on `branch`.** The keyword inside a `branch` NODE is
> `WHEN`, which is the same keyword used on `EDGE` lines for gating.
> The parser disambiguates by context (NODE-body vs. EDGE-line) but
> the visual collision is real. A future syntax sprint may rename
> the branch keyword to `CONDITION` for clarity; until then, write
> what the parser reads.

## `EDGE` declarations

```agi
EDGE <source_node_name> -> <target_node_name>
EDGE <source_node_name> -> <target_node_name>  WHEN <expression>
```

The arrow is two characters: `->`. Whitespace around it is required
on each side (the parser uses `\s*->\s*`).

**WHEN** on an edge is a gate. If the expression evaluates falsy at
runtime, the edge is skipped — and any downstream node only
reachable via this edge is skipped too.

## Field value syntax

| Form                | Example                              | Where allowed                |
|---------------------|--------------------------------------|------------------------------|
| Quoted string       | `"hello {{input.who}}"`              | `URL`, `BODY`, `PROMPT`, `DESCRIPTION`, `TITLE` |
| Bare word           | `GET`, `BabyAI`, `round`             | `METHOD`, `ROUTER`, `TASK_TYPE`, `AS`           |
| Expression          | `validate.verdict starts_with "pass"`| `WHEN` (NODE and EDGE)       |
| Templated expression| `{{range(input.rounds)}}`            | `OVER`                        |

Quoted strings support `\n`, `\"`, `\\` escapes. Other escapes are
literal.

## Expressions

Wherever an expression is allowed, the Studio recognizes:

```
{{input.<field>}}              workflow input
{{<node_name>.<output_field>}} output of an upstream node
{{<node_name>.<field> == "x"}} equality check
```

Comparison operators: `==`, `!=`, `>`, `<`, `>=`, `<=`. Logical
operators: `AND`, `OR`. String operators: `starts_with`, `ends_with`,
`contains`. Truthy-fallthrough on `null` and empty string is the
default.

The expression language is intentionally narrow — anything more
complex belongs in an `ai_call` node, not a routing expression. If
you find yourself writing nested conditionals in WHEN, the workflow
shape is probably wrong.

## Comments

Line comments use `//`. Block comments are not supported. Comments
are preserved by the emitter only when they sit between top-level
declarations — comments inside a block body are stripped on
round-trip.

## What this reference is missing

This reference covers the Studio's authoring surface. The wider
`.agi` spec — what runs in `agicore-cli`, what other tools in the
Agicore stack consume — includes blocks and fields not listed
here. When this reference and the parser disagree, the parser
wins; when this reference and the spec disagree, that's a known
gap and a future sprint will close it.

See also: [node-kinds.md](node-kinds.md) for per-kind field detail,
and the bundled samples in `examples/` for worked patterns.
