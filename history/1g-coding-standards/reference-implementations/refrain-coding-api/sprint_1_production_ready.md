# Sprint 1: Production-Ready API with Local Inference
## Refrain Coding API - No Shortcuts, Built Right

**Sprint Goal:** Build a production-grade API with local model inference, proper auth, monitoring, error handling, and security.

**Duration:** 4-5 days (no rushing, build it right)

**Philosophy:** Production-ready from day one. Authentication, logging, monitoring, error handling, security, tests - everything a real API needs.

---

## 🎯 Sprint Objectives

By end of Sprint 1, you will have:

1. ✅ FastAPI server with proper authentication
2. ✅ CodeLlama-7B inference with error handling
3. ✅ Redis caching with TTL and invalidation
4. ✅ PostgreSQL usage tracking with proper indexing
5. ✅ Rate limiting per user
6. ✅ Structured logging with correlation IDs
7. ✅ Prometheus metrics for monitoring
8. ✅ Comprehensive error handling
9. ✅ Security headers and CORS
10. ✅ Full test coverage
11. ✅ Deployed to Fly.io with health checks
12. ✅ Integrated with Refrain AI IDE

**Success Metric:** Production-grade API that can handle real traffic with proper observability and security.

---

## 📐 Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│              Refrain AI IDE Frontend                    │
│         (Team Members use this API endpoint)            │
└──────────────────────┬──────────────────────────────────┘
                       │
                       │ HTTPS with API Key
                       │
┌──────────────────────▼──────────────────────────────────┐
│                  API Gateway (FastAPI)                  │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐             │
│  │  Auth    │→ │  Rate    │→ │ Request  │             │
│  │Middleware│  │ Limiter  │  │ Logger   │             │
│  └──────────┘  └──────────┘  └──────────┘             │
└──────────────────────┬──────────────────────────────────┘
                       │
          ┌────────────┼────────────┐
          │            │            │
          ▼            ▼            ▼
    ┌─────────┐  ┌─────────┐  ┌──────────┐
    │  Redis  │  │  Local  │  │PostgreSQL│
    │  Cache  │  │Inference│  │ Usage DB │
    └─────────┘  └─────────┘  └──────────┘
                      │
                      ▼
              ┌───────────────┐
              │ CodeLlama-7B  │
              │  (llama.cpp)  │
              └───────────────┘
```

---

## 📋 Task Breakdown

### Task 1.1: Project Foundation (2 hours)

**1.1.1: Directory Structure**
```
refrain-coding-api/
├── api/
│   ├── __init__.py
│   ├── main.py                    # FastAPI app with lifespan
│   ├── config.py                  # Configuration management
│   ├── dependencies.py            # FastAPI dependencies
│   ├── middleware/
│   │   ├── __init__.py
│   │   ├── auth.py                # API key authentication
│   │   ├── rate_limit.py          # Rate limiting
│   │   ├── logging.py             # Request/response logging
│   │   └── cors.py                # CORS configuration
│   ├── routes/
│   │   ├── __init__.py
│   │   ├── health.py              # Health check endpoints
│   │   ├── chat.py                # Chat completions
│   │   └── metrics.py             # Prometheus metrics
│   ├── services/
│   │   ├── __init__.py
│   │   ├── inference.py           # Local model inference
│   │   ├── cache.py               # Redis caching service
│   │   └── usage.py               # Usage tracking service
│   ├── schemas/
│   │   ├── __init__.py
│   │   ├── requests.py            # Request models
│   │   ├── responses.py           # Response models
│   │   └── errors.py              # Error models
│   └── exceptions.py              # Custom exceptions
├── utils/
│   ├── __init__.py
│   ├── database.py                # Database connection & models
│   ├── logger.py                  # Structured logging setup
│   ├── metrics.py                 # Prometheus metrics
│   └── security.py                # Security utilities
├── migrations/
│   └── 001_initial_schema.sql     # Database migrations
├── models/                        # GGUF models (gitignored)
├── scripts/
│   ├── download_models.py         # Model download
│   ├── create_api_key.py          # Generate API keys
│   └── run_migrations.py          # Run database migrations
├── tests/
│   ├── __init__.py
│   ├── conftest.py                # Pytest fixtures
│   ├── test_auth.py               # Authentication tests
│   ├── test_chat.py               # Chat endpoint tests
│   ├── test_cache.py              # Cache tests
│   └── test_rate_limit.py         # Rate limiting tests
├── .env.example
├── .gitignore
├── pyproject.toml
├── Dockerfile
├── fly.toml
└── README.md
```

**1.1.2: `pyproject.toml`**
```toml
[project]
name = "refrain-coding-api"
version = "0.1.0"
description = "Production-grade cost-effective AI coding API"
requires-python = ">=3.11"

dependencies = [
    # Core
    "fastapi>=0.109.0",
    "uvicorn[standard]>=0.27.0",
    "pydantic>=2.5.0",
    "pydantic-settings>=2.1.0",

    # Model inference
    "llama-cpp-python>=0.2.0",

    # Database
    "asyncpg>=0.29.0",
    "sqlalchemy>=2.0.0",
    "alembic>=1.13.0",

    # Caching
    "redis>=5.0.0",

    # Security
    "python-jose[cryptography]>=3.3.0",
    "passlib>=1.7.4",
    "python-multipart>=0.0.6",

    # Monitoring
    "prometheus-client>=0.19.0",
    "sentry-sdk[fastapi]>=1.40.0",

    # Utilities
    "python-dotenv>=1.0.0",
    "httpx>=0.26.0",
    "tenacity>=8.2.0",  # Retry logic
]

[project.optional-dependencies]
dev = [
    "pytest>=7.4.0",
    "pytest-asyncio>=0.21.0",
    "pytest-cov>=4.1.0",
    "pytest-mock>=3.12.0",
    "httpx>=0.26.0",  # For TestClient
    "ruff>=0.1.0",
    "mypy>=1.8.0",
    "types-redis>=4.6.0",
]

[build-system]
requires = ["setuptools>=68.0"]
build-backend = "setuptools.build_meta"

[tool.ruff]
line-length = 100
target-version = "py311"
select = [
    "E",  # pycodestyle errors
    "W",  # pycodestyle warnings
    "F",  # pyflakes
    "I",  # isort
    "B",  # flake8-bugbear
    "C4",  # flake8-comprehensions
    "UP",  # pyupgrade
]

[tool.mypy]
python_version = "3.11"
strict = true
warn_return_any = true
warn_unused_configs = true
disallow_untyped_defs = true

[tool.pytest.ini_options]
asyncio_mode = "auto"
testpaths = ["tests"]
python_files = ["test_*.py"]
python_classes = ["Test*"]
python_functions = ["test_*"]
```

**1.1.3: `.env.example`**
```env
# Environment
ENVIRONMENT=development
DEBUG=false
LOG_LEVEL=INFO

# API Configuration
API_TITLE="Refrain Coding API"
API_VERSION=0.1.0
API_HOST=0.0.0.0
API_PORT=8000

# Database (uses Refrain AI IDE database)
DATABASE_URL=postgresql+asyncpg://user:password@host:5432/refrain

# Redis
REDIS_URL=redis://localhost:6379/0
REDIS_TTL=86400  # 24 hours

# Model Configuration
MODEL_DIR=./models
CODELLAMA_MODEL=codellama-7b-instruct.Q4_K_M.gguf
MODEL_CONTEXT_SIZE=8192
MODEL_THREADS=4

# Rate Limiting
RATE_LIMIT_REQUESTS=100  # requests per hour per user
RATE_LIMIT_WINDOW=3600   # 1 hour in seconds

# Security
API_KEY_HEADER=X-API-Key
CORS_ORIGINS=https://refrain-web.fly.dev,http://localhost:3000

# Monitoring
SENTRY_DSN=  # Optional
PROMETHEUS_PORT=9090

# Future tier API keys (not used in Sprint 1)
TOGETHER_API_KEY=
MODAL_API_KEY=
```

**1.1.4: `.gitignore`**
```
# Python
__pycache__/
*.py[cod]
*$py.class
*.so
.Python
venv/
env/
.venv

# Models (too large for git)
models/*.gguf
models/*.bin

# Environment
.env
.env.local

# IDE
.vscode/
.idea/
*.swp
*.swo

# Testing
.pytest_cache/
.coverage
htmlcov/

# Build
dist/
build/
*.egg-info/
```

**Deliverable:** Complete project structure with all configuration files

---

### Task 1.2: Configuration Management (1 hour)

**Create `api/config.py`:**
```python
"""Application configuration using Pydantic Settings."""

from functools import lru_cache
from typing import List

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )

    # Environment
    environment: str = Field(default="development")
    debug: bool = Field(default=False)
    log_level: str = Field(default="INFO")

    # API Configuration
    api_title: str = Field(default="Refrain Coding API")
    api_version: str = Field(default="0.1.0")
    api_host: str = Field(default="0.0.0.0")
    api_port: int = Field(default=8000)

    # Database
    database_url: str = Field(..., description="PostgreSQL connection string")

    # Redis
    redis_url: str = Field(default="redis://localhost:6379/0")
    redis_ttl: int = Field(default=86400)  # 24 hours

    # Model Configuration
    model_dir: str = Field(default="./models")
    codellama_model: str = Field(default="codellama-7b-instruct.Q4_K_M.gguf")
    model_context_size: int = Field(default=8192)
    model_threads: int = Field(default=4)

    # Rate Limiting
    rate_limit_requests: int = Field(default=100)
    rate_limit_window: int = Field(default=3600)

    # Security
    api_key_header: str = Field(default="X-API-Key")
    cors_origins: List[str] = Field(
        default=["https://refrain-web.fly.dev", "http://localhost:3000"]
    )

    @field_validator("cors_origins", mode="before")
    @classmethod
    def parse_cors_origins(cls, v: str | List[str]) -> List[str]:
        """Parse CORS origins from comma-separated string or list."""
        if isinstance(v, str):
            return [origin.strip() for origin in v.split(",")]
        return v

    # Monitoring
    sentry_dsn: str | None = Field(default=None)
    prometheus_port: int = Field(default=9090)

    # Future tier API keys
    together_api_key: str | None = Field(default=None)
    modal_api_key: str | None = Field(default=None)

    @property
    def is_production(self) -> bool:
        """Check if running in production."""
        return self.environment == "production"

    @property
    def model_path(self) -> str:
        """Full path to CodeLlama model."""
        return f"{self.model_dir}/{self.codellama_model}"


@lru_cache
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()
```

**Deliverable:** Type-safe configuration management

---

### Task 1.3: Database Setup (2 hours)

**Create `migrations/001_initial_schema.sql`:**
```sql
-- Migration: Initial schema for Refrain Coding API
-- Requires existing Refrain AI IDE database with projects and team_members tables

-- API Keys table (for authentication)
CREATE TABLE IF NOT EXISTS api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,  -- References users table from Refrain AI IDE
    key_hash VARCHAR(255) NOT NULL UNIQUE,  -- Bcrypt hash of API key
    key_prefix VARCHAR(8) NOT NULL,  -- First 8 chars (for identification)
    name VARCHAR(100),  -- Human-readable name
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    last_used_at TIMESTAMP,
    expires_at TIMESTAMP,  -- Optional expiration

    -- Indexes
    INDEX idx_api_keys_user (user_id),
    INDEX idx_api_keys_hash (key_hash),
    INDEX idx_api_keys_active (is_active)
);

-- API Usage tracking
CREATE TABLE IF NOT EXISTS api_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    team_member_id UUID REFERENCES team_members(id) ON DELETE CASCADE,

    -- Request details
    request_id VARCHAR(50) NOT NULL UNIQUE,  -- For correlation
    model_tier VARCHAR(20) NOT NULL,  -- 'local', 'medium', 'large'
    model_name VARCHAR(100) NOT NULL,

    -- Token usage
    prompt_tokens INTEGER NOT NULL,
    completion_tokens INTEGER NOT NULL,
    total_tokens INTEGER NOT NULL,

    -- Cost tracking
    cost DECIMAL(10, 6) NOT NULL DEFAULT 0,

    -- Performance
    latency_ms INTEGER NOT NULL,
    cache_hit BOOLEAN DEFAULT FALSE,

    -- User context
    user_skill_level VARCHAR(20),

    -- Error tracking
    error_type VARCHAR(100),
    error_message TEXT,

    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),

    -- Indexes for common queries
    INDEX idx_api_usage_user (user_id),
    INDEX idx_api_usage_project (project_id),
    INDEX idx_api_usage_member (team_member_id),
    INDEX idx_api_usage_created (created_at),
    INDEX idx_api_usage_tier (model_tier),
    INDEX idx_api_usage_request_id (request_id)
);

-- Rate limiting (track requests per user per window)
CREATE TABLE IF NOT EXISTS rate_limit_tracker (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    window_start TIMESTAMP NOT NULL,
    window_end TIMESTAMP NOT NULL,
    request_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),

    -- Unique constraint: one row per user per window
    UNIQUE (user_id, window_start),

    -- Index for cleanup
    INDEX idx_rate_limit_window_end (window_end)
);

-- Comments for documentation
COMMENT ON TABLE api_keys IS 'API keys for authenticating requests to Refrain Coding API';
COMMENT ON TABLE api_usage IS 'Usage tracking for all API requests';
COMMENT ON TABLE rate_limit_tracker IS 'Track request counts for rate limiting';
```

**Create `utils/database.py`:**
```python
"""Database utilities and models."""

import uuid
from contextlib import asynccontextmanager
from datetime import datetime
from typing import AsyncGenerator, Optional

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker

from api.config import get_settings


settings = get_settings()

# Create async engine
engine = create_async_engine(
    settings.database_url,
    echo=settings.debug,
    pool_pre_ping=True,  # Verify connections before using
    pool_size=10,
    max_overflow=20,
)

# Session factory
AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)


@asynccontextmanager
async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """Get database session with automatic cleanup."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def verify_api_key(key_hash: str) -> Optional[dict]:
    """
    Verify API key and return user info.

    Returns:
        dict with user_id, is_active, etc. or None if invalid
    """
    async with get_db() as db:
        result = await db.execute(
            text("""
                SELECT id, user_id, is_active, expires_at
                FROM api_keys
                WHERE key_hash = :key_hash
            """),
            {"key_hash": key_hash}
        )
        row = result.fetchone()

        if not row:
            return None

        # Check if expired
        if row.expires_at and row.expires_at < datetime.utcnow():
            return None

        # Check if active
        if not row.is_active:
            return None

        # Update last used timestamp
        await db.execute(
            text("""
                UPDATE api_keys
                SET last_used_at = NOW()
                WHERE id = :id
            """),
            {"id": row.id}
        )

        return {
            "id": row.id,
            "user_id": str(row.user_id),
            "is_active": row.is_active,
        }


async def log_api_usage(
    db: AsyncSession,
    user_id: str,
    request_id: str,
    project_id: Optional[str],
    team_member_id: Optional[str],
    model_tier: str,
    model_name: str,
    prompt_tokens: int,
    completion_tokens: int,
    cost: float,
    latency_ms: int,
    cache_hit: bool = False,
    user_skill_level: str = "intermediate",
    error_type: Optional[str] = None,
    error_message: Optional[str] = None,
) -> None:
    """Log API usage to database."""
    await db.execute(
        text("""
            INSERT INTO api_usage (
                user_id, request_id, project_id, team_member_id,
                model_tier, model_name,
                prompt_tokens, completion_tokens, total_tokens,
                cost, latency_ms, cache_hit, user_skill_level,
                error_type, error_message
            ) VALUES (
                :user_id, :request_id, :project_id, :team_member_id,
                :model_tier, :model_name,
                :prompt_tokens, :completion_tokens, :total_tokens,
                :cost, :latency_ms, :cache_hit, :user_skill_level,
                :error_type, :error_message
            )
        """),
        {
            "user_id": uuid.UUID(user_id) if user_id else None,
            "request_id": request_id,
            "project_id": uuid.UUID(project_id) if project_id else None,
            "team_member_id": uuid.UUID(team_member_id) if team_member_id else None,
            "model_tier": model_tier,
            "model_name": model_name,
            "prompt_tokens": prompt_tokens,
            "completion_tokens": completion_tokens,
            "total_tokens": prompt_tokens + completion_tokens,
            "cost": cost,
            "latency_ms": latency_ms,
            "cache_hit": cache_hit,
            "user_skill_level": user_skill_level,
            "error_type": error_type,
            "error_message": error_message,
        },
    )


async def check_rate_limit(db: AsyncSession, user_id: str) -> tuple[bool, int]:
    """
    Check if user has exceeded rate limit.

    Returns:
        (is_allowed, remaining_requests)
    """
    settings = get_settings()

    # Get current window
    result = await db.execute(
        text("""
            SELECT request_count
            FROM rate_limit_tracker
            WHERE user_id = :user_id
              AND window_end > NOW()
            ORDER BY window_start DESC
            LIMIT 1
        """),
        {"user_id": uuid.UUID(user_id)}
    )
    row = result.fetchone()

    if row:
        current_count = row.request_count
        remaining = max(0, settings.rate_limit_requests - current_count)
        is_allowed = current_count < settings.rate_limit_requests
        return (is_allowed, remaining)

    # No active window, user is allowed
    return (True, settings.rate_limit_requests)


async def increment_rate_limit(db: AsyncSession, user_id: str) -> None:
    """Increment rate limit counter for user."""
    settings = get_settings()

    await db.execute(
        text("""
            INSERT INTO rate_limit_tracker (user_id, window_start, window_end, request_count)
            VALUES (
                :user_id,
                NOW(),
                NOW() + INTERVAL ':window seconds',
                1
            )
            ON CONFLICT (user_id, window_start)
            DO UPDATE SET
                request_count = rate_limit_tracker.request_count + 1,
                updated_at = NOW()
        """),
        {
            "user_id": uuid.UUID(user_id),
            "window": settings.rate_limit_window
        }
    )


async def cleanup_old_rate_limits(db: AsyncSession) -> None:
    """Clean up expired rate limit windows (run periodically)."""
    await db.execute(
        text("""
            DELETE FROM rate_limit_tracker
            WHERE window_end < NOW() - INTERVAL '1 day'
        """)
    )
```

**Create `scripts/run_migrations.py`:**
```python
#!/usr/bin/env python3
"""Run database migrations."""

import asyncio
import sys
from pathlib import Path

from sqlalchemy import text

from utils.database import get_db


async def run_migrations() -> None:
    """Run all SQL migrations in order."""
    migrations_dir = Path("migrations")
    migration_files = sorted(migrations_dir.glob("*.sql"))

    if not migration_files:
        print("No migration files found")
        return

    async with get_db() as db:
        for migration_file in migration_files:
            print(f"Running migration: {migration_file.name}")

            sql = migration_file.read_text()

            try:
                await db.execute(text(sql))
                print(f"✓ {migration_file.name} completed")
            except Exception as e:
                print(f"✗ {migration_file.name} failed: {e}")
                sys.exit(1)

    print("\n✅ All migrations completed successfully")


if __name__ == "__main__":
    asyncio.run(run_migrations())
```

**Create `scripts/create_api_key.py`:**
```python
#!/usr/bin/env python3
"""Generate API key for a user."""

import asyncio
import secrets
import sys
import uuid
from datetime import datetime, timedelta

from passlib.hash import bcrypt
from sqlalchemy import text

from utils.database import get_db


async def create_api_key(
    user_id: str,
    name: str = "Default Key",
    expires_days: int | None = None
) -> str:
    """
    Create a new API key for a user.

    Returns:
        The generated API key (only shown once!)
    """
    # Generate secure random key
    api_key = f"sk-{secrets.token_urlsafe(32)}"
    key_prefix = api_key[:8]
    key_hash = bcrypt.hash(api_key)

    expires_at = None
    if expires_days:
        expires_at = datetime.utcnow() + timedelta(days=expires_days)

    async with get_db() as db:
        # Verify user exists
        result = await db.execute(
            text("SELECT id FROM users WHERE id = :user_id"),
            {"user_id": uuid.UUID(user_id)}
        )
        if not result.fetchone():
            print(f"Error: User {user_id} not found")
            sys.exit(1)

        # Insert API key
        await db.execute(
            text("""
                INSERT INTO api_keys (user_id, key_hash, key_prefix, name, expires_at)
                VALUES (:user_id, :key_hash, :key_prefix, :name, :expires_at)
            """),
            {
                "user_id": uuid.UUID(user_id),
                "key_hash": key_hash,
                "key_prefix": key_prefix,
                "name": name,
                "expires_at": expires_at,
            }
        )

    return api_key


async def main():
    """CLI for creating API keys."""
    if len(sys.argv) < 2:
        print("Usage: python create_api_key.py <user_id> [name] [expires_days]")
        print("\nExample:")
        print("  python create_api_key.py 123e4567-e89b-12d3-a456-426614174000 'Dev Key' 90")
        sys.exit(1)

    user_id = sys.argv[1]
    name = sys.argv[2] if len(sys.argv) > 2 else "Default Key"
    expires_days = int(sys.argv[3]) if len(sys.argv) > 3 else None

    api_key = await create_api_key(user_id, name, expires_days)

    print("\n" + "="*60)
    print("🔑 API Key Created Successfully")
    print("="*60)
    print(f"\nAPI Key: {api_key}")
    print(f"User ID: {user_id}")
    print(f"Name: {name}")
    if expires_days:
        print(f"Expires: {expires_days} days")
    print("\n⚠️  IMPORTANT: Save this key now - you won't see it again!")
    print("="*60 + "\n")


if __name__ == "__main__":
    asyncio.run(main())
```

**Deliverable:** Production-ready database schema with migrations and API key management

---

### Task 1.4: Structured Logging (1 hour)

**Create `utils/logger.py`:**
```python
"""Structured logging configuration."""

import logging
import sys
from typing import Any

from api.config import get_settings


class StructuredFormatter(logging.Formatter):
    """JSON-like structured logging formatter."""

    def format(self, record: logging.LogRecord) -> str:
        """Format log record as structured JSON."""
        log_data = {
            "timestamp": self.formatTime(record, self.datefmt),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
        }

        # Add correlation ID if present
        if hasattr(record, "request_id"):
            log_data["request_id"] = record.request_id

        # Add user ID if present
        if hasattr(record, "user_id"):
            log_data["user_id"] = record.user_id

        # Add exception info if present
        if record.exc_info:
            log_data["exception"] = self.formatException(record.exc_info)

        # Add extra fields
        for key, value in record.__dict__.items():
            if key not in [
                "name", "msg", "args", "created", "filename", "funcName",
                "levelname", "levelno", "lineno", "module", "msecs",
                "message", "pathname", "process", "processName",
                "relativeCreated", "thread", "threadName", "exc_info",
                "exc_text", "stack_info", "request_id", "user_id"
            ]:
                log_data[key] = value

        # Format as key=value pairs
        parts = [f"{k}={v}" for k, v in log_data.items()]
        return " ".join(parts)


def setup_logging() -> None:
    """Set up application logging."""
    settings = get_settings()

    # Create handler
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(StructuredFormatter())

    # Configure root logger
    root_logger = logging.getLogger()
    root_logger.setLevel(getattr(logging, settings.log_level.upper()))
    root_logger.addHandler(handler)

    # Reduce noise from libraries
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
    logging.getLogger("httpx").setLevel(logging.WARNING)


def get_logger(name: str) -> logging.Logger:
    """Get logger with name."""
    return logging.getLogger(name)
```

**Deliverable:** Structured logging for production debugging

---

### Task 1.5: Authentication Middleware (2 hours)

**Create `api/middleware/auth.py`:**
```python
"""API key authentication middleware."""

import logging
from typing import Optional

from fastapi import HTTPException, Security, status
from fastapi.security import APIKeyHeader
from passlib.hash import bcrypt

from api.config import get_settings
from utils.database import verify_api_key


settings = get_settings()
logger = logging.getLogger(__name__)

# API key header scheme
api_key_header = APIKeyHeader(
    name=settings.api_key_header,
    auto_error=False
)


async def get_current_user(
    api_key: Optional[str] = Security(api_key_header)
) -> dict:
    """
    Validate API key and return user info.

    Raises:
        HTTPException: If API key is invalid or missing

    Returns:
        dict with user_id and other user info
    """
    if not api_key:
        logger.warning("Missing API key in request")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing API key",
            headers={"WWW-Authenticate": f"{settings.api_key_header}"},
        )

    # Hash the provided key
    # Note: In production, you'd hash the key and compare hashes
    # For now, we'll do a simple database lookup
    try:
        key_hash = bcrypt.hash(api_key)
        user_info = await verify_api_key(key_hash)
    except Exception as e:
        logger.error(f"Error verifying API key: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Authentication error"
        )

    if not user_info:
        logger.warning("Invalid API key provided")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid API key",
        )

    logger.info(f"Authenticated user: {user_info['user_id']}")
    return user_info
```

**Create `api/middleware/rate_limit.py`:**
```python
"""Rate limiting middleware."""

import logging

from fastapi import HTTPException, status

from utils.database import get_db, check_rate_limit, increment_rate_limit


logger = logging.getLogger(__name__)


async def enforce_rate_limit(user_id: str) -> None:
    """
    Enforce rate limiting for user.

    Raises:
        HTTPException: If rate limit exceeded
    """
    async with get_db() as db:
        # Check limit
        is_allowed, remaining = await check_rate_limit(db, user_id)

        if not is_allowed:
            logger.warning(f"Rate limit exceeded for user {user_id}")
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Rate limit exceeded",
                headers={
                    "X-RateLimit-Remaining": "0",
                    "Retry-After": "3600",  # 1 hour
                },
            )

        # Increment counter
        await increment_rate_limit(db, user_id)

        logger.debug(f"Rate limit check passed for user {user_id}, remaining: {remaining - 1}")
```

**Create `api/middleware/logging.py`:**
```python
"""Request/response logging middleware."""

import logging
import time
import uuid
from typing import Callable

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware


logger = logging.getLogger(__name__)


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    """Log all requests and responses with correlation IDs."""

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """Process request with logging."""
        # Generate correlation ID
        request_id = str(uuid.uuid4())
        request.state.request_id = request_id

        # Log request
        logger.info(
            f"Request started",
            extra={
                "request_id": request_id,
                "method": request.method,
                "path": request.url.path,
                "client_ip": request.client.host if request.client else None,
            }
        )

        # Time the request
        start_time = time.time()

        # Process request
        try:
            response = await call_next(request)
        except Exception as e:
            duration_ms = int((time.time() - start_time) * 1000)
            logger.error(
                f"Request failed",
                extra={
                    "request_id": request_id,
                    "duration_ms": duration_ms,
                    "error": str(e),
                },
                exc_info=True
            )
            raise

        # Log response
        duration_ms = int((time.time() - start_time) * 1000)
        logger.info(
            f"Request completed",
            extra={
                "request_id": request_id,
                "status_code": response.status_code,
                "duration_ms": duration_ms,
            }
        )

        # Add correlation ID to response headers
        response.headers["X-Request-ID"] = request_id

        return response
```

**Deliverable:** Production-grade authentication and rate limiting

---

I'll continue with the remaining tasks in the next message to keep this organized. Should I continue with the complete production-ready Sprint 1 plan?