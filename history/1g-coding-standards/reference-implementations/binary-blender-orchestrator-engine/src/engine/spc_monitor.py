"""
Statistical Process Control Monitor

Implements TPS quality metrics including Cpk, FTT, and OEE calculations
for AI workflow monitoring.
"""
import numpy as np
from typing import List, Dict, Optional, Tuple
from datetime import datetime, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func
from ..database.models import WorkflowExecution
import logging

logger = logging.getLogger(__name__)


class SPCMonitor:
    """
    Statistical Process Control monitor for workflow quality metrics.

    Implements:
    - Cpk (Process Capability Index)
    - FTT (First Time Through rate)
    - OEE (Overall Equipment Effectiveness)
    """

    def __init__(self, db: AsyncSession, tenant_id: str):
        """
        Initialize SPC Monitor

        Args:
            db: Database session
            tenant_id: Tenant identifier for multi-tenancy
        """
        self.db = db
        self.tenant_id = tenant_id

    def calculate_cpk(
        self,
        measurements: List[float],
        usl: float,
        lsl: float
    ) -> Optional[float]:
        """
        Calculate Process Capability Index (Cpk)

        Cpk measures how centered the process is within specification limits.
        Target values:
        - Cpk >= 1.67: World-class (Six Sigma)
        - Cpk >= 1.33: Good
        - Cpk >= 1.0: Adequate
        - Cpk < 1.0: Inadequate

        Args:
            measurements: List of process measurements
            usl: Upper Specification Limit
            lsl: Lower Specification Limit

        Returns:
            Cpk value or None if insufficient data
        """
        if len(measurements) < 30:
            logger.warning(f"Insufficient data for Cpk: {len(measurements)} measurements (need 30+)")
            return None

        measurements = np.array(measurements)
        mean = np.mean(measurements)
        std = np.std(measurements, ddof=1)  # Sample standard deviation

        # Handle zero standard deviation (perfect process)
        if std == 0:
            if lsl <= mean <= usl:
                return float('inf')  # Perfect and centered
            else:
                return 0.0  # Perfect but out of spec

        # Calculate capability indices
        cpu = (usl - mean) / (3 * std)  # Upper capability
        cpl = (mean - lsl) / (3 * std)  # Lower capability
        cpk = min(cpu, cpl)

        return round(cpk, 2)

    async def calculate_ftt(
        self,
        workflow_id: str,
        days: int = 30
    ) -> float:
        """
        Calculate First Time Through (FTT) rate

        FTT = (Executions that completed without intervention) / (Total executions) * 100

        Target: >99.5%

        Args:
            workflow_id: Workflow identifier
            days: Number of days to look back

        Returns:
            FTT percentage (0-100)
        """
        start_time = datetime.utcnow() - timedelta(days=days)

        # Get executions from the specified time period
        query = select(WorkflowExecution).where(
            and_(
                WorkflowExecution.workflow_id == workflow_id,
                WorkflowExecution.tenant_id == self.tenant_id,
                WorkflowExecution.started_at >= start_time
            )
        )

        result = await self.db.execute(query)
        executions = result.scalars().all()

        if not executions:
            logger.warning(f"No executions found for workflow {workflow_id} in last {days} days")
            return 0.0

        # Count successful completions without intervention
        # In this version, we consider 'completed' state as FTT
        # In future: check had_intervention field
        successful = sum(
            1 for e in executions
            if e.state == 'completed'
        )

        ftt = (successful / len(executions)) * 100
        return round(ftt, 2)

    async def calculate_oee_components(
        self,
        workflow_id: str,
        days: int = 7
    ) -> Dict[str, float]:
        """
        Calculate Overall Equipment Effectiveness (OEE) components

        OEE = Availability × Performance × Quality

        Availability: Uptime / Scheduled time
        Performance: (Actual cycle time / Ideal cycle time)
        Quality: (Good units / Total units)

        Target OEE: >90%

        Args:
            workflow_id: Workflow identifier
            days: Number of days to look back

        Returns:
            Dict with availability, performance, quality, and oee percentages
        """
        start_time = datetime.utcnow() - timedelta(days=days)

        # Get executions
        query = select(WorkflowExecution).where(
            and_(
                WorkflowExecution.workflow_id == workflow_id,
                WorkflowExecution.tenant_id == self.tenant_id,
                WorkflowExecution.started_at >= start_time
            )
        )

        result = await self.db.execute(query)
        executions = result.scalars().all()

        if not executions:
            return {
                'availability': 0.0,
                'performance': 0.0,
                'quality': 0.0,
                'oee': 0.0
            }

        # Calculate Availability (simplification for demo)
        # In production: (actual uptime) / (scheduled time)
        completed_or_failed = sum(
            1 for e in executions
            if e.state in ['completed', 'failed']
        )
        availability = (completed_or_failed / len(executions)) * 100

        # Calculate Performance (simplification for demo)
        # In production: compare actual cycle time vs ideal takt time
        # For now, use a reasonable estimate
        performance = 87.0  # Placeholder - will calculate from cycle_time_seconds later

        # Calculate Quality
        # Quality = successful outputs / total outputs
        completed = sum(1 for e in executions if e.state == 'completed')
        quality = (completed / len(executions)) * 100

        # Calculate OEE
        oee = (availability / 100) * (performance / 100) * (quality / 100) * 100

        return {
            'availability': round(availability, 2),
            'performance': round(performance, 2),
            'quality': round(quality, 2),
            'oee': round(oee, 2)
        }

    async def get_recent_executions(
        self,
        workflow_id: str,
        days: int
    ) -> List[WorkflowExecution]:
        """
        Get recent workflow executions

        Args:
            workflow_id: Workflow identifier
            days: Number of days to look back

        Returns:
            List of workflow executions
        """
        start_time = datetime.utcnow() - timedelta(days=days)

        query = select(WorkflowExecution).where(
            and_(
                WorkflowExecution.workflow_id == workflow_id,
                WorkflowExecution.tenant_id == self.tenant_id,
                WorkflowExecution.started_at >= start_time
            )
        ).order_by(WorkflowExecution.started_at.asc())

        result = await self.db.execute(query)
        return result.scalars().all()

    async def get_spec_limits(
        self,
        workflow_id: str,
        metric: str
    ) -> Tuple[float, float]:
        """
        Get specification limits for a metric

        In future versions, these will be stored in workflow config.
        For now, return defaults based on metric type.

        Args:
            workflow_id: Workflow identifier
            metric: Metric type (latency, accuracy, cost, etc.)

        Returns:
            Tuple of (USL, LSL) - Upper and Lower Specification Limits
        """
        # Default specification limits by metric type
        defaults = {
            'latency': (60.0, 1.0),      # seconds: 1-60s
            'accuracy': (1.0, 0.95),     # percentage: 95-100%
            'confidence': (1.0, 0.95),   # percentage: 95-100%
            'cost': (10.0, 0.0),         # dollars: $0-10
            'token_usage': (50000, 0),   # tokens: 0-50k
        }

        return defaults.get(metric, (100.0, 0.0))

    async def get_recent_metrics(
        self,
        workflow_id: str,
        metric: str,
        days: int = 7
    ) -> List[float]:
        """
        Get recent metric measurements for a workflow

        For MVP, we'll derive metrics from execution data.
        In future: query workflow_metrics table.

        Args:
            workflow_id: Workflow identifier
            metric: Metric type
            days: Number of days to look back

        Returns:
            List of metric values
        """
        executions = await self.get_recent_executions(workflow_id, days)

        measurements = []
        for execution in executions:
            # Extract metric from execution data
            if metric == 'latency' and execution.completed_at and execution.started_at:
                # Calculate execution duration in seconds
                duration = (execution.completed_at - execution.started_at).total_seconds()
                measurements.append(duration)
            # Add more metric extraction logic here in future

        return measurements
