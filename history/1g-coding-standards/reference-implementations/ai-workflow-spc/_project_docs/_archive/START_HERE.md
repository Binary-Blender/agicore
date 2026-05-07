# 🚀 Quick Start - Backend is Not Running!

## The Problem
Your workflows are stuck at "running" because the backend isn't running. The executions were created in the database but never processed.

## The Solution - Start the Backend

```bash
./start_backend.sh
```

This will:
1. Check for Python (venv or system)
2. Install dependencies if needed  
3. Start the backend server
4. Show logs in real-time

## After Starting

### Check It's Running
```bash
curl http://localhost:8000/health
# Should return: {"status": "healthy"}
```

### Watch the Logs
```bash
tail -f backend.log | grep "\[TIMING\]"
```

### Create a NEW Workflow Execution
The old stuck ones (exec_9fc3c4e9, exec_9ebb7f3b) may stay stuck.
Create a fresh execution in the UI and watch the timing logs!

---

**TL;DR:** Run `./start_backend.sh` then create a new workflow execution.
