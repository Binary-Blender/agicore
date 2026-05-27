# Node kinds

Every node on the canvas has a kind. The kind selects the runtime
behavior, the inspector fields, the palette icon, and the per-kind
fields the emitter writes / the parser reads.

This reference documents what's in the registry today (`src/lib/node-kinds/index.ts`),
what the parser actually reads (`src/lib/agi-parser.ts`), and what
the emitter writes (`src/lib/agi-emitter.ts`). When they disagree
that's a bug; please file it.

## The palette

Order matches the palette card order.

| Kind              | Short label | Color    | Description                                |
|-------------------|-------------|----------|--------------------------------------------|
| `start`           | start       | green    | Workflow entry point                       |
| `http_call`       | HTTP        | slate    | GET / POST / PUT / DELETE                  |
| `ai_call`         | AI          | violet   | LLM with templated prompt                  |
| `qc_checkpoint`   | Human QC    | cyan     | Pause for human approval                   |
| `branch`          | branch      | amber    | Conditional routing                        |
| `loop`            | loop        | pink     | Iterate downstream over a collection       |
| `parallel_fanout` | fanout      | teal     | Run multiple downstream paths              |
| `router_call`     | router      | orange   | Dispatch via a tier-based router           |
| `end`             | end         | gray     | Workflow exit                              |

---

## `start`

The workflow's entry point. Required — runs are rooted here. A
workflow may have exactly one start node.

**Fields:** none.

**.agi shape:**

```agi
NODE start {
  TYPE start
}
```

**Inbound handle:** no — start has no upstream.
**Outbound handle:** yes.

---

## `http_call`

Issue an HTTP request. Returns the response body and status code.
At Beta the body is treated as opaque text; future sprints add
typed JSON parsing.

**Fields:**

| Field    | Form          | Required | Default              |
|----------|---------------|----------|----------------------|
| `METHOD` | bare word     | yes      | `GET`                |
| `URL`    | quoted string | yes      | (none)               |
| `BODY`   | quoted string | no       | empty                |

Method must be one of `GET`, `POST`, `PUT`, `DELETE`, `PATCH`,
`HEAD`. Other words parse but the runner rejects them.

**Outputs:** `body: string`, `status: number`.

**.agi shape:**

```agi
NODE fetch_article {
  TYPE      http_call
  METHOD    GET
  URL       "{{input.article_url}}"
}

NODE post_summary {
  TYPE      http_call
  METHOD    POST
  URL       "{{input.destination_url}}"
  BODY      "{ \"summary\": \"{{summarize.summary}}\" }"
}
```

**Sample:** canonical_workflow.agi.

---

## `ai_call`

Send a prompt to a configured AI provider. The provider is selected
by API key availability — the first key in
`%APPDATA%/Agicore/api-keys.json` (or platform equivalent) is used.
A future sprint adds per-node provider override.

**Fields:**

| Field    | Form          | Required | Default                                       |
|----------|---------------|----------|-----------------------------------------------|
| `PROMPT` | quoted string | yes      | (placeholder text on new nodes)               |

Prompts may reference `{{input.field}}` and `{{node_name.field}}`.
Use `\n` inside the quoted string for literal newlines.

**Outputs:** `text: string`. (Some samples and walkthroughs use
field names like `greeting`, `summary`, `draft` — those are
documentation names; the actual output field is always `text`.)

**.agi shape:**

```agi
NODE summarize {
  TYPE   ai_call
  PROMPT "Summarize the following article in three sentences.\n\n{{fetch_article.body}}"
}
```

**Samples:** every bundled sample.

---

## `qc_checkpoint`

Pause the workflow until a human approves, edits, or rejects.
Surfaces in the right rail as a decision UI with three buttons.

**Fields:**

| Field            | Form                              | Required | Default                         |
|------------------|-----------------------------------|----------|---------------------------------|
| `PROMPT`         | quoted string                     | yes      | "Review the upstream output…"   |
| `INPUT … FROM`   | `INPUT <field> FROM <node>.<f>`   | no       | (none — reviewer sees no input) |

The `INPUT` line names which upstream output the reviewer sees.
Without it, the reviewer sees only the prompt — usually wrong.

**Outputs:** `decision: "approved" | "edited" | "rejected"`,
`final_text: string` (the reviewer's text, equal to upstream when
approved unchanged).

**.agi shape:**

```agi
NODE human_review {
  TYPE   qc_checkpoint
  PROMPT "Review the AI summary. Approve, edit, or reject."
  INPUT  review_target FROM summarize.text
}
```

**Sample:** canonical_workflow.agi, validate_with_branch.agi.

See [walkthrough 04](04-human-qc-checkpoints.md) for the design
guide.

---

## `branch`

Centralized conditional routing. Evaluates an expression and sets
`branch_node.matched` to true or false. Downstream edges read it
via `WHEN` gates.

**Fields:**

| Field  | Form       | Required | Notes                                                     |
|--------|------------|----------|-----------------------------------------------------------|
| `WHEN` | expression | yes      | Unquoted; runs to end of line. NOT a quoted string.       |

Yes, the keyword is `WHEN` inside the NODE body even though `WHEN`
is also used on EDGE lines for edge gating. The parser handles them
distinctly by context but the keyword overload is a known papercut.

**Outputs:** `matched: bool`.

**.agi shape:**

```agi
NODE gate {
  TYPE branch
  WHEN validate.verdict starts_with "pass"
}

EDGE gate -> auto_approve    WHEN gate.matched == true
EDGE gate -> human_override  WHEN gate.matched == false
```

**Sample:** validate_with_branch.agi.

---

## `loop`

Iterate downstream nodes over a collection. The runner re-executes
the downstream subgraph once per item, binding the current item to
the name given by `AS`.

> **Status note:** the stub runner doesn't actually iterate yet —
> the loop node parses and renders but executes its downstream path
> once. Real iteration lands in the runtime sprint.

**Fields:**

| Field  | Form       | Required | Notes                                                  |
|--------|------------|----------|--------------------------------------------------------|
| `OVER` | expression | yes      | Unquoted; runs to end of line.                         |
| `AS`   | bare word  | yes      | Single identifier; bound inside the loop body.         |

**Outputs:** none directly — the loop's bound name (`{{round}}`)
is read by downstream nodes.

**.agi shape:**

```agi
NODE rounds {
  TYPE loop
  OVER {{range(input.rounds)}}
  AS   round
}
```

**Sample:** iterate_refine.agi.

---

## `parallel_fanout`

Run multiple downstream paths concurrently. The fanout is implicit
in the multiple outgoing edges drawn from this node on the canvas;
no per-node fields control it.

**Fields:** none.

**Outputs:** none directly — downstream nodes see their respective
inputs as if they ran sequentially. A `merge` node downstream
typically waits for all branches and concatenates.

**.agi shape:**

```agi
NODE fanout {
  TYPE parallel_fanout
}

EDGE fanout -> history_angle
EDGE fanout -> current_angle
EDGE fanout -> future_angle
```

**Sample:** parallel_research.agi.

---

## `router_call`

Dispatch via a pre-configured AI router tier. The router shifts
between tiers (e.g. "BabyAI" small/cheap, "BigAI" large/expensive)
based on the declared `TASK_TYPE`.

**Fields:**

| Field       | Form      | Required | Default     |
|-------------|-----------|----------|-------------|
| `ROUTER`    | bare word | yes      | `BabyAI`    |
| `TASK_TYPE` | bare word | yes      | `general`   |

**Outputs:** `text: string` (the chosen tier's response).

**.agi shape:**

```agi
NODE pick {
  TYPE      router_call
  ROUTER    BabyAI
  TASK_TYPE general
}
```

**Sample:** persona_dispatch.agi (see status note below).

> **Status note — divergence from walkthrough 03.** The Studio's
> docs walkthrough 03 describes `router_call` as "ask an AI to
> choose among labeled options." That description does not match
> what the registry implements today. Today's `router_call` is a
> tier dispatcher, not a label classifier. The persona_dispatch
> sample's `pick_persona` node is best authored as an `ai_call`
> (the AI emits a label string) plus `WHEN`-gated edges, not as
> a `router_call`. A future sprint will either (a) extend
> `router_call` to support label-based routing or (b) reshape
> walkthrough 03 and persona_dispatch to use ai_call + WHEN gates.
> Until then, this divergence is a known gap.

---

## `end`

The workflow's exit point. Required — runs terminate here. A
workflow may have multiple end nodes; the first to receive control
ends the run.

**Fields:** none.

**Inbound handle:** yes.
**Outbound handle:** no.

```agi
NODE end {
  TYPE end
}
```

---

## Pattern guide

Choosing the right structural node is the first authoring decision.
The bundled samples cover each pattern; load any from the Welcome
panel's More samples list while you read.

| Pattern              | Reach for       | Worked example              |
|----------------------|-----------------|-----------------------------|
| One of many          | `router_call`*  | persona_dispatch.agi        |
| All of many          | `parallel_fanout` | parallel_research.agi     |
| Repeated cycles      | `loop`          | iterate_refine.agi          |
| Conditional skip     | `WHEN` on edge  | canonical_workflow.agi      |
| Hard branch          | `branch`        | validate_with_branch.agi    |
| Human in the loop    | `qc_checkpoint` | canonical_workflow.agi      |

\* See the `router_call` status note above — today the right tool
for AI-label-based routing is `ai_call` + `branch` or `WHEN` edges.

## Contributing new kinds

To ship a new palette entry, see
[CONTRIBUTING_NODE_KINDS.md](../CONTRIBUTING_NODE_KINDS.md). The
node-kind registry is designed to be extended without forking the
Studio — though the parser and emitter still have per-kind switches
that need updating until they migrate to the registry too.
