"""
Real-time cost tracking system - Sprint 6.0
Tracks costs per execution, module, and MCP server
"""
from typing import Optional, Dict, List
from decimal import Decimal
from datetime import datetime, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
import uuid

from src.database.models import CostTracking, CostRule


class CostTracker:
    """Tracks and calculates costs for MCP operations"""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_cost_rule(self, mcp_server: str, operation: str) -> Optional[CostRule]:
        """Get pricing rule for a specific MCP server operation"""
        result = await self.db.execute(
            select(CostRule).where(
                CostRule.mcp_server == mcp_server,
                CostRule.operation == operation
            )
        )
        return result.scalar_one_or_none()

    async def calculate_cost(
        self,
        mcp_server: str,
        operation: str,
        input_tokens: int = 0,
        output_tokens: int = 0,
        compute_time_ms: int = 0,
        metadata: Optional[Dict] = None
    ) -> Decimal:
        """
        Calculate cost based on pricing rule

        Supports multiple pricing models:
        - per_token: Cost per input/output token
        - per_request: Flat cost per request
        - per_second: Cost per compute second
        - per_image: Flat cost per image generated
        """
        rule = await self.get_cost_rule(mcp_server, operation)

        if not rule:
            # Default fallback pricing
            return Decimal("0.001")  # 0.1 cent default

        total_cost = rule.base_cost

        if rule.pricing_model == "per_token":
            # Cost per token (separate rates for input/output)
            input_cost = Decimal(input_tokens) * rule.token_cost
            output_cost = Decimal(output_tokens) * rule.token_cost * Decimal("1.5")  # Output typically costs more
            total_cost += input_cost + output_cost

        elif rule.pricing_model == "per_request":
            # Flat rate per request (base_cost is the rate)
            pass  # Already added base_cost

        elif rule.pricing_model == "per_second":
            # Cost per second of compute
            compute_seconds = Decimal(compute_time_ms) / Decimal("1000")
            total_cost += compute_seconds * rule.token_cost  # Using token_cost field for per-second rate

        elif rule.pricing_model == "per_image":
            # Flat rate per image
            pass  # Already added base_cost

        return total_cost

    async def track_cost(
        self,
        tenant_id: str,
        execution_id: Optional[str] = None,
        module_id: Optional[str] = None,
        mcp_server: str = None,
        operation: str = None,
        input_tokens: int = 0,
        output_tokens: int = 0,
        compute_time_ms: int = 0,
        metadata: Optional[Dict] = None
    ) -> CostTracking:
        """
        Track cost for an operation

        Returns the created CostTracking record
        """
        # Calculate cost
        cost_usd = await self.calculate_cost(
            mcp_server=mcp_server,
            operation=operation,
            input_tokens=input_tokens,
            output_tokens=output_tokens,
            compute_time_ms=compute_time_ms,
            metadata=metadata
        )

        # Get pricing model from rule
        rule = await self.get_cost_rule(mcp_server, operation)
        pricing_model = rule.pricing_model if rule else "per_request"

        # Create tracking record
        tracking = CostTracking(
            id=f"cost_{uuid.uuid4().hex[:8]}",
            tenant_id=tenant_id,
            execution_id=execution_id,
            module_id=module_id,
            mcp_server=mcp_server,
            operation=operation,
            input_tokens=input_tokens,
            output_tokens=output_tokens,
            compute_time_ms=compute_time_ms,
            cost_usd=cost_usd,
            pricing_model=pricing_model,
            metadata=metadata or {},
            timestamp=datetime.utcnow()
        )

        self.db.add(tracking)
        await self.db.commit()
        await self.db.refresh(tracking)

        return tracking

    async def get_execution_cost(self, execution_id: str) -> Decimal:
        """Get total cost for a workflow execution"""
        result = await self.db.execute(
            select(func.sum(CostTracking.cost_usd)).where(
                CostTracking.execution_id == execution_id
            )
        )
        total = result.scalar()
        return Decimal(str(total)) if total else Decimal("0")

    async def get_tenant_cost(
        self,
        tenant_id: str,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None
    ) -> Dict:
        """
        Get cost summary for a tenant

        Returns breakdown by server, total cost, etc.
        """
        query = select(CostTracking).where(CostTracking.tenant_id == tenant_id)

        if start_date:
            query = query.where(CostTracking.timestamp >= start_date)

        if end_date:
            query = query.where(CostTracking.timestamp <= end_date)

        result = await self.db.execute(query)
        records = result.scalars().all()

        # Calculate total
        total_cost = sum(Decimal(str(r.cost_usd)) for r in records)

        # Breakdown by server
        by_server = {}
        for record in records:
            server = record.mcp_server or "unknown"
            if server not in by_server:
                by_server[server] = Decimal("0")
            by_server[server] += Decimal(str(record.cost_usd))

        # Breakdown by day
        by_day = {}
        for record in records:
            day = record.timestamp.date().isoformat()
            if day not in by_day:
                by_day[day] = Decimal("0")
            by_day[day] += Decimal(str(record.cost_usd))

        return {
            "total_cost": float(total_cost),
            "by_server": {k: float(v) for k, v in by_server.items()},
            "by_day": {k: float(v) for k, v in by_day.items()},
            "record_count": len(records)
        }

    async def get_cost_projection(
        self,
        tenant_id: str,
        days_to_project: int = 30
    ) -> Dict:
        """
        Project future costs based on recent usage patterns

        Analyzes last 7 days to project next N days
        """
        # Get costs from last 7 days
        seven_days_ago = datetime.utcnow() - timedelta(days=7)

        result = await self.db.execute(
            select(func.sum(CostTracking.cost_usd)).where(
                CostTracking.tenant_id == tenant_id,
                CostTracking.timestamp >= seven_days_ago
            )
        )

        last_7_days_cost = result.scalar()
        if not last_7_days_cost:
            return {
                "daily_average": 0.0,
                "projected_monthly": 0.0,
                "projected_days": 0.0
            }

        daily_average = Decimal(str(last_7_days_cost)) / Decimal("7")
        projected = daily_average * Decimal(str(days_to_project))

        return {
            "daily_average": float(daily_average),
            "projected_monthly": float(daily_average * Decimal("30")),
            "projected_days": float(projected)
        }

    async def check_budget_alert(
        self,
        tenant_id: str,
        monthly_budget: Decimal
    ) -> Dict:
        """
        Check if tenant is approaching or exceeding budget

        Returns alert status and current spend percentage
        """
        # Get current month costs
        now = datetime.utcnow()
        month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

        result = await self.db.execute(
            select(func.sum(CostTracking.cost_usd)).where(
                CostTracking.tenant_id == tenant_id,
                CostTracking.timestamp >= month_start
            )
        )

        current_spend = result.scalar()
        current_spend = Decimal(str(current_spend)) if current_spend else Decimal("0")

        spend_percentage = (current_spend / monthly_budget * Decimal("100")) if monthly_budget > 0 else Decimal("0")

        alert_level = "ok"
        if spend_percentage >= Decimal("100"):
            alert_level = "critical"
        elif spend_percentage >= Decimal("90"):
            alert_level = "warning"
        elif spend_percentage >= Decimal("75"):
            alert_level = "info"

        return {
            "current_spend": float(current_spend),
            "monthly_budget": float(monthly_budget),
            "spend_percentage": float(spend_percentage),
            "alert_level": alert_level,
            "remaining_budget": float(monthly_budget - current_spend)
        }


# Helper function for cost tracking
async def get_cost_tracker(db: AsyncSession) -> CostTracker:
    """Dependency to get cost tracker instance"""
    return CostTracker(db)
