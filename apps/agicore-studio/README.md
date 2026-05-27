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

**RC — release candidate.** Sprint 0 / MVP / Alpha / Beta all
shipped; the public Beta tag is live. See
[`PROJECT_PLAN.md`](./PROJECT_PLAN.md) for the multi-stage history
and what remains for 1.0.

The Studio is feature-complete enough that real workflows can be
authored, run, paused at human QC, debugged with breakpoints,
saved as multi-file projects, recovered after a crash, and shipped
as platform installers from CI. The one thing still missing
end-to-end is the real `agicore-cli` runtime; in-Studio runs use
an in-renderer stub. Cross-restart QC resume lands when the real
runner does.

## Download

Latest release: [Binary-Blender/agicore — releases](https://github.com/Binary-Blender/agicore/releases).

Installers for Linux (`.deb` + `.AppImage`), macOS (`.dmg`), and
Windows (`.msi` + `.exe`) ship from CI on every `studio-v*` tag.
Pre-1.0 releases are unsigned at both layers (OS installer
signature and Tauri updater signature) — SmartScreen and
Gatekeeper will warn on first launch, and auto-update will refuse
to apply binaries from this release. The one-time signing-key
ceremony in [`RELEASING.md`](./RELEASING.md) closes both.

## First five minutes

```bash
git clone https://github.com/Binary-Blender/agicore
cd agicore/apps/agicore-studio
npm install
npm run tauri:dev
```

Once the window opens, the Welcome panel offers six bundled
samples. Start with **Hello, workflow** (one AI call) for the
five-second "it works" hit, then **Canonical example** for the
full HTTP + AI + Human QC + HTTP tour. The right rail swaps to a
QC review pane at the cyan pause; **Approve**, **edit then
approve**, or **reject**. The run resumes (or terminates) based
on your decision.

Click the **Source** tab at the bottom to see the live-emitted
`.agi` file. Every canvas edit re-emits it; every text save
writes both the `.agi` and a positional sidecar
(`<file>.agi.layout.json`) atomically.

For the full guided tour, see [`docs/`](./docs/) — five walkthroughs
from first workflow through deploying.

## What you can do today

| Capability                                                          | Status |
|---------------------------------------------------------------------|--------|
| Open / save `.agi` workflows with layout sidecar                    | ✅ |
| Nine node kinds — every kind has a bundled worked example           | ✅ |
| Drag-from-palette or keyboard click-to-add                          | ✅ |
| Drag-to-route edges · keyboard delete                               | ✅ |
| Live `.agi` source emission (Source drawer tab)                     | ✅ |
| Two-way text ↔ canvas binding with cycle protection                 | ✅ |
| Multi-file project explorer with hot-reload polling                 | ✅ |
| Git status indicators on project files                              | ✅ |
| Run with live canvas painting and per-node status rings             | ✅ |
| Run event log with per-node I/O preview (Run drawer tab)            | ✅ |
| Human QC pause with Approve / Edit / Reject sidebar UI              | ✅ |
| Debug mode: breakpoints, step, continue, scope inspector            | ✅ |
| Test runner panel — execute `TEST` declarations from inside Studio  | ✅ |
| Six bundled samples covering every node kind                        | ✅ |
| `.agi` autocomplete with context-aware suggestions                  | ✅ |
| Auto-save recovery (per-file drafts, opt-in restore on launch)      | ✅ |
| Recent projects list on the Welcome panel                           | ✅ |
| Multi-window (Studio supports one project per window)               | ✅ |
| Shared API keys across sibling Agicore apps                         | ✅ |
| Opt-in telemetry — schema-safe, session-scoped, preview before send | ✅ |
| Opt-in crash reporter with path-normalized stack frames             | ✅ |
| Auto-update via GitHub Releases (settings-driven check/install)     | ✅ |
| GitHub Actions CI matrix builds + tag-triggered releases            | ✅ |
| i18n scaffolding (English-only at 1.0, t() helper + en.json)        | ✅ |
| Accessibility first pass: focus-visible ring, keyboard authoring    | ✅ |

## What's next

- **RC remaining:** marketing-site lite, accessibility round two
  (keyboard edge creation, aria-live for run state, light/high-contrast
  theme), the one-time signing-key ceremony for signed releases.
- **1.0:** twenty external users authoring real workflows; the
  reports inform the explicit "what's missing" list. See
  [`PROJECT_PLAN.md`](./PROJECT_PLAN.md) for the ship criteria.
- **Post-1.0:** Visual editors for `ENTITY` (data modeling) and
  `STATE` (state machines); plugin marketplace; real-time
  multi-cursor collaboration if there's demand.

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

For local builds, see [`BUILD.md`](./BUILD.md) — covers prereqs,
per-platform native dependencies, and troubleshooting. The short
form:

```bash
npm run tauri:build
```

Output lands in `src-tauri/target/release/bundle/`. Tauri-supported
platforms: macOS (`.dmg`), Windows (`.msi`, `.exe`), Linux
(`.AppImage`, `.deb`).

For tagged releases through the CI matrix, see
[`RELEASING.md`](./RELEASING.md) — covers the one-time signing-key
ceremony and the per-release tag flow.

## Demo

[`DEMO.md`](./DEMO.md) — the 90-second screen-recording script for the
MVP launch post. Shot list, beats, what not to show.

## Contributing

The whole point of this app is to make Agicore more approachable. PRs
that lower the barrier for first-time contributors are especially
welcome — the MVP is the floor, not the ceiling.

## License

MIT. See `LICENSE` at the agicore repo root.
