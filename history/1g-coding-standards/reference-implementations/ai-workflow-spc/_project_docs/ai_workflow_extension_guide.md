# AI Workflow Extension Guide

This doc captures the architecture, assumptions, and gotchas an AI coding agent needs when extending the Binary-Blender workflow orchestrator with new MCP components, QC logic, or module types.

## 1. Environment & Setup

- **Languages / runtimes**
  - Python **3.11+** (matches `python:3.11-slim` base image).
  - Node **18 LTS** (UI is vanilla Vue + Axios; Node used for lint/build tooling).
  - npm **9+** or pnpm **8+**.
- **Recommended local stack**
  - Postgres 14+ (local docker compose or managed instance). Default connection string: `postgresql://postgres:postgres@localhost:5432/workflow`.
  - Redis optional (not currently used, but plan for caching).
  - Docker Desktop for parity with Fly remote builds.
  - Fly.io CLI (`flyctl`) for deploys (`flyctl deploy --remote-only`).
- **Bootstrap commands**
  ```bash
  python -m venv .venv && source .venv/bin/activate
  pip install -r requirements.txt
  npm install --prefix frontend
  alembic upgrade head
  python seed_workflows.py   # provides starter workflows/QC tasks
  ```
- **Example `.env` (drop in repo root)**
  ```env
  DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/workflow
  AKOOL_API_KEY=akool-test-123456789
  DALLE_API_KEY=sk-test-dalle-abcdef
  MCP_SERVERS_PATH=./mcp_servers
  LOG_LEVEL=INFO
  ```
  Fly deployment injects secrets via `flyctl secrets set`.
- **Sandbox MCP credentials**
  - **Akool**: use `AKOOL_API_KEY` from 1Password item “Akool Sandbox (Workflow)”.
  - **DALL·E**: `DALLE_API_KEY` from 1Password item “OpenAI Image Sandbox”.
  - Store keys in `.env` locally; in Fly set via secrets.

## 2. Top-Level Architecture

- **Frontend builders**
  - `frontend/builder.html` is the primary Studio. Vue-based, row/step builder with `workflowRows`.
  - Legacy/simple builders live in `frontend/index_workflow.html`, `workflows.html`, etc. Prefer the main builder for new features; keep parity if those experiences must remain.
  - Module palette populated from static categories + MCP discovery (`fetchInstalledMCPServers` → `integrateMCPServersIntoPalette`).
  - Each module instance stores `config` (module-specific schema) and `inputConfig` (explicit wiring via `serializeInputConfig`).

- **Backend**
  - FastAPI app in `src/main_workflow_db.py` (production DB-backed) and `src/main_workflow.py` (legacy demo). Work primarily with the DB version.
  - Execution uses `src/engine/workflow_engine_db.WorkflowEngine`. Asset-centric pipeline: each module’s `execute_with_asset_ids` fetches assets, calls legacy logic (`execute`), then persists outputs back as assets.
  - Assets, workflows, executions stored via SQLAlchemy repositories in `src/database`.
  - MCP integration via modules in `src/modules/mcp_*` and server configs under `mcp_servers/`.

## 3. Module Contracts

### Base Expectations
Every module extends `BaseModule` and must:
- Define metadata via `get_definition` (type, inputs, outputs, config schema).
- Implement `execute` (legacy signature) or override `execute_with_asset_ids` for full asset-centric behavior.
- When returning outputs from `execute`, asset creation is handled automatically by the base class. Return either existing asset IDs or objects with `url`, `type`, `provider`, etc.

### Inputs & Outputs
- Inputs declared in `ModuleDefinition.inputs` are **semantic**; actual wiring occurs via connections and/or `input_config`.
- Asset-centric engine passes `input_asset_ids` keyed by connection target names. Modules fetch via `self.fetch_assets`.
- Consistency is critical: if a module advertises an output key (e.g., `images`, `videos`), builder(s) and existing workflows must use those names. Avoid silent remapping; instead migrate workflows or document the change.

### Module Template & Scaffolding

- Use `src/modules/example_module.py` as the canonical starter. It shows imports, `get_definition`, asset-centric `execute_with_asset_ids`, and builder registration notes.
- Boilerplate flow:
  1. Copy `example_module.py` → `my_new_module.py`.
  2. Update metadata: `type`, `name`, inputs/outputs, config schema.
  3. Implement custom logic inside `execute` or `execute_with_asset_ids`.
  4. Register palette entry + config UI in `frontend/builder.html`.
- CLI helper (planned): `./pen-cli add-module my_new_module --type mcp`  
  This command scaffolds the module file, updates the MCP registry, and inserts builder entries automatically.

### MCP Modules
- Each MCP tool has a module wrapper (e.g., `MCPAkoolModule`, `MCPAkoolVideoModule`, `MCPDalleModule`).
- MCP registry (`src/mcp/registry.py`) describes server command/env. Modules call MCP tools via `MCPClient`.
- When adding a new MCP tool:
  1. Register it in the registry with command/env.
  2. Create a module class with config schema mirroring tool parameters.
  3. Ensure output asset metadata includes provider + provider metadata for QC/auditing.
  4. Update builder palette logic if the module belongs to a new category.

### QC Modules
- `QCModule` (`src/modules/qc_module.py`) pauses execution and requires manual pass/fail review.
- Accepts inputs from `images`, `videos`, or `default`; collects assets into QC tasks and sets `should_pause` in the execution context.
- When adding new QC variations:
  - Ensure module outputs (e.g., `approved_videos`) are consistent and builder connections updated.
  - Update QC UI/handlers (see `frontend/qc.html`, QC REST endpoints in `main_workflow_db.py`).

## 4. Builder Wiring Rules

Key helpers in `frontend/builder.html`:
- `moduleInputs`: defines required `inputConfig` slots per module type (`qc_review` expects `images`, `mcp_akool_video` expects `images`, etc.).
- `getOutputKeyForInput` and `getDefaultOutputKey`: map module types to their output keys so selectors auto-populate.
- Auto-connection logic (when saving) loops through rows and connects every module in row N to every module in row N+1. It infers `from_output`/`to_input` based on module types; update this logic when introducing module types with different IO semantics.
- Input selectors persist explicit `input_config` per module; these override auto connections during execution (see `_resolve_configured_inputs` in the engine).

**Recommendation:** When adding new modules, always:
1. Declare their output keys in `getOutputKeyForInput` / `getDefaultOutputKey`.
2. Update auto-connection rules if they require special handling.
3. Extend `moduleInputs` so input selectors (UI) can reference upstream modules explicitly.

### Data-Flow Mapping (Builder → Engine → DB)

| Stage | Example |
| --- | --- |
| Builder Input | User selects “Akool Image” as input source via `module_output_selector`. |
| Stored Config | `workflow_modules.input_config` stores `{ "images": { "module_output": { "module_id": "module_1", "output_key": "images" } } }`. |
| Engine Resolve | `_resolve_configured_inputs` maps this to concrete asset IDs from `module_outputs`. |
| Asset Fetch | `BaseModule.execute_with_asset_ids` calls `self.fetch_assets(asset_ids)` to hydrate metadata. |
| Module Logic | `execute` processes hydrated assets, generates new ones. |
| Persistence | `AssetRepository.create` stores new URLs/provider metadata and returns asset IDs to downstream modules. |

**Example JSON snippets**

- `workflow_modules.input_config`:
  ```json
  {
    "images": {
      "module_output": {
        "module_id": "module_1762498536188_3c9a3309",
        "output_key": "images"
      }
    }
  }
  ```
- Execution record fragment (`workflow_executions.execution_data`):
  ```json
  {
    "module_outputs": {
      "module_1762498536188_3c9a3309": {
        "images": ["asset_56578ec9"]
      }
    }
  }
  ```
- Asset row (simplified):
  ```json
  {
    "id": "asset_56578ec9",
    "workflow_execution_id": "exec_11c1822a",
    "type": "image",
    "provider": "mcp_akool",
    "provider_metadata": {
      "mcp_server": "akool",
      "tool": "generate_image",
      "aspect_ratio": "16:9"
    }
  }
  ```

## 5. Execution Flow, Logging & Debugging

- Engine executes level-by-level (topological order). Each level can have multiple modules; concurrency is managed via async tasks.
- QC/A/B modules pause execution by setting `context["should_pause"]` and returning without storing outputs. When resumed, engine replays levels but skips modules already in `module_outputs`.
- Persisted state resides in execution DB record (`execution.execution_data["module_outputs"]`).
- When modifying pause/resume behavior, ensure:
  - Execution context includes necessary metadata (e.g., `current_qc_task_id`, `qc_results`).
  - Resume paths check for existing results before pausing again (see AB testing QC flow).

### Logging Standards

- Use module-level loggers via `logging.getLogger(__name__)`.
- Prefer structured helper methods on `BaseModule`: `_log_info`, `_log_warning`, `_log_error`.
- Message format: `[MODULE:<type>] [STEP:<i>] [ASSET:<id>] <message>` (include whichever tags make sense).
- Enable verbose logging locally: set `LOG_LEVEL=DEBUG` and run `uvicorn src.main_workflow_db:app --reload --log-level debug`.
- **Log destinations**
  - Local: stdout + `logs/workflow_engine.log` (if configured).
  - Fly.io: `fly logs` (aggregated); also visible in Fly dashboard “Logs”.
- For long-running MCP jobs, log both MCP request args and response metadata to help trace failures.

## 6. Testing & Quality Gates

- **Unit tests**
  - Place in `tests/modules/test_<module>.py`.
  - Use `pytest` with `pytest-asyncio` for async modules.
  - Fixtures: `async_client` (FastAPI test client), `mock_asset_repo` (see `tests/conftest.py`).
  - Example:
    ```python
    @pytest.mark.asyncio
    async def test_example_module_forwards_assets(mock_asset_repo):
        module = ExampleModule("module_1", {"note": "hi"})
        module._set_asset_repo(mock_asset_repo)
        outputs = await module.execute_with_asset_ids({"images": ["asset_1"]}, {})
        assert outputs["images"] == ["asset_1"]
    ```
- **Integration tests**
  - Target workflows: `pytest -m "integration" tests/integration/test_workflows.py`.
  - Spin up ephemeral Postgres (Docker) and run `alembic upgrade head` before tests.
- **Manual acceptance**
  - Run workflow via builder UI, confirm QC pause/resume, inspect assets table.
  - Use `tests/manual/checklist.md` if available (create if not).

## 7. MCP Discovery & Schema Handling

- `GET /mcp/installed-servers` sample response:
  ```json
  {
    "servers": [
      {
        "id": "akool",
        "name": "AKOOL MCP",
        "category": "image_generation",
        "icon": "🎨",
        "tools": [
          {
            "name": "generate_image",
            "schema": { "...": "..." }
          },
          {
            "name": "image_to_video",
            "schema": { "...": "..." }
          }
        ]
      }
    ]
  }
  ```
- Tool schema example (`image_to_video`):
  ```json
  {
    "type": "object",
    "properties": {
      "image_url": { "type": "string" },
      "prompt": { "type": "string" },
      "video_length": { "type": "integer", "enum": [5, 10] }
    },
    "required": ["image_url", "prompt"]
  }
  ```
- If a server lacks full JSON Schema, extend `src/mcp/registry.py` with overrides (e.g., `schema_overrides` dict) so builder can render forms.
- Metadata caching: store responses in memory during app lifetime; consider persisting to Redis if cold-start latency becomes problematic.

## 8. QC Module Extensibility

- **Decision types**: extend `QCDecision` model (FastAPI schemas) + frontend QC UI to support multi-select, scoring, or annotations. Store extra fields in `qc_tasks.reviewer_decision` JSON.
- **Database tables**: QC tasks recorded in `qc_tasks`, individual decisions in `qc_decisions` (see `src/database/models.py`).
- **Pause/resume**: QC module sets `execution_context["should_pause"]`; engine serializes `execution_data["module_outputs"]` before pausing. On resume, `qc_results` is injected into module context.
- **Resume API payload** (`POST /qc/decision`):
  ```json
  {
    "task_id": "qc_abcd1234",
    "decisions": [
      { "asset_id": "asset_1", "decision": "pass" },
      { "asset_id": "asset_2", "decision": "fail" }
    ]
  }
  ```
  Backend updates asset states and resumes workflow.

## 9. Asset Repository Standards

- **Storage layout** (logical): `/assets/<type>/<workflow_id>/<module_id>/<asset_id>`. Physical storage currently remote (URLs to Akool/DALL·E); if local caching added, follow this convention.
- **Provider metadata examples**
  ```json
  {
    "provider": "mcp_akool",
    "provider_metadata": {
      "mcp_server": "akool",
      "tool": "generate_image",
      "aspect_ratio": "16:9",
      "generation_time": 23.5
    }
  }
  ```
  ```json
  {
    "provider": "mcp_akool_video",
    "provider_metadata": {
      "mcp_server": "akool",
      "tool": "image_to_video",
      "resolution": "720p",
      "task_id": "690dfe2e116f5b655986a4b1"
    }
  }
  ```
- **Derived asset naming**: `asset_<hex>`, but include `source_asset_ids` metadata to trace lineage (already handled in BaseModule).
- **Purge policy**: rejected assets are flagged via `AssetState.REJECTED`. Implement cleanup cron (future) to delete rejected assets older than X days; configuration stub lives in `cleanup_stuck.py`.

## 10. Builder UI Extension Hooks

- **Insert new module configs**: extend `moduleCategories`, `moduleConfigs`, and `moduleInputs` inside `frontend/builder.html`. Config panel is rendered dynamically from these structures.
- **Vue state mapping**
  - `workflowRows` → rows displayed on canvas.
  - Each module maintains `config` + `inputConfig`.
  - `moduleInputs` declares which inputs appear in config panel; `initializeInputConfig` seeds defaults.
- **Adding custom field**
  ```js
  moduleConfigs.my_module = {
    quality_mode: {
      type: 'select',
      label: 'Quality Mode',
      options: [
        { value: 'fast', label: 'Fast' },
        { value: 'best', label: 'Best' }
      ],
      default: 'fast'
    }
  };
  ```
- Include screenshots/markup references in `_project_docs/job_instruction_workflow_guide_final.md` if visual context is needed.

## 11. Deployment & Ops

- **Logs & QC monitoring**: use `/executions` and `/qc/tasks` endpoints or UI tabs in builder. Fly logs via `fly logs -a ai-workflow-spc`.
- **Fly troubleshooting**
  - Common: “not listening on 0.0.0.0:8000” warning → update `start.sh` to bind 0.0.0.0 if necessary.
  - Restart stuck machines: `fly machine restart <id>`.
  - Scale: `fly scale count 2`.
- **Backups**
  - Database: schedule nightly `pg_dump` to S3. (TODO: document actual job).
  - Assets: external providers host originals; if local caching added, sync to object storage.
- **Versioning**
  - Tag releases `vYYYY.MM.DD` (e.g., `v2025.11.07`).
  - Keep changelog in `_project_docs/continuation_brief.md`.

## 12. AI-Agent Onboarding Checklist

Before extending workflows:

1. Read `continuation_brief.md`.
2. Inspect `src/modules/` (understand existing module patterns).
3. List current MCP servers: `curl http://localhost:8000/mcp/installed-servers`.
4. Scaffold a new module from `example_module.py` (or via `./pen-cli add-module ...` when available).
5. Add builder entries + configs.
6. Run unit/integration tests.
7. Deploy with `flyctl deploy --remote-only`.
8. Validate QC + A/B flows in the UI.

Document findings back into `_project_docs` so future agents inherit context.

- Assets stored via `AssetRepository`. Each asset captures:
  - `type` (image, video, etc.)
  - `provider` (e.g., `mcp_akool`, `mcp_dalle`, `mcp_akool_video`)
  - `provider_metadata` (tool name, parameters, timing)
  - `quality_metrics` (used by QC/A/B analysis)
- When adding outputs, include sufficient metadata for auditing and QC display (URLs, thumbnails, prompts).
- For A/B or QC modules that compare providers, ensure upstream modules set `provider` and `provider_metadata`. Missing metadata leads to empty provider lists, causing errors like “requires outputs from at least 2 providers”.

## 6. Adding New MCP Components

1. **Define Module**
   - Create `src/modules/<new_module>.py`.
   - Implement config schema mirroring tool settings.
   - Ensure `execute` builds MCP tool arguments and handles responses (image/video/text). Convert responses into asset dicts.

2. **Register MCP Server**
   - Update `src/mcp/registry.py` with server command/env.
   - If tool sits in an existing server, just expose the new tool name inside the module.

3. **Update Builder**
   - Add module entry to `moduleCategories` (or rely on MCP discovery if server returns metadata).
   - Map input requirements via `moduleInputs`.
   - Update `getOutputKeyForInput`/`getDefaultOutputKey` with new input/output keys.

4. **Update Frontend Forms**
   - Provide configuration UI for module fields inside builder (moduleConfigs object).
   - Ensure `inputConfig` selectors allow explicit wiring (set `input_type`, `input_name`, etc.).

5. **Testing**
   - Run local workflow with new module.
   - Verify asset metadata and QC/A/B flows still operate (providers recognized).

## 7. Adding New QC Checks

Options:
- Enhance existing `QCModule` to support additional media types (already handles images/videos). Extend by:
  - Accepting new inputs (e.g., `audio`, `documents`).
  - Storing extra metadata for reviewers.

- Create specialized QC modules (e.g., video-specific).
  - Provide unique output keys (`approved_videos`).
  - Update builder + engine to expect those keys.
  - Integrate with QC UI endpoints (`/qc/review`, etc.).

Remember to update:
- `moduleCategories` (Quality Control section).
- QC UI pages (`frontend/qc.html`) to render new metadata fields.
- Backend QC APIs if new decision types or data structures are introduced.

## 8. Error Patterns & Troubleshooting

- **Missing inputs**: Engine logs “Module X has N connections but no inputs!” and lists missing outputs. Typically indicates mismatched output names.
- **A/B provider count = 0**: Upstream modules didn’t set `provider` or outputs weren’t wired. Ensure modules return asset dicts with provider info and connections reference correct output keys.
- **QC skipped**: QC module receives empty input map. Verify builder wiring sends `videos`/`images`, and that module accepts the corresponding inputs (update `moduleInputs` & `inputConfig` definitions).
- **Fly deploy warnings**: App currently listens on whatever `start.sh` config provides. Fly warns about 0.0.0.0:8000 but deployment still succeeds; optionally adjust server bind address if needed.

## 9. Deployment Notes

- Deployment command: `flyctl deploy --remote-only`.
- CLI needs write access to `~/.fly`; when running inside restricted environments, use escalated permissions.
- Environment-specific config (API keys, DB URLs) supplied via Fly secrets.

## 10. Future Enhancements Checklist

When implementing new MCP/QC features, ensure you:

1. **Define module metadata** (type, inputs, outputs, config schema).
2. **Update builder UI** (palette entry, config form, input selectors).
3. **Handle connections** (auto connection rules + `moduleInputs`).
4. **Populate provider metadata** for analytics/QC.
5. **Add QC/A/B compatibility** (if module outputs should be reviewable).
6. **Write doc updates** describing new modules and expected IO keys.
7. **Deploy via Fly** and watch logs for wiring errors.

Keeping this checklist and the IO naming consistent prevents regressions like “A/B requires 2 providers” or QC skipping outputs. Use this doc as a living reference whenever module contracts evolve.
