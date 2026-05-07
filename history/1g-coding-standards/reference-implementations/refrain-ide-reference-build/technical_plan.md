# Refrain IDE 2.0 - Master Technical Plan

## Document Purpose
This document serves as the comprehensive technical blueprint for implementing Refrain IDE 2.0. It breaks down the system architecture into implementable components, defines interfaces, and establishes technical decisions.

---

## 1. System Architecture Overview

### 1.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        REFRAIN IDE 2.0                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐        │
│  │   Frontend  │    │   Backend   │    │   Desktop   │        │
│  │   (Web UI)  │◄──►│   (API)     │◄──►│   Agent     │        │
│  │   Next.js   │    │   FastAPI   │    │   (Local)   │        │
│  └─────────────┘    └─────────────┘    └─────────────┘        │
│         │                  │                    │               │
│         └──────────────────┼────────────────────┘               │
│                            ▼                                    │
│  ┌─────────────────────────────────────────────────────┐        │
│  │              Core Services Layer                     │        │
│  ├─────────────────────────────────────────────────────┤        │
│  │  • AI Provider Abstraction                          │        │
│  │  • Workflow State Machine                           │        │
│  │  • Document Management                              │        │
│  │  • Git Operations                                   │        │
│  │  • Deployment Orchestration                         │        │
│  │  • Process Management                               │        │
│  └─────────────────────────────────────────────────────┘        │
│                            │                                    │
│         ┌──────────────────┼──────────────────┐                │
│         ▼                  ▼                  ▼                │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐        │
│  │   External  │    │   File      │    │   Git       │        │
│  │   AI APIs   │    │   System    │    │   Remote    │        │
│  └─────────────┘    └─────────────┘    └─────────────┘        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 1.2 Technology Stack

**Frontend (Web UI)**
- **Framework:** Next.js 14+ with App Router
- **Language:** TypeScript 5.x
- **Styling:** Tailwind CSS + shadcn/ui components
- **State Management:** React Context + Zustand for complex state
- **Code Editor:** Monaco Editor (VS Code editor)
- **Real-time Updates:** Server-Sent Events (SSE)

**Backend (API Server)**
- **Framework:** FastAPI (Python 3.11+)
- **Async Runtime:** asyncio + uvicorn
- **AI Integration:** Custom abstraction layer
- **Process Management:** subprocess + psutil
- **Git Operations:** GitPython library
- **WebSocket/SSE:** FastAPI streaming responses

**Desktop Agent (Optional - Phase 2)**
- **Framework:** Electron or Tauri
- **Purpose:** Local file system access, process management
- **Communication:** REST/WebSocket to backend

**Deployment Target**
- **Cloud Provider:** Fly.io
- **CI/CD:** GitHub Actions
- **Monitoring:** Fly.io metrics + custom logging

---

## 2. Core Components Specification

### 2.1 AI Provider Abstraction Layer

**Purpose:** Unified interface for multiple AI providers (Custom, Anthropic, OpenAI)

**Components:**
```
ai-providers/
├── interfaces/
│   ├── ai-client.interface.ts      # Common interface
│   ├── message.types.ts            # Shared message types
│   └── response.types.ts           # Standardized responses
├── providers/
│   ├── custom-api.provider.ts      # User's coding API
│   ├── anthropic.provider.ts       # Claude integration
│   └── openai.provider.ts          # GPT integration
├── factory/
│   └── provider-factory.ts         # Creates provider instances
└── manager/
    └── role-manager.ts             # Manages AI roles
```

**Key Interfaces:**

```typescript
// Core message structure
interface AIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
  timestamp?: Date;
}

// Provider configuration
interface AIProviderConfig {
  provider: 'custom' | 'anthropic' | 'openai';
  model: string;
  apiKey?: string;
  baseURL?: string;
  temperature: number;
  maxTokens: number;
  timeout?: number;
}

// Unified response
interface AIResponse {
  content: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  metadata: {
    provider: string;
    model: string;
    latencyMs: number;
  };
}

// Provider interface
interface IAIProvider {
  chat(messages: AIMessage[], options?: ChatOptions): Promise<AIResponse>;
  stream(messages: AIMessage[], options?: ChatOptions): AsyncIterable<string>;
  validateConnection(): Promise<boolean>;
}
```

**Error Handling:**
- Connection timeouts with configurable retry
- API rate limiting with exponential backoff
- Graceful fallback on provider errors
- Detailed error logging for debugging

### 2.2 Workflow State Machine

**Purpose:** Manage the 5-step development cycle with state persistence

**States:**
```
┌───────────────────────────────────────────────────────────────┐
│                    WORKFLOW STATE MACHINE                      │
├───────────────────────────────────────────────────────────────┤
│                                                               │
│  IDLE ──────► STEP_000_STRATEGIC ──────► STEP_001_FRONTEND   │
│    ▲                   │                        │             │
│    │                   │ (Questions)            │             │
│    │                   ▼                        ▼             │
│    │            STEP_004_BACKEND ◄──── STEP_003_PLANNING      │
│    │                   │                        ▲             │
│    │                   │                        │             │
│    └───────────────────┴───────── STEP_002_CLEANUP            │
│                                                               │
│  Cross-cutting states:                                        │
│  • PAUSED (user intervention)                                 │
│  • CONSULTING (Strategic AI chat active)                      │
│  • ERROR (requires user action)                               │
│                                                               │
└───────────────────────────────────────────────────────────────┘
```

**State Schema:**
```typescript
interface WorkflowState {
  currentStep: WorkflowStep;
  previousStep: WorkflowStep | null;
  status: 'active' | 'paused' | 'consulting' | 'error' | 'completed';
  startedAt: Date;
  lastActivity: Date;
  context: {
    projectPath: string;
    currentSprint: string;
    openQuestions: number;
    lastDeployment: Date | null;
  };
  history: StepTransition[];
}

interface StepTransition {
  from: WorkflowStep;
  to: WorkflowStep;
  timestamp: Date;
  trigger: 'user' | 'auto' | 'ai_request';
  notes?: string;
}
```

**Persistence:**
- State saved to `.refrain/workflow-state.json`
- Auto-recovery on application restart
- Transaction log for debugging

### 2.3 Document Management System

**Purpose:** CRUD operations for project documentation with versioning

**Features:**
- File system watcher for external changes
- Markdown parsing and validation
- Template system for new documents
- Archive management with timestamps
- Search across documents

**Document Service API:**
```typescript
interface IDocumentService {
  // CRUD operations
  list(path?: string): Promise<DocumentInfo[]>;
  read(filePath: string): Promise<DocumentContent>;
  write(filePath: string, content: string): Promise<void>;
  delete(filePath: string): Promise<void>;

  // Special operations
  archive(filePath: string): Promise<string>; // Returns archive path
  search(query: string): Promise<SearchResult[]>;
  validate(filePath: string): Promise<ValidationResult>;

  // Questions.md specific
  getOpenQuestions(): Promise<Question[]>;
  addQuestion(question: QuestionInput): Promise<string>; // Returns Q###
  resolveQuestion(questionId: string, resolution: Resolution): Promise<void>;
}

interface Question {
  id: string; // Q001, Q002, etc.
  from: 'backend' | 'frontend' | 'strategic';
  question: string;
  context: string;
  impact: string;
  status: 'open' | 'resolved';
  timestamp: Date;
  resolution?: {
    answer: string;
    decidedBy: string;
    resolvedAt: Date;
  };
}
```

### 2.4 Git Integration Service

**Purpose:** Automated version control with semantic commits

**Operations:**
```typescript
interface IGitService {
  // Repository operations
  status(): Promise<GitStatus>;
  add(files: string[]): Promise<void>;
  commit(message: string, options?: CommitOptions): Promise<string>;
  push(remote?: string, branch?: string): Promise<void>;
  pull(): Promise<void>;

  // History
  log(limit?: number): Promise<CommitInfo[]>;
  diff(fromRef?: string, toRef?: string): Promise<DiffResult>;

  // Branch management (Phase 2)
  createBranch(name: string): Promise<void>;
  switchBranch(name: string): Promise<void>;
  mergeBranch(source: string): Promise<void>;
}

interface CommitOptions {
  stepTag: 'Step 000' | 'Step 001' | 'Step 002' | 'Step 003' | 'Step 004';
  type: 'feat' | 'fix' | 'docs' | 'refactor' | 'test' | 'chore';
  scope?: string;
}
```

**Commit Message Format:**
```
<type>(<scope>): <description> [<step>]

<optional body>

Examples:
- feat(api): Add SSE notifications endpoint [Step 004]
- docs: Update architecture with state management decision [Step 000]
- fix(ui): Resolve mobile responsive issue [Step 001]
```

### 2.5 Deployment Orchestration Service

**Purpose:** Manage Fly.io deployments for staging and production

**Service Interface:**
```typescript
interface IDeploymentService {
  // Deployment operations
  deployToStaging(): Promise<DeploymentResult>;
  deployToProduction(): Promise<DeploymentResult>;
  rollback(environment: 'staging' | 'production'): Promise<void>;

  // Status
  getStatus(environment: string): Promise<DeploymentStatus>;
  getLogs(environment: string, tail?: number): AsyncIterable<string>;

  // Configuration
  setSecrets(env: string, secrets: Record<string, string>): Promise<void>;
  getConfig(environment: string): Promise<FlyConfig>;
}

interface DeploymentResult {
  success: boolean;
  environment: string;
  url: string;
  deployedAt: Date;
  duration: number;
  errors?: string[];
}
```

### 2.6 Local Development Server Manager

**Purpose:** Start, stop, and monitor local backend/frontend servers

**Process Manager Interface:**
```typescript
interface IProcessManager {
  // Server lifecycle
  startBackend(): Promise<ProcessInfo>;
  startFrontend(): Promise<ProcessInfo>;
  stopBackend(): Promise<void>;
  stopFrontend(): Promise<void>;
  restartAll(): Promise<void>;

  // Monitoring
  getStatus(): Promise<ServerStatus>;
  getLogs(server: 'backend' | 'frontend'): AsyncIterable<string>;
  getResourceUsage(): Promise<ResourceMetrics>;

  // Port management
  checkPortAvailability(port: number): Promise<boolean>;
  findAvailablePort(start: number): Promise<number>;
}

interface ProcessInfo {
  pid: number;
  port: number;
  url: string;
  startedAt: Date;
}

interface ResourceMetrics {
  cpu: number;
  memory: {
    used: number;
    total: number;
  };
  requestCount: number;
}
```

---

## 3. Frontend Architecture

### 3.1 Component Structure

```
frontend/
├── app/                          # Next.js App Router
│   ├── layout.tsx                # Root layout with providers
│   ├── page.tsx                  # Main dashboard
│   ├── (workspace)/              # Workspace routes
│   │   ├── documents/page.tsx    # Document library
│   │   ├── workflow/page.tsx     # Workflow control
│   │   └── settings/page.tsx     # AI configuration
│   └── api/                      # API routes (proxies to backend)
├── components/
│   ├── layout/
│   │   ├── Sidebar.tsx           # Document library
│   │   ├── MainPanel.tsx         # Central content area
│   │   └── StatusPanel.tsx       # Right sidebar status
│   ├── documents/
│   │   ├── DocumentTree.tsx      # File tree view
│   │   ├── DocumentEditor.tsx    # Markdown editor
│   │   └── DocumentViewer.tsx    # Read-only view
│   ├── workflow/
│   │   ├── StepNavigator.tsx     # Step progress bar
│   │   ├── WorkflowControls.tsx  # Pause, consult, navigate
│   │   ├── StepOutput.tsx        # Current step output
│   │   └── AIChat.tsx            # Strategic AI chat
│   ├── deployment/
│   │   ├── DeploymentStatus.tsx  # Environment status
│   │   ├── LocalServers.tsx      # Local dev management
│   │   └── LogViewer.tsx         # Real-time logs
│   ├── configuration/
│   │   ├── AIProviderForm.tsx    # Provider configuration
│   │   └── ConnectionTest.tsx    # Test AI connections
│   └── shared/
│       ├── Button.tsx            # UI primitives
│       ├── Modal.tsx
│       └── Toast.tsx
├── lib/
│   ├── api-client.ts             # Backend API client
│   ├── sse-client.ts             # SSE connection manager
│   └── utils.ts                  # Utility functions
├── stores/
│   ├── workflow-store.ts         # Workflow state (Zustand)
│   ├── document-store.ts         # Document state
│   └── ui-store.ts               # UI preferences
└── types/
    ├── workflow.types.ts
    ├── document.types.ts
    └── ai.types.ts
```

### 3.2 Key UI Components

**Document Tree (Left Sidebar)**
```tsx
interface DocumentTreeProps {
  documents: DocumentInfo[];
  onSelect: (path: string) => void;
  onEdit: (path: string) => void;
  selectedPath?: string;
}

// Features:
// - Collapsible folders
// - Icons per document type
// - Badge for open questions count
// - Star icon for current sprint
// - Archive folder at bottom
```

**Step Navigator (Top Bar)**
```tsx
interface StepNavigatorProps {
  currentStep: WorkflowStep;
  status: WorkflowStatus;
  onPrevious: () => void;
  onNext: () => void;
  onPause: () => void;
  onConsult: () => void;
}

// Features:
// - Visual progress indicator (0-4)
// - Current step highlighted
// - Disabled states based on workflow
// - Tooltip with step description
```

**Strategic AI Chat**
```tsx
interface AIChatProps {
  isOpen: boolean;
  onClose: () => void;
  context: ProjectContext;
}

// Features:
// - Message history
// - Streaming responses
// - Quick action buttons
// - Code syntax highlighting
// - Teaching mode indicators
```

### 3.3 State Management Strategy

**Global State (Zustand):**
- Workflow state and transitions
- Current project context
- AI configurations

**Server State (React Query/SWR):**
- Document list and content
- Deployment status
- Server metrics

**Local State (React useState):**
- UI interactions
- Form inputs
- Modal states

---

## 4. Backend Architecture

### 4.1 API Structure

```
backend/
├── app/
│   ├── main.py                   # FastAPI app entry
│   ├── dependencies.py           # Dependency injection
│   ├── config.py                 # Configuration management
│   └── exceptions.py             # Custom exceptions
├── routers/
│   ├── workflow.py               # Workflow control endpoints
│   ├── documents.py              # Document CRUD
│   ├── ai.py                     # AI interaction endpoints
│   ├── git.py                    # Git operations
│   ├── deployment.py             # Fly.io deployment
│   └── servers.py                # Local server management
├── services/
│   ├── workflow_service.py       # Workflow state machine
│   ├── document_service.py       # File operations
│   ├── ai_service.py             # AI provider abstraction
│   ├── git_service.py            # Git operations
│   ├── deployment_service.py     # Fly.io integration
│   └── process_service.py        # Server management
├── models/
│   ├── workflow.py               # Pydantic models
│   ├── document.py
│   ├── ai.py
│   └── deployment.py
├── core/
│   ├── ai_providers/
│   │   ├── base.py               # Base provider class
│   │   ├── custom.py             # Custom API provider
│   │   ├── anthropic.py          # Anthropic provider
│   │   └── openai.py             # OpenAI provider
│   └── workflow_engine.py        # State machine implementation
├── utils/
│   ├── markdown_parser.py        # Parse questions.md, etc.
│   ├── file_watcher.py           # Monitor file changes
│   └── command_runner.py         # Execute shell commands
└── tests/
    ├── test_workflow.py
    ├── test_documents.py
    └── test_ai_providers.py
```

### 4.2 Core API Endpoints

**Workflow Control:**
```python
@router.post("/workflow/start")
async def start_workflow(project_path: str) -> WorkflowState

@router.post("/workflow/step/{step}")
async def execute_step(step: WorkflowStep) -> StepResult

@router.post("/workflow/pause")
async def pause_workflow() -> WorkflowState

@router.post("/workflow/resume")
async def resume_workflow() -> WorkflowState

@router.get("/workflow/status")
async def get_status() -> WorkflowState

@router.get("/workflow/stream")
async def stream_output() -> StreamingResponse  # SSE
```

**Document Management:**
```python
@router.get("/documents")
async def list_documents(path: str = "_project_docs") -> List[DocumentInfo]

@router.get("/documents/{path:path}")
async def read_document(path: str) -> DocumentContent

@router.put("/documents/{path:path}")
async def write_document(path: str, content: DocumentUpdate) -> None

@router.post("/documents/archive/{path:path}")
async def archive_document(path: str) -> ArchiveResult

@router.get("/questions")
async def get_open_questions() -> List[Question]

@router.post("/questions")
async def add_question(question: QuestionInput) -> QuestionResult

@router.put("/questions/{id}/resolve")
async def resolve_question(id: str, resolution: Resolution) -> None
```

**AI Interaction:**
```python
@router.post("/ai/chat/{role}")
async def chat_with_ai(role: AIRole, messages: List[Message]) -> AIResponse

@router.get("/ai/stream/{role}")
async def stream_ai_response(role: AIRole, messages: List[Message]) -> StreamingResponse

@router.post("/ai/test-connection")
async def test_ai_connection(config: AIProviderConfig) -> ConnectionResult

@router.get("/ai/configurations")
async def get_ai_configs() -> RoleConfiguration

@router.put("/ai/configurations")
async def update_ai_configs(config: RoleConfiguration) -> None
```

**Deployment:**
```python
@router.post("/deploy/staging")
async def deploy_to_staging() -> DeploymentResult

@router.post("/deploy/production")
async def deploy_to_production() -> DeploymentResult

@router.get("/deploy/status/{environment}")
async def get_deployment_status(environment: str) -> DeploymentStatus

@router.get("/deploy/logs/{environment}")
async def stream_deployment_logs(environment: str) -> StreamingResponse
```

**Local Servers:**
```python
@router.post("/servers/start")
async def start_servers() -> ServersStatus

@router.post("/servers/stop")
async def stop_servers() -> ServersStatus

@router.get("/servers/status")
async def get_servers_status() -> ServersStatus

@router.get("/servers/logs/{server}")
async def stream_server_logs(server: str) -> StreamingResponse

@router.get("/servers/metrics")
async def get_resource_metrics() -> ResourceMetrics
```

### 4.3 Middleware and Cross-Cutting Concerns

**Middleware Stack:**
1. **CORS** - Allow frontend origin
2. **Request ID** - Track requests for debugging
3. **Error Handling** - Standardized error responses
4. **Logging** - Structured request/response logging
5. **Rate Limiting** - Protect AI endpoints from abuse

**Error Response Format:**
```python
class APIError(BaseModel):
    error_code: str
    message: str
    details: Optional[Dict[str, Any]]
    request_id: str
    timestamp: datetime
```

---

## 5. Data Flow Patterns

### 5.1 Step Execution Flow

```
User clicks "Next Step"
         │
         ▼
    Frontend sends POST /workflow/step/{step}
         │
         ▼
    Backend validates state transition
         │
         ▼
    Workflow Engine loads system prompt for step
         │
         ▼
    Document Service reads all _project_docs/
         │
         ▼
    AI Provider receives context + instructions
         │
         ▼
    AI streams response (SSE to frontend)
         │
         ▼
    Frontend displays real-time output
         │
         ▼
    AI completes with "****READY FOR..." marker
         │
         ▼
    Workflow Engine updates state
         │
         ▼
    Git Service commits changes
         │
         ▼
    Frontend enables "Next Step" button
```

### 5.2 Question Resolution Flow

```
AI (Backend/Frontend) encounters unclear requirement
         │
         ▼
    AI adds entry to questions.md
         │
         ▼
    Document Service detects new question
         │
         ▼
    Frontend shows notification (red badge)
         │
         ▼
    User clicks "Consult Strategic AI"
         │
         ▼
    Workflow pauses current step
         │
         ▼
    Strategic AI chat opens with context
         │
         ▼
    Strategic AI explains options (teaching mode)
         │
         ▼
    User approves resolution
         │
         ▼
    Document Service updates:
      - questions.md (mark resolved)
      - architecture.md (if needed)
      - decisions.md (log reasoning)
         │
         ▼
    Workflow resumes from paused state
```

### 5.3 Deployment Flow

```
Frontend AI completes Step 001
         │
         ▼
    Deployment Service triggered
         │
         ▼
    Git Service verifies clean state
         │
         ▼
    Build frontend (npm run build)
         │
         ▼
    Fly.io CLI executes deploy
         │
         ▼
    Stream build/deploy logs to frontend
         │
         ▼
    Health check on staging URL
         │
         ▼
    Report deployment success + URL
         │
         ▼
    User tests on staging
         │
         ▼
    Optional: Promote to production
```

---

## 6. Security Considerations

### 6.1 API Security

- **API Key Storage:** Environment variables only, never in code
- **Input Validation:** Pydantic models for all inputs
- **Path Traversal:** Validate all file paths within project directory
- **Command Injection:** Sanitize all shell command inputs
- **Rate Limiting:** Prevent AI API abuse

### 6.2 Credential Management

```python
# .env file structure (never committed)
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
CUSTOM_API_KEY=...
CUSTOM_API_URL=https://api.your-service.com

# Fly.io secrets (set via CLI)
flyctl secrets set ANTHROPIC_API_KEY=sk-ant-...
```

### 6.3 Authentication Placeholders

As per ai_coding_guidelines.md, authentication will be integrated later:

```typescript
// TODO: Integrate with client's auth system
const authMiddleware = (req, res, next) => {
  // Placeholder: Accept all requests during development
  req.user = { id: 'dev-user', role: 'admin' };
  next();
};
```

---

## 7. Testing Strategy

### 7.1 Test Categories

**Unit Tests:**
- AI Provider abstraction layer
- Document parsing and validation
- Workflow state transitions
- Git commit message formatting

**Integration Tests:**
- API endpoint contracts
- Document CRUD operations
- Workflow step execution
- Deployment pipeline

**End-to-End Tests:**
- Complete 5-step workflow cycle
- Question resolution flow
- Local server management
- Deployment verification

### 7.2 Test Infrastructure

```
tests/
├── unit/
│   ├── test_ai_providers.py
│   ├── test_document_service.py
│   └── test_workflow_engine.py
├── integration/
│   ├── test_api_endpoints.py
│   ├── test_git_operations.py
│   └── test_deployment.py
├── e2e/
│   ├── test_full_workflow.py
│   └── test_user_journeys.py
└── fixtures/
    ├── sample_documents/
    ├── mock_ai_responses/
    └── test_projects/
```

### 7.3 AI Provider Mocking

```python
class MockAIProvider(IAIProvider):
    """Mock provider for testing without API costs"""

    async def chat(self, messages, options=None):
        # Return predefined responses based on context
        if "questions.md" in str(messages):
            return self._question_response()
        return self._default_response()
```

---

## 8. Performance Considerations

### 8.1 Response Time Targets

- **AI API calls:** < 2s (with streaming start)
- **Document operations:** < 100ms
- **Git operations:** < 500ms
- **Local server start:** < 10s
- **Fly.io deployment:** < 3 min

### 8.2 Optimization Strategies

**Streaming:**
- All AI responses streamed via SSE
- Deployment logs streamed in real-time
- Server logs streamed incrementally

**Caching:**
- Document content cached until file change detected
- AI configurations cached in memory
- Git status cached with invalidation

**Concurrency:**
- Async throughout backend (FastAPI + asyncio)
- Non-blocking file operations
- Parallel document loading

---

## 9. Error Handling and Recovery

### 9.1 Error Categories

1. **AI Provider Errors**
   - Connection timeout → Retry with backoff
   - Rate limit → Queue and retry
   - Invalid response → Log and notify user

2. **File System Errors**
   - Permission denied → Clear error message
   - File not found → Auto-recovery where possible
   - Disk full → Critical alert

3. **Deployment Errors**
   - Build failure → Show logs, suggest fixes
   - Deploy timeout → Automatic retry (1x)
   - Health check fail → Rollback option

4. **Workflow Errors**
   - Invalid state transition → Explain to user
   - AI step incomplete → Allow retry or skip
   - Missing documents → Create from template

### 9.2 Recovery Mechanisms

```python
class WorkflowRecovery:
    def restore_from_checkpoint(self):
        """Restore workflow state from last known good state"""

    def skip_failed_step(self):
        """Allow user to skip problematic step"""

    def reset_to_step(self, step: WorkflowStep):
        """Reset workflow to specific step"""
```

---

## 10. Configuration Management

### 10.1 Configuration Files

```
.refrain/
├── config.json                   # User preferences
├── ai-providers.json             # AI configurations (per role)
├── workflow-state.json           # Current workflow state
├── deployment.json               # Fly.io configurations
└── .refrain.lock                 # Lock file for concurrent access
```

### 10.2 Environment-Specific Configs

```json
// .refrain/config.json
{
  "projectPath": "C:\\Users\\Chris\\Documents\\_DevProjects\\melody-lms",
  "environment": "development",
  "autoSave": true,
  "autoCommit": false,
  "logLevel": "info",
  "uiTheme": "dark",
  "shortcuts": {
    "nextStep": "Ctrl+Shift+N",
    "consultAI": "Ctrl+Shift+C"
  }
}
```

---

## 11. Observability and Monitoring

### 11.1 Logging Strategy

**Log Levels:**
- **DEBUG:** AI prompts, full responses, internal state
- **INFO:** Step transitions, deployments, commits
- **WARN:** Retries, performance degradation
- **ERROR:** Failures, exceptions

**Log Format:**
```
[2025-11-16 10:30:15.123] [INFO] [workflow_service]
  Step transition: STEP_001_FRONTEND -> STEP_002_CLEANUP
  Duration: 342s | Questions resolved: 1 | Files modified: 5
```

### 11.2 Metrics Collection

- AI API latency per provider
- Token usage per role
- Deployment success rate
- Step completion times
- Error frequency by category

---

## 12. Migration and Evolution Strategy

### 12.1 Database Considerations

Phase 1 (MVP) uses file-based storage:
- `.refrain/` directory for state
- Markdown files for documents
- JSON for configurations

Phase 2 may introduce database:
- SQLite for local state
- PostgreSQL for team collaboration
- Migration scripts provided

### 12.2 API Versioning

```
/api/v1/workflow/...
/api/v2/workflow/...  // Future versions
```

Headers:
```
X-API-Version: 1.0.0
X-Refrain-Version: 2.0.0
```

---

## 13. Development Environment Setup

### 13.1 Prerequisites

- Node.js 18+ (LTS)
- Python 3.11+
- Git 2.40+
- Fly.io CLI (flyctl)
- VS Code (recommended)

### 13.2 Local Development

```bash
# Clone repository
git clone https://github.com/user/refrain-ide-2.0.git
cd refrain-ide-2.0

# Backend setup
cd backend
python -m venv venv
source venv/bin/activate  # or venv\Scripts\activate on Windows
pip install -r requirements.txt
uvicorn app.main:app --reload

# Frontend setup (new terminal)
cd frontend
npm install
npm run dev

# Access
# Frontend: http://localhost:3000
# Backend: http://localhost:8000
# API Docs: http://localhost:8000/docs
```

---

## 14. Dependencies and Libraries

### 14.1 Backend Dependencies

```python
# requirements.txt
fastapi==0.104.1
uvicorn[standard]==0.24.0
pydantic==2.5.0
python-dotenv==1.0.0
gitpython==3.1.40
psutil==5.9.6
aiofiles==23.2.1
httpx==0.25.1
anthropic==0.7.0
openai==1.3.0
pytest==7.4.3
pytest-asyncio==0.21.1
```

### 14.2 Frontend Dependencies

```json
// package.json dependencies
{
  "next": "^14.0.3",
  "react": "^18.2.0",
  "typescript": "^5.3.2",
  "tailwindcss": "^3.3.6",
  "@radix-ui/react-icons": "^1.3.0",
  "zustand": "^4.4.7",
  "swr": "^2.2.4",
  "@monaco-editor/react": "^4.6.0",
  "react-markdown": "^9.0.1",
  "lucide-react": "^0.294.0"
}
```

---

## 15. Success Metrics and KPIs

### 15.1 Technical Metrics

- **Uptime:** 99.5% for Refrain IDE
- **AI Response Time:** P95 < 3s
- **Deployment Success Rate:** > 95%
- **Error Rate:** < 1% of operations

### 15.2 User Experience Metrics

- **Time to First Step:** < 2 minutes from project load
- **Average Sprint Completion:** < 2 days
- **Question Resolution Time:** < 30 minutes
- **User Satisfaction:** > 4/5 rating

### 15.3 Learning Metrics

- **Decisions Understood:** User can explain 80% of architectural choices
- **Pattern Recognition:** User identifies correct approach 60% of time
- **Independent Problem-Solving:** Reduces Strategic AI consultations by 30% over 5 sprints

---

## Document Maintenance

**Last Updated:** November 16, 2025
**Version:** 1.0.0
**Status:** Initial Technical Plan
**Next Review:** After Phase 1 completion

**Change Log:**
- 2025-11-16: Initial creation from requirements analysis

---

*This technical plan should be updated as implementation progresses and architectural decisions are made. All significant changes should be documented in `decisions.md`.*
