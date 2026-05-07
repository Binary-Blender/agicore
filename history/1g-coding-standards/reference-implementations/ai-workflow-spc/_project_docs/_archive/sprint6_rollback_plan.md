# Sprint 6.0 Rollback Plan

## When to Use This

Use this rollback plan if after fixing deployment:
- The new features break existing workflows
- Performance degrades significantly  
- Critical bugs are discovered
- Database corruption occurs

## Pre-Rollback Checklist

Before rolling back, capture diagnostics:

```bash
# Save current state
flyctl logs -a ai-workflow-spc > sprint6_logs.txt
flyctl status -a ai-workflow-spc > sprint6_status.txt

# Backup database with Sprint 6 schema
flyctl postgres backup create -a ai-workflow-spc-db

# Export any Sprint 6 specific data
flyctl ssh console -a ai-workflow-spc
cd /app
python -c "
from src.database.connection import get_session
import asyncio
import json

async def export_tps_data():
    async with get_session() as session:
        result = await session.execute('''
            SELECT id, work_element_type, manual_time, auto_time,
                   quality_points, key_points, tools_required, sequence_number
            FROM workflow_modules
            WHERE work_element_type IS NOT NULL
        ''')
        data = [dict(row) for row in result]
        with open('/tmp/sprint6_tps_data.json', 'w') as f:
            json.dump(data, f)
        print(f'Exported {len(data)} rows')

asyncio.run(export_tps_data())
"
# Copy export locally
flyctl ssh console -a ai-workflow-spc -C "cat /tmp/sprint6_tps_data.json" > sprint6_data_backup.json
```

## Rollback Methods

### Method 1: Code Rollback (Recommended)

Revert to pre-Sprint 6.0 code while keeping database:

```bash
# 1. Find the last stable commit before Sprint 6
git log --oneline | head -20
# Look for commit before Sprint 6.0 changes

# 2. Create rollback branch
git checkout -b rollback-sprint6
git reset --hard <last-stable-commit-hash>

# 3. Preserve database compatibility
# Add this migration to handle the new columns gracefully
cat > alembic/versions/009_sprint6_rollback_compat.py << 'EOF'
"""Make Sprint 6 columns nullable for rollback compatibility

Revision ID: 009
Revises: 008
"""
from alembic import op
import sqlalchemy as sa

revision = '009'
down_revision = '008'

def upgrade():
    # Make all Sprint 6 columns nullable so old code doesn't break
    with op.batch_alter_table('workflow_modules') as batch_op:
        batch_op.alter_column('work_element_type', nullable=True)
        batch_op.alter_column('manual_time', nullable=True)
        batch_op.alter_column('auto_time', nullable=True)
        batch_op.alter_column('sequence_number', nullable=True)

def downgrade():
    pass  # No downgrade needed
EOF

# 4. Deploy rollback
git add -A
git commit -m "Rollback to pre-Sprint 6.0 with database compatibility"
git push origin rollback-sprint6
flyctl deploy
```

### Method 2: Feature Flag Disable

Keep code but disable Sprint 6 features:

```python
# Add to src/main_workflow_db.py
import os

# Feature flags
FEATURES = {
    'STUDIO_ENABLED': os.getenv('FEATURE_STUDIO', 'false').lower() == 'true',
    'TPS_METRICS_ENABLED': os.getenv('FEATURE_TPS', 'false').lower() == 'true',
    'STANDARD_WORK_ENABLED': os.getenv('FEATURE_STANDARD_WORK', 'false').lower() == 'true'
}

# Conditionally register endpoints
if FEATURES['STANDARD_WORK_ENABLED']:
    @app.get("/api/workflows/{workflow_id}/standard-work")
    async def get_standard_work(workflow_id: str):
        # ... existing code ...

if FEATURES['TPS_METRICS_ENABLED']:
    @app.get("/api/workflows/{workflow_id}/tps-metrics")
    async def get_tps_metrics(workflow_id: str):
        # ... existing code ...

# In frontend, hide Studio button
@app.get("/api/features")
async def get_features():
    return FEATURES
```

Then disable features:
```bash
flyctl secrets set FEATURE_STUDIO=false FEATURE_TPS=false FEATURE_STANDARD_WORK=false
```

### Method 3: Database Schema Rollback

If you need to fully remove Sprint 6 changes:

```bash
# 1. Connect to database
flyctl postgres connect -a ai-workflow-spc-db

# 2. Backup current data (just in case)
\copy workflow_modules TO '/tmp/workflow_modules_backup.csv' CSV HEADER;

# 3. Remove Sprint 6 columns
ALTER TABLE workflow_modules 
DROP COLUMN IF EXISTS work_element_type,
DROP COLUMN IF EXISTS manual_time,
DROP COLUMN IF EXISTS auto_time,
DROP COLUMN IF EXISTS quality_points,
DROP COLUMN IF EXISTS key_points,
DROP COLUMN IF EXISTS tools_required,
DROP COLUMN IF EXISTS sequence_number;

# 4. Rollback alembic version
DELETE FROM alembic_version WHERE version_num = '008';
INSERT INTO alembic_version (version_num) VALUES ('007');

# 5. Deploy previous code version
git checkout <pre-sprint6-commit>
flyctl deploy
```

## Quick Restore Process

If rollback fails and you need to restore Sprint 6:

```bash
# 1. List available backups
flyctl postgres backup list -a ai-workflow-spc-db

# 2. Restore from backup
flyctl postgres backup restore <backup-id> -a ai-workflow-spc-db

# 3. Checkout Sprint 6 code
git checkout main

# 4. Redeploy
flyctl deploy
```

## Post-Rollback Verification

After rollback, verify:

```bash
# Check app is running
curl https://ai-workflow-spc.fly.dev/health

# Verify workflows work
curl https://ai-workflow-spc.fly.dev/api/workflows

# Test workflow execution
# Create and execute a simple workflow

# Check database state
flyctl postgres connect -a ai-workflow-spc-db
\d workflow_modules  # Check column structure
SELECT COUNT(*) FROM workflows;
SELECT COUNT(*) FROM workflow_executions;
```

## Communication Plan

If rollback is needed:

1. **Notify Team:**
   - "Sprint 6.0 features temporarily disabled due to [issue]"
   - "Rollback in progress, ETA: 15 minutes"
   - "Previous functionality remains available"

2. **Document Issues:**
   - What specific feature caused problems?
   - What error messages appeared?
   - Which workflows were affected?

3. **Fix Forward Plan:**
   - Identify root cause
   - Create hotfix branch
   - Test thoroughly before re-deployment

## Recovery Timeline

- **0-5 min:** Identify critical issue, make rollback decision
- **5-10 min:** Execute rollback (Method 1 or 2)
- **10-15 min:** Verify system stability
- **15-20 min:** Communicate status to team
- **20+ min:** Root cause analysis and fix planning

## Lessons Learned Template

After any rollback, document:

```markdown
## Sprint 6.0 Rollback Post-Mortem

**Date:** [Date]
**Duration:** [How long was system affected?]
**Impact:** [What features were affected?]

### What Happened
[Description of the issue]

### Root Cause
[Why did it happen?]

### Resolution
[How was it fixed?]

### Prevention
[How to prevent similar issues]

### Action Items
- [ ] Add test for [specific scenario]
- [ ] Update deployment checklist
- [ ] Add monitoring for [metric]
```

Remember: Rollback is a safety net, not a failure. It's better to rollback quickly and fix properly than to leave users with a broken system.
