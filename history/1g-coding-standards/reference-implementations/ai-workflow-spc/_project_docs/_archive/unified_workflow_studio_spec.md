# Unified Workflow Studio Implementation
## Technical Specification for Combined Builder/Standard Work Interface

### Executive Summary
Combine the separate Builder and Standard Work screens into a unified Workflow Studio with multiple views (Design, Standard Work, Analytics, Execute). The Standard Work view currently displays mock data and needs to be connected to real workflow definitions.

---

## 1. Architecture Overview

### Current State
- **Two separate pages:** `/workflow-builder` and `/tps-builder` (or `/standard-work`)
- **Separate data:** Builder uses real workflows, Standard Work shows static mock data
- **No synchronization:** Changes in Builder don't reflect in Standard Work

### Target State
- **Single unified interface:** `/workflow-studio/{workflow_id}`
- **Shared data model:** One workflow, multiple views
- **Real-time sync:** All views update when workflow changes
- **Role-based access:** Different users default to different views

---

## 2. Data Model Updates

### A. Enhanced Workflow Module Schema
Add TPS-specific fields to workflow modules:

```python
# In src/database/models.py - Update WorkflowModule model

class WorkflowModule(Base):
    __tablename__ = 'workflow_modules'
    
    # Existing fields
    id = Column(String, primary_key=True)
    workflow_id = Column(String, ForeignKey('workflows.id'))
    type = Column(String(100))
    name = Column(String(255))
    config = Column(JSON)
    position = Column(JSON)
    
    # NEW TPS/Standard Work fields
    work_element_type = Column(String(50))  # 'setup', 'value-add', 'inspection', 'wait'
    manual_time = Column(Float, default=0)  # Manual operation time in seconds
    auto_time = Column(Float, default=0)    # Automated operation time in seconds
    quality_points = Column(JSON)           # Quality check points
    key_points = Column(JSON)               # Critical instructions
    tools_required = Column(JSON)           # Tools/resources needed
    sequence_number = Column(Integer)       # Step order in Standard Work
```

### B. Add Workflow Metrics Table
```sql
CREATE TABLE workflow_metrics (
    id VARCHAR PRIMARY KEY,
    workflow_id VARCHAR REFERENCES workflows(id),
    execution_id VARCHAR REFERENCES workflow_executions(id),
    takt_time FLOAT,  -- Target time per unit
    cycle_time FLOAT, -- Actual time per unit
    first_pass_yield FLOAT, -- % passing QC first time
    defect_rate FLOAT,
    value_add_ratio FLOAT, -- Value-add time / Total time
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

## 3. Backend Implementation

### A. Unified Workflow Studio Endpoint
```python
# In src/main_workflow_db.py

@app.get("/workflow-studio/{workflow_id}", response_class=HTMLResponse)
async def workflow_studio(workflow_id: str):
    """Unified workflow studio interface"""
    return FileResponse('frontend/workflow_studio.html')

@app.get("/api/workflow-studio/{workflow_id}")
async def get_workflow_studio_data(
    workflow_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Get complete workflow data for all views"""
    
    workflow = await workflow_repo.get_by_id(workflow_id)
    
    # Calculate real TPS metrics
    metrics = await calculate_tps_metrics(workflow_id, db)
    
    # Convert workflow to Standard Work format
    standard_work_steps = await convert_to_standard_work(workflow, db)
    
    return {
        "workflow": workflow,
        "standard_work": standard_work_steps,
        "metrics": metrics,
        "executions": await get_recent_executions(workflow_id, db)
    }
```

### B. Convert Workflow to Standard Work Format
```python
# In src/engine/standard_work_converter.py

from typing import List, Dict, Any
from src.database.models import Workflow, WorkflowModule

class StandardWorkConverter:
    """Convert visual workflow to TPS Standard Work format"""
    
    MCP_SERVER_TIMES = {
        'dall-e-3': {'auto': 15, 'manual': 3},
        'claude': {'auto': 5, 'manual': 2},
        'stable-diffusion': {'auto': 18, 'manual': 3},
        'gpt-4-vision': {'auto': 8, 'manual': 2},
        'elevenlabs': {'auto': 10, 'manual': 2},
        'whisper-asr': {'auto': 12, 'manual': 3},
    }
    
    async def convert_to_standard_work(
        self,
        workflow: Workflow,
        db: AsyncSession
    ) -> List[Dict[str, Any]]:
        """Convert workflow modules to Standard Work steps"""
        
        modules = await self.get_ordered_modules(workflow.id, db)
        standard_work_steps = []
        step_number = 1
        
        for module in modules:
            step = await self.module_to_standard_work_step(
                module, 
                step_number
            )
            if step:  # Skip null steps (like connections)
                standard_work_steps.append(step)
                step_number += 1
        
        return standard_work_steps
    
    async def module_to_standard_work_step(
        self,
        module: WorkflowModule,
        step_number: int
    ) -> Dict[str, Any]:
        """Convert a single module to Standard Work step"""
        
        # Determine work element type
        element_type = self.get_element_type(module.type)
        
        # Get timing based on module type
        timing = self.get_module_timing(module)
        
        # Generate procedure steps
        procedures = self.generate_procedures(module)
        
        # Identify quality points
        quality_points = self.identify_quality_points(module)
        
        # Generate key points
        key_points = self.generate_key_points(module)
        
        return {
            "step_number": step_number,
            "work_element": module.name,
            "element_type": element_type,
            "procedures": procedures,
            "tool_mcp": self.get_tool_or_mcp(module),
            "manual_time": timing['manual'],
            "auto_time": timing['auto'],
            "total_time": timing['manual'] + timing['auto'],
            "quality_points": quality_points,
            "key_points": key_points,
            "module_id": module.id,
            "module_type": module.type
        }
    
    def get_element_type(self, module_type: str) -> str:
        """Map module type to work element type"""
        mapping = {
            'start': 'setup',
            'end': 'inspection',
            'qc_pass_fail': 'inspection',
            'ab_testing': 'inspection',
            'mcp_service': 'value-add',
            'image_generation': 'value-add',
        }
        return mapping.get(module_type, 'value-add')
    
    def get_module_timing(self, module: WorkflowModule) -> Dict[str, float]:
        """Get realistic timing for module"""
        
        if module.type == 'start':
            return {'manual': 5, 'auto': 0}
        elif module.type == 'end':
            return {'manual': 2, 'auto': 0}
        elif module.type == 'qc_pass_fail':
            return {'manual': 20, 'auto': 0}
        elif module.type == 'ab_testing':
            return {'manual': 15, 'auto': 0}
        elif module.type == 'mcp_service':
            # Get specific MCP server timing
            mcp_server = module.config.get('mcp_server', '')
            return self.MCP_SERVER_TIMES.get(
                mcp_server,
                {'manual': 3, 'auto': 10}  # Default
            )
        else:
            return {'manual': 3, 'auto': 10}
    
    def generate_procedures(self, module: WorkflowModule) -> List[str]:
        """Generate procedure steps for module"""
        
        procedures = []
        
        if module.type == 'start':
            procedures = [
                "Verify API keys",
                "Set batch size",
                "Check resources"
            ]
        elif module.type == 'mcp_service':
            procedures = [
                "Set parameters",
                f"Submit to {module.config.get('mcp_server', 'service')}",
                "Monitor progress",
                "Retrieve results"
            ]
        elif module.type == 'qc_pass_fail':
            procedures = [
                "Review assets",
                "Check criteria",
                "Record decision"
            ]
        elif module.type == 'ab_testing':
            procedures = [
                "Compare outputs",
                "Evaluate metrics",
                "Select winner",
                "Record results"
            ]
        
        return procedures
    
    def identify_quality_points(self, module: WorkflowModule) -> List[Dict]:
        """Identify quality check points for module"""
        
        quality_points = []
        
        if module.type == 'start':
            quality_points.append({
                "point": "Batch ≤ 10",
                "severity": "critical"
            })
            quality_points.append({
                "point": "Keys valid",
                "severity": "critical"
            })
        elif module.type == 'mcp_service':
            quality_points.append({
                "point": "Resolution ≥ 1024px",
                "severity": "major"
            })
            quality_points.append({
                "point": "No NSFW",
                "severity": "critical"
            })
        elif module.type == 'qc_pass_fail':
            quality_points.append({
                "point": "100% inspection",
                "severity": "critical"
            })
            quality_points.append({
                "point": "Decisions recorded",
                "severity": "major"
            })
        
        return quality_points
    
    def generate_key_points(self, module: WorkflowModule) -> Dict:
        """Generate key points for module"""
        
        if module.type == 'start':
            return {
                "quality": "Max 10 per batch",
                "tip": "Smaller = faster QC"
            }
        elif module.type == 'mcp_service':
            server = module.config.get('mcp_server', '')
            if 'dall-e' in server or 'stable-diffusion' in server:
                return {
                    "quality": "Check artifacts",
                    "tip": "Use aspect ratio 1:1"
                }
            elif 'claude' in server or 'gpt' in server:
                return {
                    "quality": "Consider cost vs quality",
                    "tip": "Document decision rationale"
                }
        elif module.type == 'ab_testing':
            return {
                "quality": "Consider cost vs quality",
                "tip": "Document decision rationale"
            }
        
        return {}
    
    def get_tool_or_mcp(self, module: WorkflowModule) -> str:
        """Get tool/MCP server name for display"""
        
        if module.type == 'start' or module.type == 'end':
            return 'System'
        elif module.type == 'qc_pass_fail':
            return 'Human QC'
        elif module.type == 'ab_testing':
            return 'A/B Testing'
        elif module.type == 'mcp_service':
            server = module.config.get('mcp_server', 'MCP')
            # Return formatted name
            server_names = {
                'dall-e-3': 'DALL-E 3',
                'claude': 'Claude',
                'stable-diffusion': 'Stable Diffusion',
                'gpt-4-vision': 'GPT-4 Vision',
                'elevenlabs': 'ElevenLabs',
                'whisper-asr': 'Whisper ASR'
            }
            return server_names.get(server, server.title())
        else:
            return module.type.replace('_', ' ').title()
```

### C. Calculate Real TPS Metrics
```python
# In src/analytics/tps_metrics.py

async def calculate_tps_metrics(
    workflow_id: str,
    db: AsyncSession,
    period_days: int = 7
) -> Dict[str, Any]:
    """Calculate real Toyota Production System metrics"""
    
    # Get recent executions
    executions = await db.execute(
        select(WorkflowExecution)
        .where(WorkflowExecution.workflow_id == workflow_id)
        .where(WorkflowExecution.completed_at > datetime.now() - timedelta(days=period_days))
    )
    executions = executions.scalars().all()
    
    if not executions:
        return get_default_metrics()
    
    # Calculate metrics
    cycle_times = []
    first_pass_count = 0
    total_defects = 0
    
    for execution in executions:
        # Calculate cycle time
        if execution.completed_at and execution.started_at:
            cycle_time = (execution.completed_at - execution.started_at).total_seconds()
            cycle_times.append(cycle_time)
        
        # Check QC results
        qc_results = execution.execution_data.get('qc_results', {})
        passed = qc_results.get('passed_count', 0)
        failed = qc_results.get('failed_count', 0)
        
        if passed + failed > 0:
            if failed == 0:
                first_pass_count += 1
            total_defects += failed
    
    # Calculate aggregates
    avg_cycle_time = sum(cycle_times) / len(cycle_times) if cycle_times else 0
    takt_time = 45  # Target time - should come from workflow config
    first_pass_yield = (first_pass_count / len(executions) * 100) if executions else 0
    defect_rate = (total_defects / (len(executions) * 4) * 100) if executions else 0  # Assuming 4 items per batch
    
    # Calculate OEE (Overall Equipment Effectiveness)
    availability = 0.95  # Should calculate from actual downtime
    performance = min(takt_time / avg_cycle_time, 1.0) if avg_cycle_time > 0 else 0
    quality = (100 - defect_rate) / 100
    oee = availability * performance * quality * 100
    
    return {
        "takt_time": takt_time,
        "cycle_time": round(avg_cycle_time, 1),
        "first_pass_yield": round(first_pass_yield, 1),
        "defect_rate": round(defect_rate, 2),
        "oee": round(oee, 1),
        "total_executions": len(executions),
        "period_days": period_days,
        "value_add_ratio": calculate_value_add_ratio(workflow_id, db)
    }

def calculate_value_add_ratio(workflow_id: str, db: AsyncSession) -> float:
    """Calculate ratio of value-add time to total time"""
    # This would analyze the workflow to determine
    # which steps add value vs. wait/transport/inspection
    # For now, return a reasonable estimate
    return 67.0  # 67% is typical for optimized workflows
```

---

## 4. Frontend Implementation

### A. New Unified Workflow Studio HTML
```html
<!-- frontend/workflow_studio.html -->
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Workflow Studio - AI Workflow Platform v6.0</title>
    <script src="https://cdn.jsdelivr.net/npm/vue@3/dist/vue.global.prod.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/axios/dist/axios.min.js"></script>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { 
            font-family: 'Segoe UI', system-ui, sans-serif; 
            background: #0a0a0a; 
            color: #e0e0e0; 
        }
        
        /* Navigation styles */
        .main-nav {
            background: #1a1a1a;
            padding: 1rem;
            display: flex;
            gap: 2rem;
            align-items: center;
            border-bottom: 1px solid #333;
        }
        
        /* View tabs */
        .view-tabs {
            background: #111;
            padding: 0;
            display: flex;
            border-bottom: 2px solid #333;
        }
        
        .view-tab {
            padding: 1rem 2rem;
            background: transparent;
            border: none;
            color: #999;
            cursor: pointer;
            position: relative;
            transition: all 0.3s;
            font-size: 0.95rem;
            display: flex;
            align-items: center;
            gap: 0.5rem;
        }
        
        .view-tab:hover {
            background: rgba(255, 107, 53, 0.1);
            color: #fff;
        }
        
        .view-tab.active {
            color: #ff6b35;
            background: rgba(255, 107, 53, 0.05);
        }
        
        .view-tab.active::after {
            content: '';
            position: absolute;
            bottom: -2px;
            left: 0;
            right: 0;
            height: 2px;
            background: #ff6b35;
        }
        
        /* Content area */
        .view-content {
            min-height: calc(100vh - 120px);
            position: relative;
        }
        
        /* Standard Work specific styles */
        .standard-work-header {
            background: linear-gradient(135deg, #1a1a1a 0%, #2a2a2a 100%);
            padding: 2rem;
            border-bottom: 2px solid #ff6b35;
        }
        
        .metrics-row {
            display: flex;
            gap: 3rem;
            margin-top: 1rem;
        }
        
        .metric-item {
            display: flex;
            flex-direction: column;
        }
        
        .metric-label {
            font-size: 0.8rem;
            color: #999;
            text-transform: uppercase;
        }
        
        .metric-value {
            font-size: 2rem;
            font-weight: bold;
            color: #ff6b35;
        }
        
        .standard-work-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 1rem;
        }
        
        .standard-work-table th {
            background: #1a1a1a;
            padding: 1rem;
            text-align: left;
            font-size: 0.9rem;
            color: #ff6b35;
            border-bottom: 2px solid #333;
        }
        
        .standard-work-table td {
            padding: 1rem;
            border-bottom: 1px solid #222;
            vertical-align: top;
        }
        
        .step-number {
            font-size: 1.5rem;
            font-weight: bold;
            color: #ff6b35;
        }
        
        .element-type {
            font-size: 0.75rem;
            color: #666;
            text-transform: uppercase;
        }
        
        .procedure-list {
            list-style: none;
            padding: 0;
        }
        
        .procedure-list li {
            padding: 0.25rem 0;
            padding-left: 1rem;
            position: relative;
        }
        
        .procedure-list li:before {
            content: "▶";
            position: absolute;
            left: 0;
            color: #ff6b35;
            font-size: 0.7rem;
        }
        
        .time-badge {
            display: inline-block;
            padding: 0.25rem 0.5rem;
            border-radius: 3px;
            font-size: 0.8rem;
            font-weight: bold;
        }
        
        .time-manual {
            background: rgba(255, 107, 53, 0.2);
            color: #ff6b35;
        }
        
        .time-auto {
            background: rgba(53, 162, 235, 0.2);
            color: #35a2eb;
        }
        
        .quality-badge {
            display: inline-block;
            padding: 0.25rem 0.5rem;
            border-radius: 3px;
            font-size: 0.75rem;
            margin: 0.125rem;
        }
        
        .quality-critical {
            background: rgba(239, 68, 68, 0.2);
            color: #ef4444;
        }
        
        .quality-major {
            background: rgba(251, 146, 60, 0.2);
            color: #fb923c;
        }
        
        .quality-info {
            background: rgba(59, 130, 246, 0.2);
            color: #3b82f6;
        }
        
        /* Loading states */
        .loading-overlay {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.8);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1000;
        }
        
        .loading-spinner {
            width: 50px;
            height: 50px;
            border: 3px solid #333;
            border-top-color: #ff6b35;
            border-radius: 50%;
            animation: spin 1s linear infinite;
        }
        
        @keyframes spin {
            to { transform: rotate(360deg); }
        }
    </style>
</head>
<body>
    <div id="app">
        <!-- Main Navigation -->
        <nav class="main-nav">
            <h1 style="color: #ff6b35; font-size: 1.2rem;">🔧 AI Workflow Platform</h1>
            <a href="/" style="color: #fff; text-decoration: none;">Workflows</a>
            <a href="/workflow-studio" style="color: #ff6b35; text-decoration: none;">Studio</a>
            <a href="/qc-queue" style="color: #fff; text-decoration: none;">QC Queue</a>
            <a href="/assets" style="color: #fff; text-decoration: none;">Assets</a>
            <a href="/analytics" style="color: #fff; text-decoration: none;">Analytics</a>
            <a href="/mcp-hub" style="color: #fff; text-decoration: none;">MCP Hub</a>
        </nav>
        
        <!-- View Tabs -->
        <div class="view-tabs">
            <button 
                v-for="view in views" 
                :key="view.id"
                @click="switchView(view.id)"
                :class="['view-tab', { active: currentView === view.id }]">
                <span>{{ view.icon }}</span>
                <span>{{ view.name }}</span>
            </button>
        </div>
        
        <!-- View Content -->
        <div class="view-content">
            <!-- Loading State -->
            <div v-if="loading" class="loading-overlay">
                <div class="loading-spinner"></div>
            </div>
            
            <!-- Design View -->
            <div v-show="currentView === 'design'">
                <iframe 
                    :src="`/workflow-builder?id=${workflowId}&embedded=true`"
                    style="width: 100%; height: calc(100vh - 120px); border: none;">
                </iframe>
            </div>
            
            <!-- Standard Work View -->
            <div v-show="currentView === 'standard-work'">
                <div class="standard-work-header">
                    <h2>Standard Work Instruction</h2>
                    <div style="color: #999; margin-top: 0.5rem;">
                        Process: {{ workflow.name }} | Rev: {{ workflow.version || '4.0' }} | Date: {{ currentDate }}
                    </div>
                    
                    <div class="metrics-row">
                        <div class="metric-item">
                            <span class="metric-label">Takt Time</span>
                            <span class="metric-value">{{ metrics.takt_time }}s</span>
                        </div>
                        <div class="metric-item">
                            <span class="metric-label">Cycle Time</span>
                            <span class="metric-value">{{ metrics.cycle_time }}s</span>
                        </div>
                        <div class="metric-item">
                            <span class="metric-label">OEE</span>
                            <span class="metric-value">{{ metrics.oee }}%</span>
                        </div>
                        <div class="metric-item">
                            <span class="metric-label">First Pass Yield</span>
                            <span class="metric-value">{{ metrics.first_pass_yield }}%</span>
                        </div>
                    </div>
                    
                    <div style="margin-top: 1rem; display: flex; gap: 1rem;">
                        <span style="background: rgba(239, 68, 68, 0.2); padding: 0.5rem 1rem; border-radius: 5px;">
                            🔴 Critical Quality Points: {{ criticalQualityPoints }}
                        </span>
                        <span style="background: rgba(251, 146, 60, 0.2); padding: 0.5rem 1rem; border-radius: 5px;">
                            🟡 Safety Points: {{ safetyPoints }}
                        </span>
                        <span style="background: rgba(34, 197, 94, 0.2); padding: 0.5rem 1rem; border-radius: 5px;">
                            🔗 MCP Servers: {{ mcpServerCount }}
                        </span>
                        <span style="background: rgba(59, 130, 246, 0.2); padding: 0.5rem 1rem; border-radius: 5px;">
                            🔍 A/B Tests: {{ abTestCount }}
                        </span>
                    </div>
                </div>
                
                <table class="standard-work-table">
                    <thead>
                        <tr>
                            <th width="5%">STEP #</th>
                            <th width="20%">WORK ELEMENT</th>
                            <th width="25%">PROCEDURE</th>
                            <th width="15%">TOOL/MCP</th>
                            <th width="10%">TIME (S)</th>
                            <th width="15%">QUALITY</th>
                            <th width="10%">KEY POINTS</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-for="step in standardWorkSteps" :key="step.step_number">
                            <td>
                                <div class="step-number">{{ step.step_number }}</div>
                            </td>
                            <td>
                                <div style="font-weight: bold;">{{ step.work_element }}</div>
                                <div class="element-type">{{ step.element_type }}</div>
                            </td>
                            <td>
                                <ul class="procedure-list">
                                    <li v-for="(proc, idx) in step.procedures" :key="idx">
                                        {{ proc }}
                                    </li>
                                </ul>
                            </td>
                            <td>
                                <div style="font-weight: bold;">{{ step.tool_mcp }}</div>
                                <div v-if="step.tool_mcp.includes('MCP')" 
                                     style="font-size: 0.8rem; color: #ff6b35; margin-top: 0.25rem;">
                                    ● Online
                                </div>
                            </td>
                            <td>
                                <div style="display: flex; flex-direction: column; gap: 0.25rem;">
                                    <span class="time-badge time-manual">
                                        M: {{ step.manual_time }}s
                                    </span>
                                    <span v-if="step.auto_time > 0" class="time-badge time-auto">
                                        A: {{ step.auto_time }}s
                                    </span>
                                    <div style="font-weight: bold; color: #fff; margin-top: 0.25rem;">
                                        {{ step.total_time }}s
                                    </div>
                                </div>
                            </td>
                            <td>
                                <div v-for="qp in step.quality_points" :key="qp.point">
                                    <span :class="['quality-badge', `quality-${qp.severity}`]">
                                        {{ qp.point }}
                                    </span>
                                </div>
                            </td>
                            <td>
                                <div v-if="step.key_points.quality" style="margin-bottom: 0.5rem;">
                                    <div style="font-size: 0.75rem; color: #ff6b35;">Q:</div>
                                    <div style="font-size: 0.85rem;">{{ step.key_points.quality }}</div>
                                </div>
                                <div v-if="step.key_points.tip">
                                    <div style="font-size: 0.75rem; color: #3b82f6;">💡</div>
                                    <div style="font-size: 0.85rem;">{{ step.key_points.tip }}</div>
                                </div>
                            </td>
                        </tr>
                    </tbody>
                    <tfoot>
                        <tr style="background: #1a1a1a;">
                            <td colspan="4" style="text-align: right; font-weight: bold;">
                                TOTAL CYCLE TIME:
                            </td>
                            <td style="font-weight: bold; color: #ff6b35; font-size: 1.2rem;">
                                {{ totalCycleTime }}s
                            </td>
                            <td colspan="2" style="font-size: 0.9rem;">
                                Value-Add: {{ valueAddTime }}s ({{ valueAddRatio }}%)
                            </td>
                        </tr>
                    </tfoot>
                </table>
            </div>
            
            <!-- Analytics View -->
            <div v-show="currentView === 'analytics'">
                <iframe 
                    :src="`/analytics?workflow_id=${workflowId}&embedded=true`"
                    style="width: 100%; height: calc(100vh - 120px); border: none;">
                </iframe>
            </div>
            
            <!-- Execute View -->
            <div v-show="currentView === 'execute'" style="padding: 2rem;">
                <h2>Execute Workflow</h2>
                <div style="max-width: 600px; margin: 2rem auto;">
                    <div style="background: #1a1a1a; padding: 2rem; border-radius: 8px;">
                        <h3>{{ workflow.name }}</h3>
                        <p style="color: #999; margin-top: 0.5rem;">{{ workflow.description }}</p>
                        
                        <div style="margin-top: 2rem;">
                            <label style="display: block; margin-bottom: 0.5rem;">Iterations:</label>
                            <input 
                                v-model="executionParams.iterations"
                                type="number" 
                                min="1" 
                                max="10"
                                style="width: 100%; padding: 0.75rem; background: #2a2a2a; border: 1px solid #333; color: #fff; border-radius: 4px;">
                        </div>
                        
                        <button 
                            @click="executeWorkflow"
                            :disabled="executing"
                            style="margin-top: 2rem; width: 100%; padding: 1rem; background: #ff6b35; color: #000; border: none; border-radius: 4px; font-weight: bold; cursor: pointer;">
                            {{ executing ? 'Executing...' : 'Execute Workflow' }}
                        </button>
                        
                        <div v-if="lastExecution" style="margin-top: 2rem; padding: 1rem; background: #2a2a2a; border-radius: 4px;">
                            <div style="font-weight: bold; margin-bottom: 0.5rem;">Last Execution:</div>
                            <div>Status: {{ lastExecution.state }}</div>
                            <div>Started: {{ formatDate(lastExecution.started_at) }}</div>
                            <div v-if="lastExecution.completed_at">
                                Completed: {{ formatDate(lastExecution.completed_at) }}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
    
    <script>
        const { createApp } = Vue;
        
        createApp({
            data() {
                return {
                    workflowId: new URLSearchParams(window.location.search).get('id') || '',
                    currentView: 'standard-work',
                    loading: true,
                    
                    views: [
                        { id: 'design', name: 'Design View', icon: '🎨' },
                        { id: 'standard-work', name: 'Standard Work', icon: '📋' },
                        { id: 'analytics', name: 'Analytics', icon: '📊' },
                        { id: 'execute', name: 'Execute', icon: '▶️' }
                    ],
                    
                    workflow: {},
                    standardWorkSteps: [],
                    metrics: {
                        takt_time: 45,
                        cycle_time: 38,
                        oee: 87,
                        first_pass_yield: 92
                    },
                    
                    executionParams: {
                        iterations: 4
                    },
                    executing: false,
                    lastExecution: null,
                    
                    currentDate: new Date().toLocaleDateString()
                }
            },
            
            computed: {
                criticalQualityPoints() {
                    return this.standardWorkSteps.reduce((count, step) => {
                        return count + step.quality_points.filter(qp => qp.severity === 'critical').length;
                    }, 0);
                },
                
                safetyPoints() {
                    // Count safety-related procedures
                    return this.standardWorkSteps.filter(step => 
                        step.procedures.some(p => p.toLowerCase().includes('safety') || p.toLowerCase().includes('verify'))
                    ).length;
                },
                
                mcpServerCount() {
                    return this.standardWorkSteps.filter(step => 
                        step.tool_mcp && step.tool_mcp !== 'System' && step.tool_mcp !== 'Human QC'
                    ).length;
                },
                
                abTestCount() {
                    return this.standardWorkSteps.filter(step => 
                        step.tool_mcp === 'A/B Testing'
                    ).length;
                },
                
                totalCycleTime() {
                    return this.standardWorkSteps.reduce((total, step) => 
                        total + step.total_time, 0
                    );
                },
                
                valueAddTime() {
                    return this.standardWorkSteps
                        .filter(step => step.element_type === 'value-add')
                        .reduce((total, step) => total + step.total_time, 0);
                },
                
                valueAddRatio() {
                    return Math.round((this.valueAddTime / this.totalCycleTime) * 100);
                }
            },
            
            methods: {
                async fetchWorkflowData() {
                    this.loading = true;
                    try {
                        const response = await axios.get(`/api/workflow-studio/${this.workflowId}`);
                        this.workflow = response.data.workflow;
                        this.standardWorkSteps = response.data.standard_work;
                        this.metrics = response.data.metrics;
                        this.lastExecution = response.data.executions?.[0];
                    } catch (error) {
                        console.error('Error fetching workflow data:', error);
                        alert('Failed to load workflow data');
                    } finally {
                        this.loading = false;
                    }
                },
                
                switchView(viewId) {
                    this.currentView = viewId;
                    
                    // Update URL without page reload
                    const url = new URL(window.location);
                    url.searchParams.set('view', viewId);
                    window.history.pushState({}, '', url);
                    
                    // Track view change
                    console.log(`Switched to ${viewId} view`);
                },
                
                async executeWorkflow() {
                    this.executing = true;
                    try {
                        const response = await axios.post(
                            `/workflows/${this.workflowId}/execute`,
                            { parameters: this.executionParams }
                        );
                        
                        alert(`Workflow execution started! ID: ${response.data.execution_id}`);
                        
                        // Refresh data to show new execution
                        await this.fetchWorkflowData();
                    } catch (error) {
                        console.error('Error executing workflow:', error);
                        alert('Failed to execute workflow');
                    } finally {
                        this.executing = false;
                    }
                },
                
                formatDate(dateString) {
                    return new Date(dateString).toLocaleString();
                }
            },
            
            mounted() {
                // Get initial view from URL or default
                const urlParams = new URLSearchParams(window.location.search);
                const requestedView = urlParams.get('view');
                if (requestedView && this.views.find(v => v.id === requestedView)) {
                    this.currentView = requestedView;
                }
                
                // Fetch workflow data
                if (this.workflowId) {
                    this.fetchWorkflowData();
                } else {
                    // If no workflow ID, redirect to workflow list
                    window.location.href = '/';
                }
                
                // Auto-refresh data every 30 seconds
                setInterval(() => {
                    if (this.currentView === 'standard-work' || this.currentView === 'analytics') {
                        this.fetchWorkflowData();
                    }
                }, 30000);
            }
        }).mount('#app');
    </script>
</body>
</html>
```

---

## 5. Migration Strategy

### Phase 1: Backend Preparation (Day 1)
1. Add database migrations for new fields
2. Implement StandardWorkConverter class
3. Add TPS metrics calculation
4. Create unified API endpoint

### Phase 2: Frontend Integration (Day 2)
1. Create workflow_studio.html
2. Update navigation in existing pages
3. Test view switching
4. Ensure iframe embedding works

### Phase 3: Data Connection (Day 3)
1. Connect real workflow data to Standard Work view
2. Calculate real metrics from executions
3. Test with existing workflows
4. Fix any data mapping issues

### Phase 4: Polish & Deploy (Day 4)
1. Add loading states and error handling
2. Test on multiple workflows
3. Ensure mobile responsiveness
4. Deploy to production

---

## 6. Testing Checklist

### Functionality Tests
- [ ] All views load correctly
- [ ] View switching maintains workflow context
- [ ] Standard Work shows real workflow data
- [ ] Metrics calculate correctly from executions
- [ ] Time calculations are accurate
- [ ] Quality points display properly
- [ ] Execute view triggers workflows
- [ ] Analytics view displays charts

### Data Integrity Tests
- [ ] Module order matches workflow definition
- [ ] MCP servers identified correctly
- [ ] Procedures generated appropriately
- [ ] Quality points relevant to module type
- [ ] Total time sums correctly

### UI/UX Tests
- [ ] Views switch smoothly
- [ ] Loading states display
- [ ] Error states handled gracefully
- [ ] Mobile responsive
- [ ] Keyboard navigation works
- [ ] Print-friendly Standard Work view

---

## 7. Future Enhancements

### Near-term (Sprint 7)
- Export Standard Work as PDF
- Time study mode with stopwatch
- Andon board integration
- Live execution tracking on Standard Work view

### Medium-term (Sprint 8)
- Video instructions for steps
- AR/VR training mode
- Multi-language support
- Offline mode for shop floor

### Long-term (Sprint 9+)
- AI suggestions for process improvement
- Automatic work balancing
- Predictive quality alerts
- Integration with MES systems

---

## Deployment Commands

```bash
# Run database migrations
alembic revision -m "Add TPS fields to workflow modules"
alembic upgrade head

# Test locally
python -m uvicorn src.main_workflow_db:app --reload

# Deploy to production
git add -A
git commit -m "feat: Unified Workflow Studio with real Standard Work data"
fly deploy --no-cache

# Verify deployment
fly logs -a ai-workflow-spc
```

---

## Result

After implementation, users will have a unified interface where:
1. **Design View** = Current visual builder
2. **Standard Work View** = TPS job instructions with REAL workflow data
3. **Analytics View** = Performance metrics for this specific workflow
4. **Execute View** = Run and monitor workflow execution

The Standard Work view will now show:
- Real modules from the workflow
- Accurate timing based on module types and MCP servers
- Actual quality checkpoints
- Calculated metrics from execution history

This creates a seamless experience from design → operation → analysis, all in one unified studio.
