# Asset-Centric Architecture Refactoring Plan

## Vision Statement

Transform the workflow engine from implicit data flow to an **asset-centric architecture** where:
1. All data flows through a centralized Asset Repository
2. Modules exchange asset pointers (IDs) instead of full data
3. Each module input can explicitly select from any compatible previous output OR existing repo assets
4. Everything is stored in the asset repo with full lineage tracking

## Current State Problems

### 1. **Implicit Data Flow**
- Modules pass data directly through `module_outputs` dictionary
- No visibility into what data is where
- Can't reuse assets from previous runs
- Debugging is difficult

### 2. **Resume Issues**
- Module outputs must be restored from paused_data
- Complex logic to skip already-executed modules
- Data can get lost between pause/resume cycles

### 3. **Limited Flexibility**
- Can't select specific outputs from multiple previous steps
- Can't mix current run outputs with historical assets
- A/B testing can't easily compare old vs new generations

## New Architecture

### Core Principles

1. **Asset Repository is Source of Truth**
   - All generated content → Asset Repo
   - All consumed content ← Asset Repo
   - Modules never pass raw data

2. **Explicit Input Selection**
   - Each module input configured to pull from specific source
   - Source can be: module output OR asset repo asset

3. **Pointer-Based Flow**
   - Modules output asset IDs, not data
   - Workflow engine just tracks ID references
   - Actual data fetched on-demand

### Data Model

#### Asset (Enhanced)
```python
class Asset:
    id: str
    type: str  # "image", "video", "text", "audio"
    url: str
    state: str  # "unchecked", "approved", "rejected", "archived"

    # Lineage tracking
    workflow_id: str
    execution_id: str
    module_id: str
    source_asset_ids: List[str]  # Assets that were inputs to create this

    # Metadata
    provider: str
    provider_metadata: Dict
    quality_metrics: Dict
    created_at: datetime

    # Tags for organization
    tags: List[str]
    collection_id: Optional[str]  # For grouping related assets
```

#### Module Input Configuration
```python
class ModuleInputConfig:
    name: str  # e.g., "source_image"
    type: str  # e.g., "image"
    source: Union[ModuleOutputSource, AssetRepoSource]
    required: bool = True
    multiple: bool = False  # Can accept list of assets

class ModuleOutputSource:
    type: str = "module_output"
    module_id: str
    output_key: str  # e.g., "images", "default", "videos"

class AssetRepoSource:
    type: str = "asset_repo"
    asset_ids: List[str]  # Specific assets from repo
    # OR
    query: AssetQuery  # Dynamic query (e.g., "latest approved images")
```

#### Module Output Format
```python
# OLD: Full data
{
    "images": [
        {
            "id": "asset_123",
            "url": "https://...",
            "provider": "mcp_dalle",
            # ... full asset data
        }
    ],
    "default": [...]
}

# NEW: Asset pointers
{
    "images": ["asset_123", "asset_456"],
    "default": ["asset_123", "asset_456"]
}
```

### Workflow Execution Flow

```
1. User triggers workflow execution
   ↓
2. Workflow engine builds execution plan
   ↓
3. For each module:
   a. Resolve input sources → Get asset IDs
   b. Fetch assets from repo (if needed by module)
   c. Execute module with asset data
   d. Module creates new assets → Save to repo
   e. Module returns NEW asset IDs
   f. Store asset IDs in module_outputs[module_id]
   ↓
4. Next module uses previous module's asset IDs as inputs
   ↓
5. Continue until workflow complete or paused
```

### Database Schema Changes

#### New Table: asset_collections
```sql
CREATE TABLE asset_collections (
    id VARCHAR PRIMARY KEY,
    name VARCHAR NOT NULL,
    description TEXT,
    workflow_id VARCHAR REFERENCES workflows(id),
    created_at TIMESTAMP DEFAULT NOW()
);
```

#### Enhanced: assets table
```sql
ALTER TABLE assets ADD COLUMN collection_id VARCHAR REFERENCES asset_collections(id);
ALTER TABLE assets ADD COLUMN source_asset_ids JSONB;  -- Array of asset IDs
ALTER TABLE assets ADD COLUMN tags JSONB;  -- Array of tags
```

#### Enhanced: workflow_modules table
```sql
ALTER TABLE workflow_modules ADD COLUMN input_config JSONB;
-- Stores ModuleInputConfig for each input
-- Example:
-- {
--   "source_image": {
--     "type": "image",
--     "source": {
--       "type": "module_output",
--       "module_id": "module_123",
--       "output_key": "images"
--     }
--   }
-- }
```

## Implementation Plan

### Phase 1: Asset Pointer Foundation (Week 1)
**Goal:** Modules exchange asset IDs instead of full data

#### Step 1.1: Enhance Asset Repository
- [ ] Add methods to AssetRepository:
  - `async def get_by_ids(ids: List[str]) -> List[Asset]`
  - `async def get_by_execution(execution_id: str) -> List[Asset]`
  - `async def get_by_module(module_id: str) -> List[Asset]`
  - `async def create_from_url(url: str, metadata: Dict) -> Asset`

#### Step 1.2: Update Module Base Class
- [ ] Change `execute()` signature:
  ```python
  async def execute(
      self,
      input_asset_ids: Dict[str, List[str]],  # Changed!
      execution_context: Dict[str, Any]
  ) -> Dict[str, List[str]]:  # Return asset IDs!
      # Module implementation:
      # 1. Fetch assets from repo if needed
      # 2. Process them
      # 3. Create new assets → save to repo
      # 4. Return new asset IDs
  ```

#### Step 1.3: Update Workflow Engine
- [ ] Modify `_get_module_inputs()`:
  - Input is now `module_outputs` containing asset IDs
  - Return `Dict[str, List[str]]` (asset ID lists)
- [ ] Modify execution loop:
  - Collect asset IDs from module returns
  - Store in `module_outputs[module_id]`
- [ ] Update pause/resume:
  - `module_outputs` now just contains IDs (tiny!)
  - No need to serialize large data structures

#### Step 1.4: Update Existing Modules (One by One)
Priority order:
1. [ ] Start Module - Simple, returns empty
2. [ ] Image Gen Modules (DALL-E, AKOOL) - Create assets, return IDs
3. [ ] A/B Testing Module - Accept asset IDs, return winner IDs
4. [ ] Video Module - Accept image IDs, create videos, return video IDs
5. [ ] QC Module - Already works with assets!
6. [ ] End Module - Just logs completion

#### Step 1.5: Testing
- [ ] Test each module individually
- [ ] Test simple workflow: Start → Image Gen → End
- [ ] Test complex workflow: Start → 2x Image Gen → A/B Test → Video → End
- [ ] Test pause/resume with new architecture

### Phase 2: Explicit Input Configuration (Week 2)
**Goal:** UI for selecting input sources

#### Step 2.1: Backend - Input Configuration
- [ ] Add `input_config` field to WorkflowModule model
- [ ] Create InputResolver class:
  ```python
  class InputResolver:
      async def resolve_inputs(
          self,
          module_id: str,
          input_config: Dict,
          module_outputs: Dict,
          asset_repo: AssetRepository
      ) -> Dict[str, List[str]]:
          # Resolve each input based on its source config
          # Return asset IDs for each input
  ```
- [ ] Update workflow engine to use InputResolver

#### Step 2.2: Frontend - Input Selection UI
- [ ] Add input configuration panel to module settings
- [ ] For each module input, show dropdown:
  - "Previous Step Output" (default)
  - "Specific Module Output" → Show list of compatible previous modules
  - "Asset Repository" → Opens asset browser
- [ ] Visual indicators on workflow canvas showing data flow

#### Step 2.3: Default Behavior
- [ ] If no input config specified → Auto-connect to previous step's default output
- [ ] Maintains current simple use case while enabling advanced scenarios

### Phase 3: Asset Repo as Input Source (Week 3)
**Goal:** Use existing assets as workflow inputs

#### Step 3.1: Asset Browser UI
- [ ] Create asset browser modal:
  - Filter by type (image, video, etc.)
  - Filter by state (approved, etc.)
  - Filter by tags
  - Search by ID or metadata
  - Preview assets
  - Multi-select for batch operations

#### Step 3.2: Asset Collections
- [ ] UI to create collections
- [ ] Drag-and-drop assets into collections
- [ ] Use collection as input source:
  ```python
  {
      "type": "asset_repo",
      "collection_id": "collection_abc"
  }
  ```

#### Step 3.3: Dynamic Queries
- [ ] Support query-based inputs:
  ```python
  {
      "type": "asset_repo",
      "query": {
          "type": "image",
          "state": "approved",
          "tags": ["portrait"],
          "limit": 5,
          "sort": "created_at DESC"
      }
  }
  ```

### Phase 4: Advanced Features (Week 4+)

#### Lineage Tracking
- [ ] Visualize asset lineage graph
- [ ] "Show workflow that created this asset"
- [ ] "Show all assets derived from this one"

#### Asset Comparison
- [ ] Side-by-side comparison of multiple assets
- [ ] Compare metadata/quality metrics
- [ ] A/B testing history

#### Workflow Templates
- [ ] Save workflows with input placeholders
- [ ] "Generate video from repo image" template
- [ ] Share templates with team

#### Performance Optimization
- [ ] Asset caching layer (Redis)
- [ ] Lazy loading for large asset lists
- [ ] CDN integration for asset URLs

## Migration Strategy

### Clean Slate Approach ✅
Since we're in development with no production data:

1. **Drop Everything**
   ```bash
   # On fly.io
   fly postgres connect -a ai-workflow-spc-db
   DROP DATABASE workflow_db;
   CREATE DATABASE workflow_db;
   ```

2. **Run New Migrations**
   ```bash
   alembic revision --autogenerate -m "Asset-centric architecture"
   alembic upgrade head
   ```

3. **Update All Modules**
   - Rewrite each module to use new signature
   - No backward compatibility needed

4. **Test Everything Fresh**
   - Build workflows from scratch
   - Ensure all features work with new architecture

## Success Metrics

### Performance
- [ ] Module execution time < 100ms overhead
- [ ] Asset fetch time < 50ms
- [ ] Workflow with 10 modules completes in reasonable time

### User Experience
- [ ] Can create workflow in < 2 minutes
- [ ] Can configure custom inputs in < 30 seconds
- [ ] Can find and reuse asset in < 1 minute

### Reliability
- [ ] 100% pause/resume success rate
- [ ] Zero data loss on workflow failures
- [ ] Full asset lineage tracking

## Benefits Summary

| Feature | Before | After |
|---------|--------|-------|
| Data Passing | Full objects in memory | Asset ID pointers |
| Input Flexibility | Auto-connect only | Select any source |
| Asset Reuse | None | Full repo access |
| Debugging | Opaque data flow | Clear lineage |
| Resume Reliability | Complex state restoration | Simple ID references |
| Performance | Heavy memory usage | Lightweight |
| Lineage Tracking | None | Complete history |

## Risk Mitigation

### Risk 1: Performance Degradation
- **Mitigation**: Implement caching layer, batch asset fetches
- **Fallback**: Module can receive full asset data if needed for performance

### Risk 2: Complexity for Simple Use Cases
- **Mitigation**: Smart defaults (auto-connect), hide advanced options
- **Fallback**: Keep simple mode as default

### Risk 3: Migration Effort
- **Mitigation**: Clean slate approach (no migration needed)
- **Fallback**: N/A - we're starting fresh

## Next Steps

1. ✅ Document architecture (this file)
2. Review and approve plan
3. Start Phase 1, Step 1.1: Enhance Asset Repository
4. Work through phases sequentially
5. Test thoroughly at each step

## Questions to Resolve

1. Should assets be immutable? (I recommend yes)
2. How long to keep "rejected" assets? (30 days?)
3. Asset storage: Database or S3? (Both - URLs in DB, files in S3)
4. Rate limiting for asset creation? (Prevent abuse)
5. Asset versioning? (For iterative refinement)

---

**Created:** 2025-11-03
**Status:** Approved for Implementation
**Target Completion:** 4 weeks
**Priority:** High - Foundation for all future features
