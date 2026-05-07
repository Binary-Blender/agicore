# Module Development Guide

## Overview

Modules are the building blocks of workflows in the Binary-Blender Orchestrator. Each module performs a specific task and can be chained together to create complex workflows.

## Asset-Centric Design

**Key Principle**: Modules exchange **asset IDs** instead of full data objects.

### Why Asset IDs?

1. **Memory Efficiency**: Don't pass large binary data between modules
2. **Centralized Storage**: All assets stored in Assets Service
3. **Lineage Tracking**: Automatic tracking of asset provenance
4. **QC Integration**: Easy to create QC tasks for assets

### Data Flow

```
Module A (Image Gen)
  ↓ Creates assets in Assets Service
  ↓ Returns asset IDs: ["asset_1", "asset_2"]
  ↓
Module B (Image Processing)
  ↓ Receives asset IDs as input
  ↓ Fetches assets from Assets Service
  ↓ Processes images
  ↓ Creates new assets in Assets Service
  ↓ Returns new asset IDs: ["asset_3", "asset_4"]
```

## Base Module Class

All modules must inherit from `BaseModule`:

```python
from typing import Dict, List, Any
from src.modules.base import BaseModule

class MyModule(BaseModule):
    """
    Description of what this module does
    """

    # Module metadata
    MODULE_TYPE = "my_module"  # Unique identifier
    MODULE_NAME = "My Module"  # Display name

    async def execute_with_asset_ids(
        self,
        inputs: Dict[str, List[str]],  # Input asset IDs
        execution_id: str,
        tenant_id: str
    ) -> List[str]:  # Output asset IDs
        """
        Execute the module logic

        Args:
            inputs: Dict mapping input names to lists of asset IDs
            execution_id: Current workflow execution ID
            tenant_id: Tenant ID for multi-tenancy

        Returns:
            List of output asset IDs created by this module
        """
        # Your implementation here
        pass
```

## Module Methods

### Required Methods

#### execute_with_asset_ids()
Main execution method that receives and returns asset IDs.

### Inherited Helper Methods

#### fetch_assets()
Fetch assets from Assets Service:

```python
asset_ids = inputs.get('images', [])
assets = await self.fetch_assets(asset_ids)

for asset in assets:
    print(f"Processing {asset.url}")
```

#### create_asset()
Create a new asset in Assets Service:

```python
asset_id = await self.create_asset(
    type="image",
    url="https://example.com/image.png",
    prompt="A beautiful sunset",
    provider="akool",
    execution_id=execution_id,
    tenant_id=tenant_id,
    asset_metadata={"width": 1024, "height": 768},
    quality_metrics={"score": 0.95}
)
```

#### create_qc_task()
Create a QC task in Assets Service:

```python
qc_task_id = await self.create_qc_task(
    execution_id=execution_id,
    module_id=self.MODULE_TYPE,
    asset_ids=generated_asset_ids,
    tenant_id=tenant_id
)
```

## Example Modules

### 1. Image Generation Module

```python
import httpx
from src.modules.base import BaseModule

class ImageGenerationModule(BaseModule):
    MODULE_TYPE = "image_generation"
    MODULE_NAME = "Image Generation"

    async def execute_with_asset_ids(
        self,
        inputs: Dict[str, List[str]],
        execution_id: str,
        tenant_id: str
    ) -> List[str]:
        # Get configuration
        prompt = self.config.get('prompt', inputs.get('prompt', [''])[0])
        count = self.config.get('count', 4)
        provider = self.config.get('provider', 'akool')

        # Generate images via MCP
        image_urls = await self._generate_images(prompt, count, provider)

        # Create assets in Assets Service
        asset_ids = []
        for url in image_urls:
            asset_id = await self.create_asset(
                type="image",
                url=url,
                prompt=prompt,
                provider=provider,
                execution_id=execution_id,
                tenant_id=tenant_id
            )
            asset_ids.append(asset_id)

        return asset_ids

    async def _generate_images(
        self,
        prompt: str,
        count: int,
        provider: str
    ) -> List[str]:
        # Call MCP or provider API
        # Return list of image URLs
        pass
```

### 2. QC Module

```python
from src.modules.base import BaseModule

class QCModule(BaseModule):
    MODULE_TYPE = "qc_task"
    MODULE_NAME = "Quality Control"

    async def execute_with_asset_ids(
        self,
        inputs: Dict[str, List[str]],
        execution_id: str,
        tenant_id: str
    ) -> List[str]:
        # Get asset IDs to QC
        asset_ids = inputs.get('asset_ids', [])

        if not asset_ids:
            return []

        # Determine sampling
        sampling_rate = self.config.get('sampling_rate', 1.0)
        should_sample = self._should_sample(sampling_rate)

        if should_sample:
            # Create QC task
            qc_task_id = await self.create_qc_task(
                execution_id=execution_id,
                module_id=self.MODULE_TYPE,
                asset_ids=asset_ids,
                tenant_id=tenant_id
            )

            # QC task created, assets in "unchecked" state
            # Frontend will display QC task for human review
            print(f"Created QC task: {qc_task_id}")
        else:
            # Auto-approve assets
            await self._auto_approve_assets(asset_ids)

        # Return same asset IDs (no new assets created)
        return asset_ids

    def _should_sample(self, rate: float) -> bool:
        import random
        return random.random() < rate
```

### 3. Conditional Module

```python
from src.modules.base import BaseModule

class ConditionalModule(BaseModule):
    MODULE_TYPE = "conditional"
    MODULE_NAME = "Conditional Branch"

    async def execute_with_asset_ids(
        self,
        inputs: Dict[str, List[str]],
        execution_id: str,
        tenant_id: str
    ) -> List[str]:
        # Evaluate condition
        condition = self.config.get('condition', 'count > 0')
        asset_ids = inputs.get('asset_ids', [])

        # Simple condition evaluation
        result = self._evaluate(condition, {'count': len(asset_ids)})

        # Store result in execution metadata
        # Engine can use this to decide next steps
        await self._store_condition_result(execution_id, result)

        return asset_ids  # Pass through

    def _evaluate(self, condition: str, context: dict) -> bool:
        # Simple eval (in production, use safe expression evaluator)
        try:
            return eval(condition, {}, context)
        except:
            return False
```

## Module Configuration

Modules are configured in the workflow definition:

```json
{
  "id": "gen1",
  "type": "image_generation",
  "config": {
    "provider": "akool",
    "count": 4,
    "style": "realistic"
  },
  "inputs": {
    "prompt": "$workflow.inputs.prompt"
  }
}
```

### Input Resolution

Inputs can reference:
- `$workflow.inputs.X` - Initial workflow inputs
- `$moduleId.outputs` - Outputs from previous modules

Example:
```json
{
  "id": "qc1",
  "type": "qc_task",
  "inputs": {
    "asset_ids": "$gen1.outputs"
  }
}
```

## Error Handling

Modules should handle errors gracefully:

```python
async def execute_with_asset_ids(self, inputs, execution_id, tenant_id):
    try:
        # Module logic
        return asset_ids
    except Exception as e:
        self.logger.error(f"Module {self.MODULE_TYPE} failed: {e}")
        # Re-raise to fail the workflow
        raise
```

The Engine will:
1. Catch the exception
2. Mark execution as "failed"
3. Store error message
4. Return failure to user

## Testing Modules

### Unit Tests

```python
import pytest
from src.modules.image_gen_module import ImageGenerationModule

@pytest.mark.asyncio
async def test_image_generation():
    module = ImageGenerationModule(
        module_id="test_gen",
        config={"provider": "akool", "count": 2}
    )

    # Mock Assets Service
    module.asset_repository = Mock AssetRepository()

    asset_ids = await module.execute_with_asset_ids(
        inputs={"prompt": ["A sunset"]},
        execution_id="exec_123",
        tenant_id="tenant_123"
    )

    assert len(asset_ids) == 2
```

### Integration Tests

```python
import pytest
from src.engine.workflow_engine import WorkflowEngine

@pytest.mark.asyncio
async def test_workflow_with_module():
    engine = WorkflowEngine()

    workflow = {
        "modules": [
            {"id": "gen1", "type": "image_generation", "config": {...}}
        ]
    }

    execution = await engine.execute(
        workflow=workflow,
        inputs={"prompt": "A sunset"}
    )

    assert execution.status == "completed"
    assert "gen1" in execution.module_outputs
```

## Best Practices

### 1. Always Use Asset IDs
❌ Don't return full data:
```python
return {"images": [binary_data1, binary_data2]}
```

✅ Do return asset IDs:
```python
return ["asset_1", "asset_2"]
```

### 2. Use Tenant Isolation
Always pass `tenant_id` when creating assets:
```python
await self.create_asset(..., tenant_id=tenant_id)
```

### 3. Log Progress
Use the logger for debugging:
```python
self.logger.info(f"Generated {len(asset_ids)} images")
```

### 4. Validate Inputs
Check required inputs:
```python
if 'required_input' not in inputs:
    raise ValueError("Missing required_input")
```

### 5. Clean Resource
Clean up resources:
```python
async def execute_with_asset_ids(self, ...):
    client = httpx.AsyncClient()
    try:
        # Use client
        pass
    finally:
        await client.aclose()
```

## Module Registry

Register modules in `src/modules/__init__.py`:

```python
from .image_gen_module import ImageGenerationModule
from .qc_module import QCModule

MODULE_REGISTRY = {
    "image_generation": ImageGenerationModule,
    "qc_task": QCModule,
}
```

The Engine uses this registry to instantiate modules:

```python
module_class = MODULE_REGISTRY[module_def['type']]
module = module_class(module_id=module_def['id'], config=module_def['config'])
```

## Advanced Topics

### Background Processing

For long-running tasks:

```python
import asyncio

async def execute_with_asset_ids(self, inputs, execution_id, tenant_id):
    # Start background task
    task_id = await self._start_background_task(inputs)

    # Poll for completion
    while not await self._is_complete(task_id):
        await asyncio.sleep(5)

    result = await self._get_result(task_id)
    return await self._create_assets_from_result(result, execution_id, tenant_id)
```

### Retry Logic

```python
from tenacity import retry, stop_after_attempt, wait_exponential

class MyModule(BaseModule):
    @retry(stop=stop_after_attempt(3), wait=wait_exponential(min=1, max=10))
    async def _call_external_api(self):
        # API call that might fail
        pass
```

### Caching

```python
from functools import lru_cache

class MyModule(BaseModule):
    @lru_cache(maxsize=100)
    def _expensive_computation(self, input_hash):
        # Expensive operation
        pass
```
