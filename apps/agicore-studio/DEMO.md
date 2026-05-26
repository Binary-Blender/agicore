# Agicore Studio — 90-Second Demo

The script for the MVP launch screen recording. Optimized for someone
who's never heard of Agicore landing on the post cold.

The goal of the video isn't to teach Agicore. It's to make the viewer
ask *"wait, what just happened?"* in a way that makes them visit the
repo. Save explanation for the README.

---

## Beats (90 seconds, ~15 fps target)

| t (s)   | Beat                                                                                            |
|---------|-------------------------------------------------------------------------------------------------|
| 0–3     | Cold open: app loads, welcome panel front and center. Title visible.                            |
| 3–8     | Cursor hovers "Canonical example", clicks. Canvas populates with 5 nodes connected left-to-right. |
| 8–14    | Cursor drags `summarize` 60px down to show the canvas is real. Bottom drawer auto-collapsed.    |
| 14–20   | Click "Source" drawer tab. It animates open. The `.agi` file is visible. Hold for 2 beats.     |
| 20–25   | Click "Run ▶" in the toolbar. The button flips to "◼ Cancel". `start` node lights amber, ticks green. |
| 25–32   | `fetch_article` amber → green. `summarize` amber → green. Visual rhythm of the topology firing. |
| 32–40   | `human_review` lights cyan and starts pulsing. **Right rail swaps to QC Inspector. Toolbar pill pulses "paused: qc".** |
| 40–52   | Cursor drags the QC inspector into focus. The reviewer reads the AI summary. **Hold this beat.** |
| 52–60   | Cursor clicks "Edit before approving…". Textarea appears with the upstream output editable.     |
| 60–72   | The reviewer edits one phrase ("three sentences" → "the three claims"). Adds a comment. Clicks "Approve edited output". |
| 72–80   | `human_review` snaps green ✓. `post_summary` amber → green. `end` ticks. Toolbar pill flips to "succeeded · 6.4s". |
| 80–88   | Click "Source" drawer again. The `.agi` is visible — *that whole workflow is one declarative file.* Hold. |
| 88–90   | Cut to repo URL. End card: `github.com/Binary-Blender/agicore` · `apps/agicore-studio`.        |

---

## Shot list

1. **Cold open** — app at fresh state, welcome panel centered. No cursor visible yet.
2. **Template load** — single click on "Canonical example". Canvas populates. The fitView animation does its work.
3. **Manipulation** — drag `summarize` node 60px south. Drag back. This proves "live thing, not a static screenshot."
4. **Source reveal #1** — open the Source drawer. Show the `.agi` text. Don't dwell.
5. **Run** — single click on Run. The execution animation carries the next 12 seconds.
6. **QC pause** — the most important beat. The pulse + pill + right-rail swap happen simultaneously. **The recording should land on this state for 2 full seconds before any cursor movement.**
7. **Edit flow** — show the actual editing. The text-area appearing is a "this is a tool, not a toy" moment.
8. **Resume** — the run completes. Quick.
9. **Source reveal #2** — pop the drawer. Show that the workflow + the QC checkpoint are *the same file*. This is the Agicore pitch in one frame.
10. **End card** — URL only. No call-to-action text, the URL is the call-to-action.

---

## What to say in the post copy

Three lines max. No marketing voice. The reveal is the demo.

> Workflows in Agicore Studio are .agi files. The canvas is a view.
> Human QC is a node type — runs pause, you decide, they resume.
> apps/agicore-studio in the Binary-Blender/agicore repo.

---

## Technical notes for the recording session

- **Window size:** 1600x1000 — matches the default Tauri window. Don't resize during the demo.
- **Recording tool:** anything that does 60fps capture and lets you trim. The pulsing animations matter; under-sampled they look wrong.
- **Final output:** export to 30fps; pulsing reads cleanly at 30.
- **No audio.** The captions in the post carry the message. Audio narration would invite VO-quality complaints that distract from the work.
- **No music.** Same reasoning. Silent + crisp > soundtracked + busy.
- **First take is almost always the best take.** The animation timings the user sees in the recording are the actual production timings — if it looks fast/slow, it actually is fast/slow.
- **Don't fake it.** Use the real stub runner. Real synthetic outputs. The video should be a recording of the actual app, not a mock.

---

## What the demo deliberately doesn't show

- The node palette. We let the viewer wonder how the canvas got populated.
- The Inspector for non-QC nodes. Same — let them want to find it.
- Save / Open. Boring; preserves the magic.
- The stub-runner caveat in the QC log line. Trim it from the visible portion of the log if it's distracting; the viewer doesn't need to know the runner is stubbed.

The job of the demo is to make the viewer ask "how do I get my hands on this." Not to teach them how to use it.

---

## After the demo

The repo's README does the work the demo doesn't. The demo is the
trailer, the README is the film.
