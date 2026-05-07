"""
A/B Testing API Endpoints
Sprint 6.2 Priority 4 - Provider Comparison and Optimization

Provides REST API for A/B testing:
- Create and manage A/B tests
- Record test results and winner selection
- Get test history and analytics
- Provider recommendations based on historical data
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, desc
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
from pydantic import BaseModel
import logging

from src.database.models import ABTestResult, WorkflowExecution, ProviderMetrics
from src.database.connection import get_db

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/ab-testing", tags=["A/B Testing"])


# Pydantic models for requests/responses
class ABTestCreate(BaseModel):
    """Request model for creating a new A/B test"""
    execution_id: str
    test_type: str  # 'side_by_side', 'blind', 'statistical'
    providers_tested: List[str]  # ['akool', 'replicate_sdxl', 'mcp_akool']
    selection_method: str  # 'manual', 'auto_cost', 'auto_speed', 'auto_quality'


class ABTestComplete(BaseModel):
    """Request model for completing an A/B test"""
    winner: str  # Selected provider
    metrics: Optional[Dict[str, Any]] = None  # Detailed comparison metrics
    user_feedback: Optional[Dict[str, Any]] = None  # User notes and feedback


# ===== CREATE AND MANAGE A/B TESTS =====

@router.post("/tests")
async def create_ab_test(
    test: ABTestCreate,
    db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """
    Create a new A/B test for provider comparison

    Args:
        test: A/B test configuration

    Returns:
        Created A/B test with ID
    """
    # Verify execution exists
    result = await db.execute(
        select(WorkflowExecution).where(WorkflowExecution.id == test.execution_id)
    )
    execution = result.scalar_one_or_none()
    if not execution:
        raise HTTPException(status_code=404, detail="Execution not found")

    # Create A/B test record
    ab_test = ABTestResult(
        execution_id=test.execution_id,
        test_type=test.test_type,
        providers_tested=test.providers_tested,
        selection_method=test.selection_method
    )

    db.add(ab_test)
    await db.commit()
    await db.refresh(ab_test)

    return {
        "status": "success",
        "test_id": ab_test.id,
        "execution_id": ab_test.execution_id,
        "test_type": ab_test.test_type,
        "providers_tested": ab_test.providers_tested,
        "selection_method": ab_test.selection_method,
        "created_at": ab_test.created_at.isoformat()
    }


@router.put("/tests/{test_id}/complete")
async def complete_ab_test(
    test_id: str,
    completion: ABTestComplete,
    db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """
    Complete an A/B test by recording the winner

    Args:
        test_id: A/B test ID
        completion: Winner and metrics

    Returns:
        Updated A/B test
    """
    # Get existing test
    result = await db.execute(
        select(ABTestResult).where(ABTestResult.id == test_id)
    )
    ab_test = result.scalar_one_or_none()
    if not ab_test:
        raise HTTPException(status_code=404, detail="A/B test not found")

    # Validate winner is one of the tested providers
    if completion.winner not in ab_test.providers_tested:
        raise HTTPException(
            status_code=400,
            detail=f"Winner must be one of tested providers: {ab_test.providers_tested}"
        )

    # Update test with results
    ab_test.winner = completion.winner
    ab_test.metrics = completion.metrics
    ab_test.user_feedback = completion.user_feedback
    ab_test.completed_at = datetime.utcnow()

    await db.commit()
    await db.refresh(ab_test)

    return {
        "status": "success",
        "test_id": ab_test.id,
        "winner": ab_test.winner,
        "providers_tested": ab_test.providers_tested,
        "metrics": ab_test.metrics,
        "user_feedback": ab_test.user_feedback,
        "completed_at": ab_test.completed_at.isoformat() if ab_test.completed_at else None
    }


# ===== GET A/B TEST HISTORY =====

@router.get("/tests")
async def get_ab_tests(
    workflow_id: Optional[str] = None,
    test_type: Optional[str] = None,
    period_days: int = Query(30, ge=1, le=365),
    limit: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """
    Get A/B test history with optional filtering

    Args:
        workflow_id: Filter by workflow (optional)
        test_type: Filter by test type (optional)
        period_days: Historical period
        limit: Max results

    Returns:
        List of A/B tests with statistics
    """
    cutoff_date = datetime.utcnow() - timedelta(days=period_days)

    # Build query
    query = select(ABTestResult).where(ABTestResult.created_at >= cutoff_date)

    # Apply filters
    if workflow_id:
        # Join with executions to filter by workflow
        query = query.join(WorkflowExecution).where(
            WorkflowExecution.workflow_id == workflow_id
        )

    if test_type:
        query = query.where(ABTestResult.test_type == test_type)

    # Order by most recent first
    query = query.order_by(desc(ABTestResult.created_at)).limit(limit)

    result = await db.execute(query)
    tests = result.scalars().all()

    # Convert to response format
    test_list = []
    for test in tests:
        test_list.append({
            "test_id": test.id,
            "execution_id": test.execution_id,
            "test_type": test.test_type,
            "providers_tested": test.providers_tested,
            "winner": test.winner,
            "selection_method": test.selection_method,
            "metrics": test.metrics,
            "user_feedback": test.user_feedback,
            "created_at": test.created_at.isoformat(),
            "completed_at": test.completed_at.isoformat() if test.completed_at else None
        })

    # Calculate summary statistics
    total_tests = len(tests)
    completed_tests = sum(1 for t in tests if t.completed_at is not None)

    # Winner distribution
    winner_counts = {}
    for test in tests:
        if test.winner:
            winner_counts[test.winner] = winner_counts.get(test.winner, 0) + 1

    return {
        "status": "success",
        "tests": test_list,
        "statistics": {
            "total_tests": total_tests,
            "completed_tests": completed_tests,
            "pending_tests": total_tests - completed_tests,
            "winner_distribution": winner_counts,
            "period_days": period_days
        }
    }


# ===== PROVIDER ANALYTICS =====

@router.get("/analytics/providers")
async def get_provider_analytics(
    workflow_id: Optional[str] = None,
    period_days: int = Query(90, ge=1, le=365),
    db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """
    Get provider performance analytics based on A/B tests and metrics

    Args:
        workflow_id: Filter by workflow (optional)
        period_days: Historical period

    Returns:
        Provider rankings and recommendations
    """
    cutoff_date = datetime.utcnow() - timedelta(days=period_days)

    # Get A/B test results
    query = select(ABTestResult).where(
        and_(
            ABTestResult.created_at >= cutoff_date,
            ABTestResult.winner.isnot(None)
        )
    )

    if workflow_id:
        query = query.join(WorkflowExecution).where(
            WorkflowExecution.workflow_id == workflow_id
        )

    result = await db.execute(query)
    tests = result.scalars().all()

    # Calculate provider statistics
    provider_stats = {}

    for test in tests:
        for provider in test.providers_tested:
            if provider not in provider_stats:
                provider_stats[provider] = {
                    "provider": provider,
                    "times_tested": 0,
                    "times_won": 0,
                    "win_rate": 0.0,
                    "selection_methods": {},
                    "avg_metrics": {}
                }

            stats = provider_stats[provider]
            stats["times_tested"] += 1

            if provider == test.winner:
                stats["times_won"] += 1

            # Track selection methods
            method = test.selection_method
            stats["selection_methods"][method] = stats["selection_methods"].get(method, 0) + 1

            # Aggregate metrics if available
            if test.metrics and provider in test.metrics:
                provider_metrics = test.metrics[provider]
                for key, value in provider_metrics.items():
                    if isinstance(value, (int, float)):
                        if key not in stats["avg_metrics"]:
                            stats["avg_metrics"][key] = {"sum": 0, "count": 0}
                        stats["avg_metrics"][key]["sum"] += value
                        stats["avg_metrics"][key]["count"] += 1

    # Calculate final statistics
    provider_rankings = []
    for provider, stats in provider_stats.items():
        if stats["times_tested"] > 0:
            stats["win_rate"] = (stats["times_won"] / stats["times_tested"]) * 100

        # Calculate averages for metrics
        final_metrics = {}
        for key, data in stats["avg_metrics"].items():
            if data["count"] > 0:
                final_metrics[key] = data["sum"] / data["count"]

        provider_rankings.append({
            "provider": provider,
            "times_tested": stats["times_tested"],
            "times_won": stats["times_won"],
            "win_rate": round(stats["win_rate"], 2),
            "selection_methods": stats["selection_methods"],
            "avg_metrics": final_metrics
        })

    # Sort by win rate (descending)
    provider_rankings.sort(key=lambda x: x["win_rate"], reverse=True)

    # Generate recommendation
    if provider_rankings:
        top_provider = provider_rankings[0]
        if top_provider["times_tested"] >= 3:  # Need at least 3 tests for confidence
            recommendation = f"Based on {top_provider['times_tested']} A/B tests, {top_provider['provider']} has the highest win rate ({top_provider['win_rate']:.1f}%)"
        else:
            recommendation = "Insufficient data for confident recommendation. Run more A/B tests."
    else:
        recommendation = "No A/B test data available. Start running A/B tests to get provider recommendations."

    return {
        "status": "success",
        "provider_rankings": provider_rankings,
        "recommendation": recommendation,
        "period_days": period_days,
        "total_tests_analyzed": len(tests)
    }


# ===== PROVIDER METRICS INTEGRATION =====

@router.get("/analytics/provider-metrics/{provider}")
async def get_provider_metrics(
    provider: str,
    period_days: int = Query(30, ge=1, le=365),
    db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """
    Get detailed performance metrics for a specific provider

    Args:
        provider: Provider identifier
        period_days: Historical period

    Returns:
        Time series data for provider performance
    """
    cutoff_date = datetime.utcnow() - timedelta(days=period_days)

    # Get provider metrics
    result = await db.execute(
        select(ProviderMetrics)
        .where(
            and_(
                ProviderMetrics.provider == provider,
                ProviderMetrics.created_at >= cutoff_date
            )
        )
        .order_by(ProviderMetrics.created_at)
    )
    metrics = result.scalars().all()

    if not metrics:
        raise HTTPException(
            status_code=404,
            detail=f"No metrics found for provider: {provider}"
        )

    # Extract time series data
    timestamps = []
    generation_times = []
    costs = []
    quality_scores = []

    for metric in metrics:
        timestamps.append(metric.created_at.isoformat())

        if metric.generation_time:
            generation_times.append(metric.generation_time)

        if metric.cost:
            costs.append(metric.cost)

        if metric.quality_score:
            quality_scores.append(metric.quality_score)

    # Calculate statistics
    avg_generation_time = sum(generation_times) / len(generation_times) if generation_times else None
    avg_cost = sum(costs) / len(costs) if costs else None
    avg_quality = sum(quality_scores) / len(quality_scores) if quality_scores else None

    return {
        "status": "success",
        "provider": provider,
        "period_days": period_days,
        "data_points": len(metrics),
        "time_series": {
            "timestamps": timestamps,
            "generation_times": generation_times,
            "costs": costs,
            "quality_scores": quality_scores
        },
        "averages": {
            "generation_time": round(avg_generation_time, 2) if avg_generation_time else None,
            "cost": round(avg_cost, 4) if avg_cost else None,
            "quality_score": round(avg_quality, 2) if avg_quality else None
        }
    }
