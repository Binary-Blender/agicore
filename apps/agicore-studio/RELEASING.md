# Releasing Agicore Studio

Auto-update is wired via GitHub Releases. Tauri's updater plugin reads
a `latest.json` manifest from the latest release and verifies bundle
signatures against the public key embedded in
`src-tauri/tauri.conf.json`.

This document covers two things:

1. **One-time setup** — generate the updater signing key. A
   maintainer does this once per project, never again.
2. **Per-release steps** — what happens when you tag a new version.

## One-time setup

> **Do this once.** After this ceremony the key never leaves the
> CI secret store; you don't need to touch it again to ship a release.

### 1. Generate the key pair

From `apps/agicore-studio`:

```bash
npm run tauri signer generate -- -w ~/.agicore/agicore-studio-updater.key
```

Tauri prompts for a password. Pick one and write it down somewhere
durable (1Password, paper in a safe — not in the repo). The command
produces two files:

- `~/.agicore/agicore-studio-updater.key`      — the **private** key.
  Keep this offline. Never commit. Never email.
- `~/.agicore/agicore-studio-updater.key.pub`  — the **public** key.
  This is the one that ships in the app.

### 2. Paste the public key into `tauri.conf.json`

Open `src-tauri/tauri.conf.json` and find this line:

```json
"pubkey": "TODO(release-key)-run-npm-run-tauri-signer-generate-once-and-paste-the-public-key-here"
```

Replace the `TODO(release-key)-…` string with the contents of
`agicore-studio-updater.key.pub` (one long base64 line). Commit the
change. The public key is safe to commit — that's the whole point
of asymmetric signing.

### 3. Add the private key as a CI secret

GitHub → repo → Settings → Secrets and variables → Actions →
New repository secret. Add two secrets:

| Secret name                              | Value                                                  |
|------------------------------------------|--------------------------------------------------------|
| `TAURI_SIGNING_PRIVATE_KEY`              | Contents of `~/.agicore/agicore-studio-updater.key`    |
| `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`     | The password you set in step 1                         |

The build workflow at `.github/workflows/agicore-studio-build.yml`
reads both env vars; the Tauri bundler picks them up automatically
and signs each installer alongside the build.

You're done with one-time setup.

## Per-release steps

Releasing a new version is two commands.

### 1. Bump the version

Edit three files (they must agree):

- `apps/agicore-studio/package.json`          → `"version"`
- `apps/agicore-studio/src-tauri/Cargo.toml`  → `version`
- `apps/agicore-studio/src-tauri/tauri.conf.json` → `"version"`

### 2. Tag and push

```bash
git commit -am "release(agicore-studio): v0.1.0-beta.2"
git tag -a studio-v0.1.0-beta.2 -m "Release notes go here"
git push origin main
git push origin studio-v0.1.0-beta.2
```

The tag push triggers the build workflow's `release` job. It:

1. Runs the per-platform matrix builds with the signing key from
   secrets — every installer gets a matching `.sig` file.
2. Collects all artifacts to one flat directory.
3. Generates `latest.json` from the `.sig` files.
4. Publishes a GitHub Release at
   `https://github.com/Binary-Blender/agicore/releases/tag/studio-v0.1.0-beta.2`
   with all installers and the manifest attached.

Existing Studio installs check the
`releases/latest/download/latest.json` URL on user demand (Settings →
Check for updates). When the tagged version is greater than the
running version, the updater downloads the matching installer, verifies
the signature, applies the update, and offers a restart.

### Prereleases

Tags containing a hyphen — `studio-v0.1.0-beta.2`, `studio-v1.0.0-rc.1` —
are marked as **prereleases** on GitHub. They don't appear under
`releases/latest` and won't be served to users running stable builds.
Reserved for `-beta.N` and `-rc.N` ladders.

## Failure modes worth knowing

- **Build runs but no `.sig` files appear.** The CI signing secrets
  aren't set or aren't readable. The build workflow falls back to
  publishing unsigned binaries (development-only); auto-update will
  reject them with "signature verification failed".
- **Updater throws "manifest not found".** The `latest.json` step
  failed or didn't run — check the workflow logs for the tag's
  `release` job. Manual workaround: download the manifest from the
  workflow artifacts and upload it to the release by hand.
- **Updater throws "version is equal".** The bumped version in
  `tauri.conf.json` doesn't match the tag. Tauri compares the
  running version against `manifest.version`; equal is treated as
  no update.
- **Users on the old version see SmartScreen / Gatekeeper warnings**
  on the first launch of an updated installer. This is OS-level
  installer signing — distinct from Tauri updater signing — and is
  separate work documented in `BUILD.md`.

## Why GitHub Releases?

We picked this channel because the repo is already the source of
truth, the CI matrix already produces the right artifact shapes, and
adding an external host (S3, R2, a managed service) would mean one
more credential to rotate and one more piece of infrastructure to
keep alive. GitHub Releases is free, public-readable, signed at the
transport layer, and gives every user a downloadable mirror of every
previous release without extra work.

If we ever outgrow this — say, the user base wants delta updates or
gradual rollout — moving the endpoint is a one-line change in
`tauri.conf.json`. Until then, this is the simplest thing that works.
