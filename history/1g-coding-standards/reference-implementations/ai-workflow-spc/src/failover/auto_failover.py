"""
Auto-Failover System - Sprint 6.0
Automatically switches to backup MCP servers when primary fails
"""
from typing import List, Optional, Dict, Any, Callable
from dataclasses import dataclass
import asyncio
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession

from src.failover.circuit_breaker import CircuitBreakerManager, CircuitBreakerError
from src.database.models import ServerHealth


@dataclass
class FailoverConfig:
    """Failover configuration for an MCP server"""
    primary: str  # Primary server ID
    fallbacks: List[str]  # Ordered list of fallback servers
    max_retry_attempts: int = 3
    retry_backoff_multiplier: float = 2.0  # Exponential backoff


class FailoverExecutor:
    """
    Executes operations with automatic failover to backup servers

    Features:
    - Attempts primary server first
    - Falls back to alternates if primary fails or circuit is open
    - Exponential backoff retry logic
    - Circuit breaker integration
    """

    def __init__(self, db: AsyncSession):
        self.db = db
        self.circuit_breaker_manager = CircuitBreakerManager(db)

    async def execute_with_failover(
        self,
        config: FailoverConfig,
        operation: Callable,
        *args,
        **kwargs
    ) -> Dict[str, Any]:
        """
        Execute an operation with automatic failover

        Args:
            config: Failover configuration with primary and fallback servers
            operation: Async function to execute (should accept server_id as first arg)
            *args, **kwargs: Additional arguments for operation

        Returns:
            Dict with:
                - result: Operation result
                - server_used: Which server successfully handled the request
                - attempts: Number of attempts made
                - fallback_triggered: Whether failover occurred
        """
        servers_to_try = [config.primary] + config.fallbacks
        attempts = 0
        last_error = None

        for server_id in servers_to_try:
            attempts += 1

            try:
                # Check if server is healthy
                if not await self._is_server_available(server_id):
                    continue

                # Execute with circuit breaker protection
                result = await self.circuit_breaker_manager.call_with_breaker(
                    server_id,
                    operation,
                    server_id,
                    *args,
                    **kwargs
                )

                # Success!
                return {
                    "result": result,
                    "server_used": server_id,
                    "attempts": attempts,
                    "fallback_triggered": server_id != config.primary,
                    "success": True
                }

            except CircuitBreakerError:
                # Circuit is open, try next server
                last_error = f"Circuit breaker open for {server_id}"
                continue

            except Exception as e:
                # Operation failed, try next server
                last_error = str(e)

                # Exponential backoff before next retry
                if attempts < len(servers_to_try):
                    backoff = (config.retry_backoff_multiplier ** (attempts - 1))
                    await asyncio.sleep(backoff)

                continue

        # All servers failed
        return {
            "result": None,
            "server_used": None,
            "attempts": attempts,
            "fallback_triggered": True,
            "success": False,
            "error": f"All servers failed. Last error: {last_error}"
        }

    async def _is_server_available(self, server_id: str) -> bool:
        """Check if server is available for requests"""
        from sqlalchemy import select

        result = await self.db.execute(
            select(ServerHealth).where(ServerHealth.server_id == server_id)
        )
        health = result.scalar_one_or_none()

        if not health:
            # No health record, assume available
            return True

        # Check status and circuit breaker
        return (
            health.status in ["healthy", "degraded"] and
            health.circuit_breaker_state != "open"
        )

    async def get_failover_status(self, server_id: str) -> Dict:
        """Get failover and health status for a server"""
        from sqlalchemy import select

        result = await self.db.execute(
            select(ServerHealth).where(ServerHealth.server_id == server_id)
        )
        health = result.scalar_one_or_none()

        if not health:
            return {
                "server_id": server_id,
                "status": "unknown",
                "available": True,
                "circuit_state": "closed"
            }

        return {
            "server_id": server_id,
            "status": health.status,
            "latency_ms": health.latency_ms,
            "success_rate": float(health.success_rate) if health.success_rate else 0.0,
            "circuit_state": health.circuit_breaker_state,
            "last_check": health.last_check.isoformat() if health.last_check else None,
            "available": health.status in ["healthy", "degraded"] and health.circuit_breaker_state != "open"
        }


# Predefined failover configurations for common MCP servers
FAILOVER_CONFIGS = {
    "replicate_mcp": FailoverConfig(
        primary="replicate_mcp",
        fallbacks=["openai_dalle_mcp", "stability_mcp", "akool_mcp"]
    ),
    "gpt4_mcp": FailoverConfig(
        primary="gpt4_mcp",
        fallbacks=["claude_mcp", "gpt35_turbo_mcp", "llama_mcp"]
    ),
    "dalle3_mcp": FailoverConfig(
        primary="dalle3_mcp",
        fallbacks=["replicate_mcp", "stability_mcp"]
    ),
    "claude_mcp": FailoverConfig(
        primary="claude_mcp",
        fallbacks=["gpt4_mcp", "gpt35_turbo_mcp"]
    ),
    "elevenlabs_mcp": FailoverConfig(
        primary="elevenlabs_mcp",
        fallbacks=["openai_tts_mcp"]
    ),
}


def get_failover_config(server_id: str) -> Optional[FailoverConfig]:
    """Get predefined failover configuration for a server"""
    return FAILOVER_CONFIGS.get(server_id)


async def execute_with_auto_failover(
    db: AsyncSession,
    server_id: str,
    operation: Callable,
    *args,
    **kwargs
) -> Dict[str, Any]:
    """
    Convenience function to execute operation with auto-failover

    Args:
        db: Database session
        server_id: Primary server ID
        operation: Operation to execute
        *args, **kwargs: Operation arguments

    Returns:
        Result dictionary
    """
    executor = FailoverExecutor(db)

    # Get failover config
    config = get_failover_config(server_id)

    if not config:
        # No failover config, try once
        config = FailoverConfig(primary=server_id, fallbacks=[])

    return await executor.execute_with_failover(config, operation, *args, **kwargs)
