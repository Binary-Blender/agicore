#!/usr/bin/env python3
"""Simple workflow example: Generate image → Human QC → Done

This example demonstrates the core concepts:
1. Modular components (ImageGenerator, QCModule)
2. Human checkpoint (workflow pauses for review)
3. Asset-centric flow (modules exchange asset IDs)

Run:
    python examples/simple_workflow.py
"""

import asyncio
from src.models.workflow import Workflow, ModuleConfig, Connection
from src.engine.workflow_engine import WorkflowEngine
from src.database.repositories import InMemoryAssetRepository


async def main():
    print("=" * 60)
    print("Binary Blender Orchestrator - Simple Workflow Example")
    print("=" * 60)
    print()

    # Create in-memory asset repository (for demo)
    asset_repo = InMemoryAssetRepository()

    # Define workflow
    workflow = Workflow(
        name="Simple Image Pipeline",
        description="Generate an image and get human approval",
        modules=[
            ModuleConfig(
                id="gen_1",
                type="image_generator",
                name="Generate Image",
                config={
                    "prompt": "a beautiful sunset over mountains",
                    "count": 3,
                    "provider": "dall-e-3"
                }
            ),
            ModuleConfig(
                id="qc_1",
                type="qc_review",
                name="Human Review",
                config={
                    "review_mode": "individual",
                    "auto_reject_threshold": 0.0
                }
            )
        ],
        connections=[
            Connection(
                from_module_id="gen_1",
                from_output="images",
                to_module_id="qc_1",
                to_input="images"
            )
        ]
    )

    print(f"Workflow: {workflow.name}")
    print(f"Description: {workflow.description}")
    print(f"Modules: {len(workflow.modules)}")
    print(f"Connections: {len(workflow.connections)}")
    print()

    # Create workflow engine
    engine = WorkflowEngine(asset_repo=asset_repo)

    # Execute workflow
    print("▶️  Executing workflow...")
    print()

    execution = await engine.execute_workflow(workflow)

    print(f"Execution ID: {execution.id}")
    print(f"State: {execution.state}")
    print()

    # Check if paused for QC
    if execution.state.value == "paused_for_qc":
        print("⏸️  Workflow PAUSED for human review")
        print()

        # Get pending QC tasks
        pending_tasks = engine.get_pending_qc_tasks()
        print(f"Pending QC Tasks: {len(pending_tasks)}")

        if pending_tasks:
            task = pending_tasks[0]
            print(f"  Task ID: {task['id']}")
            print(f"  Assets to review: {len(task.get('images', []))}")
            print()

            # Simulate human review (auto-approve for demo)
            print("👤 Simulating human review...")
            qc_results = {}
            for img in task.get("images", []):
                qc_results[img["id"]] = {
                    "decision": "pass",
                    "comment": "Looks good!"
                }

            print(f"  Approved: {len(qc_results)} images")
            print()

            # Submit QC results and resume
            print("▶️  Resuming workflow with QC results...")
            success = await engine.submit_qc_results(task["id"], qc_results)

            if success:
                print("✅ Workflow resumed successfully")
                print()

                # Get updated execution
                execution = engine.get_execution_status(execution.id)
                print(f"Final State: {execution.state}")
                print()

    # Show final assets
    assets = await asset_repo.get_by_execution(execution.id)
    print(f"📦 Total Assets Created: {len(assets)}")
    for i, asset in enumerate(assets, 1):
        print(f"  {i}. {asset.id} ({asset.type}) - State: {asset.state}")

    print()
    print("✅ Example complete!")
    print()
    print("Next steps:")
    print("  - Check AI_ASSISTANT_GUIDE.md for implementation details")
    print("  - See examples/image_pipeline.py for more complex workflows")
    print("  - Run the API server: uvicorn src.api.main:app --reload")


if __name__ == "__main__":
    asyncio.run(main())
