# Standard Work Builder Integration - Technical Implementation Guide

## Executive Summary
This document provides detailed technical instructions for integrating the Standard Work (Toyota Production System) interface into the main workflow Builder, creating a unified experience that showcases the platform's unique operational excellence capabilities.

---

## Architecture Overview

### Current State
- **Builder** (`/workflow-builder`): Drag-and-drop canvas for workflow creation
- **Standard Work** (`/tps-builder`): Separate table-based view with TPS metrics

### Target State
- **Unified Builder**: Single interface with canvas + integrated Standard Work panel
- **Bidirectional sync**: Changes in either view update both
- **Real-time metrics**: Live calculation of Takt Time, Cycle Time, OEE

---

## Phase 1: UI Integration (Week 1-2)

### 1.1 Component Structure

```javascript
// frontend/components/UnifiedBuilder.vue
<template>
  <div class="unified-builder">
    <!-- TPS Metrics Header -->
    <div class="tps-metrics-bar">
      <MetricsDisplay 
        :taktTime="calculatedTaktTime"
        :cycleTime="calculatedCycleTime" 
        :oee="calculatedOEE"
        :firstPassYield="calculatedFPY"
      />
    </div>
    
    <!-- Main Content Area -->
    <div class="builder-content">
      <!-- Left: Module Palette -->
      <div class="module-palette" :class="{ collapsed: isPaletteCollapsed }">
        <ModulePalette @module-drag="handleModuleDrag" />
      </div>
      
      <!-- Center: Canvas -->
      <div class="canvas-area">
        <WorkflowCanvas 
          ref="canvas"
          v-model:modules="workflowModules"
          v-model:connections="workflowConnections"
          @module-update="syncToStandardWork"
          @module-delete="syncToStandardWork"
        />
      </div>
      
      <!-- Right: Standard Work Panel -->
      <div class="standard-work-panel" :class="{ expanded: isStandardWorkExpanded }">
        <button class="toggle-btn" @click="toggleStandardWork">
          <i :class="isStandardWorkExpanded ? 'fa-chevron-right' : 'fa-chevron-left'"></i>
          Standard Work
        </button>
        
        <transition name="slide">
          <StandardWorkTable 
            v-if="isStandardWorkExpanded"
            v-model:steps="standardWorkSteps"
            @step-update="syncToCanvas"
            :readonly="false"
          />
        </transition>
      </div>
    </div>
    
    <!-- Action Bar -->
    <div class="action-bar">
      <button @click="saveWorkflow" class="btn-primary">Save Workflow</button>
      <button @click="exportStandardWork" class="btn-secondary">Export Standard Work</button>
      <button @click="validateWorkflow" class="btn-secondary">Validate</button>
    </div>
  </div>
</template>
```

### 1.2 State Management

```javascript
// frontend/stores/unifiedBuilderStore.js
import { defineStore } from 'pinia'

export const useUnifiedBuilderStore = defineStore('unifiedBuilder', {
  state: () => ({
    // Workflow data
    workflowId: null,
    workflowName: '',
    workflowDescription: '',
    
    // Canvas state
    modules: [],
    connections: [],
    selectedModule: null,
    
    // Standard Work state
    standardWorkSteps: [],
    revision: '4.0',
    lastModified: null,
    
    // TPS Metrics
    taktTime: 45, // seconds
    targetCycleTime: 45,
    currentCycleTime: 0,
    oee: 0,
    firstPassYield: 0,
    
    // UI state
    isStandardWorkExpanded: true,
    isPaletteCollapsed: false,
    viewMode: 'unified', // 'canvas-only', 'standard-work-only', 'unified'
    
    // Sync state
    isSyncing: false,
    lastSyncTimestamp: null
  }),
  
  getters: {
    // Calculate total cycle time from steps
    calculatedCycleTime: (state) => {
      return state.standardWorkSteps.reduce((total, step) => {
        return total + (step.manualTime || 0) + (step.autoTime || 0)
      }, 0)
    },
    
    // Calculate OEE
    calculatedOEE: (state) => {
      if (!state.taktTime || state.taktTime === 0) return 0
      
      const availability = 0.95 // Assumed for now
      const performance = Math.min(state.taktTime / state.currentCycleTime, 1)
      const quality = state.firstPassYield / 100
      
      return Math.round(availability * performance * quality * 100)
    },
    
    // Check if cycle time exceeds takt time
    isCycleTimeExceeded: (state) => {
      return state.currentCycleTime > state.taktTime
    },
    
    // Count critical quality points
    criticalQualityPoints: (state) => {
      return state.standardWorkSteps.filter(step => 
        step.qualityCheckPoints?.some(qc => qc.critical)
      ).length
    }
  },
  
  actions: {
    // Sync canvas module to standard work step
    syncModuleToStep(module) {
      const existingStepIndex = this.standardWorkSteps.findIndex(
        step => step.moduleId === module.id
      )
      
      const step = this.convertModuleToStep(module)
      
      if (existingStepIndex >= 0) {
        this.standardWorkSteps[existingStepIndex] = step
      } else {
        this.standardWorkSteps.push(step)
      }
      
      this.recalculateStepNumbers()
      this.updateMetrics()
    },
    
    // Convert module to standard work step
    convertModuleToStep(module) {
      const typeMapping = {
        'start': 'setup',
        'end': 'completion',
        'image_generation': 'value-add',
        'mcp_module': 'value-add',
        'qc_pass_fail': 'inspection',
        'ab_testing': 'decision'
      }
      
      return {
        stepNumber: this.standardWorkSteps.length + 1,
        moduleId: module.id,
        workElement: module.name || module.type,
        elementType: typeMapping[module.type] || 'value-add',
        procedure: this.extractProcedure(module),
        toolMcp: this.extractToolMcp(module),
        manualTime: this.estimateManualTime(module),
        autoTime: this.estimateAutoTime(module),
        qualityCheckPoints: this.extractQualityPoints(module),
        keyPoints: this.extractKeyPoints(module),
        isHumanRequired: module.type === 'qc_pass_fail',
        isCriticalGate: module.config?.critical || false
      }
    },
    
    // Extract procedure steps from module config
    extractProcedure(module) {
      const procedures = []
      
      if (module.type === 'start') {
        procedures.push('Verify API keys')
        procedures.push('Set batch size')
        procedures.push('Check resources')
      } else if (module.type === 'mcp_module') {
        procedures.push('Set parameters')
        procedures.push(`Submit to ${module.config?.mcp_server || 'MCP server'}`)
        procedures.push('Monitor progress')
        procedures.push('Retrieve results')
      } else if (module.type === 'qc_pass_fail') {
        procedures.push('Review assets')
        procedures.push('Check criteria')
        procedures.push('Record decisions')
      }
      
      return procedures
    },
    
    // Estimate times based on module type
    estimateManualTime(module) {
      const estimates = {
        'start': 5,
        'qc_pass_fail': 20,
        'ab_testing': 15,
        'end': 2
      }
      return estimates[module.type] || 3
    },
    
    estimateAutoTime(module) {
      const estimates = {
        'mcp_module': 15,
        'image_generation': 18,
        'qc_pass_fail': 0,
        'ab_testing': 5
      }
      return estimates[module.type] || 0
    }
  }
})
```

### 1.3 Synchronization Logic

```javascript
// frontend/utils/builderSync.js

export class BuilderSyncManager {
  constructor(store) {
    this.store = store
    this.syncQueue = []
    this.isSyncing = false
  }
  
  // Sync from canvas to standard work
  syncCanvasToStandardWork(modules, connections) {
    if (this.isSyncing) return
    
    this.isSyncing = true
    
    try {
      // Build execution order using topological sort
      const executionOrder = this.topologicalSort(modules, connections)
      
      // Clear existing steps
      this.store.standardWorkSteps = []
      
      // Convert each module in execution order
      executionOrder.forEach((moduleId, index) => {
        const module = modules.find(m => m.id === moduleId)
        if (module) {
          const step = this.store.convertModuleToStep(module)
          step.stepNumber = index + 1
          this.store.standardWorkSteps.push(step)
        }
      })
      
      // Update metrics
      this.store.updateMetrics()
      
    } finally {
      this.isSyncing = false
    }
  }
  
  // Sync from standard work to canvas
  syncStandardWorkToCanvas(steps) {
    if (this.isSyncing) return
    
    this.isSyncing = true
    
    try {
      steps.forEach(step => {
        const module = this.store.modules.find(m => m.id === step.moduleId)
        if (module) {
          // Update module properties from step
          module.name = step.workElement
          
          // Update config based on step changes
          if (step.toolMcp && module.config) {
            module.config.mcp_server = step.toolMcp
          }
          
          // Update critical flag
          if (module.config) {
            module.config.critical = step.isCriticalGate
          }
        }
      })
      
      // Trigger canvas re-render
      this.store.lastSyncTimestamp = Date.now()
      
    } finally {
      this.isSyncing = false
    }
  }
  
  // Topological sort for execution order
  topologicalSort(modules, connections) {
    const visited = new Set()
    const stack = []
    const adjacencyList = this.buildAdjacencyList(modules, connections)
    
    const visit = (moduleId) => {
      if (visited.has(moduleId)) return
      visited.add(moduleId)
      
      const neighbors = adjacencyList.get(moduleId) || []
      neighbors.forEach(neighbor => visit(neighbor))
      
      stack.push(moduleId)
    }
    
    // Find start nodes
    const startNodes = modules.filter(m => m.type === 'start')
    if (startNodes.length === 0) {
      // If no start node, begin with nodes that have no incoming connections
      const hasIncoming = new Set(connections.map(c => c.to_module_id))
      modules.forEach(m => {
        if (!hasIncoming.has(m.id)) {
          visit(m.id)
        }
      })
    } else {
      startNodes.forEach(node => visit(node.id))
    }
    
    return stack.reverse()
  }
  
  buildAdjacencyList(modules, connections) {
    const adjacencyList = new Map()
    
    modules.forEach(module => {
      adjacencyList.set(module.id, [])
    })
    
    connections.forEach(connection => {
      const fromList = adjacencyList.get(connection.from_module_id) || []
      fromList.push(connection.to_module_id)
      adjacencyList.set(connection.from_module_id, fromList)
    })
    
    return adjacencyList
  }
}
```

---

## Phase 2: Enhanced Metrics & Real-time Calculations (Week 3)

### 2.1 Metrics Display Component

```vue
<!-- frontend/components/MetricsDisplay.vue -->
<template>
  <div class="metrics-display">
    <div class="metrics-header">
      <h2>{{ workflowName || 'New Workflow' }} - Standard Work</h2>
      <div class="revision">Rev: {{ revision }}</div>
    </div>
    
    <div class="metrics-grid">
      <!-- Takt Time -->
      <div class="metric-card" :class="{ alert: isCycleTimeExceeded }">
        <div class="metric-label">Takt Time</div>
        <div class="metric-value">{{ formatTime(taktTime) }}</div>
        <div class="metric-unit">sec/unit</div>
      </div>
      
      <!-- Cycle Time -->
      <div class="metric-card" :class="{ warning: cycleTime > taktTime * 0.9 }">
        <div class="metric-label">Cycle Time</div>
        <div class="metric-value">{{ formatTime(cycleTime) }}</div>
        <div class="metric-unit">current</div>
        <div v-if="cycleTime > taktTime" class="metric-alert">
          <i class="fa fa-warning"></i> Exceeds Takt
        </div>
      </div>
      
      <!-- OEE -->
      <div class="metric-card" :class="oeeClass">
        <div class="metric-label">OEE</div>
        <div class="metric-value">{{ oee }}%</div>
        <div class="metric-status">
          <span v-if="oee >= 85">World Class</span>
          <span v-else-if="oee >= 65">Good</span>
          <span v-else>Needs Improvement</span>
        </div>
      </div>
      
      <!-- First Pass Yield -->
      <div class="metric-card">
        <div class="metric-label">First Pass Yield</div>
        <div class="metric-value">{{ firstPassYield }}%</div>
        <div class="metric-trend" v-if="yieldTrend">
          <i :class="yieldTrendIcon"></i>
          {{ yieldTrendText }}
        </div>
      </div>
      
      <!-- Quality Gates -->
      <div class="metric-card">
        <div class="metric-label">Quality Gates</div>
        <div class="metric-value">{{ qualityGateCount }}</div>
        <div class="metric-detail">
          <span class="critical">{{ criticalGates }} Critical</span>
        </div>
      </div>
    </div>
    
    <!-- Andon Status Bar -->
    <div class="andon-bar" :class="andonStatus">
      <div class="status-light"></div>
      <span class="status-text">{{ andonText }}</span>
      <button v-if="andonStatus !== 'green'" class="andon-button" @click="pullAndon">
        <i class="fa fa-bell"></i> Call Supervisor
      </button>
    </div>
  </div>
</template>

<script>
export default {
  props: {
    taktTime: Number,
    cycleTime: Number,
    oee: Number,
    firstPassYield: Number,
    qualityGateCount: Number,
    criticalGates: Number,
    workflowName: String,
    revision: String
  },
  
  computed: {
    isCycleTimeExceeded() {
      return this.cycleTime > this.taktTime
    },
    
    oeeClass() {
      if (this.oee >= 85) return 'world-class'
      if (this.oee >= 65) return 'good'
      return 'needs-improvement'
    },
    
    andonStatus() {
      if (this.firstPassYield < 90 || this.isCycleTimeExceeded) return 'red'
      if (this.firstPassYield < 95 || this.cycleTime > this.taktTime * 0.9) return 'yellow'
      return 'green'
    },
    
    andonText() {
      const statusMap = {
        'green': 'Normal Operation',
        'yellow': 'Attention Required',
        'red': 'Stop & Fix'
      }
      return statusMap[this.andonStatus]
    }
  },
  
  methods: {
    formatTime(seconds) {
      if (seconds < 60) return `${seconds}s`
      const minutes = Math.floor(seconds / 60)
      const remainingSeconds = seconds % 60
      return `${minutes}m ${remainingSeconds}s`
    },
    
    pullAndon() {
      this.$emit('pull-andon', {
        status: this.andonStatus,
        metrics: {
          cycleTime: this.cycleTime,
          taktTime: this.taktTime,
          firstPassYield: this.firstPassYield
        }
      })
    }
  }
}
</script>
```

### 2.2 Standard Work Table Component

```vue
<!-- frontend/components/StandardWorkTable.vue -->
<template>
  <div class="standard-work-table-container">
    <table class="job-instruction-table">
      <thead>
        <tr>
          <th class="step-col">Step #</th>
          <th class="element-col">Work Element</th>
          <th class="procedure-col">Procedure</th>
          <th class="tool-col">Tool/MCP</th>
          <th class="time-col">Time (s)</th>
          <th class="quality-col">Quality</th>
          <th class="points-col">Key Points</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="step in steps" 
            :key="step.stepNumber"
            :class="getStepClass(step)"
            @click="selectStep(step)">
          
          <!-- Step Number -->
          <td class="step-number">{{ step.stepNumber }}</td>
          
          <!-- Work Element -->
          <td class="work-element">
            <div class="element-name">{{ step.workElement }}</div>
            <div class="element-type">{{ step.elementType }}</div>
          </td>
          
          <!-- Procedure -->
          <td class="procedure">
            <ul v-if="Array.isArray(step.procedure)">
              <li v-for="(proc, idx) in step.procedure" :key="idx">
                {{ proc }}
              </li>
            </ul>
            <span v-else>{{ step.procedure }}</span>
          </td>
          
          <!-- Tool/MCP -->
          <td class="tool-mcp">
            <select v-if="step.elementType === 'value-add'" 
                    v-model="step.toolMcp"
                    @change="updateStep(step)">
              <option value="">Select MCP Server</option>
              <option value="akool">Akool (Direct)</option>
              <option value="replicate">Replicate (MCP)</option>
              <option value="dalle3">DALL-E 3 (MCP)</option>
              <option value="gpt4">GPT-4 Vision (MCP)</option>
            </select>
            <span v-else>{{ step.toolMcp || 'System' }}</span>
            
            <!-- MCP Status Indicator -->
            <div v-if="step.toolMcp && step.toolMcp !== 'System'" 
                 class="mcp-status"
                 :class="getMcpStatus(step.toolMcp)">
              <i class="fa fa-circle"></i>
            </div>
          </td>
          
          <!-- Time -->
          <td class="time">
            <div class="time-breakdown">
              <span class="manual-time">M: {{ step.manualTime }}s</span>
              <span class="auto-time">A: {{ step.autoTime }}s</span>
              <div class="total-time">{{ step.manualTime + step.autoTime }}s</div>
            </div>
          </td>
          
          <!-- Quality -->
          <td class="quality">
            <div v-if="step.qualityCheckPoints?.length > 0">
              <div v-for="qc in step.qualityCheckPoints" 
                   :key="qc.id"
                   class="quality-check"
                   :class="{ critical: qc.critical }">
                <i :class="qc.critical ? 'fa fa-exclamation-triangle' : 'fa fa-check-circle'"></i>
                {{ qc.check }}
              </div>
            </div>
            
            <!-- Human QC Indicator -->
            <div v-if="step.isHumanRequired" class="human-required">
              <i class="fa fa-user"></i> Human Required
            </div>
            
            <!-- Critical Gate -->
            <div v-if="step.isCriticalGate" class="critical-gate">
              <span class="gate-badge">Critical Gate</span>
            </div>
          </td>
          
          <!-- Key Points -->
          <td class="key-points">
            <div v-if="step.keyPoints">
              <div v-if="step.keyPoints.quality" class="point quality-point">
                <i class="fa fa-star"></i> {{ step.keyPoints.quality }}
              </div>
              <div v-if="step.keyPoints.tip" class="point tip">
                <i class="fa fa-lightbulb"></i> {{ step.keyPoints.tip }}
              </div>
              <div v-if="step.keyPoints.safety" class="point safety">
                <i class="fa fa-shield"></i> {{ step.keyPoints.safety }}
              </div>
            </div>
          </td>
        </tr>
        
        <!-- Total Row -->
        <tr class="total-row">
          <td colspan="4" class="text-right">Total Cycle Time:</td>
          <td class="total-time">
            <strong>{{ totalCycleTime }}s</strong>
            <span v-if="exceedsTaktTime" class="exceeds-takt">
              (Exceeds Takt by {{ cycleTimeExcess }}s)
            </span>
          </td>
          <td colspan="2"></td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script>
export default {
  props: {
    steps: Array,
    taktTime: Number,
    readonly: Boolean
  },
  
  computed: {
    totalCycleTime() {
      return this.steps.reduce((total, step) => 
        total + (step.manualTime || 0) + (step.autoTime || 0), 0)
    },
    
    exceedsTaktTime() {
      return this.taktTime && this.totalCycleTime > this.taktTime
    },
    
    cycleTimeExcess() {
      return Math.max(0, this.totalCycleTime - this.taktTime)
    }
  },
  
  methods: {
    getStepClass(step) {
      const classes = []
      
      if (step.elementType) {
        classes.push(`type-${step.elementType}`)
      }
      
      if (step.isHumanRequired) {
        classes.push('human-step')
      }
      
      if (step.isCriticalGate) {
        classes.push('critical-gate')
      }
      
      if (step.selected) {
        classes.push('selected')
      }
      
      return classes.join(' ')
    },
    
    getMcpStatus(mcpServer) {
      // This would check real server status
      const statusMap = {
        'akool': 'online',
        'replicate': 'online',
        'dalle3': 'online',
        'gpt4': 'degraded'
      }
      return statusMap[mcpServer] || 'offline'
    },
    
    selectStep(step) {
      this.$emit('step-selected', step)
    },
    
    updateStep(step) {
      this.$emit('step-update', step)
    }
  }
}
</script>
```

---

## Phase 3: Backend Integration (Week 3)

### 3.1 API Endpoints

```python
# src/api/standard_work.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional
from datetime import datetime

router = APIRouter(prefix="/api/standard-work", tags=["standard_work"])

@router.post("/generate-from-workflow")
async def generate_standard_work(
    workflow_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Generate Standard Work document from workflow"""
    
    # Get workflow
    workflow_repo = WorkflowRepository(db)
    workflow = await workflow_repo.get_by_id(workflow_id)
    
    if not workflow:
        raise HTTPException(404, "Workflow not found")
    
    # Build execution order
    execution_order = build_execution_order(
        workflow.modules,
        workflow.connections
    )
    
    # Generate standard work steps
    standard_work = StandardWork(
        workflow_id=workflow_id,
        name=f"{workflow.name} - Standard Work",
        revision="4.0",
        takt_time=45,  # Default, should be configurable
        steps=[]
    )
    
    for idx, module_id in enumerate(execution_order):
        module = next(m for m in workflow.modules if m.id == module_id)
        
        step = StandardWorkStep(
            step_number=idx + 1,
            module_id=module.id,
            work_element=module.name,
            element_type=map_module_type(module.type),
            procedure=generate_procedure(module),
            tool_mcp=extract_mcp_server(module),
            manual_time=estimate_manual_time(module),
            auto_time=estimate_auto_time(module),
            quality_check_points=extract_quality_points(module),
            key_points=generate_key_points(module),
            is_human_required=module.type == "qc_pass_fail",
            is_critical_gate=module.config.get("critical", False)
        )
        
        standard_work.steps.append(step)
    
    # Calculate metrics
    standard_work.cycle_time = sum(
        s.manual_time + s.auto_time for s in standard_work.steps
    )
    standard_work.critical_points = len([
        s for s in standard_work.steps if s.is_critical_gate
    ])
    
    # Save to database
    await db.add(standard_work)
    await db.commit()
    
    return standard_work

@router.put("/update-metrics/{workflow_id}")
async def update_tps_metrics(
    workflow_id: str,
    metrics: TPSMetrics,
    db: AsyncSession = Depends(get_db)
):
    """Update TPS metrics for a workflow"""
    
    # Get or create metrics record
    metrics_repo = MetricsRepository(db)
    existing = await metrics_repo.get_by_workflow(workflow_id)
    
    if existing:
        existing.takt_time = metrics.takt_time
        existing.target_cycle_time = metrics.target_cycle_time
        existing.oee_target = metrics.oee_target
        existing.updated_at = datetime.utcnow()
    else:
        existing = WorkflowMetrics(
            workflow_id=workflow_id,
            **metrics.dict()
        )
        db.add(existing)
    
    await db.commit()
    return existing

@router.get("/export/{workflow_id}")
async def export_standard_work(
    workflow_id: str,
    format: str = "pdf",
    db: AsyncSession = Depends(get_db)
):
    """Export Standard Work as PDF or Excel"""
    
    standard_work = await get_standard_work(workflow_id, db)
    
    if format == "pdf":
        pdf_bytes = generate_standard_work_pdf(standard_work)
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"attachment; filename=standard_work_{workflow_id}.pdf"
            }
        )
    elif format == "excel":
        excel_bytes = generate_standard_work_excel(standard_work)
        return Response(
            content=excel_bytes,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={
                "Content-Disposition": f"attachment; filename=standard_work_{workflow_id}.xlsx"
            }
        )
```

### 3.2 Database Models

```python
# src/database/models.py
from sqlalchemy import Column, String, Integer, Float, JSON, Boolean, ForeignKey
from sqlalchemy.orm import relationship

class StandardWork(Base):
    __tablename__ = "standard_works"
    
    id = Column(String, primary_key=True)
    workflow_id = Column(String, ForeignKey("workflows.id"))
    name = Column(String)
    revision = Column(String, default="1.0")
    takt_time = Column(Float)  # seconds
    cycle_time = Column(Float)  # calculated
    critical_points = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    workflow = relationship("Workflow", back_populates="standard_work")
    steps = relationship("StandardWorkStep", back_populates="standard_work")

class StandardWorkStep(Base):
    __tablename__ = "standard_work_steps"
    
    id = Column(String, primary_key=True)
    standard_work_id = Column(String, ForeignKey("standard_works.id"))
    step_number = Column(Integer)
    module_id = Column(String)
    work_element = Column(String)
    element_type = Column(String)  # setup, value-add, inspection, decision
    procedure = Column(JSON)  # Array of steps
    tool_mcp = Column(String)
    manual_time = Column(Float, default=0)
    auto_time = Column(Float, default=0)
    quality_check_points = Column(JSON)
    key_points = Column(JSON)
    is_human_required = Column(Boolean, default=False)
    is_critical_gate = Column(Boolean, default=False)
    
    # Relationships
    standard_work = relationship("StandardWork", back_populates="steps")

class WorkflowMetrics(Base):
    __tablename__ = "workflow_metrics"
    
    id = Column(String, primary_key=True)
    workflow_id = Column(String, ForeignKey("workflows.id"))
    takt_time = Column(Float)
    target_cycle_time = Column(Float)
    current_cycle_time = Column(Float)
    oee_target = Column(Float)
    current_oee = Column(Float)
    first_pass_yield = Column(Float)
    defect_rate = Column(Float)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow)
```

---

## Phase 4: Testing & Quality Assurance (Week 4)

### 4.1 Test Coverage Requirements

```javascript
// tests/unit/standardWork.test.js
import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import StandardWorkTable from '@/components/StandardWorkTable.vue'
import { useUnifiedBuilderStore } from '@/stores/unifiedBuilderStore'

describe('StandardWorkTable', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })
  
  it('calculates cycle time correctly', () => {
    const store = useUnifiedBuilderStore()
    
    store.standardWorkSteps = [
      { manualTime: 5, autoTime: 0 },
      { manualTime: 3, autoTime: 15 },
      { manualTime: 20, autoTime: 0 }
    ]
    
    expect(store.calculatedCycleTime).toBe(43)
  })
  
  it('detects when cycle time exceeds takt time', () => {
    const store = useUnifiedBuilderStore()
    
    store.taktTime = 45
    store.currentCycleTime = 50
    
    expect(store.isCycleTimeExceeded).toBe(true)
  })
  
  it('syncs module changes to standard work steps', () => {
    const store = useUnifiedBuilderStore()
    
    const module = {
      id: 'module_1',
      name: 'Test Module',
      type: 'mcp_module',
      config: { mcp_server: 'replicate' }
    }
    
    store.syncModuleToStep(module)
    
    expect(store.standardWorkSteps).toHaveLength(1)
    expect(store.standardWorkSteps[0].workElement).toBe('Test Module')
    expect(store.standardWorkSteps[0].toolMcp).toContain('replicate')
  })
})
```

### 4.2 E2E Test Scenarios

```javascript
// tests/e2e/unifiedBuilder.spec.js
import { test, expect } from '@playwright/test'

test.describe('Unified Builder with Standard Work', () => {
  test('should sync canvas changes to standard work table', async ({ page }) => {
    await page.goto('/workflow-builder')
    
    // Drag a module onto canvas
    await page.dragAndDrop('.module-palette [data-type="start"]', '.canvas-area')
    
    // Open Standard Work panel
    await page.click('.toggle-btn:has-text("Standard Work")')
    
    // Verify step appears in table
    await expect(page.locator('.standard-work-table tbody tr')).toHaveCount(1)
    await expect(page.locator('.work-element')).toContainText('Start')
  })
  
  test('should show warning when cycle time exceeds takt time', async ({ page }) => {
    await page.goto('/workflow-builder')
    
    // Set takt time
    await page.fill('input[name="takt_time"]', '30')
    
    // Add modules that exceed takt time
    await page.dragAndDrop('[data-type="mcp_module"]', '.canvas-area')
    await page.dragAndDrop('[data-type="qc_pass_fail"]', '.canvas-area')
    
    // Check for warning
    await expect(page.locator('.metric-alert')).toContainText('Exceeds Takt')
    await expect(page.locator('.andon-bar')).toHaveClass(/red/)
  })
})
```

---

## Implementation Timeline & Milestones

### Week 1: Core Integration
- [ ] Create UnifiedBuilder component structure
- [ ] Implement state management store
- [ ] Build basic sync between canvas and table
- [ ] Add collapsible Standard Work panel

### Week 2: Synchronization & Data Flow
- [ ] Complete BuilderSyncManager
- [ ] Implement topological sort for execution order
- [ ] Add bidirectional sync logic
- [ ] Handle edge cases (deletions, reordering)

### Week 3: Metrics & Backend
- [ ] Add MetricsDisplay component
- [ ] Implement real-time calculations
- [ ] Create backend API endpoints
- [ ] Add database models for Standard Work

### Week 4: Polish & Testing
- [ ] Add export functionality (PDF/Excel)
- [ ] Implement revision tracking
- [ ] Complete test coverage
- [ ] Performance optimization
- [ ] Documentation

---

## CSS Styling Guidelines

```css
/* frontend/styles/unified-builder.css */

.unified-builder {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #1a1a1a;
}

/* TPS Metrics Bar */
.tps-metrics-bar {
  background: linear-gradient(135deg, #2a2a2a 0%, #1a1a1a 100%);
  border-bottom: 2px solid #ff6b35;
  padding: 1rem;
}

.metrics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 1rem;
}

.metric-card {
  background: #2a2a2a;
  border-radius: 8px;
  padding: 0.75rem;
  border: 1px solid #3a3a3a;
  transition: all 0.3s ease;
}

.metric-card.alert {
  border-color: #ff4444;
  animation: pulse 2s infinite;
}

.metric-card.warning {
  border-color: #ffaa00;
}

/* Standard Work Table */
.job-instruction-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.9rem;
}

.job-instruction-table th {
  background: #2a2a2a;
  color: #ff6b35;
  padding: 0.75rem;
  text-align: left;
  border-bottom: 2px solid #ff6b35;
}

.job-instruction-table td {
  padding: 0.75rem;
  border-bottom: 1px solid #3a3a3a;
  vertical-align: top;
}

.human-step {
  background: rgba(255, 170, 0, 0.1);
}

.critical-gate {
  background: rgba(255, 68, 68, 0.1);
}

/* Andon Bar */
.andon-bar {
  display: flex;
  align-items: center;
  padding: 0.5rem 1rem;
  background: #2a2a2a;
  border-radius: 4px;
  margin-top: 1rem;
}

.andon-bar.green .status-light {
  background: #00ff00;
  box-shadow: 0 0 10px #00ff00;
}

.andon-bar.yellow .status-light {
  background: #ffaa00;
  box-shadow: 0 0 10px #ffaa00;
  animation: blink 1s infinite;
}

.andon-bar.red .status-light {
  background: #ff4444;
  box-shadow: 0 0 10px #ff4444;
  animation: blink 0.5s infinite;
}

@keyframes pulse {
  0% { transform: scale(1); }
  50% { transform: scale(1.02); }
  100% { transform: scale(1); }
}

@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.3; }
}
```

---

## Migration Strategy for Existing Workflows

### Database Migration
```sql
-- Create new tables for Standard Work
CREATE TABLE standard_works (
    id VARCHAR PRIMARY KEY,
    workflow_id VARCHAR REFERENCES workflows(id),
    name VARCHAR(255),
    revision VARCHAR(20) DEFAULT '1.0',
    takt_time FLOAT,
    cycle_time FLOAT,
    critical_points INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE standard_work_steps (
    id VARCHAR PRIMARY KEY,
    standard_work_id VARCHAR REFERENCES standard_works(id),
    step_number INTEGER,
    module_id VARCHAR,
    work_element VARCHAR(255),
    element_type VARCHAR(50),
    procedure JSON,
    tool_mcp VARCHAR(100),
    manual_time FLOAT DEFAULT 0,
    auto_time FLOAT DEFAULT 0,
    quality_check_points JSON,
    key_points JSON,
    is_human_required BOOLEAN DEFAULT FALSE,
    is_critical_gate BOOLEAN DEFAULT FALSE
);

-- Add metrics table
CREATE TABLE workflow_metrics (
    id VARCHAR PRIMARY KEY,
    workflow_id VARCHAR REFERENCES workflows(id),
    takt_time FLOAT,
    target_cycle_time FLOAT,
    current_cycle_time FLOAT,
    oee_target FLOAT,
    current_oee FLOAT,
    first_pass_yield FLOAT,
    defect_rate FLOAT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

### Migration Script
```python
# scripts/migrate_to_standard_work.py
async def migrate_existing_workflows():
    """Generate Standard Work for all existing workflows"""
    
    workflows = await workflow_repo.get_all()
    
    for workflow in workflows:
        try:
            # Generate standard work
            standard_work = await generate_standard_work(workflow.id)
            
            # Set default metrics
            metrics = WorkflowMetrics(
                workflow_id=workflow.id,
                takt_time=45,
                target_cycle_time=45,
                oee_target=85,
                first_pass_yield=95
            )
            
            await db.add(metrics)
            await db.commit()
            
            print(f"✓ Migrated workflow: {workflow.name}")
            
        except Exception as e:
            print(f"✗ Failed to migrate {workflow.name}: {e}")
```

---

## Success Criteria

1. **User Experience**
   - Canvas and Standard Work stay perfectly synchronized
   - Changes in either view immediately reflect in the other
   - No lag or delay in updates

2. **Metrics Accuracy**
   - Cycle time calculations match manual calculations
   - OEE formula correctly implemented
   - Real-time updates as modules are added/removed

3. **Performance**
   - Page load < 2 seconds with 50+ modules
   - Sync operations < 100ms
   - Smooth drag-and-drop without stuttering

4. **Data Integrity**
   - All workflow data preserved during migration
   - Standard Work persists across sessions
   - Revision history maintained

5. **Visual Polish**
   - TPS styling consistent with screenshots
   - Andon lights animate appropriately
   - Mobile responsive for tablet use

---

## Questions for Product Team

1. **Default Time Estimates**: Should we allow users to configure default time estimates per module type?

2. **Revision Control**: How should revisions increment? Manual or automatic on save?

3. **Quality Points**: Should quality check points be predefined or user-configurable?

4. **Export Formats**: Besides PDF and Excel, any other export formats needed?

5. **Permissions**: Who can edit Standard Work vs. who can only view?

6. **Mobile**: Priority for mobile/tablet optimization?

---

## Next Steps After This Integration

Once the unified Builder + Standard Work is complete, the team should focus on:

1. **A/B Testing Module** - Complete the statistical analysis backend
2. **MCP Health Dashboard** - Real-time monitoring of all connected services
3. **SPC Analytics** - Control charts and Pareto analysis
4. **Cost Optimization Engine** - Intelligent routing logic

This integration will be the foundation that differentiates your platform from all competitors.
