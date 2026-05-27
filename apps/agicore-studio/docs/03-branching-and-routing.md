# Branching and routing

Goal: know which of the four branching shapes is the right one for
the workflow in front of you, and how to draw each on the canvas.

Workflows that don't branch are rare. Most real systems make a
decision at some point — pick one of N paths, fan out to many in
parallel, gate a step on a condition, or repeat until convergence.
Picking the right shape is the first authoring decision; getting it
wrong adds nodes that hide the structure.

## The four shapes

| Shape              | Node kind         | Use when                                                       |
|--------------------|-------------------|----------------------------------------------------------------|
| **Route to one**   | `router_call`     | An AI should pick the best path from labeled options.          |
| **Gate this edge** | `WHEN` on edge    | A simple expression decides whether to follow one connection.  |
| **Hard branch**    | `branch`          | The split is the structural point of the workflow.             |
| **Run all paths**  | `parallel_fanout` | Multiple independent paths should run concurrently.            |

Each has a worked sample bundled with the Studio. Load any of them
from the Welcome panel's **More samples** list while you read.

## Route to one — `router_call`

Sample: **Persona dispatch** (`examples/persona_dispatch.agi`).

Use this when an AI should make the routing decision. A
`router_call` takes a prompt that asks the model to pick from a
small set of labels; the chosen label becomes the value other nodes
read.

```
        ┌── technical_answer ──┐
input → router_call ─ creative_answer ──→ composer → end
        └── supportive_answer ──┘
```

The downstream edges each carry a `WHEN` gate matching one label.
The router runs once; exactly one downstream branch runs.

Reach for `router_call` when the decision needs judgment a hardcoded
rule wouldn't capture. The persona dispatch sample is the canonical
shape — a one-prompt classification, three downstream personalities,
a composer that attributes the answer.

## Gate this edge — `WHEN`

Sample: **Canonical example** (`examples/canonical_workflow.agi`),
the `post_summary` edge.

Use this when one specific edge should sometimes be followed and
sometimes not, based on a simple expression over earlier outputs.

```agi
EDGE human_review -> post_summary
  WHEN human_review.decision == "approved" OR human_review.decision == "edited"
```

If the expression evaluates false at runtime, the edge is skipped
and any downstream nodes that only reach via that edge are skipped
too. No special node — the routing logic lives on the connection
itself.

Reach for `WHEN` when the gate is *incidental* to the workflow's
purpose. The canonical example's whole point is summarize-and-post;
the gate just prevents posting a rejected summary. If routing were
the point, a `branch` node would say so more clearly.

## Hard branch — `branch`

Sample: **Validate with branch** (`examples/validate_with_branch.agi`).

Use this when the structural shape of the workflow is "decide
something, then go one of N ways." A `branch` node centralizes the
routing decision in one place on the canvas — readers see the
diamond and know to look there for the splits.

```
generate → validate → branch ┬── auto_approve   (WHEN matched)
                             └── human_override (WHEN not matched)
```

Branch evaluates its `condition` expression once and sets
`branch.matched` to true or false. Downstream edges read that.

Reach for `branch` when the gate is *the whole point*. The validate
sample's purpose is the pass/fail split — putting the gate on an
edge would hide what the workflow is doing.

`branch` vs. `router_call`: branch takes an explicit expression
(known computation); router_call takes a prompt (judgment call).
Use branch when you can write the rule down; use router_call when
you'd have to wave your hands.

## Run all paths — `parallel_fanout`

Sample: **Parallel research** (`examples/parallel_research.agi`).

Use this when several independent branches should run concurrently
and a single downstream node should consume the union.

```
       ┌── history_angle ──┐
start → fanout ─ current_angle ──→ merge → end
       └── future_angle ───┘
```

A `parallel_fanout` node has no properties — the fanout is implicit
in the multiple outgoing edges. The runner schedules each branch
concurrently; the downstream `merge` node waits for all of them
before running.

Reach for `parallel_fanout` when the branches don't depend on each
other and serial execution would be wasted wall-clock time. The
canonical case is research: three angles can be asked at the same
time because none of the prompts reads from another's output.

## Picking the right shape

A small decision tree:

```
Is the decision a judgment call an AI would make?
├── Yes → router_call
└── No
    ├── Should multiple branches run concurrently?
    │   ├── Yes → parallel_fanout
    │   └── No, one at a time
    │       ├── Is routing the workflow's purpose?
    │       │   ├── Yes → branch
    │       │   └── No, the gate is incidental → WHEN on edge
```

When in doubt, draw it both ways and look at the canvas. The
shape that reads more like the thing-the-workflow-does in plain
English is the right one.

## Combining shapes

Real workflows compose these. The canonical example has a `WHEN`
gate inside an otherwise-linear flow. A persona dispatch could
have parallel research inside one of its persona branches. A
validate-with-branch could loop the human_override into a retry
cycle.

The rule of thumb: each layer should answer one question. If a
single node is making two decisions, you probably want two nodes.

## What's next

Walkthrough 04 covers **Human QC checkpoints** in depth — when the
pause is the feature, not a stopgap, and how to design the prompt
so reviewers know what they're approving.
