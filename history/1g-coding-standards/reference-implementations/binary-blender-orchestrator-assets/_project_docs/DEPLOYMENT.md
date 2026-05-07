# Deployment Guide - Assets Service

## Prerequisites

- Fly.io CLI installed (`flyctl`)
- PostgreSQL database (shared with Execution Service)
- S3-compatible storage (optional, for production)

## Environment Variables

```bash
# Required
DATABASE_URL=postgresql+asyncpg://user:pass@host:5432/dbname
PORT=8001

# Storage
STORAGE_TYPE=local  # or 's3'
STORAGE_PATH=/var/ai-workflow/assets
S3_BUCKET=ai-workflow-assets  # if using S3
S3_REGION=us-east-1
S3_ACCESS_KEY=xxx
S3_SECRET_KEY=xxx

# Optional
LOG_LEVEL=INFO
CORS_ORIGINS=https://ai-workflow-frontend.fly.dev
MAX_FILE_SIZE_MB=50
```

## Fly.io Deployment

### 1. Create Fly App

```bash
flyctl apps create ai-workflow-assets --org your-org
```

### 2. Set Secrets

```bash
flyctl secrets set \
  DATABASE_URL="postgresql+asyncpg://..." \
  S3_ACCESS_KEY="..." \
  S3_SECRET_KEY="..." \
  --app ai-workflow-assets
```

### 3. Deploy

```bash
flyctl deploy --app ai-workflow-assets
```

### 4. Scale

```bash
# Scale to 2 machines for high availability
flyctl scale count 2 --app ai-workflow-assets

# Increase memory if needed
flyctl scale memory 1024 --app ai-workflow-assets
```

## Database Migrations

```bash
# Run migrations on deployment
flyctl ssh console --app ai-workflow-assets
alembic upgrade head
```

## Health Check

```bash
curl https://ai-workflow-assets.fly.dev/health
```

## Monitoring

```bash
# View logs
flyctl logs --app ai-workflow-assets

# View metrics
flyctl status --app ai-workflow-assets
```
