# Sprint 1 Part 2: Core Implementation
## Production-Ready Services and Deployment

**Continues from:** `sprint_1_production_ready.md`

This document covers the remaining implementation tasks for Sprint 1.

---

## Task 1.6: Model Inference Service (3 hours)

**Create `scripts/download_models.py`:**
```python
#!/usr/bin/env python3
"""Download GGUF models with verification."""

import hashlib
import sys
from pathlib import Path
from urllib.request import urlretrieve


# Model configurations
MODELS = {
    "codellama-7b": {
        "url": "https://huggingface.co/TheBloke/CodeLlama-7B-Instruct-GGUF/resolve/main/codellama-7b-instruct.Q4_K_M.gguf",
        "filename": "codellama-7b-instruct.Q4_K_M.gguf",
        "size_gb": 4.2,
        "sha256": None,  # Add after first download for verification
    }
}


def download_with_progress(url: str, filepath: Path) -> None:
    """Download file with progress bar."""
    def progress(block_num, block_size, total_size):
        downloaded = block_num * block_size
        percent = min(downloaded * 100 / total_size, 100)
        mb_downloaded = downloaded / (1024 * 1024)
        mb_total = total_size / (1024 * 1024)
        sys.stdout.write(
            f"\r{filepath.name}: {mb_downloaded:.1f}MB / {mb_total:.1f}MB ({percent:.1f}%)"
        )
        sys.stdout.flush()

    print(f"Downloading {filepath.name}...")
    urlretrieve(url, filepath, reporthook=progress)
    print()  # New line after progress


def verify_file(filepath: Path, expected_hash: str | None) -> bool:
    """Verify file integrity with SHA256."""
    if not expected_hash:
        print(f"⚠️  No checksum available for {filepath.name}, skipping verification")
        return True

    print(f"Verifying {filepath.name}...")
    sha256 = hashlib.sha256()

    with open(filepath, "rb") as f:
        while chunk := f.read(8192):
            sha256.update(chunk)

    actual_hash = sha256.hexdigest()

    if actual_hash == expected_hash:
        print(f"✓ {filepath.name} verified")
        return True
    else:
        print(f"✗ {filepath.name} checksum mismatch!")
        print(f"  Expected: {expected_hash}")
        print(f"  Got:      {actual_hash}")
        return False


def main():
    """Download all models."""
    models_dir = Path("models")
    models_dir.mkdir(exist_ok=True)

    for model_name, config in MODELS.items():
        filepath = models_dir / config["filename"]

        if filepath.exists():
            print(f"✓ {filepath.name} already exists")

            # Verify existing file
            if config["sha256"]:
                if not verify_file(filepath, config["sha256"]):
                    print(f"Re-downloading {filepath.name} due to checksum mismatch...")
                    filepath.unlink()
                else:
                    continue
            else:
                continue

        # Download
        try:
            download_with_progress(config["url"], filepath)
            verify_file(filepath, config["sha256"])
        except Exception as e:
            print(f"\n✗ Failed to download {filepath.name}: {e}")
            if filepath.exists():
                filepath.unlink()
            sys.exit(1)

    print("\n✅ All models downloaded successfully!")
    print(f"Total size: ~{sum(m['size_gb'] for m in MODELS.values()):.1f}GB")


if __name__ == "__main__":
    main()
```

**Create `api/services/inference.py`:**
```python
"""Local model inference service with proper error handling."""

import logging
import time
from pathlib import Path
from typing import Any, Dict, List

from llama_cpp import Llama
from tenacity import retry, stop_after_attempt, wait_exponential

from api.config import get_settings
from api.exceptions import ModelLoadError, InferenceError


logger = logging.getLogger(__name__)
settings = get_settings()


class LocalInferenceService:
    """
    Manages local model inference with llama.cpp.

    Features:
    - Lazy loading with singleton pattern
    - Automatic retry on transient failures
    - Comprehensive error handling
    - Performance monitoring
    """

    def __init__(self):
        """Initialize service (models loaded on first use)."""
        self._codellama: Llama | None = None
        self._model_loaded = False

    def _load_model(self) -> None:
        """Load CodeLlama model into memory."""
        if self._model_loaded:
            return

        model_path = Path(settings.model_path)

        if not model_path.exists():
            raise ModelLoadError(
                f"Model file not found: {model_path}. "
                "Run scripts/download_models.py first."
            )

        logger.info(f"Loading CodeLlama-7B from {model_path}")
        start_time = time.time()

        try:
            self._codellama = Llama(
                model_path=str(model_path),
                n_ctx=settings.model_context_size,
                n_threads=settings.model_threads,
                n_gpu_layers=0,  # CPU-only for Fly.io
                verbose=False,
                logits_all=False,  # Save memory
                use_mmap=True,  # Memory-mapped file for efficiency
                use_mlock=False,  # Don't lock pages in RAM
            )
        except Exception as e:
            logger.error(f"Failed to load model: {e}", exc_info=True)
            raise ModelLoadError(f"Failed to load model: {e}") from e

        load_time = time.time() - start_time
        logger.info(f"✓ CodeLlama-7B loaded in {load_time:.1f}s")
        self._model_loaded = True

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=10),
        reraise=True,
    )
    def generate(
        self,
        messages: List[Dict[str, str]],
        temperature: float = 0.7,
        max_tokens: int = 2048,
    ) -> Dict[str, Any]:
        """
        Generate completion using local model.

        Args:
            messages: Chat messages in OpenAI format
            temperature: Sampling temperature (0.0-2.0)
            max_tokens: Maximum tokens to generate

        Returns:
            Dict with content, tokens, latency, etc.

        Raises:
            InferenceError: If generation fails
        """
        # Ensure model is loaded
        if not self._model_loaded:
            self._load_model()

        assert self._codellama is not None  # For type checker

        # Validate inputs
        if not messages:
            raise InferenceError("Messages list cannot be empty")

        if temperature < 0 or temperature > 2:
            raise InferenceError(f"Invalid temperature: {temperature}")

        if max_tokens < 1 or max_tokens > settings.model_context_size:
            raise InferenceError(f"Invalid max_tokens: {max_tokens}")

        # Generate
        logger.debug(f"Generating completion with {len(messages)} messages")
        start_time = time.time()

        try:
            response = self._codellama.create_chat_completion(
                messages=messages,
                temperature=temperature,
                max_tokens=max_tokens,
                stream=False,
                top_p=0.95,  # Nucleus sampling
                top_k=40,    # Top-k sampling
                repeat_penalty=1.1,  # Reduce repetition
            )
        except Exception as e:
            logger.error(f"Inference failed: {e}", exc_info=True)
            raise InferenceError(f"Model inference failed: {e}") from e

        latency_ms = int((time.time() - start_time) * 1000)

        # Extract response
        try:
            content = response["choices"][0]["message"]["content"]
            usage = response["usage"]
        except (KeyError, IndexError) as e:
            logger.error(f"Invalid response format: {e}")
            raise InferenceError(f"Invalid model response: {e}") from e

        logger.info(
            f"Generated {usage['completion_tokens']} tokens in {latency_ms}ms "
            f"({usage['completion_tokens'] * 1000 / latency_ms:.1f} tokens/sec)"
        )

        return {
            "content": content,
            "prompt_tokens": usage["prompt_tokens"],
            "completion_tokens": usage["completion_tokens"],
            "total_tokens": usage["total_tokens"],
            "latency_ms": latency_ms,
            "model": "codellama-7b",
        }

    def get_stats(self) -> Dict[str, Any]:
        """Get model statistics."""
        return {
            "model_loaded": self._model_loaded,
            "model_name": "codellama-7b",
            "context_size": settings.model_context_size,
            "threads": settings.model_threads,
        }


# Global singleton instance
_inference_service: LocalInferenceService | None = None


def get_inference_service() -> LocalInferenceService:
    """Get or create inference service singleton."""
    global _inference_service
    if _inference_service is None:
        _inference_service = LocalInferenceService()
    return _inference_service
```

**Create `api/exceptions.py`:**
```python
"""Custom exceptions for the API."""


class RefrainAPIException(Exception):
    """Base exception for all Refrain API errors."""
    pass


class ModelLoadError(RefrainAPIException):
    """Raised when model fails to load."""
    pass


class InferenceError(RefrainAPIException):
    """Raised when model inference fails."""
    pass


class CacheError(RefrainAPIException):
    """Raised when cache operations fail."""
    pass


class RateLimitExceeded(RefrainAPIException):
    """Raised when rate limit is exceeded."""
    pass
```

**Deliverable:** Production-ready inference service with error handling and retries

---

## Task 1.7: Redis Caching Service (2 hours)

**Create `api/services/cache.py`:**
```python
"""Redis caching service with proper error handling."""

import hashlib
import json
import logging
from typing import Any, Dict, Optional

import redis
from tenacity import retry, stop_after_attempt, wait_exponential

from api.config import get_settings
from api.exceptions import CacheError


logger = logging.getLogger(__name__)
settings = get_settings()


class CacheService:
    """
    Redis-based caching service.

    Features:
    - Automatic reconnection on connection failures
    - Deterministic cache key generation
    - TTL management
    - Graceful degradation (cache failures don't break requests)
    """

    def __init__(self):
        """Initialize Redis connection."""
        try:
            self.redis = redis.from_url(
                settings.redis_url,
                decode_responses=True,
                socket_connect_timeout=5,
                socket_keepalive=True,
                health_check_interval=30,
            )
            # Test connection
            self.redis.ping()
            logger.info("✓ Connected to Redis")
        except Exception as e:
            logger.error(f"Failed to connect to Redis: {e}")
            # Don't fail startup, just log error
            # Cache will gracefully degrade
            self.redis = None

    def _generate_key(
        self,
        messages: List[Dict[str, str]],
        model: str,
        temperature: float
    ) -> str:
        """
        Generate deterministic cache key.

        Args:
            messages: Chat messages
            model: Model name
            temperature: Temperature (rounded to 2 decimals)

        Returns:
            Cache key string
        """
        # Create stable representation
        content = json.dumps({
            "messages": messages,
            "model": model,
            "temperature": round(temperature, 2),
        }, sort_keys=True)

        # Hash for fixed-length key
        hash_digest = hashlib.sha256(content.encode()).hexdigest()[:16]

        return f"refrain:v1:{model}:{hash_digest}"

    @retry(
        stop=stop_after_attempt(2),
        wait=wait_exponential(multiplier=1, min=1, max=2),
        reraise=False,  # Don't fail request if cache fails
    )
    def get(
        self,
        messages: List[Dict[str, str]],
        model: str,
        temperature: float
    ) -> Optional[Dict[str, Any]]:
        """
        Get cached response.

        Args:
            messages: Chat messages
            model: Model name
            temperature: Temperature

        Returns:
            Cached response dict or None if not cached

        Note:
            Returns None on any error (graceful degradation)
        """
        if not self.redis:
            return None

        try:
            key = self._generate_key(messages, model, temperature)
            cached = self.redis.get(key)

            if cached:
                logger.debug(f"Cache hit: {key}")
                return json.loads(cached)

            logger.debug(f"Cache miss: {key}")
            return None

        except Exception as e:
            logger.warning(f"Cache get failed: {e}")
            return None  # Graceful degradation

    @retry(
        stop=stop_after_attempt(2),
        wait=wait_exponential(multiplier=1, min=1, max=2),
        reraise=False,
    )
    def set(
        self,
        messages: List[Dict[str, str]],
        model: str,
        temperature: float,
        response: Dict[str, Any]
    ) -> bool:
        """
        Cache response.

        Args:
            messages: Chat messages
            model: Model name
            temperature: Temperature
            response: Response to cache

        Returns:
            True if cached successfully, False otherwise

        Note:
            Returns False on any error (graceful degradation)
        """
        if not self.redis:
            return False

        try:
            key = self._generate_key(messages, model, temperature)

            # Store with TTL
            self.redis.setex(
                key,
                settings.redis_ttl,
                json.dumps(response)
            )

            logger.debug(f"Cached response: {key}")
            return True

        except Exception as e:
            logger.warning(f"Cache set failed: {e}")
            return False  # Graceful degradation

    def invalidate(self, pattern: str = "*") -> int:
        """
        Invalidate cache entries matching pattern.

        Args:
            pattern: Redis key pattern (default: all)

        Returns:
            Number of keys deleted
        """
        if not self.redis:
            return 0

        try:
            keys = self.redis.keys(f"refrain:v1:{pattern}")
            if keys:
                deleted = self.redis.delete(*keys)
                logger.info(f"Invalidated {deleted} cache entries")
                return deleted
            return 0

        except Exception as e:
            logger.error(f"Cache invalidation failed: {e}")
            return 0

    def get_stats(self) -> Dict[str, Any]:
        """Get cache statistics."""
        if not self.redis:
            return {"connected": False}

        try:
            info = self.redis.info("stats")
            return {
                "connected": True,
                "total_keys": self.redis.dbsize(),
                "hits": info.get("keyspace_hits", 0),
                "misses": info.get("keyspace_misses", 0),
                "hit_rate": (
                    info.get("keyspace_hits", 0) /
                    max(info.get("keyspace_hits", 0) + info.get("keyspace_misses", 0), 1)
                ),
            }
        except Exception as e:
            logger.error(f"Failed to get cache stats: {e}")
            return {"connected": False, "error": str(e)}


# Global singleton
_cache_service: CacheService | None = None


def get_cache_service() -> CacheService:
    """Get or create cache service singleton."""
    global _cache_service
    if _cache_service is None:
        _cache_service = CacheService()
    return _cache_service
```

**Deliverable:** Production-ready caching with graceful degradation

---

## Task 1.8: Prometheus Metrics (1.5 hours)

**Create `utils/metrics.py`:**
```python
"""Prometheus metrics for monitoring."""

from prometheus_client import Counter, Histogram, Gauge, generate_latest, CONTENT_TYPE_LATEST

from api.config import get_settings


settings = get_settings()

# Request metrics
requests_total = Counter(
    "refrain_requests_total",
    "Total number of requests",
    ["method", "endpoint", "status"]
)

request_duration_seconds = Histogram(
    "refrain_request_duration_seconds",
    "Request duration in seconds",
    ["method", "endpoint"],
    buckets=[0.1, 0.5, 1.0, 2.0, 5.0, 10.0, 30.0, 60.0]
)

# Inference metrics
inference_total = Counter(
    "refrain_inference_total",
    "Total number of inferences",
    ["model", "tier", "cache_hit"]
)

inference_duration_seconds = Histogram(
    "refrain_inference_duration_seconds",
    "Inference duration in seconds",
    ["model", "tier"],
    buckets=[0.5, 1.0, 2.0, 5.0, 10.0, 20.0, 30.0]
)

inference_tokens_total = Counter(
    "refrain_inference_tokens_total",
    "Total tokens processed",
    ["model", "type"]  # type: prompt or completion
)

# Cache metrics
cache_operations_total = Counter(
    "refrain_cache_operations_total",
    "Total cache operations",
    ["operation", "result"]  # operation: get/set, result: hit/miss/error
)

# Rate limit metrics
rate_limit_checks_total = Counter(
    "refrain_rate_limit_checks_total",
    "Total rate limit checks",
    ["result"]  # result: allowed/blocked
)

# Model metrics
model_loaded = Gauge(
    "refrain_model_loaded",
    "Whether model is loaded",
    ["model"]
)

# Cost metrics
inference_cost_total = Counter(
    "refrain_inference_cost_total",
    "Total inference cost in USD",
    ["tier"]
)


def get_metrics() -> tuple[str, str]:
    """
    Get Prometheus metrics in exposition format.

    Returns:
        (content, content_type) tuple
    """
    return (generate_latest(), CONTENT_TYPE_LATEST)
```

**Create `api/routes/metrics.py`:**
```python
"""Metrics endpoint."""

from fastapi import APIRouter, Response

from utils.metrics import get_metrics


router = APIRouter()


@router.get("/metrics")
async def prometheus_metrics():
    """Expose Prometheus metrics."""
    content, content_type = get_metrics()
    return Response(content=content, media_type=content_type)
```

**Deliverable:** Comprehensive metrics for monitoring

---

## Task 1.9: API Routes (3 hours)

**Create `api/schemas/requests.py`:**
```python
"""Request schemas."""

from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field, field_validator


class Message(BaseModel):
    """Chat message (OpenAI-compatible)."""
    role: str = Field(..., pattern="^(system|user|assistant)$")
    content: str = Field(..., min_length=1)

    @field_validator("content")
    @classmethod
    def content_not_empty(cls, v: str) -> str:
        """Ensure content is not just whitespace."""
        if not v.strip():
            raise ValueError("Message content cannot be empty")
        return v


class CompletionRequest(BaseModel):
    """Chat completion request (OpenAI-compatible + Refrain extensions)."""

    # OpenAI-compatible fields
    messages: List[Message] = Field(..., min_length=1)
    model: str = Field(default="auto")
    temperature: float = Field(default=0.7, ge=0.0, le=2.0)
    max_tokens: int = Field(default=2048, ge=1, le=8192)

    # Refrain-specific extensions
    user_skill_level: Optional[str] = Field(
        default="intermediate",
        pattern="^(beginner|intermediate|advanced)$"
    )
    project_context: Optional[Dict[str, Any]] = Field(default=None)

    @field_validator("messages")
    @classmethod
    def validate_messages(cls, v: List[Message]) -> List[Message]:
        """Ensure at least one user message."""
        user_messages = [m for m in v if m.role == "user"]
        if not user_messages:
            raise ValueError("At least one user message required")
        return v
```

**Create `api/schemas/responses.py`:**
```python
"""Response schemas."""

from typing import List
from pydantic import BaseModel, Field


class Usage(BaseModel):
    """Token usage (OpenAI-compatible)."""
    prompt_tokens: int
    completion_tokens: int
    total_tokens: int


class Message(BaseModel):
    """Chat message (OpenAI-compatible)."""
    role: str
    content: str


class Choice(BaseModel):
    """Completion choice (OpenAI-compatible)."""
    index: int = 0
    message: Message
    finish_reason: str = "stop"


class CompletionResponse(BaseModel):
    """Chat completion response (OpenAI-compatible + Refrain extensions)."""

    # OpenAI-compatible fields
    id: str
    object: str = "chat.completion"
    created: int
    model: str
    choices: List[Choice]
    usage: Usage

    # Refrain-specific extensions
    cost: float = Field(..., description="Cost in USD")
    tier: str = Field(..., description="Model tier used (local/medium/large)")
    latency_ms: int = Field(..., description="Response latency in milliseconds")
    cache_hit: bool = Field(default=False, description="Whether response was cached")


class ErrorResponse(BaseModel):
    """Error response."""
    error: str
    detail: Optional[str] = None
    request_id: Optional[str] = None
```

**Create `api/routes/chat.py`:**
```python
"""Chat completion endpoints."""

import logging
import time
import uuid
from typing import Dict, Any

from fastapi import APIRouter, Request, Depends, HTTPException, status

from api.middleware.auth import get_current_user
from api.middleware.rate_limit import enforce_rate_limit
from api.schemas.requests import CompletionRequest
from api.schemas.responses import CompletionResponse, Choice, Message, Usage
from api.services.inference import get_inference_service
from api.services.cache import get_cache_service
from utils.database import get_db, log_api_usage
from utils.metrics import (
    inference_total,
    inference_duration_seconds,
    inference_tokens_total,
    cache_operations_total,
    inference_cost_total,
)


logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/chat/completions", response_model=CompletionResponse)
async def create_chat_completion(
    request_data: CompletionRequest,
    fastapi_request: Request,
    current_user: Dict = Depends(get_current_user)
) -> CompletionResponse:
    """
    Create chat completion (OpenAI-compatible).

    For Sprint 1: Uses local CodeLlama-7B only.
    Future sprints will add intelligent routing.
    """
    request_id = fastapi_request.state.request_id
    user_id = current_user["user_id"]

    logger.info(
        f"Chat completion request",
        extra={
            "request_id": request_id,
            "user_id": user_id,
            "messages_count": len(request_data.messages),
        }
    )

    # Enforce rate limit
    try:
        await enforce_rate_limit(user_id)
    except HTTPException:
        # Log rate limit hit
        cache_operations_total.labels(operation="rate_limit", result="blocked").inc()
        raise

    # Extract context
    project_id = request_data.project_context.get("project_id") if request_data.project_context else None
    member_id = request_data.project_context.get("member_id") if request_data.project_context else None

    # Check cache
    cache_service = get_cache_service()
    messages_list = [msg.dict() for msg in request_data.messages]

    cached_response = cache_service.get(
        messages=messages_list,
        model="codellama-7b",
        temperature=request_data.temperature,
    )

    if cached_response:
        logger.info(f"Cache hit for request {request_id}")
        cache_operations_total.labels(operation="get", result="hit").inc()
        inference_total.labels(
            model="codellama-7b",
            tier="local",
            cache_hit="true"
        ).inc()

        # Return cached response
        return CompletionResponse(
            id=request_id,
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
            cost=0.0,
            tier="local",
            latency_ms=cached_response.get("latency_ms", 0),
            cache_hit=True,
        )

    # Cache miss
    cache_operations_total.labels(operation="get", result="miss").inc()

    # Generate new response
    inference_service = get_inference_service()

    try:
        with inference_duration_seconds.labels(
            model="codellama-7b",
            tier="local"
        ).time():
            result = inference_service.generate(
                messages=messages_list,
                temperature=request_data.temperature,
                max_tokens=request_data.max_tokens,
            )
    except Exception as e:
        logger.error(f"Inference failed: {e}", exc_info=True)

        # Log failed inference
        async with get_db() as db:
            await log_api_usage(
                db=db,
                user_id=user_id,
                request_id=request_id,
                project_id=project_id,
                team_member_id=member_id,
                model_tier="local",
                model_name="codellama-7b",
                prompt_tokens=0,
                completion_tokens=0,
                cost=0.0,
                latency_ms=0,
                cache_hit=False,
                user_skill_level=request_data.user_skill_level,
                error_type=type(e).__name__,
                error_message=str(e),
            )

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Inference failed: {str(e)}"
        )

    # Update metrics
    inference_total.labels(
        model="codellama-7b",
        tier="local",
        cache_hit="false"
    ).inc()

    inference_tokens_total.labels(
        model="codellama-7b",
        type="prompt"
    ).inc(result["prompt_tokens"])

    inference_tokens_total.labels(
        model="codellama-7b",
        type="completion"
    ).inc(result["completion_tokens"])

    inference_cost_total.labels(tier="local").inc(0.0)  # Local is free

    # Cache the response
    cache_service.set(
        messages=messages_list,
        model="codellama-7b",
        temperature=request_data.temperature,
        response=result,
    )
    cache_operations_total.labels(operation="set", result="success").inc()

    # Log usage to database (don't block response)
    try:
        async with get_db() as db:
            await log_api_usage(
                db=db,
                user_id=user_id,
                request_id=request_id,
                project_id=project_id,
                team_member_id=member_id,
                model_tier="local",
                model_name="codellama-7b",
                prompt_tokens=result["prompt_tokens"],
                completion_tokens=result["completion_tokens"],
                cost=0.0,
                latency_ms=result["latency_ms"],
                cache_hit=False,
                user_skill_level=request_data.user_skill_level,
            )
    except Exception as e:
        # Log error but don't fail the request
        logger.error(f"Failed to log usage: {e}", exc_info=True)

    # Return response
    return CompletionResponse(
        id=request_id,
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
        cache_hit=False,
    )
```

**Create `api/routes/health.py`:**
```python
"""Health check endpoints."""

import logging
from fastapi import APIRouter

from api.services.inference import get_inference_service
from api.services.cache import get_cache_service
from utils.database import get_db


logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/health")
async def health_check():
    """Basic health check."""
    return {
        "status": "healthy",
        "service": "refrain-coding-api",
    }


@router.get("/health/detailed")
async def detailed_health_check():
    """Detailed health check with component status."""
    # Check model
    try:
        inference_service = get_inference_service()
        model_stats = inference_service.get_stats()
        model_healthy = model_stats.get("model_loaded", False)
    except Exception as e:
        logger.error(f"Model health check failed: {e}")
        model_healthy = False
        model_stats = {"error": str(e)}

    # Check cache
    try:
        cache_service = get_cache_service()
        cache_stats = cache_service.get_stats()
        cache_healthy = cache_stats.get("connected", False)
    except Exception as e:
        logger.error(f"Cache health check failed: {e}")
        cache_healthy = False
        cache_stats = {"error": str(e)}

    # Check database
    try:
        async with get_db() as db:
            await db.execute("SELECT 1")
        db_healthy = True
        db_stats = {"connected": True}
    except Exception as e:
        logger.error(f"Database health check failed: {e}")
        db_healthy = False
        db_stats = {"error": str(e)}

    # Overall health
    overall_healthy = model_healthy and db_healthy  # Cache is optional

    return {
        "status": "healthy" if overall_healthy else "degraded",
        "components": {
            "model": {
                "healthy": model_healthy,
                "stats": model_stats,
            },
            "cache": {
                "healthy": cache_healthy,
                "stats": cache_stats,
            },
            "database": {
                "healthy": db_healthy,
                "stats": db_stats,
            },
        },
    }
```

**Deliverable:** Complete API routes with proper error handling

---

Due to length, I'll create the backend AI instructions now. The remaining tasks (main.py, tests, deployment) will be in a third document. Should I continue?