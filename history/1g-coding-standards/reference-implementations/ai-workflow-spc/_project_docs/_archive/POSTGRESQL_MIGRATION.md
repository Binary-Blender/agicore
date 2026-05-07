# PostgreSQL Migration Guide

## Overview

The AI Workflow Platform has been migrated from in-memory storage to PostgreSQL for persistent data storage. This ensures that workflows, executions, assets, and QC tasks persist across deployments and restarts.

## Architecture Changes

### Database Schema

The following tables have been created:
- `workflows` - Stores workflow definitions
- `workflow_modules` - Stores module configurations within workflows
- `workflow_connections` - Stores connections between modules
- `workflow_executions` - Stores workflow execution instances
- `assets` - Stores generated images and metadata
- `qc_tasks` - Stores QC review tasks
- `qc_decisions` - Stores QC approval/rejection decisions

### Key Components

1. **Database Models** (`src/database/models.py`)
   - SQLAlchemy models defining the database schema
   - Relationships between entities

2. **Database Connection** (`src/database/connection.py`)
   - Async SQLAlchemy engine configuration
   - Connection pooling for serverless environments
   - Database session management

3. **Repository Layer** (`src/database/repositories.py`)
   - Data access layer with async operations
   - CRUD operations for all entities
   - Complex queries and data relationships

4. **Updated Main Application** (`src/main_workflow_db.py`)
   - FastAPI app with database integration
   - Dependency injection for database sessions
   - Updated endpoints using repository pattern

5. **Enhanced Workflow Engine** (`src/engine/workflow_engine_db.py`)
   - Database-aware workflow execution
   - Persistent execution state
   - Proper pause/resume functionality

## Setup Instructions

### Local Development

1. **Install Dependencies**
   ```bash
   pip install -r requirements.txt
   ```

2. **Set Database URL**
   ```bash
   export DATABASE_URL="postgresql://user:password@localhost/workflow_db"
   ```

3. **Run Migrations**
   ```bash
   alembic upgrade head
   ```

4. **Start Application**
   ```bash
   uvicorn src.main_workflow_db:app --reload
   ```

### Fly.io Deployment

1. **Create PostgreSQL Database**
   ```bash
   ./setup_postgres.sh
   ```
   This script will:
   - Create a PostgreSQL cluster
   - Attach it to your app
   - Set the DATABASE_URL automatically

2. **Deploy Application**
   ```bash
   flyctl deploy -a ai-workflow-spc
   ```
   The deployment will automatically:
   - Install dependencies including asyncpg
   - Run database migrations
   - Start the application

## Migration Features

### Automatic Migrations
- Alembic migrations run automatically on deployment
- Database schema is created if it doesn't exist
- Safe to run multiple times (idempotent)

### Connection Handling
- Automatic conversion of Fly.io's `postgres://` URLs to `postgresql+asyncpg://`
- Connection pooling optimized for serverless
- Graceful shutdown of database connections

### Data Persistence
- All workflows persist across deployments
- Execution history is maintained
- Assets and QC decisions are permanently stored
- No more data loss on redeploy!

## API Changes

The API remains mostly the same, but with these improvements:
- Workflow IDs are now persistent
- Execution history is available via `/executions`
- Assets can be filtered by state: `/assets?state=approved`
- Health check includes database status: `/health`

## Benefits

1. **Data Persistence**: No more losing workflows on redeploy
2. **Scalability**: PostgreSQL can handle much larger datasets
3. **Reliability**: ACID compliance for data consistency
4. **Query Performance**: Indexed queries for fast lookups
5. **Concurrent Access**: Multiple instances can share data

## Troubleshooting

### Database Connection Issues
```bash
# Check database status
flyctl postgres list -a ai-workflow-spc

# View connection details
flyctl secrets list -a ai-workflow-spc | grep DATABASE_URL

# Connect to database console
flyctl postgres connect -a ai-workflow-spc-db
```

### Migration Issues
```bash
# View migration history
alembic history

# Downgrade if needed
alembic downgrade -1

# Create new migration
alembic revision --autogenerate -m "description"
```

### Application Logs
```bash
# View application logs
flyctl logs -a ai-workflow-spc

# SSH into container
flyctl ssh console -a ai-workflow-spc
```

## Future Enhancements

1. **Indexes**: Add performance indexes as usage patterns emerge
2. **Backups**: Configure automated PostgreSQL backups
3. **Read Replicas**: Add read replicas for scaling
4. **Connection Pool Tuning**: Optimize based on load patterns