"""
Assets Service - Main Application

Handles asset management, QC tasks, and A/B testing results
"""
import os
import logging
from fastapi import FastAPI, Depends, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from typing import List, Optional
from pydantic import BaseModel

from .database.connection import get_db
from .database.repositories import AssetRepository, QCTaskRepository, ABTestRepository
from .database.models import Asset, QCTask
from .auth.middleware import get_current_tenant

# Configure logging
logging.basicConfig(level=os.getenv("LOG_LEVEL", "INFO"))
logger = logging.getLogger(__name__)

# Create FastAPI app
app = FastAPI(
    title="Binary-Blender Orchestrator - Assets Service",
    description="Manages assets, QC tasks, and A/B testing",
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

class AssetCreate(BaseModel):
    type: str
    url: str
    prompt: Optional[str] = None
    provider: Optional[str] = None
    workflow_id: Optional[str] = None
    execution_id: Optional[str] = None
    module_id: Optional[str] = None
    asset_metadata: dict = {}
    provider_metadata: dict = {}
    quality_metrics: dict = {}


class AssetResponse(BaseModel):
    id: str
    type: str
    url: str
    state: str
    created_at: str

    class Config:
        from_attributes = True


class StateUpdate(BaseModel):
    state: str


class QCDecisionInput(BaseModel):
    asset_id: str
    decision: str  # "pass" or "fail"


class QCReviewRequest(BaseModel):
    decisions: List[QCDecisionInput]


# ============================================================================
# ASSET ENDPOINTS
# ============================================================================

@app.get("/assets")
async def list_assets(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    state: Optional[str] = None,
    execution_id: Optional[str] = None,
    provider: Optional[str] = None,
    asset_type: Optional[str] = None,
    tenant_id: str = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db)
):
    """List assets with optional filters (tenant-isolated)"""
    repo = AssetRepository(db)
    assets, total = await repo.list_assets(
        skip=skip,
        limit=limit,
        state=state,
        execution_id=execution_id,
        provider=provider,
        asset_type=asset_type,
        tenant_id=tenant_id
    )
    return {"assets": assets, "total": total, "skip": skip, "limit": limit}


@app.get("/assets/{asset_id}")
async def get_asset(
    asset_id: str,
    tenant_id: str = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db)
):
    """Get asset by ID (tenant-isolated)"""
    repo = AssetRepository(db)
    asset = await repo.get_asset(asset_id, tenant_id=tenant_id)
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    return asset


@app.post("/assets", response_model=AssetResponse, status_code=201)
async def create_asset(
    asset_data: AssetCreate,
    tenant_id: str = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db)
):
    """Create new asset (tenant-isolated)"""
    repo = AssetRepository(db)
    asset = await repo.create_asset(tenant_id=tenant_id, **asset_data.dict())
    return asset


@app.put("/assets/{asset_id}/state")
async def update_asset_state(
    asset_id: str,
    state_update: StateUpdate,
    tenant_id: str = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db)
):
    """Update asset state (tenant-isolated)"""
    if state_update.state not in ["unchecked", "approved", "rejected"]:
        raise HTTPException(status_code=400, detail="Invalid state")

    repo = AssetRepository(db)
    asset = await repo.update_state(asset_id, state_update.state, tenant_id=tenant_id)
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    return asset


@app.delete("/assets/{asset_id}")
async def delete_asset(
    asset_id: str,
    tenant_id: str = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db)
):
    """Soft delete asset (tenant-isolated)"""
    repo = AssetRepository(db)
    await repo.delete_asset(asset_id, tenant_id=tenant_id)
    return {"message": "Asset archived", "asset_id": asset_id}


# ============================================================================
# QC ENDPOINTS
# ============================================================================

@app.get("/qc/tasks")
async def list_qc_tasks(
    status: Optional[str] = "pending",
    limit: int = Query(50, ge=1, le=200),
    tenant_id: str = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db)
):
    """List QC tasks (tenant-isolated)"""
    qc_repo = QCTaskRepository(db)

    if status == "pending":
        tasks = await qc_repo.list_pending_tasks(limit=limit, tenant_id=tenant_id)
    else:
        # Future: implement filtering by other statuses
        tasks = await qc_repo.list_pending_tasks(limit=limit, tenant_id=tenant_id)

    # For each task, get associated assets
    asset_repo = AssetRepository(db)
    tasks_with_assets = []

    for task in tasks:
        # Get assets for this execution (tenant-isolated)
        assets, _ = await asset_repo.list_assets(execution_id=task.execution_id, tenant_id=tenant_id)
        tasks_with_assets.append({
            "id": task.id,
            "execution_id": task.execution_id,
            "module_id": task.module_id,
            "status": task.status,
            "created_at": task.created_at.isoformat(),
            "assets": [
                {
                    "id": a.id,
                    "url": a.url,
                    "prompt": a.prompt,
                    "state": a.state
                }
                for a in assets
            ]
        })

    return {"tasks": tasks_with_assets, "count": len(tasks_with_assets)}


@app.post("/qc/{task_id}/review")
async def submit_qc_review(
    task_id: str,
    review: QCReviewRequest,
    tenant_id: str = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db)
):
    """Submit QC decisions (tenant-isolated, transactional)"""
    qc_repo = QCTaskRepository(db)
    asset_repo = AssetRepository(db)

    # Verify task exists
    task = await qc_repo.get_task(task_id, tenant_id=tenant_id)
    if not task:
        raise HTTPException(status_code=404, detail="QC task not found")

    # Wrap in transaction to ensure atomicity
    try:
        async with db.begin():
            # Process each decision
            for decision_input in review.decisions:
                if decision_input.decision not in ["pass", "fail"]:
                    raise HTTPException(status_code=400, detail=f"Invalid decision: {decision_input.decision}")

                # Create QC decision record
                await qc_repo.create_decision(
                    task_id=task_id,
                    asset_id=decision_input.asset_id,
                    decision=decision_input.decision,
                    tenant_id=tenant_id
                )

                # Update asset state
                new_state = "approved" if decision_input.decision == "pass" else "rejected"
                await asset_repo.update_state(decision_input.asset_id, new_state, tenant_id=tenant_id)

            # Mark task as completed
            await qc_repo.complete_task(task_id, tenant_id=tenant_id)

        logger.info(f"QC review completed for task {task_id}: {len(review.decisions)} decisions")

        return {
            "task_id": task_id,
            "status": "completed",
            "decisions_recorded": len(review.decisions)
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error processing QC review for task {task_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to process QC review")


# ============================================================================
# A/B TESTING ENDPOINTS
# ============================================================================

@app.get("/ab-tests")
async def get_ab_tests(
    execution_id: Optional[str] = None,
    tenant_id: str = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db)
):
    """Get A/B test results (tenant-isolated)"""
    repo = ABTestRepository(db)
    results = await repo.get_results(execution_id=execution_id, tenant_id=tenant_id)
    return {"results": results}


@app.post("/ab-tests", status_code=201)
async def create_ab_test(
    result_data: dict,
    tenant_id: str = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db)
):
    """Create A/B test result (tenant-isolated)"""
    repo = ABTestRepository(db)
    result = await repo.create_result(tenant_id=tenant_id, **result_data)
    return result


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
            "service": "assets",
            "version": "1.0.0",
            "database": "connected"
        }
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        raise HTTPException(
            status_code=503,
            detail={
                "status": "unhealthy",
                "service": "assets",
                "database": "disconnected",
                "error": str(e)
            }
        )


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8001))
    uvicorn.run(app, host="0.0.0.0", port=port)
