# Fly.io Quick Fix Reference Card

## 🔥 Emergency Commands

```bash
# What's happening right now?
flyctl logs -a ai-workflow-spc | tail -50

# Is anything running?
flyctl status -a ai-workflow-spc

# Force restart everything
flyctl apps restart -a ai-workflow-spc

# Scale to zero then back up
flyctl scale count 0 -a ai-workflow-spc
flyctl scale count 1 -a ai-workflow-spc
```

## Common Issues & Solutions

### Issue 1: "Health check timeout"
**Symptom:** Deployment fails with health check timeout  
**Cause:** Migration taking too long

**Quick Fix:**
```bash
# SSH in and run migration manually
flyctl ssh console -a ai-workflow-spc
cd /app
alembic upgrade head
exit

# Then redeploy without migration
# Comment out migration line in start.sh
flyctl deploy
```

### Issue 2: "No machines available"
**Symptom:** App shows no running machines  
**Cause:** All machines failed to start

**Quick Fix:**
```bash
# Increase resources
flyctl scale vm shared-cpu-1x --memory 1024

# Force new machine
flyctl machine run . -a ai-workflow-spc
```

### Issue 3: "Database connection failed"
**Symptom:** Logs show database connection errors  
**Cause:** DATABASE_URL not set or incorrect

**Quick Fix:**
```bash
# Check if DATABASE_URL exists
flyctl secrets list -a ai-workflow-spc

# Re-attach database
flyctl postgres attach -a ai-workflow-spc ai-workflow-spc-db

# Verify connection
flyctl postgres connect -a ai-workflow-spc-db
```

### Issue 4: "Port 8000 already in use"
**Symptom:** Container fails to start  
**Cause:** Multiple processes trying to bind port

**Quick Fix:**
Update start.sh to kill existing process:
```bash
#!/bin/bash
# Kill any existing uvicorn
pkill -f uvicorn || true
sleep 2

# Start fresh
uvicorn src.main_workflow_db:app --host 0.0.0.0 --port 8000
```

### Issue 5: "Module import errors"
**Symptom:** Python import errors in logs  
**Cause:** New files not included in Docker build

**Quick Fix:**
```bash
# Ensure all files are committed
git status
git add -A
git commit -m "Include all Sprint 6 files"
git push

# Clean deploy
flyctl deploy --no-cache
```

## The Nuclear Option

If nothing works:

```bash
# 1. Backup your database
flyctl postgres backup create -a ai-workflow-spc-db

# 2. Destroy the app (keeps database)
flyctl apps destroy ai-workflow-spc -y

# 3. Recreate from scratch
flyctl launch --name ai-workflow-spc --region iad --no-deploy

# 4. Attach database
flyctl postgres attach -a ai-workflow-spc ai-workflow-spc-db

# 5. Deploy fresh
flyctl deploy
```

## Health Check Test

Test if your app works locally first:

```bash
# Run locally with production settings
export DATABASE_URL="your-prod-db-url"
uvicorn src.main_workflow_db:app --host 0.0.0.0 --port 8000

# In another terminal
curl http://localhost:8000/health
```

## Monitoring During Deploy

Open 3 terminals:

**Terminal 1:** Deploy
```bash
flyctl deploy --verbose
```

**Terminal 2:** Watch logs
```bash
flyctl logs -a ai-workflow-spc
```

**Terminal 3:** Monitor machines
```bash
watch flyctl status -a ai-workflow-spc
```

## Success Indicators

You know it's working when:
- ✅ `flyctl status` shows 1+ machines running
- ✅ Logs show "Uvicorn running on http://0.0.0.0:8000"
- ✅ https://ai-workflow-spc.fly.dev/health returns 200
- ✅ No ERROR messages in last 50 log lines

## Get Help

```bash
# Fly.io system status
flyctl status -a ai-workflow-spc --json | jq

# Detailed machine info
flyctl machine status <machine-id> -a ai-workflow-spc

# SSH to debug
flyctl ssh console -a ai-workflow-spc
ps aux | grep python
netstat -tlnp
```

Remember: The Sprint 6.0 code is solid. This is just a deployment configuration issue. Most likely the migration is timing out - run it manually first!
