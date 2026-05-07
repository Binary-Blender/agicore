# Refrain Coding API
## Requirements Document v1.2
### November 2024

---

## 🎯 Executive Summary

Build the Refrain Coding API - a standalone service that provides open source language model inference for the Refrain IDE. This API will offer a cost-effective alternative to Claude, deliberately using "less powerful" models as a teaching feature to help users learn proper development practices.

**Core Philosophy:** "Training with weights on" - Users learn better architecture and debugging skills when the AI requires clear guidance.

---

## 📋 Functional Requirements

### 1. API Endpoints

The service must provide REST API endpoints compatible with Refrain's existing AI interface:

```typescript
// Primary endpoint
POST /v1/completions
{
  "model": string,        // "llama-70b", "qwen-32b", "codellama-7b", etc.
  "messages": Message[],  // Chat history
  "role": string,        // "frontend", "backend", "architect", etc.
  "temperature": number,  // Optional, default 0.7
  "max_tokens": number,   // Optional, default 2000
  "user_id": string,     // For tracking/analytics
  "project_id": string,  // For context isolation
  "skill_level": string  // "beginner", "intermediate", "advanced"
}

// Response
{
  "id": string,
  "choices": [{
    "message": {
      "role": "assistant",
      "content": string
    }
  }],
  "usage": {
    "prompt_tokens": number,
    "completion_tokens": number,
    "estimated_cost": number
  },
  "model_used": string,
  "teaching_moments": string[]  // Optional educational hints
}

// Model listing endpoint
GET /v1/models
{
  "models": [
    {
      "id": string,
      "name": string,
      "size": string,
      "capabilities": string[],
      "cost_per_1k_tokens": number,
      "recommended_for": string[]
    }
  ]
}

// Health check
GET /health
{
  "status": "healthy",
  "models_available": string[],
  "current_load": number
}
```

### 2. Model Requirements

#### Required Models (Priority Order)

**Tier 1: Local Small Models (Run on Fly.io)**
- **CodeLlama-7B-Instruct** (Quantized to 4-bit)
  - Use case: Basic code generation, simple tasks
  - Memory: 4-6GB
  - Good for: Teaching fundamentals

- **Phi-3-mini** (3.8B parameters)
  - Use case: Documentation, comments
  - Memory: 2-3GB
  - Good for: Lightweight tasks

**Tier 2: Remote Medium Models (Modal/RunPod)**
- **Qwen-2.5-Coder-32B-Instruct**
  - Use case: Primary coding workload
  - Cost: ~$0.01 per request
  - Good for: Real implementation work

- **DeepSeek-Coder-33B-Instruct**
  - Use case: Alternative coding model
  - Cost: ~$0.01 per request
  - Good for: Python/JavaScript specialization

**Tier 3: Remote Large Models (Together.ai/Replicate)**
- **Llama-3.3-70B-Instruct**
  - Use case: Complex reasoning, architecture
  - Cost: ~$0.05 per request
  - Good for: Beginners needing more help

- **Mixtral-8x22B-Instruct**
  - Use case: General purpose backup
  - Cost: ~$0.03 per request
  - Good for: Documentation and planning

### 3. Intelligent Routing

```python
class ModelRouter:
    """Route requests to appropriate models based on context"""
    
    def select_model(request):
        # Skill-based routing
        if request.skill_level == "beginner":
            complexity_threshold = 0.3  # Use better models more often
        elif request.skill_level == "intermediate":
            complexity_threshold = 0.6  # Balance
        else:  # advanced
            complexity_threshold = 0.8  # Prefer harder models
        
        # Task-based routing
        task_complexity = analyze_prompt_complexity(request.messages)
        
        if task_complexity < 0.3:
            return "codellama-7b"  # Simple task, local model
        elif task_complexity < complexity_threshold:
            return "qwen-32b"      # Medium task, remote GPU
        else:
            return "llama-70b"     # Complex task, premium model
        
        # Role-based overrides
        if request.role == "architect":
            return "llama-70b"  # Always use best for architecture
        elif request.role == "documentation":
            return "phi-3-mini"  # Docs don't need powerful models
```

### 4. Teaching Features

#### Mistake Detection System
```python
class TeachingMomentDetector:
    def analyze_response(code_output, context):
        teaching_moments = []
        
        # Check for common issues
        if "password" in code_output and not "bcrypt" in code_output:
            teaching_moments.append({
                "type": "security",
                "message": "Plain text password detected. Review authentication security."
            })
        
        if "SELECT * FROM" in code_output:
            teaching_moments.append({
                "type": "performance",
                "message": "Consider selecting specific columns for better performance."
            })
        
        return teaching_moments
```

#### Difficulty Progression
```yaml
user_progression:
  week_1:
    model_preference: "llama-70b"
    error_injection: false
    hints_enabled: true
    
  week_2:
    model_preference: "qwen-32b"
    error_injection: false
    hints_enabled: true
    
  week_3:
    model_preference: "codellama-7b"
    error_injection: true  # Deliberate mistakes for learning
    hints_enabled: false
    
  graduated:
    model_preference: "user_choice"
    unlock_advanced_features: true
```

---

## 🏗️ Technical Architecture

### Infrastructure Setup

#### Component 1: API Gateway (Fly.io)
```dockerfile
# Dockerfile
FROM python:3.11-slim

# Install dependencies
RUN pip install fastapi uvicorn httpx pydantic redis

# Install llama.cpp for local inference
RUN apt-get update && apt-get install -y build-essential
RUN pip install llama-cpp-python

# Copy application
COPY ./app /app
WORKDIR /app

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080"]
```

```toml
# fly.toml
app = "refrain-coding-api"
primary_region = "sjc"

[http_service]
  internal_port = 8080
  force_https = true
  auto_stop_machines = false
  auto_start_machines = true

[vm]
  cpu_kind = "shared"
  cpus = 4
  memory_mb = 8192
```

#### Component 2: GPU Workers (Modal)
```python
# modal_inference.py
import modal
from typing import List, Dict

stub = modal.Stub("refrain-gpu-inference")

# Define the container image
inference_image = (
    modal.Image.debian_slim()
    .pip_install("vllm", "transformers", "torch")
)

@stub.function(
    image=inference_image,
    gpu=modal.gpu.A10G(),
    memory=32768,
    timeout=300,
    keep_warm=1,  # Keep 1 instance warm
)
def run_inference(
    model_name: str,
    prompt: str,
    max_tokens: int = 2000,
    temperature: float = 0.7
) -> str:
    from vllm import LLM, SamplingParams
    
    # Model name mapping
    models = {
        "qwen-32b": "Qwen/Qwen2.5-Coder-32B-Instruct",
        "deepseek-33b": "deepseek-ai/deepseek-coder-33b-instruct"
    }
    
    llm = LLM(model=models[model_name])
    sampling_params = SamplingParams(
        temperature=temperature,
        max_tokens=max_tokens
    )
    
    outputs = llm.generate([prompt], sampling_params)
    return outputs[0].outputs[0].text

@stub.webhook(method="POST")
def inference_endpoint(request: Dict):
    return run_inference(
        model_name=request["model"],
        prompt=request["prompt"],
        max_tokens=request.get("max_tokens", 2000),
        temperature=request.get("temperature", 0.7)
    )
```

#### Component 3: External Provider Integration
```python
# providers.py
import httpx
from typing import Dict, List

class ProviderRouter:
    def __init__(self):
        self.providers = {
            "together": TogetherProvider(),
            "replicate": ReplicateProvider(),
            "modal": ModalProvider()
        }
    
class TogetherProvider:
    BASE_URL = "https://api.together.xyz/v1/completions"
    
    async def complete(self, request: Dict) -> Dict:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                self.BASE_URL,
                json={
                    "model": self.map_model(request["model"]),
                    "prompt": request["prompt"],
                    "max_tokens": request.get("max_tokens", 2000),
                    "temperature": request.get("temperature", 0.7)
                },
                headers={"Authorization": f"Bearer {TOGETHER_API_KEY}"}
            )
            return response.json()
    
    def map_model(self, model: str) -> str:
        mapping = {
            "llama-70b": "meta-llama/Llama-3.3-70B-Instruct",
            "mixtral-8x22b": "mistralai/Mixtral-8x22B-Instruct-v0.1"
        }
        return mapping.get(model, model)
```

### Database Schema

```sql
-- Track usage and performance
CREATE TABLE inference_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(255),
    project_id VARCHAR(255),
    model_used VARCHAR(100),
    input_tokens INTEGER,
    output_tokens INTEGER,
    latency_ms INTEGER,
    cost_cents DECIMAL(10, 4),
    skill_level VARCHAR(50),
    role VARCHAR(100),
    teaching_moments JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Community patterns for future fine-tuning
CREATE TABLE community_patterns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pattern_type VARCHAR(100),  -- 'auth', 'api', 'database', etc.
    prompt TEXT,
    response TEXT,
    success_score DECIMAL(3, 2),  -- 0.0 to 1.0
    user_feedback JSONB,
    model_used VARCHAR(100),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Model performance tracking
CREATE TABLE model_metrics (
    model_name VARCHAR(100),
    date DATE,
    total_requests INTEGER,
    avg_latency_ms INTEGER,
    error_rate DECIMAL(5, 4),
    avg_user_satisfaction DECIMAL(3, 2),
    total_cost_cents DECIMAL(10, 2),
    PRIMARY KEY (model_name, date)
);
```

---

## 🔧 Implementation Phases

### Phase 1: MVP (Week 1-2)
- [ ] Deploy basic FastAPI server on Fly.io
- [ ] Integrate CodeLlama-7B locally
- [ ] Set up Modal account and deploy Qwen-32B
- [ ] Implement basic routing logic
- [ ] Create simple web UI for testing

### Phase 2: Multi-Model Support (Week 3-4)
- [ ] Add Together.ai integration
- [ ] Implement intelligent routing
- [ ] Add response caching with Redis
- [ ] Set up monitoring and analytics
- [ ] Add teaching moment detection

### Phase 3: Optimization (Week 5-6)
- [ ] Implement request queuing
- [ ] Add fallback models
- [ ] Optimize cold start times
- [ ] Add rate limiting per user
- [ ] Implement cost tracking

### Phase 4: Community Features (Month 2)
- [ ] Collect successful patterns
- [ ] Build pattern recommendation engine
- [ ] Prepare for fine-tuning pipeline
- [ ] Add A/B testing framework
- [ ] Create admin dashboard

---

## 💰 Cost Projections

### For 100 Active Users (1000 projects/month)

**Infrastructure:**
- Fly.io API Server: $20/mo (2 instances)
- Fly.io Edge LLM: $20/mo (8GB instance)
- Redis Cache: $10/mo
- PostgreSQL: $15/mo
- **Total Fixed: $65/mo**

**Variable Costs (per 1000 projects):**
- Local inference (40% of requests): $0 (included in fixed)
- Modal GPU (40% of requests): ~$40
- Together.ai (20% of requests): ~$20
- **Total Variable: ~$60/mo**

**Total Monthly Cost: ~$125**
**Cost per project: ~$0.125**
**Compare to Claude: ~$0.50 per project**
**Savings: 75%**

---

## 📊 Success Metrics

### Technical Metrics
- Average response time < 3 seconds
- Model availability > 99.5%
- Cost per request < $0.02
- Cache hit rate > 30%

### Educational Metrics
- Users advancing skill levels
- Reduction in error rates over time
- Increase in complex projects attempted
- Community pattern contributions

### Business Metrics
- Cost savings vs Claude
- User retention improvement
- Project completion rates
- Community engagement

---

## 🔒 Security Requirements

### API Security
- API key authentication required
- Rate limiting per user/project
- Request sanitization
- Output filtering for harmful content

### Data Privacy
- No storage of sensitive code
- Anonymized pattern collection
- User consent for community learning
- GDPR compliance for EU users

### Model Security
- Prompt injection prevention
- Output validation
- Resource limits per request
- Automatic timeout handling

---

## 📝 API Integration Example

```javascript
// Refrain integration example
class RefrainCodingAPI {
  constructor() {
    this.baseUrl = process.env.REFRAIN_CODING_API_URL || "https://refrain-coding-api.fly.dev";
    this.apiKey = process.env.REFRAIN_CODING_API_KEY;
  }
  
  async generateCode(params) {
    const response = await fetch(`${this.baseUrl}/v1/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        model: this.selectModel(params),
        messages: params.messages,
        role: params.agentRole,
        skill_level: params.userSkillLevel,
        user_id: params.userId,
        project_id: params.projectId
      })
    });
    
    const result = await response.json();
    
    // Handle teaching moments
    if (result.teaching_moments?.length > 0) {
      this.displayTeachingMoments(result.teaching_moments);
    }
    
    return result.choices[0].message.content;
  }
  
  selectModel(params) {
    // Can be overridden by user preference
    if (params.userPreferredModel) {
      return params.userPreferredModel;
    }
    
    // Otherwise use skill-based defaults
    const modelsBySkill = {
      beginner: "llama-70b",
      intermediate: "qwen-32b",
      advanced: "codellama-7b"
    };
    
    return modelsBySkill[params.userSkillLevel] || "qwen-32b";
  }
}
```

---

## 🚀 Deployment Checklist

### Prerequisites
- [ ] Fly.io account with payment method
- [ ] Modal.com account
- [ ] Together.ai API key (optional)
- [ ] PostgreSQL database
- [ ] Redis instance
- [ ] Domain name for API (refrain-coding-api.yourdomain.com)

### Environment Variables
```bash
# Required
FLY_API_TOKEN=xxx
MODAL_TOKEN_ID=xxx
MODAL_TOKEN_SECRET=xxx
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
REFRAIN_CODING_API_KEY=xxx  # Your API key for authentication

# Optional (for premium models)
TOGETHER_API_KEY=xxx
REPLICATE_API_TOKEN=xxx

# Configuration
DEFAULT_MODEL=qwen-32b
MAX_REQUESTS_PER_MINUTE=60
CACHE_TTL_SECONDS=3600
ENABLE_TEACHING_MOMENTS=true
```

### Monitoring Setup
- [ ] Sentry for error tracking
- [ ] Prometheus for metrics
- [ ] Grafana dashboard
- [ ] Cost alerting
- [ ] Uptime monitoring

---

## 📚 Additional Considerations

### Future Enhancements
1. **Community Fine-tuning Pipeline**
   - Collect successful patterns with user permission
   - Fine-tune models on community data quarterly
   - Create "Refrain-specialized" models

2. **Skill Certification System**
   - Track user progress through difficulty levels
   - Issue certificates for completing challenges
   - "Graduated with CodeLlama-7B" badge

3. **Pattern Marketplace**
   - Users can share successful prompts
   - Rate and review patterns
   - Automatic pattern suggestion based on context

4. **Advanced Teaching Features**
   - Deliberately inject bugs for debugging practice
   - Code review challenges
   - Architecture decision scenarios

### Risk Mitigation
- **Model Quality**: Start with hybrid approach, keep Claude for critical tasks
- **Latency**: Aggressive caching, request coalescing
- **Cost Overruns**: Hard limits per user, automatic fallback to cheaper models
- **Model Availability**: Multiple providers, automatic failover

---

## 🤝 Handoff Notes

The Refrain Coding API is designed to be a drop-in replacement for Claude in the Refrain architecture. The key differentiator is the intentional use of "less capable" models as a teaching tool, not a limitation.

The modular design allows for:
- Easy addition of new models
- Flexible routing strategies  
- Community learning integration
- Progressive skill development

Remember: The "limitations" are the curriculum. Every constraint teaches proper architecture and debugging skills.

---

## 🎯 Additional Technical Considerations

### 1. Streaming Responses Implementation
**Consideration:** Refrain's terminal-like interface would benefit from real-time token streaming rather than waiting for complete responses.

**Recommendation:** 
```python
# Add SSE endpoint for streaming
@app.get("/v1/completions/stream")
async def stream_completion(request: CompletionRequest):
    async def generate():
        async for token in model.generate_stream(request.prompt):
            yield f"data: {json.dumps({'token': token})}\n\n"
    
    return StreamingResponse(generate(), media_type="text/event-stream")
```

**Why it matters:** 
- Users see progress immediately (better UX)
- Can stop generation if going wrong direction
- Especially important for slower local models
- Matches the "watching AI work" philosophy of Refrain

**MVP Decision:** Could start without streaming and add in Phase 2, but it significantly improves perceived performance.

### 2. Context Window Management
**Consideration:** Open source models have smaller context windows than Claude (8k-32k vs 200k tokens).

**Recommendation:**
```python
class ContextCompressor:
    def compress_history(self, messages: List[Message], max_tokens: int = 4000):
        # Keep system prompt and last N messages fully
        recent_messages = messages[-5:]
        older_messages = messages[:-5]
        
        # Summarize older messages
        if older_messages:
            summary = self.summarize_messages(older_messages)
            return [system_prompt, summary] + recent_messages
        
        return messages
```

**Why it matters:**
- Prevents context overflow errors
- Maintains conversation continuity
- Critical for long development sessions
- Allows agents to reference earlier decisions

**MVP Decision:** Essential for MVP. Without this, agents will "forget" important context mid-project.

### 3. Cold Start Optimization
**Consideration:** Modal/RunPod serverless can have 5-10 second cold starts.

**Recommendation:**
```python
class WarmupStrategy:
    def __init__(self):
        # Keep models warm during business hours
        self.schedule_warmup_pings()
        
    async def schedule_warmup_pings(self):
        # Ping every 5 minutes during 9am-6pm PST
        if is_business_hours():
            await modal_endpoint.health_check()
            
    def handle_cold_start(self):
        # Show educational content during wait
        return {
            "status": "warming_up",
            "message": "Loading AI model... Did you know? Clear requirements lead to better code. Think about what specific outcome you want while we load.",
            "estimated_wait": 8
        }
```

**Why it matters:**
- First impression matters for new users
- 10-second wait feels broken without explanation
- Can turn wait time into teaching moment
- Affects user retention

**MVP Decision:** Implement basic warmup + loading messages for MVP. Sophisticated scheduling can come later.

### 4. Community Pattern Collection Mechanism
**Consideration:** Need clear opt-in and incentive system for pattern contribution.

**Recommendation:**
```typescript
interface PatternContribution {
  // Opt-in mechanism
  user_consent: {
    share_patterns: boolean;
    share_anonymized: boolean;
    excluded_projects: string[];
  };
  
  // Incentive tracking
  rewards: {
    patterns_contributed: number;
    quality_score: number;
    badges_earned: string[];
    credits_earned: number;  // Discount on subscription
  };
  
  // Pattern metadata
  pattern: {
    type: "auth" | "api" | "database" | "ui";
    success_metric: number;  // 0-1 score
    community_upvotes: number;
    times_reused: number;
  };
}
```

**Privacy Implementation:**
```python
def collect_pattern(code, metadata, user_consent):
    if not user_consent.share_patterns:
        return
    
    # Strip sensitive data
    sanitized = remove_api_keys(code)
    sanitized = remove_emails(sanitized)
    sanitized = genericize_urls(sanitized)
    
    # Store with metadata
    store_pattern(sanitized, metadata)
```

**Why it matters:**
- Legal compliance (GDPR, CCPA)
- User trust
- Quality of collected data
- Community engagement

**MVP Decision:** Start with simple opt-in checkbox, no rewards system. Add gamification in Phase 2.

### 5. Role-Specific Prompt Engineering
**Consideration:** Open source models need more explicit role definition than Claude.

**Recommendation:**
```python
ROLE_PROMPTS = {
    "frontend": """You are a Frontend Developer AI assistant.
        Focus on: React, TypeScript, UI/UX, accessibility
        Always: Use hooks, functional components, proper types
        Never: Use class components, ignore accessibility
        Style: Modern, clean, user-friendly""",
    
    "backend": """You are a Backend Developer AI assistant.
        Focus on: FastAPI, Python, REST APIs, database design
        Always: Include error handling, validation, tests
        Never: Store passwords plaintext, ignore SQL injection
        Style: RESTful, well-documented, scalable""",
    
    "devops": """You are a DevOps AI assistant.
        Focus on: Docker, Fly.io, CI/CD, monitoring
        Always: Consider security, scalability, cost
        Never: Hardcode secrets, ignore backup strategy
        Style: Automated, reproducible, observable"""
}

def prepare_prompt(base_prompt, role):
    return ROLE_PROMPTS[role] + "\n\n" + base_prompt
```

**Why it matters:**
- Open source models are more "role-fluid" than Claude
- Consistency across different agents
- Better code quality per specialization
- Teaches users about role responsibilities

**MVP Decision:** Essential for MVP. Without role prompts, all agents will feel the same.

### 6. Intelligent Fallback Chain
**Consideration:** Gracefully handle when smaller models produce poor output.

**Recommendation:**
```python
class FallbackChain:
    def __init__(self):
        self.chain = [
            ("codellama-7b", self.is_simple_task),
            ("qwen-32b", self.is_medium_task),
            ("llama-70b", self.is_complex_task),
            ("claude-sonnet", self.is_critical_task)  # Emergency fallback
        ]
    
    async def generate_with_fallback(self, request):
        last_error = None
        
        for model, condition in self.chain:
            if not condition(request):
                continue
                
            try:
                response = await self.call_model(model, request)
                
                # Quality check
                if self.is_garbage_output(response):
                    last_error = f"{model} produced low quality output"
                    continue
                
                return response
                
            except Exception as e:
                last_error = e
                continue
        
        # All models failed
        return self.handle_total_failure(last_error)
    
    def is_garbage_output(self, response):
        # Check for common failure patterns
        if len(response) < 10:
            return True
        if response.count("```") % 2 != 0:  # Broken code blocks
            return True
        if "I cannot" in response[:50]:  # Refusal
            return True
        return False
```

**Why it matters:**
- Prevents complete failures
- Maintains teaching philosophy while ensuring functionality
- Builds user confidence
- Provides graceful degradation

**MVP Decision:** Simple version for MVP - just retry once with bigger model if first attempt fails.

### 7. Teaching Moment Injection
**Consideration:** Deliberately inject common mistakes to teach debugging.

**Recommendation:**
```python
class TeachingInjector:
    def maybe_inject_mistake(self, code, user_level, lesson_plan):
        if user_level != "advanced":
            return code  # Only for advanced users
        
        if random.random() > 0.1:  # 10% chance
            return code
        
        # Pick appropriate mistake for current lesson
        if "authentication" in lesson_plan:
            return self.inject_auth_mistake(code)
        elif "performance" in lesson_plan:
            return self.inject_n_plus_one_query(code)
        
        return code
    
    def inject_auth_mistake(self, code):
        # Replace bcrypt with plain text (obvious mistake)
        modified = code.replace(
            "bcrypt.hash(password)",
            "password  # TODO: Add hashing"
        )
        
        # Add teaching moment
        self.add_teaching_moment({
            "type": "security_bug_injected",
            "hint": "Check the password handling",
            "lesson": "Always hash passwords before storage"
        })
        
        return modified
```

**Why it matters:**
- Active learning through debugging
- Builds critical review skills
- Simulates real-world junior developer output
- Creates memorable learning moments

**MVP Decision:** Skip for MVP - too risky. Add in Phase 3 after validating core functionality.

### 8. Cost Optimization Strategies
**Consideration:** Minimize costs while maintaining quality.

**Recommendation:**
```python
class CostOptimizer:
    def __init__(self):
        self.cache = Redis()
        self.daily_budget = 100  # dollars
        self.spent_today = 0
    
    def optimize_request(self, request):
        # 1. Check cache first
        cache_key = self.hash_request(request)
        if cached := self.cache.get(cache_key):
            return cached
        
        # 2. Use cheaper model if over budget
        if self.spent_today > self.daily_budget * 0.8:
            request.model = self.downgrade_model(request.model)
        
        # 3. Reduce max_tokens for non-critical tasks
        if request.role == "documentation":
            request.max_tokens = min(request.max_tokens, 500)
        
        # 4. Batch similar requests
        if self.can_batch(request):
            return self.batch_process(request)
        
        return None
    
    def cache_response(self, request, response):
        # Cache for 1 hour for identical requests
        cache_key = self.hash_request(request)
        self.cache.set(cache_key, response, ex=3600)
```

**Why it matters:**
- Keeps service sustainable
- Enables competitive pricing
- Reduces latency for common requests
- Allows scaling to more users

**MVP Decision:** Basic caching essential for MVP. Advanced optimization can come later.

### 9. Monitoring and Analytics
**Consideration:** Track both technical and educational metrics.

**Recommendation:**
```python
class MetricsCollector:
    def track_request(self, request, response):
        # Technical metrics
        self.prometheus.observe('latency', response.latency)
        self.prometheus.inc('requests_total', labels={
            'model': request.model,
            'role': request.role
        })
        
        # Educational metrics
        if response.teaching_moments:
            self.track_teaching_moment(response.teaching_moments)
        
        # Progress tracking
        self.track_user_progress(
            user_id=request.user_id,
            skill_level=request.skill_level,
            success=not response.had_errors
        )
        
        # Cost tracking
        self.track_cost(
            model=request.model,
            tokens=response.usage.total_tokens,
            cost=response.usage.estimated_cost
        )
    
    def generate_weekly_report(self):
        return {
            "users_advanced_level": self.count_level_advances(),
            "most_common_mistakes": self.top_teaching_moments(),
            "cost_per_user": self.average_cost_per_user(),
            "model_performance": self.model_comparison(),
            "learning_effectiveness": self.calculate_error_reduction_rate()
        }
```

**Why it matters:**
- Proves educational effectiveness
- Identifies areas for improvement
- Justifies the "training weights" approach
- Enables data-driven decisions

**MVP Decision:** Basic logging for MVP, fancy dashboards in Phase 2.

### 10. Migration Path from Claude
**Consideration:** Smooth transition for existing Refrain users to the Refrain Coding API.

**Recommendation:**
```typescript
// Feature flag approach
class AIServiceSelector {
  getService(user: User) {
    if (user.preferences.use_refrain_coding_api) {
      return new RefrainCodingAPI();
    }
    
    if (user.is_beta_tester) {
      // A/B test
      return Math.random() > 0.5 
        ? new RefrainCodingAPI() 
        : new ClaudeService();
    }
    
    // Default to Claude for now
    return new ClaudeService();
  }
}

// Gradual rollout
const rolloutSchedule = {
  week1: 0.1,  // 10% of users
  week2: 0.25, // 25% of users
  week3: 0.5,  // 50% of users
  week4: 1.0   // All users
};
```

**Why it matters:**
- Reduces risk
- Allows performance comparison
- Gives users choice
- Enables smooth rollback if needed

**MVP Decision:** Start with opt-in beta for willing users, not forced migration.

---

## 📋 MVP Priority Matrix

Based on all considerations, here's the recommended priority for MVP:

### Must Have (Week 1-2)
- ✅ Basic API with FastAPI
- ✅ CodeLlama-7B local inference
- ✅ Together.ai integration for Llama-70B
- ✅ Simple routing logic
- ✅ Context compression
- ✅ Role-specific prompts
- ✅ Basic caching
- ✅ Loading states with teaching messages

### Should Have (Week 3-4)
- ⚠️ Modal integration for Qwen-32B
- ⚠️ Streaming responses
- ⚠️ Simple fallback chain
- ⚠️ Basic monitoring
- ⚠️ Cost tracking
- ⚠️ Warmup strategy

### Nice to Have (Phase 2)
- 💭 Pattern collection system
- 💭 Advanced routing algorithm
- 💭 Teaching moment detection
- 💭 A/B testing framework
- 💭 Analytics dashboard
- 💭 User progression tracking

### Future Enhancements (Phase 3+)
- 🔮 Mistake injection system
- 🔮 Community fine-tuning
- 🔮 Advanced cost optimization
- 🔮 Multi-region deployment
- 🔮 Custom model training

---

*Document Version: 1.2*
*Updated: November 2024*  
*Official Name: Refrain Coding API*
*Philosophy: "Training with weights on makes stronger developers"*