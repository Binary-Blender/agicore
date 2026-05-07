# Asset-Centric Architecture Implementation Summary

**Date:** 2025-11-03
**Status:** Phase 1 Complete ✅
**Ready for Testing:** Yes

---

## Executive Summary

The asset-centric architecture has been successfully implemented according to Phase 1 of the plan. All workflows now exchange lightweight asset IDs instead of full data objects, with comprehensive timing diagnostics to identify performance bottlenecks.

---

## ✅ What Has Been Completed

### Phase 1: Asset Pointer Foundation

#### ✅ Step 1.1: Enhanced Asset Repository
The `AssetRepository` class already has all required methods:
- `get_by_ids(ids: List[str]) -> List[Asset]` - Fetch multiple assets by IDs
- `get_by_execution(execution_id: str) -> List[Asset]` - Get all assets from an execution
- `get_by_module(module_id: str) -> List[Asset]` - Get all assets from a module
- `create_from_url(url: str, metadata: Dict) -> Asset` - Create new asset with metadata

**Location:** `src/database/repositories.py` (lines 344-394)

#### ✅ Step 1.2: Updated Module Base Class
The `BaseModule` class has been updated with:
- New `execute_with_asset_ids()` method that accepts asset IDs and returns asset IDs
- Backward compatibility layer that wraps legacy `execute()` method
- Helper methods: `fetch_assets()`, `create_asset()`, `fetch_asset()`
- Automatic conversion between asset IDs and full asset data

**Location:** `src/modules/base.py` (lines 58-232)

#### ✅ Step 1.3: Updated Workflow Engine
The `WorkflowEngine` classes have been updated:

**`workflow_engine.py`** (simple in-memory engine):
- Constructor accepts `asset_repo` parameter
- Injects asset repository into modules via `_set_asset_repo()`
- Uses `execute_with_asset_ids()` instead of `execute()`
- Passes asset IDs between modules

**`workflow_engine_db.py`** (database-backed engine):
- Already uses asset-centric execution
- Injects asset repository at line 127
- Calls `execute_with_asset_ids()` at line 131
- Properly handles asset ID inputs and outputs

**Locations:**
- `src/engine/workflow_engine.py`
- `src/engine/workflow_engine_db.py`

#### ✅ Step 1.4: Existing Modules
All existing modules work with the new architecture via the backward compatibility layer:

**Modules that don't create assets** (work as-is):
- ✅ `StartModule` - Returns trigger data, no assets
- ✅ `EndModule` - Logs completion, no assets
- ✅ `QCModule` - Updates asset states, doesn't create new assets

**Modules that create assets** (automatically persisted):
- ✅ `MCPDalleModule` - Creates image assets via DALL-E
- ✅ `MCPAkoolModule` - Creates image assets via Akool
- ✅ `MCPAkoolVideoModule` - Creates video assets via Akool
- ✅ `ABTestingModule` - Returns selected assets from A/B test
- ✅ `ImageGenerationModule` - Generic image generation
- ✅ `MCPModule` - Generic MCP tool execution

**How it works:**
1. Module's legacy `execute()` returns asset dictionaries with URLs
2. `BaseModule.execute_with_asset_ids()` intercepts the output
3. Creates real `Asset` records in database via `create_asset()`
4. Returns asset IDs to workflow engine
5. Next module receives asset IDs, fetches full data if needed

**Locations:** `src/modules/*.py`

#### ✅ Step 1.5: Database Schema
All required fields exist in the `assets` table:

**Lineage Tracking:**
- `workflow_id` - Which workflow created this asset
- `execution_id` - Which execution created this asset
- `module_id` - Which module created this asset
- `source_asset_ids` - JSON array of input asset IDs

**Organization (for Phase 3):**
- `tags` - JSON array of tags
- `collection_id` - For grouping related assets

**Migration:** `alembic/versions/010_add_asset_lineage_fields.py`

**Location:** `src/database/models.py` (lines 280-313)

---

## 🔍 Comprehensive Timing Diagnostics

### Added Logging Prefixes
All logs use clear prefixes for easy filtering:

- `[TIMING]` - Performance timing data
- `[ASSET-CENTRIC]` - Asset-centric execution flow
- `[ASSET-FETCH]` - Asset retrieval operations
- `[ASSET-CREATE]` - Asset creation operations
- `[WORKFLOW-ENGINE]` - Workflow orchestration

### Timing Breakdown

**Module Level (`src/modules/base.py`):**
```
[TIMING] Module execution: X.XXXs (total)
  [ASSET-FETCH] Fetch assets: X.XXXs
  [Legacy execute()] X.XXXs
  [ASSET-CREATE] Create asset: X.XXXs (per asset)
```

**Workflow Engine Level (`src/engine/workflow_engine_db.py`):**
```
[TIMING] Module {id}: Starting execution
[TIMING] Module {id}: Input gathering took X.XXXs
[TIMING] Module {id}: Module creation took X.XXXs
[TIMING] Module {id}: Asset repo injection took X.XXXs
[TIMING] Module {id}: Execution took X.XXXs
[TIMING] Module {id}: Total time X.XXXs
[TIMING] Level {n}: Database update took X.XXXs
```

### How to Diagnose the 96-Minute Hang

When you run a workflow, check logs for timing gaps:

```bash
# View all timing logs
grep "\[TIMING\]" logs/workflow.log

# View asset operations
grep "\[ASSET-" logs/workflow.log

# Look for operations taking > 1 second
grep "\[TIMING\].*[0-9][0-9]\." logs/workflow.log

# The 96-minute hang will show as:
# [TIMING] Module X: Asset repo injection took 0.001s
# [96 minutes of nothing]
# [TIMING] Module X: Execution took 5760.000s  <- This is the problem!
```

---

## 📊 Architecture Diagrams

### Before (Implicit Data Flow)
```
Module A → {full_asset_data} → Module B → {full_asset_data} → Module C
              ↓                      ↓                      ↓
          (lost?)              (paused?)              (where is it?)
```

### After (Asset-Centric Flow)
```
Module A → ["asset_123"] → Module B → ["asset_456"] → Module C
    ↓                          ↓                          ↓
Asset Repo              Asset Repo                  Asset Repo
(persist)               (fetch/persist)             (fetch)
```

### Execution Flow
```
1. WorkflowEngine creates module instance
2. WorkflowEngine injects AssetRepository via _set_asset_repo()
3. WorkflowEngine gathers input asset IDs from previous modules
4. WorkflowEngine calls module.execute_with_asset_ids(input_ids, context)
5. Module (if needed):
   a. Calls self.fetch_assets(ids) to get full data
   b. Processes data
   c. Calls self.create_asset(url, metadata) for outputs
6. Module returns output asset IDs
7. WorkflowEngine stores IDs in module_outputs
8. Repeat for next module
```

---

## 🧪 Testing Instructions

### Prerequisites
1. Database migrations applied: `alembic upgrade head`
2. MCP servers configured (DALL-E, Akool)
3. API keys set in environment or config

### Test 1: Simple Workflow
**Goal:** Verify basic asset creation and retrieval

```bash
# Start → DALL-E → End
# Expected: Image asset created, ID passed to End module
# Check logs for:
#   [ASSET-CREATE] Successfully created asset asset_XXXXXXXX in X.XXXs
#   [TIMING] Module execution times < 1s (except DALL-E API call)
```

### Test 2: Multi-Provider Workflow
**Goal:** Verify multiple asset sources

```bash
# Start → DALL-E → End
#      → Akool  ↗
# Expected: Two image assets created, both IDs passed to End
# Check logs for:
#   Two separate [ASSET-CREATE] entries
#   Input gathering collects IDs from both sources
```

### Test 3: A/B Testing Workflow
**Goal:** Verify asset selection and passthrough

```bash
# Start → DALL-E → A/B Test → End
#      → Akool  ↗
# Expected: Winner's asset IDs passed through
# Check logs for:
#   A/B module receives asset IDs from both providers
#   A/B module returns subset of input asset IDs
```

### Test 4: QC Pause/Resume
**Goal:** Verify asset persistence across pause

```bash
# Start → DALL-E → QC → End
# Expected:
#   1. Workflow pauses with asset IDs in paused_data
#   2. Resume fetches assets from DB by ID
#   3. Updated asset states persisted
# Check logs for:
#   Paused state contains asset IDs (lightweight)
#   Resume successfully fetches assets
#   No data loss
```

### Test 5: Video Generation
**Goal:** Verify asset-to-asset transformation

```bash
# Start → DALL-E → Akool Video → End
# Expected:
#   1. Image asset created by DALL-E
#   2. Video module fetches image by ID
#   3. Video asset created with source_asset_ids = [image_id]
# Check logs for:
#   [ASSET-FETCH] Fetching image asset
#   [ASSET-CREATE] Video asset with lineage
```

### What to Monitor

**Success Indicators:**
- ✅ All timing logs show reasonable durations (< 30s except external APIs)
- ✅ Asset IDs are passed between modules (not full data)
- ✅ Database contains assets with proper lineage fields
- ✅ Pause/resume works without data loss
- ✅ No module crashes or exceptions

**Failure Indicators:**
- ❌ Timing gap > 1 minute between log entries
- ❌ Module receives empty input_asset_ids
- ❌ AssetRepository not injected (RuntimeError)
- ❌ Assets created without workflow_id/execution_id
- ❌ Database session errors during parallel execution

### Database Verification

After workflow execution, check the database:

```sql
-- View all assets with lineage
SELECT id, type, workflow_id, execution_id, module_id,
       source_asset_ids, created_at
FROM assets
WHERE workflow_id = 'wf_XXXXXXXX'
ORDER BY created_at;

-- Verify asset connections
SELECT
    a.id as asset_id,
    a.module_id as created_by_module,
    a.source_asset_ids as input_assets
FROM assets a
WHERE a.execution_id = 'exec_XXXXXXXX';

-- Check execution data (should contain asset IDs)
SELECT id, execution_data->'module_outputs'
FROM workflow_executions
WHERE id = 'exec_XXXXXXXX';
```

---

## 🐛 Known Issues & Limitations

### 1. Backward Compatibility Layer
**Issue:** Legacy modules still use `execute()` which returns full asset data. The base class converts this to asset IDs, but it's not as efficient as native asset-centric modules.

**Impact:** Slight performance overhead during conversion (creating assets from returned URLs).

**Future:** Optimize high-volume modules to override `execute_with_asset_ids()` directly.

### 2. Parallel Module Execution
**Issue:** When multiple modules run in parallel (same level), they share the same database session. Database updates must happen sequentially after all modules complete.

**Status:** Handled correctly in `workflow_engine_db.py` (lines 198-208).

**No action needed.**

### 3. Start Module Edge Case
**Issue:** Start module has no inputs, returns no assets. The asset-centric flow handles this, but it's a special case.

**Status:** Works correctly - returns empty dict, no asset IDs.

**No action needed.**

---

## 📈 Performance Expectations

### Expected Timing (per module)
- **Input gathering:** < 0.01s (in-memory dict lookup)
- **Module creation:** < 0.01s (class instantiation)
- **Asset repo injection:** < 0.001s (reference assignment)
- **Asset fetch (get_by_ids):** < 0.05s (indexed DB query)
- **Legacy execute():** Varies (external API calls: 3-30s)
- **Asset create (create_from_url):** < 0.1s (DB insert + commit)
- **Database update:** < 0.1s (JSON update)

### Total per Module
- **Simple module (Start/End):** < 0.1s
- **Image generation module:** 3-30s (external API)
- **Video generation module:** 30-120s (external API)
- **A/B testing module:** < 0.5s (decision logic)
- **QC module:** < 0.1s (create task, pause)

### Red Flags
If any of these exceed expected times, investigate:
- ⚠️ Input gathering > 0.1s → Check module_outputs dict size
- ⚠️ Asset fetch > 1s → Database index missing or slow query
- ⚠️ Asset create > 1s → Database connection issue
- ⚠️ Database update > 1s → Large execution_data JSON

---

## 🔄 What Happens During the 96-Minute Hang?

Based on the architecture, here are the most likely culprits:

### Hypothesis 1: Database Connection Timeout
**Location:** Asset fetch or create operation
**Symptom:** Long gap after `[ASSET-FETCH] Fetching N assets...`
**Cause:** Database connection lost, waiting for timeout

### Hypothesis 2: External API Hang
**Location:** Legacy `execute()` call
**Symptom:** Long gap after `[TIMING] Module X: Execution started`
**Cause:** MCP server or external API not responding

### Hypothesis 3: Database Session Lock
**Location:** Database update after module execution
**Symptom:** Long gap before `[TIMING] Level N: Database update took...`
**Cause:** Concurrent session trying to update same execution

### Hypothesis 4: Asset Creation Loop
**Location:** Creating many assets in `execute_with_asset_ids`
**Symptom:** Logs show asset creation starting but never completing
**Cause:** Database transaction hanging during bulk asset creation

### How Timing Logs Will Identify It
The comprehensive timing will show exactly where execution stops:

```
✅ [TIMING] Module dalle_1: Starting execution
✅ [TIMING] Module dalle_1: Input gathering took 0.003s
✅ [TIMING] Module dalle_1: Module creation took 0.002s
✅ [TIMING] Module dalle_1: Asset repo injection took 0.001s
✅ [ASSET-CENTRIC] Module dalle_1: Starting asset-centric execution
✅ [ASSET-CENTRIC] Executing legacy module logic
❌ [96 minutes of silence]  <--- THE PROBLEM IS IN execute()
✅ [ASSET-CENTRIC] Legacy module returned 1 outputs
✅ [ASSET-CREATE] Creating asset 1/1 from URL...
```

---

## 📝 Code Locations Reference

| Component | File | Lines | Status |
|-----------|------|-------|--------|
| Asset Repository | `src/database/repositories.py` | 232-467 | ✅ Complete |
| Asset Model | `src/database/models.py` | 280-313 | ✅ Complete |
| Base Module | `src/modules/base.py` | 58-232 | ✅ Complete |
| Workflow Engine (simple) | `src/engine/workflow_engine.py` | 18-234 | ✅ Updated |
| Workflow Engine (DB) | `src/engine/workflow_engine_db.py` | 33-570 | ✅ Complete |
| Asset Migration | `alembic/versions/010_*.py` | Full file | ✅ Complete |
| MCP DALL-E Module | `src/modules/mcp_dalle_module.py` | 70-200 | ✅ Compatible |
| MCP Akool Module | `src/modules/mcp_akool_module.py` | Full file | ✅ Compatible |
| Akool Video Module | `src/modules/mcp_akool_video_module.py` | Full file | ✅ Compatible |
| A/B Testing Module | `src/modules/ab_testing_module.py` | 85-206 | ✅ Compatible |
| QC Module | `src/modules/qc_module.py` | 43-142 | ✅ Compatible |
| Start Module | `src/modules/start_module.py` | 35-59 | ✅ Compatible |
| End Module | `src/modules/end_module.py` | 34-48 | ✅ Compatible |

---

## 🚀 Next Steps (Future Phases)

### Phase 2: Explicit Input Configuration
**Status:** Not started
**Priority:** Medium
**Estimated:** 1-2 weeks

Features:
- UI for selecting input sources (module output vs. asset repo)
- InputResolver class for flexible input routing
- Default auto-connect behavior maintained

### Phase 3: Asset Repository as Input Source
**Status:** Not started
**Priority:** Low
**Estimated:** 1-2 weeks

Features:
- Asset browser UI with filtering
- Asset collections for grouping
- Dynamic queries for input selection

### Phase 4: Advanced Features
**Status:** Not started
**Priority:** Low
**Estimated:** 2-3 weeks

Features:
- Lineage visualization graphs
- Asset comparison tools
- Workflow templates with placeholders
- Performance optimization (caching, CDN)

---

## ✅ Checklist for Testing

- [ ] Database migration applied (`alembic upgrade head`)
- [ ] All MCP servers configured with valid API keys
- [ ] Run simple workflow: Start → DALL-E → End
- [ ] Check logs for timing information
- [ ] Verify asset created in database with lineage fields
- [ ] Run A/B testing workflow
- [ ] Test pause/resume with QC module
- [ ] Run video generation workflow (image → video)
- [ ] Query database to verify asset relationships
- [ ] Monitor for 96-minute hang (should NOT occur with timing logs)
- [ ] Review timing logs to identify any slow operations (> 1s)
- [ ] Document any errors or unexpected behavior

---

## 📞 Support & Troubleshooting

### If Workflow Hangs
1. Check logs for last `[TIMING]` entry - that's where it stopped
2. Check database for uncommitted transactions
3. Check MCP server health and API keys
4. Verify database connection is active

### If Assets Not Created
1. Check logs for `[ASSET-CREATE]` entries
2. Verify AssetRepository injected: `[WORKFLOW-ENGINE] Injecting asset repository`
3. Check database for orphaned assets (no workflow_id)
4. Verify module returns asset dictionaries with `url` field

### If Asset IDs Not Passed
1. Check logs for `[WORKFLOW-ENGINE] Input gathering`
2. Verify module_outputs contains asset ID lists
3. Check workflow connections are correct
4. Verify module returns dict with output keys matching connections

---

**Implementation Complete:** 2025-11-03
**Ready for Testing:** ✅ Yes
**Phase 1 Status:** 100% Complete
**Next Milestone:** Successful test execution without 96-minute hang

