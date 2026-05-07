# MelodyLMS – Sprint 2025-11 Visual Asset Pipeline (Backend)
**Created:** 2025-11-16  
**Owner:** Backend AI  
**Status:** In Progress  

## Goal
Extend the AI Studio backend so admins can generate, manage, and quality-control visual assets (images/videos) tied to reminder phrases. This sprint lays the API + data foundation for the Image & Video Generation spec: prompt generation, storage, QC workflow, and static asset serving.

## Outcomes
1. Database schema for `visual_assets`, `visual_asset_qc_tasks`, and `prompt_generation_logs`.
2. File storage + static serving pipeline similar to `/songs`, with configurable `VISUAL_LIBRARY_DIR`.
3. Backend endpoints covering:
   - Prompt generation from reminder phrases (policy + lyric context).
   - Image generation via OpenAI (DALL·E) with metadata capture + QC task creation.
   - Visual asset listing, approval, rejection, deletion, and metadata edits.
4. Audit trail (prompt logs + QC tasks) surfaced through APIs for future UI integration.

## Deliverables
- Migration `021_add_visual_assets.sql` with tables + indexes defined in IMAGE_VIDEO_GENERATION_SPEC.
- New controllers/services:
  - `visualAssetController.ts` (list/create/update/delete + QC endpoints)
  - `visualPromptController.ts` or additions to `aiController` for prompt generation
  - `imageService.ts` (OpenAI image generation wrapper, file persistence)
- Routes: `/api/visual-assets/*` and `/api/ai/visual/*`.
- Static file serving for `/visuals/:moduleId/:filename` + fallback if file missing.
- Unit/integration tests covering prompt generation logic, controller happy-paths, and validation (where practical).
- Documentation updates (`CURRENT_SYSTEM_STATE.md`, `BACKEND_API_REFERENCE.md`) summarizing new APIs/env vars.

## Detailed Tasks
1. **Schema Migration**
   - Implement SQL migration for the three new tables + indexes.
   - Add constraints mirroring spec (status/type enums, FK cascade rules).
2. **Storage Infrastructure**
   - Add `VISUAL_LIBRARY_DIR` resolver + static express route `/visuals`.
   - Implement file cleanup helper (mirrors `songCleanup`) for orphaned visuals.
3. **Prompt Generation API**
   - Endpoint: `POST /api/ai/visual/prompt`.
   - Input: `training_module_id`, `reminder_phrase`, optional `lyrics_override`, `policy_override`.
   - Behavior: fetch module data, generate summarized policy/lyric context, call OpenAI text model to produce prompt + negative prompt suggestions, persist record in `prompt_generation_logs`.
4. **Image Generation API**
   - Endpoint: `POST /api/visual-assets/images`.
   - Input: module reference, reminder phrase, prompt overrides, provider options.
   - Behavior: call OpenAI Images (DALL·E 3 or 2), persist file, create `visual_assets` row with `status='pending'`, enqueue QC task.
5. **Visual Asset Management APIs**
   - `GET /api/visual-assets` (filter by module/type/status).
   - `GET /api/visual-assets/pending`.
   - `POST /api/visual-assets/:id/approve` + `/reject`.
   - `PUT /api/visual-assets/:id` (edit metadata or reassign module).
   - `DELETE /api/visual-assets/:id`.
6. **QC + Logging**
   - Ensure QC tasks update when assets approved/rejected/deleted.
   - Return QC metadata with list endpoints for UI.
7. **Testing**
   - Add targeted tests (Jest or existing framework) for prompt generation utility + controller validation flows (can use mocked OpenAI client).
   - Add manual verification checklist in DEPLOYMENT_LOG when deployed.
8. **Docs & Env**
   - Update `_project_docs/CURRENT_SYSTEM_STATE.md` + `BACKEND_API_REFERENCE.md`.
   - Document new env vars (OPENAI_IMAGE_MODEL?, VISUAL_LIBRARY_DIR).
   - Add runbook notes if special setup required.

## Acceptance Criteria
- Admin can hit new APIs to generate prompts/images and retrieve assets through Postman/curl.
- Visual assets saved to disk and streamable at `/visuals/...`.
- QC queue endpoints reflect pending image assets after generation; approving moves them to `approved`.
- Prompt logs record every generation request with context.
- Tests & lint pass, and Fly deployment instructions captured in `DEPLOYMENT_LOG`.

