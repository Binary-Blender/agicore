# Human QC checkpoints

Goal: design a workflow where the human pause is the feature, not a
stopgap. By the end of this walkthrough you will know when to reach
for `qc_checkpoint`, how to write the prompt so reviewers can
actually decide, and how QC composes with the other branching shapes.

## Why QC is first-class

Most workflow tools treat human review as an afterthought — a Slack
notification, an email approval link, a side channel that lives
outside the system. Agicore Studio treats it as a node kind. The
runner stops at the checkpoint, the canvas shows a cyan pause-ring,
the reviewer makes a decision in the right rail, and the run
resumes. The reviewer's choice is a typed output that downstream
nodes consume.

This matters because the alternative — async approval through some
other tool — drops the connective tissue. The reviewer doesn't see
what the AI was given, doesn't know which branch their decision
unlocks, and doesn't have a record of why they approved. The QC
checkpoint keeps all of that in one place.

## The three decisions

A `qc_checkpoint` always exits with one of three labels:

| Decision    | What it means                                                              |
|-------------|----------------------------------------------------------------------------|
| `approved`  | The reviewer accepts the upstream output as-is. Forward unchanged.         |
| `edited`    | The reviewer modifies the output. The edited text becomes the QC output.  |
| `rejected`  | The reviewer rejects the output. The downstream paths can branch on this. |

Downstream edges read `qc_node.decision` and gate on it. The
**Canonical example** sample is the worked case — the `post_summary`
edge runs only if `human_review.decision == "approved" OR human_review.decision == "edited"`,
so rejection halts the chain without an explicit branch node.

## Designing the prompt

A bad QC prompt makes the reviewer guess. A good one tells them
three things:

1. **What they're looking at.** Don't just paste the upstream
   output — frame it. "The AI's three-sentence summary of this
   article" is clearer than `{{summarize.summary}}`.

2. **What the criteria are.** The reviewer needs the rubric. "Is it
   factually accurate? Is it concise enough?" beats "Review."

3. **What happens next.** "Approve to post; edit to fix; reject to
   discard" closes the loop on the consequences of each decision.

Compare:

> **Bad:** "Review the AI summary."

> **Good:** "The AI's three-sentence summary of this article. Check
> for: factual accuracy against the source, no embellishment, no
> editorializing. Approve to post to {{destination}}; edit to fix
> small issues; reject to discard."

The Studio renders the prompt verbatim in the QC inspector — what
you write is what the reviewer sees.

## When to reach for QC

A QC checkpoint is the right tool when:

- The cost of a wrong AI output is meaningfully higher than the
  cost of a small human delay.
- A human can review the output in roughly the same time it took
  to generate (otherwise the workflow becomes unworkably slow).
- The downstream action is irreversible or visible — posting to
  a public URL, sending an email, charging a card.

A QC checkpoint is the wrong tool when:

- The AI can self-check via a rule (use `branch` instead — the
  **Validate with branch** sample shows this shape).
- The review takes longer than re-running the AI (the workflow
  shape is wrong; consider a different cut).
- There's no rubric the reviewer could apply (you don't have a QC
  problem yet; you have a definition problem).

## QC vs. branch with human override

The **Validate with branch** sample uses a branch AND a QC
checkpoint — the AI judge handles the easy pass cases automatically,
and only the failures route to a human. This compose is the right
shape when human review is expensive: most cases are handled
algorithmically, exceptions hit the queue.

```
generate → validate → branch ─── pass ──→ auto_approve
                          └─── fail ──→ qc_checkpoint
```

The pattern: validate cheaply, branch on the verdict, send only the
ambiguous slice to the human. Use this when your judge is reliable
enough that most cases shouldn't need attention but you're not
willing to trust it on the fail cases.

## QC in a router or fanout

QC composes with `router_call` and `parallel_fanout`. A persona
dispatch could pause for human approval before sending the AI's
choice downstream — "the router picked the technical persona; OK
to proceed?" A parallel research workflow could fan out three
research angles, gather them, then QC-review the merged briefing
before publishing.

The rule of thumb: a QC checkpoint is just another node. Put it
wherever a human decision should be the gate.

## Running with a QC pause

When the runner hits a QC node, the workflow status flips to
`paused_qc` and the canvas paints the node with a cyan ring. The
right rail switches into QC mode: it shows the prompt, the upstream
output, and three buttons (Approve / Edit / Reject). The Edit button
opens the output in a textarea — whatever the reviewer types
becomes `qc_node.final_summary` (or whatever output name you used).

Run history records the decision, the reviewer's session (today:
local user; in Beta: optionally an external auth subject), and the
timestamps. The bottom drawer's **Run** tab shows
`qc.pause → qc.resume → node.start` as discrete events.

## Multiple QC checkpoints in one workflow

Workflows can have any number of QC nodes. Each pauses
independently; the reviewer handles them in run order. If two
parallel branches each have a QC node, the run can pause at both
simultaneously — the right rail shows the active one and a
"1 more pending" affordance.

The Studio's run engine treats QC like any other node — it's not a
special control structure, just a node kind whose runtime contract
is "wait for an external signal."

## What's next

Walkthrough [05-deploying-a-workflow.md](05-deploying-a-workflow.md)
covers shipping — from `.agi` file to installer, including the CI
matrix, the release flow, and how auto-update reaches existing
users.
