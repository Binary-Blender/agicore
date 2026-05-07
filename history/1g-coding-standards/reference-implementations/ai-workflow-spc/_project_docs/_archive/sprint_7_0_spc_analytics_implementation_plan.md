# Sprint 7.0: SPC Analytics Dashboard Implementation Plan

**Status:** Ready to Implement
**Priority:** HIGHEST - Core Differentiator
**Estimated Time:** 3-4 days
**Date:** 2025-01-31

---

## Strategic Context

### Why SPC Analytics is Critical
1. **#1 Differentiator** - NO competitor has SPC for AI workflows
2. **Data Already Exists** - TPS metrics are being collected, just need visualization
3. **Immediate "Wow" Factor** - Visual charts quality managers understand
4. **Validates TPS Methodology** - Shows you're not just using buzzwords
5. **Enterprise Appeal** - Quality/Six Sigma teams will recognize the value

### What Makes This Special
Traditional workflow platforms show: execution logs, success/failure rates
**We show:** Statistical process control, capability analysis, trend detection

---

## Existing Infrastructure Assessment

### ✅ What We Already Have

**1. TPS Metrics Calculator** (`src/tps/tps_metrics_calculator.py:1-213`)
- Defect Rate calculation
- First Pass Yield (FPY)
- Cycle Time tracking
- Overall Equipment Effectiveness (OEE)
- Data collection from workflow executions

**2. Provider Metrics Tracking** (`src/database/models.py:332-345`)
- `provider_metrics` table with:
  - generation_time
  - cost
  - quality_score
  - selection_rate
  - failure_rate
  - timestamp (indexed)

**3. Cost Tracking** (`src/database/models.py:83-100`)
- `cost_tracking` table with:
  - execution_id, module_id, mcp_server
  - input/output tokens
  - compute time
  - cost_usd
  - timestamp

**4. QC Decision Data** (`src/database/models.py:301-313`)
- Pass/fail decisions per asset
- Links to executions and tasks

### 🔨 What Needs to Be Built

**1. SPC Calculator** (NEW)
- Control limit calculations (UCL/LCL)
- Process capability metrics (Cp, Cpk)
- Trend detection algorithms
- Western Electric Rules for out-of-control detection

**2. SPC API Endpoints** (NEW)
- Get control chart data
- Get Pareto analysis
- Get trend analysis
- Get process capability metrics

**3. SPC Analytics UI** (NEW)
- Control charts with Chart.js
- Pareto charts
- Trend visualizations
- Process capability displays

---

## Implementation Plan

### Phase 1: Backend SPC Calculator (Day 1)

#### File: `src/tps/spc_calculator.py` (NEW)

**Purpose:** Statistical calculations for control charts and process capability

**Key Components:**
```python
class SPCCalculator:
    """Statistical Process Control calculations for AI workflows"""

    def calculate_control_limits(self, data_points: List[float]) -> Dict:
        """
        Calculate UCL/LCL for X-bar or P-charts
        Returns: mean, UCL, LCL, sigma
        """

    def detect_out_of_control(self, data_points: List[float], limits: Dict) -> List[Dict]:
        """
        Apply Western Electric Rules to detect out-of-control conditions:
        - Rule 1: Point beyond 3σ
        - Rule 2: 2 of 3 points beyond 2σ
        - Rule 3: 4 of 5 points beyond 1σ
        - Rule 4: 8 consecutive points on one side of centerline

        Returns: List of violations with timestamps and descriptions
        """

    def calculate_process_capability(self, data: List[float], USL: float, LSL: float) -> Dict:
        """
        Calculate Cp, Cpk, Pp, Ppk for process capability
        Returns: capability indices and sigma level
        """

    def calculate_pareto_data(self, defect_counts: Dict[str, int]) -> List[Dict]:
        """
        Sort defects by frequency, calculate cumulative %
        Returns: Sorted list with cumulative percentages
        """

    def detect_trends(self, data_points: List[float], window_size: int = 7) -> Dict:
        """
        Detect upward/downward trends using linear regression
        Returns: trend direction, slope, R-squared
        """
```

**Data Structures:**
```python
@dataclass
class ControlChartPoint:
    timestamp: datetime
    value: float
    ucl: float
    lcl: float
    mean: float
    is_out_of_control: bool = False
    violation_rule: Optional[str] = None

@dataclass
class ProcessCapability:
    cp: float  # Process potential
    cpk: float  # Process capability
    pp: float  # Process performance
    ppk: float  # Process performance index
    sigma_level: float
    dpmo: int  # Defects per million opportunities
```

---

### Phase 2: SPC API Endpoints (Day 2)

#### File: `src/api/spc_analytics.py` (NEW)

**Endpoints:**

**1. GET `/api/spc/control-charts/{workflow_id}`**
```python
@router.get("/control-charts/{workflow_id}")
async def get_control_charts(
    workflow_id: str,
    metric: str = "defect_rate",  # defect_rate, cycle_time, fpy, oee
    period_days: int = 30,
    db: AsyncSession = Depends(get_db)
):
    """
    Get control chart data for specified metric

    Returns:
    {
        "metric": "defect_rate",
        "data_points": [
            {
                "timestamp": "2025-01-15T10:30:00Z",
                "value": 2.5,
                "ucl": 5.2,
                "lcl": 0.0,
                "mean": 2.1,
                "is_out_of_control": false
            },
            ...
        ],
        "summary": {
            "mean": 2.1,
            "ucl": 5.2,
            "lcl": 0.0,
            "sigma": 1.03,
            "out_of_control_count": 3,
            "total_points": 45
        },
        "violations": [
            {
                "timestamp": "2025-01-20T14:00:00Z",
                "rule": "Point beyond UCL",
                "value": 6.1
            }
        ]
    }
    """
```

**2. GET `/api/spc/pareto/{workflow_id}`**
```python
@router.get("/pareto/{workflow_id}")
async def get_pareto_analysis(
    workflow_id: str,
    period_days: int = 30,
    db: AsyncSession = Depends(get_db)
):
    """
    Get Pareto chart data for top failure modes

    Returns:
    {
        "defects": [
            {
                "module_name": "Image Generation",
                "defect_count": 45,
                "percentage": 38.1,
                "cumulative_percentage": 38.1
            },
            {
                "module_name": "QC Pass/Fail",
                "defect_count": 28,
                "percentage": 23.7,
                "cumulative_percentage": 61.8
            },
            ...
        ],
        "total_defects": 118,
        "vital_few_threshold": 80.0  # 80% of defects
    }
    """
```

**3. GET `/api/spc/trends/{workflow_id}`**
```python
@router.get("/trends/{workflow_id}")
async def get_trends(
    workflow_id: str,
    metric: str = "defect_rate",
    period_days: int = 90,
    db: AsyncSession = Depends(get_db)
):
    """
    Get trend analysis for metrics over time

    Returns:
    {
        "metric": "defect_rate",
        "trend_direction": "improving",  # improving, degrading, stable
        "slope": -0.02,  # Negative = improvement
        "r_squared": 0.85,
        "confidence": "high",
        "time_series": [
            {"week": "2025-W01", "avg_value": 3.2},
            {"week": "2025-W02", "avg_value": 2.9},
            ...
        ],
        "forecast": {
            "next_week": 1.8,
            "confidence_interval": [1.4, 2.2]
        }
    }
    """
```

**4. GET `/api/spc/capability/{workflow_id}`**
```python
@router.get("/capability/{workflow_id}")
async def get_process_capability(
    workflow_id: str,
    metric: str = "defect_rate",
    period_days: int = 30,
    db: AsyncSession = Depends(get_db)
):
    """
    Get process capability analysis (Cp, Cpk)

    Returns:
    {
        "metric": "defect_rate",
        "cp": 1.33,  # Process potential
        "cpk": 1.15,  # Process capability
        "pp": 1.28,
        "ppk": 1.10,
        "sigma_level": 3.45,
        "dpmo": 24500,  # Defects per million opportunities
        "interpretation": "Capable process (Cpk > 1.0)",
        "specification_limits": {
            "usl": 5.0,  # Upper spec limit
            "lsl": 0.0,  # Lower spec limit
            "target": 2.0
        }
    }
    """
```

---

### Phase 3: Frontend SPC Analytics UI (Days 3-4)

#### File: `frontend/spc-analytics.html` (NEW)

**Layout:**
```html
<!DOCTYPE html>
<html>
<head>
    <title>SPC Analytics | AI Workflow Platform</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/vue@3/dist/vue.global.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/axios/dist/axios.min.js"></script>
</head>
<body>
    <div id="app">
        <!-- Header -->
        <header class="spc-header">
            <h1>📊 Statistical Process Control Analytics</h1>
            <select v-model="selectedWorkflowId" @change="loadAllAnalytics">
                <option v-for="wf in workflows" :value="wf.id">
                    {{ wf.name }}
                </option>
            </select>
        </header>

        <!-- Metrics Dashboard -->
        <div class="metrics-grid">
            <!-- Control Chart -->
            <div class="chart-card">
                <h2>Control Chart - {{ selectedMetric }}</h2>
                <canvas id="controlChart"></canvas>
                <div class="chart-controls">
                    <select v-model="selectedMetric" @change="loadControlChart">
                        <option value="defect_rate">Defect Rate</option>
                        <option value="cycle_time">Cycle Time</option>
                        <option value="fpy">First Pass Yield</option>
                        <option value="oee">OEE</option>
                    </select>
                </div>
            </div>

            <!-- Pareto Chart -->
            <div class="chart-card">
                <h2>Pareto Analysis - Top Failure Modes</h2>
                <canvas id="paretoChart"></canvas>
            </div>

            <!-- Trend Chart -->
            <div class="chart-card">
                <h2>Trend Analysis</h2>
                <canvas id="trendChart"></canvas>
            </div>

            <!-- Process Capability -->
            <div class="chart-card">
                <h2>Process Capability</h2>
                <div class="capability-display">
                    <div class="capability-metric">
                        <label>Cp</label>
                        <span class="value" :class="cpClass">{{ capability.cp }}</span>
                    </div>
                    <div class="capability-metric">
                        <label>Cpk</label>
                        <span class="value" :class="cpkClass">{{ capability.cpk }}</span>
                    </div>
                    <div class="capability-metric">
                        <label>Sigma Level</label>
                        <span class="value">{{ capability.sigma_level }}</span>
                    </div>
                    <div class="capability-interpretation">
                        {{ capability.interpretation }}
                    </div>
                </div>
            </div>
        </div>

        <!-- Violations Alert Section -->
        <div v-if="violations.length > 0" class="violations-section">
            <h3>⚠️ Out-of-Control Conditions Detected</h3>
            <div v-for="violation in violations" class="violation-card">
                <span class="timestamp">{{ formatTime(violation.timestamp) }}</span>
                <span class="rule">{{ violation.rule }}</span>
                <span class="value">Value: {{ violation.value }}</span>
            </div>
        </div>
    </div>
</body>
</html>
```

**Chart.js Configuration Examples:**

**Control Chart (X-bar with UCL/LCL):**
```javascript
const controlChartConfig = {
    type: 'line',
    data: {
        labels: timestamps,
        datasets: [
            {
                label: 'Defect Rate',
                data: values,
                borderColor: '#ff6b35',
                backgroundColor: 'rgba(255, 107, 53, 0.1)',
                pointBackgroundColor: (context) => {
                    const point = chartData[context.dataIndex];
                    return point.is_out_of_control ? '#ff4444' : '#ff6b35';
                },
                pointRadius: 5
            },
            {
                label: 'UCL',
                data: ucl_values,
                borderColor: '#ff4444',
                borderDash: [5, 5],
                fill: false
            },
            {
                label: 'Mean',
                data: mean_values,
                borderColor: '#00cc00',
                borderDash: [2, 2],
                fill: false
            },
            {
                label: 'LCL',
                data: lcl_values,
                borderColor: '#ff4444',
                borderDash: [5, 5],
                fill: false
            }
        ]
    },
    options: {
        responsive: true,
        plugins: {
            title: { display: true, text: 'Control Chart - Defect Rate' },
            legend: { position: 'bottom' }
        },
        scales: {
            y: {
                beginAtZero: true,
                title: { display: true, text: 'Defect Rate (%)' }
            }
        }
    }
};
```

**Pareto Chart:**
```javascript
const paretoConfig = {
    type: 'bar',
    data: {
        labels: module_names,
        datasets: [
            {
                label: 'Defect Count',
                data: defect_counts,
                backgroundColor: '#ff6b35',
                yAxisID: 'y'
            },
            {
                label: 'Cumulative %',
                data: cumulative_percentages,
                type: 'line',
                borderColor: '#00cc00',
                yAxisID: 'y1',
                fill: false
            }
        ]
    },
    options: {
        responsive: true,
        scales: {
            y: {
                type: 'linear',
                position: 'left',
                title: { display: true, text: 'Defect Count' }
            },
            y1: {
                type: 'linear',
                position: 'right',
                max: 100,
                title: { display: true, text: 'Cumulative %' },
                grid: { drawOnChartArea: false }
            }
        }
    }
};
```

---

## CSS Styling

**File: Embedded in `frontend/spc-analytics.html`**

```css
.spc-header {
    background: linear-gradient(135deg, #1a1a1a 0%, #2a2a2a 100%);
    padding: 2rem;
    border-bottom: 3px solid #ff6b35;
}

.metrics-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 2rem;
    padding: 2rem;
}

.chart-card {
    background: #2a2a2a;
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 8px;
    padding: 1.5rem;
}

.capability-display {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    padding: 2rem;
}

.capability-metric {
    display: flex;
    justify-content: space-between;
    padding: 1rem;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 4px;
}

.value.high { color: #00cc00; }  /* Cp/Cpk > 1.33 */
.value.medium { color: #ffaa00; }  /* Cp/Cpk 1.0-1.33 */
.value.low { color: #ff4444; }  /* Cp/Cpk < 1.0 */

.violations-section {
    margin: 2rem;
    padding: 1.5rem;
    background: rgba(255, 68, 68, 0.1);
    border: 2px solid #ff4444;
    border-radius: 8px;
}

.violation-card {
    display: flex;
    justify-content: space-between;
    padding: 0.75rem;
    margin: 0.5rem 0;
    background: rgba(255, 255, 255, 0.05);
    border-left: 4px solid #ff4444;
}
```

---

## Integration with Existing App

### Add Navigation Link

**File: `frontend/tps-builder.html`** (Add to header)
```html
<nav>
    <a href="/tps-builder">TPS Builder</a>
    <a href="/spc-analytics" class="nav-highlight">📊 SPC Analytics</a>
</nav>
```

### Add Route to Main App

**File: `src/main_workflow_db.py`**
```python
from src.api import spc_analytics

# Add router
app.include_router(spc_analytics.router)

# Serve SPC Analytics page
@app.get("/spc-analytics", response_class=HTMLResponse)
async def spc_analytics_page():
    with open("frontend/spc-analytics.html") as f:
        return f.read()
```

---

## Testing Scenarios

### 1. Control Chart Validation
- [ ] UCL/LCL calculated correctly
- [ ] Out-of-control points highlighted in red
- [ ] Western Electric rules detect violations
- [ ] Chart updates when metric selection changes

### 2. Pareto Analysis
- [ ] Defects sorted by frequency
- [ ] Cumulative % line reaches 100%
- [ ] Identifies top 80% of defects (vital few)
- [ ] Module names display correctly

### 3. Trend Detection
- [ ] Upward/downward trends identified
- [ ] Slope calculation accurate
- [ ] Forecast displays with confidence interval
- [ ] Works across different time periods

### 4. Process Capability
- [ ] Cp/Cpk calculated correctly
- [ ] Sigma level accurate
- [ ] Color coding based on thresholds
- [ ] Interpretation text helpful

---

## Data Requirements

### Sample Size
- Minimum 20 data points for control charts
- Minimum 30 data points for capability analysis
- Use simulation data if insufficient real executions

### Metrics to Track
1. **Defect Rate** - % of executions with failures
2. **Cycle Time** - Time per execution (seconds)
3. **First Pass Yield** - % passing QC first time
4. **OEE** - Overall equipment effectiveness %

---

## Success Metrics

### User Impact
- [ ] Quality managers understand the charts immediately
- [ ] Out-of-control conditions trigger investigation
- [ ] Process improvements tracked over time
- [ ] Capability indices show operational excellence

### Business Value
- [ ] Demonstrates unique differentiation
- [ ] Validates TPS methodology claims
- [ ] Enables data-driven optimization
- [ ] Appeals to Six Sigma practitioners

---

## Next Phase: Cost Tracking Dashboard (Sprint 7.0 Priority 2)

After SPC Analytics is complete, implement:
1. Real-time cost accumulation per workflow
2. Cost by module type comparison
3. Baseline vs. actual cost tracking
4. ROI calculator for optimization decisions

---

**Last Updated:** 2025-01-31
**Ready to Build:** ✅ Yes - All dependencies identified
