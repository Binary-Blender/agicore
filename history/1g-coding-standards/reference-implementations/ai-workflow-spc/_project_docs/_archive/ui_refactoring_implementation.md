# UI Refactoring Guide: From Drag-Drop to TPS Job Instructions

## Current State → Future State Transformation

### What We're Changing

**REMOVE:**
- ❌ Drag-and-drop canvas
- ❌ Node-based connections
- ❌ Visual workflow editor
- ❌ Module palette sidebar

**ADD:**
- ✅ Job instruction table format
- ✅ Sequential step numbers
- ✅ Standard work documentation
- ✅ Takt time tracking
- ✅ Andon board status
- ✅ SPC metrics inline

---

## File-by-File Refactoring Plan

### 1. Update `builder.html` → `job_instruction.html`

```javascript
// OLD: builder.html (Current drag-drop implementation)
const WorkflowBuilder = {
    data() {
        return {
            buildingWorkflow: {
                steps: [],
                connections: []
            },
            selectedStep: null,
            dragging: false
        }
    }
}

// NEW: job_instruction.html (TPS-style implementation)
const JobInstructionBuilder = {
    data() {
        return {
            jobInstruction: {
                title: 'Image Generation with QC',
                processFamily: 'AI Content Generation',
                taktTime: 45, // seconds
                revisionNumber: '4.0',
                steps: [
                    {
                        stepNumber: 1,
                        workElement: 'Initialize Batch',
                        elementType: 'setup', // setup, value-add, inspection, transport, wait
                        procedure: [
                            'Set batch size (1-10 units)',
                            'Verify API keys loaded',
                            'Check server availability'
                        ],
                        mcpServer: null, // Or specific MCP server
                        manualTime: 5,
                        autoTime: 0,
                        qualityCheckPoints: [
                            { check: 'Batch ≤ 10', required: true },
                            { check: 'API active', required: true }
                        ],
                        keyPoints: {
                            safety: null,
                            quality: 'Max 10 per batch for optimal QC',
                            tip: 'Smaller batches = faster cycle time'
                        }
                    },
                    {
                        stepNumber: 2,
                        workElement: 'Generate Images',
                        elementType: 'value-add',
                        procedure: 'Generate images using selected MCP server',
                        mcpServer: {
                            id: 'replicate_mcp',
                            tool: 'generate_image',
                            config: {
                                prompt: '',
                                model: 'sdxl',
                                count: 4
                            }
                        },
                        manualTime: 3,
                        autoTime: 15,
                        qualityCheckPoints: [
                            { check: 'API response OK', required: true },
                            { check: 'Images received', required: true }
                        ],
                        keyPoints: {
                            quality: 'Verify prompt appropriate',
                            cost: '$0.012 per image'
                        }
                    },
                    {
                        stepNumber: 3,
                        workElement: 'Quality Inspection',
                        elementType: 'inspection',
                        isHumanRequired: true,
                        isCriticalGate: true,
                        procedure: [
                            'Check image clarity (no blur)',
                            'Verify prompt adherence',
                            'Confirm no inappropriate content',
                            'Assess aesthetic quality'
                        ],
                        mcpServer: null,
                        manualTime: 20,
                        autoTime: 0,
                        qualityCheckPoints: [
                            { check: '100% inspection', required: true },
                            { check: 'Document defects', required: true },
                            { check: 'Calculate PPM', required: false }
                        ],
                        keyPoints: {
                            quality: 'Zero defects to customer',
                            tip: 'Use comparison mode for consistency'
                        }
                    }
                ]
            },
            currentStep: 1,
            executionMetrics: {
                cycleTime: 0,
                firstPassYield: 0,
                defectRate: 0
            }
        }
    },
    
    methods: {
        addStep() {
            // Add a new step to the instruction
            const newStep = {
                stepNumber: this.jobInstruction.steps.length + 1,
                workElement: '',
                elementType: 'value-add',
                procedure: [],
                mcpServer: null,
                manualTime: 0,
                autoTime: 0,
                qualityCheckPoints: [],
                keyPoints: {}
            };
            this.jobInstruction.steps.push(newStep);
        },
        
        insertMCPStep(afterStep, mcpServerId) {
            // Insert an MCP server as a step
            const mcpStep = {
                stepNumber: afterStep + 1,
                workElement: `Execute ${mcpServerId}`,
                elementType: 'value-add',
                mcpServer: {
                    id: mcpServerId,
                    tool: null, // To be selected
                    config: {}
                },
                manualTime: 0,
                autoTime: 0 // Will be calculated
            };
            
            // Renumber subsequent steps
            this.jobInstruction.steps.splice(afterStep, 0, mcpStep);
            this.renumberSteps();
        },
        
        renumberSteps() {
            this.jobInstruction.steps.forEach((step, index) => {
                step.stepNumber = index + 1;
            });
        },
        
        calculateTotalCycleTime() {
            return this.jobInstruction.steps.reduce((total, step) => {
                return total + step.manualTime + step.autoTime;
            }, 0);
        },
        
        async saveAsWorkflow() {
            // Convert job instruction format to workflow format for backend
            const workflow = this.convertToWorkflowFormat();
            const response = await axios.post('/workflows', workflow);
            // ...
        },
        
        convertToWorkflowFormat() {
            // Transform TPS format to backend workflow format
            const modules = [];
            const connections = [];
            
            this.jobInstruction.steps.forEach((step, index) => {
                // Create module for each step
                const module = {
                    id: `module_${step.stepNumber}`,
                    type: this.getModuleType(step),
                    name: step.workElement,
                    config: step.mcpServer ? step.mcpServer.config : {},
                    position: { x: 0, y: index * 100 } // Not used but required
                };
                modules.push(module);
                
                // Create connection to next step
                if (index < this.jobInstruction.steps.length - 1) {
                    connections.push({
                        from_module_id: module.id,
                        from_output: 'default',
                        to_module_id: `module_${step.stepNumber + 1}`,
                        to_input: 'default'
                    });
                }
            });
            
            return {
                name: this.jobInstruction.title,
                description: `Standard Work Rev ${this.jobInstruction.revisionNumber}`,
                modules,
                connections
            };
        },
        
        getModuleType(step) {
            if (step.mcpServer) return 'mcp_module';
            if (step.isHumanRequired) return 'qc_pass_fail';
            if (step.stepNumber === 1) return 'start';
            if (step.stepNumber === this.jobInstruction.steps.length) return 'end';
            return 'generic';
        }
    },
    
    template: `
        <div class="job-instruction-app">
            <!-- Header with TPS info -->
            <header class="standard-work-header">
                <div class="title-section">
                    <input v-model="jobInstruction.title" 
                           class="title-input"
                           placeholder="Process Name">
                    <div class="meta-badges">
                        <span class="badge">Rev: {{ jobInstruction.revisionNumber }}</span>
                        <span class="badge">Takt: {{ jobInstruction.taktTime }}s</span>
                        <span class="badge">Cycle: {{ calculateTotalCycleTime() }}s</span>
                    </div>
                </div>
                <div class="actions">
                    <button @click="saveAsWorkflow" class="save-btn">
                        Save Standard Work
                    </button>
                </div>
            </header>
            
            <!-- Job Instruction Table -->
            <table class="job-instruction-table">
                <thead>
                    <tr>
                        <th>Step</th>
                        <th>Work Element</th>
                        <th>Procedure</th>
                        <th>Tool/MCP</th>
                        <th>Time</th>
                        <th>Quality</th>
                        <th>Key Points</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    <tr v-for="(step, index) in jobInstruction.steps" 
                        :key="step.stepNumber"
                        :class="getStepClass(step)">
                        
                        <!-- Step Number -->
                        <td>
                            <div class="step-number">{{ step.stepNumber }}</div>
                        </td>
                        
                        <!-- Work Element -->
                        <td>
                            <input v-model="step.workElement" 
                                   class="element-input"
                                   placeholder="Element name">
                            <select v-model="step.elementType" class="type-select">
                                <option value="setup">Setup</option>
                                <option value="value-add">Value-Add</option>
                                <option value="inspection">Inspection</option>
                                <option value="transport">Transport</option>
                                <option value="wait">Wait</option>
                            </select>
                        </td>
                        
                        <!-- Procedure -->
                        <td>
                            <div v-if="step.mcpServer" class="mcp-config">
                                <MCPServerConfig 
                                    :server="step.mcpServer"
                                    @update="updateMCPConfig(index, $event)" />
                            </div>
                            <div v-else class="procedure-list">
                                <ol>
                                    <li v-for="proc in step.procedure">{{ proc }}</li>
                                </ol>
                                <button @click="editProcedure(index)">Edit</button>
                            </div>
                        </td>
                        
                        <!-- Tool/MCP Server -->
                        <td>
                            <MCPServerSelector 
                                v-model="step.mcpServer"
                                @select="selectMCPServer(index, $event)" />
                        </td>
                        
                        <!-- Time -->
                        <td>
                            <div class="time-inputs">
                                <input v-model.number="step.manualTime" 
                                       type="number" 
                                       class="time-input manual"
                                       placeholder="Manual">
                                <input v-model.number="step.autoTime" 
                                       type="number" 
                                       class="time-input auto"
                                       placeholder="Auto">
                                <div class="total-time">
                                    {{ step.manualTime + step.autoTime }}s
                                </div>
                            </div>
                        </td>
                        
                        <!-- Quality Checks -->
                        <td>
                            <QualityCheckEditor 
                                v-model="step.qualityCheckPoints"
                                :isCritical="step.isCriticalGate" />
                        </td>
                        
                        <!-- Key Points -->
                        <td>
                            <KeyPointsEditor v-model="step.keyPoints" />
                        </td>
                        
                        <!-- Actions -->
                        <td>
                            <button @click="insertMCPStep(index)" title="Insert MCP">
                                +MCP
                            </button>
                            <button @click="duplicateStep(index)" title="Duplicate">
                                📋
                            </button>
                            <button @click="removeStep(index)" title="Delete">
                                🗑️
                            </button>
                        </td>
                    </tr>
                </tbody>
                <tfoot>
                    <tr>
                        <td colspan="4">
                            <button @click="addStep" class="add-step-btn">
                                + Add Step
                            </button>
                        </td>
                        <td>
                            <div class="total-time-summary">
                                Total: {{ calculateTotalCycleTime() }}s
                            </div>
                        </td>
                        <td colspan="3">
                            <div class="efficiency-metrics">
                                <span>Efficiency: {{ calculateEfficiency() }}%</span>
                                <span>Value-Add: {{ calculateValueAddTime() }}s</span>
                            </div>
                        </td>
                    </tr>
                </tfoot>
            </table>
            
            <!-- Andon Board -->
            <AndonBoard 
                :metrics="executionMetrics"
                :status="getProcessStatus()" />
        </div>
    `
};
```

---

## Component Implementations

### MCP Server Selector Component
```javascript
const MCPServerSelector = {
    props: ['modelValue'],
    emits: ['update:modelValue'],
    
    data() {
        return {
            availableServers: [],
            selectedServer: null,
            availableTools: []
        }
    },
    
    async mounted() {
        // Load available MCP servers
        const response = await axios.get('/mcp/servers');
        this.availableServers = response.data.servers;
    },
    
    watch: {
        selectedServer: async function(serverId) {
            if (serverId) {
                // Discover tools for selected server
                const response = await axios.get(`/mcp/servers/${serverId}/tools`);
                this.availableTools = response.data.tools;
            }
        }
    },
    
    template: `
        <div class="mcp-selector">
            <select v-model="selectedServer" 
                    @change="selectServer"
                    class="server-select">
                <option value="">No MCP</option>
                <optgroup v-for="category in groupedServers" 
                          :label="category.name">
                    <option v-for="server in category.servers" 
                            :value="server.id">
                        {{ server.name }}
                    </option>
                </optgroup>
            </select>
            
            <select v-if="selectedServer && availableTools.length" 
                    v-model="selectedTool"
                    @change="selectTool"
                    class="tool-select">
                <option value="">Select Tool</option>
                <option v-for="tool in availableTools" 
                        :value="tool.name">
                    {{ tool.name }}
                </option>
            </select>
            
            <div v-if="selectedServer" class="server-status">
                <span class="status-indicator" :class="serverStatus"></span>
                {{ serverStatusText }}
            </div>
        </div>
    `
};
```

### Quality Check Editor Component
```javascript
const QualityCheckEditor = {
    props: ['modelValue', 'isCritical'],
    emits: ['update:modelValue'],
    
    data() {
        return {
            checks: this.modelValue || [],
            showEditor: false
        }
    },
    
    methods: {
        addCheck() {
            this.checks.push({
                check: '',
                required: true,
                spcTracked: false
            });
        },
        
        removeCheck(index) {
            this.checks.splice(index, 1);
        },
        
        save() {
            this.$emit('update:modelValue', this.checks);
            this.showEditor = false;
        }
    },
    
    template: `
        <div class="quality-check-editor">
            <div class="check-summary" @click="showEditor = true">
                <span class="gate-type" :class="{ critical: isCritical }">
                    {{ isCritical ? 'Critical Gate' : 'QC Gate' }}
                </span>
                <span class="check-count">
                    {{ checks.length }} checks
                </span>
            </div>
            
            <div v-if="showEditor" class="editor-modal">
                <div class="editor-content">
                    <h3>Quality Check Points</h3>
                    
                    <div v-for="(check, index) in checks" 
                         :key="index"
                         class="check-item">
                        <input v-model="check.check" 
                               placeholder="Check description">
                        <label>
                            <input type="checkbox" 
                                   v-model="check.required">
                            Required
                        </label>
                        <label>
                            <input type="checkbox" 
                                   v-model="check.spcTracked">
                            Track in SPC
                        </label>
                        <button @click="removeCheck(index)">×</button>
                    </div>
                    
                    <button @click="addCheck">+ Add Check</button>
                    <button @click="save" class="save-btn">Save</button>
                </div>
            </div>
        </div>
    `
};
```

### Andon Board Component
```javascript
const AndonBoard = {
    props: ['metrics', 'status'],
    
    computed: {
        statusLight() {
            if (this.metrics.defectRate > 5) return 'red';
            if (this.metrics.defectRate > 2) return 'yellow';
            return 'green';
        },
        
        oee() {
            // Overall Equipment Effectiveness calculation
            const availability = 0.95;
            const performance = this.metrics.cycleTime / this.taktTime;
            const quality = 1 - (this.metrics.defectRate / 100);
            return (availability * performance * quality * 100).toFixed(1);
        }
    },
    
    template: `
        <div class="andon-board">
            <div class="status-section">
                <div class="status-light" :class="statusLight">
                    <span class="light-icon">●</span>
                    <span class="status-text">
                        {{ statusLight === 'green' ? 'Normal Operation' : 
                           statusLight === 'yellow' ? 'Attention Required' : 
                           'Stop & Fix' }}
                    </span>
                </div>
                
                <button v-if="statusLight !== 'green'" 
                        class="andon-button"
                        @click="pullAndon">
                    🚨 Call Supervisor
                </button>
            </div>
            
            <div class="metrics-display">
                <div class="metric-card">
                    <label>Output Today</label>
                    <div class="value">{{ metrics.dailyOutput || 0 }}</div>
                </div>
                
                <div class="metric-card">
                    <label>Defect Rate</label>
                    <div class="value" :class="getDefectClass()">
                        {{ metrics.defectRate || 0 }}%
                    </div>
                </div>
                
                <div class="metric-card">
                    <label>Cycle Time</label>
                    <div class="value">
                        {{ metrics.cycleTime || 0 }}s
                    </div>
                </div>
                
                <div class="metric-card">
                    <label>OEE</label>
                    <div class="value">{{ oee }}%</div>
                </div>
                
                <div class="metric-card">
                    <label>FPY</label>
                    <div class="value">
                        {{ metrics.firstPassYield || 0 }}%
                    </div>
                </div>
            </div>
            
            <div class="shift-info">
                <span>Shift: A</span>
                <span>Operator: {{ operatorName }}</span>
                <span>Last Update: {{ lastUpdate }}</span>
            </div>
        </div>
    `
};
```

---

## Migration Path

### Phase 1: Create New UI (Keep Old)
1. Create `job_instruction.html` alongside existing `builder.html`
2. Add toggle to switch between UIs
3. Both UIs work with same backend

### Phase 2: Test with Users
1. A/B test with different user groups
2. Collect feedback on TPS format
3. Iterate on design

### Phase 3: Full Migration
1. Make TPS format the default
2. Move old UI to "legacy" mode
3. Eventually deprecate drag-drop

---

## Backend Compatibility

The backend stays the same! The job instruction format is converted to the existing workflow format:

```python
def convert_job_instruction_to_workflow(job_instruction):
    """Convert TPS job instruction format to workflow format"""
    
    modules = []
    connections = []
    
    for i, step in enumerate(job_instruction['steps']):
        # Create module from step
        module = {
            'id': f"module_{step['stepNumber']}",
            'type': determine_module_type(step),
            'name': step['workElement'],
            'config': step.get('mcpServer', {}).get('config', {}),
            'position': {'x': 0, 'y': i * 100}  # Not used but required
        }
        
        # Add MCP server info if present
        if step.get('mcpServer'):
            module['config']['mcp_server'] = step['mcpServer']['id']
            module['config']['tool_name'] = step['mcpServer']['tool']
        
        modules.append(module)
        
        # Create connections (linear flow)
        if i < len(job_instruction['steps']) - 1:
            connections.append({
                'from_module_id': module['id'],
                'from_output': 'default',
                'to_module_id': f"module_{step['stepNumber'] + 1}",
                'to_input': 'default'
            })
    
    return {
        'name': job_instruction['title'],
        'modules': modules,
        'connections': connections
    }
```

---

## Benefits of This Approach

1. **No Backend Changes** - UI transformation only
2. **Familiar to TPS Users** - Looks like their daily work
3. **Better for Training** - Clear step-by-step instructions
4. **Audit-Ready** - Looks like ISO documentation
5. **Mobile-Friendly** - Works on tablets for floor use
6. **Metrics-Driven** - TPS metrics built in

This refactoring makes your platform the first "Digital Standard Work" platform for AI workflows!