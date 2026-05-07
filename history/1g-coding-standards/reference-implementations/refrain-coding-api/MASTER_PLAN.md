# Refrain Coding API - Master Plan
## Cost-Effective AI Inference for Developer Productivity

**Version:** 1.0
**Last Updated:** November 14, 2024
**Status:** Planning Phase → Ready for Implementation

---

## 🎯 Executive Summary

### The Problem
Refrain AI IDE requires AI assistance for every team member, but using Claude API costs **$0.50 per project**. For 100 users doing 10 projects/month, that's **$500/month** — unsustainable.

### The Solution
Build a **three-tier intelligent routing API** using open source models:
- **Tier 1 (Local):** CodeLlama-7B, Phi-3-mini on Fly.io
- **Tier 2 (GPU):** Qwen-32B, DeepSeek-33B on Modal
- **Tier 3 (Premium):** Llama-70B, Mixtral on Together.ai

### The Innovation
**"Training with Weights On"** — Use smaller models intentionally to create teaching moments. Less capable models force better prompting and reveal learning opportunities.

### The Impact
- **75% cost reduction:** $0.125 vs $0.50 per project
- **Better learning:** Model limitations become teaching features
- **Full control:** Tune cost/quality tradeoffs per user skill level
- **No vendor lock-in:** Open source models, portable infrastructure

### Timeline
- **Phase 1 (Week 1-2):** MVP with local inference + routing
- **Phase 2 (Week 3-4):** Full three-tier system + caching
- **Phase 3 (Week 5-6):** Polish, optimization, teaching moments

### Success Metrics
- Average cost per request: <$0.015
- Latency: <10s at 95th percentile
- Cache hit rate: >40%
- User satisfaction: 4+ stars
- Teaching moments detected: >30% of responses

---

## 📐 Architecture Overview

### System Diagram
```
┌─────────────────────────────────────────────────────────────────┐
│                     Refrain AI IDE Frontend                     │
│              (Team Member = Prompt + API Endpoint)              │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             │ POST /v1/chat/completions
                             │
┌────────────────────────────▼────────────────────────────────────┐
│                   API Gateway (Fly.io)                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │   Auth &     │  │   Routing    │  │   Caching    │         │
│  │  Validation  │→ │   Logic      │→ │   (Redis)    │         │
│  └──────────────┘  └──────┬───────┘  └──────────────┘         │
└────────────────────────────┼────────────────────────────────────┘
                             │
          ┌──────────────────┼──────────────────┐
          │                  │                  │
          │                  │                  │
┌─────────▼─────────┐ ┌─────▼──────────┐ ┌────▼──────────┐
│   Tier 1: Local   │ │ Tier 2: Modal  │ │ Tier 3: Large │
│  (Same Machine)   │ │  (GPU Workers) │ │  (Together.ai)│
├───────────────────┤ ├────────────────┤ ├───────────────┤
│ CodeLlama-7B      │ │ Qwen-32B       │ │ Llama-70B     │
│ Phi-3-mini        │ │ DeepSeek-33B   │ │ Mixtral-8x22B │
├───────────────────┤ ├────────────────┤ ├───────────────┤
│ Cost: ~$0.00      │ │ Cost: ~$0.01   │ │ Cost: ~$0.05  │
│ Latency: <2s      │ │ Latency: <5s   │ │ Latency: <8s  │
│ Context: 8k-16k   │ │ Context: 32k   │ │ Context: 128k │
└───────────────────┘ └────────────────┘ └───────────────┘
```

### Request Flow
1. **Request arrives** at API gateway with user message + skill level + project context
2. **Auth check** validates API key, checks rate limits
3. **Cache lookup** (Redis) for exact match → instant return if hit
4. **Complexity analysis** scores prompt difficulty (0.0 - 1.0)
5. **Model selection** based on complexity + user skill level
6. **Context preparation** compress history for model's context window
7. **Inference** via appropriate tier (local / Modal / Together.ai)
8. **Teaching moment detection** analyze response for learning opportunities
9. **Cache storage** store response for future requests
10. **Response** return to client with cost, tier, teaching moments

### Technology Stack

**API Gateway (Fly.io)**
- FastAPI (Python 3.11+)
- PostgreSQL (shared with Refrain AI IDE)
- Redis (caching + rate limiting)
- Prometheus + Grafana (metrics)
- Sentry (error tracking)

**Tier 1: Local Inference**
- llama.cpp with Python bindings
- CodeLlama-7B-Instruct (4GB GGUF)
- Phi-3-mini-Instruct (3GB GGUF)
- Runs on same Fly.io machine as API

**Tier 2: GPU Workers**
- Modal (serverless GPU platform)
- vLLM inference engine
- Qwen-32B-Coder
- DeepSeek-Coder-33B
- A10G or T4 GPU (auto-scale)

**Tier 3: Premium Models**
- Together.ai API
- Llama-70B
- Mixtral-8x22B
- OpenAI-compatible endpoint

---

## 🧠 Intelligent Routing Algorithm

### Core Logic

```python
def route_request(request: CompletionRequest) -> ModelTier:
    """
    Route request to appropriate model tier based on:
    1. Task complexity (analyzed from prompt)
    2. User skill level (beginner/intermediate/advanced)
    3. Model availability and cost
    """

    # Step 1: Calculate prompt complexity (0.0 - 1.0)
    complexity = analyze_complexity(request)

    # Step 2: Determine routing threshold based on user skill
    # Beginners get better models more often (lower threshold)
    # Advanced users train with harder models (higher threshold)
    skill_thresholds = {
        "beginner": 0.3,      # Route to medium/large more often
        "intermediate": 0.6,  # Balanced routing
        "advanced": 0.8       # Prefer local/medium (teaching)
    }

    threshold = skill_thresholds.get(
        request.user_skill_level,
        0.6  # default
    )

    # Step 3: Route based on complexity vs threshold
    if complexity < 0.3:
        # Simple tasks: local models are fine
        return ModelTier.LOCAL

    elif complexity < threshold:
        # Medium complexity: depends on user skill
        return ModelTier.MEDIUM

    else:
        # Complex tasks: use premium models
        return ModelTier.LARGE
```

### Complexity Analysis

```python
def analyze_complexity(request: CompletionRequest) -> float:
    """
    Analyze prompt complexity using multiple heuristics.
    Returns score 0.0 (trivial) to 1.0 (very complex).
    """

    score = 0.0
    prompt = request.messages[-1].content

    # Factor 1: Length (longer = more complex)
    if len(prompt) > 1000:
        score += 0.2
    elif len(prompt) > 500:
        score += 0.1

    # Factor 2: Technical keywords
    complex_keywords = [
        "architecture", "design pattern", "scalability",
        "security", "performance", "optimization",
        "distributed", "microservice", "refactor"
    ]
    keyword_count = sum(1 for kw in complex_keywords if kw in prompt.lower())
    score += min(keyword_count * 0.1, 0.3)

    # Factor 3: Multiple languages/frameworks mentioned
    frameworks = [
        "react", "vue", "angular", "fastapi", "django",
        "postgresql", "redis", "kubernetes", "docker"
    ]
    framework_count = sum(1 for fw in frameworks if fw in prompt.lower())
    if framework_count >= 3:
        score += 0.2

    # Factor 4: Project phase (from context)
    if request.project_context:
        phase = request.project_context.get("phase", "")
        if phase == "architecture":
            score += 0.2  # Architecture needs deeper thinking
        elif phase == "sprint_planning":
            score += 0.15

    # Factor 5: Conversation depth
    if len(request.messages) > 10:
        score += 0.1  # Long conversations = complex context

    return min(score, 1.0)  # Cap at 1.0
```

### Example Routing

**Scenario 1: Beginner asks simple question**
```
Prompt: "How do I create a variable in Python?"
Complexity: 0.1 (simple, short)
User: Beginner
Threshold: 0.3

0.1 < 0.3 → Route to LOCAL (CodeLlama-7B)
✓ Perfect fit: simple answer, fast, free
```

**Scenario 2: Intermediate asks medium question**
```
Prompt: "Build a REST API endpoint for user authentication with JWT tokens"
Complexity: 0.5 (technical keywords, specific implementation)
User: Intermediate
Threshold: 0.6

0.5 < 0.6 → Route to MEDIUM (Qwen-32B)
✓ Good balance: capable model, reasonable cost
```

**Scenario 3: Advanced asks complex question**
```
Prompt: "Design a microservices architecture with event sourcing and CQRS..."
Complexity: 0.9 (architecture, multiple patterns, long)
User: Advanced
Threshold: 0.8

0.9 >= 0.8 → Route to LARGE (Llama-70B)
✓ Appropriate: needs deep reasoning, worth the cost
```

**Scenario 4: Advanced asks simple question (teaching moment!)**
```
Prompt: "Write a function to reverse a string"
Complexity: 0.2 (simple task)
User: Advanced
Threshold: 0.8

0.2 < 0.3 → Route to LOCAL (Phi-3-mini)
✓ Teaching moment: "Your solution works, but consider edge cases..."
```

---

## 💾 Context Window Management

### The Challenge
Models have limited context windows:
- **Tier 1:** 8k - 16k tokens
- **Tier 2:** 32k - 64k tokens
- **Tier 3:** 128k+ tokens

Long conversations exceed these limits.

### The Solution: Smart Compression

```python
def prepare_context(
    messages: List[Message],
    model: str
) -> List[Message]:
    """
    Compress conversation history to fit model's context window
    while preserving critical information.
    """

    window_size = MODEL_CONTEXT_WINDOWS[model]

    # Calculate total tokens
    total_tokens = sum(count_tokens(m.content) for m in messages)

    if total_tokens <= window_size * 0.8:  # 80% safety margin
        return messages  # No compression needed

    # Always keep system prompt and recent messages
    system_prompt = messages[0]
    recent_messages = messages[-5:]  # Last 5 exchanges
    middle_messages = messages[1:-5]

    # Compression strategy 1: Summarize middle messages
    if len(middle_messages) > 10:
        summary = create_conversation_summary(middle_messages)
        compressed_middle = [Message(
            role="system",
            content=f"[Previous conversation summary: {summary}]"
        )]
    else:
        # Compression strategy 2: Keep key messages only
        compressed_middle = extract_key_messages(middle_messages)

    return [system_prompt] + compressed_middle + recent_messages


def create_conversation_summary(messages: List[Message]) -> str:
    """
    Create a concise summary of conversation history.
    Use a local model (cheap) to summarize.
    """

    conversation_text = "\n".join(
        f"{m.role}: {m.content}" for m in messages
    )

    summary_prompt = f"""Summarize this conversation in 2-3 sentences,
    focusing on key decisions and context:

    {conversation_text}
    """

    # Use local model for summarization (fast, cheap)
    summary = local_model.generate(summary_prompt, max_tokens=150)

    return summary


def extract_key_messages(messages: List[Message]) -> List[Message]:
    """
    Filter messages to keep only those with critical information.
    """

    key_messages = []

    for msg in messages:
        # Keep messages with:
        # - Code blocks (implementations to remember)
        # - Architecture decisions
        # - Error messages and their solutions

        if "```" in msg.content:  # Has code
            key_messages.append(msg)
        elif any(kw in msg.content.lower() for kw in [
            "architecture", "design", "pattern", "should we"
        ]):
            key_messages.append(msg)
        elif "error" in msg.content.lower() and len(msg.content) > 100:
            key_messages.append(msg)

    return key_messages
```

### Context Budget Allocation

For an 8k token window (Tier 1):
- **System prompt:** 500 tokens (role definition)
- **Recent context:** 2000 tokens (last 5 messages)
- **Summary/key messages:** 1500 tokens (compressed history)
- **Response budget:** 4000 tokens (model output)

For a 32k token window (Tier 2):
- More room for full history
- Less aggressive compression
- Can include more code examples

For a 128k token window (Tier 3):
- Minimal compression
- Full project context
- Entire conversation history

---

## 🎓 Teaching Moment Detection

### The Philosophy

**"Training with Weights On"** means smaller models are a feature, not a bug. When they produce suboptimal code, we detect it and turn it into a teaching moment.

### Detection Algorithm

```python
def detect_teaching_moments(
    response: str,
    code_blocks: List[str]
) -> List[TeachingMoment]:
    """
    Analyze AI response for learning opportunities.
    """

    moments = []

    for code in code_blocks:
        # Security checks
        security_issues = check_security(code)
        for issue in security_issues:
            moments.append(TeachingMoment(
                type="security",
                severity="high",
                title=issue.title,
                explanation=issue.explanation,
                fix=issue.suggested_fix,
                resources=[
                    "https://owasp.org/...",
                    "https://docs.python.org/security..."
                ]
            ))

        # Performance checks
        perf_issues = check_performance(code)
        for issue in perf_issues:
            moments.append(TeachingMoment(
                type="performance",
                severity="medium",
                title=issue.title,
                explanation=issue.explanation,
                fix=issue.suggested_fix
            ))

        # Best practices
        style_issues = check_best_practices(code)
        for issue in style_issues:
            moments.append(TeachingMoment(
                type="best_practice",
                severity="low",
                title=issue.title,
                explanation=issue.explanation,
                fix=issue.suggested_fix
            ))

    return moments


def check_security(code: str) -> List[SecurityIssue]:
    """Check for common security vulnerabilities."""

    issues = []

    # SQL Injection
    if re.search(r'f"SELECT.*{.*}"', code) or \
       re.search(r'"SELECT.*" \+', code):
        issues.append(SecurityIssue(
            title="SQL Injection Vulnerability",
            explanation="String concatenation in SQL queries allows injection attacks.",
            suggested_fix="Use parameterized queries or an ORM.",
            cwe="CWE-89"
        ))

    # XSS (Cross-Site Scripting)
    if "innerHTML" in code and "sanitize" not in code.lower():
        issues.append(SecurityIssue(
            title="Potential XSS Vulnerability",
            explanation="Setting innerHTML with user input can execute malicious scripts.",
            suggested_fix="Use textContent or a sanitization library like DOMPurify.",
            cwe="CWE-79"
        ))

    # Hardcoded secrets
    if re.search(r'(password|secret|api_key)\s*=\s*["\'](?!{).+["\']', code, re.I):
        issues.append(SecurityIssue(
            title="Hardcoded Secret",
            explanation="Secrets in code can be exposed in version control.",
            suggested_fix="Use environment variables or a secrets manager.",
            cwe="CWE-798"
        ))

    return issues


def check_performance(code: str) -> List[PerformanceIssue]:
    """Check for performance anti-patterns."""

    issues = []

    # Nested loops (O(n²))
    if code.count("for ") >= 2 and "# O(n" not in code:
        issues.append(PerformanceIssue(
            title="Nested Loop Performance",
            explanation="Nested loops create O(n²) time complexity.",
            suggested_fix="Consider using a hash map for O(n) solution."
        ))

    # Inefficient string concatenation
    if '+=' in code and 'str' in code.lower():
        issues.append(PerformanceIssue(
            title="Inefficient String Building",
            explanation="Concatenating strings in a loop creates many intermediate objects.",
            suggested_fix="Use ''.join() or StringBuilder pattern."
        ))

    # Missing pagination
    if "SELECT" in code and "LIMIT" not in code.upper():
        issues.append(PerformanceIssue(
            title="Missing Pagination",
            explanation="Fetching all rows can overwhelm memory with large datasets.",
            suggested_fix="Add LIMIT/OFFSET or cursor-based pagination."
        ))

    return issues


def check_best_practices(code: str) -> List[BestPracticeIssue]:
    """Check for code quality and style issues."""

    issues = []

    # Long functions
    if code.count("\n") > 50 and "def " in code:
        issues.append(BestPracticeIssue(
            title="Long Function",
            explanation="Functions over 50 lines are hard to test and maintain.",
            suggested_fix="Extract logical sections into separate functions."
        ))

    # Magic numbers
    numbers = re.findall(r'\b\d{2,}\b', code)
    if numbers and "CONSTANT" not in code:
        issues.append(BestPracticeIssue(
            title="Magic Numbers",
            explanation="Unexplained numbers make code harder to understand.",
            suggested_fix="Define constants with descriptive names."
        ))

    # No error handling
    if ("open(" in code or "requests." in code) and "try" not in code:
        issues.append(BestPracticeIssue(
            title="Missing Error Handling",
            explanation="External operations should have error handling.",
            suggested_fix="Wrap in try/except block."
        ))

    return issues
```

### Teaching Moment Example

**User prompt:** "Create a login endpoint"

**Tier 1 Response (CodeLlama-7B):**
```python
@app.post("/login")
def login(username: str, password: str):
    user = db.execute(f"SELECT * FROM users WHERE username='{username}'")
    if user and user.password == password:
        return {"token": "abc123"}
    return {"error": "Invalid credentials"}
```

**Detected Teaching Moments:**
1. **Security (HIGH):** SQL Injection — use parameterized queries
2. **Security (HIGH):** Plain text password comparison — use hashing
3. **Security (MEDIUM):** Hardcoded token — use JWT with secret
4. **Best Practice (LOW):** No input validation

**Enhanced Response to User:**
```markdown
I've created a basic login endpoint, but I notice some security issues we should address:

🔴 **Critical Security Issues:**

1. **SQL Injection Vulnerability**
   - Current: String interpolation in query
   - Fix: Use SQLAlchemy or parameterized queries
   - Learn more: https://owasp.org/www-community/attacks/SQL_Injection

2. **Passwords Not Hashed**
   - Current: Plain text comparison
   - Fix: Use bcrypt or argon2
   - Example: `bcrypt.checkpw(password.encode(), user.hashed_password)`

Here's an improved version:
[Shows corrected code]

Would you like me to explain any of these security concepts in detail?
```

This turns a weak response into a learning opportunity!

---

## 💰 Cost Model & Optimization

### Target Costs

**Per Request (Estimated):**
- **Tier 1 (Local):** $0.000 (infrastructure amortized)
- **Tier 2 (Modal GPU):** $0.010 per request
- **Tier 3 (Together.ai):** $0.050 per request

**Per Project Lifecycle (10-15 requests):**
- **50% Tier 1:** 7 requests × $0.000 = $0.000
- **35% Tier 2:** 4 requests × $0.010 = $0.040
- **15% Tier 3:** 2 requests × $0.050 = $0.100
- **Total:** ~$0.140 per project

**vs Claude:**
- Claude: ~$0.50 per project (15 requests × ~$0.033)
- Savings: **72%**

### Monthly Infrastructure (100 users, 1000 projects)

**Fixed Costs:**
- Fly.io (4 CPU, 8GB RAM): $25/month
- Redis (managed): $15/month
- PostgreSQL (shared with main app): $0
- **Subtotal:** $40/month

**Variable Costs:**
- Modal GPU (350 requests @ $0.01): $35/month
- Together.ai (150 requests @ $0.05): $75/month
- **Subtotal:** $110/month

**Total: $150/month**

**vs Claude: $500/month**

**Savings: 70%**

### Cost Optimization Strategies

**1. Aggressive Caching**
```python
# Three-tier cache strategy

# L1: Exact match (Redis, <1ms)
cache_key = hash_request(messages, model, temperature)
if cached := redis.get(cache_key):
    return cached  # Instant, free

# L2: Semantic similarity (Vector DB, <10ms)
similar_key = vector_db.find_similar(messages, threshold=0.95)
if similar_key and (cached := redis.get(similar_key)):
    return cached  # Very fast, nearly free

# L3: Pre-generated common responses (PostgreSQL, <50ms)
if is_common_pattern(messages):
    template = db.get_template(pattern_id)
    response = fill_template(template, context)
    return response  # Fast, free

# Cache miss → perform inference
response = perform_inference(...)
redis.set(cache_key, response, ttl=86400)  # 24 hour TTL
return response
```

**Cache Hit Rate Target: 40%+**
- 40% cache hits × 1000 requests = 400 free responses
- Saves ~$4/month (seems small, but scales)

**2. Smart Model Selection**
```python
# Prefer cheaper models when possible

def select_model_with_fallback(request):
    # Try local first if user is okay with it
    if request.allow_local and complexity < 0.4:
        try:
            return tier1_local(request)
        except QualityTooLow:
            # Fall back to medium if quality insufficient
            return tier2_medium(request)

    # Normal routing
    return route_request(request)
```

**3. Batch Processing**
```python
# For Modal GPU workers, batch requests to amortize cold start

class ModalWorkerPool:
    def __init__(self):
        self.pending_requests = []
        self.batch_size = 5
        self.max_wait_ms = 100

    async def process(self, request):
        self.pending_requests.append(request)

        # Batch when we have enough requests or timeout
        if len(self.pending_requests) >= self.batch_size:
            return await self.flush_batch()

        # Wait a bit for more requests
        await asyncio.sleep(0.1)  # 100ms
        return await self.flush_batch()

    async def flush_batch(self):
        batch = self.pending_requests[:self.batch_size]
        self.pending_requests = self.pending_requests[self.batch_size:]

        # Single Modal call for entire batch
        results = await modal_worker.batch_infer(batch)

        return results
```

**Saves: ~30% on Modal costs** (fewer cold starts)

**4. Usage-Based Tier Limits**
```python
# Free tier users: limit to Tier 1/2 only
# Paid tier users: full access to Tier 3

def enforce_tier_limits(user, selected_tier):
    if user.plan == "free" and selected_tier == ModelTier.LARGE:
        # Downgrade to medium
        logger.info(f"Downgrading user {user.id} from large to medium (free tier)")
        return ModelTier.MEDIUM

    return selected_tier
```

### Cost Monitoring

**Metrics to Track:**
- Cost per request (by tier, by user, by project phase)
- Tier distribution (% local / medium / large)
- Cache hit rate
- Average tokens per request
- Monthly burn rate

**Alerts:**
- Daily spend > $10 (budget overrun)
- Tier 3 usage > 20% (too many expensive requests)
- Cache hit rate < 30% (cache not effective)

---

## 📅 Implementation Plan

### Phase 0: Setup & Infrastructure (Days 1-2)

**Goal:** Project scaffolding and development environment

**Tasks:**
1. **Project Initialization**
   - Create repository structure
   - Set up `pyproject.toml` with dependencies
   - Configure `ruff` (linting), `mypy` (type checking)
   - Set up pre-commit hooks

2. **Database Setup**
   - Create `api_usage` table migration (Alembic)
   - Add indexes for performance
   - Test connection to existing Refrain database

3. **Infrastructure Setup**
   - Create Fly.io app: `flyctl apps create refrain-coding-api`
   - Provision Redis: `flyctl redis create`
   - Set up Modal account and authenticate
   - Set up Together.ai account and get API key

4. **Development Environment**
   - Create virtual environment
   - Install dependencies
   - Set up VS Code with Python extensions
   - Create `.env.example` with required variables

**Deliverables:**
- ✅ Repository initialized with proper structure
- ✅ Database schema created
- ✅ Infrastructure provisioned
- ✅ Development environment working

**Acceptance Criteria:**
- `pytest tests/` passes (even if empty)
- `ruff check .` has no errors
- `mypy .` has no type errors
- Database migrations run successfully

---

### Phase 1: MVP Core (Days 3-8)

**Goal:** Working API with local inference and basic routing

#### Sprint 1.1: API Gateway Foundation (Days 3-4)

**Tasks:**

**Day 3: Core API Structure**
1. **FastAPI Application** (`api/main.py`)
   - Create FastAPI app with CORS, error handling
   - Health check endpoint: `GET /health`
   - Metrics endpoint: `GET /metrics` (Prometheus format)
   - API versioning: `/api/v1/...`

2. **Request/Response Schemas** (`api/schemas.py`)
   ```python
   class CompletionRequest(BaseModel):
       messages: List[Message]
       model: str = "auto"
       temperature: float = 0.7
       max_tokens: int = 4096
       user_skill_level: str = "intermediate"
       project_context: Optional[ProjectContext] = None

   class CompletionResponse(BaseModel):
       id: str
       model: str
       choices: List[Choice]
       usage: Usage
       cost: float
       tier: str
       teaching_moments: List[TeachingMoment] = []
   ```

3. **Authentication Middleware** (`api/middleware/auth.py`)
   - Validate API keys
   - Rate limiting (per user, per hour)
   - Usage tracking

**Day 4: Database & Caching**
1. **SQLAlchemy Models** (`api/models.py`)
   - `APIUsage` model for tracking requests
   - Helper functions for querying usage stats

2. **Redis Cache Client** (`utils/caching.py`)
   - Connect to Redis
   - Get/set with TTL
   - Cache key generation (hash of request)

3. **Metrics Collection** (`utils/metrics.py`)
   - Prometheus counters and histograms
   - Track: request count, latency, cost, tier distribution

**Deliverables:**
- ✅ API gateway running on `localhost:8000`
- ✅ `/health` returns 200 OK
- ✅ `/metrics` returns Prometheus metrics
- ✅ Database writes usage data
- ✅ Redis caching works

**Test:**
```bash
curl -X POST http://localhost:8000/api/v1/chat/completions \
  -H "Authorization: Bearer test-key" \
  -H "Content-Type: application/json" \
  -d '{"messages": [{"role": "user", "content": "Hello"}]}'
# Should return 200 with mock response
```

#### Sprint 1.2: Local Inference (Days 5-6)

**Tasks:**

**Day 5: Model Setup**
1. **Download Script** (`scripts/download_models.py`)
   ```python
   def download_model(model_name: str, quantization: str = "Q4_K_M"):
       """Download GGUF model from HuggingFace"""
       url = get_model_url(model_name, quantization)
       download_with_progress_bar(url, f"models/{model_name}.gguf")

   # Download both models
   download_model("codellama-7b-instruct")
   download_model("phi-3-mini-instruct")
   ```

2. **llama.cpp Integration** (`inference/local/engine.py`)
   ```python
   from llama_cpp import Llama

   class LocalInferenceEngine:
       def __init__(self):
           self.codellama = Llama(
               model_path="models/codellama-7b-instruct.Q4_K_M.gguf",
               n_ctx=8192,
               n_threads=4,
               verbose=False
           )
           self.phi3 = Llama(
               model_path="models/phi-3-mini-instruct.Q4_K_M.gguf",
               n_ctx=16384,
               n_threads=4,
               verbose=False
           )

       def generate(self, model: str, messages: List[Message],
                    temperature: float, max_tokens: int) -> str:
           engine = self.codellama if model == "codellama-7b" else self.phi3

           response = engine.create_chat_completion(
               messages=[msg.dict() for msg in messages],
               temperature=temperature,
               max_tokens=max_tokens
           )

           return response["choices"][0]["message"]["content"]
   ```

**Day 6: Integration**
1. **Tier 1 Service** (`api/services/tier1_service.py`)
   - Initialize local models on startup
   - Handle inference requests
   - Track tokens and latency
   - Error handling and fallback

2. **Model Router** (`inference/router.py`)
   ```python
   def route_request(request: CompletionRequest) -> ModelTier:
       # Complexity analysis
       complexity = analyze_complexity(request)

       # Skill-based threshold
       threshold = get_threshold(request.user_skill_level)

       # Routing logic
       if complexity < 0.3:
           return ModelTier.LOCAL
       elif complexity < threshold:
           return ModelTier.MEDIUM  # Not implemented yet, fallback to local
       else:
           return ModelTier.LARGE  # Not implemented yet, fallback to local
   ```

3. **Integration Testing**
   - Test with various prompts
   - Measure latency (<2s target)
   - Verify quality of responses
   - Test error cases (model not loaded, etc.)

**Deliverables:**
- ✅ CodeLlama-7B and Phi-3-mini loaded and working
- ✅ Inference endpoint returns real AI responses
- ✅ Latency under 2 seconds for simple prompts
- ✅ Routing logic selects appropriate model

**Test:**
```bash
curl -X POST http://localhost:8000/api/v1/chat/completions \
  -H "Authorization: Bearer test-key" \
  -d '{
    "messages": [
      {"role": "user", "content": "Write a Python function to reverse a string"}
    ],
    "user_skill_level": "beginner"
  }'
# Should return actual AI-generated code
```

#### Sprint 1.3: Deployment & Testing (Days 7-8)

**Day 7: Fly.io Deployment**
1. **Dockerfile**
   ```dockerfile
   FROM python:3.11-slim

   WORKDIR /app

   # Install dependencies
   COPY pyproject.toml .
   RUN pip install -e .

   # Download models (during build)
   COPY scripts/download_models.py scripts/
   RUN python scripts/download_models.py

   # Copy application
   COPY . .

   EXPOSE 8000
   CMD ["uvicorn", "api.main:app", "--host", "0.0.0.0", "--port", "8000"]
   ```

2. **fly.toml Configuration**
   ```toml
   app = "refrain-coding-api"
   primary_region = "iad"

   [build]
     dockerfile = "Dockerfile"

   [env]
     PORT = "8000"

   [http_service]
     internal_port = 8000
     force_https = true
     auto_stop_machines = false  # Keep always running
     auto_start_machines = true

   [[vm]]
     cpu_kind = "shared"
     cpus = 4
     memory_mb = 8192  # 8GB for models
   ```

3. **Deploy**
   ```bash
   flyctl deploy
   ```

**Day 8: Integration with Refrain IDE**
1. **Update Refrain Frontend**
   - Add new API endpoint option in team member creation
   - Test creating team member with Refrain Coding API
   - Verify responses display correctly

2. **End-to-End Testing**
   - Create project in Refrain IDE
   - Create Tech Lead team member using Coding API
   - Send test messages
   - Verify conversation history persists
   - Check cost tracking in database

3. **Documentation**
   - Update API contracts
   - Write integration guide for other developers
   - Document known limitations

**Deliverables:**
- ✅ API deployed to Fly.io
- ✅ Refrain IDE successfully calling Coding API
- ✅ End-to-end user flow working
- ✅ Usage data saving to database

**Acceptance Criteria:**
- User can create team member with Coding API
- Team member responds to messages in <5s
- Responses are coherent and helpful
- Cost tracking shows $0.00 for local tier
- No crashes or errors in production logs

---

### Phase 2: Multi-Tier Scaling (Days 9-14)

**Goal:** Full three-tier system with GPU workers and premium models

#### Sprint 2.1: Modal GPU Worker (Days 9-11)

**Day 9: Modal Setup**
1. **Worker Script** (`workers/modal_worker.py`)
   ```python
   import modal

   stub = modal.Stub("refrain-coding-api")

   # Define GPU image
   image = modal.Image.debian_slim().pip_install([
       "vllm==0.4.0",
       "torch==2.2.0",
       "transformers==4.38.0"
   ])

   @stub.cls(
       gpu="A10G",  # Or T4 for cheaper option
       container_idle_timeout=120,  # Keep warm for 2 min
       image=image
   )
   class QwenWorker:
       def __enter__(self):
           from vllm import LLM, SamplingParams

           self.llm = LLM(
               model="Qwen/Qwen2.5-Coder-32B-Instruct",
               tensor_parallel_size=1,
               max_model_len=32768
           )

       @modal.method()
       def generate(self, messages: list, temperature: float,
                    max_tokens: int) -> str:
           from vllm import SamplingParams

           # Format messages for Qwen
           prompt = format_chat_prompt(messages)

           sampling = SamplingParams(
               temperature=temperature,
               max_tokens=max_tokens,
               top_p=0.95
           )

           outputs = self.llm.generate(prompt, sampling)
           return outputs[0].outputs[0].text
   ```

2. **Deploy Worker**
   ```bash
   modal deploy workers/modal_worker.py
   ```

**Day 10: API Integration**
1. **Modal Client** (`api/services/tier2_service.py`)
   ```python
   import modal

   class Tier2Service:
       def __init__(self):
           self.qwen_worker = modal.Function.lookup(
               "refrain-coding-api",
               "QwenWorker.generate"
           )
           self.deepseek_worker = modal.Function.lookup(
               "refrain-coding-api",
               "DeepSeekWorker.generate"
           )

       async def generate(self, model: str, messages: List[Message],
                          temperature: float, max_tokens: int) -> str:
           worker = (self.qwen_worker if model == "qwen-32b"
                     else self.deepseek_worker)

           # Call Modal function
           response = await worker.call(
               messages=[m.dict() for m in messages],
               temperature=temperature,
               max_tokens=max_tokens
           )

           return response
   ```

2. **Update Router**
   - Enable Tier 2 routing (previously fell back to local)
   - Add cost calculation for Modal requests
   - Implement retry logic for Modal failures

**Day 11: Testing & Optimization**
1. **Load Testing**
   - Test concurrent requests
   - Measure cold start time
   - Optimize batch processing

2. **Cost Analysis**
   - Track actual costs per request
   - Adjust routing thresholds if needed
   - Implement cost alerts

**Deliverables:**
- ✅ Modal GPU worker deployed and working
- ✅ Qwen-32B and DeepSeek-33B accessible via API
- ✅ Routing correctly uses Tier 2 for medium complexity
- ✅ Latency under 5 seconds for Tier 2

#### Sprint 2.2: Together.ai Integration (Days 12-13)

**Day 12: Together.ai Client**
1. **Tier 3 Service** (`api/services/tier3_service.py`)
   ```python
   import httpx

   class Tier3Service:
       def __init__(self):
           self.api_key = os.getenv("TOGETHER_API_KEY")
           self.base_url = "https://api.together.xyz/v1"

       async def generate(self, model: str, messages: List[Message],
                          temperature: float, max_tokens: int) -> str:
           async with httpx.AsyncClient() as client:
               response = await client.post(
                   f"{self.base_url}/chat/completions",
                   headers={
                       "Authorization": f"Bearer {self.api_key}",
                       "Content-Type": "application/json"
                   },
                   json={
                       "model": self.get_together_model_name(model),
                       "messages": [m.dict() for m in messages],
                       "temperature": temperature,
                       "max_tokens": max_tokens
                   },
                   timeout=30.0
               )

               data = response.json()
               return data["choices"][0]["message"]["content"]

       def get_together_model_name(self, model: str) -> str:
           mapping = {
               "llama-70b": "meta-llama/Llama-2-70b-chat-hf",
               "mixtral-8x22b": "mistralai/Mixtral-8x22B-Instruct-v0.1"
           }
           return mapping[model]
   ```

2. **Update Main Router**
   - Enable all three tiers
   - Implement fallback chain: Tier 3 → Tier 2 → Tier 1
   - Add detailed logging for tier selection

**Day 13: Context Compression**
1. **Context Manager** (`inference/context.py`)
   ```python
   def prepare_context(messages: List[Message], model: str) -> List[Message]:
       window_size = MODEL_CONTEXT_WINDOWS[model]

       total_tokens = count_tokens(messages)

       if total_tokens <= window_size * 0.8:
           return messages  # No compression needed

       # Keep system prompt + recent + summarize middle
       system = messages[0]
       recent = messages[-5:]
       middle = messages[1:-5]

       if len(middle) > 0:
           summary = create_summary(middle)
           compressed_middle = [Message(
               role="system",
               content=f"[Summary: {summary}]"
           )]
       else:
           compressed_middle = []

       return [system] + compressed_middle + recent
   ```

2. **Testing**
   - Test with long conversations (50+ messages)
   - Verify compression maintains context
   - Measure impact on response quality

**Deliverables:**
- ✅ Together.ai integration working
- ✅ All three tiers operational
- ✅ Context compression handles long conversations
- ✅ Fallback chain prevents failures

#### Sprint 2.3: Enhanced Caching (Day 14)

**Tasks:**
1. **Semantic Cache** (`utils/semantic_cache.py`)
   - Use sentence transformers for embeddings
   - Store in vector database (ChromaDB or Pinecone)
   - Find similar prompts (cosine similarity > 0.95)

2. **Pre-generated Responses** (`utils/templates.py`)
   - Common patterns: "create login form", "reverse string", etc.
   - Pre-generate with Tier 2 model
   - Store in PostgreSQL
   - Return immediately for exact matches

3. **Cache Analytics**
   - Track cache hit rate
   - Identify most common queries
   - Purge stale entries

**Deliverables:**
- ✅ Semantic caching reduces duplicate inference
- ✅ Cache hit rate > 40%
- ✅ Common queries return in <50ms

---

### Phase 3: Teaching & Polish (Days 15-18)

**Goal:** Production-ready with teaching moments and monitoring

#### Sprint 3.1: Teaching Moment Detection (Days 15-16)

**Day 15: Security & Performance Checks**
1. **Security Analyzer** (`utils/teaching.py`)
   - SQL injection detection
   - XSS vulnerability detection
   - Hardcoded secrets detection
   - Use regex + AST parsing

2. **Performance Analyzer**
   - Nested loop detection (O(n²))
   - Inefficient string concatenation
   - Missing pagination
   - N+1 query patterns

**Day 16: Integration & Testing**
1. **Integrate with Response Pipeline**
   - Extract code blocks from response
   - Run all analyzers
   - Append teaching moments to response

2. **Test Coverage**
   - Test with intentionally bad code
   - Verify all detectors trigger correctly
   - Ensure false positive rate < 10%

**Deliverables:**
- ✅ Teaching moments detected in responses
- ✅ Security issues flagged appropriately
- ✅ Performance tips helpful and accurate

#### Sprint 3.2: Monitoring & Alerts (Day 17)

**Tasks:**
1. **Grafana Dashboard**
   - Request volume by tier
   - Cost trends over time
   - Latency percentiles (p50, p95, p99)
   - Cache hit rate
   - Error rate

2. **Alerts**
   - Daily cost > $10
   - Error rate > 1%
   - Tier 3 usage > 20%
   - Cache hit rate < 30%
   - Latency p95 > 15s

3. **Sentry Integration**
   - Error tracking
   - Performance monitoring
   - Release tracking

**Deliverables:**
- ✅ Grafana dashboard deployed
- ✅ Alerts configured and tested
- ✅ Sentry capturing errors

#### Sprint 3.3: Documentation & Handoff (Day 18)

**Tasks:**
1. **API Documentation**
   - OpenAPI/Swagger spec
   - Example requests/responses
   - Authentication guide
   - Error codes reference

2. **Developer Guide**
   - How to add new models
   - How to adjust routing logic
   - How to add new teaching moment detectors
   - Deployment guide

3. **User Guide**
   - How to use in Refrain IDE
   - Skill level recommendations
   - Cost optimization tips

**Deliverables:**
- ✅ Complete API documentation
- ✅ Developer guide published
- ✅ User guide in Refrain IDE

---

## 📊 Success Metrics

### Phase 1 (MVP) Success Criteria
- [ ] API responds to requests in <5s
- [ ] Local inference working with CodeLlama & Phi-3
- [ ] Deployed to Fly.io and accessible
- [ ] Integrated with Refrain AI IDE
- [ ] Cost per request tracked in database
- [ ] No critical bugs or crashes

### Phase 2 (Scaling) Success Criteria
- [ ] All three tiers operational
- [ ] Routing algorithm working correctly
- [ ] Cache hit rate >40%
- [ ] Average cost per request <$0.015
- [ ] Tier distribution: ~50% local / 35% medium / 15% large
- [ ] Latency p95 <10s

### Phase 3 (Polish) Success Criteria
- [ ] Teaching moments detected in >30% of responses
- [ ] Grafana dashboard shows all key metrics
- [ ] Alerts firing correctly
- [ ] Complete documentation
- [ ] User satisfaction >4 stars (if collecting feedback)
- [ ] Ready for production use

---

## 🚀 Launch Checklist

### Before Production Launch
- [ ] All tests passing (`pytest tests/ -v`)
- [ ] Load testing completed (100 concurrent users)
- [ ] Security audit completed (OWASP top 10)
- [ ] Cost monitoring in place
- [ ] Alerts configured and tested
- [ ] Backup strategy for database
- [ ] Disaster recovery plan documented
- [ ] API rate limits configured
- [ ] Terms of service and usage limits defined

### Launch Day
- [ ] Deploy to production
- [ ] Verify health checks passing
- [ ] Test end-to-end flow
- [ ] Monitor metrics for first 24 hours
- [ ] Be ready to roll back if issues
- [ ] Announce to users

### Post-Launch (First Week)
- [ ] Monitor costs daily
- [ ] Review error logs
- [ ] Collect user feedback
- [ ] Tune routing thresholds based on data
- [ ] Document any issues and solutions

---

## 🔄 Iteration Plan

### Week 3-4: Data-Driven Improvements
Based on real usage data:
1. **Adjust Routing** - Optimize complexity thresholds
2. **Improve Caching** - Pre-generate more common responses
3. **Add Models** - Consider other specialized models
4. **Refine Teaching** - Improve detector accuracy

### Week 5-6: Advanced Features
- A/B testing different models
- User feedback integration (thumbs up/down)
- Advanced prompt engineering templates
- Response streaming for real-time feel

### Month 2: Scale & Optimize
- Optimize infrastructure costs
- Implement auto-scaling
- Add more teaching moment detectors
- Community template marketplace

---

## 📞 Support & Maintenance

### Ongoing Tasks
- **Weekly:** Review cost reports, adjust routing if needed
- **Monthly:** Update models to latest versions
- **Quarterly:** Security audit and dependency updates

### Common Issues & Solutions
See `ai_tech_lead_context.md` section: "Common Issues & Solutions"

### Escalation Path
1. Check Grafana for metrics
2. Check Sentry for errors
3. Check Fly.io logs: `flyctl logs -a refrain-coding-api`
4. Check Modal logs: `modal logs worker-qwen-32b`
5. If stuck: Review this master plan and requirements doc

---

## ✨ Final Thoughts

This is an **MVP**. Ship fast, learn from real usage, iterate.

**Remember:**
- Perfect is the enemy of shipped
- Data beats opinions — let metrics guide decisions
- Teaching moments are the differentiator
- Cost control is critical for sustainability

**Philosophy:**
"Training with weights on" — embrace model limitations as features that make better developers.

**Goal:**
Make Refrain sustainable by cutting AI costs 75% while providing a better learning experience.

**Now go build it! 🚀**

---

*Last Updated: November 14, 2024*
*Version: 1.0*
*Status: Ready for Implementation*
