# Sprint 6.1 Technical Instructions - Standard Work Enhancements

## Overview
Building on the successful Standard Work integration, this sprint focuses on making the TPS Builder fully functional and actionable. We'll add export capabilities, visual alerts, editing functionality, and A/B testing integration.

**Timeline:** 2 weeks  
**Priority Order:** Export → Andon Alerts → Editing → A/B Integration

---

## Priority 1: Export Functionality (2-3 days)

### 1.1 Backend API Endpoints

#### Add Export Endpoints to `main_workflow_db.py`

```python
# Add these imports at the top
from io import BytesIO
import json
from datetime import datetime
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter, landscape
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
import pandas as pd
import xlsxwriter

@app.get("/api/workflows/{workflow_id}/standard-work/export/pdf")
async def export_standard_work_pdf(
    workflow_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Export Standard Work as PDF"""
    
    # Get workflow and standard work data
    workflow = await get_workflow_by_id(workflow_id, db)
    standard_work = await generate_standard_work(workflow_id, db)
    metrics = await get_tps_metrics(workflow_id, period_days=7, db=db)
    
    # Create PDF buffer
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=landscape(letter))
    elements = []
    
    # Styles
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Title'],
        fontSize=20,
        textColor=colors.HexColor('#ff6b35'),
        spaceAfter=30
    )
    
    # Title
    title = Paragraph(f"{workflow.name} - Standard Work", title_style)
    elements.append(title)
    
    # Metadata
    meta_data = [
        ['Revision:', standard_work.get('revision', '4.0')],
        ['Date:', datetime.now().strftime('%Y-%m-%d')],
        ['Takt Time:', f"{metrics.get('taktTime', 45)}s"],
        ['Cycle Time:', f"{metrics.get('cycleTime', 0)}s"],
        ['OEE:', f"{metrics.get('oee', 0)}%"],
        ['First Pass Yield:', f"{metrics.get('firstPassYield', 0)}%"]
    ]
    
    meta_table = Table(meta_data, colWidths=[100, 150])
    meta_table.setStyle(TableStyle([
        ('TEXTCOLOR', (0, 0), (-1, -1), colors.HexColor('#ffffff')),
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#2a2a2a')),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('FONTNAME', (0, 0), (-1, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 12),
        ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#3a3a3a'))
    ]))
    elements.append(meta_table)
    elements.append(Spacer(1, 20))
    
    # Standard Work Steps Table
    table_data = [['Step #', 'Work Element', 'Procedure', 'Tool/MCP', 'Time (s)', 'Quality', 'Key Points']]
    
    for step in standard_work.get('steps', []):
        procedures = '\n'.join(step.get('procedure', []))
        quality_points = '\n'.join([qc['check'] for qc in step.get('qualityCheckPoints', [])])
        key_points_list = []
        if step.get('keyPoints'):
            for key, value in step['keyPoints'].items():
                key_points_list.append(f"{key}: {value}")
        key_points = '\n'.join(key_points_list)
        
        time_str = f"M:{step.get('manualTime', 0)} A:{step.get('autoTime', 0)}"
        
        row = [
            str(step.get('stepNumber', '')),
            step.get('workElement', ''),
            procedures,
            step.get('toolMcp', 'System'),
            time_str,
            quality_points,
            key_points
        ]
        table_data.append(row)
    
    # Add total row
    total_cycle_time = sum(
        s.get('manualTime', 0) + s.get('autoTime', 0) 
        for s in standard_work.get('steps', [])
    )
    table_data.append(['', 'TOTAL', '', '', f"{total_cycle_time}s", '', ''])
    
    # Create table
    step_table = Table(table_data, colWidths=[40, 100, 150, 80, 60, 100, 100])
    step_table.setStyle(TableStyle([
        # Header row
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#ff6b35')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 12),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        
        # Data rows
        ('BACKGROUND', (0, 1), (-1, -2), colors.HexColor('#2a2a2a')),
        ('TEXTCOLOR', (0, 1), (-1, -1), colors.whitesmoke),
        ('ALIGN', (0, 0), (0, -1), 'CENTER'),
        ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 1), (-1, -1), 9),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#3a3a3a')),
        
        # Total row
        ('BACKGROUND', (0, -1), (-1, -1), colors.HexColor('#3a3a3a')),
        ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'),
    ]))
    
    # Highlight critical steps
    for idx, step in enumerate(standard_work.get('steps', [])):
        if step.get('isCriticalGate'):
            step_table.setStyle(TableStyle([
                ('BACKGROUND', (0, idx+1), (-1, idx+1), colors.HexColor('#ff444444'))
            ]))
        elif step.get('isHumanRequired'):
            step_table.setStyle(TableStyle([
                ('BACKGROUND', (0, idx+1), (-1, idx+1), colors.HexColor('#ffaa0044'))
            ]))
    
    elements.append(step_table)
    
    # Build PDF
    doc.build(elements)
    
    # Return PDF
    buffer.seek(0)
    return Response(
        content=buffer.read(),
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename=standard_work_{workflow_id}.pdf"
        }
    )

@app.get("/api/workflows/{workflow_id}/standard-work/export/excel")
async def export_standard_work_excel(
    workflow_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Export Standard Work as Excel"""
    
    # Get data
    workflow = await get_workflow_by_id(workflow_id, db)
    standard_work = await generate_standard_work(workflow_id, db)
    metrics = await get_tps_metrics(workflow_id, period_days=7, db=db)
    
    # Create Excel buffer
    buffer = BytesIO()
    
    # Create workbook
    with xlsxwriter.Workbook(buffer) as workbook:
        # Formats
        header_format = workbook.add_format({
            'bold': True,
            'bg_color': '#ff6b35',
            'font_color': 'white',
            'border': 1,
            'align': 'center',
            'valign': 'vcenter'
        })
        
        cell_format = workbook.add_format({
            'border': 1,
            'align': 'left',
            'valign': 'top',
            'text_wrap': True
        })
        
        critical_format = workbook.add_format({
            'bg_color': '#ffcccc',
            'border': 1,
            'align': 'left',
            'valign': 'top'
        })
        
        human_format = workbook.add_format({
            'bg_color': '#ffe6cc',
            'border': 1,
            'align': 'left',
            'valign': 'top'
        })
        
        # Standard Work Sheet
        worksheet = workbook.add_worksheet('Standard Work')
        
        # Title and metadata
        worksheet.merge_range('A1:G1', f"{workflow.name} - Standard Work", 
                            workbook.add_format({'bold': True, 'font_size': 16, 'font_color': '#ff6b35'}))
        
        # Metrics
        worksheet.write('A3', 'Revision:', workbook.add_format({'bold': True}))
        worksheet.write('B3', standard_work.get('revision', '4.0'))
        worksheet.write('C3', 'Takt Time:', workbook.add_format({'bold': True}))
        worksheet.write('D3', f"{metrics.get('taktTime', 45)}s")
        worksheet.write('E3', 'Cycle Time:', workbook.add_format({'bold': True}))
        worksheet.write('F3', f"{metrics.get('cycleTime', 0)}s")
        
        worksheet.write('A4', 'OEE:', workbook.add_format({'bold': True}))
        worksheet.write('B4', f"{metrics.get('oee', 0)}%")
        worksheet.write('C4', 'FPY:', workbook.add_format({'bold': True}))
        worksheet.write('D4', f"{metrics.get('firstPassYield', 0)}%")
        worksheet.write('E4', 'Defect Rate:', workbook.add_format({'bold': True}))
        worksheet.write('F4', f"{metrics.get('defectRate', 0)}%")
        
        # Headers
        headers = ['Step #', 'Work Element', 'Procedure', 'Tool/MCP', 'Manual Time', 'Auto Time', 'Total Time', 'Quality Points', 'Key Points']
        for col, header in enumerate(headers):
            worksheet.write(5, col, header, header_format)
        
        # Data
        row_num = 6
        total_manual = 0
        total_auto = 0
        
        for step in standard_work.get('steps', []):
            # Determine format based on step type
            if step.get('isCriticalGate'):
                fmt = critical_format
            elif step.get('isHumanRequired'):
                fmt = human_format
            else:
                fmt = cell_format
            
            # Write data
            worksheet.write(row_num, 0, step.get('stepNumber', ''), fmt)
            worksheet.write(row_num, 1, step.get('workElement', ''), fmt)
            worksheet.write(row_num, 2, '\n'.join(step.get('procedure', [])), fmt)
            worksheet.write(row_num, 3, step.get('toolMcp', 'System'), fmt)
            worksheet.write(row_num, 4, step.get('manualTime', 0), fmt)
            worksheet.write(row_num, 5, step.get('autoTime', 0), fmt)
            worksheet.write(row_num, 6, step.get('manualTime', 0) + step.get('autoTime', 0), fmt)
            
            quality_points = '\n'.join([qc['check'] for qc in step.get('qualityCheckPoints', [])])
            worksheet.write(row_num, 7, quality_points, fmt)
            
            key_points = []
            if step.get('keyPoints'):
                for key, value in step['keyPoints'].items():
                    key_points.append(f"{key}: {value}")
            worksheet.write(row_num, 8, '\n'.join(key_points), fmt)
            
            total_manual += step.get('manualTime', 0)
            total_auto += step.get('autoTime', 0)
            row_num += 1
        
        # Totals row
        total_format = workbook.add_format({'bold': True, 'bg_color': '#e0e0e0', 'border': 1})
        worksheet.write(row_num, 0, '', total_format)
        worksheet.write(row_num, 1, 'TOTAL', total_format)
        worksheet.write(row_num, 2, '', total_format)
        worksheet.write(row_num, 3, '', total_format)
        worksheet.write(row_num, 4, total_manual, total_format)
        worksheet.write(row_num, 5, total_auto, total_format)
        worksheet.write(row_num, 6, total_manual + total_auto, total_format)
        worksheet.write(row_num, 7, '', total_format)
        worksheet.write(row_num, 8, '', total_format)
        
        # Set column widths
        worksheet.set_column('A:A', 8)   # Step #
        worksheet.set_column('B:B', 20)  # Work Element
        worksheet.set_column('C:C', 40)  # Procedure
        worksheet.set_column('D:D', 15)  # Tool/MCP
        worksheet.set_column('E:G', 12)  # Times
        worksheet.set_column('H:H', 30)  # Quality
        worksheet.set_column('I:I', 30)  # Key Points
        
        # Metrics Sheet
        metrics_sheet = workbook.add_worksheet('TPS Metrics')
        
        # Add metrics data
        metrics_headers = ['Metric', 'Value', 'Target', 'Status']
        for col, header in enumerate(metrics_headers):
            metrics_sheet.write(0, col, header, header_format)
        
        metrics_data = [
            ['Takt Time', f"{metrics.get('taktTime', 45)}s", f"{metrics.get('taktTime', 45)}s", 'Target'],
            ['Cycle Time', f"{metrics.get('cycleTime', 0)}s", f"{metrics.get('taktTime', 45)}s", 
             'OK' if metrics.get('cycleTime', 0) <= metrics.get('taktTime', 45) else 'EXCEEDED'],
            ['OEE', f"{metrics.get('oee', 0)}%", '85%', 
             'Good' if metrics.get('oee', 0) >= 85 else 'Needs Improvement'],
            ['First Pass Yield', f"{metrics.get('firstPassYield', 0)}%", '95%',
             'Good' if metrics.get('firstPassYield', 0) >= 95 else 'Below Target'],
            ['Defect Rate', f"{metrics.get('defectRate', 0)}%", '<2%',
             'Good' if metrics.get('defectRate', 0) < 2 else 'High']
        ]
        
        for idx, row_data in enumerate(metrics_data):
            for col, value in enumerate(row_data):
                if col == 3:  # Status column
                    if value in ['EXCEEDED', 'High']:
                        fmt = workbook.add_format({'font_color': 'red', 'bold': True})
                    elif value in ['Below Target', 'Needs Improvement']:
                        fmt = workbook.add_format({'font_color': '#ff9900', 'bold': True})
                    else:
                        fmt = workbook.add_format({'font_color': 'green', 'bold': True})
                    metrics_sheet.write(idx + 1, col, value, fmt)
                else:
                    metrics_sheet.write(idx + 1, col, value)
        
        metrics_sheet.set_column('A:D', 20)
    
    # Return Excel file
    buffer.seek(0)
    return Response(
        content=buffer.read(),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={
            "Content-Disposition": f"attachment; filename=standard_work_{workflow_id}.xlsx"
        }
    )
```

### 1.2 Frontend Integration (tps-builder.html)

Add export buttons to the TPS Builder page:

```javascript
// Add to the data() section of your Vue app
exportFormats: ['pdf', 'excel'],
isExporting: false,
exportError: null,

// Add to methods section
async exportStandardWork(format) {
    if (!this.selectedWorkflowId) {
        alert('Please select a workflow first');
        return;
    }
    
    this.isExporting = true;
    this.exportError = null;
    
    try {
        const response = await fetch(
            `/api/workflows/${this.selectedWorkflowId}/standard-work/export/${format}`,
            {
                method: 'GET',
                headers: {
                    'Accept': format === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
                }
            }
        );
        
        if (!response.ok) {
            throw new Error(`Export failed: ${response.statusText}`);
        }
        
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = `standard_work_${this.selectedWorkflowId}.${format === 'pdf' ? 'pdf' : 'xlsx'}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        
        // Show success message
        this.showToast(`Standard Work exported as ${format.toUpperCase()}`, 'success');
        
    } catch (error) {
        console.error('Export error:', error);
        this.exportError = error.message;
        this.showToast(`Export failed: ${error.message}`, 'error');
    } finally {
        this.isExporting = false;
    }
},

showToast(message, type = 'info') {
    // Create toast notification
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    toast.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: ${type === 'success' ? '#4caf50' : '#f44336'};
        color: white;
        padding: 12px 24px;
        border-radius: 4px;
        z-index: 9999;
    `;
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.remove();
    }, 3000);
}
```

Add export buttons to the HTML template:

```html
<!-- Add this below the workflow selector dropdown -->
<div class="export-buttons" v-if="selectedWorkflowId">
    <button @click="exportStandardWork('pdf')" 
            :disabled="isExporting" 
            class="btn-export btn-pdf">
        <i class="fa fa-file-pdf-o"></i>
        {{ isExporting ? 'Exporting...' : 'Export PDF' }}
    </button>
    <button @click="exportStandardWork('excel')" 
            :disabled="isExporting" 
            class="btn-export btn-excel">
        <i class="fa fa-file-excel-o"></i>
        {{ isExporting ? 'Exporting...' : 'Export Excel' }}
    </button>
</div>

<!-- Add CSS -->
<style>
.export-buttons {
    display: inline-flex;
    gap: 10px;
    margin-left: auto;
}

.btn-export {
    padding: 8px 16px;
    border-radius: 4px;
    border: none;
    cursor: pointer;
    font-size: 14px;
    display: flex;
    align-items: center;
    gap: 8px;
    transition: all 0.3s ease;
}

.btn-pdf {
    background: #dc3545;
    color: white;
}

.btn-pdf:hover {
    background: #c82333;
}

.btn-excel {
    background: #28a745;
    color: white;
}

.btn-excel:hover {
    background: #218838;
}

.btn-export:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}
</style>
```

---

## Priority 2: Visual Andon Alerts (2 days)

### 2.1 Add Andon Component to tps-builder.html

```javascript
// Add to data()
andonStatus: 'green', // 'green', 'yellow', 'red'
andonMessage: 'Normal Operation',
showAndonDetails: false,
andonIssues: [],

// Add to computed properties
computed: {
    // Calculate Andon status based on metrics
    calculateAndonStatus() {
        const issues = [];
        let status = 'green';
        
        // Check cycle time vs takt time
        if (this.totalCycleTime > this.metrics.taktTime) {
            status = 'red';
            issues.push({
                type: 'critical',
                message: `Cycle time (${this.totalCycleTime}s) exceeds Takt time (${this.metrics.taktTime}s)`,
                action: 'Reduce cycle time or increase Takt time'
            });
        } else if (this.totalCycleTime > this.metrics.taktTime * 0.9) {
            if (status !== 'red') status = 'yellow';
            issues.push({
                type: 'warning',
                message: `Cycle time approaching Takt time limit (90% utilized)`,
                action: 'Monitor and optimize workflow'
            });
        }
        
        // Check defect rate
        if (this.metrics.defectRate > 5) {
            status = 'red';
            issues.push({
                type: 'critical',
                message: `Defect rate (${this.metrics.defectRate}%) exceeds 5% threshold`,
                action: 'Investigate quality issues immediately'
            });
        } else if (this.metrics.defectRate > 2) {
            if (status !== 'red') status = 'yellow';
            issues.push({
                type: 'warning',
                message: `Defect rate (${this.metrics.defectRate}%) above target`,
                action: 'Review QC processes'
            });
        }
        
        // Check first pass yield
        if (this.metrics.firstPassYield < 90) {
            status = 'red';
            issues.push({
                type: 'critical',
                message: `First Pass Yield (${this.metrics.firstPassYield}%) below 90%`,
                action: 'Stop and fix quality issues'
            });
        } else if (this.metrics.firstPassYield < 95) {
            if (status !== 'red') status = 'yellow';
            issues.push({
                type: 'warning',
                message: `First Pass Yield (${this.metrics.firstPassYield}%) below target`,
                action: 'Improve quality controls'
            });
        }
        
        // Check OEE
        if (this.metrics.oee < 65) {
            if (status === 'green') status = 'yellow';
            issues.push({
                type: 'warning',
                message: `OEE (${this.metrics.oee}%) needs improvement`,
                action: 'Analyze availability, performance, and quality'
            });
        }
        
        this.andonStatus = status;
        this.andonIssues = issues;
        this.updateAndonMessage();
        
        return status;
    },
    
    totalCycleTime() {
        return this.standardWorkSteps.reduce((total, step) => {
            return total + (step.manualTime || 0) + (step.autoTime || 0);
        }, 0);
    }
},

// Add to methods
updateAndonMessage() {
    const messages = {
        'green': 'Normal Operation - All metrics within target',
        'yellow': `Attention Required - ${this.andonIssues.filter(i => i.type === 'warning').length} warning(s)`,
        'red': `Stop & Fix - ${this.andonIssues.filter(i => i.type === 'critical').length} critical issue(s)`
    };
    this.andonMessage = messages[this.andonStatus];
},

pullAndon() {
    // Send notification to supervisor/team
    const andonData = {
        workflowId: this.selectedWorkflowId,
        workflowName: this.workflowName,
        status: this.andonStatus,
        issues: this.andonIssues,
        metrics: {
            cycleTime: this.totalCycleTime,
            taktTime: this.metrics.taktTime,
            oee: this.metrics.oee,
            firstPassYield: this.metrics.firstPassYield,
            defectRate: this.metrics.defectRate
        },
        timestamp: new Date().toISOString()
    };
    
    // In production, this would send to a notification service
    console.log('Andon pulled:', andonData);
    
    // For now, show alert
    alert(`Andon Alert!\n\nStatus: ${this.andonStatus.toUpperCase()}\n${this.andonMessage}\n\nSupervisor has been notified.`);
    
    // Log to backend (optional)
    fetch('/api/andon/pull', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(andonData)
    });
},

// Add to watch
watch: {
    metrics: {
        handler() {
            this.calculateAndonStatus();
        },
        deep: true
    },
    standardWorkSteps: {
        handler() {
            this.calculateAndonStatus();
        },
        deep: true
    }
}
```

### 2.2 Add Andon Visual Component to HTML

```html
<!-- Add this right after the metrics cards section -->
<div class="andon-board" :class="'andon-' + andonStatus">
    <div class="andon-light-container">
        <div class="andon-light" :class="andonStatus">
            <div class="light-bulb"></div>
            <div class="light-glow"></div>
        </div>
        <div class="andon-status-text">{{ andonMessage }}</div>
    </div>
    
    <div class="andon-actions">
        <button v-if="andonStatus !== 'green'" 
                @click="showAndonDetails = !showAndonDetails"
                class="btn-details">
            <i :class="showAndonDetails ? 'fa fa-chevron-up' : 'fa fa-chevron-down'"></i>
            {{ showAndonDetails ? 'Hide' : 'View' }} Issues
        </button>
        
        <button v-if="andonStatus === 'red'" 
                @click="pullAndon"
                class="btn-andon-pull">
            <i class="fa fa-bell"></i>
            Pull Andon Cord
        </button>
    </div>
    
    <!-- Andon Details Panel -->
    <transition name="slide">
        <div v-if="showAndonDetails && andonIssues.length > 0" class="andon-details">
            <div v-for="issue in andonIssues" 
                 :key="issue.message"
                 class="andon-issue"
                 :class="'issue-' + issue.type">
                <div class="issue-icon">
                    <i :class="issue.type === 'critical' ? 'fa fa-exclamation-circle' : 'fa fa-warning'"></i>
                </div>
                <div class="issue-content">
                    <div class="issue-message">{{ issue.message }}</div>
                    <div class="issue-action">Action: {{ issue.action }}</div>
                </div>
            </div>
        </div>
    </transition>
</div>

<!-- Add CSS for Andon -->
<style>
.andon-board {
    background: #2a2a2a;
    border-radius: 8px;
    padding: 20px;
    margin: 20px 0;
    transition: all 0.3s ease;
}

.andon-board.andon-yellow {
    border: 2px solid #ffaa00;
    background: rgba(255, 170, 0, 0.05);
}

.andon-board.andon-red {
    border: 2px solid #ff4444;
    background: rgba(255, 68, 68, 0.05);
    animation: pulse 2s infinite;
}

.andon-light-container {
    display: flex;
    align-items: center;
    gap: 20px;
    margin-bottom: 15px;
}

.andon-light {
    width: 60px;
    height: 60px;
    border-radius: 50%;
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
}

.andon-light.green {
    background: radial-gradient(circle, #00ff00 0%, #00aa00 100%);
    box-shadow: 0 0 30px #00ff00;
}

.andon-light.yellow {
    background: radial-gradient(circle, #ffff00 0%, #ffaa00 100%);
    box-shadow: 0 0 30px #ffaa00;
    animation: blink 2s infinite;
}

.andon-light.red {
    background: radial-gradient(circle, #ff6666 0%, #ff0000 100%);
    box-shadow: 0 0 40px #ff0000;
    animation: blink 0.5s infinite;
}

@keyframes blink {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.3; }
}

@keyframes pulse {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.02); }
}

.andon-status-text {
    font-size: 18px;
    font-weight: bold;
    color: #fff;
}

.andon-actions {
    display: flex;
    gap: 10px;
}

.btn-andon-pull {
    background: #ff4444;
    color: white;
    border: none;
    padding: 10px 20px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 16px;
    display: flex;
    align-items: center;
    gap: 8px;
    transition: all 0.3s ease;
}

.btn-andon-pull:hover {
    background: #cc0000;
    transform: scale(1.05);
}

.andon-details {
    margin-top: 20px;
    padding: 15px;
    background: #1a1a1a;
    border-radius: 4px;
}

.andon-issue {
    display: flex;
    gap: 15px;
    margin-bottom: 15px;
    padding: 10px;
    border-radius: 4px;
}

.issue-critical {
    background: rgba(255, 68, 68, 0.1);
    border-left: 3px solid #ff4444;
}

.issue-warning {
    background: rgba(255, 170, 0, 0.1);
    border-left: 3px solid #ffaa00;
}

.issue-icon {
    font-size: 24px;
}

.issue-critical .issue-icon {
    color: #ff4444;
}

.issue-warning .issue-icon {
    color: #ffaa00;
}

.issue-message {
    font-weight: bold;
    margin-bottom: 5px;
}

.issue-action {
    color: #888;
    font-style: italic;
}
</style>
```

---

## Priority 3: Bidirectional Editing (3-4 days)

### 3.1 Backend API for Updating Steps

```python
@app.put("/api/standard-work/steps/{step_id}")
async def update_standard_work_step(
    step_id: str,
    step_update: dict,
    db: AsyncSession = Depends(get_db)
):
    """Update individual standard work step times and details"""
    
    # This would update the workflow module config with new times
    # For now, we'll store in a separate table
    
    # Update or create StandardWorkOverride
    override = await db.query(StandardWorkOverride).filter_by(
        module_id=step_id
    ).first()
    
    if not override:
        override = StandardWorkOverride(
            id=f"override_{uuid.uuid4().hex[:8]}",
            module_id=step_id,
            workflow_id=step_update.get('workflow_id')
        )
        db.add(override)
    
    # Update fields
    if 'manualTime' in step_update:
        override.manual_time = step_update['manualTime']
    if 'autoTime' in step_update:
        override.auto_time = step_update['autoTime']
    if 'procedure' in step_update:
        override.procedure = step_update['procedure']
    if 'keyPoints' in step_update:
        override.key_points = step_update['keyPoints']
    
    override.updated_at = datetime.utcnow()
    
    await db.commit()
    
    return {"success": True, "message": "Step updated successfully"}

@app.post("/api/workflows/{workflow_id}/standard-work/sync-to-builder")
async def sync_standard_work_to_builder(
    workflow_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Sync Standard Work changes back to workflow builder"""
    
    # Get all overrides for this workflow
    overrides = await db.query(StandardWorkOverride).filter_by(
        workflow_id=workflow_id
    ).all()
    
    # Update workflow modules with override values
    workflow = await get_workflow_by_id(workflow_id, db)
    
    for module in workflow.modules:
        override = next((o for o in overrides if o.module_id == module.id), None)
        if override:
            # Update module config with override values
            if not module.config:
                module.config = {}
            
            module.config['manualTime'] = override.manual_time
            module.config['autoTime'] = override.auto_time
            
            if override.procedure:
                module.config['procedure'] = override.procedure
            if override.key_points:
                module.config['keyPoints'] = override.key_points
    
    await db.commit()
    
    return {"success": True, "syncedModules": len(overrides)}
```

### 3.2 Frontend Inline Editing

```javascript
// Add to data()
editingStep: null,
editingField: null,
originalValue: null,
unsavedChanges: false,

// Add to methods
enableEditing(step, field) {
    // Save current state
    this.editingStep = step;
    this.editingField = field;
    
    // Store original value for cancel
    if (field === 'manualTime' || field === 'autoTime') {
        this.originalValue = step[field];
    } else if (field === 'procedure') {
        this.originalValue = [...step.procedure];
    } else if (field === 'keyPoints') {
        this.originalValue = {...step.keyPoints};
    }
    
    // Focus the input
    this.$nextTick(() => {
        const input = document.querySelector(`#edit-${step.stepNumber}-${field}`);
        if (input) {
            input.focus();
            if (input.select) input.select();
        }
    });
},

async saveStepEdit(step, field) {
    try {
        const updateData = {
            workflow_id: this.selectedWorkflowId,
            [field]: step[field]
        };
        
        const response = await fetch(`/api/standard-work/steps/${step.moduleId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updateData)
        });
        
        if (!response.ok) {
            throw new Error('Failed to update step');
        }
        
        this.unsavedChanges = true;
        this.editingStep = null;
        this.editingField = null;
        
        // Recalculate metrics
        this.calculateTotalCycleTime();
        this.calculateAndonStatus();
        
        this.showToast('Step updated successfully', 'success');
        
    } catch (error) {
        console.error('Error updating step:', error);
        this.showToast('Failed to update step', 'error');
        
        // Restore original value
        if (field === 'manualTime' || field === 'autoTime') {
            step[field] = this.originalValue;
        }
    }
},

cancelEdit(step, field) {
    // Restore original value
    if (field === 'manualTime' || field === 'autoTime') {
        step[field] = this.originalValue;
    } else if (field === 'procedure') {
        step.procedure = this.originalValue;
    } else if (field === 'keyPoints') {
        step.keyPoints = this.originalValue;
    }
    
    this.editingStep = null;
    this.editingField = null;
},

async syncToBuilder() {
    if (!this.unsavedChanges) {
        this.showToast('No changes to sync', 'info');
        return;
    }
    
    try {
        const response = await fetch(
            `/api/workflows/${this.selectedWorkflowId}/standard-work/sync-to-builder`,
            { method: 'POST' }
        );
        
        if (!response.ok) {
            throw new Error('Sync failed');
        }
        
        const result = await response.json();
        this.unsavedChanges = false;
        this.showToast(`Synced ${result.syncedModules} modules to Builder`, 'success');
        
    } catch (error) {
        console.error('Sync error:', error);
        this.showToast('Failed to sync to Builder', 'error');
    }
},

// Add keyboard shortcuts
handleKeyPress(event, step, field) {
    if (event.key === 'Enter') {
        this.saveStepEdit(step, field);
    } else if (event.key === 'Escape') {
        this.cancelEdit(step, field);
    }
}
```

### 3.3 Update HTML for Inline Editing

```html
<!-- Update time cells to be editable -->
<td class="time-cell">
    <div v-if="editingStep !== step || editingField !== 'manualTime'" 
         @dblclick="enableEditing(step, 'manualTime')"
         class="time-value editable">
        M: {{ step.manualTime }}s
    </div>
    <input v-else
           :id="'edit-' + step.stepNumber + '-manualTime'"
           v-model.number="step.manualTime"
           @blur="saveStepEdit(step, 'manualTime')"
           @keydown="handleKeyPress($event, step, 'manualTime')"
           type="number"
           min="0"
           class="time-input">
    
    <div v-if="editingStep !== step || editingField !== 'autoTime'"
         @dblclick="enableEditing(step, 'autoTime')"
         class="time-value editable">
        A: {{ step.autoTime }}s
    </div>
    <input v-else
           :id="'edit-' + step.stepNumber + '-autoTime'"
           v-model.number="step.autoTime"
           @blur="saveStepEdit(step, 'autoTime')"
           @keydown="handleKeyPress($event, step, 'autoTime')"
           type="number"
           min="0"
           class="time-input">
    
    <div class="total-time">Total: {{ step.manualTime + step.autoTime }}s</div>
</td>

<!-- Add sync button if there are unsaved changes -->
<div v-if="unsavedChanges" class="sync-bar">
    <span class="sync-message">
        <i class="fa fa-info-circle"></i>
        You have unsaved changes in Standard Work
    </span>
    <button @click="syncToBuilder" class="btn-sync">
        <i class="fa fa-refresh"></i>
        Sync to Builder
    </button>
</div>

<!-- CSS for editing -->
<style>
.editable {
    cursor: pointer;
    padding: 4px;
    border-radius: 2px;
    transition: background 0.2s;
}

.editable:hover {
    background: rgba(255, 107, 53, 0.1);
}

.time-input {
    width: 60px;
    padding: 2px 4px;
    background: #1a1a1a;
    border: 1px solid #ff6b35;
    color: white;
    border-radius: 2px;
}

.sync-bar {
    position: fixed;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%);
    background: #2a2a2a;
    border: 1px solid #ff6b35;
    border-radius: 8px;
    padding: 15px 20px;
    display: flex;
    align-items: center;
    gap: 20px;
    z-index: 1000;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
}

.sync-message {
    color: #ffaa00;
}

.btn-sync {
    background: #ff6b35;
    color: white;
    border: none;
    padding: 8px 16px;
    border-radius: 4px;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 8px;
}

.btn-sync:hover {
    background: #ff8855;
}
</style>
```

---

## Priority 4: A/B Testing Integration (3 days)

### 4.1 Backend API for A/B Test Results

```python
@app.get("/api/workflows/{workflow_id}/ab-test-results")
async def get_ab_test_results(
    workflow_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Get A/B test results for workflow modules"""
    
    # Query execution data for A/B testing modules
    executions = await db.query(WorkflowExecution).filter_by(
        workflow_id=workflow_id
    ).order_by(WorkflowExecution.started_at.desc()).limit(10).all()
    
    ab_results = {}
    
    for execution in executions:
        if execution.execution_data:
            module_outputs = execution.execution_data.get('module_outputs', {})
            
            for module_id, output in module_outputs.items():
                if output.get('type') == 'ab_testing':
                    if module_id not in ab_results:
                        ab_results[module_id] = {
                            'tests': [],
                            'winner': None,
                            'avgCostSavings': 0,
                            'totalTests': 0
                        }
                    
                    ab_results[module_id]['tests'].append({
                        'date': execution.started_at.isoformat(),
                        'winner': output.get('winner'),
                        'costSavings': output.get('costSavings', 0),
                        'participants': output.get('participants', []),
                        'metrics': output.get('metrics', {})
                    })
    
    # Calculate aggregates
    for module_id, data in ab_results.items():
        if data['tests']:
            # Determine most common winner
            winners = [t['winner'] for t in data['tests'] if t['winner']]
            if winners:
                data['winner'] = max(set(winners), key=winners.count)
            
            # Calculate average cost savings
            savings = [t['costSavings'] for t in data['tests'] if t['costSavings']]
            if savings:
                data['avgCostSavings'] = sum(savings) / len(savings)
            
            data['totalTests'] = len(data['tests'])
    
    return ab_results
```

### 4.2 Frontend A/B Test Display

```javascript
// Add to data()
abTestResults: {},
showAbDetails: {},

// Add to methods
async loadAbTestResults() {
    if (!this.selectedWorkflowId) return;
    
    try {
        const response = await fetch(`/api/workflows/${this.selectedWorkflowId}/ab-test-results`);
        if (response.ok) {
            this.abTestResults = await response.json();
            
            // Update steps with A/B test data
            this.standardWorkSteps.forEach(step => {
                if (this.abTestResults[step.moduleId]) {
                    step.abTestData = this.abTestResults[step.moduleId];
                }
            });
        }
    } catch (error) {
        console.error('Error loading A/B test results:', error);
    }
},

toggleAbDetails(stepId) {
    this.$set(this.showAbDetails, stepId, !this.showAbDetails[stepId]);
}
```

### 4.3 Update Standard Work Table for A/B Testing

```html
<!-- Add A/B test indicator to relevant steps -->
<tr v-for="step in standardWorkSteps" :key="step.stepNumber">
    <!-- ... existing columns ... -->
    
    <!-- Update Tool/MCP column to show A/B winner -->
    <td class="tool-mcp">
        <div v-if="step.abTestData">
            <div class="ab-winner">
                <i class="fa fa-trophy"></i>
                {{ step.abTestData.winner || 'Testing...' }}
            </div>
            <div class="ab-savings" v-if="step.abTestData.avgCostSavings > 0">
                <i class="fa fa-dollar"></i>
                {{ step.abTestData.avgCostSavings.toFixed(1) }}% saved
            </div>
            <button @click="toggleAbDetails(step.moduleId)" class="btn-ab-details">
                <i :class="showAbDetails[step.moduleId] ? 'fa fa-chevron-up' : 'fa fa-chevron-down'"></i>
            </button>
        </div>
        <div v-else>
            {{ step.toolMcp || 'System' }}
        </div>
    </td>
    
    <!-- ... rest of columns ... -->
</tr>

<!-- A/B Test Details Row (spans all columns) -->
<tr v-if="showAbDetails[step.moduleId]" class="ab-details-row">
    <td colspan="7">
        <div class="ab-test-details">
            <h4>A/B Test Results ({{ step.abTestData.totalTests }} tests)</h4>
            
            <div class="ab-metrics">
                <div class="metric">
                    <label>Consistent Winner:</label>
                    <span class="winner-name">{{ step.abTestData.winner }}</span>
                </div>
                <div class="metric">
                    <label>Avg Cost Savings:</label>
                    <span class="savings">{{ step.abTestData.avgCostSavings.toFixed(2) }}%</span>
                </div>
            </div>
            
            <div class="recent-tests">
                <h5>Recent Test Results:</h5>
                <table class="mini-table">
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Winner</th>
                            <th>Cost Savings</th>
                            <th>Participants</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-for="test in step.abTestData.tests.slice(0, 5)" :key="test.date">
                            <td>{{ new Date(test.date).toLocaleDateString() }}</td>
                            <td>{{ test.winner }}</td>
                            <td>{{ test.costSavings }}%</td>
                            <td>{{ test.participants.join(', ') }}</td>
                        </tr>
                    </tbody>
                </table>
            </div>
            
            <div class="ab-recommendation">
                <i class="fa fa-lightbulb"></i>
                <span v-if="step.abTestData.avgCostSavings > 10">
                    Strong recommendation: Use {{ step.abTestData.winner }} for {{ step.abTestData.avgCostSavings.toFixed(1) }}% cost savings
                </span>
                <span v-else-if="step.abTestData.avgCostSavings > 5">
                    Consider using {{ step.abTestData.winner }} for moderate cost savings
                </span>
                <span v-else>
                    Continue testing - no clear winner yet
                </span>
            </div>
        </div>
    </td>
</tr>

<!-- CSS for A/B Testing -->
<style>
.ab-winner {
    color: #ffd700;
    font-weight: bold;
    margin-bottom: 4px;
}

.ab-savings {
    color: #4caf50;
    font-size: 0.9em;
}

.btn-ab-details {
    background: transparent;
    border: 1px solid #666;
    color: #aaa;
    padding: 2px 6px;
    border-radius: 2px;
    cursor: pointer;
    margin-top: 4px;
}

.ab-details-row {
    background: #1a1a1a;
}

.ab-test-details {
    padding: 20px;
}

.ab-test-details h4 {
    color: #ff6b35;
    margin-bottom: 15px;
}

.ab-metrics {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 20px;
    margin-bottom: 20px;
}

.ab-metrics .metric {
    background: #2a2a2a;
    padding: 10px;
    border-radius: 4px;
}

.ab-metrics label {
    color: #888;
    display: block;
    margin-bottom: 5px;
}

.winner-name {
    color: #ffd700;
    font-size: 1.2em;
    font-weight: bold;
}

.mini-table {
    width: 100%;
    font-size: 0.9em;
    margin-top: 10px;
}

.mini-table th {
    background: #2a2a2a;
    padding: 5px;
    text-align: left;
}

.mini-table td {
    padding: 5px;
    border-bottom: 1px solid #3a3a3a;
}

.ab-recommendation {
    background: #2a2a2a;
    padding: 15px;
    border-radius: 4px;
    margin-top: 15px;
    border-left: 3px solid #ff6b35;
}

.ab-recommendation i {
    color: #ffaa00;
    margin-right: 10px;
}
</style>
```

---

## Testing & Deployment Checklist

### Before Deployment
- [ ] Test export functionality with various workflow sizes
- [ ] Verify Andon calculations match expected thresholds
- [ ] Test inline editing saves correctly
- [ ] Verify A/B test results load and display properly
- [ ] Check mobile responsiveness
- [ ] Test with workflows that have no A/B tests
- [ ] Verify sync between Standard Work and Builder

### Performance Checks
- [ ] Export completes in < 5 seconds for typical workflows
- [ ] Andon status updates without lag
- [ ] Inline editing feels responsive
- [ ] A/B test data loads asynchronously without blocking UI

### Edge Cases
- [ ] Empty workflows handle gracefully
- [ ] Missing metrics don't crash the page
- [ ] Network errors show appropriate messages
- [ ] Large workflows (50+ steps) render properly

---

## Dependencies to Install

```bash
# Python dependencies for backend
pip install reportlab  # For PDF generation
pip install xlsxwriter # For Excel generation
pip install pandas     # For data manipulation (if not already installed)

# Or add to requirements.txt:
reportlab==4.0.7
xlsxwriter==3.1.9
pandas==2.1.3
```

---

## Success Metrics

After implementing these features, track:

1. **Export Usage**: How many PDFs/Excel files exported per week
2. **Andon Alerts**: Frequency of yellow/red states
3. **Edit Frequency**: How often users modify times in Standard Work
4. **A/B Adoption**: Percentage of workflows using A/B testing
5. **Sync Usage**: How often changes sync back to Builder
6. **Time Savings**: Average cost savings from A/B test winners

---

## Next Sprint Considerations

After completing these features:

1. **SPC Charts**: Add control charts for quality metrics over time
2. **Historical Comparison**: Compare current Standard Work to previous revisions
3. **Workflow Templates**: Save Standard Work as reusable templates
4. **Batch Operations**: Apply time changes to multiple steps at once
5. **Mobile App**: Dedicated mobile view for shop floor tablets

The team should continue their excellent incremental approach, deploying each feature as it's completed rather than waiting for all four priorities to be done.
