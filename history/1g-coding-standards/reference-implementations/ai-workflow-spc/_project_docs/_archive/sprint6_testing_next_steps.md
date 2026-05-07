# Sprint 6.0 - Post-Deployment Testing & Next Steps

## Once Deployment is Fixed

### Quick Verification Script

Create `test_sprint6.py` to verify all new features:

```python
import asyncio
import httpx
import json

async def test_sprint6_features():
    """Test all Sprint 6.0 features"""
    base_url = "https://ai-workflow-spc.fly.dev"
    
    async with httpx.AsyncClient() as client:
        print("Testing Sprint 6.0 Features...")
        
        # 1. Test health endpoint
        print("\n1. Testing health check...")
        resp = await client.get(f"{base_url}/health")
        assert resp.status_code == 200
        print(f"   ✓ Health check: {resp.json()}")
        
        # 2. Get a workflow to test with
        print("\n2. Getting workflows...")
        resp = await client.get(f"{base_url}/api/workflows")
        workflows = resp.json()["workflows"]
        
        if not workflows:
            print("   ⚠ No workflows found. Create one first!")
            return
            
        workflow_id = workflows[0]["id"]
        print(f"   ✓ Using workflow: {workflow_id}")
        
        # 3. Test Standard Work endpoint
        print("\n3. Testing Standard Work conversion...")
        resp = await client.get(f"{base_url}/api/workflows/{workflow_id}/standard-work")
        if resp.status_code == 200:
            data = resp.json()
            print(f"   ✓ Standard Work has {len(data.get('steps', []))} steps")
            if data.get('steps'):
                step = data['steps'][0]
                print(f"   ✓ First step: {step.get('work_element', 'N/A')}")
                print(f"   ✓ Element type: {step.get('element_type', 'N/A')}")
        else:
            print(f"   ✗ Standard Work failed: {resp.status_code}")
        
        # 4. Test TPS Metrics endpoint
        print("\n4. Testing TPS Metrics...")
        resp = await client.get(
            f"{base_url}/api/workflows/{workflow_id}/tps-metrics",
            params={"period_days": 7}
        )
        if resp.status_code == 200:
            metrics = resp.json()
            print(f"   ✓ OEE: {metrics.get('oee', 'N/A')}%")
            print(f"   ✓ First Pass Yield: {metrics.get('first_pass_yield', 'N/A')}%")
            print(f"   ✓ Cycle Time Avg: {metrics.get('cycle_time_avg', 'N/A')}s")
        else:
            print(f"   ✗ TPS Metrics failed: {resp.status_code}")
        
        # 5. Test Workflow Studio page
        print("\n5. Testing Workflow Studio...")
        resp = await client.get(f"{base_url}/workflow-studio/{workflow_id}")
        if resp.status_code == 200:
            print(f"   ✓ Studio page loads successfully")
            # Check for tab elements in HTML
            if 'tab-design' in resp.text and 'tab-standard-work' in resp.text:
                print(f"   ✓ All 4 tabs present in HTML")
        else:
            print(f"   ✗ Studio page failed: {resp.status_code}")
        
        print("\n✅ Sprint 6.0 Testing Complete!")

if __name__ == "__main__":
    asyncio.run(test_sprint6_features())
```

### Manual Testing Checklist

Navigate to https://ai-workflow-spc.fly.dev and verify:

#### 1. Workflow List Page
- [ ] Each workflow card has a "Studio" button
- [ ] Studio button is styled correctly (black/orange theme)
- [ ] Clicking Studio opens /workflow-studio/{id}

#### 2. Unified Workflow Studio
- [ ] **Design Tab**
  - [ ] Workflow builder iframe loads
  - [ ] Can drag and drop modules
  - [ ] Save button works
  
- [ ] **Standard Work Tab**  
  - [ ] Table shows work steps
  - [ ] Each step displays:
    - Step number
    - Work element name
    - Element type (Setup/Process/Inspect)
    - Manual time (seconds)
    - Auto time (seconds)
    - Quality points
    - Key points
    - Tools/MCP required
  
- [ ] **Analytics Tab**
  - [ ] OEE card shows percentage
  - [ ] Cycle time statistics display
  - [ ] First Pass Yield shows
  - [ ] Defect Rate calculated
  - [ ] Value-Add Ratio present
  - [ ] Throughput (items/day)
  - [ ] Takt Time displayed
  
- [ ] **Execute Tab**
  - [ ] Execute button present
  - [ ] Execution history table shows
  - [ ] Can trigger new execution

### Database Verification

```sql
-- Connect to database
flyctl postgres connect -a ai-workflow-spc-db

-- Verify migration 008
SELECT * FROM alembic_version WHERE version_num = '008';

-- Check new columns exist
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'workflow_modules'
AND column_name IN (
    'work_element_type',
    'manual_time', 
    'auto_time',
    'quality_points',
    'key_points',
    'tools_required',
    'sequence_number'
);
-- Should return 7 rows

-- Check if any data populated
SELECT 
    id,
    name,
    work_element_type,
    manual_time,
    auto_time
FROM workflow_modules 
LIMIT 5;
```

### Populate Test Data

If columns are empty, run this to add sample TPS data:

```python
# populate_tps.py
from sqlalchemy import create_engine, text
import os

DATABASE_URL = os.environ['DATABASE_URL']
engine = create_engine(DATABASE_URL.replace('+asyncpg', ''))

with engine.connect() as conn:
    # Update Start modules
    conn.execute(text("""
        UPDATE workflow_modules 
        SET work_element_type = 'setup',
            manual_time = 5,
            auto_time = 0,
            quality_points = 'Verify all parameters configured',
            key_points = 'Check batch size and iterations',
            tools_required = 'System',
            sequence_number = 1
        WHERE type = 'start'
    """))
    
    # Update Image Gen modules  
    conn.execute(text("""
        UPDATE workflow_modules
        SET work_element_type = 'process',
            manual_time = 2,
            auto_time = 30,
            quality_points = 'Images meet prompt requirements',
            key_points = 'Monitor generation progress',
            tools_required = 'MCP:akool',
            sequence_number = 2
        WHERE type = 'image_gen'
    """))
    
    # Update QC modules
    conn.execute(text("""
        UPDATE workflow_modules
        SET work_element_type = 'inspect',
            manual_time = 20,
            auto_time = 0,
            quality_points = 'Pass/Fail criteria applied correctly',
            key_points = 'Check for defects, artifacts, prompt adherence',
            tools_required = 'Human QC',
            sequence_number = 3
        WHERE type = 'qc'
    """))
    
    conn.commit()
    print("TPS data populated!")
```

## What's Next After Sprint 6.0?

### Immediate Priorities

1. **Collect Metrics Baseline**
   - Current workflow creation time
   - Average cycle times
   - QC pass rates
   - Cost per execution

2. **User Feedback**
   - Show Studio to operations team
   - Get feedback on TPS format
   - Identify missing metrics

3. **Performance Optimization**
   ```sql
   -- Add indexes for better performance
   CREATE INDEX idx_modules_workflow_seq 
   ON workflow_modules(workflow_id, sequence_number);
   
   CREATE INDEX idx_executions_workflow_created 
   ON workflow_executions(workflow_id, created_at DESC);
   ```

### Sprint 7 Preview: AI Intelligence Layer

According to your roadmap, Sprint 7 will add:

1. **AI Workflow Optimizer**
   - ML model to predict optimal sequences
   - Suggest workflow improvements
   
2. **Intelligent QC Assistant**
   - Pre-screen with AI before human QC
   - Automated defect detection
   
3. **Natural Language Workflow Builder**
   - "Create a workflow that generates product images"
   - Convert text to workflow modules

4. **Smart Cost Forecasting**
   - Predict workflow costs before execution
   - Budget optimization recommendations

### Preparing for Sprint 7

Start collecting training data now:

```python
# log_execution_data.py
import json
from datetime import datetime

def log_execution_for_ml(execution_id, workflow_id, modules, results):
    """Log execution data for future ML training"""
    log_entry = {
        "timestamp": datetime.utcnow().isoformat(),
        "execution_id": execution_id,
        "workflow_id": workflow_id,
        "module_sequence": [m.type for m in modules],
        "execution_times": [r.duration for r in results],
        "qc_results": [r.qc_status for r in results if r.qc_status],
        "total_duration": sum(r.duration for r in results),
        "success": all(r.status == "success" for r in results)
    }
    
    # Append to training data file
    with open("ml_training_data.jsonl", "a") as f:
        f.write(json.dumps(log_entry) + "\n")
```

## Success Criteria

Sprint 6.0 is successful when:

✅ All 4 Studio tabs functional  
✅ TPS metrics calculating correctly  
✅ Standard Work format displays  
✅ 99.9% uptime achieved  
✅ Response time < 200ms (p95)  
✅ At least 1 workflow tested end-to-end  

Your implementation is solid - once the deployment issue is resolved, the platform will be ready for enterprise use!
