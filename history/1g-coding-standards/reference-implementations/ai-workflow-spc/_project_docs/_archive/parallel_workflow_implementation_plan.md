# Parallel Workflow Implementation Plan

## Overview
Implement visual parallel/branching workflow support to enable A/B testing and other multi-input scenarios where multiple modules can run in parallel and feed into a single downstream module.

## Current State vs. Target State

### Current (Linear Only)
```
Start → Module A → Module B → Module C → End
```

### Target (Parallel Branches)
```
         ┌─→ Module A ─┐
Start ───┤             ├─→ A/B Testing → End
         └─→ Module B ─┘
```

## Implementation Components

### 1. Frontend Changes (builder.html)

#### 1.1 Visual Layout System
- **Current**: Linear vertical stacking with step numbers
- **Target**: Grid-based canvas allowing side-by-side placement
- **Changes**:
  - Replace linear list with positioned elements using `position: absolute`
  - Use module's `position: {x, y}` data for placement
  - Add drag-to-position functionality (not just insert-between)
  - Show visual connection lines between modules

#### 1.2 Connection Management
- **Current**: Auto-connects sequential modules (A→B→C)
- **Target**: Manual connection drawing from output ports to input ports
- **Changes**:
  - Add visual "output port" on right side of modules
  - Add visual "input port" on left side of modules
  - Click-and-drag to create connections
  - Support multiple incoming connections to one module
  - Support multiple outgoing connections from one module
  - Draw SVG or canvas lines showing connections

#### 1.3 Module Placement
- **Current**: Drop between modules in linear order
- **Target**: Drop anywhere on canvas at specific coordinates
- **Changes**:
  - Canvas becomes a large scrollable area (not linear list)
  - Modules can be placed at any X,Y coordinate
  - Grid snapping for alignment (optional)
  - Auto-layout helper to arrange modules nicely

#### 1.4 UI/UX Improvements
- **Add**:
  - Mini-map for navigation on large workflows
  - Zoom in/out controls
  - Pan/scroll canvas
  - Connection validation (ensure all inputs connected)
  - Visual indicators for parallel branches

### 2. Backend Changes

#### 2.1 Workflow Engine (workflow_engine_db.py)

##### Current Execution Model
```python
def _build_execution_order(self, workflow):
    # Simple topological sort
    # Executes modules one-by-one in sequence
```

##### Target Execution Model
```python
async def execute_workflow_async():
    # 1. Build dependency graph
    # 2. Identify modules that can run in parallel
    # 3. Execute parallel branches concurrently with asyncio.gather()
    # 4. Wait for all inputs before executing downstream modules
```

**Key Changes**:
- **Line 353-387**: Modify `_build_execution_order()` to support parallel execution
  - Build dependency graph with multiple parents
  - Group modules by "execution level" (modules with no dependencies, then modules depending on level 0, etc.)
  - Return list of lists: `[[start], [module_a, module_b], [ab_testing], [end]]`

- **Line 80-155**: Modify execution loop in `execute_workflow_async()`
  - Change from `for module_id in execution_order` to `for level in execution_order`
  - Use `asyncio.gather()` to execute all modules in same level concurrently
  - Wait for all to complete before proceeding to next level

- **Line 389-409**: Modify `_get_module_inputs()`
  - Support collecting inputs from MULTIPLE source modules
  - Merge outputs from parallel branches

**Code Structure**:
```python
# New execution flow
execution_levels = self._build_execution_levels(workflow)
# [[start], [akool, dalle], [ab_testing], [end]]

for level_modules in execution_levels:
    # Execute all modules in this level concurrently
    tasks = []
    for module_id in level_modules:
        task = self._execute_single_module(module_id, ...)
        tasks.append(task)

    # Wait for all parallel modules to complete
    results = await asyncio.gather(*tasks)

    # Store results
    for module_id, outputs in zip(level_modules, results):
        module_outputs[module_id] = outputs
```

#### 2.2 A/B Testing Module (ab_testing_module.py)

**Current State**: Already partially implemented to collect from execution context

**Enhancements Needed**:
- **Line 95-115**: Verify collection from multiple providers works correctly
- **Line 160-203**: Ensure `_collect_provider_outputs()` handles parallel inputs
- Add better logging to debug provider collection
- Handle edge cases (empty outputs, single provider)

### 3. Connection Validation

#### Backend Validation (main_workflow_db.py)
**Add to workflow save/update endpoints**:
- Validate all modules (except Start) have at least one incoming connection
- Validate all modules (except End) have at least one outgoing connection
- Detect cycles in the graph
- Ensure A/B Testing has exactly 2+ incoming connections

### 4. Database Schema
**No changes needed** - current schema already supports:
- `WorkflowModule.position` (JSON field with x, y coordinates)
- `WorkflowConnection` (flexible many-to-many relationships)

### 5. Testing Requirements

#### Test Cases
1. **Simple Parallel**: Start → (A, B) → End
2. **A/B Testing**: Start → (AKOOL, DALL-E) → A/B Testing → End
3. **Triple Branch**: Start → (A, B, C) → Merge → End
4. **Nested Parallel**: Start → (A, (B, C)) → End
5. **Error Handling**: One branch fails, workflow continues or fails
6. **QC in Parallel**: Start → (Gen A, Gen B) → QC → End

#### Edge Cases
- Empty branch (no modules between fork and join)
- One module feeding multiple downstream modules
- Circular dependencies (should be rejected)
- Module with no connections (orphaned)

## Implementation Phases

### Phase 1: Backend Parallel Execution ✅ START HERE
**Priority: HIGH** - Enables A/B testing to work
**Estimated Time**: 2-3 hours

1. Modify `workflow_engine_db.py`:
   - Update `_build_execution_order()` to return execution levels
   - Update `execute_workflow_async()` to use `asyncio.gather()`
   - Update `_get_module_inputs()` to merge multiple sources
   - Add comprehensive logging

2. Test with existing linear workflows (should still work)
3. Test with manually created parallel workflow JSON
4. Fix A/B Testing module collection logic

### Phase 2: Frontend Connection Management
**Priority: MEDIUM** - Makes creating parallel workflows possible
**Estimated Time**: 4-6 hours

1. Replace linear list with positioned canvas
2. Implement connection drawing (click output → click input)
3. Add connection storage to workflow data structure
4. Update save/load workflow logic

### Phase 3: Frontend Visual Layout
**Priority: MEDIUM** - Makes it user-friendly
**Estimated Time**: 3-4 hours

1. Implement drag-to-position (vs. insert-between)
2. Add visual connection lines (SVG/Canvas)
3. Add zoom/pan controls
4. Add auto-layout helper

### Phase 4: Advanced Features
**Priority: LOW** - Nice-to-have enhancements
**Estimated Time**: 2-3 hours per feature

1. Mini-map navigator
2. Grid snapping
3. Connection validation UI
4. Workflow templates with parallel patterns
5. Copy/paste modules
6. Undo/redo

## Success Criteria

### Minimum Viable Implementation (Phase 1)
- [ ] User can create workflow: Start → (AKOOL, DALL-E) → A/B Testing → End
- [ ] Both image generation modules execute in parallel
- [ ] A/B Testing receives outputs from BOTH providers
- [ ] Workflow completes successfully with comparison results

### Full Implementation (Phases 1-3)
- [ ] Visual parallel module placement in builder UI
- [ ] Click-and-drag connection creation
- [ ] Execution engine handles parallel branches correctly
- [ ] All existing linear workflows continue to work
- [ ] A/B Testing workflow works end-to-end

## Files to Modify

### Backend
- `src/engine/workflow_engine_db.py` - Main execution engine
- `src/modules/ab_testing_module.py` - Provider collection logic
- `src/main_workflow_db.py` - Workflow validation (optional)

### Frontend
- `frontend/builder.html` - Canvas layout, connections, positioning

## Risk Mitigation

### Breaking Changes
- **Risk**: New execution model breaks existing workflows
- **Mitigation**: Keep backward compatibility, detect linear vs. parallel workflows
- **Test**: Run all existing workflows after changes

### Performance
- **Risk**: Parallel execution increases resource usage
- **Mitigation**: Limit concurrent module execution (e.g., max 5 parallel)
- **Test**: Load testing with multiple parallel branches

### Complexity
- **Risk**: UI becomes too complex for simple workflows
- **Mitigation**: Provide "simple mode" (linear) and "advanced mode" (parallel)
- **Test**: User testing with both modes

## Future Enhancements
- Conditional branching (if/else logic)
- Loops (iterate until condition met)
- Sub-workflows (reusable workflow components)
- Workflow version control
- Collaborative editing
- Workflow marketplace/sharing

## Notes
- Start with backend (Phase 1) to unblock A/B testing immediately
- Frontend can come later as enhancement
- For now, users can create parallel workflows via API/JSON if needed
- Consider using a graph visualization library (e.g., Cytoscape.js, React Flow) for frontend

---

**Created**: 2025-11-01
**Status**: Planning Complete - Ready to Implement Phase 1
**Owner**: AI Workflow Platform Team
