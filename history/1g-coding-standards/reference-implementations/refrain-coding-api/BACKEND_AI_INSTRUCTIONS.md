# Backend AI Instructions - Refrain Coding API Sprint 1
## Production-Ready Implementation - No Shortcuts

**Date:** November 14, 2024
**Project:** Refrain Coding API
**Sprint:** 1 (Production MVP with Local Inference)
**Your Role:** Backend Developer
**Duration:** 4-5 days

---

## 🎯 Overview

You are building a **production-grade** AI coding API that will save 75% on AI costs by using local open-source models instead of Claude/OpenAI.

**Core Principle:** Build it right the first time. This is not a prototype - this is production code that will handle real user traffic.

---

## 📚 Essential Reading (Read These First!)

**Before you start coding, read these documents in order:**

1. `/mnt/c/Users/Chris/Documents/_DevProjects/refrain-coding-api/_project_docs/MASTER_PLAN.md`
   - Understand the overall vision and architecture
   - Review the "Training with Weights On" philosophy
   - Study the three-tier model architecture

2. `/mnt/c/Users/Chris/Documents/_DevProjects/refrain-coding-api/_project_docs/ai_tech_lead_context.md`
   - Your working context document
   - Contains all technical decisions and rationale
   - Reference this whenever you have questions

3. `/mnt/c/Users/Chris/Documents/_DevProjects/refrain-coding-api/_project_docs/refrain_coding_api_requirements.md`
   - Complete requirements specification
   - Technical details for all tiers
   - Cost models and performance targets

4. `/mnt/c/Users/Chris/Documents/_DevProjects/refrain-coding-api/_project_docs/AI_CODING_INSTRUCTIONS_ENHANCED.md`
   - Coding standards you must follow
   - Quality requirements
   - Best practices

5. **Sprint 1 Implementation Documents:**
   - `sprint_1_production_ready.md` - Part 1: Foundation and config
   - `sprint_1_part_2_implementation.md` - Part 2: Services
   - `sprint_1_part_3_deployment.md` - Part 3: Testing and deployment

---

## 🏗️ What You're Building

### Sprint 1 Deliverables

A **production-ready API** with:

**Core Features:**
- FastAPI application with proper lifecycle management
- CodeLlama-7B local inference using llama.cpp
- API key authentication (bcrypt hashed)
- Rate limiting (100 req/hour per user)
- Redis caching with 24hr TTL
- PostgreSQL usage tracking
- Prometheus metrics
- Structured logging with correlation IDs
- Comprehensive error handling
- 80%+ test coverage
- Deployed to Fly.io

**What Sprint 1 Does NOT Include (deferred to Sprint 2+):**
- Modal GPU workers (Tier 2)
- Together.ai integration (Tier 3)
- Intelligent routing (uses local tier only)
- Context compression
- Teaching moment detection
- Streaming responses

---

## 📋 Implementation Checklist

Work through these tasks in order. Check off each one as you complete it.

### Phase 1: Project Setup (Day 1)

- [ ] **Task 1.1:** Create project structure
  - All directories from `sprint_1_production_ready.md` Task 1.1
  - Copy `pyproject.toml` exactly as specified
  - Create `.env.example` with all variables
  - Create `.gitignore`

- [ ] **Task 1.2:** Configuration management
  - Implement `api/config.py` with Pydantic Settings
  - Test with `python -c "from api.config import get_settings; print(get_settings())"`
  - Verify all environment variables load correctly

- [ ] **Task 1.3:** Database setup
  - Create migration `migrations/001_initial_schema.sql`
  - Implement `utils/database.py` with all functions
  - Create `scripts/run_migrations.py`
  - Create `scripts/create_api_key.py`
  - **Test migrations:** Run against local/dev database first
  - **Verify:** Check tables created with proper indexes

- [ ] **Task 1.4:** Structured logging
  - Implement `utils/logger.py` with StructuredFormatter
  - Test logging at different levels
  - Verify JSON-like output format

### Phase 2: Core Services (Day 2)

- [ ] **Task 1.5:** Authentication middleware
  - Implement `api/middleware/auth.py`
  - Implement `api/middleware/rate_limit.py`
  - Implement `api/middleware/logging.py`
  - Create `api/exceptions.py` with custom exceptions
  - **Test:** Verify auth rejects invalid keys
  - **Test:** Verify rate limiting blocks after limit

- [ ] **Task 1.6:** Model inference service
  - Create `scripts/download_models.py`
  - **Run locally:** Download CodeLlama-7B (4.2GB)
  - Verify model file integrity
  - Implement `api/services/inference.py`
  - **Test:** Load model and generate one completion
  - **Measure:** Record load time and inference time

- [ ] **Task 1.7:** Redis caching service
  - Implement `api/services/cache.py`
  - **Test:** Set and get cache entries
  - **Test:** Verify TTL expiration
  - **Test:** Verify graceful degradation if Redis is down

- [ ] **Task 1.8:** Prometheus metrics
  - Implement `utils/metrics.py` with all counters/histograms
  - Implement `api/routes/metrics.py`
  - **Test:** Access `/metrics` endpoint
  - **Verify:** Metrics in Prometheus format

### Phase 3: API Routes (Day 3)

- [ ] **Task 1.9:** API schemas
  - Implement `api/schemas/requests.py`
  - Implement `api/schemas/responses.py`
  - Implement `api/schemas/errors.py`
  - **Test:** Validate schemas with sample data

- [ ] **Task 1.10:** Chat completion endpoint
  - Implement `api/routes/chat.py` with full error handling
  - Implement cache check before inference
  - Implement usage logging (don't block response)
  - Implement metrics tracking
  - **Test:** Send test requests
  - **Verify:** Responses match OpenAI format
  - **Verify:** Usage logged to database
  - **Verify:** Metrics incremented

- [ ] **Task 1.11:** Health check endpoints
  - Implement `api/routes/health.py`
  - Basic health check (fast)
  - Detailed health check (checks all components)
  - **Test:** Both endpoints return correctly

- [ ] **Task 1.12:** Main FastAPI application
  - Implement `api/main.py` with lifespan
  - Add all middleware in correct order
  - Add exception handlers
  - Configure CORS properly
  - **Test:** Start application locally
  - **Verify:** Model loads on startup
  - **Verify:** Health checks pass

### Phase 4: Testing (Day 4)

- [ ] **Task 1.13:** Test suite
  - Implement `tests/conftest.py` with fixtures
  - Implement `tests/test_health.py`
  - Implement `tests/test_auth.py`
  - Implement `tests/test_chat.py` (comprehensive!)
  - Implement `tests/test_metrics.py`
  - **Run:** `pytest tests/ -v --cov=api --cov=utils`
  - **Target:** >80% coverage
  - **Fix:** Any failing tests

- [ ] **Task 1.14:** Code quality
  - Run `ruff check api/ utils/`
  - Fix all linting errors
  - Run `mypy api/ utils/`
  - Fix all type errors
  - **Goal:** Zero errors

### Phase 5: Deployment (Day 5)

- [ ] **Task 1.15:** Deployment configuration
  - Create `Dockerfile` (multi-stage build)
  - Create `fly.toml` with proper resource limits
  - Create `scripts/deploy.sh`
  - Make deploy script executable
  - **Test:** Build Docker image locally
  - **Verify:** Image builds successfully

- [ ] **Task 1.16:** Deploy to Fly.io
  - Create Fly.io app: `flyctl apps create refrain-coding-api`
  - Set secrets (DATABASE_URL, REDIS_URL, etc.)
  - Run `./scripts/deploy.sh`
  - **Monitor:** Deployment logs
  - **Verify:** App starts successfully

- [ ] **Task 1.17:** Post-deployment verification
  - Test `/health` endpoint
  - Test `/health/detailed` endpoint
  - Test `/metrics` endpoint
  - Create test API key
  - Test chat completion with real request
  - **Verify:** Response is valid
  - **Check:** Database usage record created
  - **Check:** Prometheus metrics available

- [ ] **Task 1.18:** Integration with Refrain AI IDE
  - Coordinate with frontend to add API endpoint option
  - Test creating team member with this API
  - Send test message
  - **Verify:** End-to-end flow works
  - **Monitor:** Logs for first hour

### Phase 6: Documentation (Ongoing)

- [ ] **Task 1.19:** Code documentation
  - Ensure all functions have docstrings
  - Add inline comments for complex logic
  - Update README.md
  - Document any gotchas or edge cases

---

## 🎯 Critical Requirements

### Security (MUST HAVE)

✅ **API keys MUST be:**
- Hashed with bcrypt before storage
- Never logged in plaintext
- Validated on every request

✅ **Input validation:**
- All request fields validated with Pydantic
- SQL injection prevention (use parameterized queries)
- Rate limiting enforced

✅ **CORS:**
- Only allow specific origins (not `*` in production)
- List in environment variable

### Reliability (MUST HAVE)

✅ **Error handling:**
- Try/except around all external calls
- Graceful degradation (cache failures don't break requests)
- Proper HTTP status codes
- Detailed error messages in logs, generic in responses

✅ **Retries:**
- Use `tenacity` library for retries
- Retry on transient failures only
- Exponential backoff

✅ **Health checks:**
- Fast basic check (<100ms)
- Detailed check reports component health
- Fly.io health checks configured

### Observability (MUST HAVE)

✅ **Logging:**
- Structured logs (key=value format)
- Request ID on every log line
- User ID when available
- Log levels: DEBUG, INFO, WARNING, ERROR
- Never log sensitive data

✅ **Metrics:**
- Request count by endpoint and status
- Request latency (histogram)
- Inference count by model and cache hit
- Inference latency (histogram)
- Token usage
- Cache hit rate
- Rate limit blocks

✅ **Tracing:**
- Request ID generated per request
- Returned in X-Request-ID header
- Used to correlate logs

### Performance (MUST HAVE)

✅ **Latency targets:**
- Health check: <100ms
- Chat completion (cached): <100ms
- Chat completion (uncached): <5s
- p95 latency: <10s

✅ **Caching:**
- Cache all responses with 24hr TTL
- Deterministic cache keys
- Target >40% hit rate

✅ **Resource usage:**
- Model loaded once at startup
- Reuse connections (database, Redis)
- No memory leaks

### Testing (MUST HAVE)

✅ **Coverage:**
- >80% code coverage
- All critical paths tested
- Error cases tested

✅ **Test types:**
- Unit tests for individual functions
- Integration tests for endpoints
- Health check tests
- Auth tests
- Cache tests

---

## 📏 Code Quality Standards

### Python Style

```python
# ✅ GOOD: Type hints on everything
async def log_api_usage(
    db: AsyncSession,
    user_id: str,
    request_id: str,
    model_tier: str,
    latency_ms: int,
) -> None:
    """Log API usage to database."""
    pass

# ❌ BAD: No type hints
async def log_api_usage(db, user_id, request_id, model_tier, latency_ms):
    pass
```

### Error Handling

```python
# ✅ GOOD: Specific exceptions, logging, graceful degradation
try:
    result = await cache.get(key)
except redis.ConnectionError as e:
    logger.warning(f"Cache connection failed: {e}")
    return None  # Graceful degradation
except Exception as e:
    logger.error(f"Unexpected cache error: {e}", exc_info=True)
    return None

# ❌ BAD: Bare except, no logging
try:
    result = cache.get(key)
except:
    return None
```

### Logging

```python
# ✅ GOOD: Structured logging with context
logger.info(
    "Chat completion request",
    extra={
        "request_id": request_id,
        "user_id": user_id,
        "messages_count": len(messages),
        "model": "codellama-7b",
    }
)

# ❌ BAD: String formatting, no context
logger.info(f"User {user_id} sent a request")
```

### Async/Await

```python
# ✅ GOOD: Proper async/await
async def get_completion(messages: List[Dict]) -> str:
    async with get_db() as db:
        await db.execute(...)
    return result

# ❌ BAD: Mixing sync and async incorrectly
def get_completion(messages):
    db = get_db()  # Wrong - need async context
    db.execute(...)  # Wrong - need await
```

---

## 🚨 Common Pitfalls to Avoid

### Pitfall 1: Hardcoding Configuration

❌ **WRONG:**
```python
REDIS_URL = "redis://localhost:6379"
```

✅ **CORRECT:**
```python
from api.config import get_settings
settings = get_settings()
redis_url = settings.redis_url
```

### Pitfall 2: Not Handling Model Load Failures

❌ **WRONG:**
```python
def __init__(self):
    self.model = Llama(model_path="...")  # Crashes if file missing
```

✅ **CORRECT:**
```python
def __init__(self):
    try:
        if not Path(model_path).exists():
            raise ModelLoadError(f"Model not found: {model_path}")
        self.model = Llama(model_path=model_path)
    except Exception as e:
        logger.error(f"Failed to load model: {e}", exc_info=True)
        raise ModelLoadError(f"Failed to load model: {e}") from e
```

### Pitfall 3: Blocking on Database Writes

❌ **WRONG:**
```python
# This blocks the response!
await log_api_usage(db, ...)
return response
```

✅ **CORRECT:**
```python
# Log in background, don't block response
try:
    async with get_db() as db:
        await log_api_usage(db, ...)
except Exception as e:
    logger.error(f"Failed to log usage: {e}")  # Log but don't fail

return response
```

### Pitfall 4: Not Using Connection Pooling

❌ **WRONG:**
```python
engine = create_async_engine(DATABASE_URL)  # No pool config
```

✅ **CORRECT:**
```python
engine = create_async_engine(
    DATABASE_URL,
    pool_pre_ping=True,  # Verify connections
    pool_size=10,
    max_overflow=20,
)
```

### Pitfall 5: Forgetting to Update Metrics

❌ **WRONG:**
```python
result = inference_service.generate(...)
return result  # Forgot to track metrics!
```

✅ **CORRECT:**
```python
with inference_duration_seconds.labels(model="codellama-7b").time():
    result = inference_service.generate(...)

inference_total.labels(model="codellama-7b", cache_hit="false").inc()
inference_tokens_total.labels(type="completion").inc(result["completion_tokens"])

return result
```

---

## 🔍 Testing Strategy

### Test Each Layer

1. **Unit tests:** Individual functions
2. **Integration tests:** API endpoints
3. **Component tests:** Services with mocks
4. **End-to-end tests:** Full request flow

### Example Test Structure

```python
# tests/test_inference.py

import pytest
from api.services.inference import LocalInferenceService

@pytest.fixture
def inference_service():
    """Create inference service for tests."""
    return LocalInferenceService()

def test_generate_basic(inference_service):
    """Test basic generation."""
    messages = [{"role": "user", "content": "Hello"}]
    result = inference_service.generate(messages)

    assert "content" in result
    assert result["prompt_tokens"] > 0
    assert result["completion_tokens"] > 0

def test_generate_invalid_temperature(inference_service):
    """Test validation of temperature."""
    with pytest.raises(InferenceError):
        inference_service.generate(
            messages=[{"role": "user", "content": "test"}],
            temperature=5.0  # Invalid
        )
```

---

## 📊 Monitoring Checklist

After deployment, verify these metrics are being collected:

- [ ] `refrain_requests_total` - Should increment on every request
- [ ] `refrain_request_duration_seconds` - Should have histogram buckets
- [ ] `refrain_inference_total` - Should increment on inference
- [ ] `refrain_inference_duration_seconds` - Should track inference time
- [ ] `refrain_inference_tokens_total` - Should track prompt and completion tokens
- [ ] `refrain_cache_operations_total` - Should show hit/miss ratio
- [ ] `refrain_rate_limit_checks_total` - Should show allowed/blocked
- [ ] `refrain_model_loaded` - Should be 1 when model loaded

---

## 🚀 Deployment Procedure

### Pre-Deployment Checklist

Before deploying, ensure:

- [ ] All tests pass locally
- [ ] Code quality checks pass (ruff, mypy)
- [ ] Model downloads successfully
- [ ] Docker image builds
- [ ] Environment variables documented
- [ ] Database migrations ready

### Deployment Steps

1. **Run tests:**
   ```bash
   pytest tests/ -v --tb=short
   ```

2. **Check code quality:**
   ```bash
   ruff check api/ utils/
   mypy api/ utils/
   ```

3. **Build Docker image locally:**
   ```bash
   docker build -t refrain-coding-api .
   ```

4. **Test Docker image:**
   ```bash
   docker run -p 8000:8000 \
     -e DATABASE_URL=... \
     -e REDIS_URL=... \
     refrain-coding-api
   ```

5. **Deploy to Fly.io:**
   ```bash
   ./scripts/deploy.sh
   ```

6. **Verify deployment:**
   ```bash
   curl https://refrain-coding-api.fly.dev/health
   ```

7. **Monitor logs:**
   ```bash
   flyctl logs -a refrain-coding-api -f
   ```

### Post-Deployment Checklist

After deploying, verify:

- [ ] Health check passes
- [ ] Detailed health shows all components healthy
- [ ] Metrics endpoint accessible
- [ ] Test API key works
- [ ] Test inference returns valid response
- [ ] Database usage logged
- [ ] No errors in logs for first 10 minutes
- [ ] Prometheus metrics updating

---

## 🆘 Troubleshooting

### Model Won't Load

**Symptoms:** App crashes on startup, "Model not found" errors

**Solutions:**
1. Verify model file exists in container: `flyctl ssh console -a refrain-coding-api`, then `ls models/`
2. Check MODEL_DIR environment variable
3. Re-run download script
4. Check Docker build logs

### High Latency

**Symptoms:** Requests taking >10s

**Solutions:**
1. Check if model loaded: `curl .../health/detailed`
2. Check Redis connection
3. Look for slow database queries in logs
4. Check Fly.io resource usage

### Rate Limiting Not Working

**Symptoms:** Users can exceed limits

**Solutions:**
1. Check rate_limit_tracker table has records
2. Verify middleware is registered
3. Check window calculation logic
4. Look for database errors in logs

### Cache Not Hitting

**Symptoms:** cache_hit always false

**Solutions:**
1. Verify Redis connection: `curl .../health/detailed`
2. Check cache key generation (must be deterministic)
3. Look for cache errors in logs
4. Verify TTL is not too short

---

## 📞 When You Need Help

**Before asking for help:**
1. Check the documentation (MASTER_PLAN.md, ai_tech_lead_context.md)
2. Search logs for error messages
3. Run tests to isolate the issue
4. Check Prometheus metrics for anomalies

**When reporting issues:**
- Include full error message
- Include relevant logs (with request ID)
- Include steps to reproduce
- Include what you've already tried

---

## ✅ Definition of Done

Sprint 1 is **DONE** when:

### Functional Requirements
- [x] API accepts chat completion requests
- [x] Responses match OpenAI format
- [x] CodeLlama-7B generates valid code
- [x] Caching reduces redundant calls
- [x] Rate limiting prevents abuse
- [x] Usage tracked in database

### Technical Requirements
- [x] All tests pass (>80% coverage)
- [x] No linting errors
- [x] No type errors
- [x] Deployed to Fly.io
- [x] Health checks passing
- [x] Metrics available

### Production Requirements
- [x] Structured logging working
- [x] Request IDs tracking
- [x] Error handling comprehensive
- [x] API keys hashed securely
- [x] CORS configured properly
- [x] Documentation complete

### Integration Requirements
- [x] Integrated with Refrain AI IDE
- [x] End-to-end user flow works
- [x] No critical errors for 1 hour

---

## 🎉 Success Metrics

After 24 hours in production, you should see:

- **Uptime:** >99.9%
- **p95 latency:** <10s
- **Cache hit rate:** >30% (will improve over time)
- **Error rate:** <1%
- **Model availability:** 100%

---

## 🚀 Final Notes

**Remember:**
- Production-ready means **no shortcuts**
- Every error should be **handled gracefully**
- Every metric should be **tracked**
- Every log should be **structured**
- Every test should **pass**

**You're building the foundation** for a system that will save users 75% on AI costs. Build it solid.

**Good luck! 🚀**

---

*Last updated: November 14, 2024*
*Questions? Check ai_tech_lead_context.md or MASTER_PLAN.md*
