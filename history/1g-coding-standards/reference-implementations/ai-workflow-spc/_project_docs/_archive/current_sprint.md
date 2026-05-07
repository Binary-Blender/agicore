# Current Sprint: Sprint 4.0 - MCP Integration Foundation

**Sprint Duration:** 2 weeks
**Version Target:** v4.0
**Current Version:** v3.6
**Priority:** High
**Started:** 2025-10-29

---

## Executive Summary

Sprint 4.0 transforms the AI Workflow Platform into an MCP (Model Context Protocol) orchestrator, enabling integration with thousands of existing MCP servers while maintaining backward compatibility with current workflows. This sprint focuses on **foundation building** - creating the MCP client framework, provider abstraction, and A/B testing for quality comparison.

### Strategic Context

**What we have now (v3.6):**
- Drag-and-drop workflow builder
- Akool image generation (hardcoded)
- Pass/Fail QC with human review
- Asset repository with archiving
- PostgreSQL persistence
- Deployed to Fly.io

**What we're building (v4.0):**
- MCP client framework for universal tool integration
- Generic provider abstraction (not just Akool)
- A/B testing module for comparing AI service outputs
- Quality metrics tracking (foundation for SPC)
- Support for Replicate, Akool, and ANY MCP server

**Future vision (post-v4.0):**
- TPS-style UI refactoring (Job Instructions format)
- Full SPC statistical analysis
- Andon board for quality monitoring
- Text, audio, video generation modules

---

## Two Parallel Tracks (Choose Implementation Order)

### Track 1: MCP Integration (RECOMMENDED FIRST)
**Why first:** Foundation for extensibility, enables 1000s of integrations

**What it includes:**
- MCP client implementation (stdio, SSE, WebSocket)
- MCP server registry and discovery
- Generic provider framework (not just image generation)
- Akool MCP wrapper
- Replicate MCP integration
- A/B testing module
- Quality metrics tracking

**Impact:** Platform becomes universal AI orchestrator

### Track 2: TPS UI Refactoring (DO AFTER MCP)
**Why second:** UI transformation, no backend changes needed

**What it includes:**
- Replace drag-drop canvas with Job Instruction table
- Add TPS metrics (Takt time, cycle time, OEE)
- Andon board status indicators
- Sequential step numbering
- Standard work documentation format

**Impact:** Platform looks like manufacturing standard work

**Recommendation:** Implement Track 1 (MCP) first, then Track 2 (TPS UI) in Sprint 5.0

---

## Sprint 4.0 Goals (MCP Track)

### Primary Objectives

1. **MCP Client Framework** ✅
   - Core MCP client with stdio/SSE/WebSocket support
   - JSON-RPC communication
   - Tool discovery and dynamic schema loading

2. **Provider Abstraction** ✅
   - BaseProvider interface for all API services
   - ProviderRegistry for managing providers
   - Clean separation from workflow logic

3. **Multiple Image Providers** ✅
   - Refactor Akool as a provider
   - Add Replicate provider
   - Support provider switching in workflows

4. **A/B Testing Module** ✅
   - Compare outputs from multiple providers
   - Side-by-side visual comparison
   - Selection/ranking/scoring interfaces
   - Metrics tracking for SPC

5. **Quality Metrics Foundation** ✅
   - Track provider performance
   - Selection rates, generation time
   - Database schema for metrics
   - API endpoints for SPC data

### Success Criteria

- ✅ Platform can connect to Akool and Replicate
- ✅ Users can select provider in workflow builder
- ✅ A/B testing shows side-by-side comparison
- ✅ Metrics tracked per provider
- ✅ Existing workflows continue working
- ✅ Foundation for adding ANY provider later

---

## Technical Architecture (v4.0)

### 1. Provider Framework

```
BaseProvider (Abstract)
├── AkoolProvider
├── ReplicateProvider
└── [Future: ClaudeProvider, ElevenLabsProvider, etc.]

ProviderRegistry
├── register(provider_id, provider_class)
├── get_provider(provider_id, api_key)
└── list_providers(type filter)
```

**Key Files:**
- `src/providers/base.py` - Abstract provider interface
- `src/providers/registry.py` - Provider registry
- `src/providers/image/akool_provider.py` - Akool implementation
- `src/providers/image/replicate_provider.py` - Replicate implementation

### 2. MCP Integration (Optional, if needed)

```
MCPClient
├── StdioTransport (for local servers)
├── SSETransport (for HTTP servers)
└── WebSocketTransport (for realtime)

MCPServerRegistry
├── Built-in servers (Akool, Replicate)
├── User-added servers
└── Community servers
```

**Key Files:**
- `src/mcp/client.py` - MCP client implementation
- `src/mcp/registry.py` - MCP server registry
- `mcp_servers/akool/` - Akool MCP wrapper (if using MCP)

### 3. A/B Testing Module

```
ABTestingModule
├── collect_test_items() - Gather outputs from providers
├── prepare_qc_task() - Pause workflow for comparison
└── process_results() - Resume with selection data
```

**Key Files:**
- `src/modules/ab_testing_module.py` - A/B testing module
- `frontend/qc.html` - Enhanced with A/B testing UI

### 4. Database Schema Updates

**New Tables:**
```sql
-- Provider performance metrics
CREATE TABLE provider_metrics (
    id VARCHAR PRIMARY KEY,
    provider_id VARCHAR NOT NULL,
    metric_type VARCHAR(50),  -- 'latency', 'selection_rate', 'quality'
    value FLOAT,
    execution_id VARCHAR REFERENCES workflow_executions(id),
    recorded_at TIMESTAMP
);

-- A/B test results
CREATE TABLE ab_test_results (
    id VARCHAR PRIMARY KEY,
    execution_id VARCHAR REFERENCES workflow_executions(id),
    test_type VARCHAR(50),  -- 'select_best', 'rank_all', 'score_each'
    test_items JSON,
    results JSON,
    metrics JSON,
    created_at TIMESTAMP
);
```

**Updated Tables:**
```sql
-- Add provider tracking to assets
ALTER TABLE assets ADD COLUMN provider VARCHAR(100);
ALTER TABLE assets ADD COLUMN provider_metadata JSON;
ALTER TABLE assets ADD COLUMN quality_metrics JSON;
```

---

## Implementation Plan (10 Days)

### Phase 1: Provider Foundation (Days 1-3)

#### Day 1: Provider Framework
- [ ] Create `src/providers/base.py` with BaseProvider abstract class
- [ ] Create `src/providers/registry.py` with ProviderRegistry
- [ ] Create database migration 004 for provider support
- [ ] Add provider columns to assets table
- [ ] Test basic provider registration

**Files to create:**
- `src/providers/__init__.py`
- `src/providers/base.py`
- `src/providers/registry.py`
- `alembic/versions/004_add_provider_support.py`

#### Day 2: Akool Provider Refactoring
- [ ] Create `src/providers/image/akool_provider.py`
- [ ] Refactor existing Akool code into provider pattern
- [ ] Update `ImageGenerationModule` to use provider registry
- [ ] Test existing workflows still work with Akool provider
- [ ] Verify assets created with provider metadata

**Files to create/modify:**
- `src/providers/image/__init__.py`
- `src/providers/image/akool_provider.py`
- `src/modules/image_gen_module.py` (update)

#### Day 3: Replicate Provider
- [ ] Create `src/providers/image/replicate_provider.py`
- [ ] Implement Replicate API integration (SDXL model)
- [ ] Test Replicate image generation independently
- [ ] Add Replicate to provider registry
- [ ] Test switching between Akool and Replicate

**Files to create:**
- `src/providers/image/replicate_provider.py`

**Testing:**
- Generate image with Akool provider ✅
- Generate image with Replicate provider ✅
- Switch providers in same workflow ✅

---

### Phase 2: A/B Testing (Days 4-6)

#### Day 4: A/B Testing Module
- [ ] Create `src/modules/ab_testing_module.py`
- [ ] Implement test item collection from multiple providers
- [ ] Add pause/resume logic for A/B testing
- [ ] Create `ab_test_results` table
- [ ] Test module pauses workflow correctly

**Files to create:**
- `src/modules/ab_testing_module.py`
- Update workflow engine for A/B testing pause

#### Day 5: A/B Testing UI
- [ ] Create A/B testing Vue component in `qc.html`
- [ ] Implement side-by-side comparison view
- [ ] Add selection controls (best, rank, score, pass/fail)
- [ ] Test blind mode (hide provider names)
- [ ] Add notes field for QC feedback

**Files to modify:**
- `frontend/qc.html` - Add A/B testing UI component

**UI Features:**
- Side-by-side image comparison
- Provider labels (hideable for blind testing)
- Selection modes: select best, rank all, pass/fail, score 1-10
- Submit button with validation

#### Day 6: Connect A/B Testing to Workflow
- [ ] Create API endpoint `/ab-test/{task_id}/submit`
- [ ] Implement workflow resume after A/B test
- [ ] Track provider selection metrics
- [ ] Test end-to-end: generate → compare → resume
- [ ] Verify metrics saved to database

**Files to modify:**
- `src/main_workflow_db.py` - Add A/B testing endpoints

---

### Phase 3: Metrics & Integration (Days 7-9)

#### Day 7: Provider Metrics Tracking
- [ ] Create `provider_metrics` table
- [ ] Track generation time per provider
- [ ] Track selection rate from A/B tests
- [ ] Calculate quality scores
- [ ] Add metric collection to provider execution

**Files to create:**
- `src/database/models.py` - Add ProviderMetric model
- `src/database/repositories.py` - Add ProviderMetricsRepository

#### Day 8: API Endpoints & Builder Updates
- [ ] Create `/providers` endpoint (list available providers)
- [ ] Create `/providers/{id}/schema` endpoint (get config schema)
- [ ] Create `/metrics/spc/{provider_id}` endpoint (get metrics)
- [ ] Update workflow builder to show provider selection
- [ ] Dynamic config forms based on provider schema

**Files to modify:**
- `src/main_workflow_db.py` - Add provider endpoints
- `frontend/builder.html` - Add provider selection UI

**Builder UI Updates:**
- Dropdown to select provider (Akool, Replicate, etc.)
- Dynamic form fields based on selected provider
- Show provider info (cost, speed, capabilities)
- Visual indicator of which provider is configured

#### Day 9: Testing & Documentation
- [ ] End-to-end test: workflow with 2 providers + A/B testing
- [ ] Test metrics collection and SPC endpoint
- [ ] Update PROJECT_SPECIFICATION.md
- [ ] Update lessons_learned.md
- [ ] Create provider developer guide

---

### Phase 4: Polish & Deploy (Day 10)

#### Day 10: Final Integration & Deployment
- [ ] Run all migrations on Fly.io database
- [ ] Test with production AKOOL and Replicate API keys
- [ ] Performance optimization (connection pooling, caching)
- [ ] Update frontend version to v4.0
- [ ] Deploy to Fly.io
- [ ] Smoke test all features

**Deployment Checklist:**
- [ ] Run `alembic upgrade head` on production
- [ ] Set `REPLICATE_API_KEY` secret on Fly.io
- [ ] Deploy v4.0 to Fly.io
- [ ] Verify workflows page loads
- [ ] Test workflow creation with provider selection
- [ ] Test A/B testing flow
- [ ] Verify metrics tracked in database

---

## Configuration & Secrets

### Environment Variables

```bash
# Replicate API Key (for testing, users will BYOK)
REPLICATE_API_KEY=YOUR_REPLICATE_API_KEY_HERE

# Feature flags
ENABLE_AB_TESTING=true
ENABLE_SPC_METRICS=true
ENABLE_MCP_INTEGRATION=false  # Phase 2 feature
```

### Fly.io Secrets

```bash
flyctl secrets set REPLICATE_API_KEY="YOUR_REPLICATE_API_KEY_HERE" -a ai-workflow-spc
```

---

## Testing Scenarios

### Scenario 1: Single Provider Workflow
1. Create workflow with Start → Replicate Image Gen → QC → End
2. Configure Replicate with prompt
3. Run workflow with 4 iterations
4. Verify 4 images generated via Replicate
5. Check assets have `provider="replicate_sdxl"` metadata

### Scenario 2: A/B Testing Workflow
1. Create workflow with:
   - Start
   - Akool Image Gen (same prompt)
   - Replicate Image Gen (same prompt)
   - A/B Testing Module
   - End
2. Run workflow
3. Verify workflow pauses at A/B testing
4. View QC page showing side-by-side comparison
5. Select best provider
6. Verify workflow resumes and completes
7. Check metrics tracked in `provider_metrics` table

### Scenario 3: Provider Switching
1. Edit existing Akool workflow
2. Change provider to Replicate
3. Run workflow
4. Verify images generated with Replicate
5. Confirm no breaking changes

### Scenario 4: Backward Compatibility
1. Run old v3.6 workflow that uses hardcoded Akool
2. Verify it still works
3. Confirm assets created properly

---

## Key Technical Decisions

### Decision 1: Provider vs MCP
**Choice:** Start with Provider framework, add MCP later as optional

**Rationale:**
- Provider framework is simpler and more direct
- MCP adds complexity (subprocess management, protocol overhead)
- Can wrap providers as MCP servers later if needed
- Keeps v4.0 scope manageable

**Implication:** MCP integration moves to v4.1 or v5.0

### Decision 2: A/B Testing Module Type
**Choice:** Separate module type, not part of QC module

**Rationale:**
- A/B testing is conceptually different from pass/fail QC
- Allows different workflows to use different testing modes
- Keeps QC module focused on single-item review
- Better for future features (text comparison, audio comparison)

### Decision 3: Provider Configuration Storage
**Choice:** Store provider config in module config, not separate table

**Rationale:**
- BYOK approach - each workflow has own keys
- No need for global provider credentials table
- Simpler to implement
- Workflows remain portable

### Decision 4: Metrics Granularity
**Choice:** Track metrics per execution, aggregate in queries

**Rationale:**
- Raw data preserved for detailed analysis
- SPC calculations done on-demand
- Easier to add new metric types later
- Better for debugging quality issues

---

## Dependencies

### Python Packages (Add to requirements.txt)

```txt
# Existing dependencies
fastapi==0.104.1
uvicorn[standard]==0.24.0
sqlalchemy==2.0.23
asyncpg==0.29.0
alembic==1.12.1
pydantic==2.5.0
aiohttp==3.9.1
python-multipart==0.0.6

# New for Sprint 4.0
# (No new dependencies needed - using existing packages)
```

### API Keys Required

- **Akool API Key** - BYOK, users provide their own
- **Replicate API Key** - Test key: `YOUR_REPLICATE_API_KEY_HERE`

---

## Migration Strategy

### Database Migrations

**Migration 004: Add Provider Support**
- Add `provider`, `provider_metadata`, `quality_metrics` to `assets`
- Create `provider_metrics` table
- Create `ab_test_results` table
- Add indexes for performance

**Backward Compatibility:**
- Existing assets: `provider` will be NULL (or set to "akool" via migration)
- Existing workflows: Will use Akool provider by default
- No breaking changes to API contracts

---

## Risk Mitigation

### Risk 1: Breaking Existing Workflows
**Mitigation:**
- Keep Akool as default provider
- Test all existing workflow types
- Deploy to staging first
- Gradual rollout to users

### Risk 2: Provider API Failures
**Mitigation:**
- Proper error handling in providers
- Fallback to error state
- Don't crash workflow engine
- Log errors for debugging

### Risk 3: A/B Testing Complexity
**Mitigation:**
- Start with simple "select best" mode
- Add advanced modes incrementally
- Comprehensive testing with edge cases
- Clear user documentation

### Risk 4: Performance Degradation
**Mitigation:**
- Profile database queries
- Add indexes on metrics tables
- Cache provider schemas
- Monitor Fly.io metrics

---

## Post-Sprint 4.0: What's Next

### Sprint 5.0: TPS UI Refactoring (Optional)
- Replace drag-drop canvas with Job Instruction table
- Add Andon board for status monitoring
- TPS metrics (Takt time, cycle time, OEE)
- No backend changes needed

### Sprint 5.0 Alternative: MCP Full Integration
- Implement MCP client (stdio, SSE, WebSocket)
- Create Akool MCP wrapper server
- Use official Replicate MCP server
- Enable adding community MCP servers
- MCP server marketplace/registry

### Sprint 6.0: SPC Analytics (After metrics collected)
- Control charts for provider performance
- Statistical analysis of quality
- Automated alerts for out-of-control processes
- SPC dashboard page

### Future Features
- Text generation providers (Claude, GPT-4, Gemini)
- Audio generation providers (ElevenLabs, etc.)
- Video generation providers (Runway, etc.)
- Multi-modal workflows
- Workflow templates marketplace

---

## Important Files Reference

### Current Codebase (v3.6)
```
/src/
  database/
    models.py              - SQLAlchemy models
    repositories.py        - Data access layer
    connection.py          - Database connection
  engine/
    workflow_engine_db.py  - Workflow execution engine
  modules/
    base.py                - BaseModule interface
    start_module.py        - Start module
    image_gen_module.py    - Image generation (currently Akool-only)
    qc_module.py           - Pass/fail QC
    end_module.py          - End module
  main_workflow_db.py      - FastAPI application

/frontend/
  workflows.html           - Main workflows page
  qc.html                  - QC queue page
  assets.html              - Asset repository page
  builder.html             - Workflow builder page

/alembic/versions/
  001_initial_schema.py
  002_add_archived_flag.py
  003_add_archived_flag_to_assets.py
```

### New Files to Create (v4.0)
```
/src/
  providers/
    __init__.py
    base.py                 - BaseProvider abstract class
    registry.py             - ProviderRegistry
    image/
      __init__.py
      akool_provider.py     - Akool provider
      replicate_provider.py - Replicate provider
  modules/
    ab_testing_module.py    - A/B testing module

/mcp_servers/              - (Phase 2, if implementing MCP)
  akool/
    __init__.py
    package.json
    README.md

/alembic/versions/
  004_add_provider_support.py
```

---

## Success Metrics

### Technical Success
- [ ] Both Akool and Replicate working as providers
- [ ] A/B testing module comparing outputs
- [ ] Provider metrics tracked in database
- [ ] No breaking changes to existing workflows
- [ ] Clean provider abstraction for future additions

### Business Success
- [ ] Users can compare quality between providers
- [ ] Cost/quality tradeoffs visible
- [ ] Foundation for statistical quality control
- [ ] Path clear for adding more provider types

### User Experience Success
- [ ] Provider selection is intuitive
- [ ] A/B testing is easy to understand
- [ ] Workflow builder shows provider options clearly
- [ ] QC interface supports comparison

---

## Developer Notes

### For Future Claude Sessions

**Quick Context:**
- v3.6 is current production (drag-drop builder, Akool only, QC, archiving)
- v4.0 adds provider framework for multiple AI services
- Akool and Replicate are first providers
- A/B testing compares provider outputs
- Metrics tracked for SPC analysis
- TPS UI refactoring is separate (future sprint)

**Key Architectural Principles:**
1. Provider abstraction separates API logic from workflow logic
2. BYOK (Bring Your Own Key) - no global credential storage
3. Generic design - works for any content type (images, text, audio)
4. Backward compatible - existing workflows must work
5. Database-first - track everything for analytics

**Testing Checklist:**
1. Test Akool provider independently
2. Test Replicate provider independently
3. Test A/B testing with both providers
4. Test existing workflows still work
5. Test metrics being saved
6. Test provider switching mid-workflow

**Don't Break These:**
- Existing workflow execution engine
- Pause/resume logic for QC
- Asset repository and archiving
- Workflow CRUD operations

**Key Files to Remember:**
- `src/providers/base.py` - Provider interface
- `src/providers/registry.py` - Provider management
- `src/modules/ab_testing_module.py` - A/B testing
- `alembic/versions/004_*.py` - Database migration

---

## Version History

- **v3.6** (Oct 29, 2025) - Archive features, QC improvements
- **v4.0** (Target: Nov 12, 2025) - Provider framework, A/B testing, metrics
- **v5.0** (Future) - TPS UI refactoring OR MCP full integration
- **v6.0** (Future) - SPC analytics dashboard

---

**Sprint Status:** Ready to Begin
**Next Step:** Day 1 - Create provider framework
**Estimated Completion:** 10 working days from start
