# Sprint 1: MVP with Local Inference
## Refrain Coding API - Get to Production Fast

**Sprint Goal:** Ship a working API with local model inference that Refrain AI IDE can use TODAY.

**Duration:** 2-3 days

**Philosophy:** Ship fast, iterate later. Get the cost savings immediately.

---

## 🎯 Sprint Objectives

By end of Sprint 1, you will have:

1. ✅ FastAPI server running on Fly.io
2. ✅ CodeLlama-7B responding to coding questions
3. ✅ OpenAI-compatible API endpoint
4. ✅ Basic caching with Redis
5. ✅ Usage tracking in database
6. ✅ Integrated with Refrain AI IDE

**Success Metric:** Create a team member in Refrain IDE that uses this API and get a real response.

---

## 📋 Tasks Breakdown

### Task 1.1: Project Setup (1 hour)

**Create project structure:**
```
refrain-coding-api/
├── api/
│   ├── __init__.py
│   ├── main.py              # FastAPI app
│   ├── routes/
│   │   ├── __init__.py
│   │   └── chat.py          # /v1/chat/completions
│   ├── services/
│   │   ├── __init__.py
│   │   └── inference.py     # Model inference logic
│   └── schemas.py           # Pydantic models
├── utils/
│   ├── __init__.py
│   ├── cache.py             # Redis caching
│   └── database.py          # PostgreSQL connection
├── models/                  # Downloaded GGUF models (gitignored)
├── scripts/
│   └── download_models.py   # Model download script
├── tests/
│   └── test_api.py
├── pyproject.toml
├── Dockerfile
├── fly.toml
├── .env.example
└── README.md
```

**Create `pyproject.toml`:**
```toml
[project]
name = "refrain-coding-api"
version = "0.1.0"
description = "Cost-effective AI coding API using local models"
requires-python = ">=3.11"

dependencies = [
    "fastapi>=0.109.0",
    "uvicorn[standard]>=0.27.0",
    "llama-cpp-python>=0.2.0",
    "redis>=5.0.0",
    "psycopg2-binary>=2.9.0",
    "sqlalchemy>=2.0.0",
    "pydantic>=2.5.0",
    "python-dotenv>=1.0.0",
    "httpx>=0.26.0",
]

[project.optional-dependencies]
dev = [
    "pytest>=7.4.0",
    "pytest-asyncio>=0.21.0",
    "ruff>=0.1.0",
    "mypy>=1.8.0",
]

[build-system]
requires = ["setuptools>=68.0"]
build-backend = "setuptools.build_meta"

[tool.ruff]
line-length = 100
target-version = "py311"

[tool.mypy]
python_version = "3.11"
strict = true
```

**Create `.env.example`:**
```env
# Database (shared with Refrain AI IDE)
DATABASE_URL=postgresql://user:password@host:5432/refrain

# Redis
REDIS_URL=redis://localhost:6379

# API Keys (for future tiers)
TOGETHER_API_KEY=your_key_here
MODAL_API_KEY=your_key_here

# Environment
ENVIRONMENT=development
LOG_LEVEL=INFO

# Model paths
MODEL_DIR=/app/models
```

**Deliverable:** Clean project structure ready for development

---

### Task 1.2: Model Download & Setup (1 hour)

**Create `scripts/download_models.py`:**
```python
#!/usr/bin/env python3
"""Download quantized GGUF models for local inference."""

import os
import sys
from pathlib import Path
from urllib.request import urlretrieve


def download_with_progress(url: str, filename: str) -> None:
    """Download file with progress bar."""
    def progress(block_num, block_size, total_size):
        downloaded = block_num * block_size
        percent = min(downloaded * 100 / total_size, 100)
        sys.stdout.write(f"\r{filename}: {percent:.1f}%")
        sys.stdout.flush()

    print(f"Downloading {filename}...")
    urlretrieve(url, filename, reporthook=progress)
    print(f"\n✓ {filename} downloaded")


def main():
    models_dir = Path("models")
    models_dir.mkdir(exist_ok=True)

    # CodeLlama-7B-Instruct (Q4_K_M quantization = 4.2GB)
    codellama_url = (
        "https://huggingface.co/TheBloke/CodeLlama-7B-Instruct-GGUF/"
        "resolve/main/codellama-7b-instruct.Q4_K_M.gguf"
    )
    codellama_path = models_dir / "codellama-7b-instruct.Q4_K_M.gguf"

    if not codellama_path.exists():
        download_with_progress(codellama_url, str(codellama_path))
    else:
        print(f"✓ {codellama_path.name} already exists")

    print("\n✅ All models downloaded!")
    print(f"Total size: ~4.2GB")


if __name__ == "__main__":
    main()
```

**Run locally to test:**
```bash
cd /mnt/c/Users/Chris/Documents/_DevProjects/refrain-coding-api
python3 scripts/download_models.py
```

**Note:** For Sprint 1, we'll start with just CodeLlama-7B. We can add Phi-3-mini in Sprint 2.

**Deliverable:** CodeLlama-7B model downloaded and ready

---

### Task 1.3: Database Schema (30 minutes)

**Create migration for `api_usage` table:**

Since we're using the existing Refrain AI IDE database, add this table:

```sql
-- Migration: Add api_usage table for Refrain Coding API
-- Add to existing Refrain database

CREATE TABLE IF NOT EXISTS api_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    team_member_id UUID REFERENCES team_members(id) ON DELETE CASCADE,

    -- Request details
    model_tier VARCHAR(20) NOT NULL,  -- 'local', 'medium', 'large'
    model_name VARCHAR(100) NOT NULL,

    -- Token usage
    prompt_tokens INTEGER NOT NULL,
    completion_tokens INTEGER NOT NULL,
    total_tokens INTEGER NOT NULL,

    -- Cost tracking
    cost DECIMAL(10, 6) NOT NULL DEFAULT 0,  -- Cost in USD

    -- Performance
    latency_ms INTEGER NOT NULL,  -- Response time
    cache_hit BOOLEAN DEFAULT FALSE,

    -- User context
    user_skill_level VARCHAR(20),  -- 'beginner', 'intermediate', 'advanced'

    -- Metadata
    created_at TIMESTAMP DEFAULT NOW(),

    -- Indexes for common queries
    INDEX idx_api_usage_project (project_id),
    INDEX idx_api_usage_member (team_member_id),
    INDEX idx_api_usage_created (created_at),
    INDEX idx_api_usage_tier (model_tier)
);
```

**Create `utils/database.py`:**
```python
"""Database utilities for Refrain Coding API."""

import os
from contextlib import asynccontextmanager
from typing import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker


DATABASE_URL = os.getenv("DATABASE_URL", "").replace("postgresql://", "postgresql+asyncpg://")

engine = create_async_engine(DATABASE_URL, echo=False, future=True)
AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


@asynccontextmanager
async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """Get database session."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def log_api_usage(
    db: AsyncSession,
    project_id: str,
    team_member_id: str,
    model_tier: str,
    model_name: str,
    prompt_tokens: int,
    completion_tokens: int,
    cost: float,
    latency_ms: int,
    cache_hit: bool = False,
    user_skill_level: str = "intermediate",
) -> None:
    """Log API usage to database."""
    await db.execute(
        """
        INSERT INTO api_usage (
            project_id, team_member_id, model_tier, model_name,
            prompt_tokens, completion_tokens, total_tokens,
            cost, latency_ms, cache_hit, user_skill_level
        ) VALUES (
            :project_id, :team_member_id, :model_tier, :model_name,
            :prompt_tokens, :completion_tokens, :total_tokens,
            :cost, :latency_ms, :cache_hit, :user_skill_level
        )
        """,
        {
            "project_id": project_id,
            "team_member_id": team_member_id,
            "model_tier": model_tier,
            "model_name": model_name,
            "prompt_tokens": prompt_tokens,
            "completion_tokens": completion_tokens,
            "total_tokens": prompt_tokens + completion_tokens,
            "cost": cost,
            "latency_ms": latency_ms,
            "cache_hit": cache_hit,
            "user_skill_level": user_skill_level,
        },
    )
```

**Deliverable:** Database table ready to track usage

---

### Task 1.4: Local Inference Service (2 hours)

**Create `api/services/inference.py`:**
```python
"""Local model inference using llama.cpp."""

import os
import time
from typing import List, Dict, Any

from llama_cpp import Llama


class LocalInferenceService:
    """Manages local model inference with llama.cpp."""

    def __init__(self):
        """Initialize and load models."""
        model_dir = os.getenv("MODEL_DIR", "models")

        print("Loading CodeLlama-7B... (this takes ~30 seconds)")
        self.codellama = Llama(
            model_path=f"{model_dir}/codellama-7b-instruct.Q4_K_M.gguf",
            n_ctx=8192,  # Context window
            n_threads=4,  # CPU cores
            n_gpu_layers=0,  # CPU-only on Fly.io
            verbose=False,
        )
        print("✓ CodeLlama-7B loaded")

    def generate(
        self,
        messages: List[Dict[str, str]],
        temperature: float = 0.7,
        max_tokens: int = 2048,
    ) -> Dict[str, Any]:
        """
        Generate completion using local model.

        Returns:
            Dict with 'content', 'prompt_tokens', 'completion_tokens'
        """
        start_time = time.time()

        # Use llama-cpp-python's chat completion format
        response = self.codellama.create_chat_completion(
            messages=messages,
            temperature=temperature,
            max_tokens=max_tokens,
            stream=False,
        )

        latency_ms = int((time.time() - start_time) * 1000)

        return {
            "content": response["choices"][0]["message"]["content"],
            "prompt_tokens": response["usage"]["prompt_tokens"],
            "completion_tokens": response["usage"]["completion_tokens"],
            "total_tokens": response["usage"]["total_tokens"],
            "latency_ms": latency_ms,
            "model": "codellama-7b",
        }


# Global instance (loaded once at startup)
local_inference = None


def get_inference_service() -> LocalInferenceService:
    """Get or create inference service singleton."""
    global local_inference
    if local_inference is None:
        local_inference = LocalInferenceService()
    return local_inference
```

**Deliverable:** Working local inference with CodeLlama-7B

---

### Task 1.5: Redis Caching (1 hour)

**Create `utils/cache.py`:**
```python
"""Redis caching for API responses."""

import hashlib
import json
import os
from typing import Optional, Dict, Any

import redis


class CacheService:
    """Redis-based caching for API responses."""

    def __init__(self):
        redis_url = os.getenv("REDIS_URL", "redis://localhost:6379")
        self.redis = redis.from_url(redis_url, decode_responses=True)
        self.ttl = 86400  # 24 hours

    def _generate_key(self, messages: list, model: str, temperature: float) -> str:
        """Generate cache key from request parameters."""
        # Create deterministic hash
        content = json.dumps({
            "messages": messages,
            "model": model,
            "temperature": round(temperature, 2),  # Round to avoid float precision issues
        }, sort_keys=True)

        return f"refrain:cache:{hashlib.sha256(content.encode()).hexdigest()[:16]}"

    def get(self, messages: list, model: str, temperature: float) -> Optional[Dict[str, Any]]:
        """Get cached response if exists."""
        key = self._generate_key(messages, model, temperature)
        cached = self.redis.get(key)

        if cached:
            return json.loads(cached)
        return None

    def set(
        self,
        messages: list,
        model: str,
        temperature: float,
        response: Dict[str, Any]
    ) -> None:
        """Cache response."""
        key = self._generate_key(messages, model, temperature)
        self.redis.setex(
            key,
            self.ttl,
            json.dumps(response)
        )


# Global instance
cache_service = CacheService()
```

**Deliverable:** Caching layer to reduce redundant inference

---

### Task 1.6: API Schemas (30 minutes)

**Create `api/schemas.py`:**
```python
"""Pydantic schemas for API requests and responses."""

from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


class Message(BaseModel):
    """Chat message."""
    role: str = Field(..., pattern="^(system|user|assistant)$")
    content: str


class CompletionRequest(BaseModel):
    """Request to /v1/chat/completions (OpenAI-compatible)."""
    messages: List[Message]
    model: str = "auto"
    temperature: float = Field(default=0.7, ge=0.0, le=2.0)
    max_tokens: int = Field(default=2048, ge=1, le=8192)

    # Refrain-specific extensions
    user_skill_level: Optional[str] = Field(default="intermediate", pattern="^(beginner|intermediate|advanced)$")
    project_context: Optional[Dict[str, Any]] = None


class Usage(BaseModel):
    """Token usage information."""
    prompt_tokens: int
    completion_tokens: int
    total_tokens: int


class Choice(BaseModel):
    """Completion choice."""
    index: int = 0
    message: Message
    finish_reason: str = "stop"


class CompletionResponse(BaseModel):
    """Response from /v1/chat/completions (OpenAI-compatible)."""
    id: str
    object: str = "chat.completion"
    created: int
    model: str
    choices: List[Choice]
    usage: Usage

    # Refrain-specific extensions
    cost: float = Field(..., description="Cost in USD")
    tier: str = Field(..., description="Model tier used")
    latency_ms: int = Field(..., description="Response latency in milliseconds")
```

**Deliverable:** Type-safe request/response models

---

### Task 1.7: Chat Endpoint (1.5 hours)

**Create `api/routes/chat.py`:**
```python
"""Chat completion endpoints."""

import time
import uuid
from typing import Dict, Any

from fastapi import APIRouter, HTTPException, Header

from api.schemas import CompletionRequest, CompletionResponse, Choice, Message, Usage
from api.services.inference import get_inference_service
from utils.cache import cache_service
from utils.database import get_db, log_api_usage


router = APIRouter()


@router.post("/chat/completions", response_model=CompletionResponse)
async def create_chat_completion(
    request: CompletionRequest,
    authorization: str = Header(...),
) -> CompletionResponse:
    """
    Create chat completion (OpenAI-compatible endpoint).

    For Sprint 1: Always uses local CodeLlama-7B model.
    Future sprints will add intelligent routing.
    """

    # Extract project/member IDs from auth header or context
    # For now, use dummy values (will be implemented properly in Sprint 2)
    project_id = request.project_context.get("project_id", "unknown") if request.project_context else "unknown"
    member_id = request.project_context.get("member_id", "unknown") if request.project_context else "unknown"

    # Check cache first
    messages_list = [msg.dict() for msg in request.messages]
    cached_response = cache_service.get(
        messages=messages_list,
        model="codellama-7b",
        temperature=request.temperature,
    )

    if cached_response:
        # Return cached response
        return CompletionResponse(
            id=f"req_{uuid.uuid4().hex[:8]}",
            created=int(time.time()),
            model="codellama-7b",
            choices=[Choice(
                message=Message(
                    role="assistant",
                    content=cached_response["content"]
                )
            )],
            usage=Usage(
                prompt_tokens=cached_response["prompt_tokens"],
                completion_tokens=cached_response["completion_tokens"],
                total_tokens=cached_response["total_tokens"],
            ),
            cost=0.0,  # Local tier is free
            tier="local",
            latency_ms=cached_response.get("latency_ms", 0),
        )

    # Generate new response
    try:
        inference_service = get_inference_service()
        result = inference_service.generate(
            messages=messages_list,
            temperature=request.temperature,
            max_tokens=request.max_tokens,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Inference failed: {str(e)}")

    # Cache the response
    cache_service.set(
        messages=messages_list,
        model="codellama-7b",
        temperature=request.temperature,
        response=result,
    )

    # Log usage to database (async, don't block response)
    try:
        async with get_db() as db:
            await log_api_usage(
                db=db,
                project_id=project_id,
                team_member_id=member_id,
                model_tier="local",
                model_name="codellama-7b",
                prompt_tokens=result["prompt_tokens"],
                completion_tokens=result["completion_tokens"],
                cost=0.0,
                latency_ms=result["latency_ms"],
                cache_hit=False,
                user_skill_level=request.user_skill_level,
            )
    except Exception as e:
        # Log error but don't fail the request
        print(f"Failed to log usage: {e}")

    # Return response
    return CompletionResponse(
        id=f"req_{uuid.uuid4().hex[:8]}",
        created=int(time.time()),
        model="codellama-7b",
        choices=[Choice(
            message=Message(
                role="assistant",
                content=result["content"]
            )
        )],
        usage=Usage(
            prompt_tokens=result["prompt_tokens"],
            completion_tokens=result["completion_tokens"],
            total_tokens=result["total_tokens"],
        ),
        cost=0.0,
        tier="local",
        latency_ms=result["latency_ms"],
    )
```

**Deliverable:** Working chat completion endpoint

---

### Task 1.8: Main FastAPI App (30 minutes)

**Create `api/main.py`:**
```python
"""Main FastAPI application."""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.routes import chat
from api.services.inference import get_inference_service


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Load models on startup."""
    print("🚀 Starting Refrain Coding API...")

    # Load models (blocks until loaded)
    get_inference_service()

    print("✅ Models loaded, ready to serve requests")
    yield
    print("👋 Shutting down...")


app = FastAPI(
    title="Refrain Coding API",
    description="Cost-effective AI coding assistance using local models",
    version="0.1.0",
    lifespan=lifespan,
)

# CORS middleware (allow Refrain frontend)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # TODO: Restrict in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(chat.router, prefix="/v1", tags=["chat"])


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "service": "refrain-coding-api",
        "version": "0.1.0",
    }


@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "message": "Refrain Coding API",
        "docs": "/docs",
        "health": "/health",
    }
```

**Deliverable:** Complete FastAPI application

---

### Task 1.9: Deployment Configuration (1 hour)

**Create `Dockerfile`:**
```dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install dependencies
RUN pip install --no-cache-dir pip --upgrade

COPY pyproject.toml .
RUN pip install --no-cache-dir -e .

# Copy application code
COPY api/ api/
COPY utils/ utils/
COPY scripts/ scripts/

# Download models during build (cached in image)
RUN python3 scripts/download_models.py

# Expose port
EXPOSE 8000

# Run application
CMD ["uvicorn", "api.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1"]
```

**Create `fly.toml`:**
```toml
app = "refrain-coding-api"
primary_region = "iad"

[build]
  dockerfile = "Dockerfile"

[env]
  PORT = "8000"
  MODEL_DIR = "/app/models"
  ENVIRONMENT = "production"
  LOG_LEVEL = "INFO"

[http_service]
  internal_port = 8000
  force_https = true
  auto_stop_machines = false
  auto_start_machines = true
  min_machines_running = 1
  processes = ["app"]

  [[http_service.checks]]
    grace_period = "30s"
    interval = "15s"
    method = "GET"
    timeout = "5s"
    path = "/health"

[[vm]]
  cpu_kind = "shared"
  cpus = 4
  memory_mb = 8192  # 8GB for model in RAM
```

**Deliverable:** Ready to deploy to Fly.io

---

### Task 1.10: Testing & Deployment (1 hour)

**Create `tests/test_api.py`:**
```python
"""API endpoint tests."""

import pytest
from fastapi.testclient import TestClient

from api.main import app


client = TestClient(app)


def test_health_check():
    """Test health check endpoint."""
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"


def test_chat_completion():
    """Test chat completion endpoint."""
    response = client.post(
        "/v1/chat/completions",
        json={
            "messages": [
                {"role": "user", "content": "Write a Python function to add two numbers"}
            ],
            "temperature": 0.7,
        },
        headers={"Authorization": "Bearer test-key"}
    )

    assert response.status_code == 200
    data = response.json()

    assert "choices" in data
    assert len(data["choices"]) > 0
    assert "message" in data["choices"][0]
    assert "content" in data["choices"][0]["message"]
    assert data["tier"] == "local"
    assert data["cost"] == 0.0
```

**Deploy to Fly.io:**
```bash
# Create Fly app
flyctl apps create refrain-coding-api

# Set secrets
flyctl secrets set -a refrain-coding-api \
  DATABASE_URL="postgresql://..." \
  REDIS_URL="redis://..."

# Deploy
flyctl deploy -a refrain-coding-api

# Check status
flyctl status -a refrain-coding-api

# View logs
flyctl logs -a refrain-coding-api
```

**Test production endpoint:**
```bash
curl -X POST https://refrain-coding-api.fly.dev/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer test" \
  -d '{
    "messages": [
      {"role": "user", "content": "Hello, write a function to reverse a string"}
    ]
  }'
```

**Deliverable:** API deployed and working in production

---

## 🔄 Integration with Refrain AI IDE

### Update Frontend Team Member Form

The existing Refrain AI IDE frontend already supports custom API endpoints! Just add this as an option:

**In team member creation form:**
- API Endpoint dropdown: Add "Refrain Coding API (Local)"
- URL: `https://refrain-coding-api.fly.dev/v1/chat/completions`
- Model: `codellama-7b`

That's it! The existing code in `frontend/lib/team-api.ts` already handles the OpenAI-compatible format.

---

## ✅ Sprint 1 Complete Checklist

- [ ] Project structure created
- [ ] CodeLlama-7B downloaded (4.2GB)
- [ ] Database table created
- [ ] Local inference working
- [ ] Redis caching implemented
- [ ] API endpoint returns responses
- [ ] Deployed to Fly.io
- [ ] Health check passing
- [ ] Integration tested with Refrain IDE
- [ ] First real team member using Coding API works!

---

## 📊 Success Metrics

**Performance:**
- Health check: <100ms
- Chat completion (uncached): <3s
- Chat completion (cached): <100ms

**Cost:**
- Infrastructure: ~$25/month (Fly.io)
- Per request: $0.00 (local tier)

**Quality:**
- CodeLlama-7B produces working code
- Responses are helpful and accurate

---

## 🚀 After Sprint 1

Once this is working, you can immediately:
1. Create AI team members in Refrain that use this API
2. Start building projects WITHOUT burning through Claude credits
3. Track actual usage patterns in the database

**Sprint 2 will add:**
- Phi-3-mini for faster responses
- Intelligent routing logic
- Context compression
- Better error handling

**But for now: SHIP IT! 🚀**

---

## 💡 Tips

**Development:**
- Test locally first: `uvicorn api.main:app --reload`
- Model takes ~30s to load on startup (normal)
- First request is slower (model warmup)
- Use Redis Desktop Manager to inspect cache

**Debugging:**
- Check Fly.io logs: `flyctl logs -a refrain-coding-api`
- Check health: `curl https://refrain-coding-api.fly.dev/health`
- Model not loading? Check RAM usage (needs 8GB)

**Cost Optimization:**
- Cache hit rate should be >30% within a few days
- Monitor with: `SELECT COUNT(*) FROM api_usage WHERE cache_hit = true`

---

*Sprint 1 is about proving the concept and getting immediate value. Polish comes later!*
