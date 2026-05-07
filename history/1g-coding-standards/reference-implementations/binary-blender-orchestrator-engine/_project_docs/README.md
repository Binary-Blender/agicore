# Engine Service Documentation

## Purpose

The Engine Service orchestrates workflow execution, manages modules, and handles the MCP (Model Context Protocol) integration for the Binary-Blender Orchestrator platform.

## Responsibilities

- **Workflow Orchestration**: Execute workflows by running modules in sequence
- **Module Management**: Load and execute workflow modules
- **MCP Integration**: Interface with external AI services via MCP
- **Database Operations**: Manage workflows, executions, and modules in PostgreSQL
- **Background Tasks**: Handle async execution and background processing
- **Statistics & Analytics**: Track execution metrics and performance

## Technology Stack

- **FastAPI**: Python async web framework
- **SQLAlchemy 2.0**: Async ORM
- **PostgreSQL**: Database (via asyncpg)
- **MCP Client**: Model Context Protocol integration
- **Pydantic**: Data validation

## Port

- **8002** (configurable via `PORT` environment variable)

## Database Tables (Owned by Engine)

### workflows
Workflow definitions:
- `id` (UUID, primary key)
- `tenant_id` (FK to tenants)
- `name` (string)
- `description` (text)
- `modules` (JSONB) - Module configuration
- `created_at`, `updated_at`

### workflow_executions
Execution history:
- `id` (UUID, primary key)
- `workflow_id` (FK to workflows)
- `tenant_id` (FK to tenants)
- `status` (pending, running, completed, failed)
- `inputs` (JSONB)
- `outputs` (JSONB)
- `started_at`, `completed_at`
- `error_message` (text)

### modules
Module registry (optional - can be file-based):
- `id` (UUID, primary key)
- `name` (string)
- `type` (string) - e.g., "image_generation", "qc", "ab_testing"
- `config_schema` (JSONB)

### tenants
Multi-tenant configuration:
- `id` (UUID, primary key)
- `name` (string)
- `api_key_hash` (string)
- `settings` (JSONB)

## API Endpoints

### Workflow Management

#### POST /workflows
Create new workflow:

Request:
```json
{
  "name": "Image Generation Workflow",
  "description": "Generate and QC images",
  "modules": [
    {
      "id": "gen1",
      "type": "image_generation",
      "config": {
        "provider": "akool",
        "count": 4
      }
    },
    {
      "id": "qc1",
      "type": "qc_task",
      "config": {
        "sampling_rate": 0.1
      },
      "inputs": {
        "asset_ids": "$gen1.asset_ids"
      }
    }
  ]
}
```

Response:
```json
{
  "workflow": {
    "id": "wf_123",
    "name": "Image Generation Workflow",
    "modules": [...],
    "created_at": "2025-01-01T00:00:00Z"
  }
}
```

#### GET /workflows
List workflows (tenant-isolated):

Query params:
- `skip` (int, default: 0)
- `limit` (int, default: 100)

Response:
```json
{
  "workflows": [...],
  "total": 42,
  "skip": 0,
  "limit": 100
}
```

#### GET /workflows/{id}
Get workflow by ID (tenant-isolated)

#### PUT /workflows/{id}
Update workflow

#### DELETE /workflows/{id}
Soft delete workflow

#### POST /workflows/{id}/clone
Clone workflow with new name

### Workflow Execution

#### POST /workflows/{id}/execute
Execute a workflow:

Request:
```json
{
  "inputs": {
    "prompt": "A beautiful sunset over mountains"
  }
}
```

Response:
```json
{
  "execution_id": "exec_456",
  "status": "running",
  "started_at": "2025-01-01T00:00:00Z"
}
```

#### GET /executions
List executions (tenant-isolated)

Query params:
- `skip`, `limit`
- `status` (pending, running, completed, failed)
- `workflow_id`

#### GET /executions/{id}
Get execution details:

```json
{
  "execution": {
    "id": "exec_456",
    "workflow_id": "wf_123",
    "status": "completed",
    "inputs": {...},
    "outputs": {...},
    "started_at": "...",
    "completed_at": "...",
    "module_outputs": {
      "gen1": {
        "asset_ids": ["asset_1", "asset_2", "asset_3", "asset_4"]
      },
      "qc1": {
        "qc_task_id": "qc_task_123"
      }
    }
  }
}
```

### Statistics

#### GET /stats
Platform statistics:

```json
{
  "total_workflows": 10,
  "total_executions": 150,
  "executions_by_status": {
    "completed": 140,
    "failed": 5,
    "running": 3,
    "pending": 2
  },
  "avg_execution_time_seconds": 45.2
}
```

### Health Check

#### GET /health
```json
{
  "status": "healthy",
  "service": "engine",
  "version": "1.0.0",
  "database": "connected"
}
```

## Module System

### Module Types

1. **image_generation** - Generate images via MCP
2. **qc_task** - Create QC tasks in Assets Service
3. **ab_testing** - Record A/B test results
4. **conditional** - Branch execution based on conditions

### Module Base Class

```python
from src.modules.base import BaseModule

class MyModule(BaseModule):
    async def execute_with_asset_ids(
        self,
        inputs: Dict[str, List[str]],  # Asset IDs
        execution_id: str,
        tenant_id: str
    ) -> List[str]:  # Returns asset IDs
        # Fetch assets from Assets Service
        assets = await self.fetch_assets(inputs['asset_ids'])

        # Do work
        result = await self.process(assets)

        # Create new assets in Assets Service
        new_asset_id = await self.create_asset(
            type="image",
            url=result.url,
            execution_id=execution_id,
            tenant_id=tenant_id
        )

        return [new_asset_id]
```

### Asset-Centric Design

Modules exchange **asset IDs** instead of full objects:

Benefits:
- Reduced memory usage
- Centralized storage in Assets Service
- Automatic lineage tracking
- Easy QC integration

## MCP Integration

### MCP Client

```python
from src.mcp.client import MCPClient

# Initialize MCP client
mcp = MCPClient(server_url="https://mcp.example.com")

# Call MCP tool
result = await mcp.call_tool(
    tool_name="akool_generate_image",
    arguments={"prompt": "A sunset"}
)
```

### Supported MCP Servers

- **AKOOL** - Image and video generation
- **DALL-E** - Image generation (future)
- **Custom MCP servers** - User-defined

## Workflow Execution Flow

```
1. POST /workflows/{id}/execute
   ↓
2. Create WorkflowExecution record (status=pending)
   ↓
3. For each module in workflow:
   a. Resolve inputs (from previous modules or initial inputs)
   b. Fetch input assets from Assets Service
   c. Execute module
   d. Create output assets in Assets Service
   e. Store asset IDs in execution_data
   ↓
4. Update execution (status=completed)
   ↓
5. Return execution_id
```

## Configuration

### Environment Variables

```bash
# Required
DATABASE_URL=postgresql+asyncpg://user:pass@host/db
ASSETS_SERVICE_URL=http://localhost:8001

# Authentication
USE_JWT_AUTH=false
API_KEY=dev-api-key
# OR for JWT:
# USE_JWT_AUTH=true
# JWT_SECRET=your-secret-key

# Optional
PORT=8002
LOG_LEVEL=INFO
DEFAULT_TENANT_ID=tenant_default

# MCP
MCP_SERVER_URL=https://mcp.example.com
AKOOL_API_KEY=your-akool-key
```

## Development

### Run Locally

```bash
# Install dependencies
pip install -r requirements.txt

# Set up database
export DATABASE_URL="postgresql+asyncpg://postgres:postgres@localhost/ai_workflow"
python scripts/init_database.py

# Start Assets Service (required)
cd ../binary-blender-orchestrator-assets
python -m src.main  # Port 8001

# Start Engine Service
cd ../binary-blender-orchestrator-engine
export ASSETS_SERVICE_URL="http://localhost:8001"
export API_KEY="dev-api-key"
python -m src.main  # Port 8002
```

### Test Endpoints

```bash
# Health check
curl http://localhost:8002/health

# Create workflow
curl -X POST http://localhost:8002/workflows \
  -H "Authorization: Bearer dev-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Workflow",
    "modules": [
      {"id": "m1", "type": "image_generation", "config": {}}
    ]
  }'

# Execute workflow
curl -X POST http://localhost:8002/workflows/{id}/execute \
  -H "Authorization: Bearer dev-api-key" \
  -H "Content-Type: application/json" \
  -d '{"inputs": {"prompt": "A sunset"}}'
```

## Project Structure

```
engine/
├── _project_docs/          # Documentation
│   ├── README.md           # This file
│   ├── ARCHITECTURE.md     # Overall architecture
│   └── MODULE_GUIDE.md     # Module development guide
├── src/
│   ├── main.py             # FastAPI application
│   ├── database/
│   │   ├── connection.py   # Database connection
│   │   ├── models.py       # SQLAlchemy models
│   │   └── repositories.py # Repository pattern
│   ├── api/
│   │   ├── workflows.py    # Workflow endpoints
│   │   ├── executions.py   # Execution endpoints
│   │   └── stats.py        # Statistics endpoints
│   ├── engine/
│   │   └── workflow_engine.py  # Execution orchestrator
│   ├── modules/
│   │   ├── base.py         # Base module class
│   │   ├── image_gen_module.py
│   │   ├── qc_module.py
│   │   └── ab_testing_module.py
│   ├── mcp/
│   │   ├── client.py       # MCP client
│   │   └── registry.py     # MCP server registry
│   └── auth/
│       └── middleware.py   # JWT/API key auth
├── scripts/
│   └── init_database.py    # Database initialization
├── requirements.txt        # Python dependencies
├── Dockerfile              # Container definition
└── fly.toml                # Fly.io config
```

## Deployment

### Fly.io Deployment

```bash
# Create app
flyctl apps create ai-workflow-engine

# Attach database
flyctl postgres attach ai-workflow-spc-db --app ai-workflow-engine

# Set secrets
flyctl secrets set \
  ASSETS_SERVICE_URL="https://ai-workflow-assets.fly.dev" \
  API_KEY="production-api-key" \
  AKOOL_API_KEY="your-akool-key" \
  --app ai-workflow-engine

# Deploy
flyctl deploy --app ai-workflow-engine

# Initialize database
flyctl ssh console --app ai-workflow-engine
python scripts/init_database.py
```

## Related Services

- **Frontend Service**: Port 8000 - User interface
- **Assets Service**: Port 8001 - Asset management

## Migration from Monolith

Files to extract from `binary-blender-ai-platform`:

- `src/engine/workflow_engine.py` → Engine core
- `src/engine/workflow_engine_db.py` → DB-backed engine
- `src/modules/*.py` → Module implementations
- `src/mcp/client.py` → MCP client
- `src/database/models.py` → Workflow/execution models
- `src/database/repositories.py` → Database access
