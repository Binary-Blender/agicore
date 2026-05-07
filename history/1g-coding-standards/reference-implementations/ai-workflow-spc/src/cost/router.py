"""
Intelligent MCP server routing for cost optimization - Sprint 6.0
Routes requests to optimal servers based on cost/quality/speed
"""
from typing import List, Dict, Optional
from dataclasses import dataclass
from enum import Enum
from decimal import Decimal
from datetime import datetime, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from src.database.models import ProviderMetrics, ServerHealth, CostRule


class OptimizationMode(str, Enum):
    """Optimization strategies for server selection"""
    COST = "cost"  # Minimize cost
    QUALITY = "quality"  # Maximize quality
    SPEED = "speed"  # Minimize latency
    BALANCED = "balanced"  # Balanced approach
    EXPERIMENTAL = "experimental"  # For A/B testing


@dataclass
class MCPServer:
    """Represents an MCP server option"""
    id: str
    name: str
    capabilities: List[str]
    avg_latency_ms: float = 1000.0
    avg_quality_score: float = 80.0
    avg_cost_per_request: Decimal = Decimal("0.01")
    success_rate: float = 99.0
    health_status: str = "healthy"
    is_available: bool = True


class IntelligentRouter:
    """
    Routes MCP requests to optimal servers based on multiple criteria

    Uses weighted scoring algorithm:
    - Cost weight: 30-50%
    - Quality weight: 30-50%
    - Speed weight: 20-40%
    - Availability: Binary (must be healthy)
    """

    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_server_metrics(self, server_id: str, days: int = 7) -> Dict:
        """
        Get historical metrics for a server from the last N days
        """
        cutoff_date = datetime.utcnow() - timedelta(days=days)

        # Get provider metrics
        result = await self.db.execute(
            select(
                func.avg(ProviderMetrics.generation_time).label("avg_time"),
                func.avg(ProviderMetrics.quality_score).label("avg_quality"),
                func.avg(ProviderMetrics.cost).label("avg_cost"),
                func.avg(ProviderMetrics.selection_rate).label("selection_rate"),
                func.avg(ProviderMetrics.failure_rate).label("failure_rate")
            ).where(
                ProviderMetrics.provider == server_id,
                ProviderMetrics.timestamp >= cutoff_date
            )
        )

        metrics = result.first()

        # Get health status
        health_result = await self.db.execute(
            select(ServerHealth).where(ServerHealth.server_id == server_id)
        )
        health = health_result.scalar_one_or_none()

        return {
            "avg_latency_ms": float(metrics.avg_time) * 1000 if metrics.avg_time else 1000.0,
            "avg_quality_score": float(metrics.avg_quality) if metrics.avg_quality else 80.0,
            "avg_cost": Decimal(str(metrics.avg_cost)) if metrics.avg_cost else Decimal("0.01"),
            "selection_rate": float(metrics.selection_rate) if metrics.selection_rate else 0.0,
            "failure_rate": float(metrics.failure_rate) if metrics.failure_rate else 0.0,
            "success_rate": 100.0 - (float(metrics.failure_rate) if metrics.failure_rate else 0.0),
            "health_status": health.status if health else "unknown",
            "circuit_breaker_state": health.circuit_breaker_state if health else "closed"
        }

    async def get_cost_estimate(self, server_id: str, operation: str) -> Decimal:
        """Get estimated cost for an operation"""
        result = await self.db.execute(
            select(CostRule).where(
                CostRule.mcp_server == server_id,
                CostRule.operation == operation
            )
        )
        rule = result.scalar_one_or_none()

        if rule:
            return rule.base_cost
        else:
            # Fallback estimate based on historical data
            metrics = await self.get_server_metrics(server_id)
            return metrics["avg_cost"]

    def calculate_score(
        self,
        server: MCPServer,
        mode: OptimizationMode,
        weights: Optional[Dict[str, float]] = None
    ) -> float:
        """
        Calculate overall score for a server based on optimization mode

        Score is 0-100, higher is better
        """
        if not server.is_available or server.health_status != "healthy":
            return 0.0

        # Default weights based on mode
        if weights is None:
            if mode == OptimizationMode.COST:
                weights = {"cost": 0.50, "quality": 0.30, "speed": 0.20}
            elif mode == OptimizationMode.QUALITY:
                weights = {"cost": 0.20, "quality": 0.50, "speed": 0.30}
            elif mode == OptimizationMode.SPEED:
                weights = {"cost": 0.20, "quality": 0.30, "speed": 0.50}
            elif mode == OptimizationMode.BALANCED:
                weights = {"cost": 0.33, "quality": 0.34, "speed": 0.33}
            elif mode == OptimizationMode.EXPERIMENTAL:
                # Random selection for A/B testing
                weights = {"cost": 0.25, "quality": 0.25, "speed": 0.25}
            else:
                weights = {"cost": 0.33, "quality": 0.34, "speed": 0.33}

        # Normalize scores to 0-100 scale

        # Cost score (lower cost = higher score)
        # Assume $0.10 is expensive (0 score) and $0.001 is cheap (100 score)
        max_cost = Decimal("0.10")
        min_cost = Decimal("0.0001")
        cost_range = max_cost - min_cost
        normalized_cost = (max_cost - server.avg_cost_per_request) / cost_range
        cost_score = min(100.0, max(0.0, float(normalized_cost) * 100))

        # Quality score (already 0-100)
        quality_score = server.avg_quality_score

        # Speed score (lower latency = higher score)
        # Assume 5000ms is slow (0 score) and 100ms is fast (100 score)
        max_latency = 5000.0
        min_latency = 100.0
        latency_range = max_latency - min_latency
        normalized_speed = (max_latency - server.avg_latency_ms) / latency_range
        speed_score = min(100.0, max(0.0, normalized_speed * 100))

        # Success rate bonus
        success_bonus = (server.success_rate / 100.0) * 10  # Up to 10% bonus

        # Calculate weighted score
        total_score = (
            cost_score * weights["cost"] +
            quality_score * weights["quality"] +
            speed_score * weights["speed"]
        ) + success_bonus

        return min(100.0, total_score)

    async def select_optimal_server(
        self,
        available_servers: List[str],
        operation: str,
        mode: OptimizationMode = OptimizationMode.BALANCED,
        custom_weights: Optional[Dict[str, float]] = None,
        budget_limit: Optional[Decimal] = None
    ) -> Optional[MCPServer]:
        """
        Select the optimal server from available options

        Args:
            available_servers: List of server IDs that can perform the operation
            operation: The operation to perform
            mode: Optimization strategy
            custom_weights: Custom weight overrides
            budget_limit: Maximum cost per request (filters out expensive servers)

        Returns:
            The selected MCPServer or None if no suitable server found
        """
        if not available_servers:
            return None

        # Build MCPServer objects with current metrics
        servers = []
        for server_id in available_servers:
            metrics = await self.get_server_metrics(server_id)
            cost = await self.get_cost_estimate(server_id, operation)

            # Filter by budget if specified
            if budget_limit and cost > budget_limit:
                continue

            # Check circuit breaker
            is_available = (
                metrics["health_status"] == "healthy" and
                metrics["circuit_breaker_state"] != "open"
            )

            server = MCPServer(
                id=server_id,
                name=server_id,
                capabilities=[operation],
                avg_latency_ms=metrics["avg_latency_ms"],
                avg_quality_score=metrics["avg_quality_score"],
                avg_cost_per_request=cost,
                success_rate=metrics["success_rate"],
                health_status=metrics["health_status"],
                is_available=is_available
            )

            servers.append(server)

        if not servers:
            return None

        # Score all servers
        scored_servers = []
        for server in servers:
            score = self.calculate_score(server, mode, custom_weights)
            scored_servers.append((server, score))

        # Sort by score (highest first)
        scored_servers.sort(key=lambda x: x[1], reverse=True)

        # Return best server
        best_server, best_score = scored_servers[0]

        if best_score == 0.0:
            # No healthy servers
            return None

        return best_server

    async def get_routing_recommendations(
        self,
        tenant_id: str,
        current_mode: OptimizationMode = OptimizationMode.BALANCED
    ) -> Dict:
        """
        Analyze current usage and recommend optimizations

        Returns potential cost savings by switching modes or servers
        """
        # Get recent executions and costs
        # This would analyze patterns and suggest alternatives

        # For now, return mock recommendations
        recommendations = {
            "current_mode": current_mode.value,
            "monthly_cost": 1234.56,
            "alternative_modes": [
                {
                    "mode": "cost",
                    "estimated_monthly_cost": 864.19,
                    "savings_percentage": 30.0,
                    "quality_impact": -5.0,  # 5% quality reduction
                    "speed_impact": 10.0  # 10% slower
                },
                {
                    "mode": "quality",
                    "estimated_monthly_cost": 1420.74,
                    "savings_percentage": -15.0,  # More expensive
                    "quality_impact": 15.0,  # 15% quality improvement
                    "speed_impact": 0.0
                }
            ],
            "server_recommendations": [
                {
                    "current_server": "dalle3_mcp",
                    "alternative_server": "sdxl_mcp",
                    "potential_savings": 89.50,
                    "operation": "generate_image"
                }
            ]
        }

        return recommendations


async def get_intelligent_router(db: AsyncSession) -> IntelligentRouter:
    """Dependency to get intelligent router instance"""
    return IntelligentRouter(db)
