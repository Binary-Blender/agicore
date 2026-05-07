# Quick Start Guide

Get the Binary Blender Orchestrator running in 5 minutes.

## Prerequisites

- Python 3.9+ installed
- PostgreSQL (optional - SQLite works for dev)
- Docker & Docker Compose (optional)

---

## Option 1: Docker Compose (Recommended)

```bash
# Clone the repository
git clone <repo-url>
cd fermata-aio-reference

# Copy environment template
cp .env.example .env

# Edit .env and add your API keys (OpenAI, etc.)
nano .env

# Start everything
docker-compose up

# API will be running at http://localhost:8000
# Docs at http://localhost:8000/docs
```

---

## Option 2: Local Development

### 1. Install Dependencies

```bash
# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install packages
pip install -r requirements.txt
```

### 2. Setup Database

```bash
# Option A: Use SQLite (easiest)
export DATABASE_URL="sqlite:///./orchestrator.db"

# Option B: Use PostgreSQL (production)
export DATABASE_URL="postgresql://user:pass@localhost:5432/orchestrator"

# Run migrations
alembic upgrade head
```

### 3. Configure Environment

```bash
# Copy template
cp .env.example .env

# Add your API keys
export OPENAI_API_KEY="sk-..."
export ANTHROPIC_API_KEY="sk-ant-..."
```

### 4. Run API Server

```bash
uvicorn src.api.main:app --reload

# API at http://localhost:8000
# Docs at http://localhost:8000/docs
```

---

## Run Example Workflow

```bash
python examples/simple_workflow.py
```

**Expected Output**:
```
Binary Blender Orchestrator - Simple Workflow Example
==========================================================

Workflow: Simple Image Pipeline
Description: Generate an image and get human approval
Modules: 2
Connections: 1

▶️  Executing workflow...

Execution ID: exec_a1b2c3d4
State: paused_for_qc

⏸️  Workflow PAUSED for human review

Pending QC Tasks: 1
  Task ID: qc_a1b2c3d4
  Assets to review: 3

👤 Simulating human review...
  Approved: 3 images

▶️  Resuming workflow with QC results...
✅ Workflow resumed successfully

Final State: completed

📦 Total Assets Created: 3
  1. asset_abc (image) - State: approved
  2. asset_def (image) - State: approved
  3. asset_ghi (image) - State: approved

✅ Example complete!
```

---

## Test SPC Progressive Sampling

```bash
python src/spc/progressive_sampling.py
```

**Expected Output**:
```
Simulating progressive sampling with 95% pass rate...

After 20 samples:
  Pass rate: 95.0%
  Sampling rate: 100%
  Cpk: 0.00

After 60 samples:
  Pass rate: 95.0%
  Sampling rate: 50%
  Cpk: 1.33

After 120 samples:
  Pass rate: 95.2%
  Sampling rate: 5%
  Cpk: 2.00

==================================================
COST SAVINGS ANALYSIS
==================================================
Total tasks: 200
QC performed: 35 (18%)
Cost without SPC: $100.00
Cost with SPC: $17.50
💰 SAVINGS: $82.50 (82.5%)
```

---

## Next Steps

1. **Read the Guides**:
   - `AI_ASSISTANT_GUIDE.md` - Comprehensive technical guide
   - `README.md` - Architecture overview
   - `ARCHITECTURE.md` - Deep technical dive

2. **Create Your First Module**:
   ```python
   # src/modules/my_module.py
   from .base import BaseModule, ModuleDefinition

   class MyModule(BaseModule):
       def get_definition(self):
           return ModuleDefinition(...)

       async def execute(self, inputs, execution_context):
           # Your logic here
           pass
   ```

3. **Build a Workflow**:
   - See `examples/simple_workflow.py` for patterns
   - Use `WorkflowEngine` to execute
   - Add QC checkpoints with `QCModule`

4. **Deploy to Production**:
   - Use `Dockerfile` for containerization
   - Use `docker-compose.yml` for full stack
   - See database migrations in `alembic/versions/`

---

## Troubleshooting

**Q: "Asset repository not set" error**

A: Make sure `WorkflowEngine` is initialized with `asset_repo`:
```python
engine = WorkflowEngine(asset_repo=asset_repository_instance)
```

**Q: Workflow doesn't pause for QC**

A: QC module must set `execution_context["should_pause"] = True`

**Q: Can't connect to database**

A: Check `DATABASE_URL` in `.env` and ensure PostgreSQL is running

**Q: Module not found**

A: Register custom modules in `src/modules/__init__.py`:
```python
from .my_module import MyModule
from .base import module_registry
module_registry.register(MyModule)
```

---

## Support

- Check `AI_ASSISTANT_GUIDE.md` for detailed implementation guidance
- Join TAO community: https://www.skool.com/tao-tactical-ai-orchestration-4733
- Report issues: GitHub Issues

---

**Happy Orchestrating!** 🚀
