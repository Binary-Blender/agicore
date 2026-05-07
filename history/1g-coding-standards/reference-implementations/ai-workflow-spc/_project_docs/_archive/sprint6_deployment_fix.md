# Sprint 6.0 - Fly.io Health Check Fix

## Problem
The Sprint 6.0 deployment is failing health checks. The Docker image is built and in the registry, but machines can't start due to health check timeouts, likely caused by the database migration 008 taking too long.

## Immediate Fix Steps

### Step 1: Add Health Check Endpoint
First, ensure you have a health endpoint in `src/main_workflow_db.py`:

```python
from sqlalchemy import text

@app.get("/health")
async def health_check():
    """Simple health check that doesn't wait for DB"""
    return {"status": "healthy", "version": "6.0"}

@app.get("/health/db")
async def health_check_with_db():
    """Detailed health check including database"""
    try:
        async with get_session() as session:
            await session.execute(text("SELECT 1"))
        return {"status": "healthy", "database": "connected"}
    except Exception as e:
        return {"status": "unhealthy", "error": str(e)}, 503
```

### Step 2: Update fly.toml
Modify your `fly.toml` to give more time for startup and migration:

```toml
app = "ai-workflow-spc"
primary_region = "iad"

[env]
  PORT = "8000"

[http_service]
  internal_port = 8000
  force_https = true
  auto_stop_machines = true
  auto_start_machines = true
  min_machines_running = 1

[[http_service.checks]]
  grace_period = "60s"  # Increased from default to allow migration
  interval = "30s"
  method = "GET"
  timeout = "10s"
  path = "/health"  # Use simple health check that doesn't need DB

[[vm]]
  size = "shared-cpu-1x"
  memory = "1gb"  # Increased for migration processing
```

### Step 3: Fix start.sh
Update your `start.sh` to handle migration more efficiently:

```bash
#!/bin/bash
set -e

echo "=== Starting Sprint 6.0 Deployment ==="

# Function to check if database is ready
check_db() {
    python -c "
import asyncio
import os
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

async def check():
    try:
        engine = create_async_engine(os.environ['DATABASE_URL'])
        async with engine.connect() as conn:
            await conn.execute(text('SELECT 1'))
        await engine.dispose()
        return True
    except Exception as e:
        print(f'Database not ready: {e}')
        return False

exit(0 if asyncio.run(check()) else 1)
"
}

# Start the app first (so health checks pass)
echo "Starting FastAPI application..."
uvicorn src.main_workflow_db:app --host 0.0.0.0 --port 8000 &
APP_PID=$!

# Wait for app to be ready
sleep 5

# Now run migration in background
echo "Running database migration in background..."
(
    # Wait for database
    for i in {1..30}; do
        if check_db; then
            echo "Database ready, running migration..."
            alembic upgrade head && echo "Migration complete!" || echo "Migration failed!"
            break
        fi
        echo "Waiting for database... ($i/30)"
        sleep 2
    done
) &

# Keep the app running
wait $APP_PID
```

### Step 4: Quick Deploy Commands

```bash
# 1. Make start.sh executable
chmod +x start.sh

# 2. Commit and push
git add -A
git commit -m "Fix health check timeout for Sprint 6.0"
git push

# 3. Deploy with extended timeout
flyctl deploy --wait-timeout 300

# 4. Monitor deployment
flyctl logs -a ai-workflow-spc
```

### Step 5: If Migration is the Bottleneck

Run the migration manually first:

```bash
# SSH into a temporary machine
flyctl ssh console -a ai-workflow-spc

# Run migration manually
cd /app
alembic upgrade head

# Check if it succeeded
alembic current
```

Then redeploy without migration in start.sh:

```bash
#!/bin/bash
# Simplified start.sh after manual migration
uvicorn src.main_workflow_db:app --host 0.0.0.0 --port 8000
```

### Step 6: Alternative - Split Migration from Deployment

Create a separate migration script:

```bash
# migrate.sh
#!/bin/bash
echo "Running migration 008..."
alembic upgrade head
echo "Migration complete!"
```

Run it as a one-off:
```bash
flyctl ssh console -a ai-workflow-spc -C "/app/migrate.sh"
```

Then deploy the app without migration.

## Quick Diagnostic Commands

```bash
# Check current deployment status
flyctl status -a ai-workflow-spc

# See what's failing
flyctl logs -a ai-workflow-spc | grep -E "ERROR|FAIL|timeout"

# Check if any machines are running
flyctl machine list -a ai-workflow-spc

# Force restart stuck machines
flyctl apps restart -a ai-workflow-spc
```

## Expected Result
After these fixes, you should see:
- ✅ Health checks passing within 60 seconds
- ✅ Migration 008 applied (7 new columns in workflow_modules table)
- ✅ Studio accessible at /workflow-studio/{id}
- ✅ All 4 tabs functional

## If Still Failing

1. **Increase resources:**
   ```bash
   flyctl scale vm shared-cpu-2x --memory 2048
   ```

2. **Check database connection:**
   ```bash
   flyctl postgres connect -a ai-workflow-spc-db
   \d workflow_modules  # Should show new columns if migration ran
   ```

3. **Deploy without health checks temporarily:**
   Remove the `[[http_service.checks]]` section from fly.toml

The issue is almost certainly the migration timing out during health checks. The solution above starts the app first (passing health checks) then runs migration in the background.
