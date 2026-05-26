# Agicore Studio

**The visual authoring environment for the Agicore DSL.**

A focused IDE for one job: building, running, and deploying Agicore
systems faster than hand-editing `.agi` files allows. Canvas-based
authoring for `WORKFLOW` / `PIPELINE` / `ROUTER` declarations with
first-class Human QC checkpoints; the `.agi` source writes itself as
you drag.

**Not** a general-purpose code editor. **Not** a git client. **Not** a
cloud product. The Studio does one thing and does it well: it makes
Agicore authoring fast enough that the framework actually gets used.

---

## Status

**MVP — feature-complete.** The canvas authors, the source emits, runs
execute, Human QC pauses for a decision and resumes when the human
commits. Tech stack is locked. See [`PROJECT_PLAN.md`](./PROJECT_PLAN.md)
for the multi-stage roadmap; [`SPRINT_0_NOTES.md`](./SPRINT_0_NOTES.md)
for the foundational decisions.

The one functional gap remaining at MVP exit: cross-restart QC resume.
The stub runner can't persist its execution state through a Studio
restart — that requires the real `agicore-cli` binary, which is Beta
milestone work.

## First five minutes

```bash
git clone https://github.com/Binary-Blender/agicore
cd agicore/apps/agicore-studio
npm install
npm run tauri:dev
```

Once the window opens, the Welcome panel offers three paths. The
**Canonical example** loads a five-node workflow (HTTP → AI → Human QC
→ HTTP → End). Press **Run ▶** in the toolbar. Watch the nodes light
amber → green left to right. The QC node pauses cyan; the right rail
swaps to a review pane. **Approve**, **edit then approve**, or
**reject**. The run resumes (or terminates) based on your decision.

Click the **Source** tab at the bottom to see the live-emitted `.agi`
file. Every canvas edit re-emits it; every text save writes both the
`.agi` and a positional sidecar (`<file>.agi.layout.json`) atomically.

## What you can do today

| Capability                                                    | Status |
|---------------------------------------------------------------|--------|
| Open / save `.agi` workflows with layout sidecar              | ✅ |
| Six node types: Start, HTTP Call, AI Call, Human QC, Branch, End | ✅ |
| Drag-from-palette · drag-to-route edges · keyboard delete     | ✅ |
| Live `.agi` source emission (Source drawer tab)               | ✅ |
| Run with live canvas painting (amber → green/red ripple)      | ✅ |
| Run event log with per-node I/O preview (Run drawer tab)      | ✅ |
| Human QC pause with Approve / Edit / Reject sidebar UI        | ✅ |
| Bundled templates (Canonical example, Hello world)            | ✅ |

## What's next

- **Beta milestone:** real `agicore-cli` binary integration (replaces the
  in-renderer stub runner). Cross-restart QC resume becomes possible.
- **Alpha milestone:** Lezer grammar for `.agi`, two-way text↔canvas
  binding, multi-file project support.
- See [`PROJECT_PLAN.md`](./PROJECT_PLAN.md) for the full stage list.

## Architecture in one diagram

```
+--------+-----------------------------+-----------+
|        |  Toolbar  ·  name · Run ▶  |           |
| Pal-   +-----------------------------+ Inspect-  |
| ette   |                             | or  /     |
|        |          Canvas             | QC Pane   |
|        |   (paints node statuses     | (swap on  |
|        |    during a run)            |  pause)   |
|        +-----------------------------+           |
|        |   Source │ Run   (drawer)   |           |
+--------+-----------------------------+-----------+
```

The bottom drawer tab labeled **Source** is the visible proof of AD-1
(`.agi` text is the source of truth); the **Run** tab is the event log
during execution. The right rail's swap from Inspector to QC Pane on
pause is the visible proof of AD-5 (Human QC is first-class) and
OQ-3 (sidebar-notify, not modal).

## Building a release binary

```bash
npm run tauri:build
```

Output lands in `src-tauri/target/release/bundle/`. Tauri-supported
platforms: macOS (`.dmg`), Windows (`.msi`, `.exe`), Linux
(`.AppImage`, `.deb`).

## Demo

[`DEMO.md`](./DEMO.md) — the 90-second screen-recording script for the
MVP launch post. Shot list, beats, what not to show.

## Contributing

The whole point of this app is to make Agicore more approachable. PRs
that lower the barrier for first-time contributors are especially
welcome — the MVP is the floor, not the ceiling.

## License

MIT. See `LICENSE` at the agicore repo root.
