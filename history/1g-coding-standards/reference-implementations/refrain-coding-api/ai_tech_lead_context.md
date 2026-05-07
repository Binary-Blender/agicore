# AI Tech Lead - Refrain Coding API Project
## Context Document for Continuity
### Last Updated: November 14, 2024

---

## 🎯 Your Role

You are the **Tech Lead** for the Refrain Coding API project. Your responsibilities:

1. **Backend Development** - Build FastAPI service with multi-tier model routing
2. **Architecture Decisions** - Design scalable, cost-effective inference system
3. **Model Integration** - Integrate local models (llama.cpp), GPU workers (Modal), and premium APIs (Together.ai)
4. **Documentation** - Keep sprint plans and implementation notes up to date
5. **Code Quality** - Ensure production-ready, secure, performant code

---

## 📁 Project Structure

### Repository
- **Location:** `/mnt/c/Users/Chris/Documents/_DevProjects/refrain-coding-api/`
- **Backend:** `/` (Python FastAPI - API gateway + local inference)
- **Workers:** `/workers` (Modal GPU worker scripts)
- **Docs:** `/_project_docs` (Requirements and plans)

### Key Directories
```
refrain-coding-api/
├── api/
│   ├── routes/          # FastAPI route handlers
│   ├── services/        # Business logic layer
│   ├── models/          # SQLAlchemy models
│   └── schemas/         # Pydantic request/response schemas
├── inference/
│   ├── local/           # llama.cpp integration for Tier 1
│   ├── router.py        # Model selection logic
│   └── context.py       # Context window management
├── workers/
│   ├── modal_worker.py  # Modal GPU inference (Tier 2)
│   └── together_worker.py # Together.ai wrapper (Tier 3)
├── utils/
│   ├── caching.py       # Redis caching layer
│   ├── metrics.py       # Prometheus metrics
│   └── teaching.py      # Teaching moment detection
├── migrations/          # Alembic database migrations
├── tests/               # Pytest test suite
├── _project_docs/
│   ├── refrain_coding_api_requirements.md  # Complete requirements
│   ├── AI_CODING_INSTRUCTIONS_ENHANCED.md  # Coding standards
│   └── ai_tech_lead_context.md             # THIS DOCUMENT
└── pyproject.toml       # Dependencies and config
```

---

## 🏗️ Tech Stack

### Core API (Tier 0)
- **Framework:** FastAPI
- **Language:** Python 3.11+
- **Database:** PostgreSQL (via existing Refrain AI IDE db)
- **Caching:** Redis
- **Metrics:** Prometheus + Grafana
- **Error Tracking:** Sentry

### Tier 1: Local Inference
- **Engine:** llama.cpp (Python bindings)
- **Models:**
  - CodeLlama-7B (4GB GGUF) - Code completion/simple queries
  - Phi-3-mini (3GB GGUF) - Fast responses, beginner-friendly
- **Platform:** Fly.io (same machine as API gateway)
- **RAM:** 8GB (shared with API)
- **CPU:** 4 cores

### Tier 2: Remote Medium (GPU)
- **Engine:** vLLM
- **Models:**
  - Qwen-32B-Coder - Strong coding, good reasoning
  - DeepSeek-Coder-33B - Specialized for code
- **Platform:** Modal (serverless GPU)
- **GPU:** A10G or T4 (auto-scale)
- **Cost:** ~$0.01/request

### Tier 3: Remote Large
- **Provider:** Together.ai
- **Models:**
  - Llama-70B - Strong general purpose
  - Mixtral-8x22B - Complex reasoning
- **Cost:** ~$0.05/request (still 10x cheaper than Claude)

### Deployment
- **API Gateway:** Fly.io
- **App Name:** `refrain-coding-api`
- **URL:** https://refrain-coding-api.fly.dev/api/v1
- **Parent Frontend:** https://refrain-web.fly.dev/

---

## 🎨 Architecture Patterns

### 1. Intelligent Model Routing
**Pattern:** Task complexity + user skill level determines model selection

**Algorithm:**
```python
def select_model(request: CompletionRequest) -> ModelTier:
    # User skill influences threshold
    skill_thresholds = {
        "beginner": 0.3,     # Use better models more often
        "intermediate": 0.6,
        "advanced": 0.8      # Prefer smaller models (teaching)
    }

    threshold = skill_thresholds.get(request.skill_level, 0.6)

    # Analyze prompt complexity
    complexity = analyze_complexity(request.messages)

    # Route to appropriate tier
    if complexity < 0.3:
        return "local"  # CodeLlama-7B or Phi-3-mini
    elif complexity < threshold:
        return "medium"  # Qwen-32B or DeepSeek-33B
    else:
        return "large"  # Llama-70B or Mixtral-8x22B
```

**Why:** Balance cost, quality, and teaching effectiveness

### 2. Context Window Management
**Pattern:** Compress conversation history for smaller models

**Strategy:**
- **Tier 1 (8k-16k):** Aggressive compression, keep only recent + critical context
- **Tier 2 (32k-64k):** Moderate compression, summarize older messages
- **Tier 3 (128k+):** Minimal compression, full context available

**Implementation:**
```python
def prepare_context(messages: List[Message], model: str) -> List[Message]:
    window_size = MODEL_CONTEXT_WINDOWS[model]

    if len(messages) fits in window:
        return messages

    # Keep system prompt + recent messages + compress middle
    system = messages[0]
    recent = messages[-5:]
    middle = compress_messages(messages[1:-5])

    return [system] + middle + recent
```

### 3. Three-Tier Caching
**Pattern:** Cache at multiple levels to minimize inference costs

**Levels:**
1. **Exact Match Cache** (Redis) - Same prompt = instant response (1ms)
2. **Semantic Cache** (Vector DB) - Similar prompts = fast response (10ms)
3. **Partial Response Cache** - Common code snippets pre-generated

**Invalidation:** 24-hour TTL, manual purge on model updates

### 4. Teaching Moment Detection
**Pattern:** Analyze responses for learning opportunities

**Detection:**
```python
def detect_teaching_moments(response: str, code: str) -> List[TeachingMoment]:
    moments = []

    # Security issues
    if has_security_issue(code):
        moments.append({
            "type": "security",
            "severity": "high",
            "explanation": "SQL injection vulnerability detected..."
        })

    # Performance issues
    if has_performance_issue(code):
        moments.append({
            "type": "performance",
            "tip": "Consider using a hash map instead of nested loops..."
        })

    # Best practices
    if violates_best_practice(code):
        moments.append({
            "type": "best_practice",
            "suggestion": "Extract this logic into a separate function..."
        })

    return moments
```

**Why:** Turn model limitations into teaching opportunities

### 5. Prompt Engineering Layer
**Pattern:** Optimize prompts for each model's strengths

**Per-Model Templates:**
```python
PROMPT_TEMPLATES = {
    "codellama-7b": {
        "system": "You are a helpful coding assistant. Be concise and practical.",
        "format": "markdown",
        "max_explanation": 100  # tokens
    },
    "qwen-32b": {
        "system": "You are an expert programmer. Provide detailed explanations.",
        "format": "markdown",
        "max_explanation": 300
    },
    "llama-70b": {
        "system": "You are a senior software architect. Think step-by-step.",
        "format": "markdown",
        "max_explanation": 500
    }
}
```

---

## 📋 Current Project Status

### Phase 0: Planning (CURRENT)
**Tasks:**
- [x] Requirements documentation
- [x] Coding standards defined
- [x] Tech stack selected
- [ ] Master plan created
- [ ] Sprint breakdown defined

### Phase 1: MVP Core (Week 1-2)
**Must-Have Features:**
- API gateway with auth
- Local inference (CodeLlama-7B)
- Model routing logic
- Basic caching (exact match)
- Integration with Refrain AI IDE

**Deliverables:**
- Working API endpoint `/v1/chat/completions`
- Health checks and metrics
- Database integration (api_usage table)
- Deployed to Fly.io

### Phase 2: Multi-Tier Scaling (Week 3-4)
**Should-Have Features:**
- Modal GPU worker (Qwen-32B)
- Together.ai integration (Llama-70B)
- Semantic caching
- Context compression
- Teaching moment detection

**Deliverables:**
- Full three-tier routing
- Cost tracking per request
- Performance dashboard

### Phase 3: Polish & Optimization (Week 5-6)
**Nice-to-Have Features:**
- A/B testing different models
- Advanced prompt engineering
- Response streaming
- User feedback loop
- Documentation for other developers

---

## 🎯 Core Innovation

### "Training with Weights On"
**Philosophy:** Less powerful models are a feature, not a bug

**Why This Matters:**
1. **Beginners** get simpler, more understandable responses
2. **Cost** is 75% lower than Claude ($0.125 vs $0.50/project)
3. **Teaching** moments emerge from model limitations
4. **Control** over quality vs speed vs cost tradeoffs

**Example:**
```
User (Beginner): "Build a login form"

Tier 1 (CodeLlama-7B):
- Simple, straightforward implementation
- Basic validation
- Clear comments
→ Teaching moment: "This is a good start, but consider adding..."

User (Advanced): "Build a login form"

Tier 3 (Llama-70B):
- Advanced patterns (form libraries, validation schemas)
- Security best practices
- Edge case handling
→ Expects more from advanced users
```

---

## 📊 Cost Model

### Target Costs (per project lifecycle)
- **Tier 1 Local:** ~$0.00 (infrastructure only, ~$10/month base)
- **Tier 2 Medium:** ~$0.05 (5 requests @ $0.01 each)
- **Tier 3 Large:** ~$0.075 (1-2 requests @ $0.05 each)
- **Total:** ~$0.125/project (vs $0.50 with Claude)

### Infrastructure Costs
- **Fly.io (API + Local Models):** $25/month (4 CPU, 8GB RAM)
- **Modal (GPU Workers):** $50/month (pay-per-use, ~500 requests)
- **Together.ai Credits:** $50/month (~1000 premium requests)
- **Total:** ~$125/month for 100 users

### Break-Even Analysis
- **100 users × 10 projects/month = 1000 projects**
- **Cost with Claude:** $500/month
- **Cost with Refrain:** $125/month
- **Savings:** 75%

---

## 🤝 Integration with Refrain AI IDE

### API Contract
**Endpoint:** `POST /api/v1/chat/completions`

**Request:**
```typescript
{
  "messages": [
    {"role": "system", "content": "You are a Tech Lead..."},
    {"role": "user", "content": "Build a login form"}
  ],
  "model": "auto",  // or specific: "codellama-7b", "qwen-32b", "llama-70b"
  "temperature": 0.7,
  "max_tokens": 4096,
  "user_skill_level": "intermediate",  // NEW: for routing
  "project_context": {  // NEW: for better responses
    "phase": "architecture",
    "tech_stack": ["React", "FastAPI"],
    "current_file": "frontend/components/Login.tsx"
  }
}
```

**Response:**
```typescript
{
  "id": "req_abc123",
  "model": "qwen-32b",  // Actual model used
  "choices": [{
    "message": {
      "role": "assistant",
      "content": "I'll create a login form..."
    },
    "finish_reason": "stop"
  }],
  "usage": {
    "prompt_tokens": 450,
    "completion_tokens": 850,
    "total_tokens": 1300
  },
  "cost": 0.013,  // NEW: actual cost
  "tier": "medium",  // NEW: which tier served this
  "teaching_moments": [  // NEW: detected learning opportunities
    {
      "type": "security",
      "message": "Consider adding CSRF protection..."
    }
  ]
}
```

### Database Schema Addition
```sql
-- Add to existing Refrain AI IDE database
CREATE TABLE api_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id),
    team_member_id UUID REFERENCES team_members(id),
    model_tier VARCHAR(20),  -- 'local', 'medium', 'large'
    model_name VARCHAR(100),
    prompt_tokens INTEGER,
    completion_tokens INTEGER,
    total_tokens INTEGER,
    cost DECIMAL(10, 6),
    latency_ms INTEGER,
    user_skill_level VARCHAR(20),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_api_usage_project ON api_usage(project_id);
CREATE INDEX idx_api_usage_date ON api_usage(created_at);
```

### Frontend Integration
**No changes required to existing team member system!**

Just change the `apiEndpoint` field:
- Old: `https://api.anthropic.com/v1/messages`
- New: `https://refrain-coding-api.fly.dev/api/v1/chat/completions`

The Refrain Coding API uses OpenAI-compatible format, so existing code works as-is.

---

## 🛠️ Development Workflow

### Local Development
```bash
# Navigate to project
cd /mnt/c/Users/Chris/Documents/_DevProjects/refrain-coding-api

# Set up virtual environment
python3 -m venv venv
source venv/bin/activate  # or venv\Scripts\activate on Windows

# Install dependencies
pip install -e ".[dev]"

# Download local models (one-time setup)
python scripts/download_models.py

# Start Redis (required for caching)
docker run -d -p 6379:6379 redis:7-alpine

# Run API server
uvicorn api.main:app --reload --port 8000

# Run tests
pytest tests/ -v

# Check code quality
ruff check .
mypy .
```

### Deploying to Fly.io
```bash
# Build and deploy API gateway
flyctl deploy -a refrain-coding-api

# Set secrets
flyctl secrets set -a refrain-coding-api \
  TOGETHER_API_KEY="..." \
  MODAL_API_KEY="..." \
  SENTRY_DSN="..."

# Check logs
flyctl logs -a refrain-coding-api

# Monitor metrics
flyctl metrics -a refrain-coding-api
```

### Deploying Modal Workers
```bash
# Deploy GPU worker
modal deploy workers/modal_worker.py

# Test worker
modal run workers/modal_worker.py --test

# Check worker logs
modal logs worker-qwen-32b
```

---

## 📦 Model Management

### Local Model Setup (Tier 1)
```bash
# Download quantized GGUF models
scripts/download_models.py
  → models/codellama-7b-instruct.Q4_K_M.gguf (4.2GB)
  → models/phi-3-mini-instruct.Q4_K_M.gguf (2.8GB)

# Verify models load correctly
python scripts/test_local_models.py
```

### Model Loading
```python
from llama_cpp import Llama

# Load once at startup, reuse for all requests
codellama = Llama(
    model_path="models/codellama-7b-instruct.Q4_K_M.gguf",
    n_ctx=8192,  # Context window
    n_threads=4,  # CPU cores
    n_gpu_layers=0,  # CPU-only on Fly.io
    verbose=False
)

# Inference
response = codellama.create_chat_completion(
    messages=[
        {"role": "system", "content": "You are a coding assistant."},
        {"role": "user", "content": "Write a Python function to reverse a string"}
    ],
    temperature=0.7,
    max_tokens=1024
)
```

---

## 🐛 Common Issues & Solutions

### Issue: Model loading fails (OOM)
**Cause:** Model too large for available RAM
**Solution:** Use smaller quantization (Q4_K_M instead of Q5_K_M)

### Issue: Modal worker cold start slow (30s+)
**Cause:** First request needs to load model into GPU
**Solution:** Keep 1 warm instance with `modal.Image.warm(min_instances=1)`

### Issue: Context window exceeded
**Cause:** Conversation history too long
**Solution:** Implement context compression in `inference/context.py`

### Issue: Together.ai rate limit
**Cause:** Too many requests to Tier 3
**Solution:** Implement request queuing and retry with exponential backoff

### Issue: Cost exceeding budget
**Cause:** Routing too many requests to expensive tiers
**Solution:** Tune complexity thresholds in `inference/router.py`

---

## 📊 Key Metrics to Track

### Performance
- **Latency by tier:**
  - Tier 1 (local): <2s
  - Tier 2 (Modal): <5s
  - Tier 3 (Together): <8s
- **Cache hit rate:** >40%
- **95th percentile response time:** <10s

### Cost
- **Average cost per request:** <$0.015
- **Tier distribution:** 50% local / 35% medium / 15% large
- **Monthly infrastructure:** <$150
- **Cost per project:** <$0.15

### Quality
- **User satisfaction:** Track thumbs up/down
- **Error rate:** <1%
- **Teaching moments detected:** Track and analyze

---

## 🎯 Design Decisions & Rationale

### Why llama.cpp for local inference?
**Decision:** Use llama.cpp (C++ with Python bindings)
**Rationale:**
- Fastest CPU inference available
- Low memory footprint with quantization
- Battle-tested, production-ready
- No GPU required

### Why Modal for medium tier?
**Decision:** Modal over self-hosted GPU
**Rationale:**
- Serverless = pay only for usage
- Auto-scaling
- No infrastructure management
- Fast cold starts (<10s)

### Why Together.ai for large tier?
**Decision:** Together.ai over OpenAI/Anthropic
**Rationale:**
- 10x cheaper than Claude
- Open source models (Llama, Mixtral)
- Good performance
- API compatible with OpenAI

### Why skill-based routing?
**Decision:** Route based on user skill + task complexity
**Rationale:**
- Beginners benefit from simpler responses
- Advanced users appreciate powerful models
- Maximizes learning effectiveness
- Optimizes cost

---

## 🚀 Future Considerations

### Not Implemented Yet (Phase 2+)
**Advanced Routing:**
- A/B testing different models on same task
- Learn from user feedback (thumbs up/down)
- Per-user model preferences
- Time-of-day routing (use cheaper models during peak)

**Enhanced Caching:**
- Vector similarity search for semantic cache
- Pre-generate common responses (login forms, etc.)
- Multi-level cache with Redis + PostgreSQL

**Better Teaching:**
- Interactive tutorials triggered by teaching moments
- Progress tracking for learning paths
- Gamification (badges for good practices)

**Monitoring:**
- Real-time cost dashboard
- Model performance comparison
- User journey analytics

---

## 📝 How to Resume Work

### When Starting Implementation

1. **Read Master Plan:** Understand overall architecture
2. **Review Phase 1 Goals:** Focus on MVP features
3. **Set Up Environment:**
   - Install dependencies
   - Download local models
   - Start Redis
   - Configure environment variables
4. **Create Todo List:** Break down Phase 1 into daily tasks
5. **Start with API Gateway:** Build core FastAPI app first
6. **Add Tier 1 Next:** Get local inference working
7. **Test Thoroughly:** Each component before integration
8. **Deploy Incrementally:** Don't wait for everything

### When Continuing After Context Reset

1. **Check Git Log:** See what was implemented
2. **Run Tests:** Verify existing functionality
3. **Read Updated Docs:** Check if architecture changed
4. **Review TODO Comments:** Look for `# TODO:` in code
5. **Continue Next Phase:** Pick up where you left off

---

## 💡 Tips for Success

### Do's ✅
- **Start simple** - Get local inference working first
- **Cache aggressively** - Reduce costs dramatically
- **Monitor costs** - Track spending per request
- **Optimize prompts** - Smaller models work better with good prompts
- **Test with real data** - Don't rely on mocks for model responses
- **Document model behavior** - Note quirks and workarounds
- **Keep models updated** - New versions improve regularly
- **Validate responses** - Check for hallucinations

### Don'ts ❌
- **Don't over-engineer** - MVP first, optimize later
- **Don't skip caching** - Costs will spiral
- **Don't ignore cold starts** - Modal workers need warming
- **Don't trust all responses** - Smaller models hallucinate more
- **Don't hardcode model selection** - Use routing algorithm
- **Don't forget rate limits** - Together.ai has limits
- **Don't skip monitoring** - You need visibility into costs
- **Don't deploy without testing** - Models behave differently in production

---

## 🔗 Important Links

### Deployed Services
- **API Gateway:** https://refrain-coding-api.fly.dev/api/v1
- **Parent Application:** https://refrain-web.fly.dev/
- **Metrics Dashboard:** https://refrain-coding-api.fly.dev/metrics (Grafana)

### Documentation
- **Requirements:** `refrain_coding_api_requirements.md`
- **Coding Standards:** `AI_CODING_INSTRUCTIONS_ENHANCED.md`
- **This Document:** `ai_tech_lead_context.md`

### External Resources
- **llama.cpp:** https://github.com/ggerganov/llama.cpp
- **Modal:** https://modal.com/docs
- **Together.ai:** https://docs.together.ai/
- **FastAPI:** https://fastapi.tiangolo.com/
- **Redis:** https://redis.io/docs/

### Model Resources
- **CodeLlama:** https://huggingface.co/codellama
- **Phi-3:** https://huggingface.co/microsoft/Phi-3-mini
- **Qwen-Coder:** https://huggingface.co/Qwen/Qwen2.5-Coder-32B
- **DeepSeek-Coder:** https://huggingface.co/deepseek-ai/deepseek-coder-33b

---

## 🎬 Quick Start Commands

```bash
# Set up project
cd /mnt/c/Users/Chris/Documents/_DevProjects/refrain-coding-api
python3 -m venv venv
source venv/bin/activate
pip install -e ".[dev]"

# Download models (first time only)
python scripts/download_models.py

# Start dependencies
docker run -d -p 6379:6379 redis:7-alpine

# Run API
uvicorn api.main:app --reload

# Run tests
pytest tests/ -v

# Deploy to Fly.io
flyctl deploy -a refrain-coding-api

# Deploy Modal workers
modal deploy workers/modal_worker.py

# Check everything
curl https://refrain-coding-api.fly.dev/health
```

---

## 📞 When to Ask User

**Ask When:**
- Major architectural decisions (e.g., switch from Modal to different provider)
- Budget tradeoffs (e.g., prioritize cost vs quality)
- Model selection changes (e.g., use different base models)
- Integration conflicts with Refrain AI IDE
- Security/privacy concerns

**Don't Ask When:**
- Standard Python patterns (use best practices)
- FastAPI implementation details (follow framework conventions)
- Model prompt engineering (experiment and iterate)
- Caching strategies (implement standard approaches)
- Monitoring setup (use Prometheus/Grafana)

---

## ✨ Final Notes

**You are building the cost-effective backbone of Refrain.** This API will make the entire platform sustainable. Every optimization matters.

**Your goal:** Deliver intelligent, cost-efficient AI inference that:
1. **Saves money** (75% vs Claude)
2. **Teaches users** (leverage model limitations)
3. **Scales effortlessly** (serverless architecture)
4. **Maintains quality** (smart routing)

**Philosophy:** "Training with weights on" - less powerful models are a feature that makes better developers.

**Remember:** This is an MVP. Ship fast, learn, iterate. The perfect is the enemy of the shipped.

**Good luck, Tech Lead! 🚀**

---

*This document is your compass. When in doubt, refer back to it. When you learn something new, update it.*

*Last updated: November 14, 2024*
*Version: 1.0*
*Status: Planning Phase*
