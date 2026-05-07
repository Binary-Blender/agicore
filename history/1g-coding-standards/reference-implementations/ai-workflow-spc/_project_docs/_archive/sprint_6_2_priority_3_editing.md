# Sprint 6.2 Priority 3: Bidirectional Editing System

## Overview
Enable direct editing of Standard Work times in the TPS Builder interface, with changes persisting to the database and affecting future workflow executions.

---

## Step 1: Database Migration

### 1.1 Create Alembic Migration File

**File: `alembic/versions/004_add_time_overrides.py`**

```python
"""Add time override columns to workflow_modules table

Revision ID: 004_add_time_overrides
Revises: 003_add_archived_flag_to_assets
Create Date: 2024-10-30
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers
revision = '004_add_time_overrides'
down_revision = '003_add_archived_flag_to_assets'
branch_labels = None
depends_on = None

def upgrade():
    # Add time override columns to workflow_modules table
    op.add_column('workflow_modules', 
        sa.Column('manual_time_override', sa.Float(), nullable=True))
    op.add_column('workflow_modules', 
        sa.Column('auto_time_override', sa.Float(), nullable=True))
    op.add_column('workflow_modules', 
        sa.Column('time_override_by', sa.String(255), nullable=True))
    op.add_column('workflow_modules', 
        sa.Column('time_override_at', sa.DateTime(timezone=True), nullable=True))
    
    # Add comment to explain the columns
    op.execute("COMMENT ON COLUMN workflow_modules.manual_time_override IS 'User-defined override for manual time estimate'")
    op.execute("COMMENT ON COLUMN workflow_modules.auto_time_override IS 'User-defined override for automation time estimate'")
    op.execute("COMMENT ON COLUMN workflow_modules.time_override_by IS 'User who last modified the time override'")
    op.execute("COMMENT ON COLUMN workflow_modules.time_override_at IS 'Timestamp of last time override modification'")

def downgrade():
    # Remove the columns if rolling back
    op.drop_column('workflow_modules', 'manual_time_override')
    op.drop_column('workflow_modules', 'auto_time_override')
    op.drop_column('workflow_modules', 'time_override_by')
    op.drop_column('workflow_modules', 'time_override_at')
```

### 1.2 Update Database Models

**File: Update `src/database/models.py`** (ADD to WorkflowModule class)

```python
# Add these columns to the WorkflowModule model
class WorkflowModule(Base):
    __tablename__ = "workflow_modules"
    
    # ... existing columns ...
    
    # Time override columns (add these)
    manual_time_override = Column(Float, nullable=True)
    auto_time_override = Column(Float, nullable=True)
    time_override_by = Column(String(255), nullable=True)
    time_override_at = Column(DateTime(timezone=True), nullable=True)
    
    # Helper properties for easier access
    @property
    def has_time_override(self):
        """Check if this module has any time overrides"""
        return self.manual_time_override is not None or self.auto_time_override is not None
    
    @property
    def effective_manual_time(self):
        """Get the effective manual time (override or default)"""
        if self.manual_time_override is not None:
            return self.manual_time_override
        # Return default based on module type
        defaults = {
            "start": 5,
            "end": 2,
            "qc_pass_fail": 20,
            "ab_testing": 15,
            "mcp_ab_testing": 15,
            "mcp_module": 3,
            "image_generation": 3
        }
        return defaults.get(self.type, 3)
    
    @property
    def effective_auto_time(self):
        """Get the effective auto time (override or default)"""
        if self.auto_time_override is not None:
            return self.auto_time_override
        # Return default based on module type
        defaults = {
            "start": 0,
            "end": 0,
            "qc_pass_fail": 0,
            "ab_testing": 5,
            "mcp_ab_testing": 10,
            "mcp_module": 15,
            "image_generation": 18
        }
        return defaults.get(self.type, 0)
```

---

## Step 2: Backend API for Time Editing

### 2.1 Create Time Override API

**File: `src/api/standard_work_editing.py`** (NEW)

```python
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime
from typing import Optional
from pydantic import BaseModel

from src.database.connection import get_db
from src.database.models import WorkflowModule
from src.database.repositories import WorkflowRepository

router = APIRouter(prefix="/api/standard-work", tags=["standard_work_editing"])

class TimeOverrideRequest(BaseModel):
    """Request model for updating time overrides"""
    module_id: str
    manual_time: Optional[float] = None
    auto_time: Optional[float] = None
    reset_to_defaults: bool = False

class TimeOverrideResponse(BaseModel):
    """Response model for time override operations"""
    success: bool
    module_id: str
    module_name: str
    manual_time: float
    auto_time: float
    is_manual_override: bool
    is_auto_override: bool
    override_by: Optional[str]
    override_at: Optional[datetime]
    message: str

@router.put("/modules/{module_id}/time")
async def update_module_time(
    module_id: str,
    request: TimeOverrideRequest,
    db: AsyncSession = Depends(get_db)
) -> TimeOverrideResponse:
    """
    Update time estimates for a workflow module.
    
    Allows setting custom time overrides or resetting to system defaults.
    """
    
    # Validate input
    if not request.reset_to_defaults:
        if request.manual_time is not None and request.manual_time < 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Manual time cannot be negative"
            )
        if request.auto_time is not None and request.auto_time < 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Auto time cannot be negative"
            )
    
    # Get the module
    result = await db.execute(
        select(WorkflowModule).where(WorkflowModule.id == module_id)
    )
    module = result.scalar_one_or_none()
    
    if not module:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Module with ID {module_id} not found"
        )
    
    # Handle reset to defaults
    if request.reset_to_defaults:
        module.manual_time_override = None
        module.auto_time_override = None
        module.time_override_by = None
        module.time_override_at = None
        message = "Times reset to system defaults"
    else:
        # Update override values
        if request.manual_time is not None:
            module.manual_time_override = request.manual_time
        if request.auto_time is not None:
            module.auto_time_override = request.auto_time
        
        # Track who made the change and when
        if request.manual_time is not None or request.auto_time is not None:
            module.time_override_by = "current_user"  # TODO: Get from auth context
            module.time_override_at = datetime.utcnow()
        
        message = "Time override saved successfully"
    
    # Commit changes
    await db.commit()
    await db.refresh(module)
    
    # Return response with effective times
    return TimeOverrideResponse(
        success=True,
        module_id=module.id,
        module_name=module.name,
        manual_time=module.effective_manual_time,
        auto_time=module.effective_auto_time,
        is_manual_override=module.manual_time_override is not None,
        is_auto_override=module.auto_time_override is not None,
        override_by=module.time_override_by,
        override_at=module.time_override_at,
        message=message
    )

@router.get("/workflows/{workflow_id}/time-overrides")
async def get_workflow_time_overrides(
    workflow_id: str,
    db: AsyncSession = Depends(get_db)
):
    """
    Get all time overrides for modules in a workflow.
    
    Returns only modules that have active time overrides.
    """
    
    # Query modules with overrides
    result = await db.execute(
        select(WorkflowModule)
        .where(WorkflowModule.workflow_id == workflow_id)
        .where(
            (WorkflowModule.manual_time_override.isnot(None)) |
            (WorkflowModule.auto_time_override.isnot(None))
        )
        .order_by(WorkflowModule.id)
    )
    
    modules_with_overrides = result.scalars().all()
    
    overrides = []
    total_manual_override = 0
    total_auto_override = 0
    
    for module in modules_with_overrides:
        override_data = {
            "module_id": module.id,
            "module_name": module.name,
            "module_type": module.type,
            "manual_time_override": module.manual_time_override,
            "auto_time_override": module.auto_time_override,
            "override_by": module.time_override_by,
            "override_at": module.time_override_at.isoformat() if module.time_override_at else None
        }
        overrides.append(override_data)
        
        if module.manual_time_override:
            total_manual_override += module.manual_time_override
        if module.auto_time_override:
            total_auto_override += module.auto_time_override
    
    return {
        "workflow_id": workflow_id,
        "override_count": len(overrides),
        "overrides": overrides,
        "total_manual_override_time": total_manual_override,
        "total_auto_override_time": total_auto_override
    }

@router.post("/workflows/{workflow_id}/reset-all-overrides")
async def reset_all_workflow_overrides(
    workflow_id: str,
    db: AsyncSession = Depends(get_db)
):
    """
    Reset all time overrides for all modules in a workflow.
    
    Useful for returning to system defaults after experimentation.
    """
    
    # Get all modules for this workflow
    result = await db.execute(
        select(WorkflowModule)
        .where(WorkflowModule.workflow_id == workflow_id)
        .where(
            (WorkflowModule.manual_time_override.isnot(None)) |
            (WorkflowModule.auto_time_override.isnot(None))
        )
    )
    
    modules = result.scalars().all()
    reset_count = 0
    
    for module in modules:
        module.manual_time_override = None
        module.auto_time_override = None
        module.time_override_by = None
        module.time_override_at = None
        reset_count += 1
    
    await db.commit()
    
    return {
        "success": True,
        "workflow_id": workflow_id,
        "modules_reset": reset_count,
        "message": f"Reset time overrides for {reset_count} modules"
    }
```

### 2.2 Update Main App to Include Router

**File: Update `src/main_workflow_db.py`** (ADD after line 754)

```python
# Import the new router
from src.api import standard_work_editing

# Add the router to the app (add after existing routers)
app.include_router(standard_work_editing.router)
```

---

## Step 3: Update Standard Work Converter

### 3.1 Modify Converter to Use Overrides

**File: Update `src/converters/standard_work_converter.py`** (MODIFY methods)

```python
# Update the estimate_manual_time method
def estimate_manual_time(self, module: WorkflowModule) -> int:
    """
    Estimate manual time for a module.
    Uses override if available, otherwise returns default estimate.
    """
    # Check for user override first
    if module.manual_time_override is not None:
        return int(module.manual_time_override)
    
    # Otherwise use default estimates
    estimates = {
        "start": 5,
        "end": 2,
        "qc_pass_fail": 20,
        "ab_testing": 15,
        "mcp_ab_testing": 15,
        "mcp_module": 3,
        "image_generation": 3,
    }
    return estimates.get(module.type, 3)

# Update the estimate_auto_time method
def estimate_auto_time(self, module: WorkflowModule) -> int:
    """
    Estimate automation time for a module.
    Uses override if available, otherwise returns default estimate.
    """
    # Check for user override first
    if module.auto_time_override is not None:
        return int(module.auto_time_override)
    
    # Otherwise use default estimates
    estimates = {
        "start": 0,
        "end": 0,
        "qc_pass_fail": 0,
        "ab_testing": 5,
        "mcp_ab_testing": 10,
        "mcp_module": 15,
        "image_generation": 18,
    }
    return estimates.get(module.type, 0)

# Add a method to indicate if times are overridden
def has_time_override(self, module: WorkflowModule) -> dict:
    """Check if module has time overrides"""
    return {
        "has_manual_override": module.manual_time_override is not None,
        "has_auto_override": module.auto_time_override is not None,
        "override_by": module.time_override_by,
        "override_at": module.time_override_at.isoformat() if module.time_override_at else None
    }
```

### 3.2 Update Standard Work API Response

**File: Update `src/main_workflow_db.py`** (MODIFY get_workflow_standard_work endpoint around line 570)

```python
# In the get_workflow_standard_work endpoint, add override indicators to each step
@app.get("/api/workflows/{workflow_id}/standard-work")
async def get_workflow_standard_work(
    workflow_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Get Standard Work representation of a workflow with override indicators"""
    
    # ... existing code to get workflow and convert ...
    
    # After getting standard_work from converter, enhance with override data
    for step in standard_work["steps"]:
        # Find the corresponding module
        module = next(
            (m for m in workflow.modules if m.id == step.get("module_id")),
            None
        )
        
        if module:
            # Add override indicators
            step["has_manual_override"] = module.manual_time_override is not None
            step["has_auto_override"] = module.auto_time_override is not None
            step["override_info"] = {
                "by": module.time_override_by,
                "at": module.time_override_at.isoformat() if module.time_override_at else None
            } if module.has_time_override else None
    
    return standard_work
```

---

## Step 4: Frontend Implementation

### 4.1 Add Inline Editing UI

**File: Update `frontend/tps-builder.html`**

#### Add CSS Styles (in `<style>` section after line 350)

```css
/* Time Editing Styles */
.editable-cell {
    position: relative;
}

.editable-time {
    cursor: pointer;
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
    display: inline-block;
    transition: all 0.2s ease;
    position: relative;
}

.editable-time:hover {
    background: rgba(255, 107, 53, 0.1);
    box-shadow: 0 0 0 1px rgba(255, 107, 53, 0.3);
}

.editable-time.has-override {
    background: rgba(255, 107, 53, 0.05);
    border: 1px solid rgba(255, 107, 53, 0.3);
}

.edit-indicator {
    position: absolute;
    top: -5px;
    right: -5px;
    font-size: 0.7rem;
    color: #ff6b35;
    opacity: 0;
    transition: opacity 0.2s;
}

.editable-time:hover .edit-indicator {
    opacity: 1;
}

.time-input-wrapper {
    position: relative;
    display: inline-block;
}

.time-input {
    width: 70px;
    padding: 0.25rem 0.5rem;
    background: #1a1a1a;
    border: 2px solid #ff6b35;
    color: white;
    border-radius: 4px;
    font-size: 1rem;
    text-align: center;
}

.time-input:focus {
    outline: none;
    box-shadow: 0 0 0 3px rgba(255, 107, 53, 0.3);
}

.override-indicator {
    display: inline-block;
    width: 6px;
    height: 6px;
    background: #ff6b35;
    border-radius: 50%;
    margin-left: 0.25rem;
    vertical-align: middle;
    animation: pulse 2s infinite;
}

@keyframes pulse {
    0%, 100% { opacity: 0.6; }
    50% { opacity: 1; }
}

.time-actions {
    margin-top: 0.5rem;
}

.reset-btn {
    font-size: 0.75rem;
    padding: 0.2rem 0.5rem;
    background: #666;
    border: none;
    border-radius: 3px;
    color: white;
    cursor: pointer;
    opacity: 0.8;
    transition: all 0.2s;
}

.reset-btn:hover {
    opacity: 1;
    background: #777;
}

.time-edit-tooltip {
    position: absolute;
    bottom: 100%;
    left: 50%;
    transform: translateX(-50%);
    background: #333;
    color: white;
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
    font-size: 0.75rem;
    white-space: nowrap;
    pointer-events: none;
    opacity: 0;
    transition: opacity 0.2s;
    margin-bottom: 0.5rem;
}

.editable-time:hover .time-edit-tooltip {
    opacity: 1;
}

/* Loading state for save */
.saving {
    opacity: 0.5;
    pointer-events: none;
}

.save-indicator {
    color: #00ff00;
    margin-left: 0.5rem;
    animation: fadeOut 2s forwards;
}

@keyframes fadeOut {
    0% { opacity: 1; }
    70% { opacity: 1; }
    100% { opacity: 0; }
}
```

#### Update Table HTML (modify the Time column in the table, around line 520)

```html
<!-- Replace the existing Time (S) column td with this enhanced version -->
<td class="editable-cell">
    <div class="time-wrapper">
        <!-- Manual Time -->
        <div class="time-row">
            <span class="time-label">M:</span>
            <span v-if="!isEditing(step.module_id, 'manual')" 
                  @dblclick="startEdit(step, 'manual')"
                  class="editable-time"
                  :class="{ 'has-override': step.has_manual_override }"
                  :title="step.has_manual_override ? `Override by ${step.override_info?.by || 'user'} at ${formatDate(step.override_info?.at)}` : 'Double-click to edit'">
                {{ step.manual_time }}s
                <span v-if="step.has_manual_override" class="override-indicator"></span>
                <span class="edit-indicator">✏️</span>
                <span class="time-edit-tooltip">Double-click to edit</span>
            </span>
            <span v-else class="time-input-wrapper">
                <input type="number" 
                       v-model.number="editingValue"
                       @keydown.enter="saveEdit(step, 'manual')"
                       @keydown.esc="cancelEdit()"
                       @blur="saveEdit(step, 'manual')"
                       class="time-input"
                       :class="{ saving: isSaving }"
                       min="0"
                       step="1"
                       ref="timeInput">
            </span>
        </div>
        
        <!-- Auto Time -->
        <div class="time-row">
            <span class="time-label">A:</span>
            <span v-if="!isEditing(step.module_id, 'auto')" 
                  @dblclick="startEdit(step, 'auto')"
                  class="editable-time"
                  :class="{ 'has-override': step.has_auto_override }"
                  :title="step.has_auto_override ? `Override by ${step.override_info?.by || 'user'} at ${formatDate(step.override_info?.at)}` : 'Double-click to edit'">
                {{ step.auto_time }}s
                <span v-if="step.has_auto_override" class="override-indicator"></span>
                <span class="edit-indicator">✏️</span>
                <span class="time-edit-tooltip">Double-click to edit</span>
            </span>
            <span v-else class="time-input-wrapper">
                <input type="number" 
                       v-model.number="editingValue"
                       @keydown.enter="saveEdit(step, 'auto')"
                       @keydown.esc="cancelEdit()"
                       @blur="saveEdit(step, 'auto')"
                       class="time-input"
                       :class="{ saving: isSaving }"
                       min="0"
                       step="1">
            </span>
        </div>
        
        <!-- Total -->
        <div class="time-total">
            <strong>{{ step.manual_time + step.auto_time }}s</strong>
        </div>
        
        <!-- Reset button if has overrides -->
        <div v-if="step.has_manual_override || step.has_auto_override" class="time-actions">
            <button @click="resetTimeOverride(step)" class="reset-btn" title="Reset to system defaults">
                ↺ Reset
            </button>
        </div>
        
        <!-- Save indicator -->
        <span v-if="savedModules[step.module_id]" class="save-indicator">✓</span>
    </div>
</td>
```

#### Update Vue.js Code (in `<script>` section, around line 700)

```javascript
// Add to data() object
data() {
    return {
        // ... existing data ...
        
        // Time editing state
        editingModule: null,
        editingType: null,  // 'manual' or 'auto'
        editingValue: null,
        originalValue: null,
        isSaving: false,
        savedModules: {},  // Track recently saved modules for visual feedback
    }
},

// Add these methods to the methods object
methods: {
    // ... existing methods ...
    
    // Time Editing Methods
    isEditing(moduleId, type) {
        return this.editingModule === moduleId && this.editingType === type;
    },
    
    startEdit(step, type) {
        // Don't start new edit if already saving
        if (this.isSaving) return;
        
        this.editingModule = step.module_id;
        this.editingType = type;
        this.editingValue = type === 'manual' ? step.manual_time : step.auto_time;
        this.originalValue = this.editingValue;
        
        // Focus input after Vue updates DOM
        this.$nextTick(() => {
            const input = this.$refs.timeInput;
            if (input) {
                input.focus();
                input.select();
            }
        });
    },
    
    cancelEdit() {
        this.editingModule = null;
        this.editingType = null;
        this.editingValue = null;
        this.originalValue = null;
    },
    
    async saveEdit(step, type) {
        // Prevent multiple saves
        if (this.isSaving) return;
        
        // Skip if value hasn't changed
        if (this.editingValue === this.originalValue) {
            this.cancelEdit();
            return;
        }
        
        // Validate input
        if (this.editingValue < 0 || isNaN(this.editingValue)) {
            this.showToast('error', 'Time must be a positive number');
            this.editingValue = this.originalValue;
            this.cancelEdit();
            return;
        }
        
        this.isSaving = true;
        
        try {
            const payload = {
                module_id: step.module_id,
                [type === 'manual' ? 'manual_time' : 'auto_time']: this.editingValue,
                reset_to_defaults: false
            };
            
            const response = await fetch(`/api/standard-work/modules/${step.module_id}/time`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            
            if (response.ok) {
                const result = await response.json();
                
                // Update local data
                if (type === 'manual') {
                    step.manual_time = result.manual_time;
                    step.has_manual_override = result.is_manual_override;
                } else {
                    step.auto_time = result.auto_time;
                    step.has_auto_override = result.is_auto_override;
                }
                
                // Update override info
                if (result.override_by) {
                    step.override_info = {
                        by: result.override_by,
                        at: result.override_at
                    };
                }
                
                // Show save indicator
                this.$set(this.savedModules, step.module_id, true);
                setTimeout(() => {
                    this.$set(this.savedModules, step.module_id, false);
                }, 2000);
                
                // Update totals
                this.updateTotals();
                
                // Show success message
                this.showToast('success', `${type === 'manual' ? 'Manual' : 'Auto'} time updated to ${this.editingValue}s`);
                
                // Check for Takt time violation
                if (this.totalCycleTime > this.taktTime) {
                    this.showToast('warning', `⚠️ Cycle time (${this.totalCycleTime}s) now exceeds Takt time (${this.taktTime}s)`);
                }
            } else {
                const error = await response.json();
                this.showToast('error', error.detail || 'Failed to update time');
            }
        } catch (error) {
            console.error('Error saving time edit:', error);
            this.showToast('error', 'Failed to save time override');
        } finally {
            this.isSaving = false;
            this.cancelEdit();
        }
    },
    
    async resetTimeOverride(step) {
        if (!confirm('Reset times to system defaults? This will remove your custom time overrides.')) {
            return;
        }
        
        try {
            const response = await fetch(`/api/standard-work/modules/${step.module_id}/time`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    module_id: step.module_id,
                    reset_to_defaults: true
                })
            });
            
            if (response.ok) {
                const result = await response.json();
                
                // Update local data with system defaults
                step.manual_time = result.manual_time;
                step.auto_time = result.auto_time;
                step.has_manual_override = false;
                step.has_auto_override = false;
                step.override_info = null;
                
                // Update totals
                this.updateTotals();
                
                this.showToast('success', 'Times reset to system defaults');
            } else {
                this.showToast('error', 'Failed to reset times');
            }
        } catch (error) {
            console.error('Error resetting time override:', error);
            this.showToast('error', 'Failed to reset time override');
        }
    },
    
    async resetAllOverrides() {
        if (!this.selectedWorkflow) return;
        
        const overrideCount = this.standardWorkSteps.filter(s => 
            s.has_manual_override || s.has_auto_override
        ).length;
        
        if (overrideCount === 0) {
            this.showToast('info', 'No time overrides to reset');
            return;
        }
        
        if (!confirm(`Reset ALL time overrides (${overrideCount} modules) to system defaults?`)) {
            return;
        }
        
        try {
            const response = await fetch(`/api/standard-work/workflows/${this.selectedWorkflow.id}/reset-all-overrides`, {
                method: 'POST'
            });
            
            if (response.ok) {
                const result = await response.json();
                
                // Reload the standard work to get fresh data
                await this.loadStandardWork();
                
                this.showToast('success', `Reset ${result.modules_reset} time overrides to system defaults`);
            } else {
                this.showToast('error', 'Failed to reset all overrides');
            }
        } catch (error) {
            console.error('Error resetting all overrides:', error);
            this.showToast('error', 'Failed to reset overrides');
        }
    },
    
    updateTotals() {
        // Recalculate total cycle time
        this.totalCycleTime = this.standardWorkSteps.reduce((total, step) => {
            return total + step.manual_time + step.auto_time;
        }, 0);
        
        // Check if exceeds Takt time
        this.exceedsTaktTime = this.totalCycleTime > this.taktTime;
    },
    
    formatDate(dateString) {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
    }
}
```

#### Add Reset All Button (after the export buttons, around line 490)

```html
<!-- Add this after the Export buttons div -->
<div v-if="hasAnyOverrides" style="margin-left: 1rem; display: inline-block;">
    <button @click="resetAllOverrides()" class="btn btn-secondary" style="background: #666;">
        ↺ Reset All Time Overrides
    </button>
</div>

<!-- Add computed property for hasAnyOverrides -->
<script>
computed: {
    // ... existing computed ...
    
    hasAnyOverrides() {
        return this.standardWorkSteps.some(step => 
            step.has_manual_override || step.has_auto_override
        );
    }
}
</script>
```

---

## Step 5: Migration & Deployment

### 5.1 Run Database Migration

```bash
# SSH into your container or run locally
cd /app  # or your project directory

# Run the migration
alembic upgrade head

# Verify migration
echo "SELECT column_name FROM information_schema.columns WHERE table_name='workflow_modules' AND column_name LIKE '%override%';" | psql $DATABASE_URL
```

### 5.2 Test Locally

```python
# Quick test script to verify the API works
import httpx
import asyncio

async def test_time_override():
    async with httpx.AsyncClient(base_url="http://localhost:8000") as client:
        # Get a workflow
        workflows = await client.get("/api/workflows")
        workflow_id = workflows.json()["workflows"][0]["id"]
        
        # Get standard work
        std_work = await client.get(f"/api/workflows/{workflow_id}/standard-work")
        module_id = std_work.json()["steps"][0]["module_id"]
        
        # Test time override
        response = await client.put(
            f"/api/standard-work/modules/{module_id}/time",
            json={
                "module_id": module_id,
                "manual_time": 10,
                "auto_time": 25
            }
        )
        
        print(f"Override response: {response.json()}")
        
        # Test reset
        response = await client.put(
            f"/api/standard-work/modules/{module_id}/time",
            json={
                "module_id": module_id,
                "reset_to_defaults": True
            }
        )
        
        print(f"Reset response: {response.json()}")

asyncio.run(test_time_override())
```

### 5.3 Deploy to Production

```bash
# Commit changes
git add -A
git commit -m "Sprint 6.2 Priority 3: Add bidirectional time editing with database persistence"
git push origin main

# Deploy to Fly.io
flyctl deploy

# After deployment, run migration on production
flyctl ssh console
cd /app
alembic upgrade head
exit
```

---

## Testing Checklist

### Database Migration
- [ ] Migration runs without errors
- [ ] New columns exist in workflow_modules table
- [ ] Existing data is preserved

### API Endpoints
- [ ] PUT /api/standard-work/modules/{id}/time updates times
- [ ] GET /api/standard-work/workflows/{id}/time-overrides returns overrides
- [ ] POST /api/standard-work/workflows/{id}/reset-all-overrides clears all

### Frontend Editing
- [ ] Double-click opens edit mode
- [ ] Enter key saves changes
- [ ] Escape key cancels edit
- [ ] Blur (clicking away) saves changes
- [ ] Override indicator (orange dot) appears for custom times
- [ ] Hover shows who made override and when
- [ ] Reset button appears only for overridden times
- [ ] Reset button clears override and shows system default

### Data Persistence
- [ ] Times persist after page refresh
- [ ] Times affect workflow execution (when implemented)
- [ ] Standard Work converter uses override values

### Visual Feedback
- [ ] Edit mode styling is clear
- [ ] Save indicator appears briefly after save
- [ ] Toast messages confirm actions
- [ ] Takt time warning appears when exceeded

### Edge Cases
- [ ] Negative numbers are rejected
- [ ] Non-numeric input is rejected
- [ ] Very large numbers are handled
- [ ] Rapid clicking doesn't cause issues
- [ ] Multiple users editing (future consideration)

---

## Troubleshooting

### Common Issues

1. **Migration fails with "column already exists"**
   - The migration may have partially run
   - Check current schema: `\d workflow_modules` in psql
   - May need to manually drop columns and re-run

2. **Times not persisting**
   - Check browser console for API errors
   - Verify module_id is being sent correctly
   - Check database logs for constraint violations

3. **Edit mode not appearing**
   - Verify Vue.js is properly handling the double-click event
   - Check if `editingModule` state is updating
   - Ensure no JavaScript errors in console

4. **Reset not working**
   - Verify the API endpoint is receiving reset_to_defaults: true
   - Check that defaults are defined in StandardWorkConverter
   - Ensure database commit is happening

---

## Next Steps

After Priority 3 is complete, proceed to:

**Priority 4: A/B Testing Integration** (Days 6-7)
- Display test results in Standard Work view
- Show winner badges and cost savings
- Apply winning variants to configuration

This will complete the Sprint 6.2 TPS integration!