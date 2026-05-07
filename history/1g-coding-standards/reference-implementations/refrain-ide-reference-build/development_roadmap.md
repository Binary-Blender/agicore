# Refrain IDE 2.0 - Development Roadmap

## Document Purpose
This roadmap provides a detailed, sprint-based implementation plan for Refrain IDE 2.0. Each sprint includes specific deliverables, acceptance criteria, and dependencies.

---

## Overview

### Project Timeline
- **Phase 1 (MVP):** 6-8 weeks
- **Phase 2 (Enhanced):** 4-6 weeks
- **Phase 3 (Advanced):** 4-6 weeks
- **Total Estimated Time:** 14-20 weeks

### Sprint Duration
- Each sprint: 3-5 days of focused development
- Buffer time built in for testing and iteration

---

## Phase 1: Minimum Viable Product (MVP)

**Goal:** Core workflow functional with essential UI and single project support

### Sprint 1: Project Foundation (3-4 days)

**Objective:** Set up project structure, development environment, and core configurations

**Backend Tasks:**
- [ ] Initialize FastAPI project structure
- [ ] Set up Python virtual environment
- [ ] Configure pytest for testing
- [ ] Create base Pydantic models
- [ ] Implement configuration management (`.refrain/` directory)
- [ ] Set up logging infrastructure
- [ ] Create health check endpoint

**Frontend Tasks:**
- [ ] Initialize Next.js 14 with TypeScript
- [ ] Configure Tailwind CSS
- [ ] Set up shadcn/ui component library
- [ ] Create base layout (sidebar, main panel, status panel)
- [ ] Configure ESLint and Prettier
- [ ] Set up environment variables

**Shared Tasks:**
- [ ] Initialize git repository
- [ ] Create `.gitignore` for both frontend and backend
- [ ] Set up project README with setup instructions
- [ ] Configure VS Code workspace settings

**Acceptance Criteria:**
- Backend starts with `uvicorn app.main:app --reload`
- Frontend starts with `npm run dev`
- Both services accessible locally
- Basic health check returns 200 OK
- Empty dashboard renders without errors

**Dependencies:** None (foundation sprint)

---

### Sprint 2: AI Provider Abstraction Layer (4-5 days)

**Objective:** Implement unified interface for multiple AI providers

**Backend Tasks:**
- [ ] Create base AIProvider interface (`core/ai_providers/base.py`)
- [ ] Implement CustomAPIProvider for user's coding API
- [ ] Implement AnthropicProvider for Claude
- [ ] Implement OpenAIProvider for GPT models
- [ ] Create provider factory for instantiation
- [ ] Implement connection testing endpoint
- [ ] Add retry logic with exponential backoff
- [ ] Create streaming support (async generators)
- [ ] Write unit tests for all providers
- [ ] Create mock provider for testing

**Frontend Tasks:**
- [ ] Build AI Configuration panel UI
- [ ] Create provider selection dropdown
- [ ] Implement API key secure input fields
- [ ] Add "Test Connection" button with loading state
- [ ] Display connection test results (success/failure)
- [ ] Persist configurations to backend
- [ ] Create temperature slider component
- [ ] Add max tokens input field

**API Endpoints:**
```
POST /api/ai/test-connection
GET  /api/ai/configurations
PUT  /api/ai/configurations
POST /api/ai/chat/{role}
GET  /api/ai/stream/{role} (SSE)
```

**Acceptance Criteria:**
- Can configure 3 different providers for 3 roles
- Connection test validates API keys
- Streaming responses work for all providers
- Configurations persist across restarts
- Mock provider works for testing without API costs

**Dependencies:** Sprint 1

---

### Sprint 3: Document Management System (3-4 days)

**Objective:** CRUD operations for project documentation

**Backend Tasks:**
- [ ] Create DocumentService class
- [ ] Implement file listing with metadata
- [ ] Implement file reading with content
- [ ] Implement file writing with validation
- [ ] Implement file archiving with timestamps
- [ ] Create markdown parser for questions.md
- [ ] Parse question format (Q001, Q002, etc.)
- [ ] Implement question adding logic
- [ ] Implement question resolution logic
- [ ] Add file watcher for external changes
- [ ] Write unit tests for all operations

**Frontend Tasks:**
- [ ] Build DocumentTree component (left sidebar)
- [ ] Display folder structure with icons
- [ ] Add expand/collapse for folders
- [ ] Show badges (open questions count, current sprint star)
- [ ] Build DocumentEditor component
- [ ] Integrate Monaco Editor for markdown
- [ ] Add syntax highlighting for code blocks
- [ ] Implement auto-save functionality
- [ ] Build DocumentViewer component (read-only)
- [ ] Implement search across documents (basic)

**API Endpoints:**
```
GET    /api/documents
GET    /api/documents/{path}
PUT    /api/documents/{path}
DELETE /api/documents/{path}
POST   /api/documents/archive/{path}
GET    /api/questions
POST   /api/questions
PUT    /api/questions/{id}/resolve
```

**Acceptance Criteria:**
- Can browse all documents in `_project_docs/`
- Can edit and save documents
- Archive moves files with timestamp prefix
- Questions.md parsing extracts Q### format correctly
- New questions auto-increment ID
- File watcher detects external changes

**Dependencies:** Sprint 1

---

### Sprint 4: Workflow State Machine (4-5 days)

**Objective:** Implement 5-step workflow with state persistence

**Backend Tasks:**
- [ ] Create WorkflowEngine class
- [ ] Define workflow states enum
- [ ] Implement state transition validation
- [ ] Create state persistence (JSON file)
- [ ] Implement checkpoint/recovery logic
- [ ] Create system prompts for each step
- [ ] Load documents as context for AI
- [ ] Implement step execution logic
- [ ] Parse "****READY FOR..." markers
- [ ] Track step history/transitions
- [ ] Implement pause/resume functionality
- [ ] Write integration tests for all transitions

**Frontend Tasks:**
- [ ] Build StepNavigator component
- [ ] Visual progress bar (5 steps)
- [ ] Current step highlighting
- [ ] Next/Previous button controls
- [ ] Pause/Resume button
- [ ] "Consult Strategic AI" button
- [ ] Build WorkflowControls panel
- [ ] Display current step status
- [ ] Show elapsed time
- [ ] Display step output (streaming)
- [ ] Implement SSE client for real-time updates

**API Endpoints:**
```
POST /api/workflow/start
GET  /api/workflow/status
POST /api/workflow/step/{step}
POST /api/workflow/pause
POST /api/workflow/resume
GET  /api/workflow/stream (SSE)
POST /api/workflow/reset
```

**Acceptance Criteria:**
- Can start workflow on project
- Step transitions follow valid paths
- State persists across application restart
- Pause/resume works correctly
- "READY FOR..." marker detected and parsed
- History tracks all transitions with timestamps

**Dependencies:** Sprint 2, Sprint 3

---

### Sprint 5: Git Integration Service (3-4 days)

**Objective:** Automated version control with semantic commits

**Backend Tasks:**
- [ ] Create GitService using GitPython
- [ ] Implement `git status` wrapper
- [ ] Implement `git add` with file selection
- [ ] Implement `git commit` with formatted messages
- [ ] Implement `git push` to remote
- [ ] Create commit message formatter (type, scope, step)
- [ ] Implement `git log` for history
- [ ] Implement `git diff` for changes
- [ ] Handle merge conflicts gracefully
- [ ] Write unit tests for git operations

**Frontend Tasks:**
- [ ] Display git status in status panel
- [ ] Show uncommitted changes count
- [ ] Show current branch name
- [ ] Display recent commits list
- [ ] Add manual commit button (optional)
- [ ] Show push status indicator

**API Endpoints:**
```
GET  /api/git/status
POST /api/git/add
POST /api/git/commit
POST /api/git/push
GET  /api/git/log
GET  /api/git/diff
```

**Acceptance Criteria:**
- Auto-commit after step completion (Step tags included)
- Commit messages follow convention: `type(scope): message [Step XXX]`
- Push to remote works reliably
- Status shows clean/dirty state
- Log displays readable history

**Dependencies:** Sprint 1

---

### Sprint 6: Strategic AI Chat Interface (4-5 days)

**Objective:** Teaching-focused conversation with Strategic AI

**Backend Tasks:**
- [ ] Create Strategic AI service
- [ ] Build teaching-focused system prompt
- [ ] Load all documents as context
- [ ] Parse open questions from questions.md
- [ ] Implement conversation history management
- [ ] Stream responses in real-time
- [ ] Emit session metadata (session_id, status) with every SSE event so the frontend can bind streamed tokens to the correct conversation
- [ ] Parse and execute quick actions
- [ ] Update documents based on decisions
- [ ] Create audit trail for decisions

**Frontend Tasks:**
- [ ] Build AIChat modal/panel component
- [ ] Message history display
- [ ] User input field with send button
- [ ] Streaming response display
- [ ] Quick action buttons:
  - "I agree, proceed"
  - "Research this more"
  - "Show alternatives"
- [ ] Code syntax highlighting in responses
- [ ] Teaching mode indicators (explanations highlighted)
- [ ] Copy response to clipboard
- [ ] Close/minimize chat

**API Endpoints:**
```
POST /api/ai/strategic/chat
GET  /api/ai/strategic/stream (SSE)
POST /api/ai/strategic/resolve-question
GET  /api/ai/strategic/conversation-history
```

**Acceptance Criteria:**
- Chat opens with current project context
- Strategic AI explains decisions with teaching approach
- Quick actions execute without full typing
- Documents update based on resolutions
- Conversation history persists during session
- Can return to workflow after consultation

**Dependencies:** Sprint 2, Sprint 3, Sprint 4

---

### Sprint 7: Local Development Server Manager (3-4 days)

**Objective:** Start/stop/monitor local backend and frontend servers

**Backend Tasks:**
- [ ] Create ProcessManager service
- [ ] Implement port availability checking
- [ ] Start backend server (uvicorn)
- [ ] Start frontend server (npm run dev)
- [ ] Stop servers gracefully (SIGTERM)
- [ ] Stream server logs (stdout/stderr)
- [ ] Monitor resource usage (psutil)
- [ ] Handle server crashes/restarts
- [ ] Write integration tests

**Frontend Tasks:**
- [ ] Build LocalServers panel component
- [ ] Display server status (running/stopped)
- [ ] Show port numbers and URLs
- [ ] Start/Stop/Restart buttons
- [ ] Real-time log viewer
- [ ] Resource usage display (CPU, Memory)
- [ ] "Open in Browser" button
- [ ] Error state handling

**API Endpoints:**
```
POST /api/servers/start
POST /api/servers/stop
POST /api/servers/restart
GET  /api/servers/status
GET  /api/servers/logs/{server} (SSE)
GET  /api/servers/metrics
```

**Acceptance Criteria:**
- Servers start within 10 seconds
- Logs stream in real-time
- Resource metrics update every 5 seconds
- Stop gracefully terminates processes
- Port conflicts handled with clear messages
- URLs correctly displayed and clickable

**Dependencies:** Sprint 1

---

### Sprint 8: Fly.io Deployment Integration (4-5 days)

**Objective:** Deploy to staging and production environments

**Backend Tasks:**
- [ ] Create DeploymentService
- [ ] Wrapper for flyctl commands
- [ ] Implement staging deployment
- [ ] Implement production deployment
- [ ] Stream deployment logs
- [ ] Parse deployment status
- [ ] Health check after deployment
- [ ] Implement rollback functionality
- [ ] Manage Fly.io secrets
- [ ] Write integration tests (mock flyctl)

**Frontend Tasks:**
- [ ] Build DeploymentStatus panel
- [ ] Display environment URLs
- [ ] Show last deployment time
- [ ] Deploy to Staging button
- [ ] Deploy to Production button (with confirmation)
- [ ] Real-time deployment log viewer
- [ ] Deployment progress indicator
- [ ] Rollback button
- [ ] Error handling and retry

**API Endpoints:**
```
POST /api/deploy/staging
POST /api/deploy/production
GET  /api/deploy/status/{environment}
GET  /api/deploy/logs/{environment} (SSE)
POST /api/deploy/rollback/{environment}
POST /api/deploy/secrets/{environment}
```

**Acceptance Criteria:**
- Staging deploys automatically after Step 001
- Production deploys only with user confirmation
- Deployment completes within 3 minutes
- Logs stream in real-time
- Health check verifies successful deployment
- Rollback works for failed deployments
- URLs are correct and accessible

**Dependencies:** Sprint 1, Sprint 5

---

### Sprint 9: Integration and Polish (4-5 days)

**Objective:** Connect all components, fix bugs, improve UX

**Backend Tasks:**
- [ ] Wire all services together
- [ ] Implement complete workflow cycle
- [ ] Step 000 -> Strategic AI consultation
- [ ] Step 001 -> Frontend AI + auto-deploy
- [ ] Step 002 -> Document cleanup
- [ ] Step 003 -> Sprint planning
- [ ] Step 004 -> Backend AI
- [ ] Add comprehensive error handling
- [ ] Optimize performance bottlenecks
- [ ] Security review and fixes
- [ ] Load testing under realistic conditions

**Frontend Tasks:**
- [ ] Complete main dashboard layout
- [ ] Polish all UI components
- [ ] Add loading states everywhere
- [ ] Implement toast notifications
- [ ] Add keyboard shortcuts
- [ ] Responsive design check (optional for MVP)
- [ ] Accessibility improvements
- [ ] User onboarding flow
- [ ] Error boundary implementation

**Testing:**
- [ ] End-to-end test: complete workflow cycle
- [ ] Error recovery testing
- [ ] Performance benchmarking
- [ ] Security penetration testing (basic)
- [ ] Cross-browser testing (Chrome, Firefox)

**Acceptance Criteria:**
- Complete 5-step cycle works end-to-end
- No critical bugs
- Response times meet targets
- Error messages are user-friendly
- All success criteria from requirements met

**Dependencies:** All previous sprints

---

### Sprint 10: Documentation and Launch (3-4 days)

**Objective:** Document everything and prepare for use

**Documentation Tasks:**
- [ ] Complete setup instructions (README)
- [ ] API documentation (auto-generated from FastAPI)
- [ ] User guide with screenshots
- [ ] Architecture documentation
- [ ] Troubleshooting guide
- [ ] FAQ document
- [ ] Video walkthrough (optional)

**Deployment Tasks:**
- [ ] Deploy Refrain IDE itself to Fly.io
- [ ] Set up production environment
- [ ] Configure monitoring
- [ ] Set up error tracking
- [ ] Backup strategy

**Cleanup Tasks:**
- [ ] Remove debug code
- [ ] Clean up console logs
- [ ] Optimize bundle size
- [ ] Review and update dependencies
- [ ] Security headers configured

**Acceptance Criteria:**
- New user can set up in < 30 minutes
- Documentation covers all features
- No TODO comments for MVP features
- Production deployment stable
- Monitoring alerts configured

**Dependencies:** Sprint 9

---

## Phase 2: Enhanced Features (Post-MVP)

### Sprint 11: Multi-Project Support (5-6 days)

**Features:**
- [ ] Project switcher in UI
- [ ] Separate workflow states per project
- [ ] Project templates
- [ ] Recent projects list
- [ ] Import/export project settings

**Acceptance Criteria:**
- Can manage 5+ projects simultaneously
- Switching projects is instant
- Settings persist per project

---

### Sprint 12: Git Branch Management (4-5 days)

**Features:**
- [ ] Create feature branches
- [ ] Switch between branches
- [ ] Merge branch workflow
- [ ] Branch comparison view
- [ ] Pull request integration (GitHub)

**Acceptance Criteria:**
- Can create branch from UI
- Merge conflicts handled gracefully
- PR creation automated

---

### Sprint 13: AI Conversation History (4-5 days)

**Features:**
- [ ] Persist chat history
- [ ] Search conversation history
- [ ] Export conversations
- [ ] Resume previous conversations
- [ ] Conversation analytics

**Acceptance Criteria:**
- History persists across sessions
- Search returns relevant results
- Can continue old conversations

---

### Sprint 14: Requirements Management Enhancements (4-5 days)

**Objective:** Transform the requirements page into a living, interactive document system

**Features:**
- [ ] **Inline Editing** - Click to edit any section directly
  - Edit mode toggle per section
  - Auto-save on blur
  - Markdown preview while editing
  - Validate structure on save

- [ ] **Version History** - Track all changes to requirements
  - Timestamp each save
  - Show diff between versions
  - Rollback to previous version
  - View who changed what (when multi-user)

- [ ] **Comments & Annotations** - Collaborative feedback
  - Add comments to specific sections
  - Thread discussions
  - @mention team members
  - Resolve/archive comments

- [ ] **Export Functionality** - Generate shareable artifacts
  - Export to PDF with styling
  - Export to Markdown
  - Export to HTML
  - Generate summary report

- [ ] **Search & Filter** - Find requirements quickly
  - Full-text search across all sections
  - Filter by section type
  - Tag-based filtering
  - Search history

- [ ] **Collaboration Features** - Real-time multi-user editing
  - Show who's viewing
  - Lock sections being edited
  - Activity feed
  - Change notifications

**Backend Tasks:**
- [ ] Create RequirementsService for CRUD operations
- [ ] Implement version history storage (append-only log)
- [ ] Add commenting API endpoints
- [ ] Create PDF generation service (WeasyPrint or similar)
- [ ] Implement real-time sync (WebSockets or polling)
- [ ] Add search indexing (simple in-memory for MVP)

**Frontend Tasks:**
- [ ] Build inline editor component (contenteditable or Monaco)
- [ ] Create version history viewer with diff display
- [ ] Implement commenting UI (thread view)
- [ ] Build export options modal
- [ ] Add search bar with filters
- [ ] Show live editing indicators

**API Endpoints:**
```
PUT    /api/v1/projects/{id}/requirements/document
GET    /api/v1/projects/{id}/requirements/versions
GET    /api/v1/projects/{id}/requirements/version/{version_id}
POST   /api/v1/projects/{id}/requirements/rollback/{version_id}
GET    /api/v1/projects/{id}/requirements/comments
POST   /api/v1/projects/{id}/requirements/comments
PUT    /api/v1/projects/{id}/requirements/comments/{comment_id}
DELETE /api/v1/projects/{id}/requirements/comments/{comment_id}
POST   /api/v1/projects/{id}/requirements/export
GET    /api/v1/projects/{id}/requirements/search?q={query}
```

**Acceptance Criteria:**
- Can edit requirements directly in UI
- All changes tracked with history
- Can rollback to any previous version
- Comments thread properly
- PDF export includes all sections with proper styling
- Search returns results in < 200ms
- Real-time updates work across tabs/users

**Dependencies:** Sprint 3 (Requirements Page exists)

**Technical Notes:**
- Use optimistic UI updates for editing
- Debounce auto-save (2 seconds)
- Store versions as diffs to save space
- Use WeasyPrint or Puppeteer for PDF
- Consider Meilisearch for better search in future

---

### Sprint 15: Cost and Performance Tracking (3-4 days)

**Features:**
- [ ] Track token usage per AI role
- [ ] Estimate costs per provider
- [ ] Performance metrics dashboard
- [ ] Usage trends over time
- [ ] Budget alerts

**Acceptance Criteria:**
- Accurate token counting
- Cost estimates within 5% of actual
- Dashboard updates in real-time

---

### Sprint 16: Team Collaboration (6-8 days)

**Features:**
- [ ] Multi-user authentication
- [ ] Shared project access
- [ ] Real-time collaboration (optional)
- [ ] Activity feed
- [ ] Role-based permissions

**Acceptance Criteria:**
- Multiple users can access same project
- Changes sync reliably
- Permissions enforced correctly

---

## Phase 3: Advanced Features

### Sprint 17: Visual Architecture Diagrams (4-5 days)

**Features:**
- Auto-generate diagrams from code
- Interactive architecture view
- Dependency visualization
- Real-time updates

**Tools:**
- Mermaid.js for diagram generation
- D3.js for interactive graphs
- AST parsing for code analysis

---

### Sprint 18: Automated Testing Dashboard (4-5 days)

**Features:**
- Test runner integration
- Coverage reports
- Test history trends
- Flaky test detection
- Test execution from UI

**Integration:**
- pytest for Python
- Jest for JavaScript
- Coverage.py / Istanbul
- Store test results in database

---

### Sprint 19: Issue Tracker Integration (3-4 days)

**Features:**
- GitHub Issues sync
- Jira integration
- Auto-link commits to issues
- Sprint planning from issues
- Two-way sync

**Benefits:**
- Track work from single interface
- Automatic issue closing on deploy
- Sprint velocity metrics

---

### Sprint 20: Template Projects (3-4 days)

**Features:**
- Create project templates
- Clone from templates
- Share templates (public/private)
- Version templates
- Template marketplace

**Template Types:**
- Full-stack web app
- REST API
- CLI tool
- Library/Package
- Microservice

---

### Sprint 21: Community Features (5-6 days)

**Features:**
- Share sprint plans
- Decision library
- Pattern marketplace
- Community forums

---

## Risk Mitigation

### High-Risk Areas

1. **AI Provider Reliability**
   - Risk: API downtime or rate limits
   - Mitigation: Fallback providers, caching, retry logic

2. **Fly.io Deployment**
   - Risk: Deployment failures
   - Mitigation: Comprehensive error handling, rollback, local testing first

3. **Workflow State Corruption**
   - Risk: Lost progress due to crashes
   - Mitigation: Checkpoints, auto-recovery, transaction logs

4. **Performance Under Load**
   - Risk: Slow responses with large projects
   - Mitigation: Pagination, caching, incremental loading

### Contingency Plans

- If Custom API unreliable → Fallback to Anthropic/OpenAI
- If Fly.io issues → Support alternative providers (Vercel, Railway)
- If Monaco Editor too heavy → Switch to CodeMirror 6
- If Git operations slow → Consider libgit2 bindings

---

## Success Milestones

### Phase 1 Completion (Week 8)
- [ ] Complete 5-step workflow functional
- [ ] 3 AI providers configurable
- [ ] Local development working
- [ ] Staging deployment automated
- [ ] Strategic AI teaching mode active
- [ ] All MVP requirements met

### Phase 2 Completion (Week 14)
- [ ] Multi-project support
- [ ] Git branching workflow
- [ ] Cost tracking operational
- [ ] Team collaboration basics
- [ ] Performance optimized

### Phase 3 Completion (Week 20)
- [ ] Advanced visualizations
- [ ] Full testing integration
- [ ] External tool integrations
- [ ] Community features launched
- [ ] Production-grade stability

---

## Resource Requirements

### Development Team
- 1 Full-Stack Developer (primary)
- AI Assistant (pair programming)

### Infrastructure
- Development machine with 16GB+ RAM
- Fly.io account (free tier for MVP)
- API keys for AI providers (development)
- GitHub repository (free)

### Time Investment
- Phase 1: 150-200 hours
- Phase 2: 80-120 hours
- Phase 3: 80-120 hours

### Cost Estimates
- AI API costs: $50-100/month during development
- Fly.io hosting: $0-20/month (staging/production)
- Domain (optional): $15/year
- Total for MVP: ~$150-300

---

## Sprint Planning Template

For each sprint, create `current_sprint.md` with this format:

```markdown
# Sprint [Number]: [Name]
**Duration:** [Start Date] - [End Date]
**Objective:** [One sentence goal]

## Backend Tasks
- [ ] Task 1
  - Acceptance: [Specific criteria]
- [ ] Task 2
  - Acceptance: [Specific criteria]

## Frontend Tasks
- [ ] Task 1
  - Acceptance: [Specific criteria]
- [ ] Task 2
  - Acceptance: [Specific criteria]

## Testing Requirements
- [ ] Unit tests for [component]
- [ ] Integration test for [flow]

## Definition of Done
- [ ] All tasks completed
- [ ] Tests passing
- [ ] Code reviewed
- [ ] Documentation updated
- [ ] Deployed to staging
- [ ] User testing complete

## Notes
- [Any special considerations]
- [Dependencies or blockers]
```

---

## Next Steps

1. **Immediate Actions:**
   - Set up project repository
   - Initialize frontend and backend projects
   - Configure development environment
   - Create initial document templates

2. **Sprint 1 Preparation:**
   - Review technical_plan.md
   - Set up IDE with recommended extensions
   - Create kanban board (GitHub Projects or similar)
   - Schedule first Sprint Review

3. **Long-term Planning:**
   - Identify potential beta testers
   - Plan user feedback collection
   - Consider analytics strategy
   - Think about monetization (if applicable)

---

## Document Maintenance

**Last Updated:** November 16, 2025
**Version:** 1.0.0
**Status:** Initial Roadmap
**Next Review:** After Sprint 1 completion

**Change Log:**
- 2025-11-16: Initial roadmap creation

---

*This roadmap should be reviewed and updated after each sprint. Use retrospectives to adjust timelines and priorities based on actual progress and learnings.*
