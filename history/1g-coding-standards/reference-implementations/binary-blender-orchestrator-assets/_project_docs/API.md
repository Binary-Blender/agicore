# Assets Service API Documentation

## Base URL

- **Development**: `http://localhost:8001`
- **Production**: `https://ai-workflow-assets.fly.dev`

## Authentication

All endpoints except `/health` require authentication.

```
Authorization: Bearer <token>
```

Or via API key:

```
X-API-Key: <your-api-key>
```

---

## Assets Endpoints

### List Assets

```http
GET /assets?skip=0&limit=100&state=approved&execution_id=exec_123
```

**Query Parameters**:
- `skip` (int, optional): Number of records to skip (default: 0)
- `limit` (int, optional): Max records to return (default: 100, max: 1000)
- `state` (string, optional): Filter by state (`unchecked`, `approved`, `rejected`)
- `execution_id` (string, optional): Filter by execution ID
- `provider` (string, optional): Filter by AI provider
- `type` (string, optional): Filter by asset type

**Response** (200 OK):
```json
{
  "assets": [
    {
      "id": "asset_abc123",
      "type": "image",
      "url": "https://storage.example.com/assets/abc123.png",
      "prompt": "A serene landscape with mountains",
      "state": "approved",
      "provider": "mcp_akool",
      "workflow_id": "wf_xyz",
      "execution_id": "exec_123",
      "module_id": "module_1",
      "quality_metrics": {
        "resolution": "1024x1024",
        "file_size_kb": 245
      },
      "created_at": "2024-11-04T10:30:00Z",
      "updated_at": "2024-11-04T10:35:00Z"
    }
  ],
  "total": 150,
  "skip": 0,
  "limit": 100
}
```

---

### Get Asset by ID

```http
GET /assets/{asset_id}
```

**Path Parameters**:
- `asset_id` (string, required): Asset ID

**Response** (200 OK):
```json
{
  "id": "asset_abc123",
  "type": "image",
  "url": "https://storage.example.com/assets/abc123.png",
  "prompt": "A serene landscape with mountains",
  "state": "approved",
  "provider": "mcp_akool",
  "asset_metadata": {
    "model": "stable-diffusion-xl",
    "seed": 42
  },
  "provider_metadata": {
    "cost_usd": 0.05,
    "generation_time_ms": 3200
  },
  "quality_metrics": {
    "resolution": "1024x1024",
    "file_size_kb": 245
  },
  "workflow_id": "wf_xyz",
  "execution_id": "exec_123",
  "module_id": "module_1",
  "source_asset_ids": [],
  "created_at": "2024-11-04T10:30:00Z",
  "updated_at": "2024-11-04T10:35:00Z"
}
```

**Errors**:
- `404 Not Found`: Asset not found

---

### Create Asset

```http
POST /assets
```

**Request Body**:
```json
{
  "type": "image",
  "url": "https://storage.example.com/assets/new-asset.png",
  "prompt": "A futuristic city at sunset",
  "provider": "mcp_dalle",
  "workflow_id": "wf_xyz",
  "execution_id": "exec_456",
  "module_id": "module_2",
  "asset_metadata": {
    "model": "dall-e-3",
    "size": "1024x1024"
  },
  "provider_metadata": {
    "cost_usd": 0.08
  },
  "quality_metrics": {
    "resolution": "1024x1024"
  }
}
```

**Response** (201 Created):
```json
{
  "id": "asset_new789",
  "type": "image",
  "url": "https://storage.example.com/assets/new-asset.png",
  "state": "unchecked",
  "created_at": "2024-11-04T11:00:00Z"
}
```

**Errors**:
- `400 Bad Request`: Invalid input
- `409 Conflict`: Duplicate asset detected

---

### Update Asset State

```http
PUT /assets/{asset_id}/state
```

**Request Body**:
```json
{
  "state": "approved"
}
```

**Allowed States**:
- `unchecked`
- `approved`
- `rejected`

**Response** (200 OK):
```json
{
  "id": "asset_abc123",
  "state": "approved",
  "updated_at": "2024-11-04T11:15:00Z"
}
```

---

### Delete Asset (Soft Delete)

```http
DELETE /assets/{asset_id}
```

**Response** (200 OK):
```json
{
  "message": "Asset archived successfully",
  "asset_id": "asset_abc123"
}
```

**Note**: This performs a soft delete (sets `archived=True`). Asset can be restored.

---

### Upload Asset File

```http
POST /assets/upload
```

**Request** (multipart/form-data):
```
Content-Type: multipart/form-data

file: <binary file>
execution_id: exec_123
module_id: module_1
prompt: A beautiful sunset
```

**Response** (201 Created):
```json
{
  "id": "asset_upload123",
  "url": "https://storage.example.com/assets/upload123.png",
  "type": "image",
  "file_size_kb": 312
}
```

**File Limits**:
- Max size: 50MB
- Allowed types: jpg, jpeg, png, webp, mp4, webm, mp3, wav, txt

---

## QC (Quality Control) Endpoints

### List QC Tasks

```http
GET /qc/tasks?status=pending&limit=50
```

**Query Parameters**:
- `status` (string, optional): Filter by status (`pending`, `completed`)
- `limit` (int, optional): Max tasks to return

**Response** (200 OK):
```json
{
  "tasks": [
    {
      "id": "qc_task123",
      "execution_id": "exec_456",
      "module_id": "module_qc_1",
      "task_type": "pass_fail",
      "status": "pending",
      "assets": [
        {
          "id": "asset_a1",
          "url": "https://...",
          "prompt": "..."
        },
        {
          "id": "asset_a2",
          "url": "https://...",
          "prompt": "..."
        }
      ],
      "created_at": "2024-11-04T10:00:00Z"
    }
  ],
  "count": 5
}
```

---

### Get QC Task by ID

```http
GET /qc/tasks/{task_id}
```

**Response** (200 OK):
```json
{
  "id": "qc_task123",
  "execution_id": "exec_456",
  "module_id": "module_qc_1",
  "task_type": "pass_fail",
  "status": "pending",
  "assets": [
    {
      "id": "asset_a1",
      "url": "https://storage.example.com/assets/a1.png",
      "prompt": "A cat on a table",
      "state": "unchecked"
    }
  ],
  "created_at": "2024-11-04T10:00:00Z",
  "completed_at": null
}
```

---

### Submit QC Review

```http
POST /qc/{task_id}/review
```

**Request Body**:
```json
{
  "decisions": [
    {
      "asset_id": "asset_a1",
      "decision": "pass"
    },
    {
      "asset_id": "asset_a2",
      "decision": "fail"
    }
  ]
}
```

**Allowed Decisions**:
- `pass`: Asset approved
- `fail`: Asset rejected

**Response** (200 OK):
```json
{
  "task_id": "qc_task123",
  "status": "completed",
  "decisions_recorded": 2,
  "completed_at": "2024-11-04T10:30:00Z"
}
```

**Side Effects**:
- Updates `assets.state` to `approved` or `rejected`
- Creates `qc_decisions` records
- Marks `qc_task.status` as `completed`

---

## A/B Testing Endpoints

### Get A/B Test Results

```http
GET /ab-tests?execution_id=exec_789
```

**Query Parameters**:
- `execution_id` (string, optional): Filter by execution ID

**Response** (200 OK):
```json
{
  "results": [
    {
      "id": "abt_xyz123",
      "execution_id": "exec_789",
      "test_type": "side_by_side",
      "providers_tested": ["mcp_akool", "mcp_dalle"],
      "winner": "mcp_akool",
      "selection_method": "manual",
      "metrics": {
        "mcp_akool": {
          "cost_usd": 0.05,
          "generation_time_ms": 3200,
          "quality_score": 8.5
        },
        "mcp_dalle": {
          "cost_usd": 0.08,
          "generation_time_ms": 4100,
          "quality_score": 7.8
        }
      },
      "user_feedback": {
        "notes": "Akool produced better lighting"
      },
      "created_at": "2024-11-04T12:00:00Z"
    }
  ]
}
```

---

### Record A/B Test Result

```http
POST /ab-tests
```

**Request Body**:
```json
{
  "execution_id": "exec_789",
  "test_type": "side_by_side",
  "providers_tested": ["mcp_akool", "mcp_dalle"],
  "winner": "mcp_akool",
  "selection_method": "manual",
  "metrics": {
    "mcp_akool": {
      "cost_usd": 0.05,
      "generation_time_ms": 3200
    },
    "mcp_dalle": {
      "cost_usd": 0.08,
      "generation_time_ms": 4100
    }
  },
  "user_feedback": {
    "notes": "Better quality"
  }
}
```

**Response** (201 Created):
```json
{
  "id": "abt_xyz123",
  "execution_id": "exec_789",
  "winner": "mcp_akool",
  "created_at": "2024-11-04T12:00:00Z"
}
```

---

## Health Check

### Service Health

```http
GET /health
```

**Response** (200 OK):
```json
{
  "status": "healthy",
  "version": "1.0.0",
  "database": "connected",
  "storage": "accessible",
  "uptime_seconds": 86400
}
```

**Errors**:
- `503 Service Unavailable`: Service unhealthy (database down, storage inaccessible)

---

## Error Responses

All error responses follow this format:

```json
{
  "detail": "Human-readable error message",
  "error_code": "MACHINE_READABLE_CODE",
  "field": "problematic_field (if applicable)"
}
```

### Common Error Codes

| Code | Description |
|------|-------------|
| `ASSET_NOT_FOUND` | Asset ID does not exist |
| `QC_TASK_NOT_FOUND` | QC task ID does not exist |
| `INVALID_STATE` | Invalid asset state transition |
| `INVALID_DECISION` | Invalid QC decision (not pass/fail) |
| `DUPLICATE_ASSET` | Asset with same URL already exists |
| `FILE_TOO_LARGE` | Uploaded file exceeds size limit |
| `INVALID_FILE_TYPE` | File type not allowed |
| `STORAGE_ERROR` | File storage operation failed |
| `DATABASE_ERROR` | Database operation failed |

---

## Rate Limiting

- **Default**: 100 requests per minute per IP
- **Burst**: 200 requests per minute
- **Response Header**: `X-RateLimit-Remaining: 95`

When rate limit exceeded:
```http
429 Too Many Requests

{
  "detail": "Rate limit exceeded",
  "retry_after_seconds": 60
}
```

---

## Pagination

List endpoints support offset-based pagination:

```http
GET /assets?skip=100&limit=50
```

**Response Headers**:
```
X-Total-Count: 500
X-Skip: 100
X-Limit: 50
```

---

## Filtering

Most list endpoints support filtering:

```http
GET /assets?state=approved&provider=mcp_akool&type=image
```

**Supported Operators**:
- Equality: `field=value`
- Multiple values: `field=value1,value2` (OR logic)

---

## Sorting

Use `sort` query parameter:

```http
GET /assets?sort=-created_at,state
```

- Prefix with `-` for descending order
- Default: `created_at` descending

---

## OpenAPI/Swagger

Interactive API documentation available at:
- **Swagger UI**: `http://localhost:8001/docs`
- **ReDoc**: `http://localhost:8001/redoc`
- **OpenAPI JSON**: `http://localhost:8001/openapi.json`

---

## Client Examples

### Python

```python
import httpx

BASE_URL = "http://localhost:8001"

async with httpx.AsyncClient() as client:
    # List assets
    response = await client.get(f"{BASE_URL}/assets?limit=10")
    assets = response.json()

    # Create asset
    response = await client.post(
        f"{BASE_URL}/assets",
        json={
            "type": "image",
            "url": "https://example.com/image.png",
            "execution_id": "exec_123"
        }
    )
    asset = response.json()
```

### JavaScript

```javascript
const BASE_URL = "http://localhost:8001";

// List assets
const response = await fetch(`${BASE_URL}/assets?limit=10`);
const { assets } = await response.json();

// Submit QC review
await fetch(`${BASE_URL}/qc/qc_task123/review`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    decisions: [
      { asset_id: "asset_a1", decision: "pass" }
    ]
  })
});
```

### cURL

```bash
# List pending QC tasks
curl http://localhost:8001/qc/tasks?status=pending

# Submit QC review
curl -X POST http://localhost:8001/qc/qc_task123/review \
  -H "Content-Type: application/json" \
  -d '{
    "decisions": [
      {"asset_id": "asset_a1", "decision": "pass"},
      {"asset_id": "asset_a2", "decision": "fail"}
    ]
  }'
```

---

## Webhooks (Future)

Coming in v2.0:
- Asset created webhook
- QC task completed webhook
- A/B test result webhook

---

## Versioning

API version is included in response headers:

```
X-API-Version: 1.0.0
```

Breaking changes will bump major version.
