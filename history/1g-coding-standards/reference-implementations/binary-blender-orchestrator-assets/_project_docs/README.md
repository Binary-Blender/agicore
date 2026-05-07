# Binary-Blender Orchestrator - Assets Service

## Overview

The **Assets Service** is responsible for managing all digital assets (images, videos, audio, text) produced by AI workflows, including file storage, metadata management, quality control (QC) tasks, and A/B testing results.

## Purpose

This service handles:
- **Asset Repository**: Store and manage generated assets with metadata
- **Quality Control (QC)**: Manage QC tasks, decisions, and approval workflows
- **File Storage**: Handle file uploads, downloads, and storage (local or S3-compatible)
- **Asset Lineage**: Track which workflows and modules created which assets
- **A/B Testing Results**: Store comparison results between different AI providers

## Technology Stack

- **Framework**: FastAPI (Python 3.11+)
- **Database**: PostgreSQL (shared with Execution Service)
- **ORM**: SQLAlchemy 2.0 (async)
- **Migrations**: Alembic
- **Storage**: Local filesystem (production: S3/R2/MinIO)
- **API**: RESTful JSON API

## Quick Start

```bash
# Install dependencies
pip install -r requirements.txt

# Set environment variables
export DATABASE_URL="postgresql+asyncpg://user:pass@localhost/ai_workflow"
export STORAGE_PATH="/var/ai-workflow/assets"

# Run database migrations
alembic upgrade head

# Start the service
uvicorn src.main:app --host 0.0.0.0 --port 8001
```

## Service Architecture

### Database Models Owned by This Service

1. **Asset** - Digital assets (images, videos, etc.)
2. **QCTask** - Quality control tasks
3. **QCDecision** - Individual QC pass/fail decisions
4. **ABTestResult** - A/B test comparison results

### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/assets` | List all assets |
| `GET` | `/assets/{id}` | Get specific asset |
| `POST` | `/assets` | Create new asset |
| `PUT` | `/assets/{id}/state` | Update asset state |
| `DELETE` | `/assets/{id}` | Delete asset (soft delete) |
| `GET` | `/qc/tasks` | Get pending QC tasks |
| `POST` | `/qc/{task_id}/review` | Submit QC decisions |
| `GET` | `/ab-tests/{execution_id}` | Get A/B test results |
| `GET` | `/health` | Health check |

## Integration with Other Services

### Consumed By
- **Frontend Service**: Displays assets, manages QC queue
- **Execution Service**: Creates assets, checks QC status

### Dependencies
- **Database**: Shared PostgreSQL (read/write Asset tables)
- **Storage**: File system or S3-compatible storage

## Key Features

### 1. Asset Management
- Store asset metadata (URL, prompt, provider, quality metrics)
- Track asset lineage (workflow, execution, module that created it)
- Soft delete with `archived` flag
- Multi-tenant support

### 2. Quality Control
- Create QC tasks for human review
- Submit batch pass/fail decisions
- Track QC task status (pending, completed)
- Associate QC decisions with assets

### 3. File Storage
- Upload files with automatic path generation
- Download files with proper content types
- Storage abstraction (filesystem or cloud)
- Deduplication based on content hash

### 4. A/B Testing
- Store comparison results between providers
- Track winner selection and metrics
- User feedback collection

## Configuration

### Environment Variables

```bash
# Database
DATABASE_URL=postgresql+asyncpg://user:pass@host/db

# Storage
STORAGE_TYPE=local  # or 's3'
STORAGE_PATH=/var/ai-workflow/assets
S3_BUCKET=ai-workflow-assets  # if STORAGE_TYPE=s3
S3_REGION=us-east-1
S3_ACCESS_KEY=xxx
S3_SECRET_KEY=xxx

# Service
PORT=8001
LOG_LEVEL=INFO
```

## Development

### Running Locally

```bash
# Install dev dependencies
pip install -r requirements-dev.txt

# Run tests
pytest

# Run with auto-reload
uvicorn src.main:app --reload --port 8001
```

### Adding New Endpoints

1. Create route in `src/api/`
2. Update OpenAPI docs
3. Add tests in `tests/`
4. Update this README

## Deployment

See [DEPLOYMENT.md](_project_docs/DEPLOYMENT.md) for Fly.io deployment instructions.

## For Onsite Implementations

### Common Customizations

1. **Custom Asset Types**: Add new asset types beyond images/videos
2. **Advanced QC**: Add automated QC checks, custom approval workflows
3. **Storage Integration**: Connect to client's existing S3/Azure/GCS
4. **Asset Transformations**: Add image resizing, video transcoding
5. **Metadata Enrichment**: Add custom metadata fields for client needs

### Customization Guide

See [CUSTOMIZATION.md](_project_docs/CUSTOMIZATION.md) for detailed examples.

## Support

For issues or questions:
- Check [TROUBLESHOOTING.md](_project_docs/TROUBLESHOOTING.md)
- Review API docs at `/docs` (Swagger UI)
- Contact your implementation team

## License

Proprietary - For client implementations only
