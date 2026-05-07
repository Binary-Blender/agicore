# AI Workflow SPC → MelodyLMS Transfer Notes

This document captures the patterns from `ai-workflow-spc` that we can reuse to turn the MelodyLMS AI Studio into a full asset factory (lyrics ➜ visuals ➜ human QC ➜ publishable modules).

---

## 1. Asset Repository Architecture

- **Schema (src/database/models.py:298+)**
  - `assets` table stores *every* creative output (image/video/text/audio) with: `type`, `url`, `prompt`, JSON `asset_metadata`, `state` (`unchecked/approved/rejected`), optional `text_content`/`payload`, provider + quality metrics, full lineage (`workflow_id`, `execution_id`, `module_id`, `source_asset_ids`), plus tags/collection folders.
  - `asset_collections` provide lightweight folders and parent-child nesting for “campaigns” or “lesson builds”.
  - QC tables (`qc_tasks`, `qc_decisions`) track human review requests and outcomes per asset.
- **Repository API (src/database/repositories.py:248+)**
  - Async CRUD with helper filters: state, collection, type, tags (`any` vs `all`), sort order. `create_many` batches asset inserts so modules can dump multiple candidate videos quickly.
  - Inline asset caching (`src/utils/asset_cache.py`) keeps recently fetched rows in-memory to avoid repeat SQL hits during multi-step workflows.
- **HTTP endpoints (src/main_workflow_db.py:1301+)**
  - `/assets`: list/filter (approved, unchecked, rejected, tagged, in collection, etc.).
  - `/assets/{id}/archive`, `/assets/manual`, `/assets/move`, `/asset-collections/*`: admin tools to curate or re-home assets after QC.
- **Storage observation**
  - There’s no direct S3 client in code; modules store provider CDN URLs (Akool, DALL-E). The `.env.example` shows AWS vars as future work. We can map that to our existing `backend/src/utils/s3.ts` implementation so Melody assets land in our bucket + CloudFront.

**Takeaway for MelodyLMS:** mirror this data model for “training content assets” so every generated lyric sheet, overlay phrase set, video render, and PDF sits in one repository with lineage and QC state. The same table can power re-use (“drop yesterday’s best HIPAA chorus into a new module”) and analytics.

---

## 2. Asset-Centric Module Pattern

- **BaseModule (src/modules/base.py)**
  - `execute_with_asset_ids()` orchestrates the legacy modules using only asset IDs. It fetches inputs via `fetch_assets()`, runs the module, and automatically calls `create_asset()` for any outputs that contain URLs so all lineage/provider metadata stays consistent.
  - Metadata captured for each new asset: prompt, provider, provider metadata (tool name, settings), quality metrics, and `source_asset_ids` (ids of upstream inputs). That makes it trivial to show “this lyric video came from prompt X, using Akool tool Y, based on asset Z”.
  - Execution context collects `generated_assets` so downstream QC modules and dashboards already know what needs review.

**Takeaway:** when we add visual/audio builders inside MelodyLMS, wrap them in a module interface that (a) only receives asset IDs, (b) emits new asset IDs, and (c) auto-populates metadata + lineage. That keeps the system composable (lyrics ➜ overlays ➜ video) and unlocks QC without custom glue each time.

---

## 3. Image & Video Generation Components

- **MCP DALL·E module (src/modules/mcp_dalle_module.py)**
  - Uses MCP (Model Context Protocol) for provider abstraction. Config schema exposes prompt, size, quality, style, API key override.
  - Iterates per request, calls MCP tool `generate_image`, and for each output builds an asset payload with `provider_metadata` (`mcp_server`, `tool`, size, quality, revised prompt) and `quality_metrics`.
- **AKOOL image-to-video module (src/modules/mcp_akool_video_module.py)**
  - Accepts a list of image assets, runs MCP tool `image_to_video` with concurrency throttling, and clones metadata such as resolution, video length, audio type.
  - `_create_video_asset` sets `type="video"`, `state="unchecked"`, and stores the originating image URL plus video settings so QC reviewers know the context.
- **Common patterns**
  - Config schemas are declarative JSON for the builder UI.
  - Provider-specific settings are preserved in `provider_metadata` for transparency and debugging.
  - Execution context retains generated assets awaiting QC, so no separate lookup is needed when a review task fires.

**Takeaway:** for MelodyLMS upgrades we can:
1. Introduce a “Visual Track Builder” module that wraps Suno/Sora/Runway/Akool style APIs and emits video assets into the repo.
2. Keep provider metadata + prompts so future regenerations or A/B tests are reproducible.
3. Provide the AI Studio UI with structured config forms (prompt, resolution, style, reference PDF, etc.) similar to these schemas.

---

## 4. Human QC Pipeline

- **QC module (src/modules/qc_module.py)**
  - When a module reaches QC, it creates a `QCTask`, stores it in the execution context, injects it into a global `qc_queue`, and sets `should_pause`/`pause_reason="awaiting_qc"`. The workflow engine persists that state and halts until reviewers respond.
  - Upon resume, the module reads `qc_results`, marks assets approved/rejected, and can trigger retries based on `failAction`, `max_retries`, `retryStep`.
- **QC endpoints (src/main_workflow_db.py:1072–1298)**
  - `/qc/tasks` aggregates pending work, enriching each asset with provider/tool names so reviewers know what they’re judging.
  - `/qc/tasks/{id}/review` accepts batch decisions, updates asset states, records `QCDecision` rows, and resumes the paused execution.
  - `/qc/tasks/{id}/dismiss` lets admins cancel a QC queue entry and mark the execution as failed.
- **Progressive sampling engine (src/main_simple.py:63–220)**
  - `QCEngine` automatically adjusts sampling rate per provider using pass rate + total volume (100% for new workflows down to 5% once quality is proven), and logs the Cpk-style capability metric. This feeds the QC UI so humans see why they’re reviewing a subset.

**Takeaway:** MelodyLMS can adopt a similar pause/resume flow:
1. After AI Studio generates lyric videos/overlays, push them into a QC task instead of auto-publishing.
2. Give admins a single QC console for all pending training assets (policy PDFs, lyric sets, video cuts, overlays).
3. Optionally re-use the progressive sampling logic to reduce manual review once a content pipeline proves stable.

---

## 5. Suggested Applications for MelodyLMS

1. **Central Asset Store**
   - Create a `training_assets` table mirroring `assets` (type/url/state/provider metadata/lineage).
   - Use our existing S3 utilities to persist uploads, but keep CDN/public URLs + metadata just like ai-workflow-spc.
   - Surface assets inside the admin UI (filter by module, tag, QC state) for re-use or manual edits.

2. **Module-Oriented AI Studio**
   - Refactor the current lyric + overlay generation into modules that emit asset IDs.
   - Add new modules for: “Policy Summaries” (text), “Visual Track Generation” (video), “Overlay Animator” (short 3–5 word motion graphics).
   - Compose modules into repeatable workflows: PDF ➜ Text Summaries ➜ Lyrics ➜ Overlay Phrases ➜ Video ➜ QC ➜ Publish training module.

3. **Human QC Hub**
   - Add `/api/qc/tasks` and `/api/qc/review` endpoints similar to the reference to keep humans in the loop.
   - Drive the QC dashboard from the asset repo so reviewers can approve lyric text, overlay lists, and final videos before they attach to a training module.
   - Track sampling metrics (pass rate, auto-approval thresholds) to prove to compliance teams that the process is statistically controlled.

4. **Provider Telemetry**
   - Store provider metadata + quality metrics for every generation. This makes it easy to answer “Which visual style gets approved 95% of the time?” or “Which policy topics need more manual rewrites?” for future strategy decks.

Adopting these patterns will turn the MelodyLMS AI Studio into a full content factory: assets are versioned, reviewable, and traceable end to end, and we gain the composability needed to generate multi-genre videos with human oversight. Use this doc as the design reference when we start building the asset repository + QC flows.***
