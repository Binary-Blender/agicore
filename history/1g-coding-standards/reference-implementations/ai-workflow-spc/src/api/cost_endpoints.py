"""
Cost optimization API endpoints - Sprint 6.0
"""
from typing import Optional
from datetime import datetime, timedelta
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from src.database.connection import get_db
from src.auth.middleware import get_current_user, AuthenticatedUser
from src.auth.permissions import Permission
from src.cost.tracker import CostTracker
from src.cost.router import IntelligentRouter, OptimizationMode


router = APIRouter(prefix="/api/cost", tags=["Cost Optimization"])


# Request/Response Models
class CostSummaryResponse(BaseModel):
    total_cost: float
    by_server: dict
    by_day: dict
    record_count: int


class CostProjectionResponse(BaseModel):
    daily_average: float
    projected_monthly: float
    projected_days: float


class BudgetAlertResponse(BaseModel):
    current_spend: float
    monthly_budget: float
    spend_percentage: float
    alert_level: str
    remaining_budget: float


class ServerSelectionRequest(BaseModel):
    available_servers: list[str]
    operation: str
    mode: str = "balanced"
    budget_limit: Optional[float] = None


class ServerSelectionResponse(BaseModel):
    selected_server: str
    estimated_cost: float
    estimated_latency_ms: float
    estimated_quality: float
    score: float


# Endpoints
@router.get("/summary", response_model=CostSummaryResponse)
async def get_cost_summary(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get cost summary for current tenant

    Requires cost:view permission
    """
    if not current_user.has_permission(Permission.COST_VIEW):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Permission denied"
        )

    tracker = CostTracker(db)

    # Parse dates if provided
    start_dt = datetime.fromisoformat(start_date) if start_date else None
    end_dt = datetime.fromisoformat(end_date) if end_date else None

    summary = await tracker.get_tenant_cost(
        tenant_id=current_user.tenant_id,
        start_date=start_dt,
        end_date=end_dt
    )

    return CostSummaryResponse(**summary)


@router.get("/projection", response_model=CostProjectionResponse)
async def get_cost_projection(
    days: int = 30,
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Project future costs based on recent usage

    Requires cost:view permission
    """
    if not current_user.has_permission(Permission.COST_VIEW):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Permission denied"
        )

    tracker = CostTracker(db)

    projection = await tracker.get_cost_projection(
        tenant_id=current_user.tenant_id,
        days_to_project=days
    )

    return CostProjectionResponse(**projection)


@router.get("/budget/alert", response_model=BudgetAlertResponse)
async def check_budget_alert(
    monthly_budget: float,
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Check budget alert status

    Requires cost:view permission
    """
    if not current_user.has_permission(Permission.COST_VIEW):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Permission denied"
        )

    tracker = CostTracker(db)

    alert = await tracker.check_budget_alert(
        tenant_id=current_user.tenant_id,
        monthly_budget=Decimal(str(monthly_budget))
    )

    return BudgetAlertResponse(**alert)


@router.get("/execution/{execution_id}")
async def get_execution_cost(
    execution_id: str,
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get total cost for a specific workflow execution

    Requires executions:view permission
    """
    if not current_user.has_permission(Permission.EXECUTIONS_VIEW):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Permission denied"
        )

    tracker = CostTracker(db)

    total_cost = await tracker.get_execution_cost(execution_id)

    return {
        "execution_id": execution_id,
        "total_cost": float(total_cost)
    }


@router.post("/route/select", response_model=ServerSelectionResponse)
async def select_optimal_server(
    request: ServerSelectionRequest,
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Select optimal MCP server based on criteria

    Requires mcp_servers:view permission
    """
    if not current_user.has_permission(Permission.MCP_SERVERS_VIEW):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Permission denied"
        )

    router_engine = IntelligentRouter(db)

    # Convert mode string to enum
    try:
        mode = OptimizationMode(request.mode)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid mode: {request.mode}. Must be one of: cost, quality, speed, balanced, experimental"
        )

    # Convert budget limit
    budget = Decimal(str(request.budget_limit)) if request.budget_limit else None

    # Select server
    selected = await router_engine.select_optimal_server(
        available_servers=request.available_servers,
        operation=request.operation,
        mode=mode,
        budget_limit=budget
    )

    if not selected:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No suitable server found"
        )

    # Calculate score
    score = router_engine.calculate_score(selected, mode)

    return ServerSelectionResponse(
        selected_server=selected.id,
        estimated_cost=float(selected.avg_cost_per_request),
        estimated_latency_ms=selected.avg_latency_ms,
        estimated_quality=selected.avg_quality_score,
        score=score
    )


@router.get("/recommendations")
async def get_routing_recommendations(
    current_mode: str = "balanced",
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get routing optimization recommendations

    Requires cost:view permission
    """
    if not current_user.has_permission(Permission.COST_VIEW):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Permission denied"
        )

    router_engine = IntelligentRouter(db)

    # Convert mode
    try:
        mode = OptimizationMode(current_mode)
    except ValueError:
        mode = OptimizationMode.BALANCED

    recommendations = await router_engine.get_routing_recommendations(
        tenant_id=current_user.tenant_id,
        current_mode=mode
    )

    return recommendations


@router.get("/analytics/monthly")
async def get_monthly_analytics(
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get monthly cost analytics with daily breakdown

    Requires analytics:view permission
    """
    if not current_user.has_permission(Permission.ANALYTICS_VIEW):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Permission denied"
        )

    tracker = CostTracker(db)

    # Get current month
    now = datetime.utcnow()
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    summary = await tracker.get_tenant_cost(
        tenant_id=current_user.tenant_id,
        start_date=month_start,
        end_date=now
    )

    # Get projection
    projection = await tracker.get_cost_projection(
        tenant_id=current_user.tenant_id,
        days_to_project=30
    )

    return {
        "month": now.strftime("%Y-%m"),
        "current_spend": summary["total_cost"],
        "by_server": summary["by_server"],
        "by_day": summary["by_day"],
        "daily_average": projection["daily_average"],
        "projected_month_end": projection["projected_monthly"]
    }
