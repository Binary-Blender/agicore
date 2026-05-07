# System Architecture - AI Workflow SPC Platform

## High-Level Flow

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│   User      │────▶│   Workflow   │────▶│ AI Process  │
│  Request    │     │   Engine     │     │ (DALL-E/SD) │
└─────────────┘     └──────────────┘     └─────────────┘
                            │                     │
                            │                     ▼
                            │              ┌─────────────┐
                            │              │   Image     │
                            │              │  Generated  │
                            │              └─────────────┘
                            │                     │
                            ▼                     │
                    ┌──────────────┐             │
                    │  QC Engine   │◀────────────┘
                    │              │
                    │ Should Sample?│
                    └──────┬───────┘
                           │
                    ┌──────┴──────┐
                    │             │
                Yes │             │ No (Auto-approve)
                    ▼             ▼
            ┌─────────────┐ ┌─────────────┐
            │   Human     │ │   Output    │
            │   Review    │ │  Delivered  │
            └─────────────┘ └─────────────┘
                    │
                    ▼
            ┌─────────────┐
            │  Update     │
            │ Statistics  │
            └─────────────┘
```

## Progressive Sampling Logic

```
New Process (< 10 samples)
├── Sampling Rate: 100%
└── All outputs reviewed

Young Process (10-50 samples)
├── Pass Rate > 80%
│   └── Sampling Rate: 50%
└── Pass Rate ≤ 80%
    └── Sampling Rate: 100%

Mature Process (> 50 samples)
├── Pass Rate > 95%
│   └── Sampling Rate: 5%
├── Pass Rate > 90%
│   └── Sampling Rate: 10%
└── Pass Rate ≤ 90%
    └── Sampling Rate: 50%
```

## Cost Savings Visualization

```
Traditional QC (100% Review):
████████████████████████████████████████ 100 tasks = $100

With Progressive Sampling:
████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 10 tasks = $10

Savings: 90% reduction in QC costs!
```

## API Request Flow

```
1. Generate Image Request
   POST /generate
   {
     "prompt": "A beautiful sunset"
   }

2. Workflow Processing
   ├── Select AI Process (DALL-E or SD)
   ├── Generate Image
   ├── Check Sampling Rate
   └── Route to QC or Auto-approve

3. Human QC (if needed)
   GET /qc/pending
   └── Returns pending tasks

   POST /qc/submit
   {
     "task_id": "task_123",
     "result": "pass"
   }

4. Statistics Update
   GET /stats
   └── Returns current metrics
```

## Key Components

### 1. Workflow Engine (`SimpleWorkflow`)
- Orchestrates the entire process
- Manages task lifecycle
- Implements A/B testing logic

### 2. QC Engine (`QCEngine`)
- Calculates sampling rates
- Tracks process statistics
- Implements SPC logic

### 3. MCP Client (`SimpleMCPClient`)
- Mock implementation for demo
- Simulates image generation
- Can be replaced with real APIs

### 4. FastAPI Server
- RESTful API endpoints
- WebSocket support (future)
- CORS enabled for web UI

### 5. Web UI
- Real-time statistics display
- Keyboard shortcuts for efficiency
- Visual progress indicators

## Data Flow

```
Task Creation
    │
    ▼
Image Generation
    │
    ▼
QC Decision ─────┬─── Needs QC ───▶ Human Review
    │            │                       │
    │            └─── Auto-approve      │
    │                     │             │
    └─────────────────────┴─────────────┘
                          │
                          ▼
                   Update Statistics
                          │
                          ▼
                 Calculate New Sampling Rate
```

## Statistical Process Control (SPC)

### Process Capability Index (Cpk)
```
Pass Rate    Cpk     Status
─────────────────────────────
≥ 99%       2.0     Excellent
≥ 95%       1.33    Capable
≥ 90%       1.0     Acceptable
< 90%       0.67    Needs Improvement
```

### Control Chart (Conceptual)
```
100% │     ○ ○
     │   ○     ○ ○ ○
 95% │ ○           ○ ○ ○ ○ ─── Upper Control Limit
     │                   ○ ○ ○ ○
 90% │ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ Center Line
     │
 85% │ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ Lower Control Limit
     │
     └─────────────────────────────▶ Time
```

## Future Architecture (with MCP)

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Web UI        │     │   API Server    │     │   MCP Servers   │
│                 │────▶│                 │────▶│                 │
│ - QC Interface  │     │ - Orchestration │     │ - DALL-E 3      │
│ - Dashboard     │     │ - SPC Logic     │     │ - Stable Diff   │
│ - Analytics     │     │ - A/B Testing   │     │ - Midjourney    │
└─────────────────┘     └─────────────────┘     └─────────────────┘
         │                       │                        │
         │                       ▼                        │
         │              ┌─────────────────┐              │
         │              │   PostgreSQL    │              │
         │              │                 │              │
         │              │ - Task History  │              │
         │              │ - Metrics       │              │
         └──────────────│ - QC Results    │──────────────┘
                        └─────────────────┘
```

This architecture demonstrates how manufacturing quality control principles can be applied to AI workflows, resulting in dramatic cost savings while maintaining quality standards.