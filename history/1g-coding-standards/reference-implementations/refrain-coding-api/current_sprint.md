# Sprint: Function Calling Support for Refrain Coding API

> **Status (Nov 20, 2025):** ✅ COMPLETE – function calling, tests, and frontend console are deployed to https://refrain-coding-api.fly.dev. The remainder of this document captures the original sprint specification for reference. See the new **Next Sprint Candidates** section below for upcoming work.

**Date Created:** November 18, 2025
**Sprint Goal:** Add OpenAI-compatible function calling support to enable tool-based LLM orchestration
**Duration:** 2-3 days
**Priority:** HIGH (Blocking Accelerando ERP integration)

## Next Sprint Candidates

1. **Tool Argument Validation** – Validate extracted tool call arguments against their JSONSchema definitions before returning them to clients. (Prevents malformed payloads and supports IDE auto-complete.)
2. **Streaming Responses** – Add SSE streaming for `/v1/chat/completions` so tool calls and assistant responses can be surfaced incrementally.
3. **Tool Result Round-Trips** – Extend the frontend test console (and API docs) to show how tool outputs should be posted back, making it easier for integrators to test full loops.
4. **Telemetry Enhancements** – Track success/parse-failure metrics per tool name to identify prompts that need better instructions.

These items were requested by downstream agents but are not yet scheduled; convert them into the next sprint when prioritised.

---

## 🎯 Sprint Objective

Enable the Refrain Coding API to support **OpenAI-compatible function calling** (tool calling), allowing LLMs to request execution of specific functions with structured parameters. This will enable agent-based workflows, ChatOps systems, and MCP integrations.

### Why This Sprint?

**Problem Discovered:**
- Accelerando ERP implemented LLM orchestration using DJent/Refrain Coding API
- CodeLlama-7b does not natively support function calling
- LLM hallucinates data instead of calling provided tools
- This blocks AI-native features in Accelerando and other dependent projects

**Solution:**
Add function calling support through prompt engineering and structured output parsing, making the API compatible with function-calling workflows even though the underlying model (CodeLlama-7b) doesn't natively support it.

---

## 📋 Success Criteria

### Functional Requirements
- ✅ API accepts `tools` and `tool_choice` parameters in `/v1/chat/completions`
- ✅ LLM can be instructed to call specific tools via system prompt
- ✅ API parses tool calls from LLM output
- ✅ Response format matches OpenAI's tool calling format
- ✅ Handles both tool-calling and regular conversation modes
- ✅ Backward compatible (works with existing clients that don't use tools)

### Technical Requirements
- ✅ Pydantic schemas for `Tool`, `Function`, `ToolCall` objects
- ✅ Prompt engineering to guide CodeLlama-7b to output structured tool calls
- ✅ Robust parsing of LLM output for tool call extraction
- ✅ Response includes `tool_calls` array when appropriate
- ✅ `finish_reason` set to `"tool_calls"` when tools are called
- ✅ All tests pass with >80% coverage
- ✅ No breaking changes to existing API behavior

### Quality Requirements
- ✅ Comprehensive error handling for malformed tool outputs
- ✅ Fallback to regular response if tool parsing fails
- ✅ Logging of tool call successes/failures for observability
- ✅ Metrics tracking tool call frequency and success rate
- ✅ Documentation with examples

---

## 🏗️ Architecture Overview

### Current Flow
```
User Request → Auth → Rate Limit → Cache Check → Inference → Response
```

### New Flow with Function Calling
```
User Request (with tools)
    ↓
Auth → Rate Limit
    ↓
Build Enhanced System Prompt (includes tool definitions)
    ↓
Cache Check (cache key includes tools hash)
    ↓
Inference with tool-aware prompt
    ↓
Parse LLM Output for Tool Calls
    ↓
If tool calls detected:
    - Extract tool name and arguments
    - Return with finish_reason="tool_calls"
Else:
    - Return regular completion
```

### Key Design Decisions

**1. Prompt Engineering Approach**
Since CodeLlama-7b doesn't natively support function calling, we'll use prompt engineering to guide it to output structured tool calls in a parseable format.

**Format:**
```xml
<tool_call>
<name>FunctionName</name>
<arguments>
{
  "param1": "value1",
  "param2": "value2"
}
</arguments>
</tool_call>
```

**Why XML tags?**
- Easier to parse than JSON nested in text
- Less prone to malformed output
- Clear delimiters

**2. Backward Compatibility**
- If no `tools` provided → existing behavior (no changes)
- If `tools` provided → enhanced system prompt + output parsing
- Response format always valid OpenAI schema

**3. Error Handling**
- If LLM output is malformed → log warning, return regular completion
- If tool parsing fails → degrade gracefully, don't crash
- Track parsing failures in metrics

---

## 📝 Implementation Tasks

### Phase 1: Schema Updates (4-6 hours)

#### Task 1.1: Update Request Schemas
**File:** `api/schemas/requests.py`

**Add:**
```python
class FunctionDefinition(BaseModel):
    """OpenAI-compatible function definition."""
    name: str = Field(..., description="Function name")
    description: str = Field(..., description="What the function does")
    parameters: dict[str, Any] = Field(..., description="JSON Schema for parameters")

class Tool(BaseModel):
    """OpenAI-compatible tool definition."""
    type: str = Field(default="function", pattern="^function$")
    function: FunctionDefinition

class CompletionRequest(BaseModel):
    # ... existing fields ...
    tools: list[Tool] | None = Field(None, description="Available tools")
    tool_choice: str | dict[str, Any] | None = Field(
        None,
        description="Controls tool selection: 'none', 'auto', or specific tool"
    )
```

**Test:**
- Request with `tools` validates correctly
- Request without `tools` still works (backward compat)
- `tool_choice` accepts "auto", "none", and `{"type": "function", "function": {"name": "X"}}`

**Acceptance Criteria:**
- Pydantic validation passes for all formats
- Documentation strings clear
- No breaking changes

---

#### Task 1.2: Update Response Schemas
**File:** `api/schemas/responses.py`

**Add:**
```python
class ToolCallFunction(BaseModel):
    """Function call within a tool call."""
    name: str
    arguments: str  # JSON string of arguments

class ToolCall(BaseModel):
    """OpenAI-compatible tool call."""
    id: str = Field(default_factory=lambda: f"call_{uuid4().hex[:24]}")
    type: str = Field(default="function")
    function: ToolCallFunction

class Message(BaseModel):
    role: str
    content: str | None = None  # Can be None if tool_calls present
    tool_calls: list[ToolCall] | None = None

class Choice(BaseModel):
    # ... existing fields ...
    finish_reason: str  # Now can be "stop", "length", "tool_calls"
```

**Test:**
- Response with `tool_calls` validates
- Response without `tool_calls` still works
- Finish reason values accepted

**Acceptance Criteria:**
- All schemas match OpenAI spec
- Examples in docstrings
- Type hints complete

---

### Phase 2: Prompt Engineering (6-8 hours)

#### Task 2.1: Create Prompt Builder Service
**File:** `api/services/prompt_builder.py`

**Create:**
```python
from typing import Any

from api.schemas.requests import Tool


class PromptBuilder:
    """Builds prompts with optional tool calling support."""

    @staticmethod
    def build_system_prompt(tools: list[Tool] | None = None) -> str:
        """
        Build system prompt, optionally including tool definitions.

        If tools provided, instructs model to use XML format for tool calls.
        """
        if not tools:
            return "You are a helpful coding assistant."

        tool_descriptions = []
        for tool in tools:
            func = tool.function
            params_str = json.dumps(func.parameters, indent=2)
            tool_descriptions.append(
                f"- {func.name}: {func.description}\n"
                f"  Parameters: {params_str}"
            )

        tools_text = "\n".join(tool_descriptions)

        return f"""You are a helpful assistant with access to the following tools:

{tools_text}

When you need to call a tool, respond ONLY with this exact format:
<tool_call>
<name>FunctionName</name>
<arguments>
{{"param1": "value1", "param2": "value2"}}
</arguments>
</tool_call>

DO NOT add any text before or after the tool call tags.
If you don't need to use a tool, respond normally with helpful text.
"""

    @staticmethod
    def should_force_tool_call(tool_choice: str | dict | None) -> tuple[bool, str | None]:
        """
        Determine if we should force a specific tool call.

        Returns: (should_force, tool_name)
        """
        if not tool_choice or tool_choice == "auto":
            return False, None

        if tool_choice == "none":
            return False, None

        if isinstance(tool_choice, dict):
            func_name = tool_choice.get("function", {}).get("name")
            if func_name:
                return True, func_name

        return False, None
```

**Test:**
- System prompt without tools → simple prompt
- System prompt with tools → includes tool definitions
- System prompt with 3+ tools → all listed correctly
- `should_force_tool_call` handles all formats
- XML format examples are correct

**Acceptance Criteria:**
- Prompts are concise and clear
- Tool descriptions formatted correctly
- XML format instructions explicit
- No prompt injection vulnerabilities

---

#### Task 2.2: Create Tool Call Parser Service
**File:** `api/services/tool_parser.py`

**Create:**
```python
import json
import re
from typing import Any

from utils.logger import get_logger

logger = get_logger(__name__)


class ToolCallParser:
    """Parses LLM output for tool calls in XML format."""

    TOOL_CALL_PATTERN = re.compile(
        r'<tool_call>\s*<name>(.*?)</name>\s*<arguments>(.*?)</arguments>\s*</tool_call>',
        re.DOTALL
    )

    @classmethod
    def extract_tool_calls(cls, content: str) -> list[dict[str, Any]] | None:
        """
        Extract tool calls from LLM output.

        Returns list of dicts with 'name' and 'arguments', or None if no tools found.
        """
        matches = cls.TOOL_CALL_PATTERN.findall(content)

        if not matches:
            return None

        tool_calls = []
        for name, arguments_str in matches:
            name = name.strip()
            arguments_str = arguments_str.strip()

            # Validate arguments is valid JSON
            try:
                arguments = json.loads(arguments_str)
                # Convert back to string for OpenAI format
                arguments_json = json.dumps(arguments)

                tool_calls.append({
                    "name": name,
                    "arguments": arguments_json
                })

                logger.info(
                    "tool_call_parsed",
                    extra={"tool_name": name, "args_length": len(arguments_json)}
                )

            except json.JSONDecodeError as e:
                logger.warning(
                    "tool_call_parse_failed",
                    extra={
                        "tool_name": name,
                        "arguments_raw": arguments_str[:200],
                        "error": str(e)
                    }
                )
                continue

        return tool_calls if tool_calls else None

    @classmethod
    def has_tool_call_markers(cls, content: str) -> bool:
        """Quick check if output contains tool call tags."""
        return "<tool_call>" in content and "</tool_call>" in content
```

**Test:**
- Valid tool call XML → correctly parsed
- Multiple tool calls → all extracted
- Malformed JSON in arguments → gracefully skipped
- No tool calls → returns None
- Partial/broken XML → doesn't crash

**Acceptance Criteria:**
- Regex handles whitespace variations
- JSON validation robust
- Logging comprehensive
- No crashes on malformed input

---

### Phase 3: Inference Integration (6-8 hours)

#### Task 3.1: Update Inference Service
**File:** `api/services/inference.py`

**Modify:**
```python
from api.services.prompt_builder import PromptBuilder
from api.services.tool_parser import ToolCallParser

class LocalInferenceService:
    # ... existing code ...

    async def generate(
        self,
        messages: list[dict[str, Any]],
        temperature: float = 0.7,
        max_tokens: int = 2048,
        tools: list[dict[str, Any]] | None = None,
        tool_choice: str | dict | None = None,
    ) -> dict[str, Any]:
        """
        Generate completion with optional tool calling support.

        If tools provided, uses enhanced prompt and parses output for tool calls.
        """
        # Build system prompt
        system_prompt = PromptBuilder.build_system_prompt(tools)

        # Check if we should force a tool call
        force_tool, forced_name = PromptBuilder.should_force_tool_call(tool_choice)

        # Build full prompt
        prompt = self._build_prompt(messages, system_prompt, force_tool, forced_name)

        # Generate completion
        start_time = time.time()
        output = self.model(
            prompt,
            max_tokens=max_tokens,
            temperature=temperature,
            stop=["</tool_call>", "\n\nUser:", "\n\nHuman:"],
        )
        latency_ms = int((time.time() - start_time) * 1000)

        content = output["choices"][0]["text"]

        # Parse for tool calls if tools were provided
        tool_calls_data = None
        finish_reason = "stop"

        if tools and ToolCallParser.has_tool_call_markers(content):
            tool_calls_data = ToolCallParser.extract_tool_calls(content)
            if tool_calls_data:
                finish_reason = "tool_calls"
                # If tool calls found, remove the XML from content
                content = None

        return {
            "content": content,
            "tool_calls": tool_calls_data,
            "finish_reason": finish_reason,
            "prompt_tokens": output["usage"]["prompt_tokens"],
            "completion_tokens": output["usage"]["completion_tokens"],
            "total_tokens": output["usage"]["total_tokens"],
            "latency_ms": latency_ms,
        }

    def _build_prompt(
        self,
        messages: list[dict],
        system_prompt: str,
        force_tool: bool,
        forced_name: str | None
    ) -> str:
        """Build the full prompt for the model."""
        prompt_parts = [f"System: {system_prompt}\n\n"]

        for msg in messages:
            role = msg["role"]
            content = msg["content"]
            prompt_parts.append(f"{role.capitalize()}: {content}\n\n")

        if force_tool and forced_name:
            prompt_parts.append(
                f"Assistant: I will call the {forced_name} function.\n<tool_call>\n<name>{forced_name}</name>\n<arguments>\n"
            )
        else:
            prompt_parts.append("Assistant:")

        return "".join(prompt_parts)
```

**Test:**
- Generation without tools → unchanged behavior
- Generation with tools → system prompt includes them
- LLM outputs tool call → correctly parsed
- LLM outputs regular text → no false positives
- `tool_choice="none"` → doesn't force tools
- `tool_choice={"type": "function", "function": {"name": "X"}}` → prefills output

**Acceptance Criteria:**
- Backward compatible
- Stop tokens prevent runaway generation
- Prompt format consistent
- Error handling comprehensive

---

#### Task 3.2: Update Chat Completion Route
**File:** `api/routes/chat.py`

**Modify:**
```python
@router.post("/chat/completions", response_model=CompletionResponse)
async def create_chat_completion(
    request_data: CompletionRequest,
    request: Request,
    current_user: dict[str, Any] = Depends(get_current_user),
) -> CompletionResponse:
    # ... existing code ...

    # Extract tools if provided
    tools_data = None
    if request_data.tools:
        tools_data = [tool.model_dump() for tool in request_data.tools]

    # Update cache key to include tools hash
    cache_key_parts = (messages_payload, MODEL_NAME, request_data.temperature, tools_data)

    cached = await cache_service.get(cache_key_parts)
    if cached:
        # ... cache hit logic (update to handle tool_calls) ...
        pass

    # Generate with tools
    inference_service = get_inference_service()
    try:
        with inference_duration_seconds.labels(model=MODEL_NAME, tier=MODEL_TIER).time():
            result = await inference_service.generate(
                messages_payload,
                temperature=request_data.temperature,
                max_tokens=request_data.max_tokens,
                tools=tools_data,
                tool_choice=request_data.tool_choice,
            )
    except Exception as exc:
        # ... error handling ...
        raise

    # Build response with tool calls if present
    message_data = {
        "role": "assistant",
        "content": result.get("content"),
    }

    if result.get("tool_calls"):
        from api.schemas.responses import ToolCall, ToolCallFunction
        message_data["tool_calls"] = [
            ToolCall(
                function=ToolCallFunction(
                    name=tc["name"],
                    arguments=tc["arguments"]
                )
            )
            for tc in result["tool_calls"]
        ]

    choice = Choice(
        message=Message(**message_data),
        finish_reason=result.get("finish_reason", "stop"),
    )

    # ... rest of response building ...

    # Cache the result (including tool_calls)
    await cache_service.set(cache_key_parts, result)

    return CompletionResponse(...)
```

**Test:**
- Request with tools → processed correctly
- Response with tool_calls → validates
- Response without tool_calls → validates
- Cache hit with tools → returns correct data
- Cache miss with tools → generates and caches

**Acceptance Criteria:**
- All response formats valid
- Caching works with tools
- Metrics updated correctly
- Backward compatible

---

### Phase 4: Metrics & Observability (2-3 hours)

#### Task 4.1: Add Tool Calling Metrics
**File:** `utils/metrics.py`

**Add:**
```python
from prometheus_client import Counter

tool_calls_total = Counter(
    "refrain_tool_calls_total",
    "Total number of tool calls",
    ["tool_name", "success"]
)

tool_parse_failures_total = Counter(
    "refrain_tool_parse_failures_total",
    "Total number of tool call parsing failures"
)
```

**Update in:**
- `api/services/tool_parser.py` → increment on parse success/failure
- `api/routes/chat.py` → increment `tool_calls_total` per tool

**Test:**
- Metrics endpoint shows new counters
- Tool call → counter increments
- Parse failure → counter increments

**Acceptance Criteria:**
- Metrics well-labeled
- Documented in code

---

### Phase 5: Testing (8-10 hours)

#### Task 5.1: Unit Tests for New Components
**File:** `tests/test_prompt_builder.py`

**Create:**
```python
import pytest
from api.schemas.requests import FunctionDefinition, Tool
from api.services.prompt_builder import PromptBuilder


def test_system_prompt_without_tools():
    """System prompt should be simple when no tools provided."""
    prompt = PromptBuilder.build_system_prompt(None)
    assert "helpful" in prompt.lower()
    assert "tool" not in prompt.lower()


def test_system_prompt_with_single_tool():
    """System prompt should include tool definition."""
    tools = [
        Tool(
            function=FunctionDefinition(
                name="get_weather",
                description="Get the weather for a location",
                parameters={
                    "type": "object",
                    "properties": {
                        "location": {"type": "string"}
                    }
                }
            )
        )
    ]

    prompt = PromptBuilder.build_system_prompt(tools)
    assert "get_weather" in prompt
    assert "Get the weather" in prompt
    assert "<tool_call>" in prompt


def test_should_force_tool_call_auto():
    """tool_choice='auto' should not force."""
    force, name = PromptBuilder.should_force_tool_call("auto")
    assert force is False
    assert name is None


def test_should_force_tool_call_specific():
    """tool_choice with specific function should force."""
    force, name = PromptBuilder.should_force_tool_call({
        "type": "function",
        "function": {"name": "get_weather"}
    })
    assert force is True
    assert name == "get_weather"
```

**File:** `tests/test_tool_parser.py`

**Create:**
```python
import pytest
from api.services.tool_parser import ToolCallParser


def test_extract_single_tool_call():
    """Should extract single tool call."""
    content = """<tool_call>
<name>get_weather</name>
<arguments>
{"location": "San Francisco"}
</arguments>
</tool_call>"""

    calls = ToolCallParser.extract_tool_calls(content)
    assert calls is not None
    assert len(calls) == 1
    assert calls[0]["name"] == "get_weather"
    assert "San Francisco" in calls[0]["arguments"]


def test_extract_multiple_tool_calls():
    """Should extract multiple tool calls."""
    content = """<tool_call>
<name>tool1</name>
<arguments>{"a": 1}</arguments>
</tool_call>
<tool_call>
<name>tool2</name>
<arguments>{"b": 2}</arguments>
</tool_call>"""

    calls = ToolCallParser.extract_tool_calls(content)
    assert len(calls) == 2


def test_extract_malformed_json():
    """Should skip malformed JSON gracefully."""
    content = """<tool_call>
<name>bad_tool</name>
<arguments>{invalid json}</arguments>
</tool_call>"""

    calls = ToolCallParser.extract_tool_calls(content)
    assert calls is None or len(calls) == 0


def test_no_tool_calls():
    """Should return None when no tool calls."""
    content = "Just a regular response."
    calls = ToolCallParser.extract_tool_calls(content)
    assert calls is None
```

**Acceptance Criteria:**
- All tests pass
- Edge cases covered
- Fixtures reusable

---

#### Task 5.2: Integration Tests
**File:** `tests/test_chat_tools.py`

**Create:**
```python
import pytest
from fastapi.testclient import TestClient


def test_chat_completion_with_tools(client: TestClient, auth_headers: dict):
    """Test chat completion with tool calling."""
    response = client.post(
        "/v1/chat/completions",
        headers=auth_headers,
        json={
            "messages": [
                {"role": "user", "content": "What's the weather in SF?"}
            ],
            "tools": [
                {
                    "type": "function",
                    "function": {
                        "name": "get_weather",
                        "description": "Get weather for a location",
                        "parameters": {
                            "type": "object",
                            "properties": {
                                "location": {"type": "string"}
                            },
                            "required": ["location"]
                        }
                    }
                }
            ],
            "tool_choice": "auto"
        }
    )

    assert response.status_code == 200
    data = response.json()

    # Response should be valid
    assert "choices" in data
    assert len(data["choices"]) > 0

    # May or may not have tool_calls (depends on model output)
    # But should not crash


def test_chat_completion_backward_compatible(client: TestClient, auth_headers: dict):
    """Test that requests without tools still work."""
    response = client.post(
        "/v1/chat/completions",
        headers=auth_headers,
        json={
            "messages": [
                {"role": "user", "content": "Hello"}
            ]
        }
    )

    assert response.status_code == 200
    data = response.json()
    assert data["choices"][0]["message"]["content"]
    assert "tool_calls" not in data["choices"][0]["message"] or \
           data["choices"][0]["message"]["tool_calls"] is None
```

**Acceptance Criteria:**
- Integration tests pass
- Tests cover tool and non-tool paths
- Mocks minimize external dependencies

---

#### Task 5.3: Coverage Check
**Commands:**
```bash
pytest tests/ -v --cov=api --cov=utils --cov-report=term-missing
```

**Target:** >80% coverage (maintain existing coverage + new code)

**Acceptance Criteria:**
- Coverage report shows >80%
- All critical paths tested
- No untested error handlers

---

### Phase 6: Documentation & Deployment (4-6 hours)

#### Task 6.1: Update API Documentation
**File:** `README.md` or `docs/FUNCTION_CALLING.md`

**Add:**
```markdown
# Function Calling Support

The Refrain Coding API now supports OpenAI-compatible function calling.

## Basic Example

\`\`\`python
import requests

response = requests.post(
    "https://refrain-coding-api.fly.dev/v1/chat/completions",
    headers={"Authorization": "Bearer YOUR_API_KEY"},
    json={
        "messages": [
            {"role": "user", "content": "Create a customer named Acme Corp"}
        ],
        "tools": [
            {
                "type": "function",
                "function": {
                    "name": "create_customer",
                    "description": "Create a new customer record",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "name": {"type": "string"},
                            "email": {"type": "string"}
                        },
                        "required": ["name"]
                    }
                }
            }
        ],
        "tool_choice": "auto"
    }
)

data = response.json()
if data["choices"][0]["message"].get("tool_calls"):
    for tool_call in data["choices"][0]["message"]["tool_calls"]:
        print(f"Tool: {tool_call['function']['name']}")
        print(f"Args: {tool_call['function']['arguments']}")
\`\`\`

## Limitations

- CodeLlama-7b doesn't natively support function calling
- Uses prompt engineering + output parsing
- Tool call success depends on prompt quality
- May occasionally fail to parse complex tool calls

## Best Practices

1. Keep tool descriptions clear and concise
2. Use simple parameter schemas
3. Test with your specific tools
4. Handle parsing failures gracefully
5. Provide fallback behavior
```

**Acceptance Criteria:**
- Examples work as documented
- Limitations clearly stated
- Best practices actionable

---

#### Task 6.2: Add Migration (if needed)
**File:** `migrations/002_add_tool_metrics.sql` (if storing tool call stats)

**Only if we add DB tracking of tool calls**

For this sprint, we'll rely on Prometheus metrics only, so no migration needed.

---

#### Task 6.3: Deploy to Production
**File:** `_project_docs/DEPLOYMENT_CHECKLIST.md`

**Steps:**
1. Run all tests locally
2. Check code quality (ruff, mypy)
3. Build Docker image
4. Test Docker image locally
5. Deploy to Fly.io
6. Verify health checks
7. Test function calling in production
8. Monitor metrics for 1 hour

**Commands:**
```bash
# Local validation
pytest tests/ -v --cov=api
ruff check api/ utils/
mypy api/ utils/

# Build and test
docker build -t refrain-coding-api:tool-calling .
docker run -p 8000:8000 refrain-coding-api:tool-calling

# Deploy
flyctl deploy

# Verify
curl https://refrain-coding-api.fly.dev/health/detailed
curl -X POST https://refrain-coding-api.fly.dev/v1/chat/completions \
  -H "Authorization: Bearer TEST_KEY" \
  -H "Content-Type: application/json" \
  -d @test_tool_request.json
```

**Acceptance Criteria:**
- Deployment succeeds
- No errors in logs
- Function calling works in production
- Existing clients not affected

---

## 🚨 Breaking Changes & Compatibility

### Breaking Changes
**NONE** - This is a backward-compatible addition.

### Compatibility Guarantees
- Existing clients without `tools` parameter → unchanged behavior
- Response schema extended but backward compatible
- Cache keys updated to include tools (old cache entries invalid but safe)

---

## 📊 Metrics to Track

After deployment, monitor:

| Metric | Target | Alert Threshold |
|--------|--------|-----------------|
| `refrain_tool_calls_total` | >0 after first use | N/A |
| `refrain_tool_parse_failures_total` | <10% of tool calls | >20% |
| `refrain_request_duration_seconds` (with tools) | <10s p95 | >15s |
| Error rate on `/v1/chat/completions` | <1% | >5% |

---

## 🧪 Testing Strategy

### Unit Tests (40% of time)
- `PromptBuilder` - all methods, all branches
- `ToolCallParser` - valid/invalid/edge cases
- Schema validation - all formats

### Integration Tests (40% of time)
- Full request flow with tools
- Full request flow without tools
- Cache hit/miss with tools
- Error scenarios

### Manual Testing (20% of time)
- Test with Accelerando ERP integration
- Verify actual tool calls work
- Test with different tool complexities
- Verify metrics collection

---

## 🎯 Definition of Done

Sprint is complete when:

### Code
- [ ] All tasks implemented per spec
- [ ] All tests pass (>80% coverage)
- [ ] No linting errors (ruff)
- [ ] No type errors (mypy)
- [ ] Code reviewed (self-review checklist)

### Documentation
- [ ] Function calling guide written
- [ ] API examples added
- [ ] Limitations documented
- [ ] CHANGELOG updated

### Deployment
- [ ] Deployed to production
- [ ] Health checks passing
- [ ] No errors in first hour
- [ ] Metrics collecting correctly

### Integration
- [ ] Tested with Accelerando ERP
- [ ] End-to-end flow validated
- [ ] Customer creation works via chat

---

## 🚧 Risks & Mitigation

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| CodeLlama-7b produces inconsistent tool call format | High | High | Robust parsing with fallback to regular response |
| Performance degradation with complex tool definitions | Medium | Medium | Benchmark with large tool sets, add timeout |
| Cache invalidation issues | Low | Medium | Clear cache after deployment |
| Backward compatibility broken | Low | High | Comprehensive integration tests |

---

## 📅 Timeline

**Day 1 (8 hours)**
- Morning: Phase 1 (Schemas) - 4 hours
- Afternoon: Phase 2 Part 1 (PromptBuilder) - 4 hours

**Day 2 (8 hours)**
- Morning: Phase 2 Part 2 (ToolParser) - 4 hours
- Afternoon: Phase 3 Part 1 (Inference) - 4 hours

**Day 3 (8 hours)**
- Morning: Phase 3 Part 2 (Routes) + Phase 4 (Metrics) - 4 hours
- Afternoon: Phase 5 (Testing) - 4 hours

**Deployment Day (4 hours)**
- Phase 6 (Documentation + Deployment) - 4 hours
- Monitoring - ongoing

**Total: 2.5-3 days**

---

## 🎉 Success Indicators

**Sprint successful if:**
1. Accelerando ERP can successfully call tools via Refrain API
2. No regressions in existing functionality
3. >70% tool call parse success rate
4. Zero production incidents
5. Documentation enables other teams to integrate

---

## 📞 Stakeholders

**Blocking:**
- Accelerando ERP integration (waiting for this feature)

**Interested:**
- Refrain AI IDE (may use for enhanced coding features)
- Any future agent-based integrations

---

## 🔄 Post-Sprint Actions

After sprint completion:
1. **Collect data** on tool call success rates
2. **Iterate** on prompt engineering if success rate <70%
3. **Consider** upgrading to model with native function calling
4. **Evaluate** if different output format improves parsing
5. **Monitor** performance impact and optimize if needed

---

*Sprint created: November 18, 2025*
*Created by: Claude (AI Planning Agent)*
*Status: READY TO START*
