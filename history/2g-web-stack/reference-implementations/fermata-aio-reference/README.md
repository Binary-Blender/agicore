# Binary Blender Orchestrator - Reference Implementation

> **The production-ready AI workflow engine with human checkpoints and progressive quality control**

Make.com for AI + Statistical Process Control + Git-like asset lineage = **95% cost reduction** while maintaining quality.

---

## What Is This?

The Binary Blender Orchestrator is a **modular AI workflow engine** that solves three critical problems:

1. **Quality Control Is Too Expensive** - Reviewing every AI output costs 12.5x more than generation
2. **Workflows Are Brittle** - Black boxes with no visibility, lineage, or retry capability
3. **No Learning Loop** - Systems never get smarter about when to ask for help

### The Solution: Three Breakthrough Patterns

```
┌─────────────────────────────────────────────────────────────┐
│ 1. MODULAR COMPONENTS (Like Make.com for AI)               │
│    ✓ Connect any AI service (OpenAI, Anthropic, ElevenLabs)│
│    ✓ Self-contained modules with inputs/outputs            │
│    ✓ Drag-and-drop workflow builder                        │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ 2. HUMAN QC CHECKPOINTS (Pause/Resume Workflows)            │
│    ✓ Workflows pause for human review                      │
│    ✓ Resume from exact same point                          │
│    ✓ No reprocessing or data loss                          │
│    ✓ Complete audit trail                                  │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ 3. SPC PROGRESSIVE SAMPLING (Auto-Reduce QC 100% → 5%)     │
│    ✓ Start: 100% review (learning)                         │
│    ✓ Week 2: 50% review (if quality good)                  │
│    ✓ Week 4: 5% review (if quality excellent)              │
│    ✓ Quality drops? Back to 100% automatically             │
└─────────────────────────────────────────────────────────────┘
```

---

## Real Production Results

**MelodyLMS** (compliance training → music videos):

| Metric | Before | After | Savings |
|--------|--------|-------|---------|
| AI Generations/Week | 500 | 500 | - |
| Human Reviews | 500 (100%) | 35 (7%) | **93%** |
| QC Cost/Week | $250 | $17.50 | **$232.50** |
| Annual Savings | - | - | **$12,090** |
| Pass Rate | 89% | 97% | **+8%** |

**Result**: Better quality, 93% lower cost, full compliance audit trail.

---

## Quick Start

### Installation

```bash
# Clone reference implementation
git clone https://github.com/binary-blender/orchestrator-reference.git
cd orchestrator-reference

# Install dependencies
pip install -r requirements.txt

# Setup database
alembic upgrade head

# Run API server
uvicorn src.api.main:app --reload
```

### Your First Workflow (3 minutes)

```python
from src.models.workflow import Workflow, ModuleConfig, Connection
from src.engine.workflow_engine import WorkflowEngine
from src.database.repositories import AssetRepository

# Define workflow: Generate image → Human review → Enhance
workflow = Workflow(
    name="Image Pipeline",
    description="Generate and QC images",
    modules=[
        ModuleConfig(
            id="gen",
            type="image_generator",
            name="Generate",
            config={"prompt": "sunset", "count": 5}
        ),
        ModuleConfig(
            id="qc",
            type="qc_review",
            name="QC",
            config={"review_mode": "individual"}
        ),
        ModuleConfig(
            id="enhance",
            type="image_enhancer",
            name="Enhance",
            config={"upscale_factor": 2}
        )
    ],
    connections=[
        Connection("gen", "images", "qc", "images"),
        Connection("qc", "approved_images", "enhance", "images")
    ]
)

# Execute
engine = WorkflowEngine(AssetRepository(db))
execution = await engine.execute_workflow(workflow)

# Workflow pauses at QC checkpoint automatically
# Submit QC results via API: POST /qc/{task_id}/submit
# Workflow resumes and completes enhancement
```

### Running the test suite

The developer environment includes several global pytest plugins which
are incompatible with the pinned pytest version. Disable automatic
plugin discovery before executing the tests:

```bash
PYTEST_DISABLE_PLUGIN_AUTOLOAD=1 pytest
```

---

## Architecture Overview

### Asset-Centric Data Flow

```
┌─────────┐     ┌──────────────┐     ┌─────────┐
│ PDF     │────>│ Text Extract │────>│ Asset   │
│ Upload  │     │ Module       │     │ Repo    │
└─────────┘     └──────────────┘     └─────────┘
                                           │
                                           │ Asset ID: "asset_abc"
                                           ↓
┌─────────┐     ┌──────────────┐     ┌─────────┐
│ Lyrics  │<────│ Lyric Gen    │<────│ Fetch   │
│ Asset   │     │ Module       │     │ Asset   │
└─────────┘     └──────────────┘     └─────────┘
     │
     │ Asset ID: "asset_def"
     ↓
┌──────────┐     ┌──────────┐
│ QC       │────>│ PAUSE    │
│ Module   │     │ Workflow │
└──────────┘     └──────────┘
     │
     │ Human approves
     ↓
┌──────────┐     ┌──────────┐
│ RESUME   │────>│ Audio    │
│ Workflow │     │ Module   │
└──────────┘     └──────────┘
```

**Key Concept**: Modules exchange **asset IDs** (strings), not raw data. Every output is persisted with full lineage.

### Module Lifecycle

```python
class MyModule(BaseModule):
    async def execute_with_asset_ids(self, input_ids, context):
        # 1. Fetch input assets
        inputs = await self.fetch_assets(input_ids["images"])

        # 2. Process
        results = self.process(inputs)

        # 3. Create output assets
        output_ids = []
        for result in results:
            asset = await self.create_asset(
                asset_type="image",
                url=result.url,
                metadata={"quality": result.score}
            )
            output_ids.append(asset.id)

        # 4. Return asset IDs
        return {"processed_images": output_ids}
```

---

## Project Structure

```
fermata-aio-reference/
├── AI_ASSISTANT_GUIDE.md       # Comprehensive guide for AI assistants
├── README.md                   # This file
├── ARCHITECTURE.md             # Deep technical dive
├── requirements.txt            # Python dependencies
├── .env.example                # Environment template
├── Dockerfile                  # Production container
├── docker-compose.yml          # Local dev setup
├── alembic.ini                 # Database migrations config
│
├── src/
│   ├── models/
│   │   └── workflow.py         # Workflow, Asset, QCTask models
│   ├── modules/
│   │   ├── base.py             # BaseModule pattern
│   │   ├── qc_module.py        # Human checkpoint
│   │   ├── mcp_module.py       # MCP integration base
│   │   └── examples/           # Sample modules
│   ├── engine/
│   │   └── workflow_engine.py  # Orchestration engine
│   ├── database/
│   │   └── repositories.py     # Asset repository
│   ├── api/
│   │   └── main.py             # FastAPI application
│   └── spc/
│       └── progressive_sampling.py  # SPC quality control
│
├── examples/
│   ├── simple_workflow.py      # Basic example
│   ├── image_pipeline.py       # Image generation + QC
│   └── melody_lms.py           # Real-world case study
│
├── tests/
│   ├── test_modules.py
│   ├── test_engine.py
│   └── test_qc.py
│
└── alembic/
    └── versions/
        └── 001_initial_schema.py
```

---

## Key Features

### 1. Human Checkpoints (Pause/Resume)

```python
# Workflow automatically pauses at QC module
execution = await engine.execute_workflow(workflow)
# State: PAUSED_FOR_QC

# Human reviews via API or UI
POST /qc/{task_id}/submit
{
  "results": {
    "asset_1": {"decision": "pass"},
    "asset_2": {"decision": "fail"}
  }
}

# Workflow resumes automatically
# State: RUNNING → COMPLETED
```

### 2. Asset Lineage Tracking

Every asset knows its full history:

```python
# Get asset lineage
lineage = await asset_repo.get_lineage("asset_final_video")

# Returns:
# [
#   Asset(id="asset_final_video", module="video_gen", parent_ids=["asset_image_1", "asset_audio_1"]),
#   Asset(id="asset_image_1", module="image_gen", parent_ids=["asset_text_1"]),
#   Asset(id="asset_audio_1", module="audio_gen", parent_ids=["asset_lyrics_1"]),
#   Asset(id="asset_text_1", module="pdf_extract", parent_ids=["asset_pdf_upload"]),
#   Asset(id="asset_lyrics_1", module="lyric_gen", parent_ids=["asset_text_1"]),
#   Asset(id="asset_pdf_upload", module="file_upload", parent_ids=[])
# ]
```

### 3. Progressive Sampling (SPC)

Automatically reduces human review as AI proves reliable:

```python
from src.spc.progressive_sampling import SPCController

spc = SPCController()

# First 50 images: 100% QC
for i in range(50):
    if spc.should_require_qc("dalle"):  # Always True
        await qc_review(image)
    await spc.record_result("dalle", passed=True)

# Next 50 images: ~50% QC (if pass rate > 80%)
for i in range(50):
    if spc.should_require_qc("dalle"):  # ~50% True
        await qc_review(image)
    await spc.record_result("dalle", passed=True)

# After 100 images: ~5% QC (if pass rate > 95%)
for i in range(100):
    if spc.should_require_qc("dalle"):  # ~5% True
        await qc_review(image)
    await spc.record_result("dalle", passed=True)
```

---

## API Endpoints

```
POST   /workflows              Create workflow
GET    /workflows/{id}         Get workflow definition
POST   /workflows/{id}/execute Execute workflow
GET    /executions/{id}        Get execution status

GET    /qc/pending             Get pending QC tasks
POST   /qc/{id}/submit         Submit QC results

GET    /assets/{id}            Get asset details
GET    /assets/{id}/lineage    Get full lineage

GET    /stats                  Get SPC statistics
```

---

## Creating Custom Modules

### Step 1: Create Module Class

```python
# src/modules/my_custom_module.py
from .base import BaseModule, ModuleDefinition

class MyCustomModule(BaseModule):
    def get_definition(self):
        return ModuleDefinition(
            type="my_custom",
            name="My Custom Module",
            description="What it does",
            category="action",
            inputs=["input_data"],
            outputs=["output_data"],
            config_schema={
                "type": "object",
                "properties": {
                    "param1": {"type": "string", "default": "value"}
                }
            },
            icon="⚡"
        )

    async def execute(self, inputs, execution_context):
        # Your logic here
        data = inputs.get("input_data", [])
        results = self.process(data)

        # Create assets
        output_assets = []
        for result in results:
            asset = await self.create_asset(
                asset_type="json",
                payload=result,
                execution_context=execution_context
            )
            output_assets.append(asset.id)

        return {"output_data": output_assets}

    def process(self, data):
        # Your processing logic
        return [{"processed": item} for item in data]
```

### Step 2: Register Module

```python
# src/modules/__init__.py
from .my_custom_module import MyCustomModule
from .base import module_registry

module_registry.register(MyCustomModule)
```

### Step 3: Use in Workflows

```python
workflow = Workflow(
    modules=[
        ModuleConfig(
            id="custom_1",
            type="my_custom",
            name="My Custom Step",
            config={"param1": "test_value"}
        )
    ]
)
```

---

## Database Schema

### Core Tables

- **workflows** - Workflow definitions
- **workflow_modules** - Module configurations
- **workflow_connections** - Module connections
- **workflow_executions** - Execution instances
- **assets** - All generated assets with lineage
- **qc_tasks** - Human review tasks
- **qc_decisions** - Human decisions per asset

See `alembic/versions/001_initial_schema.py` for complete schema.

---

## Production Deployment

### Docker

```bash
# Build
docker build -t orchestrator:latest .

# Run
docker run -p 8000:8000 \
  -e DATABASE_URL=postgresql://... \
  orchestrator:latest
```

### Docker Compose (Local Dev)

```bash
docker-compose up
```

Includes:
- FastAPI application
- PostgreSQL database
- Redis (for caching/queuing)
- Prometheus (metrics)

---

## Testing

```bash
# Unit tests
pytest tests/

# Integration tests
pytest tests/ --integration

# Coverage
pytest --cov=src --cov-report=html
```

---

## Use Cases

### 1. Content Generation Pipelines

PDF → Extract Text → Generate Lyrics → Generate Audio → Generate Images → Generate Video → QC → Publish

### 2. Image Processing Workflows

Upload → Generate Variations → QC Review → Enhance → Watermark → Publish

### 3. Multi-Model Orchestration

Prompt → GPT-4 Draft → Claude Review → DALL-E Images → Human QC → Final Assembly

### 4. Data Processing Pipelines

CSV → Transform → Validate → QC Check → Export → Notify

---

## Real-World Example: MelodyLMS

**Problem**: Convert boring compliance PDFs into engaging music videos for employee training.

**Workflow**:

1. **PDF Upload** → Store as asset
2. **Text Extraction (GPT-4)** → Extract policy text
3. **Lyric Generation (GPT-4)** → Create song lyrics
4. **[HUMAN QC]** → Admin reviews lyrics (approve/reject)
5. **Audio Generation (ElevenLabs)** → Generate music
6. **Image Generation (DALL-E)** → Create visuals
7. **[HUMAN QC]** → Admin picks best images
8. **Video Generation (Akool)** → Combine audio + images
9. **[HUMAN QC]** → Final approval
10. **Publish** → Create training module + quiz

**Results**:
- 500 videos/week generated
- 93% cost reduction on QC
- 97% pass rate (up from 89%)
- Full compliance audit trail

---

## FAQ

**Q: Do I need to use all three features?**
A: No. Use what you need:
- Just modularity? Skip QC and SPC
- Just human checkpoints? Skip SPC
- Just SPC? Use with your existing QC system

**Q: Can I use my own AI services?**
A: Yes. Create MCP modules for any API (OpenAI, Anthropic, Stability, your custom models).

**Q: Does it work with non-AI workflows?**
A: Yes. Any multi-step process with human review benefits (data processing, content moderation, etc.).

**Q: How do I handle secrets/API keys?**
A: Use environment variables (.env) or secret managers (AWS Secrets Manager, Vault).

**Q: Can workflows branch/loop?**
A: Yes. Use conditional connections and retry mechanisms.

**Q: What database is required?**
A: PostgreSQL (recommended) or SQLite (dev/testing).

---

## Contributing

We welcome contributions! Areas we'd love help with:

- New module types (video processing, audio, etc.)
- UI/dashboard improvements
- Performance optimizations
- Documentation improvements
- Integration examples

See `CONTRIBUTING.md` for guidelines.

---

## License

MIT License - see LICENSE file.

---

## Resources

- **Masterclass**: [Binary Blender Orchestrator Masterclass](https://www.skool.com/tao-tactical-ai-orchestration-4733)
- **Community**: TAO (Tactical AI Orchestration) on Skool
- **Documentation**: `AI_ASSISTANT_GUIDE.md` (comprehensive technical guide)
- **Architecture Deep Dive**: `ARCHITECTURE.md`
- **Examples**: `examples/` directory

---

## Credits

Built by **Binary Blender** as the core architecture for:
- MelodyLMS (compliance → music videos)
- ThrashForge (AI coding workflows)
- Parlando (community content)
- Honky-Tonk FMS (farm management AI)

**Architecture Version**: 2.0
**Last Updated**: 2025-11-23

---

**Stop burning money on unnecessary reviews. Start with the reference implementation today.** 🚀
