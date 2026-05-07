# AI Workflow SPC - Deployment Guide

## Overview

This guide covers deployment procedures for the AI Workflow SPC platform, including local development, database migrations, and production deployment to Fly.io.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Local Development Setup](#local-development-setup)
3. [Database Migrations](#database-migrations)
4. [Environment Variables](#environment-variables)
5. [Production Deployment](#production-deployment)
6. [Monitoring & Health Checks](#monitoring--health-checks)
7. [Rollback Procedures](#rollback-procedures)
8. [Troubleshooting](#troubleshooting)

## Prerequisites

### Required Software

- **Python 3.11+**: Application runtime
- **PostgreSQL 14+**: Database server
- **Node.js 18+**: For frontend tooling (if needed)
- **Fly.io CLI**: For production deployments
- **Git**: Version control

### Required Accounts

- **Fly.io Account**: For hosting ([fly.io](https://fly.io))
- **GitHub Account**: For CI/CD (optional)

### API Keys (for production)

The platform integrates with multiple AI providers. Set up accounts and obtain API keys for:

- OpenAI (GPT-4, DALL-E)
- Anthropic (Claude)
- Replicate
- ElevenLabs
- Stability AI
- Akool

## Local Development Setup

### 1. Clone Repository

```bash
git clone <repository-url>
cd ai-workflow-spc
```

### 2. Set Up Python Environment

```bash
# Create virtual environment
python3 -m venv venv

# Activate virtual environment
# On Linux/Mac:
source venv/bin/activate
# On Windows:
venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

### 3. Configure Database

#### Option A: Local PostgreSQL

```bash
# Create database
createdb ai_workflow_spc

# Set DATABASE_URL environment variable
export DATABASE_URL="postgresql://localhost/ai_workflow_spc"
```

#### Option B: Use Fly.io Postgres (Recommended)

```bash
# Create Postgres cluster on Fly.io
flyctl postgres create

# Attach to your app
flyctl postgres attach <postgres-app-name>

# Get connection string
flyctl postgres db-uri <postgres-app-name>
```

### 4. Run Database Migrations

```bash
# Run all migrations to latest
alembic upgrade head

# Verify migration status
alembic current
```

### 5. Set Environment Variables

Create a `.env` file in the project root:

```env
# Database
DATABASE_URL=postgresql://user:password@localhost/ai_workflow_spc

# AI Provider API Keys
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
REPLICATE_API_TOKEN=r8_...
ELEVENLABS_API_KEY=...
STABILITY_API_KEY=sk-...
AKOOL_API_KEY=...

# Application Settings
LOG_LEVEL=INFO
SECRET_KEY=<generate-a-secure-random-key>
```

### 6. Start Development Server

```bash
# Run with uvicorn
uvicorn src.main_workflow_db:app --reload --port 8000

# Application will be available at:
# http://localhost:8000
```

## Database Migrations

### Migration Files Location

Alembic migration files are stored in `/alembic/versions/`:

- `001_initial_schema.py` - Initial database schema
- `002_add_qc_support.py` - QC workflow support
- `003_add_mcp_support.py` - MCP server integration
- `004_add_ab_testing.py` - A/B testing support
- `005_update_ab_testing_schema.py` - A/B testing enhancements
- `006_add_enterprise_features.py` - Sprint 6.0 enterprise features

### Creating New Migrations

```bash
# Auto-generate migration from model changes
alembic revision --autogenerate -m "Description of changes"

# Create empty migration
alembic revision -m "Description of changes"

# Edit the generated file in alembic/versions/
```

### Applying Migrations

```bash
# Upgrade to latest
alembic upgrade head

# Upgrade to specific revision
alembic upgrade <revision_id>

# Upgrade one step at a time
alembic upgrade +1
```

### Rolling Back Migrations

```bash
# Downgrade one step
alembic downgrade -1

# Downgrade to specific revision
alembic downgrade <revision_id>

# Downgrade all
alembic downgrade base
```

### Migration Best Practices

1. **Always Test Locally First**: Run migrations on local database before production
2. **Backup Before Migrating**: Take database snapshot before running migrations
3. **Use Transactions**: All migrations run in transactions for safety
4. **Make Reversible Changes**: Always implement `downgrade()` function
5. **Use `IF EXISTS`**: For DROP operations, use `DROP ... IF EXISTS` to avoid errors

### Checking Migration Status

```bash
# Show current revision
alembic current

# Show all revisions
alembic history

# Show pending migrations
alembic heads
```

## Environment Variables

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@host/db` |
| `SECRET_KEY` | JWT signing key | Random 32+ character string |

### Optional Provider API Keys

| Variable | Description | Required For |
|----------|-------------|--------------|
| `OPENAI_API_KEY` | OpenAI API key | GPT-4, DALL-E modules |
| `ANTHROPIC_API_KEY` | Anthropic API key | Claude modules |
| `REPLICATE_API_TOKEN` | Replicate API token | Replicate models |
| `ELEVENLABS_API_KEY` | ElevenLabs API key | Text-to-speech |
| `STABILITY_API_KEY` | Stability AI API key | Image generation |
| `AKOOL_API_KEY` | Akool API key | Video generation |

### Setting Variables in Fly.io

```bash
# Set individual secrets
flyctl secrets set SECRET_KEY=<your-secret-key>
flyctl secrets set OPENAI_API_KEY=<your-openai-key>

# Set multiple secrets from file
flyctl secrets import < secrets.txt

# List all secrets (values hidden)
flyctl secrets list

# Unset a secret
flyctl secrets unset SECRET_NAME
```

## Production Deployment

### Initial Setup

#### 1. Install Fly.io CLI

```bash
# Mac/Linux
curl -L https://fly.io/install.sh | sh

# Windows (PowerShell)
iwr https://fly.io/install.ps1 -useb | iex
```

#### 2. Authenticate with Fly.io

```bash
flyctl auth login
```

#### 3. Create Fly.io App (First Time Only)

```bash
# Initialize app configuration
flyctl launch

# Follow prompts to:
# - Choose app name
# - Select region
# - Configure resources
```

#### 4. Create PostgreSQL Database (First Time Only)

```bash
# Create Postgres cluster
flyctl postgres create --name ai-workflow-spc-db

# Attach to app
flyctl postgres attach ai-workflow-spc-db

# This automatically sets DATABASE_URL secret
```

#### 5. Set Secrets

```bash
# Generate secure secret key
python3 -c "import secrets; print(secrets.token_urlsafe(32))"

# Set secrets
flyctl secrets set SECRET_KEY=<generated-key>
flyctl secrets set OPENAI_API_KEY=<your-key>
flyctl secrets set ANTHROPIC_API_KEY=<your-key>
# ... set other API keys as needed
```

### Deploying Updates

#### Standard Deployment

```bash
# Deploy current code
flyctl deploy

# Deploy with custom dockerfile
flyctl deploy --dockerfile Dockerfile

# Deploy and watch logs
flyctl deploy && flyctl logs
```

#### Deployment Process

1. **Build**: Fly.io builds Docker image from your code
2. **Push**: Image pushed to Fly.io registry
3. **Deploy**: Rolling deployment to machines
4. **Migrate**: Database migrations run automatically (via `start.sh`)
5. **Health Check**: Smoke tests verify deployment

### Scaling

```bash
# Check current scale
flyctl scale show

# Scale horizontally (more machines)
flyctl scale count 3

# Scale vertically (more resources per machine)
flyctl scale vm shared-cpu-2x --memory 1024

# Set autoscaling
flyctl autoscale set min=1 max=3
```

### Deployment Configuration

The `fly.toml` file configures your deployment:

```toml
app = "ai-workflow-spc"

[build]
  dockerfile = "Dockerfile"

[env]
  PORT = "8080"

[[services]]
  http_checks = []
  internal_port = 8080
  processes = ["app"]
  protocol = "tcp"
  script_checks = []

  [services.concurrency]
    hard_limit = 25
    soft_limit = 20
    type = "connections"

  [[services.ports]]
    force_https = true
    handlers = ["http"]
    port = 80

  [[services.ports]]
    handlers = ["tls", "http"]
    port = 443

  [[services.tcp_checks]]
    grace_period = "30s"
    interval = "15s"
    restart_limit = 0
    timeout = "2s"
```

## Monitoring & Health Checks

### Application Health Endpoint

```bash
# Check application health
curl https://ai-workflow-spc.fly.dev/health

# Expected response:
{
  "status": "healthy",
  "database": "healthy",
  "version": "2.0.0"
}
```

### Viewing Logs

```bash
# Stream live logs
flyctl logs

# View recent logs
flyctl logs -n 100

# Filter by machine
flyctl logs --machine <machine-id>

# Follow logs from specific app
flyctl logs -a ai-workflow-spc
```

### Monitoring Dashboard

Access Fly.io monitoring dashboard:

```bash
flyctl dashboard
```

Or visit: https://fly.io/apps/ai-workflow-spc/monitoring

### Database Monitoring

```bash
# Connect to PostgreSQL
flyctl postgres connect -a ai-workflow-spc-db

# Check database status
flyctl postgres list

# View database metrics
flyctl postgres db-uri ai-workflow-spc-db
```

### SSH Access

```bash
# SSH into running machine
flyctl ssh console

# SSH into specific machine
flyctl ssh console --machine <machine-id>

# Run command without interactive shell
flyctl ssh console -C "ls -la /app"
```

## Rollback Procedures

### Quick Rollback to Previous Release

```bash
# List recent releases
flyctl releases

# Rollback to previous release
flyctl releases rollback

# Rollback to specific version
flyctl releases rollback <version>
```

### Database Rollback

If a migration fails or causes issues:

```bash
# SSH into machine
flyctl ssh console

# Downgrade database one step
alembic downgrade -1

# Or downgrade to specific version
alembic downgrade <revision_id>

# Exit SSH
exit
```

### Emergency Procedures

#### 1. Stop All Machines

```bash
# Stop all machines
flyctl machine stop --all

# Or stop specific machine
flyctl machine stop <machine-id>
```

#### 2. Restore Database from Backup

```bash
# List available backups
flyctl postgres backup list -a ai-workflow-spc-db

# Restore from backup
flyctl postgres restore -a ai-workflow-spc-db <backup-id>
```

#### 3. Restart with Previous Image

```bash
# List available images
flyctl releases

# Deploy specific release
flyctl deploy --image <image-url>
```

## Troubleshooting

### Common Issues

#### Migration Fails on Deployment

**Symptom**: App crashes during startup with migration error

**Solution**:
```bash
# Check logs
flyctl logs

# SSH into machine
flyctl ssh console

# Run migrations manually
cd /app
alembic current  # Check current state
alembic history  # Check available migrations
alembic upgrade head  # Apply pending migrations

# If migration fails, check the error and fix migration file locally
# Then redeploy with fixed migration
```

#### Database Connection Issues

**Symptom**: "could not connect to server" errors

**Solution**:
```bash
# Verify DATABASE_URL secret is set
flyctl secrets list

# Re-attach PostgreSQL
flyctl postgres attach ai-workflow-spc-db

# Check PostgreSQL status
flyctl postgres status -a ai-workflow-spc-db
```

#### Application Not Responding

**Symptom**: 502/503 errors or timeouts

**Solution**:
```bash
# Check machine status
flyctl status

# View recent logs
flyctl logs

# Restart machines
flyctl machine restart --all

# Check health endpoint
curl https://ai-workflow-spc.fly.dev/health
```

#### Out of Memory

**Symptom**: App crashes with "killed" or OOM errors

**Solution**:
```bash
# Check current resources
flyctl scale show

# Increase memory
flyctl scale vm shared-cpu-1x --memory 512

# Or upgrade to larger VM
flyctl scale vm shared-cpu-2x --memory 1024
```

### Getting Help

1. **Check Logs First**: `flyctl logs` usually shows the issue
2. **Fly.io Community**: https://community.fly.io
3. **Fly.io Docs**: https://fly.io/docs
4. **Application Logs**: Review application-specific error messages

### Useful Commands Reference

```bash
# App Management
flyctl status                    # Show app status
flyctl info                      # Show app info
flyctl open                      # Open app in browser
flyctl dashboard                 # Open monitoring dashboard

# Machine Management
flyctl machine list              # List all machines
flyctl machine status <id>       # Check machine status
flyctl machine restart <id>      # Restart specific machine
flyctl machine destroy <id>      # Remove machine

# Database Management
flyctl postgres list             # List databases
flyctl postgres connect          # Connect to database
flyctl postgres backup list      # List backups
flyctl postgres backup create    # Create backup

# Secrets Management
flyctl secrets list              # List all secrets
flyctl secrets set KEY=value     # Set secret
flyctl secrets unset KEY         # Remove secret
flyctl secrets import < file     # Import secrets from file

# Deployment
flyctl deploy                    # Deploy current code
flyctl releases                  # Show release history
flyctl releases rollback         # Rollback last release

# Monitoring
flyctl logs                      # Stream logs
flyctl logs -n 100              # Show last 100 lines
flyctl ssh console               # SSH into machine
flyctl ssh console -C "command"  # Run command via SSH
```

## Sprint 6.0 Specific Deployment Notes

### New Enterprise Features

Sprint 6.0 adds several enterprise features that require additional setup:

1. **Multi-Tenancy**: Database migration 006 adds tenant support
2. **RBAC**: Role-based access control with JWT authentication
3. **Cost Tracking**: Monitors API usage costs across providers
4. **Auto-Failover**: Automatic failover between MCP servers
5. **Health Monitoring**: Continuous health checks for MCP servers

### Migration 006 - Enterprise Features

Before deploying Sprint 6.0, review the changes in migration 006:

```bash
# View migration file
cat alembic/versions/006_add_enterprise_features.py

# This migration adds:
# - tenants table
# - users table with authentication
# - audit_logs table for SOC2 compliance
# - cost_tracking and cost_rules tables
# - server_health table for monitoring
# - composite_servers and mcp_server_configs tables
# - tenant_id columns to existing tables
```

### Post-Deployment Setup

After deploying Sprint 6.0:

1. **Create Initial Tenant**:
```python
# SSH into machine and run Python
flyctl ssh console

python3 << EOF
from src.database.connection import get_db_sync
from src.database.models import Tenant
from sqlalchemy import create_engine
from sqlalchemy.orm import Session
import uuid

# Create default tenant
engine = create_engine("postgresql://...")
with Session(engine) as session:
    tenant = Tenant(
        id=f"tenant_{uuid.uuid4().hex[:8]}",
        name="Default Organization",
        is_active=True
    )
    session.add(tenant)
    session.commit()
    print(f"Created tenant: {tenant.id}")
EOF
```

2. **Create Admin User**:
```bash
# Use the registration endpoint
curl -X POST https://ai-workflow-spc.fly.dev/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "secure_password",
    "full_name": "Admin User",
    "role": "admin",
    "tenant_name": "Default Organization"
  }'
```

3. **Configure Cost Rules** (optional):

Set up pricing rules for each MCP provider in the database or via API.

## Security Considerations

1. **Secret Management**: Never commit secrets to Git
2. **JWT Secret**: Use a cryptographically secure random key
3. **API Keys**: Rotate API keys regularly
4. **Database Access**: Restrict database access to application only
5. **HTTPS Only**: Fly.io handles SSL certificates automatically
6. **Audit Logging**: Review audit logs regularly for compliance

## Performance Optimization

1. **Database Indexing**: All migrations include proper indexes
2. **Connection Pooling**: SQLAlchemy async pool manages connections
3. **Caching**: Consider adding Redis for session caching (future)
4. **CDN**: Serve static assets via CDN (optional)
5. **Monitoring**: Set up alerts for high latency or error rates

## Backup Strategy

1. **Automated Backups**: Fly.io PostgreSQL performs daily backups
2. **Manual Backups**: Create backups before major changes
3. **Retention Policy**: Keep backups for 30 days minimum
4. **Test Restores**: Periodically test backup restoration

```bash
# Create manual backup
flyctl postgres backup create -a ai-workflow-spc-db

# List backups
flyctl postgres backup list -a ai-workflow-spc-db

# Restore from backup
flyctl postgres restore -a ai-workflow-spc-db <backup-id>
```

## CI/CD Integration (Optional)

### GitHub Actions Example

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Fly.io

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: superfly/flyctl-actions/setup-flyctl@master
      - run: flyctl deploy --remote-only
        env:
          FLY_API_TOKEN: ${{ secrets.FLY_API_TOKEN }}
```

## Version History

- **v2.0.0** (Sprint 6.0): Enterprise features, multi-tenancy, RBAC, cost tracking
- **v1.5.0** (Sprint 5.0): Templates library, analytics dashboard
- **v1.4.0** (Sprint 4.0): MCP integration, A/B testing
- **v1.3.0** (Sprint 3.0): Mobile QC app
- **v1.2.0** (Sprint 2.0): Database persistence
- **v1.0.0**: Initial release

## Support

For issues or questions:
1. Check this deployment guide
2. Review application logs
3. Consult Fly.io documentation
4. Contact development team
