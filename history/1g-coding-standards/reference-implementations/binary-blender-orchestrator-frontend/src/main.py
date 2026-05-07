"""
Frontend Service - Static File Server

Serves the frontend HTML/JS/CSS files and provides configuration
for connecting to the Assets and Execution microservices.
"""
import os
import logging
from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

# Configure logging
logging.basicConfig(level=os.getenv("LOG_LEVEL", "INFO"))
logger = logging.getLogger(__name__)

# Create FastAPI app
app = FastAPI(
    title="Binary-Blender Orchestrator - Frontend Service",
    description="Serves frontend UI and provides configuration",
    version="1.0.0"
)

# CORS - Allow all origins for development
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("CORS_ORIGINS", "*").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Get service URLs from environment
ASSETS_SERVICE_URL = os.getenv("ASSETS_SERVICE_URL", "http://localhost:8001")
ENGINE_SERVICE_URL = os.getenv("ENGINE_SERVICE_URL", "http://localhost:8002")


# ============================================================================
# CONFIGURATION ENDPOINT
# ============================================================================

@app.get("/api/config")
async def get_config():
    """
    Provide frontend configuration including microservice URLs

    The frontend will call this endpoint to discover where the
    Assets and Execution services are running.
    """
    return {
        "services": {
            "assets": ASSETS_SERVICE_URL,
            "engine": ENGINE_SERVICE_URL
        },
        "version": "1.0.0",
        "environment": os.getenv("ENVIRONMENT", "development")
    }


# ============================================================================
# HEALTH CHECK
# ============================================================================

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "frontend",
        "version": "1.0.0"
    }


# ============================================================================
# STATIC FILES
# ============================================================================

# Get the directory where this file is located
BASE_DIR = Path(__file__).resolve().parent.parent
FRONTEND_DIR = BASE_DIR

# Serve HTML files from root
@app.get("/")
async def serve_index():
    """Serve the main index page as the landing page"""
    index_path = FRONTEND_DIR / "index.html"
    if index_path.exists():
        return FileResponse(index_path)
    else:
        return JSONResponse(
            status_code=404,
            content={"error": "index.html not found"}
        )

@app.get("/favicon.ico")
async def serve_favicon():
    """Return a simple favicon to prevent 404 errors"""
    # Return empty 204 response - browsers will use their default favicon
    from fastapi.responses import Response
    return Response(status_code=204)

@app.get("/{page}.html")
async def serve_html_page(page: str):
    """Serve any HTML page"""
    html_path = FRONTEND_DIR / f"{page}.html"
    if html_path.exists():
        return FileResponse(html_path)
    else:
        return JSONResponse(
            status_code=404,
            content={"error": f"{page}.html not found"}
        )

@app.get("/config.js")
async def serve_config_js():
    """Serve the config.js file"""
    config_path = FRONTEND_DIR / "config.js"
    if config_path.exists():
        return FileResponse(config_path, media_type="application/javascript")
    else:
        return JSONResponse(
            status_code=404,
            content={"error": "config.js not found"}
        )

@app.get("/{page}")
async def serve_page_without_extension(page: str):
    """Serve HTML pages without .html extension (for cleaner URLs)"""
    # Skip if it looks like a file with extension or API endpoint
    if "." in page or page == "api":
        return JSONResponse(
            status_code=404,
            content={"error": "Not found"}
        )

    html_path = FRONTEND_DIR / f"{page}.html"
    if html_path.exists():
        return FileResponse(html_path)
    else:
        return JSONResponse(
            status_code=404,
            content={"error": f"{page} not found"}
        )

# Mount static directories if they exist
if (FRONTEND_DIR / "components").exists():
    app.mount("/components", StaticFiles(directory=str(FRONTEND_DIR / "components")), name="components")

if (FRONTEND_DIR / "pages").exists():
    app.mount("/pages", StaticFiles(directory=str(FRONTEND_DIR / "pages")), name="pages")

if (FRONTEND_DIR / "js").exists():
    app.mount("/js", StaticFiles(directory=str(FRONTEND_DIR / "js")), name="js")

if (FRONTEND_DIR / "static").exists():
    app.mount("/static", StaticFiles(directory=str(FRONTEND_DIR / "static")), name="static")


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    logger.info(f"Starting Frontend Service on port {port}")
    logger.info(f"Assets Service URL: {ASSETS_SERVICE_URL}")
    logger.info(f"Engine Service URL: {ENGINE_SERVICE_URL}")
    uvicorn.run(app, host="0.0.0.0", port=port)
