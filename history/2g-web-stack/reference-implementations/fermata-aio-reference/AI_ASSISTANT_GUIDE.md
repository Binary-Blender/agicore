# AI Assistant Guide: Binary Blender Orchestrator Reference Implementation

**Purpose**: This document is specifically designed for AI coding assistants working on this codebase. It contains comprehensive architecture patterns, code conventions, and implementation details.

**Last Updated**: 2025-11-23
**Architecture Version**: 2.0
**Status**: Production Reference Implementation

---

## Table of Contents

1. [Quick Start for AI Assistants](#quick-start-for-ai-assistants)
2. [Core Architecture Concepts](#core-architecture-concepts)
3. [Module Development Patterns](#module-development-patterns)
4. [Workflow Engine Internals](#workflow-engine-internals)
5. [Asset-Centric Architecture](#asset-centric-architecture)
6. [Human Checkpoint Pattern](#human-checkpoint-pattern)
7. [SPC Progressive Sampling](#spc-progressive-sampling)
8. [Database Schema](#database-schema)
9. [API Patterns](#api-patterns)
10. [Common Implementation Tasks](#common-implementation-tasks)
11. [Testing Patterns](#testing-patterns)
12. [Debugging Guide](#debugging-guide)

---

## Quick Start for AI Assistants

### When Asked to "Add a New Module"

1. **Inherit from `BaseModule`** in `src/modules/base.py`
2. **Implement required methods**:
   - `get_definition()` - Returns ModuleDefinition with schema
   - `execute()` - Main execution logic (legacy, asset-aware)
   - Optionally `execute_with_asset_ids()` - Pure asset-centric (recommended)
3. **Register module** in `src/modules/__init__.py` via `module_registry.register(YourModule)`
4. **Create assets** using `await self.create_asset(...)` - NEVER return raw data
5. **Use logging helpers**: `self._log_info()`, `self._log_warning()`, `self._log_error()`

### When Asked to "Add a Workflow"

1. Create workflow definition as JSON or programmatically via `Workflow` dataclass
2. Define modules (id, type, config) and connections (from→to with output→input mapping)
3. Execute via `WorkflowEngine.execute_workflow(workflow, initial_context)`
4. All inter-module data transfer happens via **asset IDs** (strings), not objects

### When Asked to "Add Human Review"

1. Use `QCModule` at the checkpoint location
2. Configure `review_mode`, `auto_reject_threshold`, `max_retries`, `failAction`, `retryStep`
3. Workflow will pause automatically when QC module executes
4. Resume via `WorkflowEngine.resume_execution(execution_id, qc_results)`

### When Asked About "Progressive Sampling" or "SPC"

- Implemented in `src/spc/progressive_sampling.py`
- Automatically reduces human review from 100% → 50% → 10% → 5% based on AI quality
- Uses Process Capability Index (Cpk): Cpk ≥ 1.33 = capable, Cpk ≥ 2.0 = world-class
- Thresholds: 50 samples @ 80% pass → 50% sampling, 100 samples @ 95% pass → 5% sampling

---

## Core Architecture Concepts

### The Three Pillars

**1. Modular Components (The Lego Blocks)**

Every operation is a self-contained module:
- Has defined inputs and outputs (typed)
- Executes independently
- Creates assets (not pass-through data)
- Logs all actions
- Follows single-responsibility principle

**2. Human QC Checkpoints (The Pause Button)**

Workflows can pause and wait for human input:
- Module sets `execution_context["should_pause"] = True`
- Engine enters `ExecutionState.PAUSED_FOR_QC`
- Full state preserved (module outputs, context)
- Resumes from exact same point
- No data loss or reprocessing

**3. Asset-Centric Architecture (Git for AI)**

Everything is an asset with full lineage:
- Every module output becomes a persisted `Asset` with unique ID
- Assets have `source_asset_ids` (parent lineage)
- Assets have `state` (unchecked, approved, rejected)
- Assets have `metadata` (provider info, quality metrics, etc.)
- Modules exchange asset IDs, not raw data

### Key Data Flow

```
Input Asset IDs → Module Execution → Output Asset IDs
       ↓
  Fetch Assets      Create Assets     Return IDs
  from Repo    →    in Repo      →    to Engine
```

**Important**: Modules NEVER return raw data (URLs, binary, etc.) directly. They always create assets and return asset IDs.

---

## Module Development Patterns

### BaseModule Interface

All modules inherit from `src/modules/base.py::BaseModule`

**Required Methods**:

```python
from src.modules.base import BaseModule, ModuleDefinition
from typing import Dict, Any

class MyCustomModule(BaseModule):
    """Always include a docstring"""

    def get_definition(self) -> ModuleDefinition:
        """Return module metadata for UI/registry"""
        return ModuleDefinition(
            type="my_custom_module",  # Unique type identifier
            name="My Custom Module",  # Human-readable name
            description="What this module does",
            category="action",  # "trigger", "action", "transform", "output"
            inputs=["input_images"],  # List of input names
            outputs=["processed_images"],  # List of output names
            config_schema={  # JSON Schema for configuration UI
                "type": "object",
                "properties": {
                    "parameter1": {
                        "type": "string",
                        "description": "What this parameter does",
                        "default": "default_value"
                    }
                }
            },
            icon="🎨"  # Emoji for UI
        )

    async def execute(
        self,
        inputs: Dict[str, Any],
        execution_context: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Legacy execution method (still supported)"""

        # 1. Extract inputs
        input_images = inputs.get("input_images", [])

        # 2. Access config
        parameter1 = self.config.get("parameter1", "default")

        # 3. Log execution start
        self._log_info(
            execution_context,
            f"Processing {len(input_images)} images with param={parameter1}"
        )

        # 4. Process data
        processed = []
        for img in input_images:
            # Your processing logic here
            result = self._process_image(img, parameter1)
            processed.append(result)

        # 5. Create assets (NOT raw data!)
        output_assets = []
        for result in processed:
            asset = await self.create_asset(
                asset_type="image",
                url=result["url"],  # Where the image lives
                metadata={
                    "prompt": result.get("prompt"),
                    "processing_params": {"param1": parameter1},
                    "quality_score": result.get("score", 0.0)
                },
                execution_context=execution_context
            )
            output_assets.append({
                "id": asset.id,
                "url": asset.url,
                "type": asset.type,
                "metadata": asset.asset_metadata
            })

        # 6. Log completion
        self._log_info(
            execution_context,
            f"Processed {len(output_assets)} images successfully"
        )

        # 7. Return output
        return {"processed_images": output_assets}

    def _process_image(self, img, parameter):
        """Helper method for processing"""
        # Your actual processing logic
        pass
```

### Asset-Centric Pattern (Recommended)

For new modules, override `execute_with_asset_ids()` for full asset-centric flow:

```python
async def execute_with_asset_ids(
    self,
    input_asset_ids: Dict[str, List[str]],
    execution_context: Dict[str, Any]
) -> Dict[str, List[str]]:
    """Pure asset-centric execution"""

    # 1. Fetch input assets
    image_ids = input_asset_ids.get("input_images", [])
    images = await self.fetch_assets(image_ids)

    # 2. Process
    output_asset_ids = []
    for img in images:
        # Access asset properties
        url = img.url
        metadata = img.asset_metadata

        # Your processing
        result_url = self._process(url, metadata)

        # 3. Create new asset
        asset = await self.create_asset(
            asset_type="image",
            url=result_url,
            metadata={"processed_from": img.id},
            execution_context=execution_context
        )
        output_asset_ids.append(asset.id)

    # 4. Return asset IDs (strings)
    return {"processed_images": output_asset_ids}
```

### Creating Assets - The Right Way

**DO**:
```python
# Create asset in repository
asset = await self.create_asset(
    asset_type="image",  # "image", "video", "audio", "text", "json"
    url="https://s3.amazonaws.com/bucket/image.png",
    metadata={
        "prompt": "a beautiful sunset",
        "provider": "dall-e-3",
        "quality_score": 0.95
    },
    execution_context=execution_context
)

# Return asset ID
return {"output_images": [asset.id]}
```

**DON'T**:
```python
# DON'T return raw URLs
return {"output_images": ["https://s3.amazonaws.com/bucket/image.png"]}

# DON'T return raw data objects
return {"output_images": [{"url": "...", "data": bytes}]}
```

### Inline Assets (Text, JSON)

For text or structured data that doesn't live at an external URL:

```python
# Text content
asset = await self.create_asset(
    asset_type="text",
    text_content="This is the extracted text from the PDF...",
    metadata={"source": "page_1"},
    execution_context=execution_context
)

# JSON payload
asset = await self.create_asset(
    asset_type="json",
    payload={"key": "value", "data": [1, 2, 3]},
    metadata={"schema_version": "1.0"},
    execution_context=execution_context
)
```

**Auto-Generated URLs**: When `url` is omitted, the system generates `inline://{type}/{uuid}` automatically.

### Logging Best Practices

Use the structured logging helpers:

```python
# Info - normal operation
self._log_info(
    execution_context,
    "Generated 10 images successfully",
    {"count": 10, "provider": "dall-e-3"}
)

# Warning - recoverable issue
self._log_warning(
    execution_context,
    "Quality score below threshold",
    {"score": 0.65, "threshold": 0.75}
)

# Error - failure
self._log_error(
    execution_context,
    "Failed to generate image",
    {"error": str(e), "attempt": 3}
)
```

These logs are:
- Stored in `execution_context["execution_logs"]`
- Emitted to Python logger
- Automatically sanitized (secrets/keys/passwords redacted)
- Available for debugging and audit trails

---

## Workflow Engine Internals

### How Workflows Execute

`src/engine/workflow_engine.py::WorkflowEngine` orchestrates all modules.

**Execution Flow**:

1. **Build Dependency Graph**: `_build_execution_graph()` creates module→dependencies map
2. **Topological Sort**: `_topological_sort()` determines execution order
3. **Execute Modules in Order**: `_execute_graph()` runs each module sequentially
4. **Gather Inputs**: For each module, collect asset IDs from connected modules
5. **Call Module**: `module.execute_with_asset_ids(input_asset_ids, context)`
6. **Check for Pause**: If `context["should_pause"]`, enter PAUSED_FOR_QC state
7. **Store Outputs**: Save `module_outputs[module_id] = output_asset_ids`
8. **Continue or Stop**: If paused, persist state; otherwise continue to next module

**Critical Implementation Details**:

```python
# Engine stores outputs as asset IDs
module_outputs = {
    "module_1": {"images": ["asset_abc", "asset_def"]},
    "module_2": {"text": ["asset_xyz"]}
}

# Connections wire outputs to inputs
connections = [
    Connection(
        from_module_id="module_1",
        from_output="images",  # From module_1's output "images"
        to_module_id="module_2",
        to_input="input_images"  # To module_2's input "input_images"
    )
]

# Engine gathers inputs
input_asset_ids = {}
for conn in connections:
    if conn.to_module_id == "module_2":
        input_asset_ids["input_images"] = module_outputs["module_1"]["images"]
# Result: {"input_images": ["asset_abc", "asset_def"]}
```

### Pause/Resume Mechanism

**Pausing**:

```python
# Module sets pause flag
execution_context["should_pause"] = True
execution_context["pause_reason"] = "awaiting_qc"
execution_context["current_qc_task_id"] = "qc_task_123"

# Engine detects pause
if context.get("should_pause"):
    execution.state = ExecutionState.PAUSED_FOR_QC

    # Store paused state
    self.paused_executions[execution.id] = {
        "workflow": workflow,
        "context": context,
        "graph": graph,
        "module_outputs": module_outputs  # Does NOT include current module
    }

    # Stop execution
    return
```

**Resuming**:

```python
# Resume with human input
await engine.resume_execution(
    execution_id="exec_abc123",
    resume_data={"qc_results": {
        "asset_abc": {"decision": "pass"},
        "asset_def": {"decision": "fail"}
    }}
)

# Engine restores state
paused_data = self.paused_executions[execution_id]
workflow = paused_data["workflow"]
context = paused_data["context"]
module_outputs = paused_data["module_outputs"]

# Add resume data to context
context.update(resume_data)

# Resume from paused module
await self._execute_graph(
    workflow, execution, graph, context,
    resume_from=execution.current_module_id,
    module_outputs=module_outputs
)
```

**Key Insight**: The current module re-executes when resuming, so it must check for resume data:

```python
async def execute(self, inputs, execution_context):
    qc_task_id = execution_context.get("current_qc_task_id")

    if qc_task_id:
        # RESUMING - we have QC results
        qc_results = execution_context.get("qc_results", {})
        return await self._process_results(qc_results)
    else:
        # INITIAL RUN - create QC task and pause
        execution_context["current_qc_task_id"] = "qc_new"
        execution_context["should_pause"] = True
        return {}  # Empty results for now
```

---

## Asset-Centric Architecture

### Asset Model

`src/models/workflow.py::Asset`

```python
@dataclass
class Asset:
    id: str                      # UUID
    type: str                    # "image", "video", "audio", "text", "json"
    url: str                     # External URL or inline://
    prompt: Optional[str]        # Original prompt (if applicable)
    state: AssetState            # unchecked, approved, rejected
    metadata: Dict[str, Any]     # Arbitrary JSON
    execution_id: Optional[str]  # Which execution created this
    module_id: Optional[str]     # Which module created this
    source_asset_ids: List[str]  # Parent assets (lineage)
    text_content: Optional[str]  # Inline text payload
    payload: Optional[Dict]      # Inline JSON payload
    created_at: datetime
    updated_at: datetime
```

### Asset Repository

`src/database/repositories.py::AssetRepository`

**Methods**:
- `create(asset_data: Dict) -> Asset` - Create new asset
- `get_by_ids(asset_ids: List[str]) -> List[Asset]` - Fetch multiple assets
- `get_by_id(asset_id: str) -> Asset` - Fetch single asset
- `update_state(asset_id: str, state: AssetState) -> Asset` - Change approval state
- `get_lineage(asset_id: str) -> List[Asset]` - Get full parent chain
- `get_by_execution(execution_id: str) -> List[Asset]` - All assets in execution

**Usage Pattern**:

```python
# Engine injects repository into modules
module._set_asset_repo(asset_repo)

# Module fetches assets
assets = await self.fetch_assets(["asset_1", "asset_2"])

# Module creates assets
asset = await self.create_asset(
    asset_type="image",
    url="https://...",
    metadata={"quality": 0.9}
)
```

### Asset Lineage Tracking

Every asset tracks its parents:

```python
# Module processes input assets
input_ids = ["asset_original_1", "asset_original_2"]
inputs = await self.fetch_assets(input_ids)

# Create new asset with lineage
output = await self.create_asset(
    asset_type="video",
    url="https://result.mp4",
    metadata={
        "combined_from": input_ids  # Explicit tracking
    },
    execution_context=execution_context
)

# Asset automatically gets source_asset_ids set to input_ids
```

**Querying Lineage**:

```python
# Get all parents
lineage = await asset_repo.get_lineage(asset_id)
# Returns: [parent, grandparent, great-grandparent, ...]

# Visualize dependency tree
for i, asset in enumerate(lineage):
    print(f"{'  ' * i}└─ {asset.id} ({asset.type}) by {asset.module_id}")
```

---

## Human Checkpoint Pattern

### QC Module Internals

`src/modules/qc_module.py::QCModule`

**First Execution (Pause)**:

```python
async def execute(self, inputs, execution_context):
    images = inputs.get("images", [])
    qc_task_id = execution_context.get("current_qc_task_id")

    if not qc_task_id:
        # Create QC task
        task = QCTask(
            workflow_execution_id=execution_context["execution_id"],
            module_id=self.module_id,
            assets=images
        )

        # Store in context
        execution_context["current_qc_task_id"] = task.id

        # Add to global queue
        execution_context["global_context"]["qc_queue"].append(task.__dict__)

        # Signal pause
        execution_context["should_pause"] = True
        execution_context["pause_reason"] = "awaiting_qc"

        # Return empty (will be filled on resume)
        return {"approved_images": []}
```

**Resume Execution (Process Results)**:

```python
async def execute(self, inputs, execution_context):
    qc_task_id = execution_context.get("current_qc_task_id")

    if qc_task_id:
        # Resume path
        qc_results = execution_context.get("qc_results", {})

        approved = []
        rejected = []

        for image in inputs["images"]:
            decision = qc_results.get(image["id"], {}).get("decision")
            if decision == "pass":
                approved.append(image["id"])
            elif decision == "fail":
                rejected.append(image["id"])

        # Return asset IDs (not objects)
        return {
            "approved_images": approved,
            "rejected_images": rejected
        }
```

### QC Task Structure

```python
@dataclass
class QCTask:
    id: str
    workflow_execution_id: str
    module_id: str
    assets: List[Asset]  # Assets to review
    state: QCTaskState   # pending, in_review, completed
    reviewer_decision: Optional[Dict[str, Any]]
    created_at: datetime
    completed_at: Optional[datetime]
```

### Submitting QC Results

API endpoint: `POST /qc/submit`

```json
{
  "task_id": "qc_task_123",
  "results": {
    "asset_abc": {"decision": "pass", "comment": "Looks good"},
    "asset_def": {"decision": "fail", "comment": "Poor quality"}
  }
}
```

**Engine Processing**:

```python
async def submit_qc_results(self, task_id: str, results: Dict):
    # Find task
    task = self._find_task(task_id)

    # Update asset states in database
    for asset_id, result in results.items():
        if result["decision"] == "pass":
            await asset_repo.update_state(asset_id, AssetState.APPROVED)
        elif result["decision"] == "fail":
            await asset_repo.update_state(asset_id, AssetState.REJECTED)

    # Resume workflow
    execution_id = task["workflow_execution_id"]
    await self.resume_execution(execution_id, {"qc_results": results})
```

### Retry on QC Failure

QCModule supports automatic retry:

```python
# Module config
config = {
    "failAction": "retry",  # or "end"
    "retryStep": 2,  # Step number to restart from
    "max_retries": 3  # Maximum retry attempts
}

# On rejection
if rejected_count > 0 and config["failAction"] == "retry":
    retry_state = execution_context.setdefault("qc_retry_state", {})
    attempts = retry_state.get(self.module_id, {}).get("attempts", 0)

    if attempts < config["max_retries"]:
        # Trigger retry
        execution_context["retry_request"] = {
            "step_number": config["retryStep"],
            "reason": "qc_failure"
        }
```

**Engine Retry Handling**: *(Future implementation - currently manual)*

---

## SPC Progressive Sampling

### Statistical Process Control Basics

`src/spc/progressive_sampling.py`

**Core Concept**: Reduce human review as AI proves reliable, just like manufacturing quality control.

**Key Metrics**:

1. **Pass Rate**: `approved / (approved + rejected)`
2. **Process Capability (Cpk)**: Statistical measure of process quality
   - Cpk < 1.0: Not capable (needs improvement)
   - Cpk ≥ 1.33: Capable (acceptable)
   - Cpk ≥ 2.0: World-class (excellent)
3. **Sampling Rate**: Percentage of outputs requiring human review

**Thresholds**:

```python
# Young process (< 50 samples)
sampling_rate = 100%  # Review everything

# Maturing process (50-99 samples, pass_rate > 80%)
sampling_rate = 50%   # Review half

# Mature process (≥ 100 samples, pass_rate > 95%)
sampling_rate = 5%    # Review 5%

# Quality drop (pass_rate < threshold)
sampling_rate = 100%  # Back to full review
```

### Implementation

```python
class SPCController:
    def should_require_qc(self, process_name: str) -> bool:
        """Determine if this task needs human QC"""
        stats = self.get_process_stats(process_name)

        total = stats["total"]
        pass_rate = stats["pass_rate"]
        sampling_rate = stats["sampling_rate"]

        # Always QC first 50 samples
        if total < 50:
            return True

        # Reduce to 50% after 50 samples if pass rate > 80%
        if 50 <= total < 100:
            if pass_rate >= 0.80:
                return random.random() < 0.50
            else:
                return True

        # Reduce to 5% after 100 samples if pass rate > 95%
        if total >= 100:
            if pass_rate >= 0.95:
                return random.random() < 0.05
            elif pass_rate >= 0.80:
                return random.random() < 0.50
            else:
                return True

        return True

    def record_qc_result(self, process_name: str, passed: bool):
        """Record QC decision to update statistics"""
        stats = self.process_stats[process_name]
        stats["total"] += 1
        if passed:
            stats["approved"] += 1
        else:
            stats["rejected"] += 1

        # Recalculate metrics
        stats["pass_rate"] = stats["approved"] / stats["total"]
        stats["process_capability"] = self._calculate_cpk(stats)
```

### Integration with QC Module

```python
class QCModule(BaseModule):
    def __init__(self, module_id, config):
        super().__init__(module_id, config)
        self.spc_controller = SPCController()

    async def execute(self, inputs, execution_context):
        images = inputs.get("images", [])

        # Check if QC needed
        process_name = self.config.get("process_name", "default")

        # Filter images needing QC
        images_needing_qc = []
        auto_approved = []

        for img in images:
            if self.spc_controller.should_require_qc(process_name):
                images_needing_qc.append(img)
            else:
                # Auto-approve via SPC
                auto_approved.append(img["id"])
                await asset_repo.update_state(img["id"], AssetState.APPROVED)

        if images_needing_qc:
            # Create QC task and pause
            # ... (normal QC flow)
        else:
            # All auto-approved
            return {"approved_images": auto_approved}
```

### Cost Savings Calculation

```python
# Without SPC
total_tasks = 500
qc_cost_per_task = $0.50
total_cost = 500 × $0.50 = $250

# With SPC (at 7% sampling rate)
tasks_requiring_qc = 35
total_cost = 35 × $0.50 = $17.50

# Savings
savings = $250 - $17.50 = $232.50
savings_percentage = 93%
```

**Real Production Metrics** (from MelodyLMS):
- 500 AI generations/week
- Started: 100% QC ($250/week)
- After 4 weeks: 7% QC ($17.50/week)
- **Savings: 93% ($12,090/year)**

---

## Database Schema

### Tables

`alembic/versions/001_initial_schema.py`

**1. workflows**
```sql
CREATE TABLE workflows (
    id VARCHAR PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    state VARCHAR(50),  -- draft, active, paused, completed
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

**2. workflow_modules**
```sql
CREATE TABLE workflow_modules (
    id VARCHAR PRIMARY KEY,
    workflow_id VARCHAR REFERENCES workflows(id),
    type VARCHAR(100) NOT NULL,  -- Module type
    name VARCHAR(255) NOT NULL,
    config JSON,  -- Module configuration
    position JSON  -- UI position {x, y}
);
```

**3. workflow_connections**
```sql
CREATE TABLE workflow_connections (
    id VARCHAR PRIMARY KEY,
    workflow_id VARCHAR REFERENCES workflows(id),
    from_module_id VARCHAR NOT NULL,
    from_output VARCHAR NOT NULL,
    to_module_id VARCHAR NOT NULL,
    to_input VARCHAR NOT NULL,
    condition VARCHAR  -- Optional conditional routing
);
```

**4. workflow_executions**
```sql
CREATE TABLE workflow_executions (
    id VARCHAR PRIMARY KEY,
    workflow_id VARCHAR REFERENCES workflows(id),
    state VARCHAR(50),  -- running, paused_for_qc, completed, failed
    current_module_id VARCHAR,
    execution_data JSON,  -- Context data
    paused_data JSON,  -- State when paused
    started_at TIMESTAMP DEFAULT NOW(),
    completed_at TIMESTAMP
);
```

**5. assets**
```sql
CREATE TABLE assets (
    id VARCHAR PRIMARY KEY,
    type VARCHAR(50),  -- image, video, audio, text, json
    url TEXT NOT NULL,
    prompt TEXT,
    asset_metadata JSON,  -- Arbitrary metadata
    state VARCHAR(50),  -- unchecked, approved, rejected
    execution_id VARCHAR REFERENCES workflow_executions(id),
    module_id VARCHAR,
    source_asset_ids JSON,  -- Array of parent asset IDs
    text_content TEXT,  -- Inline text payload
    payload JSON,  -- Inline JSON payload
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

**6. qc_tasks**
```sql
CREATE TABLE qc_tasks (
    id VARCHAR PRIMARY KEY,
    execution_id VARCHAR REFERENCES workflow_executions(id),
    module_id VARCHAR NOT NULL,
    task_type VARCHAR(50),  -- pass_fail, selection, etc.
    status VARCHAR(50),  -- pending, in_review, completed
    created_at TIMESTAMP DEFAULT NOW(),
    completed_at TIMESTAMP
);
```

**7. qc_decisions**
```sql
CREATE TABLE qc_decisions (
    id VARCHAR PRIMARY KEY,
    qc_task_id VARCHAR REFERENCES qc_tasks(id),
    asset_id VARCHAR REFERENCES assets(id),
    decision VARCHAR(50),  -- pass, fail
    created_at TIMESTAMP DEFAULT NOW()
);
```

### Repository Pattern

`src/database/repositories.py`

**Asset Repository**:

```python
class AssetRepository:
    def __init__(self, db_session):
        self.db = db_session

    async def create(self, asset_data: Dict) -> Asset:
        """Create new asset"""
        asset_id = f"asset_{uuid4().hex[:8]}"
        # Insert into database
        # Return Asset object

    async def get_by_ids(self, asset_ids: List[str]) -> List[Asset]:
        """Fetch multiple assets by ID"""
        # SELECT * FROM assets WHERE id IN (...)

    async def update_state(self, asset_id: str, state: AssetState) -> Asset:
        """Update asset approval state"""
        # UPDATE assets SET state = ?, updated_at = NOW() WHERE id = ?

    async def get_lineage(self, asset_id: str) -> List[Asset]:
        """Get full parent chain recursively"""
        # Recursive query on source_asset_ids
```

---

## API Patterns

### FastAPI Application

`src/api/main.py`

**Key Endpoints**:

```python
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

app = FastAPI(title="Binary Blender Orchestrator")

# Workflow Management
@app.post("/workflows")
async def create_workflow(workflow: WorkflowCreate):
    """Create a new workflow"""
    pass

@app.get("/workflows/{workflow_id}")
async def get_workflow(workflow_id: str):
    """Get workflow definition"""
    pass

# Execution
@app.post("/workflows/{workflow_id}/execute")
async def execute_workflow(workflow_id: str, initial_data: Dict):
    """Start workflow execution"""
    engine = WorkflowEngine(asset_repo)
    execution = await engine.execute_workflow(workflow, initial_data)
    return {"execution_id": execution.id}

@app.get("/executions/{execution_id}")
async def get_execution_status(execution_id: str):
    """Check execution status"""
    pass

# QC Tasks
@app.get("/qc/pending")
async def get_pending_qc_tasks():
    """Get all pending QC tasks"""
    return engine.get_pending_qc_tasks()

@app.post("/qc/{task_id}/submit")
async def submit_qc_results(task_id: str, results: QCResults):
    """Submit QC decisions"""
    success = await engine.submit_qc_results(task_id, results.dict())
    if not success:
        raise HTTPException(404, "Task not found")
    return {"status": "resumed"}

# Assets
@app.get("/assets/{asset_id}")
async def get_asset(asset_id: str):
    """Get asset details"""
    pass

@app.get("/assets/{asset_id}/lineage")
async def get_asset_lineage(asset_id: str):
    """Get full parent chain"""
    lineage = await asset_repo.get_lineage(asset_id)
    return {"lineage": lineage}

# Statistics (SPC)
@app.get("/stats")
async def get_statistics():
    """Get SPC statistics and cost savings"""
    return spc_controller.get_all_stats()
```

**Request/Response Models**:

```python
class WorkflowCreate(BaseModel):
    name: str
    description: str
    modules: List[ModuleConfig]
    connections: List[Connection]

class QCResults(BaseModel):
    results: Dict[str, QCDecision]

class QCDecision(BaseModel):
    decision: str  # "pass" or "fail"
    comment: Optional[str]
```

---

## Common Implementation Tasks

### Task 1: Add a New Module Type

**Steps**:

1. Create new module class in `src/modules/my_module.py`:

```python
from .base import BaseModule, ModuleDefinition

class MyModule(BaseModule):
    def get_definition(self) -> ModuleDefinition:
        return ModuleDefinition(
            type="my_module_type",
            name="My Module",
            description="What it does",
            category="action",
            inputs=["input1"],
            outputs=["output1"],
            config_schema={...},
            icon="⚡"
        )

    async def execute(self, inputs, execution_context):
        # Implementation
        pass
```

2. Register in `src/modules/__init__.py`:

```python
from .my_module import MyModule
from .base import module_registry

module_registry.register(MyModule)
```

3. Test:

```python
# tests/test_my_module.py
async def test_my_module():
    module = MyModule("test_id", {"param": "value"})
    result = await module.execute({"input1": [...]}, {})
    assert "output1" in result
```

### Task 2: Create a Workflow Programmatically

```python
from src.models.workflow import Workflow, ModuleConfig, Connection

workflow = Workflow(
    name="Image Processing Pipeline",
    description="Generate and enhance images",
    modules=[
        ModuleConfig(
            id="gen_1",
            type="image_generator",
            name="Generate Image",
            config={"prompt": "a sunset", "count": 5}
        ),
        ModuleConfig(
            id="qc_1",
            type="qc_review",
            name="QC Check",
            config={"review_mode": "individual"}
        ),
        ModuleConfig(
            id="enhance_1",
            type="image_enhancer",
            name="Enhance Images",
            config={"upscale_factor": 2}
        )
    ],
    connections=[
        Connection(
            from_module_id="gen_1",
            from_output="images",
            to_module_id="qc_1",
            to_input="images"
        ),
        Connection(
            from_module_id="qc_1",
            from_output="approved_images",
            to_module_id="enhance_1",
            to_input="images"
        )
    ]
)

# Execute
engine = WorkflowEngine(asset_repo)
execution = await engine.execute_workflow(workflow)
```

### Task 3: Integrate External AI Service via MCP

**Model Context Protocol (MCP)** is a standard for connecting to AI services.

```python
import httpx

class MCPDalleModule(BaseModule):
    """DALL-E image generation via MCP"""

    async def execute(self, inputs, execution_context):
        prompt = self.config.get("prompt", "default prompt")
        count = self.config.get("count", 1)

        # Call MCP server
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "http://localhost:8080/mcp/dalle/generate",
                json={
                    "prompt": prompt,
                    "n": count,
                    "size": "1024x1024"
                }
            )
            data = response.json()

        # Create assets
        output_assets = []
        for img_url in data["urls"]:
            asset = await self.create_asset(
                asset_type="image",
                url=img_url,
                metadata={
                    "prompt": prompt,
                    "provider": "dall-e-3",
                    "model": "dall-e-3"
                },
                execution_context=execution_context
            )
            output_assets.append(asset.id)

        return {"images": output_assets}
```

### Task 4: Handle Asset State Changes

```python
# In QC module after review
for asset_id, decision in qc_results.items():
    if decision["decision"] == "pass":
        await asset_repo.update_state(asset_id, AssetState.APPROVED)
    else:
        await asset_repo.update_state(asset_id, AssetState.REJECTED)

# Query approved assets only
approved = await asset_repo.get_by_state(
    execution_id="exec_123",
    state=AssetState.APPROVED
)
```

---

## Testing Patterns

### Unit Tests for Modules

```python
import pytest
from src.modules.my_module import MyModule

@pytest.mark.asyncio
async def test_module_execution():
    # Arrange
    module = MyModule("test_id", {"param": "value"})
    inputs = {"input1": [{"id": "asset_1", "url": "..."}]}
    context = {"execution_id": "exec_1", "workflow_id": "wf_1"}

    # Act
    result = await module.execute(inputs, context)

    # Assert
    assert "output1" in result
    assert len(result["output1"]) > 0
```

### Integration Tests for Workflows

```python
@pytest.mark.asyncio
async def test_full_workflow():
    # Setup
    asset_repo = InMemoryAssetRepository()
    engine = WorkflowEngine(asset_repo)

    workflow = create_test_workflow()

    # Execute
    execution = await engine.execute_workflow(workflow, {})

    # Verify
    assert execution.state == ExecutionState.COMPLETED
    assets = await asset_repo.get_by_execution(execution.id)
    assert len(assets) > 0
```

### Mocking External Services

```python
from unittest.mock import AsyncMock

@pytest.mark.asyncio
async def test_mcp_module_with_mock():
    module = MCPDalleModule("test", {"prompt": "test"})

    # Mock the HTTP call
    with patch("httpx.AsyncClient.post") as mock_post:
        mock_post.return_value = AsyncMock(
            json=AsyncMock(return_value={"urls": ["http://test.png"]})
        )

        result = await module.execute({}, {})

        assert len(result["images"]) == 1
        mock_post.assert_called_once()
```

---

## Debugging Guide

### Common Issues and Solutions

**Issue 1: "Asset repository not set"**

```
RuntimeError: Asset repository not set. Workflow engine must call _set_asset_repo()
```

**Cause**: Module trying to create/fetch assets without repository.

**Solution**: Ensure `WorkflowEngine` is initialized with `asset_repo`:

```python
engine = WorkflowEngine(asset_repo=asset_repository_instance)
```

---

**Issue 2: Workflow doesn't pause for QC**

**Cause**: Missing `should_pause` flag in execution context.

**Solution**: QC module must set:

```python
execution_context["should_pause"] = True
execution_context["pause_reason"] = "awaiting_qc"
```

---

**Issue 3: Assets not showing lineage**

**Cause**: `source_asset_ids` not set when creating assets.

**Solution**: Pass execution context to `create_asset()`:

```python
asset = await self.create_asset(
    ...,
    execution_context=execution_context  # Auto-sets lineage
)
```

Or manually set:

```python
asset = await self.create_asset(
    ...,
    metadata={"source_asset_ids": parent_ids}
)
```

---

**Issue 4: Module outputs not passing to next module**

**Cause**: Wrong output/input names in connections.

**Solution**: Verify connection mapping:

```python
# Module A returns {"my_output": [...]}
# Connection must use exact key
Connection(
    from_module_id="module_a",
    from_output="my_output",  # Must match exactly
    to_module_id="module_b",
    to_input="input_images"
)
```

---

**Issue 5: SPC not reducing sampling rate**

**Cause**: Not enough samples or pass rate too low.

**Solution**: Check thresholds:

```python
stats = spc_controller.get_process_stats("my_process")
print(f"Total: {stats['total']}, Pass Rate: {stats['pass_rate']}")

# Need: total >= 50 AND pass_rate >= 0.80 for 50% sampling
# Need: total >= 100 AND pass_rate >= 0.95 for 5% sampling
```

---

### Logging and Tracing

**Enable detailed logs**:

```python
import logging
logging.basicConfig(level=logging.DEBUG)
```

**Check execution logs**:

```python
execution = await engine.execute_workflow(workflow)
logs = execution.execution_data.get("execution_logs", [])
for log in logs:
    print(f"[{log['level']}] {log['message']}")
```

**Trace asset lineage**:

```python
async def trace_asset(asset_id: str):
    lineage = await asset_repo.get_lineage(asset_id)
    for i, asset in enumerate(lineage):
        indent = "  " * i
        print(f"{indent}└─ {asset.id} ({asset.type}) by {asset.module_id}")
        print(f"{indent}   State: {asset.state}, Created: {asset.created_at}")
```

---

## Quick Reference Cheat Sheet

### Module Lifecycle

```
1. __init__(module_id, config)
2. _set_asset_repo(repo)           # By engine
3. execute_with_asset_ids(inputs, context)
   a. fetch_assets(asset_ids)
   b. [Your processing logic]
   c. create_asset(...)
   d. return {output_name: [asset_ids]}
```

### Workflow Execution Lifecycle

```
1. Build graph: module → dependencies
2. Topological sort: execution order
3. For each module:
   a. Gather inputs from connections
   b. Execute module
   c. Check for pause flag
   d. Store outputs
   e. Continue or pause
4. Mark as completed or paused
```

### Asset Creation Checklist

- ✅ Use `await self.create_asset(...)`
- ✅ Set `asset_type` (image, video, text, json, audio)
- ✅ Provide `url` or omit for inline://
- ✅ Pass `execution_context` for auto-lineage
- ✅ Return asset IDs, not objects

### QC Pause/Resume Checklist

- ✅ Set `execution_context["should_pause"] = True`
- ✅ Set `execution_context["current_qc_task_id"] = task.id`
- ✅ Add task to `global_context["qc_queue"]`
- ✅ Return empty results on pause
- ✅ Check for `qc_results` on resume
- ✅ Process results and update asset states

### SPC Thresholds

| Samples | Pass Rate | Sampling Rate |
|---------|-----------|---------------|
| < 50    | Any       | 100%          |
| 50-99   | ≥ 80%     | 50%           |
| 50-99   | < 80%     | 100%          |
| ≥ 100   | ≥ 95%     | 5%            |
| ≥ 100   | 80-95%    | 50%           |
| ≥ 100   | < 80%     | 100%          |

---

## Conclusion

This reference implementation provides a **production-ready foundation** for building AI workflows with:

✅ Modular, composable architecture
✅ Human-in-the-loop quality control
✅ Full asset lineage tracking
✅ Progressive cost reduction via SPC
✅ Pause/resume workflow execution
✅ MCP integration for external AI services

**When in doubt**:
1. Check this guide
2. Read the source code comments
3. Look at example workflows in `examples/`
4. Review test cases in `tests/`

**For AI Assistants**: This architecture is designed to be extended. When asked to add new capabilities, follow the existing patterns and maintain the three core pillars: modularity, human checkpoints, and asset-centricity.

---

**Document Version**: 1.0
**Last Updated**: 2025-11-23
**Maintained By**: Binary Blender Development Team
