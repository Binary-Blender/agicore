# Refrain: Human-AI IDE Requirements
## Documentation-Driven Development with AI Teaching
### Version 3.0 - Flexible Role-Based Workflow - November 2025

---

## 🎯 Core Vision

**Refrain is a Human-AI IDE where you orchestrate specialized AI agents through documentation, learning architecture while building production software.**

**Key Innovation:** Work fluidly with any AI role at any time - Strategic AI for architecture, Tech Lead for requirements, Backend Dev for implementation - matching how you actually work.

**Not a goal:** Replace developers
**The goal:** Train better architects who leverage AI effectively with flexible, real-world workflows

---

## 👥 The Three AI Roles (Available Anytime)

### Strategic AI (The Architect/Teacher)
**Primary Responsibilities:**
- Make high-level architectural decisions
- Research technical options and explain tradeoffs
- **Teach the user WHY decisions matter** (not just what to do)
- Review and approve major technical changes
- Answer complex architecture questions
- Update `decisions.md` with reasoning

**When to use:**
- "Should we use Redis or Postgres for caching?"
- "I need help designing the authentication flow"
- "Explain the tradeoffs between REST and GraphQL for this use case"
- "Review this architectural decision and teach me why it's good/bad"

**Interaction Style:**
```
User: "Should we use WebSockets or Server-Sent Events for notifications?"

Strategic AI: "Great question! Let me think through the tradeoffs...

WebSockets:
- Bi-directional (server + client can send)
- More complex to scale (need sticky sessions)
- Better for: chat apps, real-time games

Server-Sent Events (SSE):
- Uni-directional (server → client only)
- Simple HTTP, scales with load balancer
- Better for: notifications, live updates

For your notification system, I recommend SSE because:
1. You only need server→client messages
2. Simpler to scale (stateless HTTP)
3. Works with existing infrastructure
4. Can upgrade to WebSockets later if needed

This follows the principle: start simple, migrate when you have actual
evidence you need something more complex.

Does this make sense?"
```

**API Recommendation:** GPT-4o or Claude Sonnet 4.5 (needs strong reasoning + teaching ability)

---

### Tech Lead (The Requirements Specialist)
**Primary Responsibilities:**
- Refine and clarify requirements
- Break down features into implementable tasks
- Create and update `current_sprint.md` with detailed task breakdowns
- Review implementation plans for completeness
- Manage `backlog.md` and prioritization
- Define acceptance criteria and test scenarios
- Clean up and organize documentation

**When to use:**
- "Help me break down the playlist feature into tasks"
- "I need to update the requirements for the notification system"
- "Create a sprint plan for the next 2 weeks"
- "What should we prioritize next?"
- "Clean up the documentation and archive old files"

**Interaction Style:**
```
User: "Break down the playlist feature into tasks"

Tech Lead: "I'll create a detailed task breakdown in current_sprint.md.

Based on the requirements, here's what I'm planning:

P19: Playlist System
├── Task 1: Database Schema (1h)
│   ├── Create playlists table
│   ├── Create playlist_items table
│   ├── Create user_progress table
│   └── Write migration + indexes
├── Task 2: Playlist CRUD API (3h)
│   ├── List/Get/Create/Update/Delete endpoints
│   ├── Add/Remove/Reorder items
│   └── Validation + tests
├── Task 3: Progress Tracking (2.5h)
│   ├── Start playlist endpoint
│   ├── Advance to next module
│   └── Auto-complete logic
└── Task 4: Frontend Integration (4h)
    ├── Admin playlist management UI
    ├── User playlist view
    └── Progress indicators

Should I write this to current_sprint.md with full acceptance
criteria and technical notes?"
```

**API Recommendation:** Claude Sonnet or GPT-4 (good at structured planning + detail)

---

### Backend Dev (The Implementation Specialist)
**Primary Responsibilities:**
- Implement features from `current_sprint.md`
- Write database migrations
- Create API endpoints with proper validation
- Write tests (unit + integration)
- Deploy to staging/production
- Update technical documentation
- Flag issues to Tech Lead or Strategic AI when needed

**When to use:**
- "Implement P17 from the current sprint"
- "Create the database migration for playlists"
- "Deploy the latest changes to staging"
- "Fix the bug in the user authentication flow"
- "Run the test suite and fix any failures"

**Interaction Style:**
```
User: "Implement P17 - Performance Monitoring from current_sprint.md"

Backend Dev: "Reading current_sprint.md... I see P17 has 4 tasks:
1. Query Logger (2.5h)
2. Request Monitor (2h)
3. Metrics API (1.5h)
4. Health Check Integration (0.5h)

Starting implementation...

✓ Created src/middleware/queryLogger.ts
✓ Created src/middleware/performanceMonitor.ts
✓ Created src/routes/metricsRoutes.ts
✓ Updated health check with performance section
✓ Added validation middleware
✓ Wrote unit tests (12 tests, all passing)
✓ Wrote integration tests (8 tests, all passing)

Ready to deploy? Or should I wait for review?"
```

**API Recommendation:** User's custom Coding API or DeepSeek Coder (optimized for implementation)

---

## 🔄 Flexible Role-Based Workflow

### How It Works

**You decide who to work with based on current needs:**

```
┌─────────────────────────────────────────────────┐
│  YOU (The Developer)                            │
│                                                 │
│  Choose based on what you need:                │
│                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌────────┐│
│  │Strategic AI  │  │  Tech Lead   │  │Backend ││
│  │              │  │              │  │  Dev   ││
│  │Architecture  │  │Requirements  │  │Implement││
│  │  Decisions   │  │  Planning    │  │  Code  ││
│  └──────────────┘  └──────────────┘  └────────┘│
│                                                 │
│  All working from same documentation:          │
│  • current_sprint.md                           │
│  • architecture.md                             │
│  • decisions.md                                │
│  • questions.md                                │
└─────────────────────────────────────────────────┘
```

### Example Real-World Sessions

**Session 1: Starting a New Feature**
```
You: "Tech Lead, I want to add a playlist feature to the LMS"
Tech Lead: [Reads backlog.md, asks clarifying questions]
Tech Lead: "Created detailed task breakdown in current_sprint.md"

You: "Strategic AI, should playlists use separate tables or JSON columns?"
Strategic AI: [Explains normalized vs denormalized approaches]
Strategic AI: "I recommend separate tables. Here's why..." [Updates decisions.md]

You: "Backend Dev, implement Task 1: Database Schema"
Backend Dev: [Creates migration, tests, commits]
```

**Session 2: Mid-Implementation Question**
```
Backend Dev: "I have a question about playlist ordering (added to questions.md Q007)"

You: "Strategic AI, answer Q007"
Strategic AI: [Reads question, researches, explains options]
Strategic AI: [Updates questions.md with resolution]

You: "Backend Dev, continue with the new approach"
Backend Dev: [Implements, tests, deploys to staging]
```

**Session 3: Sprint Planning**
```
You: "Tech Lead, what should we work on next?"
Tech Lead: [Reviews backlog.md, completed work, feedback]
Tech Lead: "I recommend P18: Notification System. Here's the breakdown..."

You: "Strategic AI, review this plan for architectural issues"
Strategic AI: "Looks good, but consider async processing for email notifications..."

You: "Tech Lead, update the plan with Strategic AI's feedback"
Tech Lead: [Updates current_sprint.md]
```

**Session 4: Direct Requirements Work**
```
You: "Tech Lead, the requirements for user roles need updating"
Tech Lead: [Reviews current requirements]
Tech Lead: "I see we have 3 roles (admin, manager, employee). What changes?"

You: "Add a 'trainer' role that can create content but not manage users"
Tech Lead: [Updates architecture.md, current_sprint.md]
Tech Lead: "Updated! Should we add this to the current sprint or backlog?"
```

---

## 📚 Document Library Structure

```
_project_docs/
├── 📋 backlog.md              ← Tech Lead maintains priorities
├── 🎯 vision.md               ← Strategic AI + You define direction
├── 🏗️  architecture.md         ← Strategic AI updates, all read
├── 📝 current_sprint.md       ← Tech Lead creates, Backend Dev implements
├── ✅ decisions.md             ← Strategic AI logs decisions with WHY
├── 🚧 constraints.md          ← You + Strategic AI define limits
├── 🔗 api_contracts.md        ← Tech Lead defines, Backend Dev implements
├── ❓ questions.md             ← Any AI adds questions, you + AIs resolve
├── 📖 ai_coding_guidelines.md ← Coding standards and patterns
└── 📦 _archive/               ← Tech Lead moves old docs here
    ├── old_sprint_2025-11-01.md
    └── deprecated_api_2025-10-15.md
```

### current_sprint.md Format (Like Melody LMS)

```markdown
# Current Sprint - Performance & Playlists
**Created:** 2025-11-18
**Status:** In Progress
**Last Updated:** 2025-11-20

---

## 🎯 Sprint Goals

1. Add performance monitoring to identify bottlenecks
2. Implement playlist system for sequential training

---

## ✅ COMPLETED

- P1-P16: [Previous priorities]

---

## 🚧 IN PROGRESS

### P17: Performance Monitoring (~6 hours)

**Business Context:**
Need visibility into slow queries and API response times to optimize performance.

**Tasks:**

#### Task 1: Database Query Logger (2.5h)
**Objective:** Log all queries slower than 1000ms

**Requirements:**
- Wrap database pool to intercept queries
- Log query text (truncated), duration, row count
- Maintain rolling buffer of last 100 slow queries
- Configurable threshold via SLOW_QUERY_THRESHOLD_MS

**Acceptance Criteria:**
- [ ] Queries >1s are logged with [SlowQuery] prefix
- [ ] Buffer never exceeds 100 entries
- [ ] Can be disabled via ENABLE_QUERY_LOGGING=false

**Files:**
- `src/middleware/queryLogger.ts` (create)

---

#### Task 2: HTTP Request Monitor (2h)
[Detailed task breakdown...]

---

### P18: Playlist System Foundations (~10 hours)

**Business Context:**
Administrators need to create sequential training paths.

[Detailed task breakdown like P17...]

---

## 📦 BACKLOG (Not Started)

- P19: Advanced Analytics Dashboard
- P20: Video Transcoding Pipeline
- P21: Multi-language Support
```

### questions.md Format

```markdown
# Open Questions

## Q007 - From Backend Dev (2025-11-20 2:15 PM)
**Question:** Should playlist items maintain order using:
A) Auto-incrementing position integers (1, 2, 3...)
B) Fractional indexing (1.0, 2.0, 1.5 for inserts)
C) Linked list with next_id references

**Context:** P18 Task 1, playlist_items table design
**Impact:** Affects reordering complexity
**Status:** 🟡 Waiting for Strategic AI

---

## Q006 - From Backend Dev (2025-11-19 4:30 PM)
**Question:** WebSockets vs Server-Sent Events for notifications?
**Status:** ✅ Resolved
**Resolution:** Use SSE. Simpler to scale, unidirectional is fine for notifications.
**Decided by:** Strategic AI + User on 2025-11-19
**Updated:** architecture.md, decisions.md
```

---

## 💬 Communication Patterns

### Questions System (Async Collaboration)

**Any AI can add a question:**
```
Backend Dev: "I've added Q008 to questions.md - need clarification on auth flow"
```

**You choose who answers:**
```
You: "Strategic AI, answer Q008"
Strategic AI: [Researches, explains, updates questions.md + relevant docs]
```

**Or answer it yourself:**
```
You: "The auth flow should use JWT tokens, I'll update questions.md"
```

### Direct Requests (Synchronous Work)

**Just ask the AI you need:**
```
You: "Tech Lead, create sprint plan for user management"
You: "Strategic AI, should we use microservices?"
You: "Backend Dev, implement the login endpoint"
```

**Switch contexts freely:**
```
You: "Backend Dev, pause. Strategic AI, I need your thoughts on this approach"
Strategic AI: [Provides feedback]
You: "Backend Dev, continue with Strategic AI's recommendations"
```

---

## 🎨 UI/UX Requirements

### Main Interface: Role Selector + Document View

**Top Bar: Role Selector**
```
┌─────────────────────────────────────────────────┐
│ Refrain IDE                    [Settings] [⚙️]   │
├─────────────────────────────────────────────────┤
│ Working with: [Strategic AI ▼]                  │
│               ├── Strategic AI (Architect)      │
│               ├── Tech Lead (Requirements)      │
│               └── Backend Dev (Implementation)  │
└─────────────────────────────────────────────────┘
```

**Left Sidebar: Documents**
```
📚 Documents
├── 📋 backlog.md              [View] [Edit]
├── 🎯 vision.md               [View] [Edit]
├── 🏗️  architecture.md         [View] [Edit]
├── 📝 current_sprint.md       [View] [Edit] ⭐
├── ✅ decisions.md             [View] [Edit]
├── 🚧 constraints.md          [View] [Edit]
├── 🔗 api_contracts.md        [View] [Edit]
├── ❓ questions.md             [View] [Edit] 🔴 2 open
└── 📦 _archive/               [Expand]

💬 Quick Actions
├── 🏗️  "Strategic AI, review architecture"
├── 📋 "Tech Lead, plan next sprint"
├── ⚡ "Backend Dev, run tests"
└── ❓ "Answer open questions"
```

**Center Panel: AI Chat + Document Editor**

*When chatting with an AI:*
```
┌─────────────────────────────────────────────────┐
│ 💬 Strategic AI (Architect)                     │
├─────────────────────────────────────────────────┤
│                                                 │
│ You:                                            │
│ Should we use Redis or Postgres for caching?   │
│                                                 │
│ Strategic AI:                                   │
│ Great question! Let me explain the tradeoffs... │
│                                                 │
│ [Full teaching explanation with reasoning]      │
│                                                 │
│ Does this make sense? I'll update decisions.md │
│ if you approve.                                 │
│                                                 │
├─────────────────────────────────────────────────┤
│ [Type your message...]                  [Send] │
│                                                 │
│ Quick Actions:                                  │
│ [I agree, update docs] [Show me alternatives]  │
│ [Research this more] [Let me think]            │
└─────────────────────────────────────────────────┘
```

*When editing a document:*
```
┌─────────────────────────────────────────────────┐
│ 📝 current_sprint.md                    [Edit] │
├─────────────────────────────────────────────────┤
│                                                 │
│ # Current Sprint - Performance Monitoring      │
│                                                 │
│ ## P17: Performance Monitoring                 │
│                                                 │
│ [Markdown editor with full content]            │
│                                                 │
│ [Save] [Cancel] [Ask Tech Lead to review]     │
└─────────────────────────────────────────────────┘
```

**Right Sidebar: Project Status**
```
🚀 Deployments
├── Production: https://app.fly.dev
│   Last: 2 days ago
│   [Deploy Now]
└── Staging: https://staging.fly.dev
    Last: 5 min ago ✓
    [Open] [Logs]

💻 Local Dev
├── Backend:  ● Running (8000)
├── Frontend: ● Running (3000)
└── [Start] [Stop] [Logs]

📊 Current Sprint
├── P17: ✓ Complete
├── P18: 🔄 In Progress (60%)
└── [View Details]

❓ Open Questions: 2
├── Q007 - Backend Dev
├── Q008 - Tech Lead
└── [Review All]

🤖 AI Status
├── Strategic AI: Ready
├── Tech Lead: Ready
└── Backend Dev: Working...
```

---

## ⚙️ Multi-API Configuration

**Same as v2.0 - each role can use different providers:**

```typescript
export interface RoleConfiguration {
  strategicAI: AIProviderConfig;   // Claude Sonnet for reasoning
  techLead: AIProviderConfig;       // GPT-4 for planning
  backendDev: AIProviderConfig;     // DeepSeek for implementation
}
```

---

## 🔄 Typical Workflows

### Workflow 1: Feature Planning → Implementation

```
1. User: "Tech Lead, add notification system to backlog"
   Tech Lead: [Updates backlog.md with feature details]

2. User: "Tech Lead, create sprint plan for notifications"
   Tech Lead: [Creates detailed task breakdown in current_sprint.md]

3. User: "Strategic AI, review the notification plan"
   Strategic AI: [Reviews, suggests WebSocket alternatives]
   Strategic AI: [Updates decisions.md with recommendation]

4. User: "Tech Lead, update plan with Strategic AI feedback"
   Tech Lead: [Revises current_sprint.md]

5. User: "Backend Dev, implement Task 1: Database Schema"
   Backend Dev: [Implements, tests, commits]

6. User: "Backend Dev, implement Task 2: API Endpoints"
   Backend Dev: [Implements, deploys to staging]
```

### Workflow 2: Architecture Decision Mid-Implementation

```
1. Backend Dev: "Question about caching strategy (Q009 in questions.md)"

2. User: "Strategic AI, answer Q009"
   Strategic AI: [Researches Redis vs in-memory caching]
   Strategic AI: [Explains tradeoffs, recommends approach]
   Strategic AI: [Updates questions.md, decisions.md]

3. User: "Backend Dev, continue with Redis approach"
   Backend Dev: [Implements caching layer]
```

### Workflow 3: Requirements Refinement

```
1. User: "Tech Lead, the user roles requirements need work"
   Tech Lead: "What needs to change?"

2. User: "We need a 'trainer' role between manager and employee"
   Tech Lead: [Updates architecture.md with role matrix]
   Tech Lead: "Should this be in current sprint or backlog?"

3. User: "Current sprint. Update the plan"
   Tech Lead: [Adds tasks to current_sprint.md]

4. User: "Backend Dev, implement the new role"
   Backend Dev: [Creates migration, updates auth logic, tests]
```

### Workflow 4: Documentation Cleanup

```
1. User: "Tech Lead, clean up old documentation"
   Tech Lead: [Reviews _project_docs/]
   Tech Lead: "Found 5 outdated files. Should I archive them?"

2. User: "Yes, archive anything from before Nov 1"
   Tech Lead: [Moves files to _archive/ with timestamps]
   Tech Lead: [Updates references in current docs]
   Tech Lead: "Done. Archived 5 files, updated 3 references"
```

---

## 📝 Key Principles

### Documentation as Source of Truth
- All AIs read the same documents
- `current_sprint.md` = what to build
- `architecture.md` = how it's structured
- `decisions.md` = why we chose this way

### Fluid Role Switching
- No rigid "steps" or "phases"
- Choose the AI you need for the task at hand
- Switch freely based on current needs
- All roles available anytime

### Async Collaboration via questions.md
- AIs don't talk directly to each other
- Questions documented in questions.md
- You decide who answers what
- Creates audit trail of decisions

### Teaching Through Doing
- Strategic AI explains WHY, not just WHAT
- Builds your architectural intuition
- Learn patterns and principles
- Understand tradeoffs

---

## 🎯 Success Criteria

**User can:**
1. Choose any AI role at any time based on current needs
2. Work with Tech Lead to refine requirements without involving Strategic AI
3. Jump to Backend Dev to implement specific tasks from current_sprint.md
4. Consult Strategic AI for architecture questions mid-implementation
5. Freely switch between roles without rigid workflow constraints
6. Learn architectural principles through Strategic AI explanations
7. Maintain project continuity through shared documentation
8. Track all decisions and their reasoning
9. See open questions from all AIs in one place
10. Work the way they actually work (not forced into steps)

**Technical:**
- Response time < 2s for AI calls (with streaming)
- Documents sync to git automatically
- Support 3+ API providers seamlessly
- Local servers start in < 10s

**Learning:**
- User understands WHY decisions were made
- User can evaluate AI recommendations critically
- User builds vocabulary of design patterns
- User can explain tradeoffs to others

---

## 🚀 Implementation Priority

### Phase 1: Core Role System (Week 1-2)
1. Multi-AI role manager (Strategic, Tech Lead, Backend)
2. Document-driven context loading
3. questions.md system
4. Basic chat interface for each role
5. Git integration

### Phase 2: UI & Tools (Week 3-4)
6. Role selector interface
7. Document editor + viewer
8. Quick action buttons
9. Local dev server management
10. Deployment integration

### Phase 3: Polish & Testing (Week 5-6)
11. AI provider configuration UI
12. Real-time collaboration features
13. Status indicators and progress tracking
14. Error handling and recovery
15. User testing and refinement

---

*This document defines Refrain v3.0 - A flexible, role-based Human-AI IDE that matches how developers actually work.*

*Last Updated: November 20, 2025*
*Status: Ready for Implementation*
