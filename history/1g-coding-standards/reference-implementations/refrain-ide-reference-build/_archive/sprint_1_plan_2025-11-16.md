# Sprint 1: Backend Foundation & Core Services
**Duration:** November 2025
**Objective:** Establish backend infrastructure with FastAPI and implement core AI provider abstraction layer

---

## Backend Tasks

### 1. Project Structure Setup
- [ ] Create `backend/` directory with proper Python project structure
- [ ] Initialize Python virtual environment (Python 3.11+)
- [ ] Create `requirements.txt` with initial dependencies:
  ```
  fastapi==0.104.1
  uvicorn[standard]==0.24.0
  pydantic==2.5.0
  python-dotenv==1.0.0
  httpx==0.25.1
  aiofiles==23.2.1
  anthropic==0.7.0
  openai==1.3.0
  ```
- [ ] Create `.env.example` file with required environment variables
- [ ] Set up basic FastAPI app structure:
  ```
  backend/
  ├── app/
  │   ├── __init__.py
  │   ├── main.py              # FastAPI entry point
  │   ├── config.py            # Configuration management
  │   └── dependencies.py      # Dependency injection
  ├── routers/
  │   ├── __init__.py
  │   ├── health.py            # Health check endpoint
  │   └── ai.py                # AI provider endpoints
  ├── services/
  │   └── __init__.py
  ├── core/
  │   ├── __init__.py
  │   └── ai_providers/
  │       └── __init__.py
  ├── models/
  │   └── __init__.py
  ├── requirements.txt
  ├── .env.example
  └── README.md
  ```

**Acceptance Criteria:**
- Backend starts successfully with `uvicorn app.main:app --reload`
- Project structure matches specification
- All imports work without errors

---

### 2. Configuration Management
- [ ] Create `app/config.py` with Pydantic Settings:
  ```python
  from pydantic_settings import BaseSettings

  class Settings(BaseSettings):
      # API Keys (optional, loaded from env)
      anthropic_api_key: str | None = None
      openai_api_key: str | None = None
      custom_api_key: str | None = None
      custom_api_url: str | None = None

      # Server settings
      host: str = "0.0.0.0"
      port: int = 8000
      debug: bool = False

      # CORS
      cors_origins: list[str] = ["http://localhost:3000"]

      class Config:
          env_file = ".env"
  ```
- [ ] Create `.env.example` with all required variables documented
- [ ] Implement settings dependency in `dependencies.py`

**Acceptance Criteria:**
- Settings load from environment variables
- Missing optional keys don't crash the app
- CORS configured for local frontend development

---

### 3. Health Check Endpoint
- [ ] Create `routers/health.py` with basic health check
- [ ] Include system information (Python version, uptime, etc.)
- [ ] Add endpoint to check AI provider connectivity status
- [ ] Register router in main.py

**API Endpoint:**
```
GET /health
Response: {
  "status": "healthy",
  "version": "1.0.0",
  "uptime_seconds": 123,
  "python_version": "3.11.x"
}

GET /health/providers
Response: {
  "anthropic": "not_configured",
  "openai": "not_configured",
  "custom": "not_configured"
}
```

**Acceptance Criteria:**
- Health endpoint returns 200 OK
- Provider status reflects actual configuration

---

### 4. AI Provider Abstraction Layer
- [ ] Create base provider interface in `core/ai_providers/base.py`:
  ```python
  from abc import ABC, abstractmethod
  from typing import AsyncIterator
  from models.ai import AIMessage, AIResponse, ChatOptions

  class BaseAIProvider(ABC):
      @abstractmethod
      async def chat(self, messages: list[AIMessage], options: ChatOptions | None = None) -> AIResponse:
          pass

      @abstractmethod
      async def stream(self, messages: list[AIMessage], options: ChatOptions | None = None) -> AsyncIterator[str]:
          pass

      @abstractmethod
      async def validate_connection(self) -> bool:
          pass
  ```

- [ ] Create Pydantic models in `models/ai.py`:
  ```python
  from pydantic import BaseModel
  from typing import Literal
  from datetime import datetime

  class AIMessage(BaseModel):
      role: Literal["system", "user", "assistant"]
      content: str

  class ChatOptions(BaseModel):
      temperature: float = 0.7
      max_tokens: int = 4096

  class AIResponse(BaseModel):
      content: str
      usage: dict  # tokens used
      metadata: dict  # provider info, latency

  class AIProviderConfig(BaseModel):
      provider: Literal["custom", "anthropic", "openai"]
      model: str
      api_key: str | None = None
      base_url: str | None = None
      temperature: float = 0.7
      max_tokens: int = 4096

  class RoleConfiguration(BaseModel):
      strategic: AIProviderConfig
      frontend: AIProviderConfig
      backend: AIProviderConfig
  ```

**Acceptance Criteria:**
- Base interface is abstract and cannot be instantiated
- All models validate correctly
- Type hints are complete

---

### 5. Anthropic Provider Implementation
- [ ] Create `core/ai_providers/anthropic_provider.py`
- [ ] Implement `chat()` method using anthropic SDK
- [ ] Implement `stream()` method with async generator
- [ ] Implement `validate_connection()` to test API key
- [ ] Handle common errors (rate limit, invalid key, timeout)
- [ ] Track token usage in response

**Implementation Notes:**
- Use `anthropic` Python SDK
- Default model: `claude-sonnet-4-20250514`
- Include retry logic for transient failures
- Log all API calls for debugging

**Acceptance Criteria:**
- Can send messages and receive responses
- Streaming works with real-time token output
- Invalid API key returns clear error
- Token usage tracked accurately

---

### 6. OpenAI Provider Implementation
- [ ] Create `core/ai_providers/openai_provider.py`
- [ ] Implement `chat()` method using openai SDK
- [ ] Implement `stream()` method with async generator
- [ ] Implement `validate_connection()` to test API key
- [ ] Handle common errors appropriately
- [ ] Track token usage

**Implementation Notes:**
- Use `openai` Python SDK
- Default model: `gpt-4`
- Similar structure to Anthropic provider

**Acceptance Criteria:**
- Same criteria as Anthropic provider
- Responses normalized to common format

---

### 7. Custom API Provider Implementation
- [ ] Create `core/ai_providers/custom_provider.py`
- [ ] Implement using `httpx` for HTTP calls
- [ ] Support configurable base URL
- [ ] Implement all interface methods
- [ ] Handle various API response formats

**Implementation Notes:**
- Use `httpx.AsyncClient` for async HTTP
- Assume OpenAI-compatible API format (common for custom deployments)
- Allow custom headers if needed

**Acceptance Criteria:**
- Works with OpenAI-compatible APIs
- Base URL fully configurable
- Timeout handling implemented

---

### 8. Provider Factory
- [ ] Create `core/ai_providers/factory.py`
- [ ] Implement factory function to create providers by config
- [ ] Cache provider instances for reuse
- [ ] Handle missing configuration gracefully

```python
def create_provider(config: AIProviderConfig) -> BaseAIProvider:
    match config.provider:
        case "anthropic":
            return AnthropicProvider(config)
        case "openai":
            return OpenAIProvider(config)
        case "custom":
            return CustomAPIProvider(config)
        case _:
            raise ValueError(f"Unknown provider: {config.provider}")
```

**Acceptance Criteria:**
- Factory creates correct provider type
- Configuration passed through correctly

---

### 9. AI Router Endpoints
- [ ] Create `routers/ai.py` with these endpoints:

```python
@router.post("/ai/chat/{role}")
async def chat_with_ai(role: str, request: ChatRequest) -> AIResponse:
    """Send messages to AI and get response"""

@router.post("/ai/test-connection")
async def test_connection(config: AIProviderConfig) -> ConnectionTestResult:
    """Test if AI provider connection works"""

@router.get("/ai/configurations")
async def get_configurations() -> RoleConfiguration:
    """Get current AI configurations for all roles"""

@router.put("/ai/configurations")
async def update_configurations(config: RoleConfiguration) -> dict:
    """Update AI configurations"""
```

- [ ] Implement configuration persistence (JSON file in `.refrain/`)
- [ ] Create service layer for business logic
- [ ] Add proper error handling with HTTP status codes

**Acceptance Criteria:**
- All endpoints return proper JSON responses
- Configuration persists across restarts
- Errors return appropriate HTTP codes (400, 401, 500, etc.)

---

### 10. CORS and Middleware Setup
- [ ] Configure CORS middleware for frontend access
- [ ] Add request logging middleware
- [ ] Add error handling middleware
- [ ] Set up proper exception handlers

**Acceptance Criteria:**
- Frontend at localhost:3000 can call API
- All requests logged with timestamp and duration
- Errors return consistent JSON format

---

### 11. Basic Tests
- [ ] Create `tests/` directory structure
- [ ] Write test for health endpoint
- [ ] Write tests for AI models (Pydantic validation)
- [ ] Write tests for provider factory
- [ ] Create mock provider for testing without API costs

**Acceptance Criteria:**
- Tests run with `pytest`
- At least 3 passing tests
- Mock provider enables testing without real API calls

---

## Technical Constraints

1. **Python Version:** 3.11+ required (for modern syntax)
2. **Async First:** All I/O operations must be async
3. **Type Hints:** Complete type annotations required
4. **Error Handling:** No unhandled exceptions
5. **Logging:** Use Python logging module, not print statements
6. **Security:** API keys only from environment variables, never hardcoded

---

## Environment Variables Required

```bash
# .env file
ANTHROPIC_API_KEY=sk-ant-...        # Optional
OPENAI_API_KEY=sk-...               # Optional
CUSTOM_API_KEY=your-key             # Optional
CUSTOM_API_URL=https://api.example.com  # Optional

# Server
HOST=0.0.0.0
PORT=8000
DEBUG=true
```

---

## Definition of Done

- [ ] All tasks completed and checked off
- [ ] Backend starts without errors
- [ ] Health check returns 200 OK
- [ ] At least one AI provider can be configured and tested
- [ ] Configuration persists in `.refrain/ai-config.json`
- [ ] API documentation auto-generated at `/docs`
- [ ] Code follows PEP 8 style guidelines
- [ ] No TODO comments for sprint tasks (TODOs for future work OK)
- [ ] README.md updated with setup instructions

---

## Files to Create

1. `backend/app/__init__.py`
2. `backend/app/main.py`
3. `backend/app/config.py`
4. `backend/app/dependencies.py`
5. `backend/routers/__init__.py`
6. `backend/routers/health.py`
7. `backend/routers/ai.py`
8. `backend/services/__init__.py`
9. `backend/services/ai_service.py`
10. `backend/core/__init__.py`
11. `backend/core/ai_providers/__init__.py`
12. `backend/core/ai_providers/base.py`
13. `backend/core/ai_providers/anthropic_provider.py`
14. `backend/core/ai_providers/openai_provider.py`
15. `backend/core/ai_providers/custom_provider.py`
16. `backend/core/ai_providers/factory.py`
17. `backend/models/__init__.py`
18. `backend/models/ai.py`
19. `backend/tests/__init__.py`
20. `backend/tests/test_health.py`
21. `backend/tests/test_models.py`
22. `backend/requirements.txt`
23. `backend/.env.example`
24. `backend/README.md`
25. `.refrain/` directory (created at runtime)

---

## Notes for Backend AI

- Reference `technical_plan.md` for detailed architecture decisions
- Reference `development_roadmap.md` for broader context
- Follow all guidelines in `ai_coding_guidelines.md`
- If unclear about any requirement, add question to `questions.md`
- Commit work frequently with descriptive messages
- The Frontend AI will review your code and create UI components that integrate with these endpoints

---

*Sprint created: November 16, 2025*
*Ready for Backend AI implementation*
