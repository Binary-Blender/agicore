"""
Engine Service - Main Application

Handles workflow orchestration and execution
"""
import os
import logging
import asyncio
from fastapi import FastAPI, Depends, HTTPException, Query, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from typing import List, Optional, Dict, Any
from pydantic import BaseModel

from .database.connection import get_db
from .database.repositories import WorkflowRepository, ExecutionRepository
from .database.models import Workflow, WorkflowExecution
from .auth.middleware import get_current_tenant
from .engine.workflow_engine import workflow_engine
from .modules import module_registry

# Configure logging
logging.basicConfig(level=os.getenv("LOG_LEVEL", "INFO"))
logger = logging.getLogger(__name__)

# Register modules with workflow engine at module import time
logger.info("Registering modules with workflow engine...")
for module_type, module_class in module_registry._modules.items():
    workflow_engine.register_module(module_type, module_class)
logger.info(f"Total modules registered: {len(workflow_engine.module_registry)}")

# Create FastAPI app
app = FastAPI(
    title="Binary-Blender Orchestrator - Engine Service",
    description="Manages workflow orchestration and execution",
    version="1.0.0"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("CORS_ORIGINS", "*").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================================
# PYDANTIC MODELS
# ============================================================================

class ModuleConfig(BaseModel):
    id: str
    type: str
    name: str
    config: Dict[str, Any] = {}
    position: Dict[str, float] = {"x": 0, "y": 0}


class ConnectionConfig(BaseModel):
    from_module_id: str
    from_output: str
    to_module_id: str
    to_input: str
    condition: Optional[str] = None


class WorkflowCreate(BaseModel):
    name: str
    description: Optional[str] = None
    modules: List[ModuleConfig]
    connections: List[ConnectionConfig] = []


class WorkflowResponse(BaseModel):
    id: str
    name: str
    description: Optional[str]
    state: str
    created_at: str

    class Config:
        from_attributes = True


class ExecutionCreate(BaseModel):
    inputs: Dict[str, Any] = {}


class ExecutionResponse(BaseModel):
    id: str
    workflow_id: str
    state: str
    started_at: str

    class Config:
        from_attributes = True


# ============================================================================
# WORKFLOW ENDPOINTS
# ============================================================================

@app.post("/workflows", response_model=WorkflowResponse, status_code=201)
async def create_workflow(
    workflow_data: WorkflowCreate,
    tenant_id: str = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db)
):
    """Create new workflow (tenant-isolated)"""
    repo = WorkflowRepository(db)

    # Convert Pydantic models to dict
    workflow_dict = {
        "name": workflow_data.name,
        "description": workflow_data.description,
        "tenant_id": tenant_id,
        "modules": [m.dict() for m in workflow_data.modules],
        "connections": [c.dict() for c in workflow_data.connections],
    }

    workflow = await repo.create(workflow_dict)
    return workflow


@app.get("/workflows")
async def list_workflows(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    state: Optional[str] = None,
    tenant_id: str = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db)
):
    """List workflows (tenant-isolated)"""
    repo = WorkflowRepository(db)
    workflows, total = await repo.list_workflows(
        skip=skip,
        limit=limit,
        tenant_id=tenant_id,
        state=state
    )
    return {"workflows": workflows, "total": total, "skip": skip, "limit": limit}


@app.get("/workflows/{workflow_id}")
async def get_workflow(
    workflow_id: str,
    tenant_id: str = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db)
):
    """Get workflow by ID (tenant-isolated)"""
    repo = WorkflowRepository(db)
    workflow = await repo.get_by_id(workflow_id, tenant_id=tenant_id)
    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")

    # Convert to dict with modules and connections
    return {
        "id": workflow.id,
        "name": workflow.name,
        "description": workflow.description,
        "state": workflow.state,
        "tenant_id": workflow.tenant_id,
        "created_at": workflow.created_at.isoformat(),
        "updated_at": workflow.updated_at.isoformat(),
        "modules": [
            {
                "id": m.id,
                "type": m.type,
                "name": m.name,
                "config": m.config,
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
                "to_input": c.to_input,
                "condition": c.condition
            }
            for c in workflow.connections
        ]
    }


@app.put("/workflows/{workflow_id}")
async def update_workflow(
    workflow_id: str,
    updates: Dict[str, Any],
    tenant_id: str = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db)
):
    """Update workflow (tenant-isolated)"""
    repo = WorkflowRepository(db)
    workflow = await repo.update(workflow_id, updates, tenant_id=tenant_id)
    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")
    return workflow


@app.delete("/workflows/{workflow_id}")
async def delete_workflow(
    workflow_id: str,
    tenant_id: str = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db)
):
    """Soft delete workflow (tenant-isolated)"""
    repo = WorkflowRepository(db)
    success = await repo.delete(workflow_id, tenant_id=tenant_id)
    if not success:
        raise HTTPException(status_code=404, detail="Workflow not found")
    return {"message": "Workflow deleted", "workflow_id": workflow_id}


# ============================================================================
# WORKFLOW EXECUTION ENDPOINTS
# ============================================================================

async def run_workflow_background(
    workflow_id: str,
    execution_id: str,
    parameters: Dict[str, Any],
    tenant_id: str,
    db: AsyncSession
):
    """Background task to run workflow execution"""
    try:
        workflow_engine.set_db_session(db)
        await workflow_engine.execute_workflow_async(
            workflow_id,
            execution_id,
            parameters,
            tenant_id
        )
    except Exception as e:
        logger.error(f"Background workflow execution failed: {e}")


@app.post("/workflows/{workflow_id}/execute", response_model=ExecutionResponse, status_code=201)
async def execute_workflow(
    workflow_id: str,
    execution_data: ExecutionCreate,
    background_tasks: BackgroundTasks,
    tenant_id: str = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db)
):
    """Execute a workflow (tenant-isolated)"""
    workflow_repo = WorkflowRepository(db)
    execution_repo = ExecutionRepository(db)

    # Verify workflow exists
    workflow = await workflow_repo.get_by_id(workflow_id, tenant_id=tenant_id)
    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")

    # Create execution record
    execution = await execution_repo.create({
        "workflow_id": workflow_id,
        "tenant_id": tenant_id,
        "state": "pending",
        "execution_data": {"inputs": execution_data.inputs}
    })

    # Run workflow in background
    # Note: We need a new session for the background task
    from .database.connection import AsyncSessionLocal
    async def run_in_background():
        async with AsyncSessionLocal() as bg_db:
            await run_workflow_background(
                workflow_id,
                execution.id,
                execution_data.inputs,
                tenant_id,
                bg_db
            )

    background_tasks.add_task(run_in_background)

    return execution


@app.get("/executions")
async def list_executions(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    workflow_id: Optional[str] = None,
    state: Optional[str] = None,
    tenant_id: str = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db)
):
    """List executions (tenant-isolated)"""
    repo = ExecutionRepository(db)
    executions, total = await repo.list_executions(
        skip=skip,
        limit=limit,
        tenant_id=tenant_id,
        workflow_id=workflow_id,
        state=state
    )
    return {"executions": executions, "total": total, "skip": skip, "limit": limit}


@app.get("/executions/{execution_id}")
async def get_execution(
    execution_id: str,
    tenant_id: str = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db)
):
    """Get execution details (tenant-isolated)"""
    repo = ExecutionRepository(db)
    execution = await repo.get_by_id(execution_id, tenant_id=tenant_id)
    if not execution:
        raise HTTPException(status_code=404, detail="Execution not found")

    return {
        "id": execution.id,
        "workflow_id": execution.workflow_id,
        "tenant_id": execution.tenant_id,
        "state": execution.state,
        "execution_data": execution.execution_data,
        "started_at": execution.started_at.isoformat(),
        "completed_at": execution.completed_at.isoformat() if execution.completed_at else None
    }


# ============================================================================
# STATISTICS ENDPOINT
# ============================================================================

@app.get("/stats")
async def get_stats(
    tenant_id: str = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db)
):
    """Get platform statistics (tenant-isolated)"""
    workflow_repo = WorkflowRepository(db)
    execution_repo = ExecutionRepository(db)

    # Get workflow count
    workflows, total_workflows = await workflow_repo.list_workflows(
        skip=0,
        limit=1,
        tenant_id=tenant_id
    )

    # Get execution stats
    execution_stats = await execution_repo.get_stats(tenant_id=tenant_id)

    return {
        "total_workflows": total_workflows,
        **execution_stats
    }


# ============================================================================
# HEALTH CHECK
# ============================================================================

@app.get("/health")
async def health_check(db: AsyncSession = Depends(get_db)):
    """Health check endpoint with database connectivity test"""
    try:
        # Test database connection
        await db.execute(text("SELECT 1"))
        return {
            "status": "healthy",
            "service": "engine",
            "version": "1.0.0",
            "database": "connected"
        }
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        raise HTTPException(
            status_code=503,
            detail={
                "status": "unhealthy",
                "service": "engine",
                "database": "disconnected",
                "error": str(e)
            }
        )


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8002))
    uvicorn.run(app, host="0.0.0.0", port=port)
