# Frontend Service Documentation

## Purpose

The Frontend Service serves the user interface for the Binary-Blender Orchestrator platform.

## Responsibilities

- **Static File Serving**: Serve HTML, JavaScript, and CSS files
- **Service Discovery**: Provide `/api/config` endpoint for microservice URLs
- **No Business Logic**: All API calls go directly to Engine or Assets services
- **No Database Access**: Frontend has no direct database connection

## Technology Stack

- **FastAPI**: Python web framework for static file serving
- **Vue.js 3**: Frontend framework (loaded via CDN)
- **Axios**: HTTP client for API calls
- **No Build Step**: All HTML/JS files are served directly

## Port

- **8000** (configurable via `PORT` environment variable)

## API Endpoints

### GET /
Returns: `index.html`

### GET /{page}.html
Returns: Specified HTML page (e.g., `/workflows.html`, `/assets.html`)

### GET /api/config
Returns microservice URLs for frontend JavaScript to use:

```json
{
  "services": {
    "assets": "http://localhost:8001",
    "engine": "http://localhost:8002"
  },
  "version": "1.0.0",
  "environment": "development"
}
```

### GET /health
Health check endpoint:

```json
{
  "status": "healthy",
  "service": "frontend",
  "version": "1.0.0"
}
```

## Configuration

The frontend uses a two-tier configuration system:

### 1. Backend Configuration (src/main.py)
Environment variables read by the FastAPI server:

- `PORT` - Port to run on (default: 8000)
- `ASSETS_SERVICE_URL` - URL of Assets Service
- `ENGINE_SERVICE_URL` - URL of Engine Service
- `CORS_ORIGINS` - Allowed CORS origins (default: *)
- `LOG_LEVEL` - Logging level (default: INFO)

### 2. Frontend Configuration (config.js)
JavaScript that runs in the browser:

- Auto-loads on page load
- Calls `/api/config` to get service URLs
- Provides helper functions: `getAssetsUrl()`, `getEngineUrl()`
- Stores config in `window.appConfig`

## Frontend Pages

| Page | Description | Primary Service |
|------|-------------|-----------------|
| index.html | Main landing page / image generation | Engine |
| workflows.html | Workflow management (list, create, edit) | Engine |
| builder.html | Visual workflow builder | Engine |
| qc.html | Quality control review interface | Assets |
| assets.html | Asset repository browser | Assets |
| analytics.html | Analytics dashboard | Engine |
| spc-analytics.html | SPC (Statistical Process Control) charts | Engine |
| execution_logs.html | Execution log viewer | Engine |

## Using config.js in HTML Files

### Step 1: Include config.js
```html
<head>
    <script src="/config.js"></script>
</head>
```

### Step 2: Load configuration in Vue app
```javascript
const app = Vue.createApp({
  data() {
    return {
      assetsApiUrl: null,
      engineApiUrl: null,
      assets: []
    }
  },
  async mounted() {
    // Load configuration first
    await loadConfig();

    // Get service URLs
    this.assetsApiUrl = window.appConfig.services.assets;
    this.engineApiUrl = window.appConfig.services.engine;

    // Now make API calls
    await this.loadAssets();
  },
  methods: {
    async loadAssets() {
      const response = await axios.get(`${this.assetsApiUrl}/assets`);
      this.assets = response.data.assets;
    }
  }
});
```

### Step 3: Use helper functions (alternative)
```javascript
// Instead of manually constructing URLs:
const url = `${this.assetsApiUrl}/assets`;

// Use helper functions:
const url = getAssetsUrl('/assets');
```

## Development

### Run Locally
```bash
# Install dependencies
pip install -r requirements.txt

# Set environment variables
export ASSETS_SERVICE_URL="http://localhost:8001"
export ENGINE_SERVICE_URL="http://localhost:8002"

# Run the server
python -m src.main

# Or use uvicorn directly
uvicorn src.main:app --reload --port 8000
```

### Test Endpoints
```bash
# Health check
curl http://localhost:8000/health

# Get configuration
curl http://localhost:8000/api/config

# Get a page
curl http://localhost:8000/workflows.html
```

## Deployment

### Fly.io Deployment

```bash
# Create app
flyctl apps create ai-workflow-frontend

# Set secrets
flyctl secrets set \
  ASSETS_SERVICE_URL="https://ai-workflow-assets.fly.dev" \
  ENGINE_SERVICE_URL="https://ai-workflow-engine.fly.dev" \
  --app ai-workflow-frontend

# Deploy
flyctl deploy --app ai-workflow-frontend
```

### Environment Variables for Production

```bash
# Required
ASSETS_SERVICE_URL=https://ai-workflow-assets.fly.dev
ENGINE_SERVICE_URL=https://ai-workflow-engine.fly.dev

# Optional
PORT=8000
LOG_LEVEL=INFO
ENVIRONMENT=production
CORS_ORIGINS=https://yourdomain.com
```

## Project Structure

```
frontend/
├── _project_docs/          # Documentation
│   ├── README.md           # This file
│   ├── ARCHITECTURE.md     # Overall architecture
│   └── API_MIGRATION_GUIDE.md  # Migration guide
├── src/
│   └── main.py             # FastAPI application
├── *.html                  # HTML pages
├── config.js               # Frontend configuration loader
├── requirements.txt        # Python dependencies
├── Dockerfile              # Container definition
├── fly.toml                # Fly.io config
└── .env.example            # Environment template
```

## Related Services

- **Engine Service**: Port 8002 - Workflow execution
- **Assets Service**: Port 8001 - Asset management

## Migration Status

- ✅ Service created
- ✅ Static file serving working
- ✅ Configuration endpoint implemented
- ✅ Deployment configuration ready
- ⏳ HTML files need to be updated to use config.js
- ⏳ Not yet deployed to production
