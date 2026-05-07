# TPS-Inspired UI Design for AI Workflow Platform

## Design Philosophy: Digital Standard Work Instructions

Instead of drag-and-drop workflow builders, we're creating **digital standard work** that looks and feels like Toyota Production System job instructions. This will be instantly familiar to manufacturing, operations, and quality professionals.

---

## Core TPS Principles Applied to UI

### 1. **Standard Work (標準作業)**
- Sequential step-by-step instructions
- Clear work sequence with no ambiguity
- Takt time visible for each step
- Standard inventory (WIP limits)

### 2. **Visual Management (見える化)**
- Status visible at a glance
- Color-coded quality indicators
- Andon board for problems
- Real-time cycle time display

### 3. **Poka-Yoke (ポカヨケ)**
- Error-proofing in the UI
- Can't proceed until quality checks pass
- Clear warnings for out-of-spec conditions
- Automatic stops for defects

### 4. **Continuous Flow**
- One-piece flow visualization
- Pull system indicators
- Bottleneck identification
- WIP (Work In Progress) limits

---

## New Workflow Builder UI Design

### Main Layout: Job Instruction Sheet Format

```html
<!-- Replace current drag-drop canvas with this structure -->
<div class="job-instruction-container">
    <!-- Header: Standard Work Combination Sheet Style -->
    <header class="standard-work-header">
        <div class="work-info">
            <h1>Standard Work Instruction</h1>
            <div class="meta-info">
                <span>Process: Image Generation QC</span>
                <span>Takt Time: 45 seconds</span>
                <span>Cycle Time: 38 seconds</span>
                <span>Rev: 4.0</span>
                <span>Date: 2025-10-29</span>
            </div>
        </div>
        <div class="safety-quality">
            <div class="critical-points">
                ⚠️ Critical Quality Points: 3
                🛡️ Safety Points: 0
            </div>
        </div>
    </header>

    <!-- Work Instructions Table -->
    <table class="work-instruction-table">
        <thead>
            <tr>
                <th width="5%">Step #</th>
                <th width="20%">Work Element</th>
                <th width="25%">Standard Procedure</th>
                <th width="15%">Tool/MCP Server</th>
                <th width="10%">Time (sec)</th>
                <th width="10%">Quality Check</th>
                <th width="15%">Key Points</th>
            </tr>
        </thead>
        <tbody>
            <!-- Step 1 -->
            <tr class="work-step">
                <td class="step-number">1</td>
                <td class="work-element">
                    <strong>Initialize Batch</strong>
                    <span class="element-type">Setup</span>
                </td>
                <td class="procedure">
                    <ol>
                        <li>Set batch size (1-10 units)</li>
                        <li>Verify API keys loaded</li>
                        <li>Check server availability</li>
                    </ol>
                </td>
                <td class="tool">
                    <div class="mcp-server">
                        <img src="/icons/start.svg" width="20">
                        <span>System Init</span>
                    </div>
                </td>
                <td class="time">
                    <div class="time-bar">
                        <div class="manual-time">5</div>
                        <div class="auto-time">0</div>
                    </div>
                </td>
                <td class="quality-check">
                    <span class="qc-gate">Gate 1</span>
                    <ul>
                        <li>✓ Batch ≤ 10</li>
                        <li>✓ API active</li>
                    </ul>
                </td>
                <td class="key-points">
                    <span class="safety">-</span>
                    <span class="quality">⚠️ Max 10 per batch</span>
                    <span class="tip">💡 Smaller batches = faster QC</span>
                </td>
            </tr>

            <!-- Step 2 -->
            <tr class="work-step">
                <td class="step-number">2</td>
                <td class="work-element">
                    <strong>Generate Images</strong>
                    <span class="element-type">Value-Add</span>
                </td>
                <td class="procedure">
                    <div class="mcp-selector">
                        <label>Select MCP Server:</label>
                        <select class="mcp-dropdown">
                            <option>Replicate (SDXL)</option>
                            <option>Akool</option>
                            <option>DALL-E 3</option>
                        </select>
                    </div>
                    <textarea class="prompt-input" placeholder="Enter image prompt...">
a beautiful young woman smiling at the camera
                    </textarea>
                    <div class="parameters">
                        <label>Aspect: <select><option>1:1</option></select></label>
                        <label>Count: <input type="number" value="4" min="1" max="10"></label>
                    </div>
                </td>
                <td class="tool">
                    <div class="mcp-server active">
                        <img src="/icons/replicate.svg" width="20">
                        <span>Replicate MCP</span>
                        <div class="server-status">● Online</div>
                    </div>
                </td>
                <td class="time">
                    <div class="time-bar">
                        <div class="manual-time">3</div>
                        <div class="auto-time">15</div>
                    </div>
                </td>
                <td class="quality-check">
                    <span class="qc-gate">Auto-Check</span>
                    <ul>
                        <li>✓ API response OK</li>
                        <li>✓ Images received</li>
                    </ul>
                </td>
                <td class="key-points">
                    <span class="quality">⚠️ Verify prompt appropriate</span>
                    <span class="cost">💰 $0.012 per image</span>
                </td>
            </tr>

            <!-- Step 3: Human QC -->
            <tr class="work-step qc-step">
                <td class="step-number">3</td>
                <td class="work-element">
                    <strong>Quality Inspection</strong>
                    <span class="element-type">QC Gate</span>
                    <span class="human-step">👤 Human Required</span>
                </td>
                <td class="procedure">
                    <div class="qc-instruction">
                        <h4>Inspection Criteria:</h4>
                        <ol>
                            <li>Check image clarity (no blur)</li>
                            <li>Verify prompt adherence</li>
                            <li>Confirm no inappropriate content</li>
                            <li>Assess aesthetic quality</li>
                        </ol>
                        <div class="qc-actions">
                            <button class="pass-btn">✓ Pass</button>
                            <button class="fail-btn">✗ Fail</button>
                            <button class="rework-btn">↻ Rework</button>
                        </div>
                    </div>
                </td>
                <td class="tool">
                    <div class="mcp-server">
                        <img src="/icons/human.svg" width="20">
                        <span>Human QC</span>
                        <div class="spc-link">📊 SPC</div>
                    </div>
                </td>
                <td class="time">
                    <div class="time-bar">
                        <div class="manual-time">20</div>
                        <div class="auto-time">0</div>
                    </div>
                </td>
                <td class="quality-check critical">
                    <span class="qc-gate critical">Critical Gate</span>
                    <ul>
                        <li>⚠️ 100% inspection</li>
                        <li>⚠️ Document defects</li>
                        <li>⚠️ Calculate PPM</li>
                    </ul>
                </td>
                <td class="key-points">
                    <span class="quality critical">⚠️ No defects to customer</span>
                    <span class="tip">💡 Use comparison mode for A/B</span>
                </td>
            </tr>

            <!-- Step 4: Optional A/B Testing -->
            <tr class="work-step optional">
                <td class="step-number">4*</td>
                <td class="work-element">
                    <strong>A/B Comparison</strong>
                    <span class="element-type">Kaizen</span>
                    <span class="optional-badge">Optional</span>
                </td>
                <td class="procedure">
                    <div class="ab-test-setup">
                        <h4>Compare MCP Servers:</h4>
                        <div class="comparison-grid">
                            <div class="server-a">
                                <label>Server A:</label>
                                <select>
                                    <option>Replicate</option>
                                </select>
                            </div>
                            <div class="server-b">
                                <label>Server B:</label>
                                <select>
                                    <option>Akool</option>
                                </select>
                            </div>
                        </div>
                        <div class="comparison-criteria">
                            <label><input type="checkbox" checked> Quality</label>
                            <label><input type="checkbox" checked> Speed</label>
                            <label><input type="checkbox" checked> Cost</label>
                        </div>
                    </div>
                </td>
                <td class="tool">
                    <div class="mcp-server">
                        <img src="/icons/ab-test.svg" width="20">
                        <span>A/B Module</span>
                    </div>
                </td>
                <td class="time">
                    <div class="time-bar">
                        <div class="manual-time">10</div>
                        <div class="auto-time">30</div>
                    </div>
                </td>
                <td class="quality-check">
                    <span class="qc-gate">Data Gate</span>
                    <ul>
                        <li>📊 Collect metrics</li>
                        <li>📈 Update SPC</li>
                    </ul>
                </td>
                <td class="key-points">
                    <span class="kaizen">🔄 Continuous improvement</span>
                </td>
            </tr>

            <!-- Step 5: Store Assets -->
            <tr class="work-step">
                <td class="step-number">5</td>
                <td class="work-element">
                    <strong>Store Approved</strong>
                    <span class="element-type">Finish</span>
                </td>
                <td class="procedure">
                    <ol>
                        <li>Move approved to repository</li>
                        <li>Tag with metadata</li>
                        <li>Update inventory count</li>
                    </ol>
                </td>
                <td class="tool">
                    <div class="mcp-server">
                        <img src="/icons/database.svg" width="20">
                        <span>Asset Store</span>
                    </div>
                </td>
                <td class="time">
                    <div class="time-bar">
                        <div class="manual-time">0</div>
                        <div class="auto-time">2</div>
                    </div>
                </td>
                <td class="quality-check">
                    <span class="qc-gate">Final Check</span>
                    <ul>
                        <li>✓ Count verified</li>
                    </ul>
                </td>
                <td class="key-points">
                    <span class="tip">💡 Auto-archive after 30 days</span>
                </td>
            </tr>
        </tbody>
        <tfoot>
            <tr class="totals">
                <td colspan="4">Total Cycle Time:</td>
                <td class="time-total">
                    <div class="time-bar total">
                        <div class="manual-time">38 sec</div>
                        <div class="auto-time">47 sec</div>
                        <div class="total-time">85 sec</div>
                    </div>
                </td>
                <td colspan="2">
                    <div class="efficiency">
                        Efficiency: 84% | First Pass Yield: 92%
                    </div>
                </td>
            </tr>
        </tfoot>
    </table>

    <!-- Bottom Section: Andon Board -->
    <div class="andon-board">
        <div class="andon-status">
            <div class="status-light green">
                <span class="light">●</span>
                <span>Normal Operation</span>
            </div>
        </div>
        <div class="metrics-bar">
            <div class="metric">
                <label>Today's Output:</label>
                <span class="value">127 units</span>
            </div>
            <div class="metric">
                <label>Defect Rate:</label>
                <span class="value good">0.8%</span>
            </div>
            <div class="metric">
                <label>Avg Cycle Time:</label>
                <span class="value">82 sec</span>
            </div>
            <div class="metric">
                <label>OEE:</label>
                <span class="value">87%</span>
            </div>
        </div>
    </div>
</div>
```

---

## CSS Styling: TPS-Inspired Design

```css
/* Toyota Production System Inspired Styles */

.job-instruction-container {
    background: #f8f9fa;
    font-family: 'Inter', 'Toyota Type', sans-serif;
    max-width: 1400px;
    margin: 0 auto;
    padding: 20px;
}

/* Standard Work Header */
.standard-work-header {
    background: white;
    border: 2px solid #003f87; /* Toyota Blue */
    border-radius: 4px;
    padding: 15px;
    margin-bottom: 20px;
    display: flex;
    justify-content: space-between;
}

.work-info h1 {
    color: #003f87;
    font-size: 24px;
    font-weight: 600;
    margin: 0 0 10px 0;
}

.meta-info span {
    display: inline-block;
    margin-right: 20px;
    padding: 3px 8px;
    background: #e8f0f7;
    border-radius: 3px;
    font-size: 12px;
}

.critical-points {
    background: #fff3cd;
    border: 1px solid #ffc107;
    padding: 10px;
    border-radius: 4px;
}

/* Work Instruction Table */
.work-instruction-table {
    width: 100%;
    background: white;
    border-collapse: collapse;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.work-instruction-table thead {
    background: #003f87;
    color: white;
}

.work-instruction-table th {
    padding: 12px 8px;
    text-align: left;
    font-weight: 500;
    font-size: 13px;
    border-right: 1px solid rgba(255,255,255,0.2);
}

.work-instruction-table tbody tr {
    border-bottom: 1px solid #e0e0e0;
}

.work-instruction-table tbody tr:hover {
    background: #f5f8fa;
}

.work-step td {
    padding: 15px 8px;
    vertical-align: top;
}

/* Step Number Circle */
.step-number {
    background: #003f87;
    color: white;
    width: 30px;
    height: 30px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: bold;
}

.optional .step-number {
    background: #6c757d;
}

/* Work Element Types */
.work-element {
    font-weight: 500;
}

.element-type {
    display: block;
    font-size: 11px;
    color: #666;
    margin-top: 4px;
}

.human-step {
    background: #ffc107;
    color: #000;
    padding: 2px 6px;
    border-radius: 3px;
    font-size: 11px;
    margin-left: 5px;
}

/* Time Bars */
.time-bar {
    display: flex;
    flex-direction: column;
    gap: 2px;
}

.manual-time, .auto-time {
    padding: 3px 5px;
    font-size: 12px;
    text-align: center;
    border-radius: 2px;
}

.manual-time {
    background: #e3f2fd;
    color: #1976d2;
}

.auto-time {
    background: #e8f5e9;
    color: #388e3c;
}

.time-bar.total {
    flex-direction: row;
    gap: 5px;
}

.total-time {
    background: #003f87;
    color: white;
    padding: 5px 10px;
    font-weight: bold;
}

/* Quality Gates */
.qc-gate {
    display: inline-block;
    padding: 3px 8px;
    background: #4caf50;
    color: white;
    border-radius: 3px;
    font-size: 11px;
    font-weight: 500;
    margin-bottom: 5px;
}

.qc-gate.critical {
    background: #f44336;
}

.quality-check ul {
    margin: 5px 0;
    padding-left: 15px;
    font-size: 12px;
}

/* MCP Server Indicators */
.mcp-server {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 8px;
    border: 1px solid #ddd;
    border-radius: 4px;
    background: #f8f9fa;
}

.mcp-server.active {
    border-color: #4caf50;
    background: #e8f5e9;
}

.server-status {
    font-size: 10px;
    margin-top: 4px;
    color: #4caf50;
}

/* Key Points */
.key-points {
    font-size: 11px;
}

.key-points span {
    display: block;
    margin-bottom: 4px;
}

.quality.critical {
    color: #f44336;
    font-weight: 500;
}

.kaizen {
    color: #ff6f00;
}

/* QC Step Highlighting */
.qc-step {
    background: #fff8e1;
}

.qc-step:hover {
    background: #fff3d0;
}

/* Andon Board */
.andon-board {
    margin-top: 20px;
    padding: 15px;
    background: white;
    border: 2px solid #ddd;
    border-radius: 4px;
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.status-light {
    display: flex;
    align-items: center;
    gap: 10px;
    font-weight: 500;
}

.status-light.green .light {
    color: #4caf50;
    font-size: 24px;
}

.status-light.yellow .light {
    color: #ffc107;
    font-size: 24px;
}

.status-light.red .light {
    color: #f44336;
    font-size: 24px;
    animation: blink 1s infinite;
}

@keyframes blink {
    0%, 50%, 100% { opacity: 1; }
    25%, 75% { opacity: 0; }
}

.metrics-bar {
    display: flex;
    gap: 30px;
}

.metric {
    display: flex;
    flex-direction: column;
}

.metric label {
    font-size: 11px;
    color: #666;
    text-transform: uppercase;
}

.metric .value {
    font-size: 20px;
    font-weight: bold;
    color: #003f87;
}

.metric .value.good {
    color: #4caf50;
}

.metric .value.warning {
    color: #ffc107;
}

.metric .value.bad {
    color: #f44336;
}

/* Pass/Fail/Rework Buttons */
.qc-actions {
    margin-top: 10px;
    display: flex;
    gap: 10px;
}

.pass-btn {
    background: #4caf50;
    color: white;
    border: none;
    padding: 8px 16px;
    border-radius: 4px;
    cursor: pointer;
    font-weight: 500;
}

.fail-btn {
    background: #f44336;
    color: white;
    border: none;
    padding: 8px 16px;
    border-radius: 4px;
    cursor: pointer;
    font-weight: 500;
}

.rework-btn {
    background: #ff9800;
    color: white;
    border: none;
    padding: 8px 16px;
    border-radius: 4px;
    cursor: pointer;
    font-weight: 500;
}

/* Optional Step Styling */
.optional {
    opacity: 0.7;
    background: #f5f5f5;
}

.optional-badge {
    background: #6c757d;
    color: white;
    padding: 2px 6px;
    border-radius: 3px;
    font-size: 10px;
    margin-left: 5px;
}

/* MCP Selector */
.mcp-selector {
    margin-bottom: 10px;
}

.mcp-dropdown {
    width: 100%;
    padding: 8px;
    border: 1px solid #ddd;
    border-radius: 4px;
    font-size: 14px;
}

.prompt-input {
    width: 100%;
    min-height: 60px;
    padding: 8px;
    border: 1px solid #ddd;
    border-radius: 4px;
    font-size: 13px;
    font-family: inherit;
}

.parameters {
    margin-top: 10px;
    display: flex;
    gap: 15px;
}

.parameters label {
    font-size: 12px;
    display: flex;
    align-items: center;
    gap: 5px;
}

.parameters input,
.parameters select {
    padding: 4px;
    border: 1px solid #ddd;
    border-radius: 3px;
}

/* Dark Mode Support (Night Shift) */
@media (prefers-color-scheme: dark) {
    .job-instruction-container {
        background: #1a1a1a;
    }
    
    .work-instruction-table {
        background: #2a2a2a;
        color: #e0e0e0;
    }
    
    .work-instruction-table thead {
        background: #004080;
    }
    
    /* ... additional dark mode styles */
}
```

---

## Component Library: TPS Elements

### 1. Step Status Indicators
```jsx
// Step status following TPS visual management
const StepStatus = {
    NOT_STARTED: { icon: '○', color: '#gray' },
    IN_PROGRESS: { icon: '◐', color: '#blue' },
    WAITING_QC: { icon: '⏸', color: '#yellow' },
    COMPLETED: { icon: '●', color: '#green' },
    FAILED: { icon: '✕', color: '#red' },
    REWORK: { icon: '↻', color: '#orange' }
};
```

### 2. Takt Time Counter
```jsx
// Real-time takt time display
const TaktTimer = ({ targetTime, actualTime }) => {
    const status = actualTime <= targetTime ? 'on-time' : 'behind';
    return (
        <div className={`takt-timer ${status}`}>
            <div className="target">Target: {targetTime}s</div>
            <div className="actual">Actual: {actualTime}s</div>
            <div className="variance">{actualTime - targetTime}s</div>
        </div>
    );
};
```

### 3. Andon Cord (Problem Reporting)
```jsx
// Digital Andon cord for reporting issues
const AndonCord = ({ stepId, onPull }) => {
    return (
        <button 
            className="andon-cord"
            onClick={() => onPull(stepId)}
            title="Report a problem with this step"
        >
            🚨 Pull Andon
        </button>
    );
};
```

### 4. SPC Chart Mini
```jsx
// Inline SPC chart for quality metrics
const SPCMini = ({ data, ucl, lcl, target }) => {
    return (
        <div className="spc-mini">
            <svg width="100" height="40">
                {/* Render control chart */}
            </svg>
            <div className="spc-status">
                {isInControl(data, ucl, lcl) ? '✓ In Control' : '⚠️ Out of Control'}
            </div>
        </div>
    );
};
```

---

## Mobile/Tablet View (Gemba Walk)

For supervisors doing Gemba walks with tablets:

```css
@media (max-width: 768px) {
    .work-instruction-table {
        /* Convert to card layout */
        display: block;
    }
    
    .work-step {
        display: block;
        margin-bottom: 15px;
        padding: 15px;
        border: 1px solid #ddd;
        border-radius: 8px;
        background: white;
    }
    
    .step-number {
        float: left;
        margin-right: 10px;
    }
    
    /* Stack fields vertically */
    .work-step td {
        display: block;
        padding: 5px 0;
    }
}
```

---

## Benefits of TPS-Style UI

### For Operations Teams
- **Familiar Format** - Looks like standard work they already use
- **Clear Instructions** - No ambiguity in process steps
- **Visual Management** - Status visible at a glance
- **Quality Gates** - Built-in poka-yoke

### For Management
- **Metrics Visibility** - Takt time, cycle time, OEE
- **Problem Identification** - Andon system highlights issues
- **Continuous Improvement** - A/B testing built into Kaizen
- **Standardization** - Consistent work methods

### For Quality Teams
- **SPC Integration** - Control charts at each step
- **Traceability** - Every decision documented
- **First Pass Yield** - Tracked automatically
- **Defect Prevention** - Not just detection

---

## Implementation Notes

1. **Replace the drag-drop canvas** completely with this table format
2. **Keep the same backend** - Only UI changes needed
3. **MCP servers** appear as "tools" in the tool column
4. **Human QC steps** are highlighted as critical gates
5. **A/B testing** becomes an optional Kaizen step
6. **Real-time updates** show in the Andon board
7. **Mobile responsive** for tablet use on the floor

This design makes your AI workflow platform feel like a natural extension of existing Toyota Production System practices, making adoption much easier for manufacturing and operations teams who already think in terms of standard work, takt time, and continuous improvement.