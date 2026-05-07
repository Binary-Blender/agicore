# Customization Guide - Assets Service

## Common Customizations for Client Implementations

### 1. Add Custom Asset Type

**Use Case**: Client needs to store "3d_model" assets

**Steps**:
1. Add to Asset model enum (no code change needed, uses string)
2. Update validation in API

```python
# src/api/assets.py
ALLOWED_ASSET_TYPES = ["image", "video", "audio", "text", "3d_model"]
```

3. Update storage handling if needed

---

### 2. Add Custom Metadata Fields

**Use Case**: Client needs to track additional asset properties

```python
# When creating asset
{
  "type": "image",
  "url": "...",
  "asset_metadata": {
    "client_project_id": "PROJ-123",
    "department": "Marketing",
    "campaign": "Summer 2024"
  }
}
```

No code changes needed - `asset_metadata` is a JSON field!

---

### 3. Integrate with Client's Existing S3

**Steps**:
1. Get client's S3 credentials
2. Update environment variables
3. Test upload/download

```bash
S3_BUCKET=client-existing-bucket
S3_REGION=eu-west-1
S3_ACCESS_KEY=client-key
S3_SECRET_KEY=client-secret
```

---

### 4. Add Multi-Stage QC Workflow

**Use Case**: Client needs 3 approval stages (initial, manager, final)

Create new endpoint:

```python
# src/api/qc.py

@router.post("/qc/{task_id}/review-stage")
async def review_stage(
    task_id: str,
    stage: str,  # "initial", "manager", "final"
    decision: str
):
    # Custom logic here
    pass
```

---

### 5. Asset Transformations

**Use Case**: Auto-resize images on upload

```python
# src/api/assets.py
from PIL import Image

@router.post("/assets/upload")
async def upload_asset(file: UploadFile):
    # Resize image
    img = Image.open(file.file)
    img.thumbnail((1024, 1024))

    # Save resized version
    # ... storage logic
```

---

## Training New AI Dev Team

### Day 1: Architecture Overview
- Review ARCHITECTURE.md
- Understand service boundaries
- Explore database schema

### Day 2: Hands-on Development
- Set up local environment
- Run existing tests
- Make small change (add endpoint)

### Day 3: Customization Practice
- Implement client-specific feature
- Write tests
- Deploy to staging

---

## Tips for Rapid Customization

1. **Use JSON fields**: `asset_metadata`, `provider_metadata` allow flexibility
2. **Extend, don't modify**: Add new endpoints rather than changing existing ones
3. **Keep migrations**: Track all schema changes with Alembic
4. **Document everything**: Update API.md for client team
