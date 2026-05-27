# Deploying a workflow

Goal: get a workflow from your laptop to your users. By the end of
this walkthrough you will know the three deploy targets the Studio
supports today, when each is the right one, and how auto-update
reaches users running an older version.

## Two things called "deploy"

The Studio uses the word *deploy* for two related but distinct
operations:

1. **Deploying the Studio itself** — building a Studio installer,
   tagging a release, publishing it to GitHub Releases, having
   existing users auto-update to it. This is what `BUILD.md` and
   `RELEASING.md` cover. If you're a Studio maintainer shipping a
   new version, that's your path.

2. **Deploying a workflow** — taking a `.agi` file you authored
   and turning it into something runnable outside the Studio. This
   is what the rest of this walkthrough covers.

The two are independent. Workflow authors don't need to know
anything about Studio release engineering.

## Three workflow deploy targets

| Target                  | Use when                                                 |
|-------------------------|----------------------------------------------------------|
| **Run inside the Studio** | You're the only operator; the workflow is interactive. |
| **Standalone Tauri bundle** | The workflow has end users who shouldn't see an IDE.   |
| **Docker container (RC+)** | The workflow runs in CI, on a server, on a schedule.   |

The first one needs no explanation — you already used it in
walkthrough 01. The other two need a build step.

## Standalone Tauri bundle

> **Status:** scaffolded; the production path lands in RC+1. Today
> the Studio ships, but the Studio-bundles-your-workflow flow is
> still hand-rolled.

The intended path: the Studio reads your `.agi` file, bundles a
minimal Tauri runtime around it, configures it with a fixed input
form, and produces a platform-native installer that runs *just that
workflow*. Your end users install the resulting `.msi` / `.dmg` /
`.deb` and never see a canvas — they get a small purpose-built app.

The shape is the same as how the Studio itself is built (see
`BUILD.md`): Vite + Tauri produces per-platform installers from the
`tauri.conf.json` config. The workflow-deploy path just generates a
different `tauri.conf.json` per workflow and embeds the `.agi` as a
read-only asset.

Until that pipeline lands, the workaround is to fork the Studio
itself and replace the canvas with a one-workflow runner. This is
real work; don't do it unless you need a shippable artifact today.

## Docker container

> **Status:** deferred. No production path yet — the slot is
> reserved in PROJECT_PLAN's RC scope.

The intended shape: a CLI binary built from the same Rust crate
that powers the Studio's run engine, packaged in a minimal Docker
image, configured with the `.agi` source and a JSON inputs file.
The container runs the workflow end-to-end and exits with the
workflow's output on stdout (or in a side-channel S3 bucket for
large outputs).

This target is for the production-server use case: a workflow that
should run on a schedule, or in a CI pipeline, or as part of a
larger system. Today: not yet.

## Run from CLI (interim)

The interim path that exists today: install the `agicore-cli`
crate (lives in `crates/agicore-cli/`, runs the same engine the
Studio uses), pass it an `.agi` file and a JSON inputs file, get
the workflow output on stdout. Not pretty, but functional for
servers and CI.

```bash
cargo install --path crates/agicore-cli
agicore-cli run path/to/workflow.agi --inputs inputs.json
```

QC checkpoints don't work in CLI mode — the runner has no UI to
surface them. Workflows with QC nodes will halt at the pause and
report a "no QC handler" error. The Studio path is the only way to
run a QC-containing workflow until the cloud QC backend lands
(post-1.0).

## Auto-update for the Studio itself

This is the deploy story that *is* shipped today. When a Studio
maintainer tags a new release (see `RELEASING.md`), existing
installations check the GitHub Releases endpoint, download the new
signed installer, verify the signature against the embedded public
key, and offer to restart.

From a user's perspective: Settings → Check for updates → Download
and install → Restart. Three clicks, two minutes, signed by the
maintainer's offline key the whole way.

This matters for workflow authors because it means the Studio's
node kinds, .agi grammar, and bundled samples evolve under their
feet without any action on their part. Workflows authored in
v0.1.0 should keep running in v0.2.0 — the .agi format is
forward-compatible by intent.

## Versioning your workflows

The `.agi` file format embeds no version stamp today. Workflows
authored in newer Studios may use node kinds or expression
features that older Studios don't know — those load as parse
errors. The convention while we figure out versioning:

- Don't ship a workflow to a user running an older Studio than the
  one you authored on.
- If you have to, test it on their version first.

A real version negotiation lands at 1.0. Until then, this is
informal.

## What's next

That's the walkthrough series. Where to go from here:

- The bundled samples are the deepest reference — open them, read
  them, modify them. Every node kind has at least one worked
  example.
- The [grammar reference](grammar.md) and [node-kinds reference](node-kinds.md)
  are the authoritative shape definitions when the bundled samples
  don't cover your case.
- [PROJECT_PLAN.md](../PROJECT_PLAN.md) lays out what's coming
  next. If something you need is in there and you want to help
  build it, see the contributor docs.

If something's missing or wrong, file an issue. The docs are part
of the project, and the project is open.
