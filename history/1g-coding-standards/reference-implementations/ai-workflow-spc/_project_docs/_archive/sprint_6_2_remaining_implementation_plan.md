# Sprint 6.2 Remaining Implementation Plan
**Date:** 2025-01-30
**Status:** In Progress - 50% Complete

---

## ✅ COMPLETED (Priority 2 - Andon Alerts)

### Backend
- [x] Created `AndonCalculator` class (`src/tps/andon_calculator.py`) - 360 lines
  - Threshold-based evaluation for Defect Rate, FPY, Cycle Time, OEE
  - Generates actionable recommendations for each alert
  - AndonStatus enum (GREEN/YELLOW/RED)

- [x] Added Andon API endpoint to `src/main_workflow_db.py:754-807`
  - `GET /api/workflows/{id}/andon-status`
  - Integrates with TPSMetricsCalculator
  - Returns overall status, alerts array, metric statuses, summary

### Frontend
- [x] Added Andon Board UI to `frontend/tps-builder.html:576-606`
  - Visual status light with glow animation
  - Color-coded status text
  - Expandable alert details with recommendations
  - Added `andonData` property to Vue data
  - Added `loadAndonStatus()` and `getAndonColor()` methods

---

## 🚧 IN PROGRESS (Priority 3 - Bidirectional Editing)

### ✅ Completed Steps

**Database Layer:**
- [x] Created migration `alembic/versions/009_add_time_overrides.py`
  - Adds `manual_time_override` NUMERIC(10,2)
  - Adds `auto_time_override` NUMERIC(10,2)
  - Note: Strategy guide suggests also adding `time_override_by` and `time_override_at` for audit trail

**API Layer:**
- [x] Created Time Override API endpoint in `src/main_workflow_db.py:701-751`
  - `PUT /api/workflows/{id}/modules/{id}/time-override`
  - Basic validation and database updates
  - Returns updated times

### ⏳ Remaining Steps for Priority 3

#### 1. Enhance Database Migration (OPTIONAL - Audit Trail)
**Decision Point:** Do we want to track who/when for time overrides?

If YES, update `alembic/versions/009_add_time_overrides.py` to add:
```python
op.add_column('workflow_modules', sa.Column('time_override_by', sa.String(255), nullable=True))
op.add_column('workflow_modules', sa.Column('time_override_at', sa.DateTime(timezone=True), nullable=True))
```

#### 2. Update Database Models
**File:** `src/database/models.py` (WorkflowModule class)

Add columns to model:
```python
# Around line where other columns are defined
manual_time_override = Column(Numeric(10, 2), nullable=True)
auto_time_override = Column(Numeric(10, 2), nullable=True)
time_override_by = Column(String(255), nullable=True)  # OPTIONAL
time_override_at = Column(DateTime(timezone=True), nullable=True)  # OPTIONAL
```

Add helper properties:
```python
@property
def has_time_override(self):
    return self.manual_time_override is not None or self.auto_time_override is not None

@property
def effective_manual_time(self):
    if self.manual_time_override is not None:
        return self.manual_time_override
    return self.manual_time  # Use existing calculated value

@property
def effective_auto_time(self):
    if self.auto_time_override is not None:
        return self.auto_time_override
    return self.auto_time  # Use existing calculated value
```

#### 3. Update StandardWorkConverter
**File:** `src/engine/standard_work_converter.py`

**Location:** Modify `_convert_module_to_step()` method (around line 50-120)

Change from:
```python
manual_time = self._estimate_manual_time(module)
auto_time = self._estimate_auto_time(module)
```

To:
```python
# Check for overrides first, then fall back to estimates
manual_time = (module.manual_time_override
               if module.manual_time_override is not None
               else self._estimate_manual_time(module))
auto_time = (module.auto_time_override
             if module.auto_time_override is not None
             else self._estimate_auto_time(module))
```

Also add override indicators to returned step data:
```python
"has_manual_override": module.manual_time_override is not None,
"has_auto_override": module.auto_time_override is not None,
"override_info": {
    "by": module.time_override_by,
    "at": module.time_override_at.isoformat() if module.time_override_at else None
} if hasattr(module, 'has_time_override') and module.has_time_override else None
```

#### 4. Frontend Inline Editing UI
**File:** `frontend/tps-builder.html`

**A. Add CSS Styles** (after line 350 in `<style>` section):
```css
/* Time Editing Styles - copy from strategy guide lines 447-582 */
.editable-time { cursor: pointer; padding: 0.25rem 0.5rem; ... }
.editable-time.has-override { background: rgba(255, 107, 53, 0.05); ... }
.time-input { width: 70px; padding: 0.25rem 0.5rem; ... }
.override-indicator { display: inline-block; width: 6px; height: 6px; ... }
/* ... full CSS from strategy guide */
```

**B. Update Time Column in Table** (around line 620 in table):
Replace existing Time (S) column with enhanced version from strategy guide (lines 587-659):
- Add double-click to edit
- Show override indicators (orange dots)
- Display who/when made override
- Add inline input fields
- Add reset button for overridden times

**C. Add Vue.js Methods** (in methods object around line 920):
```javascript
// Time editing state (add to data())
editingModule: null,
editingType: null,  // 'manual' or 'auto'
editingValue: null,
originalValue: null,
isSaving: false,
savedModules: {},

// Methods (copy from strategy guide lines 684-886)
isEditing(moduleId, type) { ... },
startEdit(step, type) { ... },
cancelEdit() { ... },
async saveEdit(step, type) { ... },
async resetTimeOverride(step) { ... },
updateTotals() { ... },
formatDate(dateString) { ... }
```

**D. Add Reset All Button** (after export buttons around line 530):
```html
<button v-if="hasAnyOverrides"
        @click="resetAllOverrides()"
        style="background: #666;">
    ↺ Reset All Time Overrides
</button>
```

---

## 📋 NOT STARTED (Priority 4 - A/B Testing Integration)

### Requirements
Display A/B test results in Standard Work view with:
- Test results panel showing active tests
- Winner badges on modules with completed tests
- Cost savings metrics
- Button to apply winning variant

### Implementation Plan

#### 1. Create A/B Testing Results API
**File:** `src/main_workflow_db.py` (add new endpoint)

```python
@app.get("/api/workflows/{workflow_id}/ab-test-results")
async def get_ab_test_results(
    workflow_id: str,
    db: AsyncSession = Depends(get_db)
):
    """
    Get A/B testing results for modules in a workflow

    Returns completed tests with winner information and cost savings
    """
    # Query for modules with type='ab_testing' or 'mcp_ab_testing'
    # Get test results from execution history
    # Calculate winner based on cost, quality, or time metrics
    # Return structured results
    pass
```

#### 2. Add A/B Test Results Panel to UI
**File:** `frontend/tps-builder.html`

Add panel after Andon Board (around line 610):
```html
<!-- A/B Test Results Panel -->
<div v-if="abTestResults && abTestResults.length > 0" class="ab-test-panel">
    <h3>🧪 A/B Test Results</h3>
    <div v-for="test in abTestResults" :key="test.module_id" class="ab-test-card">
        <div class="test-header">
            <span class="module-name">{{ test.module_name }}</span>
            <span class="winner-badge">🏆 Winner: {{ test.winner }}</span>
        </div>
        <div class="test-metrics">
            <div class="metric">
                <label>Cost Savings:</label>
                <span class="savings">${{ test.cost_savings }}</span>
            </div>
            <div class="metric">
                <label>Performance Improvement:</label>
                <span>{{ test.performance_improvement }}%</span>
            </div>
        </div>
        <button @click="applyWinningVariant(test)" class="apply-btn">
            Apply Winner to Workflow
        </button>
    </div>
</div>
```

#### 3. Add Winner Badges to Standard Work Table
In the Work Element column, add conditional badge:
```html
<span v-if="step.ab_test_winner" class="winner-indicator"
      :title="`Winner: ${step.ab_test_winner} | Savings: $${step.cost_savings}`">
    🏆
</span>
```

#### 4. Implement Apply Winner Functionality
```javascript
async applyWinningVariant(test) {
    if (!confirm(`Apply ${test.winner} as the active configuration?`)) return;

    try {
        const response = await fetch(`/api/ab-tests/${test.test_id}/apply-winner`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                variant: test.winner,
                module_id: test.module_id
            })
        });

        if (response.ok) {
            this.showToast('success', `Applied ${test.winner} configuration`);
            await this.loadWorkflowStandardWork();  // Refresh data
        }
    } catch (error) {
        this.showToast('error', 'Failed to apply winner');
    }
}
```

---

## 🚀 DEPLOYMENT PLAN

### Pre-Deployment Checklist
- [ ] All code changes committed
- [ ] Migration file created and tested locally
- [ ] API endpoints tested with curl/Postman
- [ ] Frontend UI tested in browser
- [ ] No console errors
- [ ] Database models updated

### Deployment Steps

#### 1. Test Locally First
```bash
# Run migration locally
alembic upgrade head

# Start dev server
uvicorn src.main_workflow_db:app --reload

# Test in browser at http://localhost:8000/tps-builder
```

#### 2. Deploy to Fly.io
```bash
# Commit all changes
git add -A
git commit -m "Sprint 6.2: Add Andon Alerts + Bidirectional Editing (partial)"

# Deploy
flyctl deploy

# SSH into production and run migration
flyctl ssh console -a ai-workflow-spc
cd /app
alembic upgrade head
exit

# Restart machines to pick up changes
flyctl machines restart --app ai-workflow-spc
```

#### 3. Verify Production
```bash
# Check logs
flyctl logs -a ai-workflow-spc

# Test Andon endpoint
curl https://ai-workflow-spc.fly.dev/api/workflows/{workflow_id}/andon-status

# Test UI in browser
open https://ai-workflow-spc.fly.dev/tps-builder
```

---

## 📊 PROGRESS TRACKING

### Overall Sprint 6.2 Status: 50% Complete

| Priority | Feature | Status | % Complete |
|----------|---------|--------|------------|
| Priority 2 | Andon Alerts | ✅ Complete | 100% |
| Priority 3 | Bidirectional Editing | 🚧 In Progress | 40% |
| Priority 4 | A/B Testing | ⏳ Not Started | 0% |

### Estimated Time Remaining
- Priority 3 completion: 2-3 hours
- Priority 4 implementation: 3-4 hours
- Testing & deployment: 1 hour
- **Total: 6-8 hours**

---

## 🎯 NEXT IMMEDIATE ACTIONS

1. **Decision: Audit Trail Columns?**
   - Decide if we want `time_override_by` and `time_override_at`
   - If yes, update migration and model

2. **Update Database Models**
   - Add time override columns to WorkflowModule model
   - Add helper properties for effective times

3. **Update StandardWorkConverter**
   - Check for overrides before using estimates
   - Add override indicators to response

4. **Implement Inline Editing UI**
   - Add CSS styles for editable times
   - Update table HTML with editing capabilities
   - Add Vue.js methods for edit/save/cancel
   - Test double-click, Enter, Escape, blur interactions

5. **Deploy & Test Andon + Editing**
   - Deploy what we have so far
   - Test Andon Board with real workflows
   - Test time editing in TPS Builder

6. **Priority 4 (Optional for later)**
   - Can be deferred if time is limited
   - A/B Testing integration is lower priority

---

## 🔍 TESTING SCENARIOS

### Andon Board Testing
- [ ] Green status shows when all metrics healthy
- [ ] Yellow status shows with warnings
- [ ] Red status shows with critical alerts
- [ ] Alert cards display proper recommendations
- [ ] Status light animates when not green
- [ ] Auto-refreshes with workflow data

### Time Editing Testing
- [ ] Double-click opens edit mode
- [ ] Enter saves, Escape cancels
- [ ] Negative numbers rejected
- [ ] Override indicator appears after save
- [ ] Reset button clears override
- [ ] Times persist after page refresh
- [ ] Totals recalculate correctly
- [ ] Takt time warning appears when exceeded

---

## 📝 NOTES & DECISIONS

### Key Decisions Made
1. ✅ Created migration 009 (vs 004 in strategy guide - we're further along)
2. ✅ Already have basic Time Override API endpoint
3. ⏳ Need to decide on audit trail columns
4. ⏳ StandardWorkConverter needs override logic
5. ⏳ Frontend UI is the biggest remaining piece

### Deviations from Strategy Guide
- Using migration 009 instead of 004 (we have more migrations)
- Already have `manual_time` and `auto_time` columns from migration 008
- Using simplified API endpoint structure (can enhance later)
- May defer audit trail columns to keep it simple initially

### Future Enhancements
- Multi-user editing notifications
- Time override history/changelog
- Bulk time editing
- Import/export time configurations
- Machine learning for time predictions based on history

---

**Last Updated:** 2025-01-30
**Next Review:** After Priority 3 completion
