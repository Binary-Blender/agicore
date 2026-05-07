# Sprint 7: Action Ledger Automation & Health Insights

**Duration:** mid-December 2025 (5 development days)
**Objective:** Turn the strategic action ledger into a first-class workflow artifact with lifecycle automation, ensure question/document consistency, and expose health insights so downstream agents know exactly what needs attention before they start their step.

> 📌 Frontend work (ledger UI polish, dashboards) will be delivered in Step 001. This plan covers backend tasks only.

---

## 1. Background & Constraints
- Sprint 6 introduced SSE envelopes, the ledger JSON file, and basic claim/complete APIs. The workflow currently overwrites `pending_strategic_actions` every time Step 000 runs; no persistence of who completed what or when.
- The IDE lacks a historical ledger or audit view; metrics only live in `.refrain/metrics/strategic.json`.
- Action items tied to documents (e.g., `_project_docs/current_sprint.md`) are not automatically validated when downstream agents mark them complete.
- All modifications must follow `ai_coding_guidelines.md`: deterministic services, typed models, machine-readable configs, and no “temporary” code.

---

## 2. Sprint Goals
### Primary Goals
1. **Ledger Lifecycle Automation** – Persist action history, auto-close actions when associated git commits land, and surface ledger summaries via workflow checkpoints.
2. **Question/Data Integrity** – Track confirmation steps (e.g., Step 002 verifying notebook updates) and prevent inconsistent document states when multiple agents touch the same directive.
3. **Health & Telemetry** – Provide `/api/v1/strategic/actions/summary` plus expanded `/health/strategic` data (open vs. claimed, oldest action age, sessions per day) so dashboards can highlight risks.
4. **API Hardening** – Add pagination + filters for sessions and actions, and require optimistic concurrency (version token) when mutating ledger entries.

### Secondary Goals
- Provide ledger export/import utilities (JSON to markdown) for weekly reporting.
- Expose action webhooks (write logs when actions move to `completed`).

---

## 3. Deliverables & Tasks (Backend Only)
### Task 1 – Ledger Persistence + Versions
**Files:** `backend/models/strategic_chat.py`, `backend/services/strategic_chat_service.py`, `backend/routers/strategic_ai.py`
- Extend `StrategicActionItem` with `version`, `created_at`, `completed_at`, `git_commit_hash`.
- Store ledger entries in `.refrain/strategic-actions.jsonl` (append-only) plus a `strategic-actions-current.json` snapshot for quick reads.
- Require `If-Match` style version tokens on claim/complete/cancel endpoints (include `version` field in body or header). Return `409 Conflict` when versions diverge.

### Task 2 – Workflow Integration & Auto-Close
**Files:** `backend/services/workflow_service.py`, `backend/services/strategic_chat_service.py`, `backend/services/git_service.py`
- After each Step 001/004 checkout, scan recent git commits; if commit messages include `[ACTION:ACT-XXXX]`, mark those actions `completed` automatically (record commit hash + timestamp).
- Update `WorkflowStatus` to expose `open_action_count`, `claimed_action_count`, and `oldest_action_age_minutes`.

### Task 3 – Question / Document Sync
**Files:** `backend/services/questions_service.py`, `backend/utils/questions_parser.py`, `backend/services/document_service.py`
- When a decision targets a document, log the expected file + action ID in `.refrain/strategic-actions.json`.
- Provide `POST /api/v1/strategic/actions/{action_id}/verify-document` that compares the latest file contents against the action metadata (e.g., look for inserted summary block). Return 200 if verified, 422 if missing.

### Task 4 – Health Insights & Reporting
**Files:** `backend/routers/health.py`, `backend/services/strategic_chat_service.py`, `.refrain/metrics/strategic.json`
- `/health/strategic` response shape:
  ```json
  {
    "total_sessions": 42,
    "failed_sessions": 1,
    "average_duration_seconds": 6.1,
    "open_actions": 3,
    "claimed_actions": 2,
    "oldest_action_hours": 5.5
  }
  ```
- Provide `/api/v1/strategic/actions/summary` that returns counts grouped by `assigned_step`, `status`, and `claimed_by`.

### Task 5 – Configuration & Export Tools
**Files:** `backend/app/config.py`, `.env.example`, `backend/scripts/export_actions.py`
- New env vars: `STRATEGIC_ACTION_EXPORT_PATH`, `STRATEGIC_ACTION_AUTO_CLOSE_WINDOW_MINUTES`, `STRATEGIC_ACTION_VERSION_TTL`.
- Add CLI script to export the ledger to markdown/CSV for weekly reports.

### Task 6 – Testing & Tooling
**Files:**
- `backend/tests/test_strategic_actions.py` – lifecycle (claim → complete with version checks).
- `backend/tests/test_strategic_health.py` – `/health/strategic`, summary endpoint.
- `backend/tests/test_action_autoclose.py` – verifies commit-message linking auto-closes actions.

### Out-of-Scope (later)
- Frontend dashboards.
- Email/Slack notifications.
- Multi-project ledger aggregation.

---

## 4. Definition of Done
- ✅ Ledger is append-only with versioned mutations, and APIs reject stale updates.
- ✅ Auto-close logic links git commits (via `[ACTION:]` tag) to action completion, capturing commit hash.
- ✅ `/health/strategic` + `/api/v1/strategic/actions/summary` expose actionable metrics.
- ✅ Document verification endpoint allows downstream agents to confirm that required edits landed.
- ✅ Config/README/docs updated; `.env.example` documents new knobs.
- ✅ Tests cover lifecycle, metrics, and auto-close logic.

---

## 5. Risks & Mitigations
| Risk | Impact | Mitigation |
|------|--------|------------|
| Ledger file corruption (append-only JSONL) | Lose action history | Write backup snapshot before each append; validate JSON before flush.
| Auto-close mismatch (commit references wrong action) | Prematurely closed directives | Require `[ACTION:ID]` + validation that action targets the same step as the commit’s workflow context.
| Version tokens misused by frontend | Frequent 409 conflicts | Document standard pattern; provide `GET` before mutate helper + fallback instructions.

---

## 6. Execution Order & Ownership
1. **Day 1:** Model/config updates + ledger versioning (Task 1 & 5).
2. **Day 2:** Implement action APIs with optimistic concurrency + tests (Task 1 & 6).
3. **Day 3:** Auto-close + workflow metrics (Task 2).
4. **Day 4:** Document verification + health summaries (Task 3 & 4).
5. **Day 5:** Wrap-up docs, export tool, Fly deploy.

---

## 7. Notes for Backend AI
- Keep ledger operations isolated behind helper methods; do not re-open the file directly from routers.
- Prefer JSONL for history but keep a compact snapshot for quick reads.
- Tests should mock git history when validating auto-close logic.
- Always follow `ai_coding_guidelines.md`: deterministic behaviours, verbose logging, machine-readable artifacts.

*Prepared: December 2, 2025*
