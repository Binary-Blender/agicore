# AI Workflow SPC – Continuation Brief

**Last updated:** 2025-11-07  
**Author:** AI coding agent (ChatGPT Codex)

This document captures the current state of the Binary Blender “ai-workflow-spc” project so future AI agents can resume work quickly.

---

## 1. Product Vision & UX Guardrails

- **Mental model:** “Make.com for MCP components,” presented as top-to-bottom job instructions (no node graph). Steps execute sequentially; modules in a step run in parallel.
- **Palette:** Modules are grouped by category (Flow Control, Image Generation, QC, etc.) and dragged into rows. Rows equate to steps.
- **Color scheme:** Bright blue / yellow / white. Avoid dark theme.
- **Input sourcing:** Every module should explicitly choose upstream outputs or asset repo inputs. No implicit “previous module” default (especially for QC). Input resolution order card has been removed; configuration happens inline per field.
- **QC:** Human-in-the-loop checkpoints are core. QC screens must clearly show which module output they’re reviewing.

## 2. Data & Architecture

- **Backend stack:** FastAPI app (`src/main_workflow_db.py`) with PostgreSQL via SQLAlchemy async session + Alembic migrations. Workflow data lives in tables `workflows`, `workflow_modules`, `workflow_connections`, `assets`, etc.
- **Workflow execution:** `src/engine/workflow_engine_db.py` orchestrates level-by-level execution, now using asset-centric execution (modules interact via asset IDs).
- **Input config:** `workflow_modules.input_config` (JSONB) describes explicit input sources. Both builder and engine respect this.
- **MCP integration:**
  - MCP registry (`src/mcp/registry.py`) tracks available servers.
  - Custom MCP servers live in `/mcp_servers`. Current Akool wrapper now exposes two tools: `generate_image` and `image_to_video`.
  - Modules like `mcp_akool_module.py` and `mcp_akool_video_module.py` invoke those MCP tools via `src/mcp/client.py`.

## 3. Recent Changes (2025-11-07 session)

1. **Input Source UX**
   - Removed generic “Input Resolution” panel.
   - Added inline module-output selectors for QC Review and Akool Image→Video modules. A/B testing module has two selectors with mutual exclusion logic.
   - Builder auto-wires connections via `getDefaultOutputKey` / `getDefaultInputKey` instead of string heuristics, ensuring A/B winners feed video modules correctly.

2. **Akool Video Support**
   - `mcp_servers/akool/server.py` now wraps Akool’s Image-to-Video API (`/v4/image2Video/createBySourcePrompt`). Handles polling (`resultsByIds`) and returns a `video` content item.
   - `MCPAkoolVideoModule` enforces Akool’s parameter rules (audio type, duration, optional effect code) and sends the new `image_to_video` MCP tool call.
   - Video assets are stored with `state="N/A"` so the repository treats them as usable without QC.

3. **Asset Repo UI**
   - `/asset-repository` now displays both images and videos. Video cards auto-play muted previews; the lightbox shows either `<img>` or `<video controls>`.
   - Fetches only “approved” assets, but backend now interprets `state==approved` as both “approved” and “N/A” to include video outputs.
   - Asset loader module lets workflows pull previously generated assets directly into new runs, paving the way for cross-workflow reuse and caching.

4. **MCP Hub + Builder**
   - `/mcp/installed-servers` endpoint now enumerates registered MCP servers and auto-discovers their tool schemas (input JSON schema included per tool).
   - MCP Hub marketplace pulls the live list, showing real tools per server instead of static lorem ipsum cards, and installation state is now persisted so install/uninstall adds or removes those tools from the builder palette.
   - Workflow builder palette instantiates the universal `mcp` module per *tool*, and the config panel renders fields directly from the selected tool’s schema (auto-builds prompts, enums, booleans, etc.). API keys can be overridden per module without hand-writing JSON, and the server/tool pairing now shows as immutable labels so modules are always single-tool.
   - Palette categories now flow through a toolbar preset scaffolding so we can swap between coding/video presets in a future iteration without rewriting the builder.
   - Generic MCP modules now store tool metadata in execution results so downstream inputs can treat MCP outputs as typed ports (`images`, `videos`, `text`, etc.), keeping QC/video wiring accurate.
   - QC reviewer UI uses radio-style pass/fail buttons with explicit tool/server labels, making manual selections clearer.
   - Asset repository detects video assets (even legacy ones that only expose `.mp4` URLs) and plays them inline; new assets are persisted with the correct `type`.

5. **2025-11-07 (later pass) – A/B Testing & QC polish**
   - Builder now prefixes every module name with its `row.column` position (e.g., `3.2 AKOOL Image to Video`) both on the workflow cards and inside module-output dropdowns. The same label is baked into execution context so downstream logs/QC tasks can differentiate parallel modules from the same provider.
   - The A/B testing module now treats “provider:module_id” (or source slot) as the unique variant key, so two Akool video generators can be compared without tripping the “one provider” error.
   - QC assets created post-change store `module_label`, enabling reviewer UIs to show human-readable provenance.
   - QC queue now renders video comparison items with `<video controls>` instead of forcing image tags, and backend filters out non-video assets when building A/B comparison tasks (fixes the stray image appearing in the queue).
6. **2025-11-08 – Asset Repository Folders**
   - Added `asset_collections` table plus ORM relationships so assets can live inside hierarchical folders. Assets now carry `collection_id` and we expose CRUD for folders (`GET/POST/PATCH /asset-collections`) and a bulk move endpoint (`POST /assets/move`).
   - Asset repository UI now has a folder sidebar (All / Unassigned / nested folders) with counts, folder creation form, and a “Move Selected” modal so reviewers can classify assets without leaving the page. Selection persists across refreshes until an action completes.
   - Introduced `/assets/manual` for quickly seeding approved assets (used by tests and hopefully future uploads). Tests updated to cover the new API contract and ensure assets really move between folders.

## 4. Key Files to Know

| Area | Files |
| --- | --- |
| Frontend (Vue, pure HTML) | `frontend/builder.html`, `frontend/assets.html`, `frontend/workflows.html`, etc. |
| Backend API | `src/main_workflow_db.py`, `src/api/*`, `src/database/*`, `src/models/*` |
| Workflow engine | `src/engine/workflow_engine_db.py`, `src/modules/*` |
| MCP | `src/mcp/*`, `mcp_servers/*` |
| Deployment | `fly.toml`, `run.sh`, `start_backend.sh` |

## 5. Deployment & Runtime Notes

- **Deploy command:** `flyctl deploy --remote-only` from repo root.  
- **Runtime warnings:** Fly shows “not listening on 0.0.0.0:8000” because uvicorn binds to 0.0.0.0:8000; ignore (smoke tests still pass).
- **API keys:** Akool (image + video) requires `AKOOL_API_KEY`. Video also supports per-module API key overrides.

## 6. Outstanding Work / Next Steps

1. **Type-aware routing + outputs:**  
   - Builder now captures tool schemas but still treats all `mcp` outputs as generic `results`. Need a type-mapping layer so downstream inputs (e.g., QC expecting `images`) only show compatible MCP modules, ideally driven by tool metadata or declared output hints.
   - Ensure paused executions reliably persist `paused_data`; some QC resumptions reported empty payloads, preventing automatic resume.

2. **Tool-driven execution metadata:**  
   - Feed the selected tool + arguments into workflow storage/analytics so cost estimates and QC screens show which MCP capability produced the asset.

3. **Asset repository filters:**  
   - Add state/type filters and searching; consider separate tabs for “Images” vs. “Videos”.

4. **Error surfacing:**  
   - Video module logs component failures but UI still shows run success. Decide whether to bubble warnings back to the execution summary / QC queue.

5. **Documentation & onboarding:**  
   - Keep this brief updated as new capabilities land. Consider a “developer README” describing local setup, key env vars, and how to run migrations/tests.

## 7. Quick Reference Commands

- **Backend dev server:** `./start_backend.sh` (uses uvicorn + reload).  
- **Migrations:** `alembic upgrade head` (check `alembic/versions/011_add_input_config_to_modules.py` as latest).  
- **Tests (if any):** `pytest` (tests folder exists but may be sparse).  
- **Akool server standalone check:** `python mcp_servers/akool/server.py` (communicates via stdin/stdout per MCP spec).

## 8. Contact / Context

- **Environment:** Windows WSL path (`/mnt/c/Users/Chris/Documents/_DevProjects/ai-workflow-spc`).  
- **Goal:** Build a standard-work style workflow editor that can orchestrate thousands of MCP modules with human QC checkpoints, all deployable on Fly.io.  

Keep pushing toward strongly typed connections, richer MCP coverage, and polished QC UX.

— End of brief —
