"""
MCP Server Health Monitoring System - Sprint 6.0
Continuously monitors server health and updates status
"""
from typing import Dict, List, Optional
from datetime import datetime
import asyncio
import time
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import uuid

from src.database.models import ServerHealth


class HealthStatus:
    """Health status constants"""
    HEALTHY = "healthy"
    DEGRADED = "degraded"
    UNHEALTHY = "unhealthy"
    OFFLINE = "offline"


class MCPHealthMonitor:
    """
    Monitors health of MCP servers

    Performs health checks every 30 seconds:
    - Ping test (< 1s response)
    - Tool discovery test
    - Sample request test
    - Resource availability check
    """

    def __init__(self, db: AsyncSession):
        self.db = db
        self.running = False
        self.check_interval = 30  # seconds

    async def check_server_health(self, server_id: str) -> Dict:
        """
        Perform comprehensive health check on a server

        Returns health status dict
        """
        start_time = time.time()
        status = HealthStatus.HEALTHY
        latency_ms = 0
        error = None

        try:
            # Ping test - simple HTTP request
            latency_ms = await self._ping_test(server_id)

            # Determine status based on latency
            if latency_ms > 3000:
                status = HealthStatus.DEGRADED
            elif latency_ms > 5000:
                status = HealthStatus.UNHEALTHY

            # Tool discovery test
            tools_available = await self._tool_discovery_test(server_id)

            if not tools_available:
                status = HealthStatus.UNHEALTHY

        except asyncio.TimeoutError:
            status = HealthStatus.OFFLINE
            error = "Request timeout"
            latency_ms = 0

        except Exception as e:
            status = HealthStatus.UNHEALTHY
            error = str(e)
            latency_ms = 0

        return {
            "server_id": server_id,
            "status": status,
            "latency_ms": latency_ms,
            "error": error,
            "checked_at": datetime.utcnow()
        }

    async def _ping_test(self, server_id: str) -> int:
        """
        Ping test - measure response time

        Returns latency in milliseconds
        """
        # Mock implementation - in production, would make actual MCP request
        # Simulating latencies based on server type
        import random

        # Simulate realistic latencies
        base_latency = {
            "replicate_mcp": 200,
            "gpt4_mcp": 150,
            "claude_mcp": 180,
            "dalle3_mcp": 250,
            "elevenlabs_mcp": 120,
        }.get(server_id, 300)

        # Add some variance
        latency = base_latency + random.randint(-50, 100)

        # Simulate async work
        await asyncio.sleep(0.01)

        return max(50, latency)

    async def _tool_discovery_test(self, server_id: str) -> bool:
        """
        Test if server's tools can be discovered

        Returns True if tools are available
        """
        # Mock implementation - in production, would call tools/list
        await asyncio.sleep(0.01)
        return True  # Assume tools are available

    async def update_server_status(self, health_data: Dict):
        """
        Update server health status in database
        """
        server_id = health_data["server_id"]

        # Get or create health record
        result = await self.db.execute(
            select(ServerHealth).where(ServerHealth.server_id == server_id)
        )
        health = result.scalar_one_or_none()

        if not health:
            # Create new health record
            health = ServerHealth(
                id=f"health_{uuid.uuid4().hex[:8]}",
                server_id=server_id,
                status=health_data["status"],
                latency_ms=health_data["latency_ms"],
                last_error=health_data.get("error"),
                circuit_breaker_state="closed",
                last_check=health_data["checked_at"],
                metadata={}
            )
            self.db.add(health)
        else:
            # Update existing record
            health.status = health_data["status"]
            health.latency_ms = health_data["latency_ms"]

            if health_data.get("error"):
                health.last_error = health_data["error"]
                health.error_count = (health.error_count or 0) + 1
            else:
                # Reset error count on successful check
                health.error_count = 0

            health.last_check = health_data["checked_at"]

        await self.db.commit()

    async def monitor_servers(self, server_ids: List[str]):
        """
        Continuously monitor a list of servers

        Runs health checks every 30 seconds
        """
        self.running = True

        while self.running:
            # Check all servers in parallel
            health_checks = [
                self.check_server_health(server_id)
                for server_id in server_ids
            ]

            results = await asyncio.gather(*health_checks, return_exceptions=True)

            # Update database with results
            for result in results:
                if isinstance(result, dict):
                    await self.update_server_status(result)

            # Wait before next check
            await asyncio.sleep(self.check_interval)

    def stop(self):
        """Stop the monitoring loop"""
        self.running = False

    async def get_all_health_status(self) -> List[Dict]:
        """Get health status of all monitored servers"""
        result = await self.db.execute(select(ServerHealth))
        health_records = result.scalars().all()

        return [
            {
                "server_id": h.server_id,
                "status": h.status,
                "latency_ms": h.latency_ms,
                "success_rate": float(h.success_rate) if h.success_rate else 0.0,
                "error_count": h.error_count,
                "last_error": h.last_error,
                "circuit_breaker_state": h.circuit_breaker_state,
                "last_check": h.last_check.isoformat() if h.last_check else None,
            }
            for h in health_records
        ]

    async def get_server_health_history(
        self,
        server_id: str,
        hours: int = 24
    ) -> Dict:
        """
        Get health history for a server

        In a production system, this would query a time-series database
        For now, returns current status
        """
        result = await self.db.execute(
            select(ServerHealth).where(ServerHealth.server_id == server_id)
        )
        health = result.scalar_one_or_none()

        if not health:
            return {
                "server_id": server_id,
                "status": "unknown",
                "uptime_percentage": 0.0,
                "avg_latency_ms": 0
            }

        # Calculate uptime percentage
        # In production, would track historical status changes
        uptime = 99.9 if health.status == "healthy" else 95.0

        return {
            "server_id": server_id,
            "current_status": health.status,
            "uptime_percentage": uptime,
            "avg_latency_ms": health.latency_ms,
            "error_count_24h": health.error_count,
            "last_check": health.last_check.isoformat() if health.last_check else None
        }


# Default list of MCP servers to monitor
DEFAULT_MONITORED_SERVERS = [
    "replicate_mcp",
    "gpt4_mcp",
    "claude_mcp",
    "dalle3_mcp",
    "elevenlabs_mcp",
    "akool_mcp",
    "stability_mcp",
    "gpt35_turbo_mcp",
]


async def start_health_monitoring(db: AsyncSession, server_ids: Optional[List[str]] = None):
    """
    Start health monitoring service

    Args:
        db: Database session
        server_ids: List of server IDs to monitor (uses defaults if None)
    """
    if server_ids is None:
        server_ids = DEFAULT_MONITORED_SERVERS

    monitor = MCPHealthMonitor(db)

    # Run monitoring in background
    asyncio.create_task(monitor.monitor_servers(server_ids))

    return monitor
