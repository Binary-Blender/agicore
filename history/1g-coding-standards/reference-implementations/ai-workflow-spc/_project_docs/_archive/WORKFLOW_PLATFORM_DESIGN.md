# AI Workflow Platform Design Document

## Overview
Transform the current single-purpose QC app into a flexible, modular workflow automation platform similar to make.com/Zapier, where users can create custom workflows by connecting reusable components.

## Architecture

### High-Level Architecture
```
┌─────────────────────────────────────────────────────────┐
│                    Frontend (Vue.js)                     │
├──────────────┬────────────────┬────────────────────────┤
│   Workflow   │   QC Queue     │   Asset Repository     │
│   Builder    │   Interface    │      Browser           │
└──────────────┴────────────────┴────────────────────────┘
                            │
┌─────────────────────────────────────────────────────────┐
│                  Backend (FastAPI)                       │
├──────────────┬────────────────┬────────────────────────┤
│  Workflow    │    Module      │    Asset               │
│  Engine      │   Registry     │   Storage              │
└──────────────┴────────────────┴────────────────────────┘
```

## Core Components

### 1. Modules System

#### Module Interface
```python
@dataclass
class Module:
    id: str
    type: str  # "start", "image_gen", "qc", etc.
    name: str
    description: str
    config: dict  # Module-specific settings
    inputs: List[str]  # Required input types
    outputs: List[str]  # Output types produced

    async def execute(self, inputs: dict) -> dict:
        """Execute the module logic"""
        pass
```

#### Initial Modules

1. **Start Module**
   - Config: iterations (number or "continuous")
   - Outputs: ["trigger"]
   - Begins workflow execution

2. **Image Generation Module**
   - Config: prompt, model settings
   - Inputs: ["trigger"]
   - Outputs: ["images"]
   - Uses AKOOL API for generation
   - Adds images to repo in "unchecked" state

3. **Pass/Fail QC Module**
   - Inputs: ["images"]
   - Outputs: ["approved_images"]
   - Pauses workflow for human review
   - Pass: keeps in asset repo
   - Fail: deletes from repo

### 2. Workflow Engine

```python
@dataclass
class Workflow:
    id: str
    name: str
    description: str
    modules: List[Module]
    connections: List[Connection]
    state: str  # "draft", "active", "paused", "completed"
    created_at: datetime
    updated_at: datetime

@dataclass
class Connection:
    from_module_id: str
    from_output: str
    to_module_id: str
    to_input: str

@dataclass
class WorkflowExecution:
    id: str
    workflow_id: str
    state: str  # "running", "paused_for_qc", "completed", "failed"
    current_module_id: str
    execution_data: dict
    started_at: datetime
```

### 3. Asset Repository

```python
@dataclass
class Asset:
    id: str
    type: str  # "image", "video", etc.
    url: str
    metadata: dict
    state: str  # "unchecked", "approved", "rejected"
    workflow_execution_id: str
    created_at: datetime
    updated_at: datetime
```

### 4. QC Queue

```python
@dataclass
class QCTask:
    id: str
    workflow_execution_id: str
    module_id: str
    assets: List[Asset]
    state: str  # "pending", "in_review", "completed"
    created_at: datetime
    completed_at: Optional[datetime]
    reviewer_decision: Optional[dict]
```

## UI Components

### 1. Workflow Builder (Node-based like n8n)
- Drag-and-drop module palette
- Visual connection drawing
- Module configuration panels
- Real-time validation
- Save/Load workflows

### 2. QC Queue Interface
- List of pending QC tasks
- Image grid review interface
- Batch approval/rejection
- Filter by workflow/date/status

### 3. Asset Repository Browser
- Grid/list view toggle
- Search and filter
- Metadata display
- Bulk operations

## Implementation Phases

### Phase 1: Core Infrastructure (Current Sprint)
- [ ] Define data models
- [ ] Create module registry system
- [ ] Build workflow execution engine
- [ ] Refactor existing image gen & QC into modules
- [ ] Basic API endpoints

### Phase 2: Visual Workflow Builder
- [ ] Node-based editor component
- [ ] Module palette
- [ ] Connection visualization
- [ ] Configuration panels
- [ ] Workflow save/load

### Phase 3: Enhanced Features
- [ ] Scheduled workflows
- [ ] Conditional logic modules
- [ ] Parallel execution branches
- [ ] Webhook triggers
- [ ] Custom module SDK

## API Endpoints

### Workflow Management
- `POST /workflows` - Create workflow
- `GET /workflows` - List workflows
- `GET /workflows/{id}` - Get workflow details
- `PUT /workflows/{id}` - Update workflow
- `DELETE /workflows/{id}` - Delete workflow

### Workflow Execution
- `POST /workflows/{id}/execute` - Start workflow
- `GET /executions` - List executions
- `GET /executions/{id}` - Get execution status
- `POST /executions/{id}/pause` - Pause execution
- `POST /executions/{id}/resume` - Resume execution

### Module Registry
- `GET /modules` - List available modules
- `GET /modules/{type}` - Get module schema

### QC Operations
- `GET /qc/pending` - Get pending QC tasks
- `POST /qc/{task_id}/review` - Submit QC decision

### Asset Management
- `GET /assets` - List assets
- `GET /assets/{id}` - Get asset details
- `DELETE /assets/{id}` - Delete asset

## Database Schema

```sql
-- Workflows
CREATE TABLE workflows (
    id VARCHAR PRIMARY KEY,
    name VARCHAR NOT NULL,
    description TEXT,
    definition JSONB NOT NULL,  -- modules and connections
    state VARCHAR NOT NULL,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);

-- Workflow Executions
CREATE TABLE workflow_executions (
    id VARCHAR PRIMARY KEY,
    workflow_id VARCHAR REFERENCES workflows(id),
    state VARCHAR NOT NULL,
    current_module_id VARCHAR,
    execution_data JSONB,
    started_at TIMESTAMP,
    completed_at TIMESTAMP
);

-- Assets
CREATE TABLE assets (
    id VARCHAR PRIMARY KEY,
    type VARCHAR NOT NULL,
    url TEXT NOT NULL,
    metadata JSONB,
    state VARCHAR NOT NULL,
    workflow_execution_id VARCHAR REFERENCES workflow_executions(id),
    created_at TIMESTAMP
);

-- QC Tasks
CREATE TABLE qc_tasks (
    id VARCHAR PRIMARY KEY,
    workflow_execution_id VARCHAR REFERENCES workflow_executions(id),
    module_id VARCHAR NOT NULL,
    state VARCHAR NOT NULL,
    assets JSONB,  -- Array of asset IDs
    reviewer_decision JSONB,
    created_at TIMESTAMP,
    completed_at TIMESTAMP
);
```

## Technical Stack
- **Backend**: FastAPI (Python)
- **Frontend**: Vue.js 3
- **Database**: PostgreSQL (future) / In-memory (initial)
- **Deployment**: Fly.io
- **Image Storage**: S3-compatible (future) / URLs (initial)

## Future Enhancements
1. Module marketplace
2. Team collaboration features
3. API integration modules
4. Advanced scheduling (cron)
5. Workflow templates
6. Analytics dashboard
7. Webhook notifications
8. Custom scripting modules
9. Version control for workflows
10. A/B testing capabilities

## Success Metrics
- Workflow creation time < 5 minutes
- Module execution latency < 1 second
- QC review time < 30 seconds per batch
- System uptime > 99.9%
- Support for 100+ concurrent workflows

## Development Principles
1. **Modular**: Each component should be independent
2. **Extensible**: Easy to add new module types
3. **Scalable**: Queue-based architecture for growth
4. **User-friendly**: Intuitive visual interface
5. **Cloud-first**: Always deploy to Fly.io, never localhost