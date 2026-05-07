# Binary Blender AI Workflow Platform - Job Instruction Architecture Guide

## Executive Summary

The Binary Blender AI Workflow Platform fundamentally reimagines workflow automation by replacing visual "spaghetti diagrams" with a **linear job instruction paradigm** inspired by Toyota Production System (TPS) methodologies. Workflows are built and read like standard work instructions—from top to bottom in a clear, sequential table format—not as interconnected node graphs. This document serves as the definitive guide for maintaining architectural consistency throughout development.

**Core Principle:** If a factory worker can't understand the workflow by reading it top-to-bottom like a work instruction sheet, we've failed.

---

## 1. The Job Instruction Paradigm

### 1.1 What This IS

Think of our workflows as **digital standard work instructions** that would be posted at a manufacturing workstation:

```
┌─────────────────────────────────────────────────────────────────┐
│                    STANDARD WORK INSTRUCTION                     │
│                 Image Generation Pipeline v4.0                   │
├─────┬──────────────────┬─────────────┬───────────┬─────────────┤
│Step │ Work Element     │ Module Type │ Duration  │ Key Points  │
├─────┼──────────────────┼─────────────┼───────────┼─────────────┤
│ 1   │ Initialize Batch │ Start       │ 2 sec     │ Set count=4 │
│ 2   │ Generate Images  │ MCP:Replicate│ 15 sec   │ Use SDXL    │
│ 3   │ Quality Check    │ QC:PassFail │ Manual    │ Critical Gate│
│ 4   │ Store Assets     │ End         │ 1 sec     │ Archive all │
└─────┴──────────────────┴─────────────┴───────────┴─────────────┘
```

### 1.2 What This is NOT

❌ **NOT a visual canvas** with draggable nodes and connection lines
❌ **NOT a flowchart** with diamonds for decisions and arrows everywhere  
❌ **NOT a graph-based system** where execution can jump arbitrarily
❌ **NOT like n8n, Zapier, or Make.com's visual builders**

### 1.3 Why Job Instructions Work Better

1. **Readability:** Anyone can understand the sequence at a glance
2. **Predictability:** Execution always flows top-to-bottom
3. **Training:** Matches how operators are trained in manufacturing
4. **Debugging:** Easy to identify which step failed
5. **Documentation:** The workflow IS the documentation

---

## 2. Module Architecture

### 2.1 Module Types

Every workflow consists of modules arranged in sequential steps. There are four categories:

#### 2.1.1 Flow Control Modules
```python
# Built-in modules that control workflow execution
- Start Module: Workflow entry point, defines parameters
- End Module: Workflow termination, final outputs
- Loop Module: Repeat section N times
- Conditional Module: Skip steps based on condition
```

#### 2.1.2 MCP Modules
```python
# The workhorses - connect to any MCP server
- MCP:Replicate (image generation)
- MCP:Claude (text generation)
- MCP:GoogleDrive (file operations)
- MCP:Postgres (database queries)
- MCP:Slack (notifications)
# ... 3000+ available MCP servers
```

#### 2.1.3 QC Modules (Core Differentiator)
```python
# Human-in-the-loop quality control
- QC:PassFail - Binary decision on outputs
- QC:MultiSelect - Choose best from options
- QC:ABTest - Compare outputs from different sources
- QC:Score - Rate quality 1-10
- QC:Annotate - Add corrections/feedback
```

#### 2.1.4 Utility Modules
```python
# Data transformation and manipulation
- Transform:JSON - Parse/modify JSON
- Transform:Text - String operations
- Transform:Image - Resize/crop/convert
- Asset:Load - Retrieve from repository
- Asset:Save - Store to repository
```

### 2.2 Module Structure

Every module MUST implement this interface:

```python
class ModuleInterface:
    # Module metadata
    id: str              # Unique identifier (e.g., "step_3")
    type: str            # Module type (e.g., "MCP:Replicate")
    name: str            # Display name (e.g., "Generate Product Images")
    step_number: int     # Position in job instruction (1, 2, 3...)
    
    # Configuration
    config: dict         # Module-specific settings
    
    # Input/Output definitions
    inputs: List[InputPort]
    outputs: List[OutputPort]
    
    # Execution
    async def execute(inputs: dict, context: dict) -> dict:
        """Execute module logic"""
        pass
    
    # Quality metrics
    expected_duration: int  # Seconds
    retry_policy: dict      # How to handle failures
    quality_checks: list    # Built-in validations
```

### 2.3 Module Compatibility Rules

Modules connect through **type-safe input/output contracts**:

```python
# Example: Image Generation Module
class ImageGenerationModule:
    inputs = [
        InputPort(name="prompt", type="string", required=True),
        InputPort(name="count", type="integer", default=1),
        InputPort(name="style", type="string", optional=True)
    ]
    outputs = [
        OutputPort(name="images", type="array<image>"),
        OutputPort(name="metadata", type="json")
    ]

# Example: QC Module that can accept those outputs
class QCPassFailModule:
    inputs = [
        InputPort(name="items", type="array<image|text|video>"),
        InputPort(name="criteria", type="string", optional=True)
    ]
    outputs = [
        OutputPort(name="passed", type="array<any>"),
        OutputPort(name="failed", type="array<any>"),
        OutputPort(name="decision", type="enum<pass|fail>")
    ]
```

**Compatibility Check:** An output can connect to an input if:
1. Types match exactly OR
2. Output type is convertible to input type OR  
3. Input accepts "any" type

---

## 3. Input Source Hierarchy

Inputs for any module can come from three sources, with clear precedence:

### 3.1 Previous Module Outputs (Primary)
```python
# Step 2 automatically receives outputs from Step 1
step_2.inputs["images"] = step_1.outputs["images"]
```

### 3.2 Asset Repository (Secondary)
```python
# Reference existing assets by ID
step_2.inputs["template"] = "asset://templates/product_template_v3"
step_2.inputs["brand_logo"] = "asset://logos/company_logo.png"
```

### 3.3 Static Configuration (Fallback)
```python
# Direct values in module config
step_2.config["api_key"] = "sk-xxxxx"
step_2.config["temperature"] = 0.7
```

### 3.4 Input Resolution Rules

When a module executes, inputs are resolved in this order:
1. **Check for explicit mapping** from previous module output
2. **Check for asset reference** (asset:// URI)
3. **Check for static value** in config
4. **Use default value** if defined
5. **Throw error** if required input has no value

---

## 4. Execution Flow

### 4.1 Step-Based Execution Model

Steps execute sequentially, but **modules within the same step run in parallel**:

```
┌────────────────────────────────────────┐
│            START EXECUTION             │
└────────────────┬───────────────────────┘
                 ▼
        ┌────────────────┐
        │    Step 1      │ ← Currently executing
        │  Initialize    │
        └────────┬───────┘
                 ▼
    ┌─────────────┴─────────────┐
    │         Step 2            │ ← Execute in parallel
    │ ┌──────────┬────────────┐ │
    │ │ Gen A    │   Gen B    │ │
    │ │Replicate │   DALL-E   │ │
    │ └──────────┴────────────┘ │
    └─────────────┬─────────────┘
                 ▼
        ┌────────────────┐
        │    Step 3      │ ← Waits for both
        │  A/B Test QC   │ [PAUSE FOR HUMAN]
        └────────┬───────┘
                 ▼
        ┌────────────────┐
        │    Step 4      │
        │  Store Winner  │
        └────────┬───────┘
                 ▼
         ┌──────────────┐
         │     END      │
         └──────────────┘
```

### 4.2 Execution Rules

1. **Step Sequential:** Steps execute in order from 1 to N
2. **Module Parallel:** Multiple modules in same step run concurrently
3. **Step Blocking:** All modules in a step must complete before next step
4. **Deterministic:** Same inputs always follow same path
5. **Pausable:** QC modules pause execution for human input
6. **Resumable:** Execution continues from pause point

### 4.3 Parallel Execution Patterns

Based on the working prototype, parallel execution follows these patterns:

#### Pattern A: Multiple Generators → Single Consumer
```
Step 2: [Akool] [DALL-E 3] [Midjourney]  ← All run in parallel
           ↓        ↓           ↓
Step 3: [A/B Testing QC]                  ← Waits for all inputs
```

#### Pattern B: Data Enrichment
```
Step 2: [Fetch Data] [Fetch Context] [Fetch History]  ← Parallel
              ↓            ↓              ↓
Step 3: [Combine & Process]                           ← Sequential
```

#### Pattern C: Multi-Channel Output
```
Step 4: [Save to S3] [Update Database] [Send Slack]   ← Parallel
              ↓            ↓              ↓
Step 5: [End]                                         ← Completion
```

**Rules for Parallel Execution:**
1. Modules in the same step row execute simultaneously
2. All parallel modules must complete before the next step begins
3. Each parallel module receives the same inputs from the previous step
4. Outputs from parallel modules can be accessed individually in the next step
5. Use "Drop here for parallel" zones to add modules side-by-side
6. Maximum recommended parallel modules per step: 5 (for UI clarity)

### 4.4 State Management During Execution

```python
execution_state = {
    "execution_id": "exec_abc123",
    "workflow_id": "wf_product_images",
    "current_step": 3,
    "status": "paused_for_qc",
    
    "step_outputs": {
        "step_1": {"count": 4},
        "step_2": {"images": [...]},
        # step_3 waiting for QC input
    },
    
    "context": {
        "start_time": "2024-10-29T10:00:00Z",
        "user_id": "user_123",
        "api_keys": {...},  # Encrypted
        "qc_pending": True
    }
}
```

---

## 5. QC Integration (Core Feature)

### 5.1 QC Module Behavior

QC modules are **special** - they pause workflow execution and wait for human input:

```python
class QCModule:
    async def execute(self, inputs, context):
        # 1. Create QC task
        task = create_qc_task(
            items=inputs["items"],
            criteria=self.config["criteria"]
        )
        
        # 2. Signal workflow to pause
        context["should_pause"] = True
        context["pause_reason"] = "awaiting_qc"
        context["qc_task_id"] = task.id
        
        # 3. Return empty (outputs filled after QC)
        return {}
    
    async def resume_after_qc(self, decisions, context):
        # 4. Process QC decisions
        passed = [item for item, decision in decisions if decision == "pass"]
        failed = [item for item, decision in decisions if decision == "fail"]
        
        # 5. Return categorized outputs
        return {
            "passed": passed,
            "failed": failed,
            "decision": "pass" if len(passed) > len(failed) else "fail"
        }
```

### 5.2 QC Routing Patterns

After QC, workflows can:

#### 5.2.1 Continue (All Passed)
```
Step 3: QC Check → [ALL PASS] → Step 4: Store Assets
```

#### 5.2.2 Loop Back (Some Failed)
```
Step 3: QC Check → [SOME FAIL] → Step 2: Generate Images (retry)
```

#### 5.2.3 Branch (Conditional)
```
Step 3: QC Check
  → [PASS] → Step 4: Publish
  → [FAIL] → Step 5: Manual Review
```

### 5.3 QC Metrics Tracking

Every QC point tracks:
- **First Pass Yield (FPY):** % passing on first attempt
- **Cycle Time:** Time from pause to decision
- **Defect Categories:** Why items failed
- **Operator Variance:** Consistency between reviewers

---

## 6. MCP Module Integration

### 6.1 MCP Module Wrapper

Every MCP server is wrapped in our standard module interface:

```python
class MCPModule(BaseModule):
    def __init__(self, mcp_server_id: str, tool_name: str):
        self.mcp_client = MCPClient(mcp_server_id)
        self.tool = tool_name
        
    async def execute(self, inputs, context):
        # 1. Map our inputs to MCP tool arguments
        tool_args = self.map_inputs_to_tool_args(inputs)
        
        # 2. Call MCP server
        result = await self.mcp_client.call_tool(
            self.tool,
            tool_args
        )
        
        # 3. Map MCP response to our outputs
        return self.map_tool_response_to_outputs(result)
```

### 6.2 MCP Server Registry

```python
MCP_SERVERS = {
    "replicate": {
        "name": "Replicate Image Generation",
        "tools": ["generate_image", "upscale_image"],
        "input_mapping": {
            "prompt": "prompt",
            "count": "num_outputs"
        },
        "output_mapping": {
            "images": "result.images",
            "metadata": "result.metadata"
        }
    },
    "claude": {
        "name": "Claude Text Generation",
        "tools": ["complete", "analyze"],
        # ... mappings
    }
    # ... 3000+ more servers
}
```

### 6.3 Dynamic Tool Discovery

```python
async def discover_mcp_capabilities(server_id: str):
    """Dynamically discover what a MCP server can do"""
    client = MCPClient(server_id)
    await client.connect()
    
    # Get available tools
    tools = await client.list_tools()
    
    # For each tool, get input/output schema
    for tool in tools:
        schema = await client.get_tool_schema(tool.name)
        # Auto-generate module interface from schema
```

---

## 7. Asset Repository Integration

### 7.1 Asset References

Modules can reference assets using URI scheme:

```
asset://[category]/[path/to/asset]

Examples:
asset://templates/email/welcome_v2
asset://images/logos/company_logo.png
asset://datasets/training/product_descriptions.json
asset://outputs/exec_123/step_2/generated_images
```

### 7.2 Asset Loading

```python
class AssetLoader:
    async def resolve_asset_input(self, uri: str) -> Any:
        # Parse URI
        category, path = parse_asset_uri(uri)
        
        # Fetch from repository
        asset = await asset_repository.get(category, path)
        
        # Return appropriate type
        if asset.type == "image":
            return Image(asset.url)
        elif asset.type == "json":
            return json.loads(asset.content)
        # ... handle other types
```

### 7.3 Asset Storage

QC-approved outputs automatically stored:

```python
async def store_approved_assets(execution_id, step_id, assets):
    for asset in assets:
        await asset_repository.create({
            "uri": f"asset://outputs/{execution_id}/{step_id}/{asset.id}",
            "type": asset.type,
            "content": asset.content,
            "metadata": {
                "created_by": execution_id,
                "qc_status": "approved",
                "timestamp": now()
            }
        })
```

---

## 8. Implementation Examples

### 8.1 Simple Linear Workflow

```python
workflow = JobInstruction(
    name="Basic Image Generation",
    steps=[
        Step(1, "Initialize", StartModule(iterations=4)),
        Step(2, "Generate", MCPModule("replicate", "generate_image")),
        Step(3, "Quality Check", QCPassFailModule()),
        Step(4, "Store", EndModule())
    ]
)
```

### 8.2 Workflow with Asset Input

```python
workflow = JobInstruction(
    name="Brand-Compliant Images",
    steps=[
        Step(1, "Load Template", AssetLoadModule("asset://templates/brand_guide")),
        Step(2, "Generate", MCPModule("dalle", "generate_image")),
        Step(3, "Apply Brand", TransformModule("overlay_logo")),
        Step(4, "QC Check", QCScoreModule(min_score=7)),
        Step(5, "Publish", MCPModule("wordpress", "upload_media"))
    ]
)
```

### 8.3 A/B Testing Workflow

```python
workflow = JobInstruction(
    name="Compare Image Generators",
    steps=[
        Step(1, "Initialize", [
            StartModule(prompt="sunset over mountains", iterations=1)
        ]),
        Step(2, "Generate Options (Parallel)", [
            MCPModule("akool", "generate_image", tag="model_a"),
            MCPModule("dalle", "generate", tag="model_b")
        ]),  # Both execute simultaneously
        Step(3, "A/B Test", [
            QCABTestModule(
                inputs={
                    "option_a": "${step_2.model_a.images}",
                    "option_b": "${step_2.model_b.images}"
                },
                criteria="Select higher quality image"
            )
        ]),
        Step(4, "Store Winner", [
            AssetSaveModule(
                input="${step_3.winner}",
                category="approved_images"
            )
        ]),
        Step(5, "Complete", [
            EndModule()
        ])
    ]
)
```

### 8.4 Conditional Execution

```python
workflow = JobInstruction(
    name="Content Moderation Pipeline",
    steps=[
        Step(1, "Generate", MCPModule("gpt4", "write_article")),
        Step(2, "Safety Check", MCPModule("openai", "moderation")),
        Step(3, "Route", ConditionalModule(
            condition="${step_2.outputs.flagged} == false",
            if_true=goto(4),   # Skip to publish
            if_false=goto(5)   # Go to manual review
        )),
        Step(4, "Publish", MCPModule("wordpress", "post")),
        Step(5, "Manual Review", QCAnnotateModule()),
        Step(6, "End", EndModule())
    ]
)
```

---

## 9. User Interface Guidelines

### 9.1 Job Instruction Builder UI

The UI maintains **vertical step progression** with modules that can be placed **side-by-side for parallel execution**:

```
┌─────────────────────────────────────────────────────────────────┐
│  Workflow Name: [_____________________]  Description: [_____]   │
│                                                [Save Workflow]   │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────────────────────────────────────────┐      │
│ 1│  Start                              [←][→][↑][↓][×]  │      │
│  └──────────────────────────────────────────────────────┘      │
│                         ↓                                       │
│                                                                  │
│  ┌─────────────────────┐  ┌─────────────────────┐             │
│ 2│  Akool              │  │  DALL-E 3          │  [Drop here  │
│  │  [←][→][↑][↓][×]    │  │  [←][→][↑][↓][×]   │  for parallel]│
│  └─────────────────────┘  └─────────────────────┘             │
│                    ↓              ↓                            │
│                                                                  │
│  ┌──────────────────────────────────────────────────────┐      │
│ 3│  A/B Testing                        [←][→][↑][↓][×]  │      │
│  └──────────────────────────────────────────────────────┘      │
│                         ↓                                       │
│                                                                  │
│  [Drop here to add new row]                                     │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**Key UI Elements (Based on Prototype):**

1. **Vertical Flow:** Steps numbered 1, 2, 3... flowing top to bottom
2. **Parallel Execution Zones:** "Drop here for parallel" areas beside modules
3. **Module Cards:** Rectangular boxes with:
   - Module name/type
   - Control buttons [←][→][↑][↓][×] for move/delete
   - Orange step number indicator on left
4. **Visual Arrows:** Show data flow between steps
5. **Drop Zones:** Dotted areas for adding new modules or rows

**Interaction Patterns:**
- Drag modules from left sidebar to main canvas
- Drop on "Drop here for parallel" to add side-by-side
- Drop on "Drop here to add new row" to add new step
- Modules in same horizontal row execute in parallel
- All parallel modules must complete before next step begins

### 9.2 Module Configuration Panel

When clicking [Configure...], show a panel with:

```
┌─────────────────────────────────────────────┐
│ Configure Step 2: Generate Images           │
├─────────────────────────────────────────────┤
│ Module Type: MCP:Replicate                  │
│                                              │
│ INPUTS                                       │
│ ┌──────────────┬─────────────────────────┐ │
│ │ prompt       │ ▼ ${step_1.prompt}      │ │
│ │ count        │ ▼ ${step_1.iterations}  │ │
│ │ model        │ ▼ [Select MCP Model...] │ │
│ └──────────────┴─────────────────────────┘ │
│                                              │
│ CONFIGURATION                                │
│ ┌──────────────┬─────────────────────────┐ │
│ │ API Key      │ ●●●●●●●●●●●●●●●        │ │
│ │ Temperature  │ 0.7                     │ │
│ │ Aspect Ratio │ ▼ 16:9                  │ │
│ └──────────────┴─────────────────────────┘ │
│                                              │
│ OUTPUTS (auto-mapped to next step)          │
│ • images[] → Available as ${step_2.images}  │
│ • metadata → Available as ${step_2.metadata}│
│                                              │
│            [Cancel] [Save Configuration]     │
└─────────────────────────────────────────────┘
```

### 9.3 Input Mapping Dropdown

The dropdown for each input should show:

```
▼ Select Input Source
├─ Previous Outputs
│   ├─ ${step_1.prompt} (string)
│   ├─ ${step_1.iterations} (number)
│   └─ ${step_1.config} (json)
├─ Asset Repository
│   ├─ asset://templates/...
│   ├─ asset://images/...
│   └─ [Browse Assets...]
├─ Static Value
│   └─ [Enter value...]
└─ Required from Previous Step
```

---

## 10. Critical Implementation Rules

### 10.1 What NOT to Build

❌ **NO free-form canvas** (modules must align to steps)
❌ **NO arbitrary connection lines** (flow is always top-to-bottom between steps)
❌ **NO complex branching** (only simple conditional routing)
❌ **NO spaghetti diagrams** (maintain clean vertical flow)
❌ **NO circular dependencies** (no loops back to earlier steps)

### 10.2 What TO Build

✅ **Vertical step-based layout** (numbered rows 1, 2, 3...)
✅ **Side-by-side modules** (for parallel execution within a step)
✅ **Drop zones** ("Drop here for parallel" indicators)
✅ **Clear step numbering** (orange indicators as in prototype)
✅ **Downward flow arrows** (showing data flow between steps)
✅ **Module cards** (rectangular boxes with controls)
✅ **Configuration panel** (right sidebar for module settings)
✅ **Module library** (left sidebar with categories)
✅ **SPC metrics display** (quality metrics in header)

### 10.3 Decision Principles

When faced with design decisions, ask:

1. **"Could a factory worker understand this?"**
   - If no, simplify

2. **"Does it read top-to-bottom?"**
   - If no, restructure

3. **"Is the execution path obvious?"**
   - If no, make it linear

4. **"Can we see quality metrics?"**
   - If no, add SPC tracking

---

## 11. Technical Constraints

### 11.1 Performance Requirements

- Module execution timeout: 300 seconds default
- QC pause timeout: 24 hours before auto-fail
- Max workflow steps: 100
- Max parallel executions: 50 per workflow
- Asset size limit: 100MB per file

### 11.2 Data Flow Rules

- All module outputs are immutable once created
- Outputs are passed by reference, not copied
- Large data (>10MB) stored in asset repo, passed as URI
- Sensitive data (API keys) encrypted at rest
- Execution state persisted after each step

### 11.3 Error Handling

```python
# Each step has defined retry behavior
retry_policy = {
    "max_attempts": 3,
    "backoff": "exponential",
    "on_failure": "pause_for_qc" | "skip" | "fail_workflow"
}
```

---

## 12. Migration Path

For teams coming from visual workflow builders:

### 12.1 Mental Model Shift

**Old Way (Visual):**
"Draw connections between nodes to create flow"

**New Way (Job Instruction):**
"List steps in order like writing instructions"

### 12.2 Conversion Examples

**Make.com Scenario → Job Instruction:**
```
Instead of:
[Trigger] ──→ [Transform] ──→ [Router] ──┬──→ [Action A]
                                          └──→ [Action B]

Write as:
1. Trigger: Watch for new files
2. Transform: Process file data  
3. Evaluate: Check condition
4. Action A: If true, upload to S3
5. Action B: If false, send to review
```

### 12.3 Benefits They'll Experience

1. **Easier debugging** - See exactly which step failed
2. **Faster building** - No positioning/connecting nodes
3. **Better documentation** - Workflow is self-documenting
4. **Quality metrics** - Built-in SPC tracking
5. **Team alignment** - Everyone reads it the same way

---

## Appendix A: Module Type Reference

### Flow Control
- `Start` - Workflow entry point
- `End` - Workflow termination  
- `Loop` - Repeat section
- `Conditional` - Branch logic
- `Wait` - Pause for time/event

### MCP Modules (Partial List)
- `MCP:Replicate` - Image generation
- `MCP:Claude` - Text generation
- `MCP:GPT4` - OpenAI models
- `MCP:GoogleDrive` - File operations
- `MCP:Postgres` - Database queries
- `MCP:Slack` - Messaging
- `MCP:GitHub` - Code operations
[... 3000+ more available]

### QC Modules
- `QC:PassFail` - Binary decision
- `QC:MultiSelect` - Choose best
- `QC:ABTest` - Compare options
- `QC:Score` - Numeric rating
- `QC:Annotate` - Add feedback
- `QC:Classify` - Categorize items

### Transform Modules  
- `Transform:JSON` - Parse/modify
- `Transform:Text` - String operations
- `Transform:Image` - Visual processing
- `Transform:Data` - Type conversion

### Asset Modules
- `Asset:Load` - Retrieve from repo
- `Asset:Save` - Store to repo
- `Asset:Search` - Find assets
- `Asset:Delete` - Remove assets

---

## Appendix B: Execution Context Variables

Available in all modules via `${context.variable}`:

```javascript
context = {
    // Execution metadata
    execution_id: "exec_abc123",
    workflow_id: "wf_product_pipeline",
    workflow_name: "Product Image Pipeline",
    workflow_version: "4.0",
    
    // Timing
    start_time: "2024-10-29T10:00:00Z",
    current_time: "2024-10-29T10:15:23Z",
    
    // User context
    user_id: "user_123",
    organization_id: "org_456",
    
    // Environment
    environment: "production",
    
    // Step outputs (accumulating)
    step_1: { /* outputs */ },
    step_2: { /* outputs */ },
    // ... etc
    
    // QC metrics
    qc_stats: {
        first_pass_yield: 0.94,
        defect_rate: 0.06,
        cycle_time: 38
    }
}
```

---

## Appendix C: Common Patterns

### Pattern 1: Retry on QC Failure
```
1. Generate content (MCP)
2. QC Check
3. If failed, goto 1 (max 3 attempts)
4. Store approved content
```

### Pattern 2: Multi-Model Comparison
```
1. Initialize prompt
2. Generate with Model A (MCP:ModelA)
3. Generate with Model B (MCP:ModelB)  
4. A/B Test (QC:ABTest)
5. Store winner
```

### Pattern 3: Progressive Enhancement
```
1. Generate base content
2. QC: Acceptable? 
3. Enhance if passed
4. QC: Improved?
5. Store final version
```

### Pattern 4: Batch Processing
```
1. Load dataset (Asset:Load)
2. Loop: For each item
   a. Process item (MCP)
   b. Validate (QC)
   c. Store result
3. Generate report
```

---

## Final Words

The Binary Blender platform is NOT another visual workflow builder. It's a **digital implementation of manufacturing work instructions** applied to AI orchestration. Every design decision should reinforce this paradigm:

- **Linear over complex** (steps flow top to bottom)
- **Structured over free-form** (modules align to step rows)
- **Parallel within steps** (side-by-side execution where logical)
- **Quality over speed** (QC gates are features, not obstacles)
- **Clarity over flexibility** (constrained design prevents spaghetti)

The working prototype proves this approach works: modules can be placed side-by-side for parallel execution within a step, but the overall flow remains a clear, top-to-bottom job instruction that any operator could follow.

When developers ask "Can we add arbitrary connections?" the answer is **NO** - flow is always between steps.
When they suggest "What about complex branching?" remind them **Steps execute in order**.
When they propose "Free-form canvas?" point them to the prototype - **modules align to step rows**.

This is our differentiator. This is our moat. This is what makes Binary Blender the **Toyota Production System of AI workflows**.
