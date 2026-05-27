# Authoring on the canvas

Goal: build a workflow from a blank canvas. By the end of this
walkthrough you will have drawn, connected, configured, run, and
saved your own three-node workflow.

If you haven't run a workflow yet, do [01-first-workflow.md](01-first-workflow.md)
first — five minutes, and the rest of this assumes you've seen the
canvas before.

## The three panels

Open the Studio with no project loaded. The layout has three columns:

```
+-------+----------------------------+----------+
|       |   Toolbar (name · Run ▶)   |          |
| Pal-  +----------------------------+ Inspec-  |
| ette  |                            | tor      |
|       |          Canvas            |          |
|       +----------------------------+          |
|       | Source · Run · Tests       |          |
+-------+----------------------------+----------+
```

- **Palette** — the menu of node kinds you can drag onto the canvas.
- **Canvas** — where nodes live and connect.
- **Inspector** — properties of whatever you have selected (a node,
  an edge, or the workflow itself when nothing is selected).
- **Bottom drawer** — three tabs: live `.agi` source, run event log,
  and test results.

## Step 1 — drop your first node

In the palette, find **Start**. Drag it onto the canvas. A small
triangle appears with a green left-border. That's your entry point;
every workflow needs exactly one.

Look at the inspector on the right. With the start node selected,
it shows the node's name (`start`), kind, and an empty properties
panel. Start nodes have no properties — they just mark "begin here."

## Step 2 — add an AI call

Drag **AI Call** from the palette to the right of `start`. The
inspector now shows a **Prompt** field. Click it and type:

```
Write a haiku about {{input.subject}}.
```

The `{{input.subject}}` syntax references a workflow input. We'll
declare that input in step 4.

## Step 3 — wire the edge

Hover over the start node's right side — a small handle appears.
Click and drag from that handle to the ai_call node's left side.
The edge snaps in place. The run will now follow `start → greet`.

Look at the bottom drawer's **Source** tab. The `.agi` file has been
writing itself as you work:

```agi
WORKFLOW untitled_workflow {
  NODE start { TYPE start }
  NODE greet {
    TYPE   ai_call
    PROMPT "Write a haiku about {{input.subject}}."
  }
  EDGE start -> greet
}
```

That's the same file the Studio will save to disk — the canvas and
the text are two views of the same thing. (See
[04-human-qc-checkpoints.md](#) for the round-trip in the other
direction: edit the source, watch the canvas update.)

## Step 4 — close the loop with an end node

Drag **End** onto the canvas to the right of `greet`. Wire `greet →
end` the same way. Now click on the empty canvas to deselect
everything — the inspector flips to the workflow-level view.

In the workflow inspector you can name the workflow and declare its
inputs and outputs. Type a name like `haiku_writer`, add an input
named `subject` with type `string`, add an output named `poem` with
type `string`. The source updates.

## Step 5 — run it

Click **Run ▶**. The Studio prompts for `subject` — type
`autumn rain` and start the run.

The start node lights green, then the AI node turns amber and shortly
green, then end finishes. Click the AI node — its output appears in
the right rail. There's your haiku.

## Step 6 — save it

Click **Save** in the toolbar (or `Ctrl/Cmd + S`). The file dialog
opens with `haiku_writer.agi` already filled in. Pick a location and
save. The toolbar now shows the file path; the dirty indicator
disappears.

Re-opening the Studio later: pick **Open project folder…** from the
Welcome panel, point at the directory you saved into, and your file
shows up in the project explorer rail. Click it to load.

## What you've learned

- Drag from the palette to drop nodes.
- Click a node to edit its properties in the inspector.
- Drag from a node's right handle to another's left to wire an edge.
- Click empty canvas to edit workflow-level metadata (name, inputs,
  outputs).
- The `.agi` source writes itself as you author.
- Save creates a real file on disk; reopen via Open project folder.

## What's next

Walkthrough [03-branching-and-routing.md](03-branching-and-routing.md)
covers the four ways to make a workflow branch — when each one is
the right choice, and how they read on the canvas.
