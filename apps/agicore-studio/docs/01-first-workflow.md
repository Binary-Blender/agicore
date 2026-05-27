# Your first workflow

Goal: open the Studio, run a workflow, see a result. Five minutes.

## What you need

- A Studio build — either an installer from the GitHub releases
  page, or a local dev build. The [BUILD.md](../BUILD.md) walkthrough
  covers building from source.
- An Anthropic, OpenAI, Google, xAI, or HuggingFace API key. The
  hello sample uses one AI call. Bring whichever provider you have.

## Step 1 — set your API key

First launch shows the Welcome panel. Before running anything, click
the cog icon in the title bar to open **Settings**. Paste your API
key for any provider you have and click **Save**.

The key is stored locally at `%APPDATA%/Agicore/api-keys.json` on
Windows, `~/Library/Application Support/Agicore/api-keys.json` on
macOS, and `~/.config/Agicore/api-keys.json` on Linux. Sibling
Agicore apps share this file — set it once, use it everywhere.

## Step 2 — load the hello sample

Back on the Welcome panel, under **More samples**, click
**Hello, workflow**.

The canvas populates with three nodes: a `start` triangle, a green
`ai_call` named `greet`, and an `end` triangle. They're connected
left-to-right. The bottom drawer's **Source** tab shows the
auto-generated `.agi` for what you're looking at — that's the file
the Studio would save.

## Step 3 — run it

Click **Run ▶** in the toolbar. The Studio asks for the workflow's
inputs in a dialog. `whom` is a string — type your own name, click
**Start**.

Watch the canvas. The `start` node lights green, then the `greet`
node turns amber (running) and shortly green (succeeded), then `end`
finishes. The bottom drawer's **Run** tab streams events as they
happen: `run.start`, `node.start`, `node.ok`, `run.ok`.

Click the `greet` node — the right rail shows its output. That's
your greeting.

## What just happened

You ran a workflow with one AI call. The `.agi` source for what you
ran lives at [`examples/hello_workflow.agi`](../examples/hello_workflow.agi).
It looks like this, lightly trimmed:

```agi
WORKFLOW say_hello {
  INPUT  whom: string
  OUTPUT greeting: string

  NODE start { TYPE start }
  NODE greet {
    TYPE   ai_call
    PROMPT "Write a one-sentence friendly greeting for {{input.whom}}."
    OUTPUT greeting: string
  }
  NODE end { TYPE end }

  EDGE start -> greet
  EDGE greet -> end
}
```

That source was written by the Studio as you watched the canvas —
authoring on the canvas and editing the text are two views of the
same thing.

## What's next

Try the **Canonical example** sample for a workflow with a real
human-QC pause. Or open **Persona dispatch** for the router pattern.
The next walkthrough, *Authoring on the canvas* — coming in RC —
covers drawing your own workflow from a blank canvas.
