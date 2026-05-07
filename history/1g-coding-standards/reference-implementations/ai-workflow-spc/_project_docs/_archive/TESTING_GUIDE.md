# Asset-Centric Architecture Testing Guide

**Quick Start Guide for Testing the New Architecture**

---

## Pre-Flight Checklist

```bash
# 1. Ensure database is up to date
alembic upgrade head

# 2. Verify MCP servers are configured
cat mcp_config.json | grep -E "(dalle|akool)"

# 3. Check API keys are set
echo $OPENAI_API_KEY
echo $AKOOL_API_KEY

# 4. Start the application
python src/main_workflow_db.py
```

---

## Test 1: Simple Image Generation (5 minutes)

**Goal:** Verify basic asset creation and timing logs

### Steps:
1. Create workflow: Start → DALL-E → End
2. Configure DALL-E with prompt: "A happy robot"
3. Execute workflow
4. Monitor logs in real-time

### Expected Results:
```
✅ [TIMING] Module start_1: Total time < 0.1s
✅ [TIMING] Module dalle_1: Total time 3-30s
✅ [ASSET-CREATE] Successfully created asset asset_XXXXXXXX
✅ [TIMING] Module end_1: Total time < 0.1s
✅ No gaps > 1 minute in timing logs
✅ Workflow completes in < 1 minute (plus API call time)
```

### Verify in Database:
```sql
SELECT id, type, workflow_id, execution_id, module_id, url
FROM assets
ORDER BY created_at DESC
LIMIT 1;

-- Should show: 1 image asset with all lineage fields populated
```

### What to Watch For:
- ❌ RuntimeError: "Asset repository not set" → injection failed
- ❌ Timing gap > 1 minute → hang occurred
- ❌ Asset created with NULL workflow_id → lineage tracking broken

---

## Test 2: A/B Testing (10 minutes)

**Goal:** Verify multi-provider asset handling

### Steps:
1. Create workflow: Start → [DALL-E, Akool] → A/B Test → End
2. Same prompt for both providers: "Professional headshot"
3. A/B Test configured for automatic selection (quality-based)
4. Execute workflow
5. Monitor parallel execution

### Expected Results:
```
✅ [TIMING] Module dalle_1 and akool_1 execute in parallel
✅ [ASSET-CREATE] Two assets created (one per provider)
✅ [WORKFLOW-ENGINE] A/B test receives 2 asset IDs
✅ A/B module returns winner's asset ID
✅ End module receives 1 asset ID (winner)
```

### Verify in Database:
```sql
SELECT id, provider, source_asset_ids
FROM assets
WHERE workflow_id = 'wf_XXXXXXXX'
ORDER BY created_at;

-- Should show: 2 image assets, both with empty source_asset_ids
-- (They are source assets, not derived)
```

### What to Watch For:
- ❌ A/B test fails with "requires at least 2 providers" → inputs not collected
- ❌ Database update takes > 1s → JSON too large
- ❌ Session conflict errors → parallel execution issue

---

## Test 3: QC Pause/Resume (15 minutes)

**Goal:** Verify asset persistence across workflow pause

### Steps:
1. Create workflow: Start → DALL-E → QC → End
2. Execute workflow
3. Wait for QC task to appear
4. Review images in QC interface
5. Approve/reject images
6. Submit QC results
7. Verify workflow resumes

### Expected Results:
```
✅ Workflow pauses after DALL-E with state "paused_for_qc"
✅ Paused data contains asset IDs (not full asset data)
✅ QC task shows images fetched from database
✅ After QC submission, workflow resumes
✅ End module receives only approved asset IDs
✅ Asset states updated in database
```

### Verify in Database:
```sql
-- Check paused state
SELECT paused_data->'module_outputs'
FROM workflow_executions
WHERE state = 'paused_for_qc';

-- Should show: Asset IDs, not full asset objects

-- Check asset states after resume
SELECT id, state
FROM assets
WHERE execution_id = 'exec_XXXXXXXX';

-- Should show: approved/rejected states based on QC decisions
```

### What to Watch For:
- ❌ Paused data contains full asset URLs → not using asset IDs
- ❌ Resume fails to fetch assets → get_by_ids() broken
- ❌ Asset states not updated → QC integration broken

---

## Test 4: Video Generation (20 minutes)

**Goal:** Verify asset-to-asset transformations with lineage

### Steps:
1. Create workflow: Start → DALL-E → Akool Video → End
2. DALL-E generates portrait image
3. Akool Video converts to talking avatar
4. Execute workflow
5. Monitor asset lineage

### Expected Results:
```
✅ [ASSET-CREATE] Image asset created by DALL-E
✅ [ASSET-FETCH] Akool Video fetches image by ID
✅ [ASSET-CREATE] Video asset created with source_asset_ids
✅ Video asset's source_asset_ids contains image asset ID
✅ Full lineage visible in database
```

### Verify in Database:
```sql
SELECT
    a.id,
    a.type,
    a.module_id,
    a.source_asset_ids
FROM assets a
WHERE a.execution_id = 'exec_XXXXXXXX'
ORDER BY a.created_at;

-- Should show:
-- 1. Image (source_asset_ids: [])
-- 2. Video (source_asset_ids: ["image_id"])
```

### Advanced Check - Full Lineage Query:
```sql
WITH RECURSIVE lineage AS (
    -- Start with the video asset
    SELECT id, type, source_asset_ids, 0 as depth
    FROM assets
    WHERE type = 'video' AND execution_id = 'exec_XXXXXXXX'

    UNION ALL

    -- Recursively find source assets
    SELECT a.id, a.type, a.source_asset_ids, l.depth + 1
    FROM assets a
    JOIN lineage l ON a.id = ANY(l.source_asset_ids::text[])
)
SELECT * FROM lineage;

-- Should show complete chain: Video → Image → (none)
```

### What to Watch For:
- ❌ source_asset_ids is empty → lineage not being set
- ❌ Video module doesn't fetch image → input handling broken
- ❌ Asset fetch fails → get_by_ids() error

---

## Test 5: Stress Test (30 minutes)

**Goal:** Verify system handles multiple concurrent executions

### Steps:
1. Create workflow: Start → DALL-E → Akool → End
2. Execute 5 times concurrently
3. Monitor database connections
4. Monitor memory usage
5. Check for session conflicts

### Expected Results:
```
✅ All 5 executions complete successfully
✅ No database session conflicts
✅ Asset IDs never collide (unique)
✅ Each execution has isolated module_outputs
✅ Timing remains consistent across executions
```

### Monitor Commands:
```bash
# Watch active connections
watch -n 1 'psql -U user -d dbname -c "SELECT count(*) FROM pg_stat_activity;"'

# Monitor logs for errors
tail -f logs/workflow.log | grep -E "(ERROR|WARNING|session)"

# Check for timing degradation
grep "\[TIMING\]" logs/workflow.log | grep "Level 0: Database update"
```

### What to Watch For:
- ❌ "Database is locked" errors → connection pool exhausted
- ❌ Timing increases with each execution → memory leak
- ❌ Asset ID collisions → ID generation not unique

---

## Debugging the 96-Minute Hang

If the hang occurs, here's how to diagnose it:

### Real-Time Monitoring
```bash
# Terminal 1: Watch timing logs
tail -f logs/workflow.log | grep --line-buffered "\[TIMING\]"

# Terminal 2: Watch asset operations
tail -f logs/workflow.log | grep --line-buffered "\[ASSET-"

# Terminal 3: Monitor database
watch -n 5 'psql -U user -d dbname -c "SELECT pid, state, query_start, state_change FROM pg_stat_activity WHERE query NOT LIKE '\''%pg_stat_activity%'\'' AND state != '\''idle'\'';"'
```

### When Hang Occurs
1. **Note the last log entry** - exact timestamp and operation
2. **Check database** - look for long-running queries
3. **Check MCP servers** - ensure they're responding
4. **Check process** - is Python process consuming CPU? (hung) or idle? (waiting)

### Log Analysis After Hang
```bash
# Find the gap
grep "\[TIMING\]" logs/workflow.log | awk '{
    if (prev != "") {
        cmd = "date -d \""$2" "$3"\" +%s"
        cmd | getline curr_ts
        close(cmd)
        gap = curr_ts - prev_ts
        if (gap > 60) print "GAP: "gap"s between "$0" and previous"
    }
    cmd = "date -d \""$2" "$3"\" +%s"
    cmd | getline prev_ts
    close(cmd)
    prev = $0
}'

# This will show exactly where execution stopped
```

---

## Success Criteria

### Phase 1 is successful if:
- ✅ All 5 tests pass without errors
- ✅ No timing gaps > 1 minute (except intentional external API calls)
- ✅ Asset lineage properly tracked in database
- ✅ Pause/resume works with asset IDs
- ✅ Multiple executions don't interfere with each other
- ✅ Memory usage stays constant across multiple runs
- ✅ Database queries remain fast (< 100ms for asset operations)

### Known Issues That Are OK:
- ⚠️ External API calls taking 30-60s (DALL-E, Akool) - this is normal
- ⚠️ First execution slightly slower (cold start, DB connection pool)
- ⚠️ Slight timing variation (±10%) between runs - network/load variance

### Deal Breakers:
- ❌ 96-minute hang returns
- ❌ Assets not created in database
- ❌ Asset IDs not passed between modules
- ❌ Lineage fields NULL or incorrect
- ❌ Pause/resume data loss
- ❌ Database session conflicts

---

## Quick Troubleshooting

### "Asset repository not set"
```python
# Check in workflow_engine_db.py line 127
module._set_asset_repo(asset_repo)  # Should be present
```

### "No assets returned"
```python
# Check module's execute() return value has 'url' field
return {
    "images": [{"url": "...", ...}]  # ✅ Good
}
```

### "Asset fetch returns empty list"
```sql
-- Verify asset exists
SELECT id FROM assets WHERE id = 'asset_XXXXXXXX';

-- Check asset_repo.get_by_ids() implementation
```

### "Timing logs not appearing"
```python
# Check logging configuration
import logging
logging.basicConfig(level=logging.INFO)
```

---

## After Testing

### Report Results:
1. Which tests passed/failed
2. Any timing gaps observed
3. Database query performance
4. Memory usage patterns
5. Any unexpected errors

### Collect Diagnostics:
```bash
# Export timing data
grep "\[TIMING\]" logs/workflow.log > timing_analysis.txt

# Export asset operations
grep "\[ASSET-" logs/workflow.log > asset_operations.txt

# Export database state
psql -U user -d dbname -c "COPY (SELECT * FROM assets) TO STDOUT CSV HEADER" > assets_export.csv
```

### Next Steps:
- If all tests pass → Move to Phase 2 (Input Configuration)
- If hang occurs → Analyze timing logs to identify exact bottleneck
- If assets not created → Review module integration
- If lineage broken → Review create_asset() calls

---

**Good luck with testing! The architecture is ready.** 🚀

