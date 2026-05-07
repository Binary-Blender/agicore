# Refrain: Human-AI IDE Requirements
## Documentation-Driven Development with AI Teaching
### Version 2.0 - November 2025

---

## 🎯 Core Vision

**Refrain is a Human-AI IDE where you orchestrate specialized AI agents through documentation, learning architecture while building production software.**

**Key Innovation:** The Strategic AI acts as your technical mentor, explaining every decision and teaching you why it matters - not just what to do.

**Not a goal:** Replace developers  
**The goal:** Train better architects who leverage AI effectively

---

## 👥 The Three AI Roles

### Strategic AI (The Teacher/Tech Lead)
**Primary Responsibilities:**
- Partner with user on all architectural decisions
- Mediate between specialist AIs
- Maintain project documentation
- **Teach the user WHY decisions matter**
- Research options when needed
- Answer questions from Frontend/Backend AIs

**Interaction Style:**
```
"I see the Frontend AI is asking about state management (Q004).

Here's the situation: They need to choose between Redux and React 
Context for managing user sessions.

My recommendation: React Context

Why: Our state needs are simple - just user info, course progress, 
UI preferences. Redux would be overkill. Context is built-in, easier 
to maintain, and we can migrate later if needed.

This follows 'boring architecture' - choose the simplest thing that 
works. Complexity is expensive.

Does this make sense? Should I tell Frontend to use Context?"
```

**API Recommendation:** GPT-4o or Claude Sonnet 4.5 (needs strong reasoning + teaching ability)

### Frontend AI (The UI Specialist)
**Primary Responsibilities:**
- Build React/Next.js UI components
- Review backend implementation (Step 001)
- Create frontend tests
- Document UI patterns
- Clean up old documentation (Step 002)
- Propose next sprint plan (Step 003)
- Deploy to staging for user testing

**Interaction Style:**
- Task-focused, efficient
- Asks questions when requirements unclear
- Documents decisions in code comments

**API Recommendation:** User's custom Coding API or Claude Sonnet (cost-effective for iterative work)

### Backend AI (The Implementation Specialist)
**Primary Responsibilities:**
- Implement FastAPI/Flask endpoints
- Database schema and migrations
- Business logic implementation
- Backend tests
- Follow current_sprint.md requirements
- Flag architectural issues

**Interaction Style:**
- Implementation-focused
- Asks clarifying questions about requirements
- Suggests optimizations

**API Recommendation:** User's custom Coding API or DeepSeek Coder (optimized for backend work)

---

## 🔄 The 5-Step Development Cycle

### Step 000: Strategic Planning
**Who:** Strategic AI + User  
**Trigger:** User initiates OR any AI requests help mid-cycle  
**Duration:** Variable (until user is satisfied)

**Process:**
1. Strategic AI reads ALL documents in `_project_docs/`
2. Checks `questions.md` for open questions from other AIs
3. If questions exist, works through them with user:
   - Explains what the specialist AI is asking
   - Researches if needed (web search, documentation review)
   - Proposes answer with reasoning
   - Teaches user the tradeoffs
   - Gets user approval
   - Updates `questions.md` with resolution
   - Updates relevant docs (`architecture.md`, `decisions.md`, etc.)
4. Works with user on strategic documents:
   - `backlog.md` - Prioritized features/bugs
   - `vision.md` - Project direction
   - `constraints.md` - Technical/business limits
   - `decisions.md` - Architectural choices and WHY

**Output:** "****READY FOR LMS STEP 001****"

---

### Step 001: Frontend Development
**Who:** Frontend AI  
**Trigger:** User approval from Step 000 or 003  
**Duration:** Until deployment + testing complete

**Process:**
1. Read ALL documentation in `_project_docs/`
2. Review current `current_sprint.md` requirements
3. Build/update frontend features
4. Review backend code for integration issues
5. If unclear about anything:
   - Add question to `questions.md`
   - Notify user: "I've logged Q[number], need guidance"
   - STOP and wait for user direction
6. Run tests
7. Deploy to staging (e.g., Vercel, Fly.io)
8. Create technical documentation in `_project_docs/` if needed
9. Provide staging URL to user for testing

**Output:** "****READY FOR LMS STEP 002****"

---

### Step 002: Documentation Cleanup
**Who:** Frontend AI  
**Trigger:** User approval from Step 001  
**Duration:** 15-30 minutes

**Process:**
1. Review all documents in `_project_docs/`
2. Identify outdated/obsolete documentation
3. Create `_archive/` folder if it doesn't exist
4. Move obsolete docs to `_archive/` with timestamp
5. Update any references to archived docs
6. Consolidate redundant information

**Output:** "****READY FOR LMS STEP 003****"

---

### Step 003: Sprint Planning
**Who:** Frontend AI + User  
**Trigger:** User approval from Step 002  
**Duration:** Until user approves sprint plan

**Process:**
1. Review current state of project
2. Check `backlog.md` for priorities
3. Consider user feedback from Step 001 testing
4. Propose next sprint in `current_sprint.md`:
   - Clear objectives
   - Specific tasks for Backend AI
   - Acceptance criteria
   - Technical notes/constraints
5. If sprint requires architectural changes:
   - Add question to `questions.md`
   - Wait for Strategic AI consultation
6. Present plan to user for approval

**Output:** "****READY FOR LMS STEP 004****"

---

### Step 004: Backend Implementation
**Who:** Backend AI  
**Trigger:** User approval from Step 003  
**Duration:** Until all sprint tasks complete

**Process:**
1. Read ALL documentation in `_project_docs/` (ignore `_archive/`)
2. Read `current_sprint.md` for requirements
3. Follow guidelines in `ai_coding_guidelines.md`
4. Implement features/fixes
5. If unclear about anything:
   - Add question to `questions.md`
   - Notify user: "I've logged Q[number], need guidance"
   - STOP and wait for user direction
6. If sprint plan seems flawed:
   - Document concerns in `questions.md`
   - Recommend going back to Step 003
   - Wait for user decision
7. Run tests
8. Update technical documentation
9. Provide summary of work completed

**Output:** "****READY TO HAVE MY LMS WORK CHECKED****"

---

## 📚 Document Library Structure

```
_project_docs/
├── 📋 backlog.md              ← Strategic AI maintains
├── 🎯 vision.md               ← Strategic AI + User define
├── 🏗️  architecture.md         ← All AIs read, Strategic AI updates
├── 📝 current_sprint.md       ← Frontend AI proposes, User approves
├── ✅ decisions.md             ← Strategic AI logs all decisions with reasoning
├── 🚧 constraints.md          ← User + Strategic AI define limits
├── 🔗 api_contracts.md        ← Frontend defines, Backend implements
├── ❓ questions.md             ← Any AI adds questions, Strategic AI resolves
├── 📖 ai_coding_guidelines.md ← Coding standards and patterns
└── 📦 _archive/               ← Step 002 moves old docs here
    ├── old_sprint_plan_2025-11-01.md
    └── deprecated_api_design_2025-10-15.md
```

### questions.md Format

```markdown
# Open Questions

## Q001 - From Backend AI (2025-11-16 10:30 AM)
**Question:** Should I implement real-time notifications with WebSockets 
or use polling? current_sprint.md asks for "real-time updates" but doesn't 
specify implementation.

**Context:** Sprint 3, Task 2.1 - User notifications feature
**Impact:** Affects architecture, may need infrastructure changes
**Status:** 🟡 Waiting for Strategic AI

---

## Q002 - From Frontend AI (2025-11-15 3:45 PM)
**Question:** Design shows 50+ column table. This won't work on mobile. 
Should I create a separate mobile view?

**Context:** Sprint 2, Admin dashboard
**Impact:** Adds 2-3 days of work, not in current sprint
**Status:** ✅ Resolved
**Resolution:** Yes, use responsive card layout for mobile. Updated 
architecture.md with responsive design patterns.
**Decided by:** Strategic AI + User on 2025-11-15
```

### decisions.md Format (With Teaching)

```markdown
# Architectural Decisions

## State Management (2025-11-16)
**Decision:** Use React Context instead of Redux
**Decided by:** Strategic AI + User
**Question:** Frontend AI Q004

**Context:**
Frontend AI needed to choose state management solution for user sessions, 
course progress, and UI preferences.

**Options Considered:**
1. Redux - Industry standard, powerful, great DevTools
2. React Context - Built-in, simpler, less boilerplate
3. Zustand - Middle ground, modern alternative

**Decision: React Context**

**Reasoning:**
- Our state is simple (just user info, course data, UI prefs)
- Redux adds unnecessary complexity for our scale
- Context is built into React - zero dependencies
- Easier for future developers to understand
- Can migrate to Redux later if we need offline support or time-travel debugging

**Principle Applied:** "Boring Architecture" - Choose simplest tool that solves 
the problem. Complexity is expensive. Over-engineering early costs more than 
refactoring later.

**Lesson Learned:** Match tool complexity to problem complexity, not future 
possibilities.

**Impact:** Faster development, easier onboarding, reduced maintenance burden

---
```

---

## 🔧 Technical Architecture

### Multi-API Configuration System

```typescript
// config/ai-providers.ts
export interface AIProviderConfig {
  provider: 'custom' | 'anthropic' | 'openai';
  model: string;
  apiKey?: string;
  baseURL?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface RoleConfiguration {
  strategic: AIProviderConfig;
  frontend: AIProviderConfig;
  backend: AIProviderConfig;
}

export const defaultConfig: RoleConfiguration = {
  strategic: {
    provider: 'anthropic',
    model: 'claude-sonnet-4-20250514',
    temperature: 0.7,
    maxTokens: 8192
  },
  frontend: {
    provider: 'custom',
    model: 'qwen-2.5-coder-32b',
    baseURL: 'https://api.your-coding-api.com',
    temperature: 0.3,
    maxTokens: 4096
  },
  backend: {
    provider: 'custom',
    model: 'deepseek-coder-v2',
    baseURL: 'https://api.your-coding-api.com',
    temperature: 0.2,
    maxTokens: 4096
  }
};
```

### AI Provider Abstraction Layer

```typescript
// lib/ai-client.ts
export class AIClient {
  constructor(private config: AIProviderConfig) {}

  async chat(messages: Message[], options?: ChatOptions): Promise<AIResponse> {
    switch (this.config.provider) {
      case 'custom':
        return this.customAPIChat(messages, options);
      case 'anthropic':
        return this.anthropicChat(messages, options);
      case 'openai':
        return this.openaiChat(messages, options);
    }
  }

  private async customAPIChat(messages: Message[], options?: ChatOptions) {
    // Your coding API implementation
    const response = await fetch(`${this.config.baseURL}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.config.model,
        messages,
        temperature: options?.temperature ?? this.config.temperature,
        max_tokens: options?.maxTokens ?? this.config.maxTokens
      })
    });
    return response.json();
  }

  private async anthropicChat(messages: Message[], options?: ChatOptions) {
    // Anthropic API implementation
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.config.apiKey!,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: this.config.model,
        messages,
        temperature: options?.temperature ?? this.config.temperature,
        max_tokens: options?.maxTokens ?? this.config.maxTokens
      })
    });
    return response.json();
  }

  private async openaiChat(messages: Message[], options?: ChatOptions) {
    // OpenAI API implementation
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`
      },
      body: JSON.stringify({
        model: this.config.model,
        messages,
        temperature: options?.temperature ?? this.config.temperature,
        max_tokens: options?.maxTokens ?? this.config.maxTokens
      })
    });
    return response.json();
  }
}
```

### Role-Based AI Manager

```typescript
// lib/ai-roles.ts
export class AIRoleManager {
  private strategicAI: AIClient;
  private frontendAI: AIClient;
  private backendAI: AIClient;

  constructor(config: RoleConfiguration) {
    this.strategicAI = new AIClient(config.strategic);
    this.frontendAI = new AIClient(config.frontend);
    this.backendAI = new AIClient(config.backend);
  }

  async executeStep(
    step: WorkflowStep,
    context: ProjectContext
  ): Promise<StepResult> {
    const ai = this.getAIForStep(step);
    const systemPrompt = this.getSystemPromptForStep(step);
    const documents = await this.loadRelevantDocuments(context, step);

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: this.formatStepRequest(step, documents) }
    ];

    return ai.chat(messages);
  }

  private getAIForStep(step: WorkflowStep): AIClient {
    switch (step) {
      case 'STEP_000_STRATEGIC':
        return this.strategicAI;
      case 'STEP_001_FRONTEND':
      case 'STEP_002_CLEANUP':
      case 'STEP_003_PLANNING':
        return this.frontendAI;
      case 'STEP_004_BACKEND':
        return this.backendAI;
    }
  }
}
```

---

## 📁 Project Structure & Git Workflow

### Local Development Setup

```
C:\Users\Chris\Documents\_DevProjects\melody-lms\
├── _project_docs/           ← Documentation (tracked in git)
│   ├── backlog.md
│   ├── vision.md
│   ├── architecture.md
│   ├── current_sprint.md
│   ├── decisions.md
│   ├── constraints.md
│   ├── api_contracts.md
│   ├── questions.md
│   ├── ai_coding_guidelines.md
│   └── _archive/
├── frontend/                ← React/Next.js app
│   ├── src/
│   ├── public/
│   ├── package.json
│   └── README.md
├── backend/                 ← FastAPI/Python
│   ├── app/
│   ├── tests/
│   ├── requirements.txt
│   └── README.md
├── .git/
├── .gitignore
├── fly.toml                 ← Fly.io deployment config
└── README.md
```

### Git Workflow

**All AIs commit their work:**

```bash
# Frontend AI commits (Step 001, 002, 003)
git add .
git commit -m "feat: Add video preview modal [Step 001]"
git push origin main

# Backend AI commits (Step 004)
git add .
git commit -m "feat: Implement real-time notifications API [Step 004]"
git push origin main

# Strategic AI commits (Step 000)
git add _project_docs/
git commit -m "docs: Update architecture with state management decision"
git push origin main
```

**Commit Message Convention:**
```
<type>: <description> [<step>]

Types:
- feat: New feature
- fix: Bug fix
- docs: Documentation only
- refactor: Code restructuring
- test: Adding tests
- chore: Maintenance

Examples:
- feat: Add user authentication [Step 004]
- docs: Update API contracts for notifications [Step 000]
- fix: Resolve mobile responsive issue [Step 001]
```

### Fly.io Deployment

**Two Environments:**

1. **Staging** - Deployed after Step 001
   - URL: `https://melody-lms-staging.fly.dev`
   - Auto-deploys on push to `main`
   - User tests here before approving Step 002

2. **Production** - Deployed manually by user
   - URL: `https://melody-lms.fly.dev`
   - User decides when to promote staging to production

**Deployment Process (Step 001):**

Frontend AI automatically:
```bash
# Build frontend
cd frontend
npm run build

# Deploy to Fly.io staging
fly deploy --config fly.staging.toml

# Provide URL to user
echo "****DEPLOYED TO STAGING: https://melody-lms-staging.fly.dev****"
echo "Please test the following features:"
echo "- [Feature 1 from current_sprint.md]"
echo "- [Feature 2 from current_sprint.md]"
```

**fly.staging.toml example:**
```toml
app = "melody-lms-staging"

[build]
  dockerfile = "Dockerfile"

[env]
  NODE_ENV = "staging"
  API_URL = "https://melody-lms-api-staging.fly.dev"

[[services]]
  http_checks = []
  internal_port = 3000
  protocol = "tcp"

  [[services.ports]]
    port = 80
    handlers = ["http"]

  [[services.ports]]
    port = 443
    handlers = ["tls", "http"]
```

---

## 🧪 User Testing Flow

### After Step 001 Completes

**Frontend AI provides:**
```
****READY FOR LMS STEP 002****

Staging deployment complete!
URL: https://melody-lms-staging.fly.dev

Changes in this deployment:
✓ Added video preview modal (Sprint 3, Task 1.1)
✓ Fixed mobile responsive table (Sprint 3, Task 1.2)
✓ Updated user profile page (Sprint 3, Task 1.3)

Please test:
1. Click "Preview" button on video details page
2. Verify modal shows video player
3. Check table display on mobile device (< 768px)
4. Test profile page edit functionality

When satisfied, approve to proceed to Step 002.
If issues found, I can fix them before moving forward.
```

**User can:**
- Test in real browser at staging URL
- Check on mobile devices
- Share with team/stakeholders
- Request changes before proceeding
- Approve when ready

### Running Locally Anytime

**User can run locally for faster iteration:**

```bash
# Terminal 1 - Backend
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload

# Terminal 2 - Frontend  
cd frontend
npm install
npm run dev

# Local URLs:
# Frontend: http://localhost:3000
# Backend: http://localhost:8000
# API Docs: http://localhost:8000/docs
```

**Refrain UI should provide "Run Locally" button:**
- Checks if ports 3000/8000 are available
- Starts both servers in background
- Shows logs in real-time
- Provides local URLs
- User can test without waiting for deployment

---

## 🎨 UI/UX Requirements

### Main Interface: Document-Centric Dashboard

**Left Sidebar: Document Library**
```
📚 Documents
├── 📋 backlog.md              [Edit] [View]
├── 🎯 vision.md               [Edit] [View]
├── 🏗️  architecture.md         [Edit] [View]
├── 📝 current_sprint.md       [Edit] [View] ⭐
├── ✅ decisions.md             [Edit] [View]
├── 🚧 constraints.md          [Edit] [View]
├── 🔗 api_contracts.md        [Edit] [View]
├── ❓ questions.md             [Edit] [View] 🔴 3 open
└── 📦 _archive/               [Expand]

⚙️  Settings
└── 🤖 AI Configuration
```

**Center Panel: Active Document / Workflow**

*When viewing a document:*
```
┌─────────────────────────────────────────────────┐
│ 📝 current_sprint.md                    [Edit] │
├─────────────────────────────────────────────────┤
│                                                 │
│ # Sprint 3: Video Preview & Notifications      │
│                                                 │
│ ## Objectives                                   │
│ - Add video preview before sending             │
│ - Implement real-time notifications            │
│                                                 │
│ ## Backend Tasks (for Step 004)                │
│ ...                                             │
└─────────────────────────────────────────────────┘
```

*When running workflow:*
```
┌─────────────────────────────────────────────────┐
│ Step 001: Frontend Development           [●REC] │
├─────────────────────────────────────────────────┤
│ Frontend AI is working...                       │
│                                                 │
│ ✓ Read architecture.md                          │
│ ✓ Read current_sprint.md                        │
│ ✓ Created VideoPreviewModal.tsx                 │
│ ● Building component styles...                  │
│   ⏱️  2 min elapsed                              │
│                                                 │
│ [View Code] [View Logs] [Pause] [Consult AI]   │
└─────────────────────────────────────────────────┘
```

**Right Sidebar: Project Status**
```
🚀 Deployments
├── Production
│   └── https://melody-lms.fly.dev
│       Last: 2 days ago
│       [Deploy Now]
│
└── Staging  
    └── https://melody-lms-staging.fly.dev
        Last: 5 min ago ✓
        [Open] [Logs]

💻 Local Development
├── Backend:  ● Running (port 8000)
├── Frontend: ● Running (port 3000)
└── [Start Local] [Stop] [View Logs]

📊 Current Sprint
├── Progress: 60% (3/5 tasks)
├── Started: 3 days ago
└── [View Sprint Plan]

❓ Open Questions: 3
├── Q004 - Backend AI (State mgmt)
├── Q005 - Frontend AI (Mobile nav)
└── [Review Questions]
```

---

## 🎛️ Workflow Control Interface

### Step Navigation Bar

```
┌────────────────────────────────────────────────────────────┐
│                                                            │
│  [← Previous]  [⏸️  Pause]  [🤖 Consult Strategic AI]       │
│                                                            │
│  ●━━━━━━━━●━━━━━━━━●━━━━━━━━●━━━━━━━━●                      │
│  000      001      002      003      004                   │
│  Strategic Frontend Cleanup Planning Backend              │
│                     👈 You are here                         │
│                                                            │
│  [Next Step: Planning →]                                   │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

**Button States:**
- **Next Step**: Only enabled when current step completes with "****READY FOR..."
- **Previous**: Always enabled (user can go back to any step)
- **Pause**: Stops current AI, saves state
- **Consult Strategic AI**: Opens Strategic AI chat, passes current context

---

## 🤖 Strategic AI Chat Interface

**Triggered by:**
- User clicks "Consult Strategic AI" button
- AI adds question to questions.md
- User starts Step 000

**Interface:**
```
┌─────────────────────────────────────────────────┐
│ 💬 Strategic AI - Your Technical Mentor         │
├─────────────────────────────────────────────────┤
│                                                 │
│ Strategic AI:                                   │
│ Good morning! I see Frontend AI has question    │
│ Q004 about state management. Let me think       │
│ through this...                                 │
│                                                 │
│ [Explanation appears with teaching approach]    │
│                                                 │
│ Does this make sense? Should I tell Frontend    │
│ to use React Context?                           │
│                                                 │
├─────────────────────────────────────────────────┤
│ You:                                            │
│ [Type your response...]                         │
│                                                 │
│ [Send] [I agree, proceed] [Let me think more]  │
└─────────────────────────────────────────────────┘
```

**Quick Actions:**
- "I agree, proceed" - Strategic AI updates docs and notifies specialist AI
- "Let me think more" - Keeps conversation open
- "Research this more" - Strategic AI does web search
- "Show me alternatives" - Strategic AI explores other options

---

## ⚙️ AI Configuration Panel

```
┌─────────────────────────────────────────────────┐
│ 🤖 AI Provider Configuration                    │
├─────────────────────────────────────────────────┤
│                                                 │
│ Strategic AI (Teaching & Architecture)          │
│ ├── Provider: [Anthropic ▼]                     │
│ ├── Model: claude-sonnet-4-20250514            │
│ ├── Temperature: [0.7 ━━━●━━━━━ 1.0]            │
│ └── Max Tokens: [8192]                          │
│                                                 │
│ Frontend AI (UI Development)                    │
│ ├── Provider: [Custom Coding API ▼]             │
│ ├── Model: qwen-2.5-coder-32b                  │
│ ├── API URL: https://api.your-api.com          │
│ ├── Temperature: [0.3 ━●━━━━━━━━ 1.0]            │
│ └── Max Tokens: [4096]                          │
│                                                 │
│ Backend AI (Implementation)                     │
│ ├── Provider: [Custom Coding API ▼]             │
│ ├── Model: deepseek-coder-v2                   │
│ ├── API URL: https://api.your-api.com          │
│ ├── Temperature: [0.2 ●━━━━━━━━━━ 1.0]            │
│ └── Max Tokens: [4096]                          │
│                                                 │
│ [Test Connections] [Save Configuration]        │
│                                                 │
│ Providers Available:                            │
│ • Custom Coding API (Your API)                  │
│ • Anthropic (Claude)                            │
│ • OpenAI (GPT-4)                                │
└─────────────────────────────────────────────────┘
```

**Provider Dropdown Options:**
- Custom Coding API (requires API URL)
- Anthropic (requires API key)
- OpenAI (requires API key)

---

## 🧪 Testing & Deployment Controls

### Deployment Dashboard

```
┌─────────────────────────────────────────────────┐
│ 🚀 Deployment Status                            │
├─────────────────────────────────────────────────┤
│                                                 │
│ Staging Environment                             │
│ ✓ Deployed 5 minutes ago                        │
│ URL: https://melody-lms-staging.fly.dev         │
│                                                 │
│ Changes in this deployment:                     │
│ ✓ Video preview modal                           │
│ ✓ Mobile responsive tables                      │
│ ✓ User profile updates                          │
│                                                 │
│ [Open Staging] [View Logs] [Rollback]          │
│                                                 │
│ ─────────────────────────────────────────────   │
│                                                 │
│ Production Environment                          │
│ Last deployed: 2 days ago                       │
│ URL: https://melody-lms.fly.dev                 │
│                                                 │
│ [Promote Staging to Production]                 │
│ ⚠️  This will deploy to live users               │
│                                                 │
└─────────────────────────────────────────────────┘
```

### Local Development Panel

```
┌─────────────────────────────────────────────────┐
│ 💻 Local Development                            │
├─────────────────────────────────────────────────┤
│                                                 │
│ Backend Server                                  │
│ Status: ● Running on port 8000                  │
│ URL: http://localhost:8000                      │
│ [Stop] [Restart] [View Logs]                    │
│                                                 │
│ Frontend Server                                 │
│ Status: ● Running on port 3000                  │
│ URL: http://localhost:3000                      │
│ [Stop] [Restart] [View Logs]                    │
│                                                 │
│ ─────────────────────────────────────────────   │
│                                                 │
│ [Start All Servers]                             │
│ [Stop All Servers]                              │
│ [Open in Browser]                               │
│                                                 │
│ 📊 Resource Usage:                              │
│ ├── CPU: 23%                                    │
│ ├── Memory: 1.2 GB / 16 GB                      │
│ └── Requests: 47 (last minute)                  │
│                                                 │
└─────────────────────────────────────────────────┘
```

---

## 🔄 Complete User Journey Example

### Scenario: Adding Real-Time Notifications

**Day 1 - Morning:**

1. **User opens Refrain**
   - Sees "3 open questions" notification
   - Clicks to review

2. **Strategic AI greets user:**
   ```
   Good morning! I see Backend AI has question Q006 about 
   implementing real-time notifications. They're asking whether 
   to use WebSockets or Server-Sent Events (SSE).
   
   Let me explain the tradeoffs...
   [Teaching explanation follows]
   
   My recommendation: Start with SSE, migrate to WebSockets 
   later if needed.
   
   Does this make sense?
   ```

3. **User:** "Yes, that makes sense. Proceed."

4. **Strategic AI:**
   - Updates `questions.md` marking Q006 as resolved
   - Updates `architecture.md` with SSE decision
   - Updates `decisions.md` with reasoning
   - Shows user: "I've updated the docs. Ready to continue Step 004?"

5. **User clicks:** "Next Step: Backend"

6. **Backend AI:**
   - Reads updated architecture.md
   - Implements SSE endpoint
   - Adds tests
   - Commits: `feat: Add SSE notifications endpoint [Step 004]`
   - Shows: "****READY TO HAVE MY LMS WORK CHECKED****"

**Day 1 - Afternoon:**

7. **User reviews backend work:**
   - Clicks "Start Local Servers"
   - Opens http://localhost:3000
   - Tests notification feature
   - Finds bug: notifications not clearing

8. **User:** "Pause, consult Strategic AI"

9. **User explains issue to Strategic AI:**
   ```
   User: "Notifications aren't clearing when clicked."
   
   Strategic AI: "Let me check the implementation... 
   I see the issue. The Backend AI created the endpoint 
   to mark notifications as read, but Frontend AI hasn't 
   connected to it yet. This is because we're in Step 004 
   (backend only).
   
   Options:
   1. Go back to Step 003, add "connect notification clear 
      button to API" to sprint plan
   2. Add it to backlog for next sprint
   3. Quick fix: I can tell Backend AI to flag this for 
      Frontend
   
   What would you like to do?"
   
   User: "Option 1, let's do it right."
   ```

10. **User clicks:** "← Previous Step" (back to Step 003)

11. **Frontend AI re-opens** `current_sprint.md`:
    - User edits: "Connect notification clear button to 
      /api/notifications/{id}/read endpoint"
    - Frontend AI: "Updated! Ready for Step 004?"

12. **User:** "Next Step: Backend"

13. **Backend AI:**
    - Sees no changes needed (endpoint already exists)
    - "Backend work already complete. Ready to check."

14. **User:** "Next Step: Frontend" (cycles back)

15. **Frontend AI:**
    - Implements button connection
    - Deploys to staging
    - "Staging updated! Please test."

16. **User tests staging:**
    - https://melody-lms-staging.fly.dev
    - Notifications now clear correctly ✓

17. **User:** "Next Step: Documentation Cleanup"

18. **Frontend AI:**
    - Archives old sprint plans
    - "****READY FOR LMS STEP 003****"

19. **User:** "Next Step: Sprint Planning"

20. **Frontend AI proposes Sprint 4:**
    - Based on backlog.md
    - User reviews and approves

21. **User:** "Next Step: Backend"
    - Sprint 4 begins...

---

## 📝 Key Requirements Summary

### Must Have (MVP - Phase 1)

**Core Workflow:**
- ✅ 5-step cycle (000-004) with user control
- ✅ Strategic AI explains decisions (teaching mode)
- ✅ Questions.md system for AI-to-AI communication
- ✅ User can pause and consult Strategic AI anytime
- ✅ User can go back to previous steps

**Multi-API Support:**
- ✅ Configure different providers per role
- ✅ Support Custom API, Anthropic, OpenAI
- ✅ Abstraction layer for API calls
- ✅ Test connections before use

**Git & Deployment:**
- ✅ All work committed to git with clear messages
- ✅ Auto-deploy to Fly.io staging after Step 001
- ✅ User can deploy to production manually
- ✅ Local development server management

**Document Management:**
- ✅ Visual document library interface
- ✅ Edit documents directly in Refrain
- ✅ Archive old documents (Step 002)
- ✅ Questions.md tracking and resolution

**Testing:**
- ✅ Deploy to staging for browser testing
- ✅ Run locally for fast iteration
- ✅ View logs in real-time
- ✅ Rollback deployments if needed

### Should Have (Phase 2)

- Multiple project support
- Git branch management
- Team collaboration (multiple users)
- AI conversation history
- Cost tracking per AI role
- Performance monitoring

### Nice to Have (Phase 3)

- Visual architecture diagrams
- Automated testing dashboard
- Integration with issue trackers
- Template projects
- Community sharing of sprint plans

---

## 🎯 Success Criteria

**User can:**
1. Configure 3 different AI providers for 3 roles
2. Work through complete 5-step cycle
3. Pause anytime to consult Strategic AI
4. Learn WHY decisions are made (teaching moments)
5. Test on staging after each frontend update
6. Run locally for rapid testing
7. Go back to previous steps when needed
8. Understand the project through documentation
9. See all AI questions in one place
10. Deploy to production with confidence

**Technical:**
- Response time < 2s for AI calls (with streaming)
- Local servers start in < 10s
- Deployment to Fly.io completes in < 3 min
- Documents sync to git automatically
- Support 3+ API providers seamlessly

**Learning:**
- User understands architectural decisions after 5 sprints
- User can evaluate Strategic AI recommendations critically
- User builds vocabulary of design patterns
- User can explain tradeoffs to others

---

## 🚀 Implementation Priority

### Week 1-2: Core Foundation
1. Multi-API abstraction layer
2. Basic 5-step workflow (no UI, just prompts)
3. Git integration & commits
4. Document file system (CRUD operations)
5. Questions.md system

### Week 3-4: UI & Testing
6. Document library interface
7. Step navigation controls
8. Strategic AI chat interface
9. Local server management
10. Fly.io deployment automation

### Week 5-6: Polish & Deploy
11. Staging/production deployment UI
12. AI provider configuration panel
13. Real-time logs and status updates
14. Error handling and recovery
15. User testing and refinement

---

*This document defines Refrain v2.0 - A Human-AI IDE that teaches architecture while building production software.*

*Last Updated: November 16, 2025*
*Status: Ready for Implementation*