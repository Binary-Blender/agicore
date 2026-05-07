"""
Main workflow FastAPI application with PostgreSQL database support
"""
import os
import json
import logging
from typing import List, Dict, Any, Optional
from datetime import datetime
from contextlib import asynccontextmanager
import uuid

from fastapi import FastAPI, HTTPException, Depends, Request, Query
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse, Response
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from src.database.connection import get_db, init_db, close_db
from src.database.repositories import (
    WorkflowRepository, ExecutionRepository,
    AssetRepository, QCTaskRepository
)
from src.engine.workflow_engine_db import WorkflowEngine
from src.models.workflow import WorkflowState as WorkflowStateEnum
from src.modules import module_registry
from src.api.mcp_endpoints import router as mcp_router  # Sprint 4.0: MCP API
from src.api.analytics import get_analytics_metrics  # Sprint 5.0: Analytics API
from src.templates.workflow_templates import WorkflowTemplatesLibrary  # Sprint 5.0: Templates
from src.api.auth_endpoints import router as auth_router  # Sprint 6.0: Authentication API
from src.api.cost_endpoints import router as cost_router  # Sprint 6.0: Cost Optimization API
from src.engine.standard_work_converter import get_standard_work_converter  # Sprint 6.0: Standard Work
from src.analytics.tps_metrics import get_tps_metrics_calculator  # Sprint 6.0: TPS Metrics
from src.export.standard_work_export import generate_standard_work_pdf, generate_standard_work_excel  # Sprint 6.1: Export
from src.tps.andon_calculator import AndonCalculator  # Sprint 6.2: Andon Alerts
from src.api.spc_analytics import router as spc_router  # Sprint 7.0: SPC Analytics
from src.api.ab_testing import router as ab_testing_router  # Sprint 6.2: A/B Testing

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


# Pydantic models for API
class WorkflowCreate(BaseModel):
    name: str
    description: str
    modules: List[Dict[str, Any]]
    connections: List[Dict[str, Any]]


class WorkflowExecuteRequest(BaseModel):
    parameters: Dict[str, Any] = {}


class QCDecision(BaseModel):
    asset_id: str
    decision: str  # "pass" or "fail"


class QCReviewRequest(BaseModel):
    decisions: List[QCDecision]


# Lifespan context manager for FastAPI
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage application lifecycle"""
    # Startup
    logger.info("Starting up workflow application with database support...")
    await init_db()
    logger.info("Database initialized")

    # Initialize workflow engine with database
    app.state.workflow_engine = WorkflowEngine()

    yield

    # Shutdown
    logger.info("Shutting down workflow application...")
    await close_db()


# Create FastAPI app
app = FastAPI(
    title="Binary-Blender Orchestrator",
    description="Visual workflow builder and executor with PostgreSQL support",
    version="2.0.0",
    lifespan=lifespan
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Sprint 4.0: Register MCP API router
app.include_router(mcp_router)

# Sprint 6.0: Register Authentication and Cost Optimization API routers
app.include_router(auth_router)
app.include_router(cost_router)

# Sprint 7.0: Register SPC Analytics router
app.include_router(spc_router)

# Sprint 6.2: Register A/B Testing router
app.include_router(ab_testing_router)

# Mount static files
app.mount("/static", StaticFiles(directory="frontend"), name="static")


# Health check endpoints (Sprint 6.0 deployment fix)
@app.get("/health")
async def health_check():
    """Simple health check that doesn't wait for DB"""
    return {"status": "healthy", "version": "6.0"}


@app.get("/health/db")
async def health_check_with_db(db: AsyncSession = Depends(get_db)):
    """Detailed health check including database"""
    from sqlalchemy import text
    try:
        await db.execute(text("SELECT 1"))
        return {"status": "healthy", "database": "connected"}
    except Exception as e:
        logger.error(f"Database health check failed: {e}")
        return JSONResponse(
            status_code=503,
            content={"status": "unhealthy", "error": str(e)}
        )


@app.get("/")
async def read_root():
    """Serve the main UI - workflows page"""
    return FileResponse("frontend/workflows.html")


@app.get("/qc-queue")
async def qc_page():
    """Serve the QC page"""
    return FileResponse("frontend/qc.html")


@app.get("/asset-repository")
async def assets_page():
    """Serve the assets page"""
    return FileResponse("frontend/assets.html")


@app.get("/workflow-builder")
async def builder_page():
    """Serve the workflow builder page"""
    return FileResponse("frontend/builder.html")


@app.get("/analytics")
async def analytics_page():
    """Serve the analytics dashboard page"""
    return FileResponse("frontend/analytics.html")


@app.get("/marketplace")
async def marketplace_page():
    """Serve the MCP marketplace page"""
    return FileResponse("frontend/marketplace.html")


@app.get("/mobile-qc")
async def mobile_qc_page():
    """Serve the mobile QC app (optimized for tablets)"""
    return FileResponse("frontend/mobile-qc.html")


@app.get("/tps-builder")
async def tps_builder_page():
    """Serve the TPS Standard Work Builder page (Sprint 4.0 Day 5)"""
    return FileResponse("frontend/tps-builder.html")


@app.get("/workflow-studio/{workflow_id}")
async def workflow_studio_page(workflow_id: str):
    """Serve the Unified Workflow Studio page (Sprint 6.0)"""
    return FileResponse("frontend/workflow_studio.html")


@app.get("/execution_logs.html")
async def execution_logs_page():
    """Serve the execution logs viewer page"""
    return FileResponse("frontend/execution_logs.html")


# Initialize templates library
templates_library = WorkflowTemplatesLibrary()


# Analytics Endpoints (Sprint 5.0)
@app.get("/api/analytics/metrics")
async def analytics_metrics():
    """Get analytics metrics including KPIs, provider performance, and A/B test results"""
    try:
        metrics = await get_analytics_metrics()
        return JSONResponse(content=metrics)
    except Exception as e:
        logger.error(f"Error getting analytics metrics: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


# Templates Endpoints (Sprint 5.0 Week 2)
@app.get("/api/templates")
async def list_templates():
    """List all available workflow templates"""
    try:
        templates = templates_library.get_all()
        return {"templates": templates}
    except Exception as e:
        logger.error(f"Error listing templates: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/templates/{template_id}")
async def get_template(template_id: str):
    """Get a specific template by ID"""
    try:
        template = templates_library.get_by_id(template_id)
        if not template:
            raise HTTPException(status_code=404, detail="Template not found")

        return {
            "template": {
                "id": template.id,
                "name": template.name,
                "description": template.description,
                "category": template.category,
                "tags": template.tags,
                "author": template.author,
                "version": template.version,
                "modules": template.modules
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting template: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/templates/{template_id}/instantiate")
async def instantiate_template(
    template_id: str,
    workflow_name: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    """Create a new workflow from a template"""
    try:
        workflow_data = templates_library.instantiate(template_id, workflow_name)
        if not workflow_data:
            raise HTTPException(status_code=404, detail="Template not found")

        # Store the workflow in the database
        workflow_repo = WorkflowRepository(db)
        created_workflow = await workflow_repo.create(
            {
                "name": workflow_data["name"],
                "description": workflow_data["description"],
                "modules": workflow_data["modules"],
                "connections": workflow_data["connections"]
            }
        )

        return {"workflow": created_workflow}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error instantiating template: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


# Workflow Management Endpoints
@app.get("/workflows")
async def list_workflows(db: AsyncSession = Depends(get_db)):
    """List all workflows"""
    workflow_repo = WorkflowRepository(db)
    workflows = await workflow_repo.get_all()

    return {
        "workflows": [
            {
                "id": wf.id,
                "name": wf.name,
                "description": wf.description,
                "modules": len(wf.modules),
                "connections": len(wf.connections),
                "state": wf.state,
                "created_at": wf.created_at.isoformat(),
                "updated_at": wf.updated_at.isoformat()
            }
            for wf in workflows
        ]
    }


@app.post("/workflows")
async def create_workflow(
    workflow: WorkflowCreate,
    db: AsyncSession = Depends(get_db)
):
    """Create a new workflow"""
    try:
        workflow_repo = WorkflowRepository(db)

        # Create workflow data
        workflow_data = {
            "name": workflow.name,
            "description": workflow.description,
            "modules": workflow.modules,
            "connections": workflow.connections,
            "state": "active"
        }

        # Create workflow in database
        new_workflow = await workflow_repo.create(workflow_data)

        logger.info(f"Created workflow: {new_workflow.id}")

        return {
            "workflow": {
                "id": new_workflow.id,
                "name": new_workflow.name,
                "description": new_workflow.description,
                "modules": len(workflow.modules),  # Use input data to avoid session access
                "connections": len(workflow.connections),  # Use input data to avoid session access
                "state": new_workflow.state,
                "created_at": new_workflow.created_at.isoformat(),
                "updated_at": new_workflow.updated_at.isoformat()
            }
        }
    except Exception as e:
        logger.error(f"Error creating workflow: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to create workflow: {str(e)}")


@app.get("/workflows/{workflow_id}")
async def get_workflow(
    workflow_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Get a specific workflow with all details"""
    workflow_repo = WorkflowRepository(db)
    workflow = await workflow_repo.get_by_id(workflow_id)

    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")

    return {
        "workflow": {
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
                    "text_bindings": m.text_bindings or {},
                    "ui_overrides": m.ui_overrides or {},
                    "input_config": m.input_config or {},
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
            ],
            "created_at": workflow.created_at.isoformat(),
            "updated_at": workflow.updated_at.isoformat()
        }
    }


@app.put("/workflows/{workflow_id}")
async def update_workflow(
    workflow_id: str,
    workflow: WorkflowCreate,
    db: AsyncSession = Depends(get_db)
):
    """Update an existing workflow"""
    workflow_repo = WorkflowRepository(db)

    # Update workflow data
    workflow_data = {
        "name": workflow.name,
        "description": workflow.description,
        "modules": workflow.modules,
        "connections": workflow.connections
    }

    updated_workflow = await workflow_repo.update(workflow_id, workflow_data)

    if not updated_workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")

    logger.info(f"Updated workflow: {workflow_id}")

    return {
        "workflow": {
            "id": updated_workflow.id,
            "name": updated_workflow.name,
            "description": updated_workflow.description,
            "modules": len(workflow.modules),  # Use input data to avoid session access
            "connections": len(workflow.connections),  # Use input data to avoid session access
            "state": updated_workflow.state,
            "updated_at": updated_workflow.updated_at.isoformat()
        }
    }


@app.delete("/workflows/{workflow_id}")
async def delete_workflow(
    workflow_id: str,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """Delete a workflow"""
    workflow_repo = WorkflowRepository(db)
    execution_repo = ExecutionRepository(db)

    # Check if workflow exists
    workflow = await workflow_repo.get_by_id(workflow_id)
    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")

    # Check for active executions (exclude archived ones)
    executions = await execution_repo.get_by_workflow(workflow_id)
    active_executions = [e for e in executions if e.state in ["running", "paused_for_qc"] and not e.archived]

    if active_executions:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot delete workflow with {len(active_executions)} active executions"
        )

    # Delete workflow
    deleted = await workflow_repo.delete(workflow_id)

    if not deleted:
        raise HTTPException(status_code=500, detail="Failed to delete workflow")

    logger.info(f"Deleted workflow: {workflow_id}")

    return {"success": True, "message": f"Workflow {workflow_id} deleted"}


@app.post("/workflows/{workflow_id}/clone")
async def clone_workflow(
    workflow_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Clone an existing workflow"""
    import uuid
    workflow_repo = WorkflowRepository(db)

    # Get source workflow
    source_workflow = await workflow_repo.get_by_id(workflow_id)
    if not source_workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")

    # Generate new module IDs and create mapping
    old_to_new_module_ids = {}
    for module in source_workflow.modules:
        new_id = f"module_{int(datetime.now().timestamp() * 1000)}_{uuid.uuid4().hex[:8]}"
        old_to_new_module_ids[module.id] = new_id

    # Create workflow data for clone with new module IDs
    workflow_data = {
        "name": f"{source_workflow.name} (Copy)",
        "description": source_workflow.description,
        "modules": [
            {
                "id": old_to_new_module_ids[m.id],
                "type": m.type,
                "name": m.name,
                "config": m.config,
                "text_bindings": m.text_bindings or {},
                "ui_overrides": m.ui_overrides or {},
                "input_config": m.input_config or {},
                "position": m.position
            }
            for m in source_workflow.modules
        ],
        "connections": [
            {
                "from_module_id": old_to_new_module_ids[c.from_module_id],
                "from_output": c.from_output,
                "to_module_id": old_to_new_module_ids[c.to_module_id],
                "to_input": c.to_input,
                "condition": c.condition
            }
            for c in source_workflow.connections
        ]
    }

    # Create clone
    cloned_workflow = await workflow_repo.create(workflow_data)

    # Reload to ensure relationships are loaded
    cloned_workflow = await workflow_repo.get_by_id(cloned_workflow.id)

    logger.info(f"Cloned workflow {workflow_id} to {cloned_workflow.id}")

    return {
        "workflow": {
            "id": cloned_workflow.id,
            "name": cloned_workflow.name,
            "description": cloned_workflow.description,
            "modules": len(cloned_workflow.modules),
            "connections": len(cloned_workflow.connections),
            "state": cloned_workflow.state,
            "source_workflow_id": workflow_id
        }
    }


# Execution Management Endpoints
@app.get("/executions")
async def list_executions(db: AsyncSession = Depends(get_db)):
    """List all workflow executions"""
    execution_repo = ExecutionRepository(db)
    executions = await execution_repo.get_all()

    return {
        "executions": [
            {
                "id": e.id,
                "workflow_id": e.workflow_id,
                "state": e.state,
                "started_at": e.started_at.isoformat(),
                "completed_at": e.completed_at.isoformat() if e.completed_at else None
            }
            for e in executions
        ]
    }


@app.delete("/executions/{execution_id}")
async def archive_execution(
    execution_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Archive an execution (soft delete)"""
    execution_repo = ExecutionRepository(db)

    success = await execution_repo.archive(execution_id)
    if not success:
        raise HTTPException(status_code=404, detail="Execution not found")

    logger.info(f"Archived execution: {execution_id}")

    return {"success": True, "message": f"Execution {execution_id} archived"}


@app.post("/admin/executions/{execution_id}/fail")
async def fail_execution(
    execution_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Admin endpoint: Mark a stuck execution as failed"""
    execution_repo = ExecutionRepository(db)

    # Update execution to failed state
    success = await execution_repo.update_state(execution_id, "failed")
    if not success:
        raise HTTPException(status_code=404, detail="Execution not found")

    logger.info(f"Manually failed execution: {execution_id}")

    return {
        "success": True,
        "message": f"Execution {execution_id} marked as failed",
        "execution_id": execution_id
    }


@app.get("/executions/{execution_id}/logs")
async def get_execution_logs(
    execution_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Get logs for a specific execution

    Returns execution_data which contains module outputs and any captured logs.
    For Fly.io deployment, actual logs need to be viewed via flyctl logs.
    """
    execution_repo = ExecutionRepository(db)
    execution = await execution_repo.get_by_id(execution_id)

    if not execution:
        raise HTTPException(status_code=404, detail="Execution not found")

    # Get execution data
    execution_data = execution.execution_data or {}
    paused_data = execution.paused_data or {}

    # Build log-like view from execution data
    log_entries = []

    # Include detailed execution logs captured during runtime
    execution_logs = execution_data.get("execution_logs", [])
    if execution_logs:
        # Ensure we don't mutate stored logs
        for entry in execution_logs:
            log_entries.append(dict(entry))

    # Add basic execution info
    log_entries.append({
        "timestamp": execution.started_at.isoformat() if execution.started_at else None,
        "level": "INFO",
        "message": f"Execution {execution_id} started",
        "execution_id": execution_id,
        "workflow_id": execution.workflow_id,
        "state": execution.state
    })

    # Add module execution info
    module_outputs = execution_data.get("module_outputs", {})
    for module_id, outputs in module_outputs.items():
        log_entries.append({
            "timestamp": execution.started_at.isoformat() if execution.started_at else None,
            "level": "INFO",
            "message": f"Module {module_id} completed",
            "module_id": module_id,
            "outputs": outputs if isinstance(outputs, dict) else str(outputs)
        })

    # Add error details if execution failed
    error_info = execution_data.get("error")
    if error_info:
        log_entries.append({
            "timestamp": error_info.get("failed_at", execution.completed_at.isoformat() if execution.completed_at else None),
            "level": "ERROR",
            "message": f"Error: {error_info.get('error')}",
            "error_type": error_info.get("error_type"),
            "traceback": error_info.get("traceback"),
            "level_failed": error_info.get("level")
        })

    # Add completion info
    if execution.completed_at:
        log_entries.append({
            "timestamp": execution.completed_at.isoformat(),
            "level": "INFO" if execution.state == "completed" else "ERROR",
            "message": f"Execution {execution.state}",
            "execution_id": execution_id,
            "state": execution.state
        })

    # Sort logs chronologically when timestamps are available
    def sort_key(entry: Dict[str, Any]):
        ts = entry.get("timestamp")
        if not ts:
            return float("inf")
        try:
            normalized = ts.replace("Z", "+00:00")
            dt = datetime.fromisoformat(normalized)
            return dt.timestamp()
        except ValueError:
            return float("inf")

    log_entries.sort(key=sort_key)

    return {
        "execution_id": execution_id,
        "workflow_id": execution.workflow_id,
        "state": execution.state,
        "started_at": execution.started_at.isoformat() if execution.started_at else None,
        "completed_at": execution.completed_at.isoformat() if execution.completed_at else None,
        "log_entries": log_entries,
        "error": error_info,
        "execution_data": execution_data,
        "paused_data": paused_data,
        "note": "For detailed application logs, use: flyctl logs --app ai-workflow-spc | grep " + execution_id
    }


# Unified Workflow Studio Endpoints (Sprint 6.0)
@app.get("/api/workflows/{workflow_id}/standard-work")
async def get_workflow_standard_work(
    workflow_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Get Standard Work representation of workflow"""
    try:
        # Get workflow
        workflow_repo = WorkflowRepository(db)
        workflow = await workflow_repo.get_by_id(workflow_id)

        if not workflow:
            raise HTTPException(status_code=404, detail="Workflow not found")

        # Convert to Standard Work format
        converter = get_standard_work_converter()
        standard_work_steps = await converter.convert_to_standard_work(workflow, db)

        return {
            "workflow_id": workflow_id,
            "workflow_name": workflow.name,
            "steps": standard_work_steps
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting standard work: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/workflows/{workflow_id}/tps-metrics")
async def get_workflow_tps_metrics(
    workflow_id: str,
    period_days: int = 7,
    db: AsyncSession = Depends(get_db)
):
    """Get TPS metrics for workflow"""
    try:
        # Get workflow
        workflow_repo = WorkflowRepository(db)
        workflow = await workflow_repo.get_by_id(workflow_id)

        if not workflow:
            raise HTTPException(status_code=404, detail="Workflow not found")

        # Calculate TPS metrics
        calculator = get_tps_metrics_calculator()
        metrics = await calculator.calculate_tps_metrics(workflow_id, db, period_days)

        return metrics
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error calculating TPS metrics: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


# Sprint 6.1: Export Functionality
@app.get("/api/workflows/{workflow_id}/standard-work/export/pdf")
async def export_standard_work_pdf(
    workflow_id: str,
    period_days: int = 7,
    db: AsyncSession = Depends(get_db)
):
    """Export Standard Work as PDF"""
    try:
        # Get workflow
        workflow_repo = WorkflowRepository(db)
        workflow = await workflow_repo.get_by_id(workflow_id)

        if not workflow:
            raise HTTPException(status_code=404, detail="Workflow not found")

        # Get Standard Work data
        converter = get_standard_work_converter()
        standard_work_steps = await converter.convert_to_standard_work(workflow, db)

        # Get TPS Metrics
        calculator = get_tps_metrics_calculator()
        tps_metrics = await calculator.calculate_tps_metrics(workflow_id, db, period_days)

        # Generate PDF
        pdf_bytes = generate_standard_work_pdf(
            workflow_id=workflow_id,
            workflow_name=workflow.name,
            standard_work_steps=standard_work_steps,
            tps_metrics=tps_metrics
        )

        # Return PDF as downloadable file
        filename = f"standard_work_{workflow_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf"

        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"attachment; filename={filename}"
            }
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error exporting PDF: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/workflows/{workflow_id}/standard-work/export/excel")
async def export_standard_work_excel(
    workflow_id: str,
    period_days: int = 7,
    db: AsyncSession = Depends(get_db)
):
    """Export Standard Work as Excel"""
    try:
        # Get workflow
        workflow_repo = WorkflowRepository(db)
        workflow = await workflow_repo.get_by_id(workflow_id)

        if not workflow:
            raise HTTPException(status_code=404, detail="Workflow not found")

        # Get Standard Work data
        converter = get_standard_work_converter()
        standard_work_steps = await converter.convert_to_standard_work(workflow, db)

        # Get TPS Metrics
        calculator = get_tps_metrics_calculator()
        tps_metrics = await calculator.calculate_tps_metrics(workflow_id, db, period_days)

        # Generate Excel
        excel_bytes = generate_standard_work_excel(
            workflow_id=workflow_id,
            workflow_name=workflow.name,
            standard_work_steps=standard_work_steps,
            tps_metrics=tps_metrics
        )

        # Return Excel as downloadable file
        filename = f"standard_work_{workflow_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"

        return Response(
            content=excel_bytes,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={
                "Content-Disposition": f"attachment; filename={filename}"
            }
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error exporting Excel: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


# Sprint 6.2: Time Override API
class TimeOverrideUpdate(BaseModel):
    manual_time_override: Optional[float] = None
    auto_time_override: Optional[float] = None


@app.put("/api/workflows/{workflow_id}/modules/{module_id}/time-override")
async def update_time_override(
    workflow_id: str,
    module_id: str,
    update: TimeOverrideUpdate,
    db: AsyncSession = Depends(get_db)
):
    """
    Update time overrides for a workflow module

    Allows bidirectional editing: users can override calculated times
    in the TPS Builder UI, and these overrides persist in the database.
    """
    try:
        workflow_repo = WorkflowRepository(db)

        # Verify workflow exists
        workflow = await workflow_repo.get_by_id(workflow_id)
        if not workflow:
            raise HTTPException(status_code=404, detail="Workflow not found")

        # Find the module
        module = next((m for m in workflow.modules if m.id == module_id), None)
        if not module:
            raise HTTPException(status_code=404, detail="Module not found")

        # Update the overrides
        if update.manual_time_override is not None:
            module.manual_time_override = update.manual_time_override
        if update.auto_time_override is not None:
            module.auto_time_override = update.auto_time_override

        await db.commit()

        return {
            "status": "success",
            "module_id": module_id,
            "manual_time_override": module.manual_time_override,
            "auto_time_override": module.auto_time_override
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating time override: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


# Sprint 6.2: Andon Alert System
@app.get("/api/workflows/{workflow_id}/andon-status")
async def get_andon_status(
    workflow_id: str,
    period_days: int = 7,
    db: AsyncSession = Depends(get_db)
):
    """
    Get Andon board status for a workflow

    Returns visual management status (GREEN/YELLOW/RED) based on TPS metrics:
    - Defect Rate
    - First Pass Yield
    - Cycle Time vs Takt Time
    - Overall Equipment Effectiveness (OEE)
    """
    try:
        workflow_repo = WorkflowRepository(db)

        # Verify workflow exists
        workflow = await workflow_repo.get_by_id(workflow_id)
        if not workflow:
            raise HTTPException(status_code=404, detail="Workflow not found")

        # Get TPS metrics
        tps_calculator = get_tps_metrics_calculator()
        tps_metrics = await tps_calculator.calculate_tps_metrics(
            workflow_id=workflow_id,
            period_days=period_days,
            db=db
        )

        # Calculate Andon status
        andon_calculator = AndonCalculator()
        andon_status = andon_calculator.calculate_andon_status(tps_metrics)

        return {
            "workflow_id": workflow_id,
            "workflow_name": workflow.name,
            "period_days": period_days,
            "andon_status": andon_status,
            "tps_metrics_summary": {
                "defect_rate": tps_metrics.get("defect_rate", 0.0),
                "first_pass_yield": tps_metrics.get("first_pass_yield", 100.0),
                "oee": tps_metrics.get("oee", 0.0),
                "avg_cycle_time": tps_metrics.get("avg_cycle_time_seconds", 0),
                "takt_time": tps_metrics.get("takt_time_seconds", 0)
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error calculating Andon status: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/workflows/{workflow_id}/execute")
async def execute_workflow(
    workflow_id: str,
    request: WorkflowExecuteRequest,
    req: Request,
    db: AsyncSession = Depends(get_db)
):
    """Execute a workflow"""
    workflow_repo = WorkflowRepository(db)
    execution_repo = ExecutionRepository(db)

    # Get workflow
    workflow = await workflow_repo.get_by_id(workflow_id)
    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")

    # Create execution record
    execution = await execution_repo.create(workflow_id, {"parameters": request.parameters})

    # Commit the execution record so it's persisted before async execution
    await db.commit()
    await db.refresh(execution)

    # Convert database workflow to engine format
    workflow_dict = {
        "id": workflow.id,
        "name": workflow.name,
        "modules": [
            {
                "id": m.id,
                "type": m.type,
                "name": m.name,
                "config": m.config,
                "text_bindings": m.text_bindings or {},
                "ui_overrides": m.ui_overrides or {},
                "input_config": m.input_config or {},
                "position": m.position
            }
            for m in workflow.modules
        ],
        "connections": [
            {
                "from_module_id": c.from_module_id,
                "from_output": c.from_output,
                "to_module_id": c.to_module_id,
                "to_input": c.to_input,
                "condition": c.condition
            }
            for c in workflow.connections
        ]
    }

    # Execute workflow in background with its own database session
    # This prevents the session from being closed when the request ends
    async def execute_with_own_session():
        """Execute workflow with its own database session"""
        from src.database.connection import get_db_context
        from src.engine.workflow_engine_db import WorkflowEngine

        async with get_db_context() as workflow_db:
            # Create a new engine instance for this execution to avoid shared state
            engine = WorkflowEngine()
            engine.set_db_session(workflow_db)

            try:
                logger.info(f"[BACKGROUND-TASK] Starting workflow execution {execution.id}")
                await engine.execute_workflow_async(
                    workflow_dict,
                    execution.id,
                    request.parameters
                )
                logger.info(f"[BACKGROUND-TASK] Workflow execution {execution.id} completed successfully")
            except Exception as e:
                logger.error(f"[BACKGROUND-TASK] Workflow execution {execution.id} failed: {str(e)}", exc_info=True)
                # Update execution state to failed
                exec_repo = ExecutionRepository(workflow_db)
                await exec_repo.update_state(execution.id, "failed")

    # Start workflow execution in background
    # IMPORTANT: Keep a reference to the task to prevent garbage collection
    import asyncio
    task = asyncio.create_task(execute_with_own_session())

    # Store task reference in app state to keep it alive
    if not hasattr(app.state, 'background_tasks'):
        app.state.background_tasks = set()
    app.state.background_tasks.add(task)

    # Remove task from set when done to prevent memory leak
    task.add_done_callback(lambda t: app.state.background_tasks.discard(t))

    logger.info(f"Started background execution task for {execution.id}")

    # Return immediately with execution ID
    return {
        "execution_id": execution.id,
        "status": "running"
    }


# QC Management Endpoints
@app.get("/qc/tasks")
async def list_qc_tasks(db: AsyncSession = Depends(get_db)):
    """List all QC tasks in the queue"""
    qc_repo = QCTaskRepository(db)
    asset_repo = AssetRepository(db)

    tasks = await qc_repo.get_pending()

    # Format tasks for frontend
    formatted_tasks = []
    def _extract_tool_metadata(provider_metadata: Optional[Dict[str, Any]]):
        if not provider_metadata:
            return None, None, None
        tool_name = provider_metadata.get("tool") or provider_metadata.get("tool_name")
        tool_label = provider_metadata.get("tool_label")
        if not tool_label and tool_name:
            tool_label = tool_name.replace("_", " ").title()
        mcp_server = provider_metadata.get("mcp_server")
        return tool_name, tool_label, mcp_server

    for task in tasks:
        # Check if this is an A/B testing task
        # For A/B testing, comparison data is in execution.paused_data, not in Asset table
        from src.database.models import Asset, WorkflowExecution, Workflow
        from sqlalchemy import select

        # Get execution to check for A/B testing paused_data
        execution_result = await db.execute(
            select(WorkflowExecution).where(WorkflowExecution.id == task.execution_id)
        )
        execution = execution_result.scalar_one_or_none()

        # Get workflow information for context
        workflow_name = "Unknown Workflow"
        execution_started_at = None
        if execution:
            workflow_result = await db.execute(
                select(Workflow).where(Workflow.id == execution.workflow_id)
            )
            workflow = workflow_result.scalar_one_or_none()
            if workflow:
                workflow_name = workflow.name
            execution_started_at = execution.started_at.isoformat() if execution.started_at else None

        # Check if this is A/B testing comparison task
        if task.task_type == "ab_testing_comparison" or (execution and execution.paused_data and execution.paused_data.get("context", {}).get("pause_reason") == "ab_testing_comparison"):
            # A/B Testing task - get comparison items from asset repository
            result = await db.execute(
                select(Asset).where(
                    Asset.execution_id == task.execution_id,
                    Asset.state == "unchecked"
                )
            )
            assets = result.scalars().all()

            # Keep only video assets (A/B comparison should only review video outputs)
            video_assets = [asset for asset in assets if (asset.type or "").lower() == "video"]

            if video_assets:
                # Format as comparison items
                comparison_items = []
                for idx, asset in enumerate(video_assets):
                    tool_name, tool_label, mcp_server = _extract_tool_metadata(asset.provider_metadata)
                    comparison_items.append({
                        "provider": asset.provider,
                        "index": idx,
                        "url": asset.url,
                        "thumbnail": asset.url,
                        "prompt": asset.prompt or "",
                        "metadata": asset.provider_metadata or {},
                        "tool_name": tool_name,
                        "tool_label": tool_label,
                        "mcp_server": mcp_server,
                        "generation_time": 0,
                        "cost": 0.01,  # Will be calculated from provider
                        "quality_score": 85,
                        "asset_id": asset.id,  # Include asset ID for submission
                        "type": asset.type or "video"
                    })

                # Get test_type from paused_data if available
                test_type = "side_by_side"
                if execution and execution.paused_data:
                    qc_data = execution.paused_data.get("context", {}).get("qc_data", {})
                    test_type = qc_data.get("test_type", "side_by_side")

                formatted_tasks.append({
                    "id": task.id,
                    "execution_id": task.execution_id,
                    "module_id": task.module_id,
                    "task_type": "ab_testing_comparison",
                    "test_type": test_type,
                    "created_at": task.created_at.isoformat(),
                    "comparison_items": comparison_items,
                    "workflow_name": workflow_name,
                    "execution_started_at": execution_started_at
                })
        else:
            # Regular QC task - get assets from database
            result = await db.execute(
                select(Asset).where(
                    Asset.execution_id == task.execution_id,
                    Asset.state == "unchecked"
                )
            )
            assets = result.scalars().all()

            # Format images for frontend
            images = []
            for asset in assets:
                asset_type = (asset.type or "").lower()
                # Skip non-visual artifacts (text summaries, data blobs, inline payloads)
                if asset_type not in ("image", "video"):
                    continue
                if not asset.url or asset.url.startswith("inline://"):
                    continue
                tool_name, tool_label, mcp_server = _extract_tool_metadata(asset.provider_metadata)
                images.append({
                    "id": asset.id,
                    "url": asset.url,
                    "prompt": asset.prompt,
                    "state": asset.state,
                    "type": asset.type,
                    "provider": asset.provider,  # Sprint 4.0: Provider tracking
                    "provider_metadata": asset.provider_metadata,  # Sprint 4.0: Provider metadata
                    "tool_name": tool_name,
                    "tool_label": tool_label,
                    "mcp_server": mcp_server
                })

            if images:
                formatted_tasks.append({
                    "id": task.id,
                    "execution_id": task.execution_id,
                    "module_id": task.module_id,
                    "task_type": task.task_type,
                    "created_at": task.created_at.isoformat(),
                    "images": images,
                    "workflow_name": workflow_name,
                    "execution_started_at": execution_started_at
                })

    return {"tasks": formatted_tasks}


@app.post("/qc/{task_id}/review")
async def submit_qc_review(
    task_id: str,
    review: QCReviewRequest,
    req: Request,
    db: AsyncSession = Depends(get_db)
):
    """Submit QC review decisions"""
    logger.info(f"[QC-SUBMIT] ========== QC SUBMISSION STARTED ==========")
    logger.info(f"[QC-SUBMIT] Task ID: {task_id}")
    logger.info(f"[QC-SUBMIT] Number of decisions: {len(review.decisions)}")
    for i, dec in enumerate(review.decisions):
        logger.info(f"[QC-SUBMIT] Decision {i+1}: asset_id={dec.asset_id}, decision={dec.decision}")

    qc_repo = QCTaskRepository(db)
    asset_repo = AssetRepository(db)

    # Submit decisions to repository
    decisions_data = [
        {"asset_id": d.asset_id, "decision": d.decision}
        for d in review.decisions
    ]

    success = await qc_repo.submit_decisions(task_id, decisions_data)
    if not success:
        raise HTTPException(status_code=404, detail="QC task not found")

    # Update asset states based on decisions
    for decision in review.decisions:
        if decision.decision == "pass" or decision.decision == "select":
            logger.info(f"[QC-SUBMIT] Marking asset {decision.asset_id} as APPROVED")
            await asset_repo.update_state(decision.asset_id, "approved")
        else:
            logger.info(f"[QC-SUBMIT] Marking asset {decision.asset_id} as REJECTED")
            await asset_repo.update_state(decision.asset_id, "rejected")

    # Resume workflow execution
    task = await qc_repo.get_by_id(task_id)
    if task:
        logger.info(f"[QC-SUBMIT] Resuming workflow execution for task {task_id}, execution {task.execution_id}")
        engine: WorkflowEngine = req.app.state.workflow_engine
        engine.set_db_session(db)

        # Format results for engine
        results = {d.asset_id: {"decision": d.decision} for d in review.decisions}
        logger.info(f"[QC-SUBMIT] Formatted results for engine: {results}")

        success = await engine.submit_qc_results(task_id, results)
        if not success:
            logger.error(f"[QC-SUBMIT] Failed to resume workflow after QC for task {task_id}")
        else:
            logger.info(f"[QC-SUBMIT] Successfully resumed workflow for task {task_id}")

    logger.info(f"[QC-SUBMIT] ========== QC SUBMISSION COMPLETE ==========")
    return {"success": True}


@app.delete("/qc/{task_id}")
async def dismiss_qc_task(
    task_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Dismiss/delete a QC task without completing it"""
    qc_repo = QCTaskRepository(db)
    execution_repo = ExecutionRepository(db)

    # Get the QC task
    qc_task = await qc_repo.get_by_id(task_id)
    if not qc_task:
        raise HTTPException(status_code=404, detail="QC task not found")

    execution_id = qc_task.execution_id

    # Delete the QC task
    success = await qc_repo.delete(task_id)
    if not success:
        raise HTTPException(status_code=404, detail="Failed to delete QC task")

    # Update execution state to failed (since we're dismissing without completion)
    await execution_repo.update_state(execution_id, "failed")

    logger.info(f"Dismissed QC task {task_id} and marked execution {execution_id} as failed")

    return {"success": True, "message": "QC task dismissed"}


# Asset Management Endpoints
@app.get("/assets")
async def list_assets(
    state: Optional[str] = None,
    collection_id: Optional[str] = None,
    unassigned_only: bool = False,
    asset_type: Optional[str] = None,
    limit: Optional[int] = Query(None, ge=1, le=200),
    states: Optional[List[str]] = Query(default=None),
    tags: Optional[List[str]] = Query(default=None),
    tag_mode: str = "any",
    sort_by: str = "created_at",
    sort_direction: str = "desc",
    db: AsyncSession = Depends(get_db)
):
    """List all assets in the repository

    Special handling for state filter:
    - state="approved" returns both "approved" AND "N/A" assets
      (since both are usable - approved went through QC, N/A had no QC step)
    - Other states return exact matches
    """
    asset_repo = AssetRepository(db)

    normalized_tag_mode = (tag_mode or "any").lower()
    if normalized_tag_mode not in ("any", "all"):
        normalized_tag_mode = "any"

    allowed_sort_fields = {"created_at", "updated_at", "state", "provider"}
    normalized_sort_by = sort_by if sort_by in allowed_sort_fields else "created_at"

    normalized_sort_direction = (sort_direction or "desc").lower()
    if normalized_sort_direction not in ("asc", "desc"):
        normalized_sort_direction = "desc"

    state_filters = list(states or [])
    if state:
        if state == "approved":
            state_filters.extend(["approved", "N/A"])
        else:
            state_filters.append(state)

    assets = await asset_repo.get_all(
        state=None,
        collection_id=collection_id,
        unassigned_only=unassigned_only,
        asset_type=asset_type,
        limit=limit,
        states=state_filters or None,
        tags=tags,
        tag_mode=normalized_tag_mode,
        sort_by=normalized_sort_by,
        sort_direction=normalized_sort_direction
    )

    return {
        "assets": [
            {
                "id": a.id,
                "type": a.type,
                "url": a.url,
                "prompt": a.prompt,
                "state": a.state,
                "provider": a.provider,  # Sprint 4.0: Provider tracking
                "provider_metadata": a.provider_metadata,  # Sprint 4.0: Provider-specific metadata
                "quality_metrics": a.quality_metrics,  # Sprint 4.0: Quality metrics
                "text_content": a.text_content,
                "payload": a.payload,
                "collection_id": a.collection_id,
                "created_at": a.created_at.isoformat(),
                "updated_at": a.updated_at.isoformat()
            }
            for a in assets
        ]
    }


@app.delete("/assets/{asset_id}")
async def archive_asset(
    asset_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Archive an asset (soft delete)"""
    asset_repo = AssetRepository(db)

    success = await asset_repo.archive(asset_id)
    if not success:
        raise HTTPException(status_code=404, detail="Asset not found")

    logger.info(f"Archived asset: {asset_id}")

    return {"success": True, "message": f"Asset {asset_id} archived"}


class BulkArchiveRequest(BaseModel):
    asset_ids: List[str]


class AssetMoveRequest(BaseModel):
    asset_ids: List[str]
    collection_id: Optional[str] = None  # Null removes from any folder


class ManualAssetCreateRequest(BaseModel):
    url: Optional[str] = None
    type: str = "image"
    prompt: Optional[str] = None
    state: str = "approved"
    collection_id: Optional[str] = None
    text_content: Optional[str] = None
    payload: Optional[Dict[str, Any]] = None


class AssetCollectionCreateRequest(BaseModel):
    name: str
    description: Optional[str] = None
    parent_id: Optional[str] = None


class AssetCollectionUpdateRequest(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    parent_id: Optional[str] = None


@app.post("/assets/archive-bulk")
async def archive_assets_bulk(
    request: BulkArchiveRequest,
    db: AsyncSession = Depends(get_db)
):
    """Archive multiple assets (soft delete)"""
    asset_repo = AssetRepository(db)

    count = await asset_repo.archive_many(request.asset_ids)

    logger.info(f"Archived {count} assets")

    return {"success": True, "archived_count": count, "message": f"Archived {count} assets"}


@app.post("/assets/manual")
async def create_manual_asset(
    request: ManualAssetCreateRequest,
    db: AsyncSession = Depends(get_db)
):
    """Create an asset entry manually (used for uploads or tests)."""
    asset_repo = AssetRepository(db)
    asset = await asset_repo.create({
        "url": request.url or f"inline://manual/{uuid.uuid4().hex}",
        "type": request.type,
        "prompt": request.prompt,
        "state": request.state,
        "collection_id": request.collection_id,
        "text_content": request.text_content,
        "payload": request.payload,
        "metadata": {}
    })

    return {
        "asset": {
            "id": asset.id,
            "type": asset.type,
            "url": asset.url,
            "prompt": asset.prompt,
            "state": asset.state,
            "provider": asset.provider,
        "provider_metadata": asset.provider_metadata,
        "quality_metrics": asset.quality_metrics,
        "collection_id": asset.collection_id,
        "text_content": asset.text_content,
        "payload": asset.payload,
        "created_at": asset.created_at.isoformat(),
        "updated_at": asset.updated_at.isoformat()
    }
    }


@app.post("/assets/move")
async def move_assets_to_collection(
    request: AssetMoveRequest,
    db: AsyncSession = Depends(get_db)
):
    """Move a set of assets into (or out of) a collection/folder."""
    asset_repo = AssetRepository(db)

    target_collection_id = request.collection_id
    if target_collection_id:
        target_collection = await asset_repo.get_collection(target_collection_id)
        if not target_collection:
            raise HTTPException(status_code=404, detail="Target collection not found")

    updated = await asset_repo.move_assets_to_collection(request.asset_ids, target_collection_id)
    return {
        "success": True,
        "updated_count": updated,
        "message": f"Moved {updated} asset(s)"
    }


@app.get("/asset-collections")
async def list_asset_collections(db: AsyncSession = Depends(get_db)):
    """Return the folder tree along with asset counts."""
    asset_repo = AssetRepository(db)
    collections = await asset_repo.list_collections()
    counts = await asset_repo.get_collection_asset_counts()

    node_map: Dict[str, Dict[str, Any]] = {}
    roots: List[Dict[str, Any]] = []

    for collection in collections:
        node_map[collection.id] = {
            "id": collection.id,
            "name": collection.name,
            "description": collection.description,
            "parent_id": collection.parent_id,
            "asset_count": counts.get(collection.id, 0),
            "children": []
        }

    for collection in collections:
        node = node_map[collection.id]
        if collection.parent_id and collection.parent_id in node_map:
            node_map[collection.parent_id]["children"].append(node)
        else:
            roots.append(node)

    # Sort children alphabetically for stable UI
    def sort_children(nodes: List[Dict[str, Any]]):
        nodes.sort(key=lambda n: n["name"].lower())
        for child in nodes:
            sort_children(child["children"])

    sort_children(roots)

    return {
        "collections": roots,
        "unassigned_count": counts.get(None, 0)
    }


@app.post("/asset-collections")
async def create_asset_collection(
    request: AssetCollectionCreateRequest,
    db: AsyncSession = Depends(get_db)
):
    asset_repo = AssetRepository(db)
    try:
        collection = await asset_repo.create_collection(
            name=request.name.strip(),
            description=request.description,
            parent_id=request.parent_id
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    return {
        "collection": {
            "id": collection.id,
            "name": collection.name,
            "description": collection.description,
            "parent_id": collection.parent_id
        }
    }


@app.patch("/asset-collections/{collection_id}")
async def update_asset_collection(
    collection_id: str,
    request: AssetCollectionUpdateRequest,
    db: AsyncSession = Depends(get_db)
):
    asset_repo = AssetRepository(db)
    update_kwargs: Dict[str, Any] = {}
    if request.name is not None:
        update_kwargs["name"] = request.name
    if request.description is not None:
        update_kwargs["description"] = request.description
    if request.parent_id is not None:
        update_kwargs["parent_id"] = request.parent_id

    try:
        collection = await asset_repo.update_collection(collection_id, **update_kwargs)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    if not collection:
        raise HTTPException(status_code=404, detail="Collection not found")

    return {
        "collection": {
            "id": collection.id,
            "name": collection.name,
            "description": collection.description,
            "parent_id": collection.parent_id
        }
    }


@app.get("/modules")
async def list_modules():
    """List all available module types"""
    return {"modules": list(module_registry.list_modules())}


# Provider Management Endpoints
@app.get("/providers")
async def list_providers(provider_type: Optional[str] = None):
    """List all available API providers"""
    from src.providers import ProviderRegistry, ProviderType

    # Filter by type if specified
    filter_type = None
    if provider_type:
        try:
            filter_type = ProviderType(provider_type)
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Invalid provider type: {provider_type}")

    providers = ProviderRegistry.list_providers(filter_type)

    return {"providers": providers}


@app.get("/providers/{provider_id}/schema")
async def get_provider_schema(provider_id: str):
    """Get configuration schema for a specific provider"""
    from src.providers import ProviderRegistry

    try:
        schema = ProviderRegistry.get_provider_schema(provider_id)
        provider_class = ProviderRegistry._providers[provider_id]
        temp_instance = provider_class(api_key="", config={})
        info = temp_instance.get_provider_info()

        return {
            "provider_id": provider_id,
            "schema": schema,
            "info": info
        }
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


# Health check endpoint
@app.get("/health")
async def health_check(db: AsyncSession = Depends(get_db)):
    """Check if the service is healthy"""
    try:
        # Test database connection
        from sqlalchemy import text
        await db.execute(text("SELECT 1"))
        db_status = "healthy"
    except Exception as e:
        logger.error(f"Database health check failed: {e}")
        db_status = "unhealthy"

    return {
        "status": "healthy" if db_status == "healthy" else "degraded",
        "database": db_status,
        "version": "2.0.0"
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
