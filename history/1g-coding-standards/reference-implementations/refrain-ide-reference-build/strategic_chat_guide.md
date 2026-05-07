# Strategic AI Conversation Guide

**Updated:** November 20, 2025

The Strategic AI service powers Step 000 of the workflow. It aggregates current docs, open questions, and sprint objectives, then persists every conversation + decision to `.refrain/strategic-sessions/`. This guide explains how backend agents should interact with the new tools.

---

## Session Lifecycle
1. **Create / Continue** – Call `POST /api/v1/strategic/chat` with optional `session_id` and new user messages. The backend constructs the system prompt with `_project_docs/current_sprint.md`, `development_roadmap.md`, `technical_plan.md`, `backend_api_reference.md`, and `refrain_requirements_v2.md` (unless overridden via `STRATEGIC_ALLOWED_DOCS`).
2. **Streaming Mode** – Use `POST /api/v1/strategic/chat/stream` for SSE when you need token-level updates (workflow step 000 uses this path).
3. **Review History** – `GET /api/v1/strategic/sessions` lists sessions (filter by `status` or `step_id`). `GET /api/v1/strategic/sessions/{id}` returns the transcript, objectives, and prior decisions.
4. **Capture Decisions** – After the conversation, `POST /api/v1/strategic/sessions/{id}/decisions` to persist a `StrategicDecision`. Decisions of type `question_resolution` automatically resolve linked question IDs in `questions.md` with provenance `decided_by: strategic_ai`.

All sessions and decisions serialize to `.refrain/strategic-sessions/STRAT-*.json` for audit trails.

---

## Workflow Integration
- `WorkflowStatus.pending_strategic_actions` stores normalized actions derived from decision targets. Workflow steps 001/004 can read this array via `/api/v1/workflow/status` and use it to drive their work.
- When Step 000 runs, `WorkflowService` streams via `StrategicChatService.stream_workflow_step`, ensuring instructions, summaries, and markers are delivered before transition.
- If no decision is recorded, `pending_strategic_actions` stays empty. Downstream agents should verify this before proceeding.

### Action Ledger
- `GET /api/v1/strategic/actions` lists open/claimed/completed directives. Filter by `status` or `step_id` as needed.
- Claim work before acting via `POST /api/v1/strategic/actions/{action_id}/claim` with `{"claimed_by":"step_001"}` (or `step_004`).
- Once the directive is satisfied, call `/complete`; if superseded, call `/cancel` to remove it from the queue.
- Ledger entries live in `.refrain/strategic-actions.json` so workflow checkpoints, UIs, and future agents share the same source of truth.

---

## Configuration
Set the new environment variables in `.env` (propagated to Fly via secrets):

```env
STRATEGIC_MAX_TOKENS=2048
STRATEGIC_TEMPERATURE=0.3
STRATEGIC_SESSION_TTL_MINUTES=120
STRATEGIC_ALLOWED_DOCS=current_sprint.md,development_roadmap.md,technical_plan.md,backend_api_reference.md,refrain_requirements_v2.md
STRATEGIC_STREAM_HEARTBEAT_SECONDS=10
STRATEGIC_STREAM_MAX_SECONDS=300
STRATEGIC_ACTION_LEDGER_PATH=.refrain/strategic-actions.json
STRATEGIC_METRICS_PATH=.refrain/metrics/strategic.json
```

Adjust `STRATEGIC_ALLOWED_DOCS` if the Strategic AI should ingest additional files (comma-separated paths relative to `_project_docs/`).

---

## Testing & Extensibility
- Unit tests: `backend/tests/test_strategic_chat_service.py` cover session creation, persistence, decision logging, and question resolution.
- API smoke tests: `backend/tests/test_strategic_router.py` validate the new FastAPI surface.
- Future work: extend `DecisionAction` statuses when downstream steps complete an action, and surface session summaries on the dashboard.

### Streaming Envelope & Metrics
- `/api/v1/strategic/chat/stream` emits SSE frames with `session_id`, `type`, and `chunk_index` so the UI can maintain multiple live sessions simultaneously. Heartbeats fire every `STRATEGIC_STREAM_HEARTBEAT_SECONDS` to keep Fly Connections alive.
- Session metrics (duration, chunk count, failures) are persisted to `.refrain/metrics/strategic.json` and exposed via `GET /health/strategic` alongside the open-action count.

Use this guide whenever you need to extend or troubleshoot the Strategic AI workflow link.

---

## Frontend Panel (Step 001)
- The "Strategic Chat" panel now lives on the dashboard’s right column (Next.js app). It lets you:
  - Start a new session or resume an existing one via the session dropdown.
  - Send objectives + prompts to the Strategic AI using `/api/v1/strategic/chat` and stream live responses via `/api/v1/strategic/chat/stream`.
  - Review transcripts + decisions inline for the selected session.
  - Capture decisions directly in the UI (summary, related questions, document targets, assigned workflow step) which POST to `/api/v1/strategic/sessions/{id}/decisions` and immediately update `questions.md` + workflow checkpoints.
- The panel also surfaces the Strategic Action Ledger, allowing agents to claim, complete, or cancel directives using the new `/strategic/actions/*` endpoints without leaving the IDE.
