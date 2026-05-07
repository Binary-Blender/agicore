"""
TPS Metrics Calculator - Calculate Toyota Production System metrics
Sprint 6.0 - Unified Workflow Studio
"""
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from src.database.models import Workflow, WorkflowExecution, WorkflowModule, QCDecision, QCTask
import logging

logger = logging.getLogger(__name__)


class TPSMetricsCalculator:
    """Calculate real TPS metrics from workflow execution data"""

    async def calculate_tps_metrics(
        self,
        workflow_id: str,
        db: AsyncSession,
        period_days: int = 7
    ) -> Dict[str, Any]:
        """Calculate comprehensive TPS metrics for a workflow"""

        # Get workflow
        workflow_result = await db.execute(
            select(Workflow).where(Workflow.id == workflow_id)
        )
        workflow = workflow_result.scalar_one_or_none()

        if not workflow:
            logger.warning(f"Workflow {workflow_id} not found")
            return self._empty_metrics()

        # Get recent executions
        since_date = datetime.now() - timedelta(days=period_days)
        executions_result = await db.execute(
            select(WorkflowExecution)
            .where(WorkflowExecution.workflow_id == workflow_id)
            .where(WorkflowExecution.started_at > since_date)
            .order_by(WorkflowExecution.started_at.desc())
        )
        executions = executions_result.scalars().all()

        if not executions:
            logger.info(f"No executions found for workflow {workflow_id} in last {period_days} days")
            return self._empty_metrics()

        # Calculate metrics
        cycle_time = await self._calculate_cycle_time(executions)
        first_pass_yield = await self._calculate_first_pass_yield(workflow_id, executions, db)
        defect_rate = await self._calculate_defect_rate(workflow_id, executions, db)
        oee = await self._calculate_oee(workflow_id, executions, db, period_days)
        value_add_ratio = await self._calculate_value_add_ratio(workflow_id, db)
        throughput = await self._calculate_throughput(executions, period_days)
        takt_time = await self._calculate_takt_time(executions, period_days)

        return {
            "workflow_id": workflow_id,
            "period_days": period_days,
            "executions_count": len(executions),
            "cycle_time": cycle_time,
            "first_pass_yield": first_pass_yield,
            "defect_rate": defect_rate,
            "oee": oee,
            "value_add_ratio": value_add_ratio,
            "throughput": throughput,
            "takt_time": takt_time,
            "calculated_at": datetime.now().isoformat()
        }

    async def _calculate_cycle_time(self, executions: List[WorkflowExecution]) -> Dict[str, float]:
        """Calculate cycle time statistics"""

        cycle_times = []
        for execution in executions:
            if execution.completed_at and execution.started_at:
                duration = (execution.completed_at - execution.started_at).total_seconds()
                cycle_times.append(duration)

        if not cycle_times:
            return {
                "average": 0,
                "min": 0,
                "max": 0,
                "std_dev": 0
            }

        avg_time = sum(cycle_times) / len(cycle_times)
        min_time = min(cycle_times)
        max_time = max(cycle_times)

        # Calculate standard deviation
        variance = sum((x - avg_time) ** 2 for x in cycle_times) / len(cycle_times)
        std_dev = variance ** 0.5

        return {
            "average": round(avg_time, 2),
            "min": round(min_time, 2),
            "max": round(max_time, 2),
            "std_dev": round(std_dev, 2)
        }

    async def _calculate_first_pass_yield(
        self,
        workflow_id: str,
        executions: List[WorkflowExecution],
        db: AsyncSession
    ) -> Dict[str, Any]:
        """Calculate First Pass Yield (FPY) - percentage passing QC on first try"""

        total_items = 0
        passed_first_time = 0

        for execution in executions:
            # Get QC decisions for this execution (join through QCTask)
            decisions_result = await db.execute(
                select(QCDecision)
                .join(QCTask, QCDecision.qc_task_id == QCTask.id)
                .where(QCTask.execution_id == execution.id)
                .order_by(QCDecision.created_at)
            )
            decisions = decisions_result.scalars().all()

            # Group decisions by asset_id to find first-time passes
            asset_decisions = {}
            for decision in decisions:
                asset_id = decision.asset_id
                if asset_id not in asset_decisions:
                    asset_decisions[asset_id] = []
                asset_decisions[asset_id].append(decision)

            # Count first-time passes
            for asset_id, asset_decision_list in asset_decisions.items():
                total_items += 1
                # Sort by created_at to get first decision
                first_decision = sorted(asset_decision_list, key=lambda r: r.created_at)[0]
                if first_decision.decision == 'pass':
                    passed_first_time += 1

        if total_items == 0:
            return {
                "percentage": 0,
                "passed": 0,
                "total": 0
            }

        fpy_percentage = (passed_first_time / total_items) * 100

        return {
            "percentage": round(fpy_percentage, 2),
            "passed": passed_first_time,
            "total": total_items
        }

    async def _calculate_defect_rate(
        self,
        workflow_id: str,
        executions: List[WorkflowExecution],
        db: AsyncSession
    ) -> Dict[str, Any]:
        """Calculate defect rate - percentage of items failing QC"""

        total_reviewed = 0
        total_failed = 0

        for execution in executions:
            decisions_result = await db.execute(
                select(QCDecision)
                .join(QCTask, QCDecision.qc_task_id == QCTask.id)
                .where(QCTask.execution_id == execution.id)
            )
            decisions = decisions_result.scalars().all()

            for decision in decisions:
                total_reviewed += 1
                if decision.decision == 'fail':
                    total_failed += 1

        if total_reviewed == 0:
            return {
                "percentage": 0,
                "failed": 0,
                "total": 0
            }

        defect_percentage = (total_failed / total_reviewed) * 100

        return {
            "percentage": round(defect_percentage, 2),
            "failed": total_failed,
            "total": total_reviewed
        }

    async def _calculate_oee(
        self,
        workflow_id: str,
        executions: List[WorkflowExecution],
        db: AsyncSession,
        period_days: int
    ) -> Dict[str, Any]:
        """Calculate Overall Equipment Effectiveness (OEE)"""

        # OEE = Availability × Performance × Quality

        # 1. Availability: Actual runtime / Planned runtime
        # For workflows, we consider planned runtime as the period
        total_period_seconds = period_days * 24 * 3600

        # Sum of execution times
        actual_runtime = 0
        for execution in executions:
            if execution.completed_at and execution.started_at:
                duration = (execution.completed_at - execution.started_at).total_seconds()
                actual_runtime += duration

        availability = min(actual_runtime / total_period_seconds, 1.0) if total_period_seconds > 0 else 0

        # 2. Performance: Actual output / Ideal output
        # Ideal cycle time from standard work
        modules_result = await db.execute(
            select(WorkflowModule)
            .where(WorkflowModule.workflow_id == workflow_id)
        )
        modules = modules_result.scalars().all()

        ideal_cycle_time = sum(
            float(m.manual_time or 0) + float(m.auto_time or 0)
            for m in modules
        )

        # Actual cycle time from executions
        actual_cycle_times = []
        for execution in executions:
            if execution.completed_at and execution.started_at:
                duration = (execution.completed_at - execution.started_at).total_seconds()
                actual_cycle_times.append(duration)

        avg_actual_cycle = sum(actual_cycle_times) / len(actual_cycle_times) if actual_cycle_times else 0

        performance = (ideal_cycle_time / avg_actual_cycle) if avg_actual_cycle > 0 else 0
        performance = min(performance, 1.0)  # Cap at 100%

        # 3. Quality: Good units / Total units (inverse of defect rate)
        quality_metrics = await self._calculate_defect_rate(workflow_id, executions, db)
        quality = 1.0 - (quality_metrics['percentage'] / 100)

        # Calculate OEE
        oee = availability * performance * quality

        return {
            "overall": round(oee * 100, 2),
            "availability": round(availability * 100, 2),
            "performance": round(performance * 100, 2),
            "quality": round(quality * 100, 2)
        }

    async def _calculate_value_add_ratio(
        self,
        workflow_id: str,
        db: AsyncSession
    ) -> Dict[str, Any]:
        """Calculate Value-Add Ratio from Standard Work"""

        # Get modules with work element types
        modules_result = await db.execute(
            select(WorkflowModule)
            .where(WorkflowModule.workflow_id == workflow_id)
        )
        modules = modules_result.scalars().all()

        total_time = 0
        value_add_time = 0

        for module in modules:
            manual = float(module.manual_time or 0)
            auto = float(module.auto_time or 0)
            module_total = manual + auto

            total_time += module_total

            # Value-add activities
            if module.work_element_type == 'value-add':
                value_add_time += module_total

        if total_time == 0:
            return {
                "percentage": 0,
                "value_add_time": 0,
                "total_time": 0
            }

        value_add_percentage = (value_add_time / total_time) * 100

        return {
            "percentage": round(value_add_percentage, 2),
            "value_add_time": round(value_add_time, 2),
            "total_time": round(total_time, 2)
        }

    async def _calculate_throughput(
        self,
        executions: List[WorkflowExecution],
        period_days: int
    ) -> Dict[str, Any]:
        """Calculate throughput - items processed per day"""

        completed_executions = [
            e for e in executions
            if e.state == 'completed' and e.completed_at
        ]

        throughput_per_day = len(completed_executions) / period_days if period_days > 0 else 0

        return {
            "per_day": round(throughput_per_day, 2),
            "total": len(completed_executions),
            "period_days": period_days
        }

    async def _calculate_takt_time(
        self,
        executions: List[WorkflowExecution],
        period_days: int
    ) -> Dict[str, Any]:
        """Calculate Takt Time - available time / customer demand"""

        # Available time (in seconds)
        available_time = period_days * 24 * 3600

        # Customer demand = number of executions
        demand = len(executions)

        if demand == 0:
            return {
                "seconds": 0,
                "description": "No demand in period"
            }

        takt_time_seconds = available_time / demand

        return {
            "seconds": round(takt_time_seconds, 2),
            "description": f"Available time per unit: {round(takt_time_seconds / 60, 2)} minutes"
        }

    def _empty_metrics(self) -> Dict[str, Any]:
        """Return empty metrics structure"""
        return {
            "workflow_id": "",
            "period_days": 0,
            "executions_count": 0,
            "cycle_time": {
                "average": 0,
                "min": 0,
                "max": 0,
                "std_dev": 0
            },
            "first_pass_yield": {
                "percentage": 0,
                "passed": 0,
                "total": 0
            },
            "defect_rate": {
                "percentage": 0,
                "failed": 0,
                "total": 0
            },
            "oee": {
                "overall": 0,
                "availability": 0,
                "performance": 0,
                "quality": 0
            },
            "value_add_ratio": {
                "percentage": 0,
                "value_add_time": 0,
                "total_time": 0
            },
            "throughput": {
                "per_day": 0,
                "total": 0,
                "period_days": 0
            },
            "takt_time": {
                "seconds": 0,
                "description": "No data available"
            },
            "calculated_at": datetime.now().isoformat()
        }


# Singleton instance
_metrics_calculator_instance = None

def get_tps_metrics_calculator() -> TPSMetricsCalculator:
    """Get or create singleton TPSMetricsCalculator instance"""
    global _metrics_calculator_instance
    if _metrics_calculator_instance is None:
        _metrics_calculator_instance = TPSMetricsCalculator()
    return _metrics_calculator_instance
