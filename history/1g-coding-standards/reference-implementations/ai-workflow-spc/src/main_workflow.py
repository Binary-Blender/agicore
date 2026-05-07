"""Binary-Blender Orchestrator - Main API"""
import os
import logging
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from typing import Dict, List, Any, Optional
from datetime import datetime

from .models import (
    Workflow, WorkflowState, Connection, ModuleConfig,
    Asset, AssetState, WorkflowExecution, ExecutionState
)
from .engine import WorkflowEngine
from .modules import module_registry

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(title="Binary-Blender Orchestrator")

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize workflow engine
workflow_engine = WorkflowEngine()

# Store workflows (in-memory for now)
workflows: Dict[str, Workflow] = {}


# API Models
class CreateWorkflowRequest(BaseModel):
    name: str
    description: Optional[str] = ""
    modules: List[Dict[str, Any]]
    connections: List[Dict[str, Any]]


class ExecuteWorkflowRequest(BaseModel):
    iterations: int = 1


class QCDecision(BaseModel):
    asset_id: str
    decision: str  # "pass" or "fail"


class SubmitQCRequest(BaseModel):
    decisions: List[QCDecision]


# Root endpoint - serve the UI
@app.get("/")
async def root():
    """Serve the frontend UI"""
    frontend_path = os.path.join(os.path.dirname(__file__), "../frontend/index_workflow.html")
    if os.path.exists(frontend_path):
        return FileResponse(frontend_path)
    else:
        return {"message": "Binary-Blender Orchestrator API"}


# Module Management Endpoints
@app.get("/modules")
async def list_modules():
    """List all available module types"""
    modules = module_registry.list_modules()
    return {
        "modules": [
            {
                "type": m.type,
                "name": m.name,
                "description": m.description,
                "category": m.category,
                "inputs": m.inputs,
                "outputs": m.outputs,
                "config_schema": m.config_schema,
                "icon": m.icon
            }
            for m in modules
        ]
    }


# Workflow Management Endpoints
@app.post("/workflows")
async def create_workflow(request: CreateWorkflowRequest):
    """Create a new workflow"""
    # Create module configs
    module_configs = []
    for module_data in request.modules:
        config = ModuleConfig(
            id=module_data["id"],
            type=module_data["type"],
            name=module_data.get("name", module_data["type"]),
            config=module_data["config"],
            text_bindings=module_data.get("text_bindings", {}),
            ui_overrides=module_data.get("ui_overrides", {}),
            input_config=module_data.get("input_config", {}),
            position=module_data.get("position", {"x": 0, "y": 0})
        )
        module_configs.append(config)

    # Create connections
    connections = []
    for conn_data in request.connections:
        connection = Connection(
            from_module_id=conn_data["from_module_id"],
            from_output=conn_data["from_output"],
            to_module_id=conn_data["to_module_id"],
            to_input=conn_data["to_input"],
            condition=conn_data.get("condition")
        )
        connections.append(connection)

    # Create workflow
    workflow = Workflow(
        name=request.name,
        description=request.description,
        modules=module_configs,
        connections=connections,
        state=WorkflowState.ACTIVE
    )

    workflows[workflow.id] = workflow

    return {
        "workflow_id": workflow.id,
        "created_at": workflow.created_at.isoformat()
    }


@app.get("/workflows")
async def list_workflows():
    """List all workflows"""
    return {
        "workflows": [
            {
                "id": wf.id,
                "name": wf.name,
                "description": wf.description,
                "state": wf.state,
                "created_at": wf.created_at.isoformat(),
                "module_count": len(wf.modules)
            }
            for wf in workflows.values()
        ]
    }


@app.get("/workflows/{workflow_id}")
async def get_workflow(workflow_id: str):
    """Get workflow details"""
    workflow = workflows.get(workflow_id)
    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")

    return {
        "id": workflow.id,
        "name": workflow.name,
        "description": workflow.description,
        "state": workflow.state,
        "modules": [
            {
                "id": m.id,
                "type": m.type,
                "name": m.name,
                "config": m.config,
                "text_bindings": m.text_bindings,
                "ui_overrides": m.ui_overrides,
                "position": m.position
            }
            for m in workflow.modules
        ],
        "connections": [
            {
                "id": c.id,
                "from_module_id": c.from_module_id,
                "from_output": c.from_output,
                "to_module_id": c.to_module_id,
                "to_input": c.to_input
            }
            for c in workflow.connections
        ],
        "created_at": workflow.created_at.isoformat()
    }


# Workflow Execution Endpoints
@app.post("/workflows/{workflow_id}/execute")
async def execute_workflow(workflow_id: str, request: ExecuteWorkflowRequest):
    """Start workflow execution"""
    workflow = workflows.get(workflow_id)
    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")

    if workflow.state != WorkflowState.ACTIVE:
        raise HTTPException(status_code=400, detail="Workflow is not active")

    # Execute workflow with initial context
    initial_context = {
        "iterations": request.iterations,
        "current_iteration": 0
    }

    execution = await workflow_engine.execute_workflow(workflow, initial_context)

    return {
        "execution_id": execution.id,
        "state": execution.state.value,
        "started_at": execution.started_at.isoformat()
    }


@app.put("/workflows/{workflow_id}")
async def update_workflow(workflow_id: str, request: CreateWorkflowRequest):
    """Update an existing workflow"""
    workflow = workflows.get(workflow_id)
    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")

    # Update workflow properties
    workflow.name = request.name
    workflow.description = request.description or ""

    # Clear and rebuild modules
    workflow.modules = []
    for m in request.modules:
        module_config = ModuleConfig(
            id=m["id"],
            type=m["type"],
            name=m.get("name", m["type"]),
            config=m.get("config", {}),
            text_bindings=m.get("text_bindings", {}),
            ui_overrides=m.get("ui_overrides", {}),
            input_config=m.get("input_config", {}),
            position=m.get("position", {"x": 0, "y": 0})
        )
        workflow.modules.append(module_config)

    # Clear and rebuild connections
    workflow.connections = []
    for c in request.connections:
        # Handle conditional connections for QC modules
        connection = Connection(
            from_module_id=c["from_module_id"],
            from_output=c.get("from_output", "default"),
            to_module_id=c["to_module_id"],
            to_input=c.get("to_input", "trigger"),
            condition=c.get("condition")  # For conditional routing
        )
        workflow.connections.append(connection)

    logger.info(f"Updated workflow: {workflow_id}")

    return {
        "workflow": {
            "id": workflow.id,
            "name": workflow.name,
            "description": workflow.description,
            "modules": len(workflow.modules),
            "connections": len(workflow.connections),
            "state": workflow.state.value,
            "updated_at": datetime.now().isoformat()
        }
    }


@app.delete("/workflows/{workflow_id}")
async def delete_workflow(workflow_id: str):
    """Delete a workflow"""
    if workflow_id not in workflows:
        raise HTTPException(status_code=404, detail="Workflow not found")

    # Check if workflow has active executions
    active_executions = [
        e for e in workflow_engine.executions.values()
        if e.workflow_id == workflow_id and e.state not in [ExecutionState.COMPLETED, ExecutionState.FAILED]
    ]

    if active_executions:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot delete workflow with {len(active_executions)} active executions"
        )

    del workflows[workflow_id]
    logger.info(f"Deleted workflow: {workflow_id}")

    return {"success": True, "message": f"Workflow {workflow_id} deleted"}


@app.post("/workflows/{workflow_id}/clone")
async def clone_workflow(workflow_id: str):
    """Clone an existing workflow"""
    source_workflow = workflows.get(workflow_id)
    if not source_workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")

    # Create a new workflow with a unique name
    cloned_workflow = Workflow(
        name=f"{source_workflow.name} (Copy)",
        description=source_workflow.description,
        modules=[],  # Initialize empty lists
        connections=[]
    )

    # Deep copy modules
    for module in source_workflow.modules:
        cloned_module = ModuleConfig(
            id=module.id,  # Keep same module IDs for connections
            type=module.type,
            name=module.name,
            config=module.config.copy() if module.config else {},  # Handle None config
            text_bindings=(module.text_bindings or {}).copy(),
            ui_overrides=(module.ui_overrides or {}).copy(),
            input_config=module.input_config.copy() if getattr(module, "input_config", None) else {},
            position=module.position.copy() if isinstance(module.position, dict) else {"x": 0, "y": 0}
        )
        cloned_workflow.modules.append(cloned_module)

    # Deep copy connections
    for conn in source_workflow.connections:
        cloned_conn = Connection(
            from_module_id=conn.from_module_id,
            from_output=conn.from_output,
            to_module_id=conn.to_module_id,
            to_input=conn.to_input,
            condition=conn.condition
        )
        cloned_workflow.connections.append(cloned_conn)

    # Store the cloned workflow
    workflows[cloned_workflow.id] = cloned_workflow
    logger.info(f"Cloned workflow {workflow_id} to {cloned_workflow.id}")

    return {
        "workflow": {
            "id": cloned_workflow.id,
            "name": cloned_workflow.name,
            "description": cloned_workflow.description,
            "modules": len(cloned_workflow.modules),
            "connections": len(cloned_workflow.connections),
            "state": cloned_workflow.state.value,
            "source_workflow_id": workflow_id
        }
    }


@app.get("/executions")
async def list_executions():
    """List all workflow executions"""
    executions = workflow_engine.executions.values()
    return {
        "executions": [
            {
                "id": e.id,
                "workflow_id": e.workflow_id,
                "state": e.state.value,
                "started_at": e.started_at.isoformat(),
                "completed_at": e.completed_at.isoformat() if e.completed_at else None
            }
            for e in executions
        ]
    }


@app.get("/executions/{execution_id}")
async def get_execution_status(execution_id: str):
    """Get execution status"""
    execution = workflow_engine.get_execution_status(execution_id)
    if not execution:
        raise HTTPException(status_code=404, detail="Execution not found")

    return {
        "id": execution.id,
        "workflow_id": execution.workflow_id,
        "state": execution.state.value,
        "current_module_id": execution.current_module_id,
        "started_at": execution.started_at.isoformat(),
        "completed_at": execution.completed_at.isoformat() if execution.completed_at else None
    }


# QC Endpoints
@app.get("/qc/pending")
async def get_pending_qc():
    """Get pending QC tasks"""
    tasks = workflow_engine.get_pending_qc_tasks()
    return {
        "tasks": tasks,
        "count": len(tasks)
    }


@app.post("/qc/{task_id}/review")
async def submit_qc_review(task_id: str, request: SubmitQCRequest):
    """Submit QC review decisions"""
    # Convert decisions to the format expected by the engine
    results = {}
    for decision in request.decisions:
        results[decision.asset_id] = {"decision": decision.decision}

    # Await the async submit_qc_results method
    success = await workflow_engine.submit_qc_results(task_id, results)

    if not success:
        raise HTTPException(status_code=404, detail="QC task not found or workflow resume failed")

    return {"success": True}


# Asset Management Endpoints
@app.get("/assets")
async def list_assets():
    """List all assets"""
    assets = workflow_engine.global_context.get("assets", [])
    approved_assets = [a for a in assets if a.get("state") == AssetState.APPROVED.value]

    return {
        "assets": approved_assets,
        "count": len(approved_assets)
    }


@app.get("/assets/{asset_id}")
async def get_asset(asset_id: str):
    """Get asset details"""
    assets = workflow_engine.global_context.get("assets", [])
    asset = next((a for a in assets if a.get("id") == asset_id), None)

    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")

    return asset


# Create a pre-configured test workflow on startup
@app.on_event("startup")
async def create_test_workflow():
    """Create a test workflow: Start -> Image Gen -> QC"""
    test_modules = [
        {
            "id": "start_1",
            "type": "start",
            "name": "Start",
            "config": {"iterations": 1},
            "position": {"x": 100, "y": 200}
        },
        {
            "id": "image_gen_1",
            "type": "image_generation",
            "name": "Generate Images",
            "config": {
                "prompt": "A serene mountain landscape at sunset with vibrant colors",
                "negative_prompt": "blurry, low quality"
            },
            "position": {"x": 300, "y": 200}
        },
        {
            "id": "qc_1",
            "type": "qc_review",
            "name": "Quality Control",
            "config": {"review_mode": "individual"},
            "position": {"x": 500, "y": 200}
        }
    ]

    test_connections = [
        {
            "from_module_id": "start_1",
            "from_output": "trigger",
            "to_module_id": "image_gen_1",
            "to_input": "trigger"
        },
        {
            "from_module_id": "image_gen_1",
            "from_output": "images",
            "to_module_id": "qc_1",
            "to_input": "images"
        }
    ]

    request = CreateWorkflowRequest(
        name="Test Image Generation Workflow",
        description="Generate images and review quality",
        modules=test_modules,
        connections=test_connections
    )

    await create_workflow(request)
    logger.info("Created test workflow")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8080)
