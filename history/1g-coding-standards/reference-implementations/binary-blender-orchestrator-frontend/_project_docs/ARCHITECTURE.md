# Binary-Blender Orchestrator - Microservices Architecture

## Overview

The Binary-Blender Orchestrator is split into three independent microservices:

```
┌──────────────┐      ┌──────────────┐      ┌────────┐
│   Frontend   │──────│    Engine    │──────│ Assets │
│   Service    │      │   Service    │      │ Service│
│  (Port 8000) │      │  (Port 8002) │      │ (8001) │
└──────────────┘      └──────────────┘      └────────┘
       │                      │                    │
       └──────────────────────┴────────────────────┘
                           │
                    ┌──────────────┐
                    │  PostgreSQL  │
                    │   (Shared)   │
                    └──────────────┘
```

## Service Responsibilities

### Frontend Service (Port 8000)
**Repository**: binary-blender-orchestrator-frontend

**Responsibilities**:
- Serve static HTML/JS/CSS files (Vue.js based)
- Provide configuration endpoint for microservice discovery
- No direct database access
- No business logic

**Key Files**:
- `src/main.py` - FastAPI static file server
- `config.js` - Frontend configuration loader
- `*.html` - UI pages (workflows, assets, QC, analytics, etc.)

**API Endpoints**:
- `GET /` - Serve index.html
- `GET /{page}.html` - Serve any HTML page
- `GET /api/config` - Return microservice URLs
- `GET /health` - Health check

### Engine Service (Port 8002)
**Repository**: binary-blender-orchestrator-engine

**Responsibilities**:
- Workflow execution orchestration
- Module logic and execution
- MCP (Model Context Protocol) integration
- Background task processing

**Database Tables** (Owned):
- `workflows` - Workflow definitions
- `workflow_executions` - Execution history
- `modules` - Module definitions
- `tenants` - Multi-tenant configuration

**API Endpoints**:
- `POST /workflows` - Create workflow
- `GET /workflows` - List workflows
- `POST /workflows/{id}/execute` - Execute workflow
- `GET /executions` - List executions
- `GET /executions/{id}` - Get execution details
- `GET /stats` - Platform statistics

### Assets Service (Port 8001)
**Repository**: binary-blender-orchestrator-assets

**Responsibilities**:
- Asset repository (CRUD operations)
- Quality control (QC) task management
- A/B testing results
- File storage (local or S3)

**Database Tables** (Owned):
- `assets` - All generated assets
- `qc_tasks` - QC tasks
- `qc_decisions` - QC review decisions
- `ab_test_results` - A/B testing data

**API Endpoints**:
- `GET /assets` - List assets
- `POST /assets` - Create asset
- `GET /qc/tasks` - List QC tasks
- `POST /qc/{id}/review` - Submit QC decisions
- `GET /ab-tests` - Get A/B test results

## Data Flow

### Workflow Execution Flow

```
1. User triggers workflow from Frontend
   ↓
2. Frontend → Engine: POST /workflows/{id}/execute
   ↓
3. Engine executes modules sequentially
   ↓
4. For each module that generates assets:
   Engine → Assets: POST /assets (create asset)
   ↓
5. Engine checks if QC needed
   ↓
6. If QC needed:
   Engine → Assets: POST /qc/tasks (create QC task)
   ↓
7. User reviews QC from Frontend
   Frontend → Assets: POST /qc/{id}/review
   ↓
8. Assets updates asset states
   ↓
9. Engine continues execution
   ↓
10. Engine saves execution data
```

### Asset-Centric Design

All modules exchange **asset IDs** instead of full data objects:

```python
# Module A generates an image
asset_id = assets_service.create_asset(
    type="image",
    url="https://...",
    execution_id=execution_id
)

# Module B uses the image
asset = assets_service.get_asset(asset_id)
result = process_image(asset.url)
```

Benefits:
- Reduced memory usage
- Better lineage tracking
- Centralized asset storage
- Easy QC integration

## Authentication & Multi-Tenancy

All services support:
- **JWT Authentication** (production)
- **API Key Authentication** (development)

Tenant isolation enforced at query level:
```python
query = query.where(Asset.tenant_id == tenant_id)
```

## Database Schema

### Shared PostgreSQL Database

**Table Ownership Model**:
- Each service owns specific tables
- Services can reference foreign keys to other services' tables
- NO direct cross-service database writes

**Foreign Key Relationships**:
```
assets.workflow_id → workflows.id (Engine owns workflows)
assets.execution_id → workflow_executions.id (Engine owns)
qc_tasks.execution_id → workflow_executions.id (Engine owns)
```

## Deployment Architecture

### Fly.io Deployment

Each service deployed independently:

```
Frontend:  ai-workflow-frontend.fly.dev
Engine:    ai-workflow-engine.fly.dev
Assets:    ai-workflow-assets.fly.dev
Database:  ai-workflow-spc-db (Fly Postgres)
```

### Environment Variables

**Frontend Service**:
- `ASSETS_SERVICE_URL` - URL of Assets Service
- `ENGINE_SERVICE_URL` - URL of Engine Service

**Engine Service**:
- `DATABASE_URL` - PostgreSQL connection string
- `ASSETS_SERVICE_URL` - URL of Assets Service
- `JWT_SECRET` or `API_KEY` - Authentication

**Assets Service**:
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` or `API_KEY` - Authentication
- `STORAGE_TYPE` - local or s3

## Service Communication

### HTTP REST API

Services communicate via HTTP REST APIs:

```python
# Engine calling Assets Service
import httpx

async def create_asset(asset_data):
    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{ASSETS_SERVICE_URL}/assets",
            json=asset_data,
            headers={"Authorization": f"Bearer {token}"}
        )
        return response.json()
```

### Error Handling

Standard HTTP status codes:
- `200 OK` - Success
- `201 Created` - Resource created
- `400 Bad Request` - Invalid input
- `404 Not Found` - Resource not found
- `409 Conflict` - Duplicate or constraint violation
- `500 Internal Server Error` - Server error

## Development Setup

### Running All Services Locally

1. **Start PostgreSQL**:
```bash
# Using Docker
docker run -d -p 5432:5432 \
  -e POSTGRES_PASSWORD=postgres \
  postgres:17
```

2. **Start Assets Service**:
```bash
cd binary-blender-orchestrator-assets
export DATABASE_URL="postgresql+asyncpg://postgres:postgres@localhost/ai_workflow"
export API_KEY="dev-api-key"
python -m src.main  # Port 8001
```

3. **Start Engine Service**:
```bash
cd binary-blender-orchestrator-engine
export DATABASE_URL="postgresql+asyncpg://postgres:postgres@localhost/ai_workflow"
export ASSETS_SERVICE_URL="http://localhost:8001"
export API_KEY="dev-api-key"
python -m src.main  # Port 8002
```

4. **Start Frontend Service**:
```bash
cd binary-blender-orchestrator-frontend
export ASSETS_SERVICE_URL="http://localhost:8001"
export ENGINE_SERVICE_URL="http://localhost:8002"
python -m src.main  # Port 8000
```

5. **Open browser**: http://localhost:8000

## Migration from Monolith

The original monolith (`binary-blender-ai-platform`) has been split:

| Monolith Endpoint | New Service | New Endpoint |
|-------------------|-------------|--------------|
| `/generate` | Engine | `/workflows/{id}/execute` |
| `/assets` | Assets | `/assets` |
| `/qc/pending` | Assets | `/qc/tasks?status=pending` |
| `/qc/submit` | Assets | `/qc/{id}/review` |
| `/workflows` | Engine | `/workflows` |
| `/executions` | Engine | `/executions` |
| `/stats` | Engine | `/stats` |

## Related Documentation

- **Frontend Service**: `binary-blender-orchestrator-frontend/_project_docs/`
- **Engine Service**: `binary-blender-orchestrator-engine/_project_docs/`
- **Assets Service**: `binary-blender-orchestrator-assets/_project_docs/`
- **Original Monolith**: `binary-blender-ai-platform/`
