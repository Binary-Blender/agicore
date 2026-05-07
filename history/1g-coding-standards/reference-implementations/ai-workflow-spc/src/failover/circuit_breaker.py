"""
Circuit Breaker Pattern Implementation - Sprint 6.0
Prevents cascading failures by detecting and handling service degradation
"""
from typing import Optional, Callable, Any
from datetime import datetime, timedelta
from enum import Enum
import asyncio
from dataclasses import dataclass
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from src.database.models import ServerHealth


class CircuitState(str, Enum):
    """Circuit breaker states"""
    CLOSED = "closed"  # Normal operation
    OPEN = "open"  # Failing, rejecting requests
    HALF_OPEN = "half-open"  # Testing if service recovered


@dataclass
class CircuitBreakerConfig:
    """Configuration for circuit breaker"""
    failure_threshold: int = 5  # Failures before opening
    recovery_timeout: int = 60  # Seconds before trying half-open
    success_threshold: int = 2  # Successes in half-open to close
    timeout_seconds: int = 30  # Request timeout


class CircuitBreakerError(Exception):
    """Raised when circuit breaker is open"""
    pass


class CircuitBreaker:
    """
    Implements the Circuit Breaker pattern for MCP servers

    States:
    - CLOSED: Normal operation, requests allowed
    - OPEN: Too many failures, requests rejected immediately
    - HALF_OPEN: Testing if service recovered, limited requests allowed
    """

    def __init__(
        self,
        server_id: str,
        db: AsyncSession,
        config: Optional[CircuitBreakerConfig] = None
    ):
        self.server_id = server_id
        self.db = db
        self.config = config or CircuitBreakerConfig()

        self.state = CircuitState.CLOSED
        self.failure_count = 0
        self.success_count = 0
        self.last_failure_time: Optional[datetime] = None
        self.next_attempt_time: Optional[datetime] = None

    async def load_state(self):
        """Load circuit breaker state from database"""
        result = await self.db.execute(
            select(ServerHealth).where(ServerHealth.server_id == self.server_id)
        )
        health = result.scalar_one_or_none()

        if health:
            self.state = CircuitState(health.circuit_breaker_state)
            self.failure_count = health.error_count
            self.next_attempt_time = health.circuit_breaker_reset_at

    async def save_state(self):
        """Save circuit breaker state to database"""
        result = await self.db.execute(
            select(ServerHealth).where(ServerHealth.server_id == self.server_id)
        )
        health = result.scalar_one_or_none()

        if health:
            health.circuit_breaker_state = self.state.value
            health.error_count = self.failure_count
            health.circuit_breaker_reset_at = self.next_attempt_time
            await self.db.commit()

    async def call(self, func: Callable, *args, **kwargs) -> Any:
        """
        Execute a function with circuit breaker protection

        Args:
            func: Async function to execute
            *args, **kwargs: Arguments to pass to func

        Returns:
            Result from func

        Raises:
            CircuitBreakerError: If circuit is open
        """
        # Check current state
        await self._update_state()

        if self.state == CircuitState.OPEN:
            raise CircuitBreakerError(
                f"Circuit breaker is OPEN for {self.server_id}. "
                f"Next attempt at {self.next_attempt_time}"
            )

        try:
            # Execute function with timeout
            result = await asyncio.wait_for(
                func(*args, **kwargs),
                timeout=self.config.timeout_seconds
            )

            # Success
            await self._on_success()
            return result

        except asyncio.TimeoutError:
            await self._on_failure("Request timeout")
            raise

        except Exception as e:
            await self._on_failure(str(e))
            raise

    async def _update_state(self):
        """Update circuit state based on time and conditions"""
        if self.state == CircuitState.OPEN:
            # Check if recovery timeout has passed
            if self.next_attempt_time and datetime.utcnow() >= self.next_attempt_time:
                self.state = CircuitState.HALF_OPEN
                self.success_count = 0
                await self.save_state()

    async def _on_success(self):
        """Handle successful request"""
        if self.state == CircuitState.HALF_OPEN:
            self.success_count += 1

            # Enough successes to close circuit
            if self.success_count >= self.config.success_threshold:
                self.state = CircuitState.CLOSED
                self.failure_count = 0
                self.success_count = 0
                self.last_failure_time = None
                self.next_attempt_time = None
                await self.save_state()

        elif self.state == CircuitState.CLOSED:
            # Reset failure count on success
            if self.failure_count > 0:
                self.failure_count = 0
                await self.save_state()

    async def _on_failure(self, error: str):
        """Handle failed request"""
        self.failure_count += 1
        self.last_failure_time = datetime.utcnow()

        # Update server health with error
        result = await self.db.execute(
            select(ServerHealth).where(ServerHealth.server_id == self.server_id)
        )
        health = result.scalar_one_or_none()

        if health:
            health.last_error = error
            health.error_count = self.failure_count

        if self.state == CircuitState.CLOSED:
            # Check if threshold exceeded
            if self.failure_count >= self.config.failure_threshold:
                self.state = CircuitState.OPEN
                self.next_attempt_time = datetime.utcnow() + timedelta(
                    seconds=self.config.recovery_timeout
                )
                await self.save_state()

        elif self.state == CircuitState.HALF_OPEN:
            # Failure in half-open state, reopen circuit
            self.state = CircuitState.OPEN
            self.next_attempt_time = datetime.utcnow() + timedelta(
                seconds=self.config.recovery_timeout
            )
            self.success_count = 0
            await self.save_state()

        await self.db.commit()

    def get_state(self) -> Dict:
        """Get current circuit breaker state"""
        return {
            "state": self.state.value,
            "failure_count": self.failure_count,
            "success_count": self.success_count,
            "last_failure": self.last_failure_time.isoformat() if self.last_failure_time else None,
            "next_attempt": self.next_attempt_time.isoformat() if self.next_attempt_time else None,
        }


class CircuitBreakerManager:
    """Manages circuit breakers for all MCP servers"""

    def __init__(self, db: AsyncSession):
        self.db = db
        self.breakers: Dict[str, CircuitBreaker] = {}

    async def get_breaker(self, server_id: str) -> CircuitBreaker:
        """Get or create circuit breaker for a server"""
        if server_id not in self.breakers:
            breaker = CircuitBreaker(server_id, self.db)
            await breaker.load_state()
            self.breakers[server_id] = breaker

        return self.breakers[server_id]

    async def call_with_breaker(
        self,
        server_id: str,
        func: Callable,
        *args,
        **kwargs
    ) -> Any:
        """Execute function with circuit breaker protection"""
        breaker = await self.get_breaker(server_id)
        return await breaker.call(func, *args, **kwargs)

    async def get_all_states(self) -> Dict[str, Dict]:
        """Get states of all circuit breakers"""
        states = {}
        for server_id, breaker in self.breakers.items():
            states[server_id] = breaker.get_state()
        return states

    async def reset_breaker(self, server_id: str):
        """Manually reset a circuit breaker"""
        breaker = await self.get_breaker(server_id)
        breaker.state = CircuitState.CLOSED
        breaker.failure_count = 0
        breaker.success_count = 0
        breaker.last_failure_time = None
        breaker.next_attempt_time = None
        await breaker.save_state()
