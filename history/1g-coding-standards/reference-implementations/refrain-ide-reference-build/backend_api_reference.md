# Backend API Reference

## Overview

The Refrain IDE 2.0 Backend API provides endpoints for AI provider management, health checks, and chat functionality. This document serves as a quick reference for the Backend AI and future development.

**Base URL (Production):** `https://refrain-ide-api.fly.dev`
**Base URL (Local):** `http://localhost:8000`
**API Documentation:** `{BASE_URL}/docs` (auto-generated Swagger UI)

---

## Health Endpoints

### GET /health
Returns system health status.

**Response:**
```json
{
  "status": "healthy",
  "version": "1.0.0",
  "uptime_seconds": 123.45,
  "python_version": "3.11.x",
  "platform": "Linux-x.x.x-..."
}
```

### GET /health/providers
Returns configuration status for all AI providers.

**Response:**
```json
{
  "anthropic": "not_configured",
  "openai": "not_configured",
  "custom": "not_configured"
}
```

Status values:
- `configured` - API key or base URL is set
- `not_configured` - No credentials configured

---

## AI Endpoints

### POST /ai/chat/{role}
Send messages to an AI provider and receive a response.

**Path Parameters:**
- `role`: `strategic` | `frontend` | `backend`

**Request Body:**
```json
{
  "messages": [
    {
      "role": "system",
      "content": "You are a helpful assistant."
    },
    {
      "role": "user",
      "content": "Hello, world!"
    }
  ],
  "options": {
    "temperature": 0.7,
    "max_tokens": 4096
  }
}
```

**Response:**
```json
{
  "content": "Hello! How can I help you today?",
  "usage": {
    "input_tokens": 15,
    "output_tokens": 10,
    "total_tokens": 25
  },
  "metadata": {
    "provider": "anthropic",
    "model": "claude-sonnet-4-20250514"
  }
}
```

**Error Responses:**
- `400 Bad Request` - Invalid role
- `502 Bad Gateway` - Provider error (API failure, rate limit, etc.)

---

### POST /ai/stream/{role}
Stream AI responses using Server-Sent Events (SSE).

**Path Parameters:**
- `role`: `strategic` | `frontend` | `backend`

**Request Body:** Same as `/ai/chat/{role}`

**Response (SSE):**
```
data: Hello

data: , how

data: can I

data: help?

data: [DONE]
```

Each `data:` line contains a text chunk. The stream ends with `[DONE]`.

**Error Handling:**
If an error occurs during streaming:
```
event: error
data: Error message here
```

---

### POST /ai/test-connection
Test if an AI provider connection works.

**Request Body:**
```json
{
  "provider": "anthropic",
  "model": "claude-sonnet-4-20250514",
  "api_key": "sk-ant-...",
  "base_url": null,
  "temperature": 0.7,
  "max_tokens": 4096
}
```

**Response (Success):**
```json
{
  "success": true,
  "message": "Connection successful"
}
```

**Response (Failure):**
```json
{
  "success": false,
  "message": "Anthropic API key missing"
}
```

---

### GET /ai/configurations
Retrieve current AI provider configurations for all roles.

**Response:**
```json
{
  "strategic": {
    "provider": "anthropic",
    "model": "claude-sonnet-4-20250514",
    "api_key": null,
    "base_url": null,
    "temperature": 0.7,
    "max_tokens": 8192
  },
  "frontend": {
    "provider": "custom",
    "model": "qwen-2.5-coder-32b",
    "api_key": null,
    "base_url": "https://api.example.com",
    "temperature": 0.3,
    "max_tokens": 4096
  },
  "backend": {
    "provider": "openai",
    "model": "gpt-4",
    "api_key": null,
    "base_url": null,
    "temperature": 0.2,
    "max_tokens": 4096
  }
}
```

**Note:** API keys are returned as `null` for security. The actual keys are hydrated from environment variables when making API calls.

---

### PUT /ai/configurations
Update AI provider configurations.

**Request Body:** Same structure as GET response

**Response:**
```json
{
  "message": "Configuration saved successfully"
}
```

**Persistence:** Configurations are saved to `.refrain/ai-config.json`

---

## Data Models

### AIMessage
```typescript
{
  role: "system" | "user" | "assistant",
  content: string  // min 1 char
}
```

### ChatOptions
```typescript
{
  temperature?: number,  // 0.0 to 2.0, default 0.7
  max_tokens?: number    // 1 to 32000, default 4096
}
```

### AIProviderConfig
```typescript
{
  provider: "custom" | "anthropic" | "openai",
  model: string,           // min 1 char
  api_key?: string | null, // optional
  base_url?: string | null,// required for "custom" provider
  temperature: number,     // 0.0 to 2.0, default 0.7
  max_tokens: number       // 1 to 32000, default 4096
}
```

---

## Provider-Specific Notes

### Anthropic Provider
- **SDK Version:** 0.7.0
- **Default Model:** `claude-sonnet-4-20250514`
- **Streaming:** Uses `client.messages.stream()` with `text_stream`
- **API Key:** Set via `ANTHROPIC_API_KEY` environment variable

### OpenAI Provider
- **SDK Version:** 1.3.0
- **Default Model:** `gpt-4`
- **Streaming:** Uses `stream=True` parameter with chunk iteration
- **API Key:** Set via `OPENAI_API_KEY` environment variable

### Custom API Provider
- **HTTP Client:** httpx (async)
- **Expected Format:** OpenAI-compatible API
- **Endpoint:** `{base_url}/v1/chat/completions`
- **Streaming:** Parses SSE format with `data:` lines
- **Timeout:** 30 seconds

---

## Error Handling

All errors return JSON with this structure:
```json
{
  "detail": "Error message description"
}
```

**HTTP Status Codes:**
- `200` - Success
- `400` - Bad Request (validation error)
- `401` - Unauthorized (invalid API key)
- `404` - Not Found
- `422` - Unprocessable Entity (validation error)
- `500` - Internal Server Error
- `502` - Bad Gateway (provider error)

---

## Document Management Endpoints (Sprint 2)

### GET /documents
List all documents in the project documentation directory.

**Query Parameters:**
- `path` (optional): Subdirectory path to list
- `include_archived` (optional): Include archived documents (default: false)

**Response:**
```json
[
  {
    "name": "ai_coding_guidelines.md",
    "path": "ai_coding_guidelines.md",
    "type": "file",
    "size_bytes": 8234,
    "modified_at": "2025-11-16T10:30:00Z",
    "is_archived": false
  },
  {
    "name": "_archive",
    "path": "_archive",
    "type": "directory",
    "size_bytes": null,
    "modified_at": "2025-11-16T12:00:00Z",
    "is_archived": false
  }
]
```

---

### GET /documents/{path}
Read a specific document by path.

**Path Parameters:**
- `path`: URL-encoded path to the document (e.g., `ai_coding_guidelines.md`)

**Response:**
```json
{
  "info": {
    "name": "ai_coding_guidelines.md",
    "path": "ai_coding_guidelines.md",
    "type": "file",
    "size_bytes": 8234,
    "modified_at": "2025-11-16T10:30:00Z",
    "is_archived": false
  },
  "content": "# AI Coding Assistant Instructions\n\n...",
  "encoding": "utf-8"
}
```

**Error Responses:**
- `404` - Document not found
- `400` - Path traversal attempt blocked

---

### PUT /documents/{path}
Create or update a document.

**Path Parameters:**
- `path`: URL-encoded path for the document

**Request Body:**
```json
{
  "content": "# Document Title\n\nContent here..."
}
```

**Response:**
```json
{
  "message": "Document saved successfully",
  "path": "guides/new_doc.md",
  "size_bytes": 1234,
  "saved_at": "2025-11-16T12:00:00Z"
}
```

**Notes:**
- Creates parent directories automatically if needed
- Overwrites existing files
- Validates UTF-8 encoding

---

### DELETE /documents/{path}
Delete a document.

**Path Parameters:**
- `path`: URL-encoded path to the document

**Query Parameters:**
- `confirm` (required): Must be `true` to proceed with deletion

**Response:**
```json
{
  "message": "Document deleted successfully",
  "path": "old_notes.md",
  "deleted_at": "2025-11-16T12:00:00Z"
}
```

**Error Responses:**
- `400` - Missing confirmation or protected document
- `404` - Document not found

---

### POST /documents/archive/{path}
Archive a document by moving it to the `_archive/` directory with a timestamp.

**Path Parameters:**
- `path`: URL-encoded path to the document

**Response:**
```json
{
  "archive_path": "_archive/old_document_2025-11-16.md"
}
```

**Notes:**
- Creates `_archive/` directory if it doesn't exist
- Appends date in format: `{name}_{YYYY-MM-DD}.md`
- Handles naming conflicts with counter suffix

---

### GET /documents/search
Search markdown documents for a text or regex pattern.

**Query Parameters:**
- `q` (required): Search string or regex pattern (case-insensitive)
- `limit` (optional): Maximum matches (1-200, default 50)

**Response:**
```json
[
  {
    "path": "technical_plan.md",
    "line_number": 245,
    "line_content": "**State Management:** React Context + Zustand",
    "match_start": 3,
    "match_end": 18
  }
]
```

---

### GET /documents/watch
Server-Sent Events stream for document changes (requires `ENABLE_FILE_WATCHER=true` and `watchfiles` dependency).

**Response (SSE):**
```
data: {"timestamp":"2025-11-16T17:30:00Z","events":[{"change":"modified","path":"current_sprint.md"}]}
```

**Notes:**
- Emits `created`, `modified`, and `deleted` events.
- Ignores `_archive/` and other excluded directories.
- Disabled by default to avoid unnecessary resource usage.

---

## Questions Management Endpoints (Sprint 2)

### GET /questions
List all questions from questions.md.

**Response:**
```json
[
  {
    "id": "Q001",
    "from_ai": "backend",
    "question": "Should I implement WebSockets for real-time updates?",
    "context": "Sprint 3, Task 2.1 - Notifications feature",
    "impact": "Major architecture decision",
    "status": "open",
    "created_at": "2025-11-16T10:30:00Z",
    "resolution": null
  }
]
```

---

### GET /questions/open
List only open questions (status = "open" or "waiting").

**Response:** Same structure as GET /questions

---

### POST /questions
Add a new question to questions.md.

**Request Body:**
```json
{
  "from_ai": "backend",
  "question": "What database should we use for user preferences?",
  "context": "Sprint 2, Data persistence design",
  "impact": "Affects data model and performance"
}
```

**Response:**
```json
{
  "id": "Q002",
  "from_ai": "backend",
  "question": "What database should we use for user preferences?",
  "context": "Sprint 2, Data persistence design",
  "impact": "Affects data model and performance",
  "status": "waiting",
  "created_at": "2025-11-16T11:15:00Z",
  "resolution": null
}
```

**Notes:**
- Auto-generates sequential ID (Q001, Q002, etc.)
- Appends formatted entry to questions.md
- Sets initial status to "open"

---

### PUT /questions/{id}/resolve
Resolve a question with an answer.

**Path Parameters:**
- `id`: Question ID (e.g., Q001)

**Request Body:**
```json
{
  "answer": "Use Server-Sent Events instead of WebSockets for simpler implementation",
  "decided_by": "Strategic AI + User consensus"
}
```

**Response:**
```json
{
  "id": "Q002",
  "from_ai": "backend",
  "question": "What database should we use for user preferences?",
  "context": "Sprint 2, Data persistence design",
  "impact": "Affects data model and performance",
  "status": "resolved",
  "created_at": "2025-11-16T11:15:00Z",
  "resolution": {
    "answer": "Use SQLite locally; upgrade to Postgres in production.",
    "decided_by": "Strategic AI + User",
    "resolved_at": "2025-11-16T12:25:00Z"
  }
}
```

**Notes:**
- Updates status to "resolved"
- Adds resolution block to questions.md
- Records resolved_at timestamp

---

## Workflow State Machine Endpoints (Sprint 3)

### POST /workflow/initialize
Initialize the workflow state or load previous state from `.refrain/workflow-state.json`.

**Response:** `WorkflowStatus`

---

### GET /workflow/status
Return the current workflow state, including last step result and pause status.

---

### GET /workflow/history
Return an array of transition records with `from_step`, `to_step`, timestamp, and trigger.

---

### POST /workflow/transition/{to_step}
Manually transition to a specific workflow step (`step_000`-`step_004`).

**Response:** Updated `WorkflowStatus`

**Errors:** `400` on invalid transition order.

---

### POST /workflow/pause` / `POST /workflow/resume`
Toggle workflow pause state. Paused workflows reject execution requests.

---

### POST /workflow/step/{step}
Execute a workflow step and stream progress via SSE. Steps 000, 001, and 004 call the AI providers; Steps 002 and 003 emit guidance instructions.

**SSE Events:**
- `step_start`
- `manual_guidance` (for Steps 002/003)
- `marker_detected` (when `****READY...****` markers appear)
- `step_complete`

**Errors:** `400` when workflow paused or step invalid.

---

## Document Data Models

### DocumentInfo
```typescript
{
  name: string,
  path: string,
  type: "file" | "directory",
  size_bytes: number | null,
  modified_at: string | null,  // ISO 8601
  is_archived: boolean
}
```

### DocumentContent
```typescript
{
  info: DocumentInfo,
  content: string,
  encoding: string  // default "utf-8"
}
```

### Question
```typescript
{
  id: string,                    // Q001, Q002, etc.
  from_ai: "backend" | "frontend" | "strategic",
  question: string,
  context: string,
  impact: string,
  status: "open" | "resolved" | "waiting",
  created_at: string,            // ISO 8601
  resolution: {
    answer: string,
    decided_by: string,
    resolved_at: string          // ISO 8601
  } | null
}
```

---

## Configuration Files

### .refrain/ai-config.json
Stores role configurations. Created automatically on first save.

```json
{
  "strategic": { ... },
  "frontend": { ... },
  "backend": { ... }
}
```

### Environment Variables
```bash
# Required for providers (optional if set in config)
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
CUSTOM_API_KEY=your-key
CUSTOM_API_URL=https://api.example.com

# Server settings
HOST=0.0.0.0
PORT=8000
DEBUG=false
CORS_ORIGINS=http://localhost:3000,https://refrain-ide-web.fly.dev
```

---

## Project Requirements Endpoints (Sprint 3)

### GET /projects/{project_id}/requirements/document
Return the canonical requirements document for the active project. The `project_id`
parameter is future-facing for multi-project support; currently all requests resolve
to the `_project_docs` directory configured on the server.

**Path Parameters:**
- `project_id` – UUID or slug identifying the project (placeholder for now)

**Response:**
```json
{
  "info": {
    "name": "refrain_requirements_v2.md",
    "path": "refrain_requirements_v2.md",
    "type": "file",
    "size_bytes": 12034,
    "modified_at": "2025-11-18T14:05:00Z",
    "is_archived": false
  },
  "content": "# Refrain Requirements 2.0\\n...",
  "encoding": "utf-8"
}
```

---

## Strategic AI Endpoints

### POST /api/v1/strategic/chat
Initiate or continue a Strategic AI session. Supply optional `session_id` to continue an existing transcript.

**Body:**
```json
{
  "session_id": "STRAT-20251120001",
  "messages": [{ "role": "user", "content": "Summarize sprint risk." }],
  "objectives": ["Highlight blockers"],
  "allow_document_writes": false
}
```

**Response:**
```json
{
  "session": {
    "id": "STRAT-20251120001",
    "step_id": "step_000",
    "objectives": ["Highlight blockers"],
    "messages": [...],
    "decisions": []
  },
  "response": "Strategic guidance..."
}
```

### POST /api/v1/strategic/chat/stream
Streams the Strategic AI response as Server-Sent Events. Body matches `/strategic/chat` and now emits typed events.

Each stream contains metadata so clients can bind tokens to sessions:

```
event: token
data: {"session_id":"STRAT-20251201-0001","type":"token","chunk_index":3,"content":"Partial text"}

event: heartbeat
data: {"session_id":"…","type":"heartbeat","chunk_index":3,"metadata":{"elapsed_ms":1200}}

event: done
data: {"session_id":"…","type":"done","chunk_index":10,"metadata":{"duration_seconds":8.2}}
```

Errors emit `event: error` with `{ "message": "..." }` before the stream closes.

### GET /api/v1/strategic/sessions
Returns every persisted strategic session (most recent first). Optional query params:
- `status`: `active` or `closed`
- `step_id`: limit to workflow step (e.g., `step_000`)

### GET /api/v1/strategic/sessions/{session_id}
Fetch the full transcript, objectives, and pending decisions for a specific session.

### POST /api/v1/strategic/sessions/{session_id}/decisions
Record a structured decision after a conversation. Any `related_questions` are resolved automatically in `questions.md`. Targets feed Workflow checkpoint actions.

**Body:**
```json
{
  "type": "question_resolution",
  "summary": "Resolve Q004",
  "details": "Deployment cadence approved",
  "related_questions": ["Q004"],
  "targets": [
    {"kind": "document", "path": "_project_docs/current_sprint.md", "assigned_step": "step_004"}
  ]
}
```

### Action Ledger APIs
- `GET /api/v1/strategic/actions` – list ledger entries (`status`, `step_id` filters).
- `POST /api/v1/strategic/actions/{action_id}/claim` – `{ "claimed_by": "step_004" }`.
- `POST /api/v1/strategic/actions/{action_id}/complete`
- `POST /api/v1/strategic/actions/{action_id}/cancel`

Response payload example:

```json
{
  "action_id": "ACT-20251201-01",
  "decision_id": "DEC-20251201-02",
  "summary": "Deploy backend",
  "assigned_step": "step_004",
  "status": "claimed",
  "claimed_by": "step_004",
  "document_path": "_project_docs/current_sprint.md",
  "updated_at": "2025-12-01T15:32:00Z"
}
```

**Error Responses:**
- `404` – Requirements document missing from `_project_docs/`
- `400` – Document validation error (e.g., decode failure)

---

## Git Endpoints (Sprint 4)

These endpoints expose repository status and allow the workflow to perform semantic commits.

### GET /git/status
Return branch name, ahead/behind counts, and lists of untracked/modified/staged files.

### POST /git/add
Stage files for commit.
```json
{
  "paths": ["backend/app/main.py"],  // null to stage everything
  "include_untracked": true
}
```

### POST /git/commit
Create a commit. Provide `message` to use a custom message or set `auto_message=true` to let the workflow build one from the last step result.
```json
{
  "message": "feat(api): wire git service",
  "auto_message": false,
  "step": "step_004"
}
```

### POST /git/push
Push commits to the configured remote.
```json
{
  "remote": "origin",
  "branch": "main",
  "force": false
}
```

### GET /git/log
Return the commit history (defaults to 50 commits). Supports optional `since` and `author` query parameters.

### GET /git/diff
Return unified diff text plus stats. Use `?staged=true` to inspect the index or `?commit=<sha>` to view a specific commit.

### GET /git/branch
Return the current branch, tracking branch, and ahead/behind counts.

---

## Deployment Endpoints (Sprint 4)

### POST /deploy/backend/{environment}
Trigger a backend deployment via Fly.io. Responds with SSE events:
```
event: deploy_event
data: {"event":"started","message":"Starting deploy to staging"}
```

### POST /deploy/frontend/{environment}
Same as above but runs from the `frontend/` directory.

### GET /deploy/status/{app_name}
Return the latest Fly.io deployment status, version, timestamps, and health.

### GET /deploy/health-check
Perform an HTTP health check against a deployed URL.

### POST /deploy/rollback/{app_name}
Roll back to a previous release. Optional `version` query parameter selects a specific image.

### GET /deploy/logs/{app_name}
Stream recent Fly.io logs as plain text.

**Notes**
- All deployment endpoints require `flyctl` to be installed on the server.
- SSE responses should be consumed with `EventSource`/`fetch` streaming on the frontend.

---

## CORS Configuration

The backend is configured to accept requests from:
- `http://localhost:3000` (local development)
- Frontend deployed URL (via environment variable)

To add more origins, update `CORS_ORIGINS` in the environment.

---

## Testing Locally

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

# Access API docs
open http://localhost:8000/docs
```

---

## Known Limitations

### Sprint 1
1. **No Authentication** - Placeholder only, per ai_coding_guidelines.md
2. **No Rate Limiting** - Consider adding for production
3. **Basic Provider Validation** - Only checks if credentials exist, not if they're valid
4. **No Retry Logic** - Failed API calls are not automatically retried
5. **No Caching** - Each request is made fresh

### Sprint 2
1. **File Watcher Dependency** - Real-time `/documents/watch` stream requires `watchfiles`; without it the endpoint returns 503
2. **Search Scope** - Current search indexes `.md` files only; other formats are ignored
3. **Large File Performance** - Operations load entire file content into memory; consider chunked processing for >1MB docs
4. **No Authentication Yet** - Document and question APIs are unsecured pending auth work in later sprints

---

## Next Steps for Backend AI

### Priority Fixes (Sprint 2 Issues)
1. Add optional caching or pagination for `/documents` once doc counts exceed hundreds
2. Enhance file watcher events with user metadata when auth lands
3. Extend search endpoint to include `.mdx`/`.txt` or allow file-type filters

### Sprint 3 Status
✅ **COMPLETE** - Workflow State Machine Implemented
- ✅ All workflow endpoints functional
- ✅ State persistence working
- ✅ SSE streaming operational
- ✅ Frontend UI integrated
- ✅ Deployed to production

### Sprint 4 Focus Areas
- Git integration service (`/git/`)
- Enhanced deployment automation
- Strategic AI teaching mode improvements
- Real-time collaboration features

### Improvements to Consider
- Add retry logic with exponential backoff
- Implement request ID tracking for debugging
- Add comprehensive logging
- Create mock provider for testing
- Expand integration tests to cover document + question workflows end-to-end
- Cache document listings
- Implement pagination for large document sets
- Add authentication and authorization

---

*Last Updated: November 17, 2025*
*Sprint 3 - Workflow State Machine COMPLETE*
*Frontend: https://refrain-ide-web.fly.dev*
*Backend: https://refrain-ide-api.fly.dev*
*API Docs: https://refrain-ide-api.fly.dev/docs*
