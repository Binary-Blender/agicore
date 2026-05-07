"""
SPC Analytics API Endpoints
Sprint 7.0 - Statistical Process Control for AI Workflows

Provides REST API for SPC analytics:
- Control Charts (X-bar, P-charts)
- Pareto Analysis (defect prioritization)
- Trend Detection (linear regression)
- Process Capability (Cp, Cpk, Pp, Ppk)
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
import logging

from src.database.models import (
    Workflow, WorkflowExecution, WorkflowModule,
    QCDecision, ProviderMetrics
)
from src.database.connection import get_db
from src.tps.spc_calculator import (
    get_spc_calculator,
    ControlChartType,
    ControlLimits,
    OutOfControlViolation,
    ProcessCapability,
    ParetoItem,
    TrendAnalysis
)
# TODO: Implement TPS calculator in future sprint
# from src.tps.tps_calculator import get_tps_calculator

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/spc", tags=["SPC Analytics"])


# ===== CONTROL CHARTS =====

@router.get("/control-charts/{workflow_id}")
async def get_control_charts(
    workflow_id: str,
    metric: str = Query("defect_rate", description="Metric to chart: defect_rate, first_pass_yield, cycle_time, cost"),
    period_days: int = Query(30, ge=1, le=365, description="Historical period in days"),
    chart_type: str = Query("xbar", description="Chart type: xbar (continuous), p (proportion), c (count)"),
    db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """
    Get control chart data with UCL/LCL and Western Electric Rules violations

    Returns:
        - data_points: Historical metric values
        - timestamps: Corresponding timestamps
        - control_limits: UCL, LCL, center line, sigma zones
        - violations: Out-of-control conditions detected
        - interpretation: Overall process assessment
    """
    # Verify workflow exists
    result = await db.execute(
        select(Workflow).where(Workflow.id == workflow_id)
    )
    workflow = result.scalar_one_or_none()
    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")

    # Get historical executions
    cutoff_date = datetime.utcnow() - timedelta(days=period_days)
    result = await db.execute(
        select(WorkflowExecution)
        .where(
            WorkflowExecution.workflow_id == workflow_id,
            WorkflowExecution.created_at >= cutoff_date,
            WorkflowExecution.status == 'completed'
        )
        .order_by(WorkflowExecution.created_at)
    )
    executions = result.scalars().all()

    if len(executions) < 2:
        raise HTTPException(
            status_code=400,
            detail=f"Need at least 2 completed executions for control charts (found {len(executions)})"
        )

    # Calculate metric values for each execution
    # TODO: Replace with TPS calculator when implemented
    data_points = []
    timestamps = []

    for execution in executions:
        try:
            # Simple metric extraction from execution data
            # Extract requested metric from execution metadata
            if metric == "defect_rate":
                # Use QC decisions to calculate defect rate
                qc_result = await db.execute(
                    select(QCDecision).where(QCDecision.execution_id == execution.id)
                )
                qc_decision = qc_result.scalar_one_or_none()
                value = 0.0 if not qc_decision or qc_decision.decision == "accept" else 100.0
            elif metric == "first_pass_yield":
                qc_result = await db.execute(
                    select(QCDecision).where(QCDecision.execution_id == execution.id)
                )
                qc_decision = qc_result.scalar_one_or_none()
                value = 100.0 if not qc_decision or qc_decision.decision == "accept" else 0.0
            elif metric == "cycle_time":
                # Use execution duration
                if execution.completed_at and execution.created_at:
                    duration = (execution.completed_at - execution.created_at).total_seconds()
                    value = duration
                else:
                    value = 0.0
            elif metric == "cost":
                # Use provider metrics cost if available
                provider_result = await db.execute(
                    select(ProviderMetrics).where(ProviderMetrics.execution_id == execution.id)
                )
                provider_metric = provider_result.scalar_one_or_none()
                value = provider_metric.cost if provider_metric and provider_metric.cost else 0.0
            else:
                value = 0.0

            data_points.append(value)
            timestamps.append(execution.created_at.isoformat())

        except Exception as e:
            logger.warning(f"Failed to calculate metrics for execution {execution.id}: {e}")
            continue

    if len(data_points) < 2:
        raise HTTPException(
            status_code=400,
            detail="Insufficient metric data for control chart analysis"
        )

    # Calculate control limits
    spc_calc = get_spc_calculator()

    # Map string to enum
    chart_type_enum = {
        "xbar": ControlChartType.XBAR,
        "p": ControlChartType.P,
        "c": ControlChartType.C
    }.get(chart_type.lower(), ControlChartType.XBAR)

    control_limits = spc_calc.calculate_control_limits(
        data=data_points,
        chart_type=chart_type_enum,
        sample_size=1
    )

    # Detect out-of-control violations
    violations = spc_calc.detect_out_of_control(
        data=data_points,
        limits=control_limits
    )

    # Overall interpretation
    if not violations:
        interpretation = "Process is in statistical control - no special causes detected"
        status = "in_control"
    elif any(v.severity == "critical" for v in violations):
        interpretation = f"Process OUT OF CONTROL - {len([v for v in violations if v.severity == 'critical'])} critical violations detected"
        status = "out_of_control"
    else:
        interpretation = f"Process showing warning signs - {len(violations)} potential issues detected"
        status = "warning"

    return {
        "status": "success",
        "workflow_id": workflow_id,
        "metric": metric,
        "chart_type": chart_type,
        "period_days": period_days,
        "data": {
            "data_points": data_points,
            "timestamps": timestamps,
            "control_limits": spc_calc.to_dict(control_limits),
            "violations": [spc_calc.to_dict(v) for v in violations],
            "process_status": status,
            "interpretation": interpretation,
            "data_count": len(data_points)
        }
    }


# ===== PARETO ANALYSIS =====

@router.get("/pareto/{workflow_id}")
async def get_pareto_analysis(
    workflow_id: str,
    period_days: int = Query(30, ge=1, le=365, description="Historical period in days"),
    category: str = Query("defect_type", description="Category: defect_type, module_type, failure_reason"),
    db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """
    Get Pareto analysis (80/20 rule) for defect prioritization

    Returns:
        - pareto_items: Sorted list of categories with counts and percentages
        - vital_few: Top categories representing 80% of defects
        - total_defects: Total defect count
        - interpretation: 80/20 analysis summary
    """
    # Verify workflow exists
    result = await db.execute(
        select(Workflow).where(Workflow.id == workflow_id)
    )
    workflow = result.scalar_one_or_none()
    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")

    # Get QC decisions (failures only)
    cutoff_date = datetime.utcnow() - timedelta(days=period_days)
    result = await db.execute(
        select(QCDecision)
        .where(
            QCDecision.workflow_id == workflow_id,
            QCDecision.created_at >= cutoff_date,
            QCDecision.decision == 'fail'
        )
    )
    qc_decisions = result.scalars().all()

    if not qc_decisions:
        return {
            "status": "success",
            "workflow_id": workflow_id,
            "category": category,
            "data": {
                "pareto_items": [],
                "vital_few": [],
                "total_defects": 0,
                "interpretation": "No defects found - excellent quality performance!"
            }
        }

    # Count defects by category
    defect_counts = {}

    if category == "defect_type":
        # Extract defect types from notes/metadata
        for qc in qc_decisions:
            defect_type = "Unspecified"
            if qc.notes:
                # Simple heuristic: first word in notes
                words = qc.notes.strip().split()
                if words:
                    defect_type = words[0].capitalize()

            defect_counts[defect_type] = defect_counts.get(defect_type, 0) + 1

    elif category == "module_type":
        # Count by module that produced the failed output
        for qc in qc_decisions:
            # Get module info from execution context if available
            module_type = qc.metadata.get("module_type", "Unknown") if qc.metadata else "Unknown"
            defect_counts[module_type] = defect_counts.get(module_type, 0) + 1

    elif category == "failure_reason":
        # Extract failure reasons from notes
        for qc in qc_decisions:
            reason = qc.notes if qc.notes else "No reason specified"
            # Truncate long reasons
            if len(reason) > 50:
                reason = reason[:47] + "..."
            defect_counts[reason] = defect_counts.get(reason, 0) + 1

    else:
        raise HTTPException(status_code=400, detail=f"Invalid category: {category}")

    # Calculate Pareto data
    spc_calc = get_spc_calculator()
    pareto_items = spc_calc.calculate_pareto_data(defect_counts)

    # Identify "vital few" (top items representing 80% of defects)
    vital_few = []
    for item in pareto_items:
        vital_few.append(item.category)
        if item.cumulative_percentage >= 80.0:
            break

    # Interpretation
    total_defects = sum(defect_counts.values())
    vital_few_count = len(vital_few)
    total_categories = len(pareto_items)

    interpretation = (
        f"{vital_few_count} of {total_categories} categories account for 80% of defects. "
        f"Focus on: {', '.join(vital_few[:3])}{'...' if len(vital_few) > 3 else ''}"
    )

    return {
        "status": "success",
        "workflow_id": workflow_id,
        "category": category,
        "period_days": period_days,
        "data": {
            "pareto_items": [spc_calc.to_dict(item) for item in pareto_items],
            "vital_few": vital_few,
            "total_defects": total_defects,
            "total_categories": total_categories,
            "interpretation": interpretation
        }
    }


# ===== TREND DETECTION =====

@router.get("/trends/{workflow_id}")
async def get_trend_analysis(
    workflow_id: str,
    metric: str = Query("defect_rate", description="Metric to analyze: defect_rate, first_pass_yield, cycle_time, cost"),
    period_days: int = Query(30, ge=7, le=365, description="Historical period in days"),
    db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """
    Detect trends using linear regression

    Returns:
        - trend_analysis: Slope, R², forecast, interpretation
        - data_points: Historical data used for analysis
        - timestamps: Corresponding timestamps
        - forecast: Predicted next value if trend exists
    """
    # Verify workflow exists
    result = await db.execute(
        select(Workflow).where(Workflow.id == workflow_id)
    )
    workflow = result.scalar_one_or_none()
    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")

    # Get historical executions
    cutoff_date = datetime.utcnow() - timedelta(days=period_days)
    result = await db.execute(
        select(WorkflowExecution)
        .where(
            WorkflowExecution.workflow_id == workflow_id,
            WorkflowExecution.created_at >= cutoff_date,
            WorkflowExecution.status == 'completed'
        )
        .order_by(WorkflowExecution.created_at)
    )
    executions = result.scalars().all()

    if len(executions) < 3:
        raise HTTPException(
            status_code=400,
            detail=f"Need at least 3 completed executions for trend analysis (found {len(executions)})"
        )

    # Calculate metric values
    # TODO: Replace with TPS calculator when implemented
    data_points = []
    timestamps = []

    for execution in executions:
        try:
            # Simple metric extraction from execution data
            if metric == "defect_rate":
                qc_result = await db.execute(
                    select(QCDecision).where(QCDecision.execution_id == execution.id)
                )
                qc_decision = qc_result.scalar_one_or_none()
                value = 0.0 if not qc_decision or qc_decision.decision == "accept" else 100.0
            elif metric == "first_pass_yield":
                qc_result = await db.execute(
                    select(QCDecision).where(QCDecision.execution_id == execution.id)
                )
                qc_decision = qc_result.scalar_one_or_none()
                value = 100.0 if not qc_decision or qc_decision.decision == "accept" else 0.0
            elif metric == "cycle_time":
                if execution.completed_at and execution.created_at:
                    duration = (execution.completed_at - execution.created_at).total_seconds()
                    value = duration
                else:
                    value = 0.0
            elif metric == "cost":
                provider_result = await db.execute(
                    select(ProviderMetrics).where(ProviderMetrics.execution_id == execution.id)
                )
                provider_metric = provider_result.scalar_one_or_none()
                value = provider_metric.cost if provider_metric and provider_metric.cost else 0.0
            else:
                value = 0.0

            data_points.append(value)
            timestamps.append(execution.created_at)

        except Exception as e:
            logger.warning(f"Failed to calculate metrics for execution {execution.id}: {e}")
            continue

    if len(data_points) < 3:
        raise HTTPException(
            status_code=400,
            detail="Insufficient metric data for trend analysis"
        )

    # Detect trends
    spc_calc = get_spc_calculator()
    trend_analysis = spc_calc.detect_trends(
        data=data_points,
        timestamps=timestamps
    )

    # Recommendation based on trend
    if not trend_analysis.has_trend:
        recommendation = "No significant trend detected - continue monitoring"
    elif trend_analysis.slope > 0:
        if metric in ["defect_rate", "cycle_time", "cost"]:
            recommendation = "ALERT: Metric trending WORSE - investigate root causes immediately"
        else:
            recommendation = "GOOD: Metric trending BETTER - identify and sustain improvements"
    else:
        if metric in ["defect_rate", "cycle_time", "cost"]:
            recommendation = "GOOD: Metric trending BETTER - identify and sustain improvements"
        else:
            recommendation = "ALERT: Metric trending WORSE - investigate root causes immediately"

    return {
        "status": "success",
        "workflow_id": workflow_id,
        "metric": metric,
        "period_days": period_days,
        "data": {
            "trend_analysis": spc_calc.to_dict(trend_analysis),
            "data_points": data_points,
            "timestamps": [ts.isoformat() for ts in timestamps],
            "recommendation": recommendation,
            "data_count": len(data_points)
        }
    }


# ===== PROCESS CAPABILITY =====

@router.get("/capability/{workflow_id}")
async def get_process_capability(
    workflow_id: str,
    metric: str = Query("first_pass_yield", description="Metric to analyze: first_pass_yield, defect_rate, cycle_time"),
    period_days: int = Query(30, ge=1, le=365, description="Historical period in days"),
    lower_spec_limit: Optional[float] = Query(None, description="LSL - Lower specification limit"),
    upper_spec_limit: Optional[float] = Query(None, description="USL - Upper specification limit"),
    target: Optional[float] = Query(None, description="Target value (defaults to midpoint)"),
    db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """
    Calculate process capability (Cp, Cpk, Pp, Ppk, Sigma Level)

    Returns:
        - capability: Cp, Cpk, Pp, Ppk, sigma_level, interpretation
        - data_points: Historical data
        - spec_limits: LSL, USL, target
        - meets_spec: Percentage of data within specifications
    """
    # Verify workflow exists
    result = await db.execute(
        select(Workflow).where(Workflow.id == workflow_id)
    )
    workflow = result.scalar_one_or_none()
    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")

    # Set default spec limits based on metric
    if metric == "first_pass_yield":
        lsl = lower_spec_limit if lower_spec_limit is not None else 95.0
        usl = upper_spec_limit if upper_spec_limit is not None else 100.0
        tgt = target if target is not None else 100.0
    elif metric == "defect_rate":
        lsl = lower_spec_limit if lower_spec_limit is not None else 0.0
        usl = upper_spec_limit if upper_spec_limit is not None else 2.0
        tgt = target if target is not None else 0.0
    elif metric == "cycle_time":
        lsl = lower_spec_limit if lower_spec_limit is not None else 80.0
        usl = upper_spec_limit if upper_spec_limit is not None else 120.0
        tgt = target if target is not None else 100.0
    else:
        raise HTTPException(status_code=400, detail=f"Metric {metric} not supported for capability analysis")

    # Get historical executions
    cutoff_date = datetime.utcnow() - timedelta(days=period_days)
    result = await db.execute(
        select(WorkflowExecution)
        .where(
            WorkflowExecution.workflow_id == workflow_id,
            WorkflowExecution.created_at >= cutoff_date,
            WorkflowExecution.status == 'completed'
        )
        .order_by(WorkflowExecution.created_at)
    )
    executions = result.scalars().all()

    if len(executions) < 2:
        raise HTTPException(
            status_code=400,
            detail=f"Need at least 2 completed executions for capability analysis (found {len(executions)})"
        )

    # Calculate metric values
    # TODO: Replace with TPS calculator when implemented
    data_points = []

    for execution in executions:
        try:
            # Simple metric extraction from execution data
            if metric == "first_pass_yield":
                qc_result = await db.execute(
                    select(QCDecision).where(QCDecision.execution_id == execution.id)
                )
                qc_decision = qc_result.scalar_one_or_none()
                value = 100.0 if not qc_decision or qc_decision.decision == "accept" else 0.0
            elif metric == "defect_rate":
                qc_result = await db.execute(
                    select(QCDecision).where(QCDecision.execution_id == execution.id)
                )
                qc_decision = qc_result.scalar_one_or_none()
                value = 0.0 if not qc_decision or qc_decision.decision == "accept" else 100.0
            elif metric == "cycle_time":
                if execution.completed_at and execution.created_at:
                    duration = (execution.completed_at - execution.created_at).total_seconds()
                    value = duration
                else:
                    value = 0.0
            else:
                value = 0.0

            data_points.append(value)

        except Exception as e:
            logger.warning(f"Failed to calculate metrics for execution {execution.id}: {e}")
            continue

    if len(data_points) < 2:
        raise HTTPException(
            status_code=400,
            detail="Insufficient metric data for capability analysis"
        )

    # Calculate process capability
    spc_calc = get_spc_calculator()
    capability = spc_calc.calculate_process_capability(
        data=data_points,
        lower_spec_limit=lsl,
        upper_spec_limit=usl,
        target=tgt
    )

    # Calculate % meeting specifications
    within_spec = sum(1 for v in data_points if lsl <= v <= usl)
    meets_spec_pct = (within_spec / len(data_points)) * 100

    # Recommendation
    if capability.cpk >= 1.33:
        recommendation = "Process is capable - maintain current performance"
    elif capability.cpk >= 1.0:
        recommendation = "Process marginally capable - implement improvements to increase capability"
    else:
        recommendation = "Process NOT capable - immediate action required to reduce variation"

    return {
        "status": "success",
        "workflow_id": workflow_id,
        "metric": metric,
        "period_days": period_days,
        "data": {
            "capability": spc_calc.to_dict(capability),
            "spec_limits": {
                "lower": lsl,
                "upper": usl,
                "target": tgt
            },
            "performance": {
                "meets_spec_percentage": round(meets_spec_pct, 2),
                "within_spec_count": within_spec,
                "total_count": len(data_points)
            },
            "data_points": data_points,
            "recommendation": recommendation
        }
    }
