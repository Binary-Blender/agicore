# API Migration Guide

This document maps the old monolith API endpoints to the new microservices architecture.

## Overview

The monolith API has been split into two backend services:

- **Assets Service** (port 8001): Asset management, QC tasks, A/B testing
- **Execution Service** (port 8002): Workflow execution, module logic, MCP integration

## Endpoint Mapping

### Assets Service Endpoints

| Old Monolith Endpoint | New Assets Service Endpoint | Method | Description |
|----------------------|----------------------------|--------|-------------|
| `/assets` | `/assets` | GET | List assets |
| `/assets` | `/assets` | POST | Create asset |
| `/assets/{id}` | `/assets/{id}` | GET | Get asset by ID |
| `/assets/{id}/state` | `/assets/{id}/state` | PUT | Update asset state |
| `/assets/{id}` | `/assets/{id}` | DELETE | Delete asset |
| `/qc/pending` | `/qc/tasks` | GET | List QC tasks |
| `/qc/submit` | `/qc/{task_id}/review` | POST | Submit QC review |
| `/ab-test/config` | `/ab-tests` | POST | Create A/B test |
| `/ab-test/results` | `/ab-tests` | GET | Get A/B test results |

### Execution Service Endpoints

| Old Monolith Endpoint | New Execution Service Endpoint | Method | Description |
|----------------------|-------------------------------|--------|-------------|
| `/generate` | `/workflows/{id}/execute` | POST | Execute workflow (replaces generate) |
| `/workflows` | `/workflows` | GET | List workflows |
| `/workflows` | `/workflows` | POST | Create workflow |
| `/workflows/{id}` | `/workflows/{id}` | GET | Get workflow by ID |
| `/workflows/{id}` | `/workflows/{id}` | PUT | Update workflow |
| `/workflows/{id}` | `/workflows/{id}` | DELETE | Delete workflow |
| `/workflows/{id}/clone` | `/workflows/{id}/clone` | POST | Clone workflow |
| `/executions` | `/executions` | GET | List workflow executions |
| `/executions/{id}` | `/executions/{id}` | GET | Get execution details |
| `/stats` | `/stats` | GET | Get platform statistics |

## Frontend Changes Required

### 1. Import config.js

Add to the `<head>` of each HTML file:

```html
<script src="/config.js"></script>
```

### 2. Update API URL References

**OLD (Monolith):**
```javascript
data() {
  return {
    apiUrl: 'http://localhost:8000'  // Single monolith URL
  }
}
```

**NEW (Microservices):**
```javascript
data() {
  return {
    assetsApiUrl: null,
    executionApiUrl: null
  }
},
async mounted() {
  // Load configuration first
  await loadConfig();
  this.assetsApiUrl = window.appConfig.services.assets;
  this.executionApiUrl = window.appConfig.services.execution;
}
```

### 3. Update API Calls

#### Example 1: Get Assets

**OLD:**
```javascript
const response = await axios.get(`${this.apiUrl}/assets`);
```

**NEW (Option 1 - Direct URL):**
```javascript
const response = await axios.get(`${this.assetsApiUrl}/assets`);
```

**NEW (Option 2 - Helper Function):**
```javascript
const response = await axios.get(getAssetsUrl('/assets'));
```

#### Example 2: Execute Workflow

**OLD:**
```javascript
const response = await axios.post(`${this.apiUrl}/generate`, {
  prompt: this.prompt
});
```

**NEW:**
```javascript
const response = await axios.post(`${this.executionApiUrl}/workflows/${workflowId}/execute`, {
  inputs: { prompt: this.prompt }
});
```

#### Example 3: Get QC Tasks

**OLD:**
```javascript
const response = await axios.get(`${this.apiUrl}/qc/pending`);
```

**NEW:**
```javascript
const response = await axios.get(`${this.assetsApiUrl}/qc/tasks?status=pending`);
```

#### Example 4: Submit QC Review

**OLD:**
```javascript
await axios.post(`${this.apiUrl}/qc/submit`, {
  task_id: taskId,
  image_position: position,
  result: 'pass'
});
```

**NEW:**
```javascript
await axios.post(`${this.assetsApiUrl}/qc/${taskId}/review`, {
  decisions: [
    { asset_id: assetId, decision: 'pass' }
  ]
});
```

## Service-Specific Changes

### Assets Service

**Authentication:**
All Assets Service endpoints require authentication via Bearer token or API key.

**Request Headers:**
```javascript
const headers = {
  'Authorization': 'Bearer YOUR_API_KEY',
  'Content-Type': 'application/json'
};
```

**Tenant Isolation:**
The Assets Service automatically isolates data by tenant based on the authenticated user's token.

### Execution Service

**Workflow Execution:**
Instead of `/generate`, use `/workflows/{id}/execute`:

```javascript
// Create or get workflow first
const workflowResponse = await axios.post(`${executionApiUrl}/workflows`, {
  name: "Image Generation",
  modules: [
    {
      id: "gen1",
      type: "image_generation",
      config: { provider: "akool" }
    }
  ]
});

const workflowId = workflowResponse.data.workflow.id;

// Execute workflow
const executionResponse = await axios.post(
  `${executionApiUrl}/workflows/${workflowId}/execute`,
  {
    inputs: { prompt: "A beautiful sunset" }
  }
);
```

## Migration Checklist

For each HTML file:

- [ ] Add `<script src="/config.js"></script>` to `<head>`
- [ ] Replace single `apiUrl` with `assetsApiUrl` and `executionApiUrl`
- [ ] Add `await loadConfig()` in `mounted()` hook
- [ ] Update asset-related API calls to use `assetsApiUrl`
- [ ] Update workflow/execution API calls to use `executionApiUrl`
- [ ] Update QC endpoints from `/qc/pending` to `/qc/tasks?status=pending`
- [ ] Update QC submit from single image to batch review format
- [ ] Test all API calls with actual services running

## Testing

### Local Testing Setup

1. **Start Assets Service:**
```bash
cd binary-blender-orchestrator-assets
python -m src.main  # Port 8001
```

2. **Start Execution Service:**
```bash
cd binary-blender-orchestrator-execution
python -m src.main  # Port 8002
```

3. **Start Frontend Service:**
```bash
cd binary-blender-orchestrator-frontend
python -m src.main  # Port 8000
```

4. **Open browser:**
```
http://localhost:8000
```

### Verify Configuration

Open browser console and check:
```javascript
console.log(window.appConfig);
// Should show:
// {
//   services: {
//     assets: "http://localhost:8001",
//     execution: "http://localhost:8002"
//   },
//   loaded: true
// }
```

## Common Issues

### CORS Errors

If you see CORS errors in the browser console, make sure the Assets and Execution services have CORS enabled for the frontend origin:

```python
# In Assets/Execution service main.py
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:8000", "https://your-frontend-domain.com"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### Authentication Errors (401)

Make sure you're passing the API key or JWT token to the Assets Service:

```javascript
// For development, use API key
const config = {
  headers: {
    'Authorization': 'Bearer your-api-key-here'
  }
};

const response = await axios.get(`${assetsApiUrl}/assets`, config);
```

### Configuration Not Loaded

If `window.appConfig.loaded` is `false`, the `/api/config` endpoint might not be accessible. Check:

1. Frontend service is running
2. `/api/config` endpoint returns valid JSON
3. No network errors in browser console

## Rollback Plan

If issues occur during migration:

1. The original monolith is still available at `binary-blender-ai-platform` repository
2. You can run the monolith alongside the microservices
3. Switch the frontend to point back to the monolith by updating `apiUrl`

## Next Steps

After migrating the frontend:

1. Test all functionality with microservices
2. Update any hardcoded URLs in JavaScript
3. Update environment variables for production deployment
4. Deploy all three services (Frontend, Assets, Execution) to Fly.io
5. Update DNS/load balancer configuration
6. Monitor logs for any API errors
