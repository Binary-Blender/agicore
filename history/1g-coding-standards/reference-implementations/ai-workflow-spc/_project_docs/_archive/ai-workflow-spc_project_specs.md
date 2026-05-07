# AI Workflow Platform - Technical & Functional Specification

## Executive Summary

The AI Workflow Platform is a visual workflow builder similar to make.com, designed for creating and executing AI-powered workflows with human quality control integration. The platform enables users to build workflows using drag-and-drop modules, execute them with AI services (starting with AKOOL image generation), and implement human QC checkpoints with conditional routing.

**Current Version:** v3.6
**Deployment:** https://ai-workflow-spc.fly.dev/
**Repository:** https://github.com/Binary-Blender/binary-blender-ai-platform

---

## 1. Project Overview

### 1.1 Purpose
Create a no-code workflow automation platform that:
- Allows visual construction of AI workflows
- Supports human-in-the-loop quality control
- Enables BYOK (Bring Your Own Key) for API integrations
- Provides asset management and archival
- Scales to support multiple concurrent workflows

### 1.2 Core Concept
Users build workflows by dragging modules onto a canvas, connecting them in sequence, and configuring each module's parameters. Workflows can pause for human QC review and conditionally route based on approval/rejection decisions.

### 1.3 Target Users
- Content creators needing AI-generated assets
- QC operators reviewing generated content
- Workflow designers building automation pipelines

---

## 2. Current Implementation Status

### 2.1 Completed Features ✅

#### Workflow Management
- ✅ Create workflows using drag-and-drop builder
- ✅ Save/load workflows to PostgreSQL database
- ✅ Edit existing workflows
- ✅ Clone workflows
- ✅ Delete workflows (with safety checks for active executions)
- ✅ Execute workflows with parameter inputs
- ✅ View workflow execution history

#### Quality Control System
- ✅ Human QC queue for reviewing generated content
- ✅ Pass/Fail decisions with conditional routing
- ✅ Batch QC submission (review all assets before resuming workflow)
- ✅ Visual feedback during QC review (green/red borders)
- ✅ Submit button with loading state

#### Asset Management
- ✅ Asset repository for approved images
- ✅ Individual asset archiving
- ✅ Bulk asset selection and archiving
- ✅ Visual selection indicators (checkboxes + cyan highlights)
- ✅ Asset state tracking (unchecked, approved, rejected, archived)

#### Execution Management
- ✅ Real-time execution status tracking
- ✅ Pause/resume workflow execution
- ✅ Execution archiving (soft delete)
- ✅ Execution history with timestamps and durations

#### Database & Persistence
- ✅ PostgreSQL integration with async SQLAlchemy
- ✅ Alembic migrations
- ✅ Repository pattern for data access
- ✅ Soft delete architecture for executions and assets

### 2.2 Known Limitations & Technical Debt

1. **No Authentication/Authorization** - Single user system currently
2. **Limited Error Recovery** - No retry logic for failed API calls
3. **No Workflow Versioning** - Editing a workflow affects all future executions
4. **No Execution Rollback** - Cannot undo or retry failed workflow steps
5. **No Batch Operations** - Workflows execute sequentially, not in parallel
6. **Limited Module Types** - Only 4 modules currently (Start, Image Gen, QC, End)
7. **No Workflow Templates** - Users must build from scratch each time
8. **No Collaboration Features** - No sharing or multi-user workflow editing
9. **No Scheduled Execution** - All workflows are manually triggered
10. **No Analytics/Reporting** - No insights into workflow performance

---

## 3. Technical Architecture

### 3.1 Technology Stack

#### Backend
- **Framework:** FastAPI 0.104+
- **Database:** PostgreSQL (via Fly.io)
- **ORM:** SQLAlchemy 2.0+ (async)
- **Database Driver:** asyncpg
- **Migrations:** Alembic
- **Python Version:** 3.11

#### Frontend
- **Framework:** Vue 3 (CDN-based, no build system)
- **HTTP Client:** Axios
- **Styling:** Custom CSS (dark theme)
- **Routing:** Multi-page architecture (4 separate HTML files)

#### Infrastructure
- **Hosting:** Fly.io
- **Container:** Docker
- **Database:** PostgreSQL managed by Fly.io
- **Region:** US-based deployment

#### External Services
- **AKOOL API:** Image generation service
- **CDN:** Cloudfront (for generated images)

### 3.2 System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend Layer                        │
│  (4 separate Vue 3 apps - workflows, QC, assets, builder)  │
└────────────────────────┬────────────────────────────────────┘
                         │ REST API (JSON)
┌────────────────────────▼────────────────────────────────────┐
│                     FastAPI Backend                          │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              API Endpoints Layer                      │   │
│  │  /workflows  /executions  /qc  /assets  /modules     │   │
│  └──────────────────┬───────────────────────────────────┘   │
│                     │                                         │
│  ┌──────────────────▼───────────────────────────────────┐   │
│  │           Repository Pattern Layer                    │   │
│  │  WorkflowRepo  ExecutionRepo  AssetRepo  QCTaskRepo  │   │
│  └──────────────────┬───────────────────────────────────┘   │
│                     │                                         │
│  ┌──────────────────▼───────────────────────────────────┐   │
│  │              Workflow Engine                          │   │
│  │  - Module orchestration                               │   │
│  │  - Execution state management                         │   │
│  │  - Pause/resume logic                                 │   │
│  └──────────────────┬───────────────────────────────────┘   │
│                     │                                         │
│  ┌──────────────────▼───────────────────────────────────┐   │
│  │              Module Registry                          │   │
│  │  StartModule  ImageGenModule  QCModule  EndModule    │   │
│  └──────────────────┬───────────────────────────────────┘   │
└────────────────────┬┴───────────────────────────────────────┘
                     │
        ┌────────────┴─────────────┐
        │                          │
┌───────▼────────┐        ┌────────▼──────────┐
│   PostgreSQL   │        │   AKOOL API       │
│   Database     │        │   (Image Gen)     │
└────────────────┘        └───────────────────┘
```

### 3.3 Database Schema

#### Workflows Table
```sql
CREATE TABLE workflows (
    id VARCHAR PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    state VARCHAR(50),  -- 'active', 'archived', 'draft'
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE
);
```

#### Workflow Modules Table
```sql
CREATE TABLE workflow_modules (
    id VARCHAR PRIMARY KEY,
    workflow_id VARCHAR REFERENCES workflows(id) ON DELETE CASCADE,
    type VARCHAR(100) NOT NULL,
    name VARCHAR(255) NOT NULL,
    config JSON,  -- Module-specific configuration including API keys
    position JSON  -- {x: 0, y: 0} for visual positioning
);
```

#### Workflow Connections Table
```sql
CREATE TABLE workflow_connections (
    id VARCHAR PRIMARY KEY,
    workflow_id VARCHAR REFERENCES workflows(id) ON DELETE CASCADE,
    from_module_id VARCHAR NOT NULL,
    from_output VARCHAR(50),  -- 'default', 'pass', 'fail'
    to_module_id VARCHAR NOT NULL,
    to_input VARCHAR(50),
    condition VARCHAR(50)  -- 'pass', 'fail', null
);
```

#### Workflow Executions Table
```sql
CREATE TABLE workflow_executions (
    id VARCHAR PRIMARY KEY,
    workflow_id VARCHAR REFERENCES workflows(id),
    state VARCHAR(50),  -- 'running', 'paused_for_qc', 'completed', 'failed'
    current_module_id VARCHAR,
    execution_data JSON,  -- Module outputs and runtime state
    paused_data JSON,  -- State snapshot when paused
    archived BOOLEAN DEFAULT FALSE,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE
);
```

#### Assets Table
```sql
CREATE TABLE assets (
    id VARCHAR PRIMARY KEY,
    type VARCHAR(50) DEFAULT 'image',
    url TEXT NOT NULL,
    prompt TEXT,
    asset_metadata JSON,
    state VARCHAR(50),  -- 'unchecked', 'approved', 'rejected'
    archived BOOLEAN DEFAULT FALSE,
    execution_id VARCHAR REFERENCES workflow_executions(id),
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE
);
```

#### QC Tasks Table
```sql
CREATE TABLE qc_tasks (
    id VARCHAR PRIMARY KEY,
    execution_id VARCHAR REFERENCES workflow_executions(id),
    module_id VARCHAR NOT NULL,
    task_type VARCHAR(50) DEFAULT 'pass_fail',
    status VARCHAR(50) DEFAULT 'pending',  -- 'pending', 'completed'
    created_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE
);
```

#### QC Decisions Table
```sql
CREATE TABLE qc_decisions (
    id VARCHAR PRIMARY KEY,
    qc_task_id VARCHAR REFERENCES qc_tasks(id),
    asset_id VARCHAR REFERENCES assets(id),
    decision VARCHAR(50) NOT NULL,  -- 'pass', 'fail'
    created_at TIMESTAMP WITH TIME ZONE
);
```

---

## 4. API Endpoints

### 4.1 Workflow Management

#### List Workflows
```
GET /workflows
Response: {
  "workflows": [
    {
      "id": "wf_abc123",
      "name": "Image Generation Pipeline",
      "description": "Generate and QC images",
      "modules": 4,
      "connections": 3,
      "state": "active",
      "created_at": "2025-10-29T10:00:00Z",
      "updated_at": "2025-10-29T10:00:00Z"
    }
  ]
}
```

#### Get Workflow Details
```
GET /workflows/{workflow_id}
Response: {
  "workflow": {
    "id": "wf_abc123",
    "name": "Image Generation Pipeline",
    "description": "Generate and QC images",
    "state": "active",
    "modules": [...],
    "connections": [...],
    "created_at": "2025-10-29T10:00:00Z",
    "updated_at": "2025-10-29T10:00:00Z"
  }
}
```

#### Create Workflow
```
POST /workflows
Request: {
  "name": "New Workflow",
  "description": "Description",
  "modules": [
    {
      "id": "module_123",
      "type": "start",
      "name": "Start",
      "config": {},
      "position": {"x": 0, "y": 0}
    }
  ],
  "connections": [
    {
      "from_module_id": "module_123",
      "from_output": "default",
      "to_module_id": "module_456",
      "to_input": "default",
      "condition": null
    }
  ]
}
```

#### Update Workflow
```
PUT /workflows/{workflow_id}
Request: Same as Create
```

#### Delete Workflow
```
DELETE /workflows/{workflow_id}
Response: {"success": true, "message": "Workflow deleted"}
```

#### Clone Workflow
```
POST /workflows/{workflow_id}/clone
Response: {"workflow": {...}}
```

### 4.2 Execution Management

#### List Executions
```
GET /executions
Response: {
  "executions": [
    {
      "id": "exec_123",
      "workflow_id": "wf_abc",
      "state": "completed",
      "started_at": "2025-10-29T10:00:00Z",
      "completed_at": "2025-10-29T10:05:00Z"
    }
  ]
}
```

#### Execute Workflow
```
POST /workflows/{workflow_id}/execute
Request: {
  "parameters": {
    "iterations": 4
  }
}
Response: {
  "execution_id": "exec_123",
  "status": "running"
}
```

#### Archive Execution
```
DELETE /executions/{execution_id}
Response: {"success": true, "message": "Execution archived"}
```

### 4.3 QC Management

#### List QC Tasks
```
GET /qc/tasks
Response: {
  "tasks": [
    {
      "id": "qc_123",
      "execution_id": "exec_456",
      "module_id": "module_789",
      "task_type": "pass_fail",
      "created_at": "2025-10-29T10:00:00Z",
      "images": [
        {
          "id": "asset_111",
          "url": "https://cdn.example.com/image.jpg",
          "prompt": "Mountain landscape",
          "state": "unchecked"
        }
      ]
    }
  ]
}
```

#### Submit QC Review
```
POST /qc/{task_id}/review
Request: {
  "decisions": [
    {"asset_id": "asset_111", "decision": "pass"},
    {"asset_id": "asset_222", "decision": "fail"}
  ]
}
Response: {"success": true}
```

### 4.4 Asset Management

#### List Assets
```
GET /assets?state=approved
Response: {
  "assets": [
    {
      "id": "asset_123",
      "type": "image",
      "url": "https://cdn.example.com/image.jpg",
      "prompt": "Mountain landscape",
      "state": "approved",
      "created_at": "2025-10-29T10:00:00Z",
      "updated_at": "2025-10-29T10:05:00Z"
    }
  ]
}
```

#### Archive Asset
```
DELETE /assets/{asset_id}
Response: {"success": true, "message": "Asset archived"}
```

#### Bulk Archive Assets
```
POST /assets/archive-bulk
Request: {
  "asset_ids": ["asset_123", "asset_456"]
}
Response: {"success": true, "archived_count": 2}
```

### 4.5 Module Registry

#### List Available Modules
```
GET /modules
Response: {
  "modules": ["start", "image_generation", "qc_pass_fail", "end"]
}
```

---

## 5. Module System

### 5.1 Module Architecture

All modules inherit from `BaseModule` with standard interface:

```python
class BaseModule(ABC):
    def __init__(self, module_id: str, config: Dict[str, Any]):
        self.module_id = module_id
        self.config = config

    @abstractmethod
    async def execute(
        self,
        inputs: Dict[str, Any],
        execution_context: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Execute module logic and return outputs"""
        pass

    def get_config_schema(self) -> Dict[str, Any]:
        """Return JSON schema for module configuration"""
        return {}
```

### 5.2 Current Module Types

#### 5.2.1 Start Module
**Purpose:** Workflow entry point, accepts iteration parameters

**Configuration:**
```json
{
  "iterations": {
    "type": "number",
    "label": "Number of iterations",
    "default": 1,
    "min": 1,
    "max": 100
  }
}
```

**Outputs:**
```json
{
  "iterations": 4
}
```

#### 5.2.2 Image Generation Module
**Purpose:** Generate images using AKOOL API

**Configuration:**
```json
{
  "prompt": {
    "type": "textarea",
    "label": "Image Prompt",
    "required": true
  },
  "negative_prompt": {
    "type": "textarea",
    "label": "Negative Prompt (optional)"
  },
  "apiKey": {
    "type": "password",
    "label": "AKOOL API Key",
    "required": true
  },
  "aspect_ratio": {
    "type": "select",
    "label": "Aspect Ratio",
    "options": ["1:1", "4:3", "3:4", "16:9", "9:16", "3:2", "2:3"],
    "default": "1:1"
  }
}
```

**Implementation Details:**
- Makes parallel API requests (one per iteration)
- Polls AKOOL for task completion
- Creates assets in "unchecked" state
- Uses `upscaled_urls` array from AKOOL response

**Outputs:**
```json
{
  "images": [
    {
      "id": "asset_123",
      "url": "https://cdn.example.com/image.jpg",
      "prompt": "Mountain landscape"
    }
  ]
}
```

#### 5.2.3 Pass/Fail QC Module
**Purpose:** Pause workflow for human quality control review

**Configuration:**
```json
{
  "task_type": "pass_fail"
}
```

**Execution Behavior:**
1. Sets `execution_context["should_pause"] = True`
2. Sets `execution_context["pause_reason"] = "awaiting_qc"`
3. Sets `execution_context["qc_data"]` with images
4. Returns empty outputs (outputs stored after QC completion)

**Outputs (after QC):**
```json
{
  "approved_images": [...],  // Images that passed
  "rejected_images": [...]   // Images that failed
}
```

**Conditional Routing:**
- On Pass: Continue to next module
- On Fail: Route back to specified module (typically Image Gen)

#### 5.2.4 End Module
**Purpose:** Workflow termination point

**Configuration:** None

**Outputs:** None

---

## 6. Workflow Execution Engine

### 6.1 Execution Flow

```
1. User triggers workflow execution
2. Engine creates execution record (state: "running")
3. Engine builds execution order via topological sort
4. For each module in order:
   a. Get inputs from previous module outputs
   b. Execute module
   c. Check if module requested pause
   d. If pause requested:
      - Save paused state (context, module_outputs, remaining modules)
      - Create QC task if reason is "awaiting_qc"
      - Exit execution
   e. If no pause:
      - Store module outputs
      - Continue to next module
5. Mark execution as "completed"
```

### 6.2 Pause/Resume Architecture

**Pausing:**
```python
paused_data = {
    "module_id": current_module_id,
    "inputs": module_inputs,
    "context": execution_context,
    "module_outputs": module_outputs,
    "remaining_modules": [...]
}
execution.state = "paused_for_qc"
execution.paused_data = paused_data
```

**Resuming:**
```python
# Restore module_outputs to execution_data
execution.execution_data["module_outputs"] = paused_data["module_outputs"]

# Restore context and clear pause flags
context = paused_data["context"]
context["resuming"] = True
context.pop("should_pause", None)
context.pop("pause_reason", None)

# Add QC results to context
context.update({"qc_results": qc_decisions})

# Continue execution from where it paused
await execute_workflow_async(workflow, execution_id, parameters, restored_context=context)
```

### 6.3 Module Execution Order

Uses topological sort with these rules:
1. Find start module(s)
2. Build dependency graph from connections
3. Skip "fail" connections for main flow
4. DFS traversal for execution order
5. Reverse order for correct sequence

---

## 7. Frontend Architecture

### 7.1 Page Structure

The application uses a multi-page architecture (not SPA):

1. **workflows.html** (`/`) - Workflow management and execution history
2. **qc.html** (`/qc-queue`) - QC review interface
3. **assets.html** (`/asset-repository`) - Asset gallery
4. **builder.html** (`/workflow-builder`) - Drag-and-drop workflow builder

### 7.2 Workflow Builder Implementation

#### Module Palette
```javascript
moduleCategories: [
  {
    name: 'Flow Control',
    expanded: true,
    modules: [
      { type: 'start', name: 'Start', icon: '▶️' },
      { type: 'end', name: 'End', icon: '⏹️' }
    ]
  },
  {
    name: 'AI Generation',
    expanded: true,
    modules: [
      { type: 'image_generation', name: 'Image Generator', icon: '🎨' }
    ]
  },
  {
    name: 'Quality Control',
    expanded: true,
    modules: [
      { type: 'qc_pass_fail', name: 'Pass/Fail QC', icon: '✓✗' }
    ]
  }
]
```

#### Workflow Canvas State
```javascript
data() {
  return {
    buildingWorkflow: {
      name: '',
      description: '',
      steps: [],  // Array of module instances
      connections: []  // Array of connections
    },
    selectedStep: null,
    editingWorkflowId: null
  }
}
```

#### Module Configuration
Dynamic forms generated based on module schema:
```javascript
configSchema: {
  prompt: { type: 'textarea', label: 'Prompt', required: true },
  apiKey: { type: 'password', label: 'API Key' }
}
```

### 7.3 State Management

Each page maintains its own Vue instance with reactive state:

```javascript
createApp({
  data() {
    return {
      workflows: [],
      executions: [],
      assets: [],
      qcTasks: [],
      selectedAssets: [],  // For bulk operations
      loading: false
    }
  },
  methods: {
    async fetchWorkflows() { ... },
    async fetchExecutions() { ... },
    async archiveSingle(id) { ... },
    async archiveBulk() { ... }
  }
}).mount('#app')
```

---

## 8. AKOOL API Integration

### 8.1 Image Generation Process

```python
async def _generate_single_image(session, api_key, prompt, negative_prompt):
    # 1. Submit generation request
    response = await session.post(
        "https://openapi.akool.com/api/open/v3/content/image",
        json={
            "prompt": prompt,
            "scale": "1:1"  # Required parameter
        },
        headers={"x-api-key": api_key}
    )
    task_id = response["_id"]

    # 2. Poll for completion
    while True:
        status_response = await session.get(
            f"https://openapi.akool.com/api/open/v3/content/image/infobymodelid?image_model_id={task_id}",
            headers={"x-api-key": api_key}
        )

        if status_response["image_status"] == 3:  # Completed
            # 3. Extract individual images from upscaled_urls
            return status_response["upscaled_urls"]

        await asyncio.sleep(2)  # Poll every 2 seconds
```

### 8.2 Important AKOOL Findings

1. **Single Image Generation:** Each API call generates 4 images (2x2 grid)
2. **Field Names:** Task ID is in `_id` field, not `task_id`
3. **Image URLs:** Use `upscaled_urls` array for individual images
4. **Status Codes:** 1=queuing, 2=processing, 3=completed, 4=failed
5. **Required Parameters:** `prompt` and `scale` only
6. **Unsupported:** `numberOfImages`, `styleId`, `negative_prompt`

---

## 9. Deployment

### 9.1 Fly.io Configuration

**fly.toml:**
```toml
app = "ai-workflow-spc"
primary_region = "iad"

[env]
  PORT = "8000"

[http_service]
  internal_port = 8000
  force_https = true
  auto_stop_machines = true
  auto_start_machines = true
  min_machines_running = 0

[[vm]]
  cpu_kind = "shared"
  cpus = 1
  memory_mb = 512
```

### 9.2 Docker Configuration

**Dockerfile:**
```dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

RUN chmod +x /app/start.sh

EXPOSE 8000

CMD ["/app/start.sh"]
```

**start.sh:**
```bash
#!/bin/bash
set -e

# Run migrations
alembic upgrade head

# Start application
uvicorn src.main_workflow_db:app --host 0.0.0.0 --port 8000
```

### 9.3 Environment Variables

Required secrets (set via `flyctl secrets set`):
- `DATABASE_URL` - PostgreSQL connection string
- `AKOOL_API_KEY` - Default AKOOL API key (optional, BYOK preferred)

### 9.4 Database Setup

PostgreSQL is provisioned via Fly.io:
```bash
flyctl postgres create --name ai-workflow-spc-db
flyctl postgres attach --app ai-workflow-spc ai-workflow-spc-db
```

---

## 10. Key Design Patterns

### 10.1 Repository Pattern
Separates data access logic from business logic:
```python
class WorkflowRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_by_id(self, workflow_id: str) -> Optional[Workflow]:
        stmt = select(Workflow).where(Workflow.id == workflow_id)
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()
```

### 10.2 Soft Delete Pattern
Uses `archived` boolean flag instead of deleting records:
- Preserves data for audit trails
- Maintains referential integrity
- Enables unarchive functionality
- Filters archived records in default queries

### 10.3 BYOK (Bring Your Own Key)
API keys stored per module instance, not globally:
- Each workflow can use different keys
- Supports multi-tenant scenarios
- No credit system management
- Users control their own costs

### 10.4 Pause/Resume State Machine
Workflows can pause and resume without losing state:
- Serialize execution context to JSON
- Store in `paused_data` field
- Restore context on resume
- Clear pause flags to prevent re-pausing

---

## 11. Performance Considerations

### 11.1 Database Queries
- Use `selectinload()` for eager loading related data
- NullPool for serverless environment (no connection pooling)
- Indexes on primary keys and foreign keys
- JSONB fields for flexible schema

### 11.2 API Performance
- Parallel AKOOL requests (asyncio.gather)
- 2-second polling interval for task status
- Async/await throughout the stack
- No blocking operations

### 11.3 Frontend Performance
- No build system = fast page loads
- Minimal JavaScript dependencies
- Cache-busting meta tags
- Version numbers in titles for verification

---

## 12. Security Considerations

### 12.1 Current Security Measures
- SQL injection protection via SQLAlchemy ORM
- Password input type for API keys
- HTTPS enforced by Fly.io
- Database credentials in environment variables

### 12.2 Security Gaps (Future Work)
- ❌ No authentication/authorization
- ❌ No input sanitization
- ❌ No rate limiting
- ❌ API keys stored in plaintext in database
- ❌ No CORS restrictions (allow all origins)
- ❌ No CSRF protection

---

## 13. Testing Strategy

### 13.1 Current Testing Approach
- Manual testing in production (Fly.io)
- User acceptance testing by project owner
- No automated tests currently

### 13.2 Recommended Testing (Future)
- **Unit Tests:** Module execution logic
- **Integration Tests:** Repository layer
- **E2E Tests:** Full workflow execution
- **API Tests:** Endpoint contracts
- **Load Tests:** Concurrent workflow execution

---

## 14. Future Roadmap Considerations

### 14.1 Near-Term Enhancements
1. **Workflow Templates** - Pre-built workflows for common use cases
2. **Retry Logic** - Auto-retry failed API calls
3. **Workflow Versioning** - Track changes to workflows
4. **Execution Rollback** - Undo failed workflow steps
5. **Analytics Dashboard** - Workflow performance metrics
6. **Scheduled Execution** - Cron-like workflow triggers

### 14.2 Medium-Term Features
1. **Authentication/Authorization** - Multi-user support
2. **Role-Based Access Control** - QC operators vs designers
3. **Workflow Sharing** - Collaborate on workflows
4. **More Module Types:**
   - Text generation (GPT-4, Claude)
   - Video generation
   - Audio generation
   - Data transformation
   - External API calls
5. **Parallel Execution** - Branch workflows
6. **Variables & Expressions** - Dynamic data passing

### 14.3 Long-Term Vision
1. **MCP Integration** - Model Context Protocol for component marketplace
2. **Workflow Marketplace** - Share/sell workflow templates
3. **White-Label Solution** - Deploy for other organizations
4. **Mobile App** - QC review on mobile devices
5. **Real-Time Collaboration** - Multiple users editing workflows
6. **AI-Assisted Workflow Builder** - Suggest optimal workflows

---

## 15. Known Issues & Bugs

### 15.1 Fixed in v3.6
- ✅ QC queue showing empty despite pending tasks
- ✅ Workflow status not updating after QC completion
- ✅ Edit workflow causing 500 errors
- ✅ Module ID argument missing in execution
- ✅ Clone workflow 500 error
- ✅ Asset fetch not called on page load

### 15.2 Outstanding Issues
- None reported at this time

---

## 16. Development Workflow

### 16.1 Git Workflow
```bash
# Make changes
git add -A
git commit -m "Description of changes"
git push origin main
```

### 16.2 Deployment Workflow
```bash
# Deploy to Fly.io
flyctl deploy

# View logs
flyctl logs -a ai-workflow-spc

# SSH into container
flyctl ssh console -a ai-workflow-spc
```

### 16.3 Database Migrations
```bash
# Create migration
alembic revision -m "description"

# Apply migrations (automatically done on deployment)
alembic upgrade head
```

---

## 17. Code Organization

```
/mnt/c/Users/Chris/Documents/_DevProjects/ai-workflow-spc/
├── alembic/
│   ├── versions/
│   │   ├── 001_initial_schema.py
│   │   ├── 002_add_archived_flag.py
│   │   └── 003_add_archived_flag_to_assets.py
│   └── env.py
├── frontend/
│   ├── workflows.html      # Main workflows page
│   ├── qc.html            # QC queue page
│   ├── assets.html        # Asset repository page
│   └── builder.html       # Workflow builder page
├── src/
│   ├── database/
│   │   ├── models.py           # SQLAlchemy models
│   │   ├── repositories.py     # Repository classes
│   │   └── connection.py       # Database connection
│   ├── engine/
│   │   └── workflow_engine_db.py  # Workflow execution engine
│   ├── modules/
│   │   ├── base.py            # BaseModule interface
│   │   ├── start_module.py
│   │   ├── image_gen_module.py
│   │   ├── qc_module.py
│   │   └── end_module.py
│   └── main_workflow_db.py    # FastAPI application
├── Dockerfile
├── fly.toml
├── requirements.txt
├── start.sh
├── desired_functionality.txt
├── lessons_learned.md
├── current_sprint.md
└── PROJECT_SPECIFICATION.md
```

---

## 18. Dependencies

### 18.1 Python Dependencies (requirements.txt)
```
fastapi==0.104.1
uvicorn[standard]==0.24.0
sqlalchemy==2.0.23
asyncpg==0.29.0
alembic==1.12.1
pydantic==2.5.0
aiohttp==3.9.1
python-multipart==0.0.6
```

### 18.2 Frontend Dependencies (CDN)
```html
<script src="https://cdn.jsdelivr.net/npm/vue@3/dist/vue.global.prod.js"></script>
<script src="https://cdn.jsdelivr.net/npm/axios/dist/axios.min.js"></script>
```

---

## 19. Best Practices Learned

1. **Version Numbering:** Increment version in HTML title for cache verification
2. **Soft Delete:** Preserve data with `archived` flags for audit trails
3. **Batch Operations:** Collect all decisions before state transitions
4. **Session Management:** Be aware of SQLAlchemy session lifecycle
5. **Async Throughout:** Use async/await consistently across the stack
6. **Repository Pattern:** Separate data access from business logic
7. **DateTime Serialization:** Convert datetime to ISO strings for JSON storage
8. **Module Registry:** Register modules for dynamic instantiation
9. **Pause Flags:** Clear pause flags when resuming to prevent re-pausing
10. **Error Handling:** Provide clear, actionable error messages

---

## 20. Contact & Support

**Project Owner:** Chris (Binary-Blender)
**Repository:** https://github.com/Binary-Blender/binary-blender-ai-platform
**Deployment:** https://ai-workflow-spc.fly.dev/
**Current Version:** v3.6

---

**Last Updated:** October 29, 2025
**Document Version:** 1.0
