# Sprint 6.2 Implementation Guide: Andon, Editing & A/B Integration

## Overview
With Export functionality complete, we'll now implement the remaining three priorities to complete the TPS integration. All decisions have been made to maintain momentum.

---

## Priority 2: Visual Andon Alerts Enhancement (Days 1-2)

### Objective
Transform the basic metrics display into an intelligent Andon system that provides visual warnings and actionable alerts based on TPS principles.

### 2.1 Backend: Enhanced Metrics Calculation

**File: `src/tps/andon_calculator.py`** (NEW)

```python
from datetime import datetime, timedelta
from typing import Dict, List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from enum import Enum

class AndonStatus(Enum):
    GREEN = "green"     # Normal operation
    YELLOW = "yellow"   # Attention required
    RED = "red"        # Stop and fix

class AndonAlert:
    def __init__(self, severity: str, message: str, metric: str, value: float, threshold: float):
        self.severity = severity
        self.message = message
        self.metric = metric
        self.value = value
        self.threshold = threshold
        self.timestamp = datetime.utcnow()

class AndonCalculator:
    """Calculate Andon status and alerts based on TPS metrics"""
    
    # Thresholds (configurable per workflow in future)
    THRESHOLDS = {
        'defect_rate': {'red': 5.0, 'yellow': 2.0},
        'first_pass_yield': {'red': 90.0, 'yellow': 95.0},  # Lower is worse
        'cycle_time_ratio': {'red': 1.0, 'yellow': 0.9},    # Cycle/Takt ratio
        'oee': {'red': 60.0, 'yellow': 85.0},               # Lower is worse
    }
    
    def __init__(self, db: AsyncSession):
        self.db = db
        self.alerts: List[AndonAlert] = []
    
    async def calculate_andon_status(self, workflow_id: str) -> Dict:
        """Calculate comprehensive Andon status for a workflow"""
        
        # Get current metrics
        from src.tps.tps_calculator import TPSMetricsCalculator
        calculator = TPSMetricsCalculator(self.db)
        metrics = await calculator.calculate_metrics(workflow_id, period_days=7)
        
        # Get workflow configuration for takt time
        workflow_repo = WorkflowRepository(self.db)
        workflow = await workflow_repo.get_by_id(workflow_id)
        
        # Calculate status for each metric
        statuses = {}
        self.alerts = []
        
        # 1. Defect Rate Check
        if metrics.get('defect_rate', 0) > self.THRESHOLDS['defect_rate']['red']:
            statuses['defect_rate'] = AndonStatus.RED
            self.alerts.append(AndonAlert(
                severity='critical',
                message=f"Defect rate {metrics['defect_rate']:.1f}% exceeds 5% limit!",
                metric='defect_rate',
                value=metrics['defect_rate'],
                threshold=5.0
            ))
        elif metrics.get('defect_rate', 0) > self.THRESHOLDS['defect_rate']['yellow']:
            statuses['defect_rate'] = AndonStatus.YELLOW
            self.alerts.append(AndonAlert(
                severity='warning',
                message=f"Defect rate {metrics['defect_rate']:.1f}% approaching limit",
                metric='defect_rate',
                value=metrics['defect_rate'],
                threshold=2.0
            ))
        else:
            statuses['defect_rate'] = AndonStatus.GREEN
        
        # 2. First Pass Yield Check
        fpy = metrics.get('first_pass_yield', 100)
        if fpy < self.THRESHOLDS['first_pass_yield']['red']:
            statuses['first_pass_yield'] = AndonStatus.RED
            self.alerts.append(AndonAlert(
                severity='critical',
                message=f"First Pass Yield {fpy:.1f}% below 90% minimum!",
                metric='first_pass_yield',
                value=fpy,
                threshold=90.0
            ))
        elif fpy < self.THRESHOLDS['first_pass_yield']['yellow']:
            statuses['first_pass_yield'] = AndonStatus.YELLOW
            self.alerts.append(AndonAlert(
                severity='warning',
                message=f"First Pass Yield {fpy:.1f}% below target",
                metric='first_pass_yield',
                value=fpy,
                threshold=95.0
            ))
        else:
            statuses['first_pass_yield'] = AndonStatus.GREEN
        
        # 3. Cycle Time vs Takt Time Check
        takt_time = workflow.config.get('takt_time', 45) if workflow.config else 45
        cycle_time = metrics.get('average_cycle_time', 0)
        
        if cycle_time > 0 and takt_time > 0:
            ratio = cycle_time / takt_time
            if ratio > self.THRESHOLDS['cycle_time_ratio']['red']:
                statuses['cycle_time'] = AndonStatus.RED
                self.alerts.append(AndonAlert(
                    severity='critical',
                    message=f"Cycle time {cycle_time:.0f}s exceeds Takt time {takt_time:.0f}s!",
                    metric='cycle_time_ratio',
                    value=ratio,
                    threshold=1.0
                ))
            elif ratio > self.THRESHOLDS['cycle_time_ratio']['yellow']:
                statuses['cycle_time'] = AndonStatus.YELLOW
                self.alerts.append(AndonAlert(
                    severity='warning',
                    message=f"Cycle time {cycle_time:.0f}s approaching Takt time",
                    metric='cycle_time_ratio',
                    value=ratio,
                    threshold=0.9
                ))
            else:
                statuses['cycle_time'] = AndonStatus.GREEN
        else:
            statuses['cycle_time'] = AndonStatus.GREEN
        
        # 4. OEE Check
        oee = metrics.get('oee', 100)
        if oee < self.THRESHOLDS['oee']['red']:
            statuses['oee'] = AndonStatus.RED
            self.alerts.append(AndonAlert(
                severity='critical',
                message=f"OEE {oee:.1f}% - Immediate improvement required!",
                metric='oee',
                value=oee,
                threshold=60.0
            ))
        elif oee < self.THRESHOLDS['oee']['yellow']:
            statuses['oee'] = AndonStatus.YELLOW
            self.alerts.append(AndonAlert(
                severity='warning',
                message=f"OEE {oee:.1f}% below world-class standard",
                metric='oee',
                value=oee,
                threshold=85.0
            ))
        else:
            statuses['oee'] = AndonStatus.GREEN
        
        # Determine overall status (worst wins)
        overall_status = AndonStatus.GREEN
        for status in statuses.values():
            if status == AndonStatus.RED:
                overall_status = AndonStatus.RED
                break
            elif status == AndonStatus.YELLOW and overall_status != AndonStatus.RED:
                overall_status = AndonStatus.YELLOW
        
        return {
            'overall_status': overall_status.value,
            'individual_statuses': {k: v.value for k, v in statuses.items()},
            'alerts': [
                {
                    'severity': alert.severity,
                    'message': alert.message,
                    'metric': alert.metric,
                    'value': alert.value,
                    'threshold': alert.threshold,
                    'timestamp': alert.timestamp.isoformat()
                }
                for alert in self.alerts
            ],
            'metrics': metrics,
            'takt_time': takt_time,
            'cycle_time': cycle_time,
            'recommendation': self._get_recommendation(overall_status)
        }
    
    def _get_recommendation(self, status: AndonStatus) -> str:
        """Get actionable recommendation based on status"""
        if status == AndonStatus.RED:
            return "STOP production and address critical issues immediately. Pull Andon cord for supervisor assistance."
        elif status == AndonStatus.YELLOW:
            return "Monitor closely and prepare countermeasures. Consider preventive action before issues escalate."
        else:
            return "Continue normal operation. Maintain current performance levels."
```

**File: Update `src/main_workflow_db.py`** (ADD endpoint)

```python
from src.tps.andon_calculator import AndonCalculator

@app.get("/api/workflows/{workflow_id}/andon-status")
async def get_andon_status(
    workflow_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Get real-time Andon status and alerts for a workflow"""
    calculator = AndonCalculator(db)
    status = await calculator.calculate_andon_status(workflow_id)
    return status
```

### 2.2 Frontend: Visual Andon Board

**File: Update `frontend/tps-builder.html`** (ADD Andon section after metrics)

```html
<!-- Add this CSS to the <style> section -->
<style>
/* Andon Board Styles */
.andon-board {
    background: linear-gradient(135deg, #2a2a2a 0%, #1a1a1a 100%);
    border-radius: 8px;
    padding: 1.5rem;
    margin: 1rem 0;
    border: 2px solid #3a3a3a;
    transition: all 0.3s ease;
}

.andon-board.status-red {
    border-color: #ff4444;
    animation: pulse-red 1s infinite;
}

.andon-board.status-yellow {
    border-color: #ffaa00;
    animation: pulse-yellow 2s infinite;
}

.andon-board.status-green {
    border-color: #00ff00;
}

@keyframes pulse-red {
    0%, 100% { box-shadow: 0 0 10px rgba(255, 68, 68, 0.5); }
    50% { box-shadow: 0 0 30px rgba(255, 68, 68, 0.8); }
}

@keyframes pulse-yellow {
    0%, 100% { box-shadow: 0 0 10px rgba(255, 170, 0, 0.3); }
    50% { box-shadow: 0 0 20px rgba(255, 170, 0, 0.6); }
}

.andon-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 1rem;
}

.andon-status-light {
    width: 60px;
    height: 60px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: bold;
    color: #000;
    box-shadow: 0 0 20px currentColor;
    animation: blink 1s infinite;
}

.andon-status-light.green {
    background: radial-gradient(circle, #00ff00, #00cc00);
}

.andon-status-light.yellow {
    background: radial-gradient(circle, #ffff00, #ffaa00);
    animation: blink 1.5s infinite;
}

.andon-status-light.red {
    background: radial-gradient(circle, #ff6666, #ff0000);
    animation: blink 0.5s infinite;
}

@keyframes blink {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.7; }
}

.andon-status-text {
    flex: 1;
    margin: 0 1rem;
}

.andon-status-text h3 {
    margin: 0;
    font-size: 1.5rem;
}

.andon-status-text p {
    margin: 0.25rem 0 0 0;
    opacity: 0.8;
}

.andon-alerts {
    margin-top: 1rem;
}

.andon-alert {
    background: rgba(255, 255, 255, 0.05);
    border-left: 4px solid;
    padding: 0.75rem;
    margin: 0.5rem 0;
    border-radius: 4px;
}

.andon-alert.critical {
    border-color: #ff4444;
    background: rgba(255, 68, 68, 0.1);
}

.andon-alert.warning {
    border-color: #ffaa00;
    background: rgba(255, 170, 0, 0.1);
}

.andon-alert-metric {
    font-size: 0.85rem;
    opacity: 0.8;
    margin-top: 0.25rem;
}

.andon-cord-button {
    background: #ff4444;
    color: white;
    border: none;
    padding: 0.75rem 1.5rem;
    font-size: 1.1rem;
    border-radius: 8px;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    transition: all 0.3s ease;
    animation: shake 2s infinite;
}

.andon-cord-button:hover {
    background: #ff6666;
    transform: scale(1.05);
}

@keyframes shake {
    0%, 100% { transform: translateX(0); }
    10%, 30%, 50%, 70%, 90% { transform: translateX(-2px); }
    20%, 40%, 60%, 80% { transform: translateX(2px); }
}

.metric-indicators {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 1rem;
    margin-top: 1rem;
}

.metric-indicator {
    background: rgba(255, 255, 255, 0.05);
    padding: 0.75rem;
    border-radius: 4px;
    text-align: center;
}

.metric-indicator.status-green {
    border-top: 3px solid #00ff00;
}

.metric-indicator.status-yellow {
    border-top: 3px solid #ffaa00;
}

.metric-indicator.status-red {
    border-top: 3px solid #ff4444;
}
</style>

<!-- Add this HTML after the metrics-display div -->
<div id="andon-board" class="andon-board" v-if="andonStatus" :class="'status-' + andonStatus.overall_status">
    <div class="andon-header">
        <div class="andon-status-light" :class="andonStatus.overall_status">
            <span v-if="andonStatus.overall_status === 'green'">OK</span>
            <span v-else-if="andonStatus.overall_status === 'yellow'">!</span>
            <span v-else>!!</span>
        </div>
        
        <div class="andon-status-text">
            <h3>
                {{ andonStatus.overall_status === 'green' ? 'Normal Operation' : 
                   andonStatus.overall_status === 'yellow' ? 'Attention Required' : 
                   'Stop & Fix' }}
            </h3>
            <p>{{ andonStatus.recommendation }}</p>
        </div>
        
        <button v-if="andonStatus.overall_status !== 'green'" 
                @click="pullAndonCord()" 
                class="andon-cord-button">
            🔔 Pull Andon Cord
        </button>
    </div>
    
    <div class="metric-indicators">
        <div v-for="(status, metric) in andonStatus.individual_statuses" 
             :key="metric"
             class="metric-indicator"
             :class="'status-' + status">
            <div class="metric-name">{{ formatMetricName(metric) }}</div>
            <div class="metric-status">
                <span v-if="status === 'green'">✓</span>
                <span v-else-if="status === 'yellow'">⚠</span>
                <span v-else>✗</span>
            </div>
        </div>
    </div>
    
    <div v-if="andonStatus.alerts && andonStatus.alerts.length > 0" class="andon-alerts">
        <h4 style="color: #ff6b35;">Active Alerts:</h4>
        <div v-for="alert in andonStatus.alerts" 
             :key="alert.timestamp"
             class="andon-alert"
             :class="alert.severity">
            <div>{{ alert.message }}</div>
            <div class="andon-alert-metric">
                Current: {{ alert.value.toFixed(1) }} | Threshold: {{ alert.threshold.toFixed(1) }}
            </div>
        </div>
    </div>
</div>

<!-- Update the Vue app data and methods -->
<script>
// Add to the data() section
data() {
    return {
        // ... existing data ...
        andonStatus: null,
        andonPollingInterval: null
    }
},

// Add to methods
methods: {
    // ... existing methods ...
    
    async loadAndonStatus() {
        if (!this.selectedWorkflow) return;
        
        try {
            const response = await fetch(`/api/workflows/${this.selectedWorkflow.id}/andon-status`);
            if (response.ok) {
                this.andonStatus = await response.json();
            }
        } catch (error) {
            console.error('Error loading Andon status:', error);
        }
    },
    
    formatMetricName(metric) {
        const names = {
            'defect_rate': 'Defect Rate',
            'first_pass_yield': 'First Pass Yield',
            'cycle_time': 'Cycle Time',
            'oee': 'OEE'
        };
        return names[metric] || metric;
    },
    
    async pullAndonCord() {
        // In production, this would notify supervisors
        const alerts = this.andonStatus.alerts.map(a => a.message).join('\n');
        
        if (confirm(`Pull Andon Cord?\n\nThis will notify supervisors about:\n${alerts}\n\nContinue?`)) {
            // Log the Andon pull event
            try {
                await fetch('/api/andon/pull', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        workflow_id: this.selectedWorkflow.id,
                        status: this.andonStatus.overall_status,
                        alerts: this.andonStatus.alerts
                    })
                });
                
                this.showToast('success', '🔔 Andon cord pulled! Supervisor notified.');
            } catch (error) {
                this.showToast('error', 'Failed to pull Andon cord');
            }
        }
    },
    
    startAndonPolling() {
        // Poll for Andon status every 30 seconds
        this.andonPollingInterval = setInterval(() => {
            this.loadAndonStatus();
        }, 30000);
    },
    
    stopAndonPolling() {
        if (this.andonPollingInterval) {
            clearInterval(this.andonPollingInterval);
            this.andonPollingInterval = null;
        }
    }
},

// Update mounted() to load Andon status
mounted() {
    this.loadWorkflows();
    const urlParams = new URLSearchParams(window.location.search);
    const workflowId = urlParams.get('workflow_id');
    if (workflowId) {
        this.loadWorkflowById(workflowId);
    }
    
    // Start Andon polling
    this.startAndonPolling();
},

// Add beforeUnmount to clean up
beforeUnmount() {
    this.stopAndonPolling();
},

// Update watch to reload Andon when workflow changes
watch: {
    selectedWorkflow() {
        if (this.selectedWorkflow) {
            this.loadStandardWork();
            this.loadTPSMetrics();
            this.loadAndonStatus();  // Add this
        }
    }
}
</script>
```

---

## Priority 3: Bidirectional Editing System (Days 3-5)

### Objective
Enable editing of Standard Work times directly in the TPS Builder, with changes syncing back to the workflow.

### 3.1 Database Changes

**DECISION MADE:** We'll add override columns to the existing `workflow_modules` table to keep it simple.

**File: New migration `alembic/versions/add_time_overrides.py`**

```python
"""Add time override columns to workflow_modules

Revision ID: add_time_overrides_001
Revises: previous_revision
Create Date: 2024-10-30
"""
from alembic import op
import sqlalchemy as sa

def upgrade():
    op.add_column('workflow_modules', 
        sa.Column('manual_time_override', sa.Float(), nullable=True))
    op.add_column('workflow_modules', 
        sa.Column('auto_time_override', sa.Float(), nullable=True))
    op.add_column('workflow_modules', 
        sa.Column('time_override_by', sa.String(255), nullable=True))
    op.add_column('workflow_modules', 
        sa.Column('time_override_at', sa.DateTime(), nullable=True))

def downgrade():
    op.drop_column('workflow_modules', 'manual_time_override')
    op.drop_column('workflow_modules', 'auto_time_override')
    op.drop_column('workflow_modules', 'time_override_by')
    op.drop_column('workflow_modules', 'time_override_at')
```

### 3.2 Backend: Time Override API

**File: `src/api/standard_work_editing.py`** (NEW)

```python
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime
from typing import Optional
from pydantic import BaseModel

router = APIRouter(prefix="/api/standard-work", tags=["standard_work_editing"])

class TimeOverrideRequest(BaseModel):
    module_id: str
    manual_time: Optional[float] = None
    auto_time: Optional[float] = None
    
class TimeOverrideResponse(BaseModel):
    success: bool
    module_id: str
    manual_time: float
    auto_time: float
    is_override: bool
    override_by: Optional[str]
    override_at: Optional[datetime]

@router.put("/steps/{module_id}/time")
async def update_step_time(
    module_id: str,
    request: TimeOverrideRequest,
    db: AsyncSession = Depends(get_db)
):
    """Update time estimates for a workflow step"""
    
    # Get the module
    module = await db.execute(
        select(WorkflowModule).where(WorkflowModule.id == module_id)
    )
    module = module.scalar_one_or_none()
    
    if not module:
        raise HTTPException(404, "Module not found")
    
    # Update override values
    if request.manual_time is not None:
        module.manual_time_override = request.manual_time
    if request.auto_time is not None:
        module.auto_time_override = request.auto_time
    
    # Track who made the change
    module.time_override_by = "current_user"  # In production, get from auth
    module.time_override_at = datetime.utcnow()
    
    await db.commit()
    await db.refresh(module)
    
    # Return updated values
    return TimeOverrideResponse(
        success=True,
        module_id=module.id,
        manual_time=module.manual_time_override or self._get_default_manual_time(module.type),
        auto_time=module.auto_time_override or self._get_default_auto_time(module.type),
        is_override=bool(module.manual_time_override or module.auto_time_override),
        override_by=module.time_override_by,
        override_at=module.time_override_at
    )

@router.delete("/steps/{module_id}/time-override")
async def reset_step_time(
    module_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Reset time overrides to system defaults"""
    
    module = await db.execute(
        select(WorkflowModule).where(WorkflowModule.id == module_id)
    )
    module = module.scalar_one_or_none()
    
    if not module:
        raise HTTPException(404, "Module not found")
    
    # Clear overrides
    module.manual_time_override = None
    module.auto_time_override = None
    module.time_override_by = None
    module.time_override_at = None
    
    await db.commit()
    
    return {
        "success": True,
        "message": "Time overrides reset to system defaults",
        "module_id": module_id
    }

@router.get("/workflows/{workflow_id}/time-overrides")
async def get_workflow_time_overrides(
    workflow_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Get all time overrides for a workflow"""
    
    modules = await db.execute(
        select(WorkflowModule)
        .where(WorkflowModule.workflow_id == workflow_id)
        .where(
            or_(
                WorkflowModule.manual_time_override.isnot(None),
                WorkflowModule.auto_time_override.isnot(None)
            )
        )
    )
    
    overrides = []
    for module in modules.scalars():
        overrides.append({
            "module_id": module.id,
            "module_name": module.name,
            "manual_time_override": module.manual_time_override,
            "auto_time_override": module.auto_time_override,
            "override_by": module.time_override_by,
            "override_at": module.time_override_at.isoformat() if module.time_override_at else None
        })
    
    return {"overrides": overrides, "count": len(overrides)}
```

**File: Update `src/main_workflow_db.py`** (ADD router)

```python
from src.api import standard_work_editing

app.include_router(standard_work_editing.router)
```

### 3.3 Update StandardWorkConverter to Use Overrides

**File: Update `src/converters/standard_work_converter.py`**

```python
# Modify the estimate_manual_time method
def estimate_manual_time(self, module: WorkflowModule) -> int:
    """Estimate manual time for a module, using override if available"""
    
    # Check for override first
    if module.manual_time_override is not None:
        return int(module.manual_time_override)
    
    # Otherwise use defaults
    estimates = {
        "start": 5,
        "end": 2,
        "qc_pass_fail": 20,
        "ab_testing": 15,
        "mcp_ab_testing": 15,
        "mcp_module": 3,
        "image_generation": 3
    }
    return estimates.get(module.type, 3)

def estimate_auto_time(self, module: WorkflowModule) -> int:
    """Estimate auto time for a module, using override if available"""
    
    # Check for override first
    if module.auto_time_override is not None:
        return int(module.auto_time_override)
    
    # Otherwise use defaults
    estimates = {
        "start": 0,
        "end": 0,
        "qc_pass_fail": 0,
        "ab_testing": 5,
        "mcp_ab_testing": 10,
        "mcp_module": 15,
        "image_generation": 18
    }
    return estimates.get(module.type, 0)
```

### 3.4 Frontend: Inline Editing

**File: Update `frontend/tps-builder.html`** (ADD editing functionality)

```html
<!-- Add this CSS for editable cells -->
<style>
.editable-time {
    cursor: pointer;
    padding: 0.25rem;
    border-radius: 4px;
    transition: background 0.2s;
}

.editable-time:hover {
    background: rgba(255, 107, 53, 0.1);
    border: 1px dashed #ff6b35;
}

.editable-time.editing {
    background: rgba(255, 107, 53, 0.2);
}

.time-input {
    width: 60px;
    padding: 0.25rem;
    background: #2a2a2a;
    border: 1px solid #ff6b35;
    color: white;
    border-radius: 4px;
}

.time-override-indicator {
    display: inline-block;
    width: 8px;
    height: 8px;
    background: #ff6b35;
    border-radius: 50%;
    margin-left: 0.25rem;
    title: "Value has been overridden";
}

.reset-button {
    font-size: 0.75rem;
    padding: 0.15rem 0.5rem;
    background: #666;
    border: none;
    border-radius: 3px;
    color: white;
    cursor: pointer;
    margin-left: 0.5rem;
}

.reset-button:hover {
    background: #888;
}
</style>

<!-- Update the table rows in Standard Work table -->
<tr v-for="(step, index) in standardWorkSteps" :key="step.step_number" 
    :class="getStepClass(step)">
    <!-- ... other columns ... -->
    
    <!-- Time column with editing -->
    <td>
        <div class="time-display">
            <!-- Manual Time -->
            <div class="editable-time" 
                 @dblclick="startEditingTime(step, 'manual')"
                 :class="{ editing: editingCell === `${step.module_id}-manual` }">
                <span v-if="editingCell !== `${step.module_id}-manual`">
                    M: {{ step.manual_time }}s
                    <span v-if="step.is_manual_override" class="time-override-indicator" title="Overridden value"></span>
                </span>
                <input v-else 
                       type="number" 
                       v-model.number="editingValue"
                       @keyup.enter="saveTimeEdit(step, 'manual')"
                       @keyup.esc="cancelEdit()"
                       @blur="saveTimeEdit(step, 'manual')"
                       class="time-input"
                       min="0"
                       step="1"
                       autofocus>
            </div>
            
            <!-- Auto Time -->
            <div class="editable-time"
                 @dblclick="startEditingTime(step, 'auto')"
                 :class="{ editing: editingCell === `${step.module_id}-auto` }">
                <span v-if="editingCell !== `${step.module_id}-auto`">
                    A: {{ step.auto_time }}s
                    <span v-if="step.is_auto_override" class="time-override-indicator" title="Overridden value"></span>
                </span>
                <input v-else 
                       type="number" 
                       v-model.number="editingValue"
                       @keyup.enter="saveTimeEdit(step, 'auto')"
                       @keyup.esc="cancelEdit()"
                       @blur="saveTimeEdit(step, 'auto')"
                       class="time-input"
                       min="0"
                       step="1"
                       autofocus>
            </div>
            
            <!-- Total -->
            <div style="font-weight: bold; margin-top: 0.25rem;">
                {{ step.manual_time + step.auto_time }}s
            </div>
            
            <!-- Reset button if overridden -->
            <button v-if="step.is_manual_override || step.is_auto_override"
                    @click="resetTimeOverride(step)"
                    class="reset-button"
                    title="Reset to system defaults">
                Reset
            </button>
        </div>
    </td>
    
    <!-- ... other columns ... -->
</tr>

<!-- Update Vue app with editing methods -->
<script>
// Add to data()
data() {
    return {
        // ... existing data ...
        editingCell: null,
        editingValue: null,
        originalValue: null
    }
},

// Add to methods
methods: {
    // ... existing methods ...
    
    startEditingTime(step, type) {
        const cellId = `${step.module_id}-${type}`;
        this.editingCell = cellId;
        this.editingValue = type === 'manual' ? step.manual_time : step.auto_time;
        this.originalValue = this.editingValue;
    },
    
    async saveTimeEdit(step, type) {
        const newValue = this.editingValue;
        
        // Don't save if unchanged
        if (newValue === this.originalValue) {
            this.cancelEdit();
            return;
        }
        
        // Validate
        if (newValue < 0 || isNaN(newValue)) {
            this.showToast('error', 'Time must be a positive number');
            this.cancelEdit();
            return;
        }
        
        try {
            const response = await fetch(`/api/standard-work/steps/${step.module_id}/time`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    module_id: step.module_id,
                    [type === 'manual' ? 'manual_time' : 'auto_time']: newValue
                })
            });
            
            if (response.ok) {
                const result = await response.json();
                
                // Update local data
                if (type === 'manual') {
                    step.manual_time = result.manual_time;
                    step.is_manual_override = true;
                } else {
                    step.auto_time = result.auto_time;
                    step.is_auto_override = true;
                }
                
                // Recalculate totals
                this.calculateTotalTime();
                this.checkTaktTimeViolation();
                
                this.showToast('success', `Time updated to ${newValue}s`);
            } else {
                this.showToast('error', 'Failed to update time');
            }
        } catch (error) {
            console.error('Error updating time:', error);
            this.showToast('error', 'Error updating time');
        } finally {
            this.cancelEdit();
        }
    },
    
    cancelEdit() {
        this.editingCell = null;
        this.editingValue = null;
        this.originalValue = null;
    },
    
    async resetTimeOverride(step) {
        if (!confirm('Reset times to system defaults?')) return;
        
        try {
            const response = await fetch(`/api/standard-work/steps/${step.module_id}/time-override`, {
                method: 'DELETE'
            });
            
            if (response.ok) {
                // Reload to get fresh data with system defaults
                await this.loadStandardWork();
                this.showToast('success', 'Times reset to system defaults');
            }
        } catch (error) {
            console.error('Error resetting time:', error);
            this.showToast('error', 'Failed to reset times');
        }
    },
    
    calculateTotalTime() {
        this.totalCycleTime = this.standardWorkSteps.reduce((total, step) => {
            return total + step.manual_time + step.auto_time;
        }, 0);
    },
    
    checkTaktTimeViolation() {
        if (this.totalCycleTime > this.taktTime) {
            this.showToast('warning', `⚠️ Cycle time (${this.totalCycleTime}s) exceeds Takt time (${this.taktTime}s)!`);
        }
    }
}
</script>
```

---

## Priority 4: A/B Testing Integration (Days 6-7)

### Objective
Display A/B test results directly in the Standard Work view, showing winner selection and cost savings.

### 4.1 Backend: A/B Test Results API

**File: `src/api/ab_testing_results.py`** (NEW)

```python
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Dict, List, Optional
from datetime import datetime, timedelta

router = APIRouter(prefix="/api/ab-testing", tags=["ab_testing"])

@router.get("/workflows/{workflow_id}/results")
async def get_ab_test_results(
    workflow_id: str,
    module_id: Optional[str] = None,
    days: int = 30,
    db: AsyncSession = Depends(get_db)
):
    """Get A/B test results for a workflow"""
    
    # Query execution data for A/B test modules
    query = """
        SELECT 
            em.module_id,
            em.module_type,
            em.test_variant,
            em.mcp_server,
            COUNT(*) as execution_count,
            AVG(em.execution_time) as avg_time,
            AVG(em.cost) as avg_cost,
            SUM(CASE WHEN em.passed_qc THEN 1 ELSE 0 END) * 100.0 / COUNT(*) as pass_rate,
            MIN(em.created_at) as first_test,
            MAX(em.created_at) as last_test
        FROM execution_modules em
        JOIN workflow_executions we ON em.execution_id = we.id
        WHERE we.workflow_id = :workflow_id
            AND em.module_type IN ('ab_testing', 'mcp_ab_testing')
            AND em.created_at >= :start_date
    """
    
    if module_id:
        query += " AND em.module_id = :module_id"
    
    query += " GROUP BY em.module_id, em.module_type, em.test_variant, em.mcp_server"
    
    params = {
        "workflow_id": workflow_id,
        "start_date": datetime.utcnow() - timedelta(days=days)
    }
    if module_id:
        params["module_id"] = module_id
    
    result = await db.execute(text(query), params)
    rows = result.fetchall()
    
    # Process results by module
    results_by_module = {}
    for row in rows:
        if row.module_id not in results_by_module:
            results_by_module[row.module_id] = {
                "module_id": row.module_id,
                "module_type": row.module_type,
                "variants": [],
                "test_period": {
                    "start": row.first_test.isoformat() if row.first_test else None,
                    "end": row.last_test.isoformat() if row.last_test else None
                },
                "total_tests": 0
            }
        
        variant_data = {
            "variant": row.test_variant or row.mcp_server,
            "mcp_server": row.mcp_server,
            "executions": row.execution_count,
            "avg_time": round(row.avg_time, 2) if row.avg_time else 0,
            "avg_cost": round(row.avg_cost, 4) if row.avg_cost else 0,
            "pass_rate": round(row.pass_rate, 1) if row.pass_rate else 0
        }
        
        results_by_module[row.module_id]["variants"].append(variant_data)
        results_by_module[row.module_id]["total_tests"] += row.execution_count
    
    # Calculate winners and savings
    for module_id, data in results_by_module.items():
        if len(data["variants"]) >= 2:
            # Sort by pass rate first, then cost
            sorted_variants = sorted(
                data["variants"], 
                key=lambda x: (x["pass_rate"], -x["avg_cost"]), 
                reverse=True
            )
            
            winner = sorted_variants[0]
            baseline = sorted_variants[-1]
            
            data["winner"] = {
                "variant": winner["variant"],
                "reason": "highest_quality" if winner["pass_rate"] > baseline["pass_rate"] else "lowest_cost",
                "improvement": {
                    "quality": winner["pass_rate"] - baseline["pass_rate"],
                    "cost_savings": (baseline["avg_cost"] - winner["avg_cost"]) / baseline["avg_cost"] * 100 if baseline["avg_cost"] > 0 else 0,
                    "time_reduction": (baseline["avg_time"] - winner["avg_time"]) / baseline["avg_time"] * 100 if baseline["avg_time"] > 0 else 0
                }
            }
            
            # Calculate statistical significance (simplified)
            if data["total_tests"] >= 100:
                data["statistical_significance"] = "high"
            elif data["total_tests"] >= 50:
                data["statistical_significance"] = "medium"
            else:
                data["statistical_significance"] = "low"
    
    return {
        "workflow_id": workflow_id,
        "period_days": days,
        "modules": list(results_by_module.values()),
        "summary": {
            "total_ab_modules": len(results_by_module),
            "total_tests_run": sum(m["total_tests"] for m in results_by_module.values()),
            "modules_with_winners": len([m for m in results_by_module.values() if "winner" in m])
        }
    }

@router.post("/workflows/{workflow_id}/apply-winners")
async def apply_ab_test_winners(
    workflow_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Apply A/B test winners to workflow configuration"""
    
    # Get current A/B test results
    results = await get_ab_test_results(workflow_id, days=30, db=db)
    
    applied_changes = []
    for module_data in results["modules"]:
        if "winner" in module_data:
            # Update module configuration to use winning variant
            module = await db.execute(
                select(WorkflowModule).where(WorkflowModule.id == module_data["module_id"])
            )
            module = module.scalar_one_or_none()
            
            if module and module.config:
                old_config = module.config.copy()
                module.config["selected_variant"] = module_data["winner"]["variant"]
                module.config["ab_test_complete"] = True
                module.config["test_results"] = module_data["winner"]
                
                await db.commit()
                
                applied_changes.append({
                    "module_id": module.id,
                    "module_name": module.name,
                    "winning_variant": module_data["winner"]["variant"],
                    "improvement": module_data["winner"]["improvement"]
                })
    
    return {
        "success": True,
        "changes_applied": len(applied_changes),
        "changes": applied_changes
    }
```

**File: Update `src/main_workflow_db.py`** (ADD router)

```python
from src.api import ab_testing_results

app.include_router(ab_testing_results.router)
```

### 4.2 Frontend: A/B Test Results Display

**File: Update `frontend/tps-builder.html`** (ADD A/B results)

```html
<!-- Add CSS for A/B test results -->
<style>
.ab-test-badge {
    display: inline-block;
    padding: 0.25rem 0.5rem;
    background: linear-gradient(135deg, #ff6b35, #ff8855);
    color: white;
    border-radius: 4px;
    font-size: 0.75rem;
    font-weight: bold;
    margin-left: 0.5rem;
}

.ab-test-results {
    background: rgba(255, 107, 53, 0.1);
    border: 1px solid #ff6b35;
    border-radius: 4px;
    padding: 0.5rem;
    margin-top: 0.5rem;
    font-size: 0.85rem;
}

.ab-winner {
    color: #00ff00;
    font-weight: bold;
}

.ab-savings {
    color: #ffaa00;
}

.ab-variants {
    display: flex;
    gap: 1rem;
    margin-top: 0.5rem;
}

.ab-variant {
    flex: 1;
    padding: 0.5rem;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 4px;
}

.ab-variant.winner {
    border: 2px solid #00ff00;
}

.expand-results {
    cursor: pointer;
    color: #ff6b35;
    text-decoration: underline;
}
</style>

<!-- Update table to show A/B test results -->
<tr v-for="(step, index) in standardWorkSteps" :key="step.step_number">
    <!-- ... existing columns ... -->
    
    <!-- Tool/MCP column with A/B results -->
    <td>
        <div>
            {{ step.tool_mcp || 'System' }}
            
            <!-- A/B Test Badge -->
            <span v-if="step.module_type === 'ab_testing' || step.module_type === 'mcp_ab_testing'" 
                  class="ab-test-badge">
                A/B Test
            </span>
        </div>
        
        <!-- A/B Test Results (if available) -->
        <div v-if="abTestResults[step.module_id]" class="ab-test-results">
            <div>
                <span class="ab-winner">Winner: {{ abTestResults[step.module_id].winner.variant }}</span>
                <span class="ab-savings"> ({{ abTestResults[step.module_id].winner.improvement.cost_savings.toFixed(1) }}% cost savings)</span>
            </div>
            
            <!-- Expandable detailed results -->
            <div v-if="expandedAbResults[step.module_id]" class="ab-variants">
                <div v-for="variant in abTestResults[step.module_id].variants" 
                     :key="variant.variant"
                     class="ab-variant"
                     :class="{ winner: variant.variant === abTestResults[step.module_id].winner.variant }">
                    <div><strong>{{ variant.variant }}</strong></div>
                    <div>Tests: {{ variant.executions }}</div>
                    <div>Pass Rate: {{ variant.pass_rate }}%</div>
                    <div>Avg Cost: ${{ variant.avg_cost }}</div>
                    <div>Avg Time: {{ variant.avg_time }}s</div>
                </div>
            </div>
            
            <a @click="toggleAbResults(step.module_id)" class="expand-results">
                {{ expandedAbResults[step.module_id] ? 'Hide' : 'Show' }} details
            </a>
        </div>
    </td>
    
    <!-- ... other columns ... -->
</tr>

<!-- Add apply winners button -->
<div class="action-buttons" style="margin-top: 1rem;">
    <button v-if="hasAbTestWinners" 
            @click="applyAbTestWinners()" 
            class="btn btn-success"
            style="background: #00cc00;">
        ✓ Apply A/B Test Winners
    </button>
</div>

<!-- Update Vue app -->
<script>
// Add to data()
data() {
    return {
        // ... existing data ...
        abTestResults: {},
        expandedAbResults: {},
        hasAbTestWinners: false
    }
},

// Add to methods
methods: {
    // ... existing methods ...
    
    async loadAbTestResults() {
        if (!this.selectedWorkflow) return;
        
        try {
            const response = await fetch(`/api/ab-testing/workflows/${this.selectedWorkflow.id}/results?days=30`);
            if (response.ok) {
                const data = await response.json();
                
                // Map results by module ID
                this.abTestResults = {};
                this.hasAbTestWinners = false;
                
                for (const module of data.modules) {
                    if (module.winner) {
                        this.abTestResults[module.module_id] = module;
                        this.hasAbTestWinners = true;
                    }
                }
            }
        } catch (error) {
            console.error('Error loading A/B test results:', error);
        }
    },
    
    toggleAbResults(moduleId) {
        this.$set(this.expandedAbResults, moduleId, !this.expandedAbResults[moduleId]);
    },
    
    async applyAbTestWinners() {
        if (!confirm('Apply all A/B test winners to the workflow?')) return;
        
        try {
            const response = await fetch(`/api/ab-testing/workflows/${this.selectedWorkflow.id}/apply-winners`, {
                method: 'POST'
            });
            
            if (response.ok) {
                const result = await response.json();
                this.showToast('success', `Applied ${result.changes_applied} A/B test winners!`);
                
                // Reload to show updated configuration
                await this.loadStandardWork();
                await this.loadAbTestResults();
            }
        } catch (error) {
            console.error('Error applying winners:', error);
            this.showToast('error', 'Failed to apply A/B test winners');
        }
    }
},

// Update watch to load A/B results
watch: {
    selectedWorkflow() {
        if (this.selectedWorkflow) {
            this.loadStandardWork();
            this.loadTPSMetrics();
            this.loadAndonStatus();
            this.loadAbTestResults();  // Add this
        }
    }
}
</script>
```

---

## Deployment Instructions

### Step 1: Database Migration
```bash
# Run the migration to add time override columns
alembic upgrade head
```

### Step 2: Install Dependencies
```bash
# Already installed from Priority 1, but verify:
pip install reportlab==4.0.7 xlsxwriter==3.1.9 pandas==2.1.3
```

### Step 3: Add New Files
1. Create `src/tps/andon_calculator.py`
2. Create `src/api/standard_work_editing.py`
3. Create `src/api/ab_testing_results.py`

### Step 4: Update Existing Files
1. Update `src/main_workflow_db.py` - Add new routers
2. Update `src/converters/standard_work_converter.py` - Use time overrides
3. Update `frontend/tps-builder.html` - Add all new UI features

### Step 5: Deploy
```bash
# Commit and push
git add -A
git commit -m "Sprint 6.2: Add Andon alerts, editing, and A/B test integration"
git push origin main

# Deploy to Fly.io
flyctl deploy
```

### Step 6: Verify
1. Visit https://ai-workflow-spc.fly.dev/tps-builder.html
2. Select a workflow
3. Check Andon board appears with status lights
4. Double-click times to edit
5. View A/B test results if available

---

## Testing Checklist

### Andon System
- [ ] Green status when all metrics good
- [ ] Yellow warnings at thresholds
- [ ] Red alerts for critical issues
- [ ] Pull Andon cord button works
- [ ] Real-time updates every 30 seconds

### Time Editing
- [ ] Double-click opens edit mode
- [ ] Enter key saves changes
- [ ] Escape key cancels edit
- [ ] Reset button clears overrides
- [ ] Total time recalculates
- [ ] Takt time warnings appear

### A/B Testing
- [ ] Results display for A/B modules
- [ ] Winner badge shows correctly
- [ ] Cost savings calculate properly
- [ ] Expand/collapse details works
- [ ] Apply winners updates config

---

## Next Sprint Priorities

After completing Sprint 6.2, consider:

1. **SPC Charts** - Control charts for quality metrics
2. **Cost Tracking Dashboard** - Real-time cost monitoring
3. **MCP Health Monitor** - Server status dashboard
4. **Workflow Templates** - Pre-built workflows for common use cases
5. **Mobile Responsive** - Optimize for tablet/mobile viewing

---

## Success Metrics

Track these KPIs after deployment:

1. **Andon Utilization**
   - How often are alerts triggered?
   - Do users pull the Andon cord?
   - Does quality improve after alerts?

2. **Time Optimization**
   - How often are times edited?
   - Average reduction in cycle time
   - Takt time violation frequency

3. **A/B Test Adoption**
   - Percentage of workflows with A/B tests
   - Average cost savings from winners
   - Time to apply winning variants

---

This completes Sprint 6.2 implementation guide. The team now has everything needed to add visual Andon alerts, bidirectional editing, and A/B test integration to the platform!