"""
Enhanced workflow execution engine with database support
"""
import asyncio
import copy
import json
import logging
import traceback
from typing import Dict, List, Any, Optional
from datetime import datetime
from dataclasses import dataclass
from sqlalchemy.ext.asyncio import AsyncSession

from src.modules import module_registry
from src.modules.base import BaseModule
from src.database.repositories import (
    ExecutionRepository, AssetRepository, QCTaskRepository
)
from src.utils.execution_logger import attach_execution_logger, detach_execution_logger

logger = logging.getLogger(__name__)


def serialize_for_json(obj):
    """Recursively convert datetime objects to ISO strings for JSON serialization"""
    if isinstance(obj, datetime):
        return obj.isoformat()
    elif isinstance(obj, dict):
        return {key: serialize_for_json(value) for key, value in obj.items()}
    elif isinstance(obj, list):
        return [serialize_for_json(item) for item in obj]
    else:
        return obj


class WorkflowEngine:
    """Executes workflows by orchestrating modules with database persistence"""

    def __init__(self):
        self.db_session: Optional[AsyncSession] = None

    def set_db_session(self, session: AsyncSession):
        """Set the database session for the engine"""
        self.db_session = session

    def _compute_module_labels(self, modules: List[Dict[str, Any]]) -> Dict[str, str]:
        """Create consistent row/position labels for modules"""
        rows: Dict[int, List[Dict[str, Any]]] = {}
        for module in modules:
            position = module.get("position") or {}
            row_index = int(position.get("y", 0))
            rows.setdefault(row_index, []).append({
                "module": module,
                "column": int(position.get("x", 0))
            })

        labels: Dict[str, str] = {}
        for display_row, row_index in enumerate(sorted(rows.keys()), start=1):
            sorted_modules = sorted(rows[row_index], key=lambda item: item["column"])
            for display_col, entry in enumerate(sorted_modules, start=1):
                module = entry["module"]
                base_name = module.get("name") or module.get("type") or module.get("id")
                labels[module["id"]] = f"{display_row}.{display_col} {base_name}"

        # Fallback for modules without position data
        if len(labels) < len(modules):
            for module in modules:
                labels.setdefault(module["id"], module.get("name") or module.get("type") or module["id"])

        return labels

    async def execute_workflow_async(
        self,
        workflow: Dict[str, Any],
        execution_id: str,
        parameters: Dict[str, Any],
        restored_context: Dict[str, Any] = None
    ) -> None:
        """Execute a workflow asynchronously with database persistence"""
        if not self.db_session:
            raise ValueError("Database session not set")

        execution_repo = ExecutionRepository(self.db_session)
        asset_repo = AssetRepository(self.db_session)

        # Update execution state
        execution = await execution_repo.get_by_id(execution_id)
        if not execution:
            raise ValueError(f"Execution {execution_id} not found")

        # Work with a mutable copy of execution_data so updates persist reliably
        execution_data = dict(execution.execution_data or {})
        execution_data.setdefault("parameters", parameters)

        try:
            # Build execution order
            execution_order = self._build_execution_order(workflow)
            logger.info(f"Execution order for workflow {workflow['id']}: {execution_order}")

            # Initialize context - use restored context if resuming, otherwise create new
            if restored_context:
                context = restored_context
                logger.info(f"Resuming execution {execution_id} with restored context")
            else:
                context = {
                    "workflow_id": workflow["id"],
                    "execution_id": execution_id,
                    "parameters": parameters,
                    "assets": [],
                    "qc_queue": []
                }

            context["module_labels"] = self._compute_module_labels(workflow.get("modules", []))

            # Always ensure asset_repo is in context for asset-centric operations
            context["asset_repo"] = asset_repo

            # Attach execution logger to capture logs for the UI
            log_handler = attach_execution_logger(context)
            logger.info(f"Attached execution logger for execution {execution_id}")

            # Execute modules level by level (enables parallel execution)
            # When resuming, use module_outputs from restored context if available
            if restored_context and "module_outputs" in restored_context:
                module_outputs = restored_context["module_outputs"]
                logger.info(f"Using module_outputs from restored context: {list(module_outputs.keys())}")
            else:
                module_outputs = execution_data.get("module_outputs", {})

            module_level_map = self._build_module_level_map(execution_order)
            level_index = 0
            total_levels = len(execution_order)

            while level_index < total_levels:
                level_modules = execution_order[level_index]
                logger.info(f"Executing level {level_index} with {len(level_modules)} module(s): {level_modules}")

                # Execute all modules in this level concurrently
                async def execute_module(module_id: str, current_level: int = level_index):
                    """Execute a single module"""
                    import time
                    module_start = time.time()

                    # Check if already executed (for resume scenarios)
                    if module_id in module_outputs:
                        logger.info(f"Skipping already executed module: {module_id}")
                        return None

                    # Get module configuration
                    module_config = next(
                        (m for m in workflow["modules"] if m["id"] == module_id),
                        None
                    )
                    if not module_config:
                        logger.error(f"Module {module_id} not found in workflow")
                        return None

                    # Note: We don't update execution state here during parallel execution
                    # to avoid concurrent database session usage issues

                    logger.info(f"[TIMING] Module {module_id}: Starting execution")

                    # Get module inputs from previous outputs
                    input_start = time.time()
                    inputs = self._get_module_inputs(
                        module_id, workflow, module_outputs
                    )
                    input_elapsed = time.time() - input_start
                    logger.info(f"[TIMING] Module {module_id}: Input gathering took {input_elapsed:.3f}s")

                    # Create and execute module
                    create_start = time.time()
                    runtime_config = await self._build_module_config_with_bindings(
                        module_config,
                        module_outputs,
                        asset_repo
                    )
                    module = module_registry.create_module(
                        module_id,
                        module_config["type"],
                        runtime_config
                    )
                    create_elapsed = time.time() - create_start
                    logger.info(f"[TIMING] Module {module_id}: Module creation took {create_elapsed:.3f}s")

                    # Inject asset repository into module
                    inject_start = time.time()
                    module._set_asset_repo(asset_repo)
                    inject_elapsed = time.time() - inject_start
                    logger.info(f"[TIMING] Module {module_id}: Asset repo injection took {inject_elapsed:.3f}s")

                    logger.info(f"Executing module {module_id} ({module_config['type']})")
                    # Use new asset-centric execution (with backward compatibility)
                    exec_start = time.time()
                    try:
                        outputs = await module.execute_with_asset_ids(inputs, context)
                    except Exception as e:
                        logger.error(f"Module {module_id} execution failed: {e}", exc_info=True)
                        error_details = {
                            "error_type": e.__class__.__name__,
                            "error": str(e),
                            "traceback": traceback.format_exc(),
                            "failed_at": datetime.utcnow().isoformat(),
                            "module_id": module_id,
                            "module_type": module_config.get("type"),
                            "level": current_level
                        }
                        execution_data["error"] = error_details
                        if "execution_logs" in context:
                            execution_data["execution_logs"] = context["execution_logs"]
                        await execution_repo.update_execution_data(
                            execution_id,
                            execution_data
                        )
                        raise

                    exec_elapsed = time.time() - exec_start
                    logger.info(f"[TIMING] Module {module_id}: Execution took {exec_elapsed:.3f}s")

                    # Check if we should pause
                    if context.get("should_pause"):
                        logger.info(f"Module {module_id} requested pause")
                        return {"paused": True, "module_id": module_id, "inputs": inputs}

                    module_total = time.time() - module_start
                    logger.info(f"[TIMING] Module {module_id}: Total time {module_total:.3f}s")
                    return {"module_id": module_id, "outputs": outputs}

                # Execute all modules in parallel
                try:
                    if len(level_modules) == 1:
                        # Single module - no need for gather
                        result = await execute_module(level_modules[0])
                        results = [result] if result else []
                    else:
                        # Multiple modules - execute in parallel
                        tasks = [execute_module(mid) for mid in level_modules]
                        results = await asyncio.gather(*tasks, return_exceptions=True)

                    # Process results - first collect all outputs, then update database once
                    has_pause = False
                    pause_result = None

                    for result in results:
                        if isinstance(result, Exception):
                            logger.error(f"Module execution failed: {str(result)}")
                            await execution_repo.update_state(execution_id, "failed")
                            raise result

                        if result and result.get("paused"):
                            # Handle pause request
                            has_pause = True
                            pause_result = result
                            break  # Stop processing other results

                        if result and result.get("outputs"):
                            # Store module outputs (in memory only)
                            module_id = result["module_id"]
                            outputs = result["outputs"]
                            logger.info(f"Collecting outputs from {module_id}: {list(outputs.keys())}")
                            module_outputs[module_id] = outputs
                        elif result:
                            logger.warning(f"Module returned result without outputs: {result}")

                    # Now update database once with all collected outputs
                    logger.info(f"After level {level_index}, module_outputs contains: {list(module_outputs.keys())}")

                    # Handle pause before any retry logic
                    if has_pause:
                        module_id = pause_result["module_id"]
                        inputs = pause_result["inputs"]

                        # Calculate remaining levels
                        remaining_levels = execution_order[level_index + 1:]
                        remaining_modules = [m for level in remaining_levels for m in level]

                        # Save paused state
                        # Filter out non-serializable objects from context (like AssetRepository)
                        serializable_context = {
                            k: v for k, v in context.items()
                            if not (k == 'asset_repo' or k.endswith('_repo') or hasattr(v, '__class__') and 'Repository' in v.__class__.__name__)
                        }

                        paused_data = serialize_for_json({
                            "module_id": module_id,
                            "inputs": inputs,
                            "context": serializable_context,
                            "module_outputs": module_outputs,
                            "remaining_modules": remaining_modules
                        })

                        await execution_repo.pause_for_qc(execution_id, paused_data)

                        # Handle QC-specific logic
                        if context.get("pause_reason") == "awaiting_qc":
                            await self._create_qc_task(
                                execution_id,
                                module_id,
                                context.get("qc_data", {})
                            )
                        elif context.get("pause_reason") == "ab_testing_comparison":
                            await self._create_qc_task(
                                execution_id,
                                module_id,
                                context.get("qc_data", {})
                            )

                        # Save execution logs before pausing
                        if "execution_logs" in context:
                            execution_data["execution_logs"] = context["execution_logs"]
                            await execution_repo.update_execution_data(
                                execution_id,
                                execution_data
                            )
                            logger.info(f"Saved {len(context['execution_logs'])} log entries before pause")

                        # Detach logger before pausing
                        if 'log_handler' in locals():
                            detach_execution_logger(log_handler)
                            logger.info(f"Detached execution logger before pause")

                        return  # Exit execution, will resume later

                    retry_request = context.pop("retry_request", None)
                    if retry_request:
                        retry_level_index = await self._process_retry_request(
                            retry_request,
                            workflow,
                            module_outputs,
                            execution_repo,
                            execution_data,
                            execution_id,
                            module_level_map,
                            execution_order
                        )
                        if retry_level_index is not None:
                            logger.info(
                                f"Retrying workflow from level {retry_level_index} "
                                f"per request {retry_request}"
                            )
                            level_index = retry_level_index
                            continue
                        else:
                            logger.warning(
                                "Retry requested but target step could not be resolved. "
                                "Continuing with normal execution."
                            )

                    if module_outputs:
                        import time
                        db_update_start = time.time()
                        execution_data["module_outputs"] = module_outputs
                        logger.info(f"[TIMING] Level {level_index}: Starting database update")
                        await execution_repo.update_execution_data(
                            execution_id,
                            execution_data
                        )
                        db_update_elapsed = time.time() - db_update_start
                        logger.info(f"[TIMING] Level {level_index}: Database update took {db_update_elapsed:.3f}s")

                    level_index += 1
                except Exception as e:
                    logger.error(f"Level execution failed: {str(e)}")
                    await execution_repo.update_state(execution_id, "failed")
                    raise

            # Persist asset state updates before completing
            await self._persist_asset_updates(execution_id, module_outputs)

            # Auto-approve assets if no QC module in workflow
            await self._auto_approve_assets_if_no_qc(workflow, execution_id)

            # Workflow completed
            await execution_repo.update_state(execution_id, "completed")
            logger.info(f"Workflow execution {execution_id} completed successfully")

        except Exception as e:
            logger.error(f"Workflow execution failed: {str(e)}", exc_info=True)

            # Attempt to rollback the DB session so follow-up updates don't get
            # stuck in a failed transaction state.
            if self.db_session:
                try:
                    await self.db_session.rollback()
                except Exception as rollback_error:
                    logger.error(
                        "Failed to rollback session after workflow error: %s",
                        rollback_error,
                        exc_info=True
                    )
            if "error" not in execution_data:
                execution_data["error"] = {
                    "error_type": e.__class__.__name__,
                    "error": str(e),
                    "traceback": traceback.format_exc(),
                    "failed_at": datetime.utcnow().isoformat(),
                    "level": "engine"
                }
                if "execution_logs" in context:
                    execution_data["execution_logs"] = context["execution_logs"]
                await execution_repo.update_execution_data(
                    execution_id,
                    execution_data
                )
            await execution_repo.update_state(execution_id, "failed")
            raise
        finally:
            # Detach execution logger and save logs to database
            if 'log_handler' in locals():
                detach_execution_logger(log_handler)
                logger.info(f"Detached execution logger for execution {execution_id}")

                # Save execution logs to database
                if "execution_logs" in context:
                    execution_data["execution_logs"] = context["execution_logs"]
                    await execution_repo.update_execution_data(
                        execution_id,
                        execution_data
                    )
                    logger.info(f"Saved {len(context['execution_logs'])} log entries to database")

    async def resume_execution(
        self,
        execution_id: str,
        resume_data: Dict[str, Any]
    ) -> None:
        """Resume a paused workflow execution"""
        if not self.db_session:
            raise ValueError("Database session not set")

        execution_repo = ExecutionRepository(self.db_session)

        # Get execution
        execution = await execution_repo.get_by_id(execution_id)
        if not execution or not execution.paused_data:
            logger.error(f"No paused data found for execution {execution_id}")
            return

        paused_data = execution.paused_data

        # Restore module_outputs to execution_data
        if "module_outputs" in paused_data:
            execution.execution_data["module_outputs"] = paused_data["module_outputs"]
            await self.db_session.commit()

        # Clear paused state
        execution.paused_data = None
        await self.db_session.commit()

        # Update state to running
        await execution_repo.update_state(execution_id, "running")

        # Restore context
        context = paused_data["context"]
        context["resuming"] = True
        context.pop("should_pause", None)  # Clear pause flag
        context.pop("pause_reason", None)

        # Add module_outputs to context for skip logic
        if "module_outputs" in paused_data:
            context["module_outputs"] = paused_data["module_outputs"]
            logger.info(f"Restored module_outputs to context: {list(context['module_outputs'].keys())}")

        # Add resume data to context
        context.update(resume_data)

        # Get workflow
        from src.database.repositories import WorkflowRepository
        workflow_repo = WorkflowRepository(self.db_session)
        workflow_db = await workflow_repo.get_by_id(execution.workflow_id)

        # Convert to dict format
        workflow = {
            "id": workflow_db.id,
            "modules": [
                {
                    "id": m.id,
                    "type": m.type,
                    "name": m.name,
                    "config": m.config,
                    "text_bindings": m.text_bindings or {},
                    "ui_overrides": m.ui_overrides or {},
                    "input_config": m.input_config or {},
                    "position": m.position
                }
                for m in workflow_db.modules
            ],
            "connections": [
                {
                    "from_module_id": c.from_module_id,
                    "from_output": c.from_output,
                    "to_module_id": c.to_module_id,
                    "to_input": c.to_input,
                    "condition": c.condition
                }
                for c in workflow_db.connections
            ]
        }

        # Continue execution with restored context
        await self.execute_workflow_async(
            workflow,
            execution_id,
            context.get("parameters", {}),
            restored_context=context
        )

    async def submit_qc_results(
        self,
        task_id: str,
        results: Dict[str, Any]
    ) -> bool:
        """Submit QC results and resume workflow"""
        if not self.db_session:
            raise ValueError("Database session not set")

        qc_repo = QCTaskRepository(self.db_session)

        # Get QC task
        qc_task = await qc_repo.get_by_id(task_id)
        if not qc_task:
            logger.error(f"QC task {task_id} not found")
            return False

        # Resume the workflow
        try:
            await self.resume_execution(
                qc_task.execution_id,
                {"qc_results": results}
            )
            logger.info(f"Workflow {qc_task.execution_id} resumed successfully after QC")
            return True
        except Exception as e:
            logger.error(f"Failed to resume workflow {qc_task.execution_id}: {e}")
            return False

    async def _create_qc_task(
        self,
        execution_id: str,
        module_id: str,
        qc_data: Dict[str, Any]
    ):
        """Create a QC task in the database"""
        if not self.db_session:
            return

        qc_repo = QCTaskRepository(self.db_session)
        asset_repo = AssetRepository(self.db_session)

        # Create QC task
        qc_task = await qc_repo.create({
            "execution_id": execution_id,
            "module_id": module_id,
            "task_type": qc_data.get("task_type", "pass_fail")
        })

        # With asset-centric architecture, qc_data["images"] contains asset IDs (strings)
        # Assets are already created by modules, so we just need to link them to the QC task
        # No need to create assets here - they already exist in the database

        logger.info(f"Created QC task {qc_task.id} for execution {execution_id}")

    async def _persist_asset_updates(
        self,
        execution_id: str,
        module_outputs: Dict[str, Any]
    ) -> None:
        """Persist asset state updates from module outputs to the database

        With asset-centric architecture, module_outputs contains asset IDs (strings).
        Asset states are managed within individual modules during execution via
        create_asset() and update calls, so this function is now a no-op.

        Keeping the function for potential future use cases where we need to
        perform batch updates after workflow execution.
        """
        # No-op: Asset states are managed by modules during execution
        # All asset creation and state updates happen in BaseModule.execute_with_asset_ids()
        pass

    async def _auto_approve_assets_if_no_qc(
        self,
        workflow: Dict[str, Any],
        execution_id: str
    ) -> None:
        """Mark assets as N/A if workflow has no QC module

        Asset state logic:
        - With QC module: starts as "unchecked" → becomes "approved" or "rejected" after QC
        - Without QC module: starts as "unchecked" → becomes "N/A" (no QC needed)

        This preserves audit trail - you can differentiate between:
        - "approved" = went through QC and was approved
        - "N/A" = no QC step in workflow
        """
        if not self.db_session:
            return

        # Check if workflow contains a QC module
        has_qc_module = any(
            (module_type := (module.get("type") or "")) and (
                module_type.startswith("qc") or module_type == "ab_testing"
            )
            for module in workflow.get("modules", [])
        )

        # If no QC module, mark all unchecked assets as N/A
        if not has_qc_module:
            asset_repo = AssetRepository(self.db_session)

            # Get all assets from this execution
            assets = await asset_repo.get_by_execution(execution_id)

            # Update unchecked assets to N/A (no QC needed)
            updated_count = 0
            for asset in assets:
                if asset.state == "unchecked":
                    await asset_repo.update_state(asset.id, "N/A")
                    updated_count += 1

            if updated_count > 0:
                logger.info(f"[AUTO-QC] Marked {updated_count} asset(s) as 'N/A' (no QC module in workflow)")

    def _build_execution_order(self, workflow: Dict[str, Any]) -> List[List[str]]:
        """Build execution levels for parallel execution

        Returns a list of lists, where each inner list contains modules
        that can be executed in parallel (have no dependencies on each other).

        Example: [[start], [module_a, module_b], [ab_testing], [end]]
        """
        modules = {m["id"]: m for m in workflow["modules"]}
        connections = workflow["connections"]

        # Build adjacency lists (forward and backward)
        children = {module_id: [] for module_id in modules}  # module -> its outputs
        parents = {module_id: [] for module_id in modules}   # module -> its inputs

        for conn in connections:
            if conn.get("condition") != "fail":  # Skip fail connections for main flow
                from_id = conn["from_module_id"]
                to_id = conn["to_module_id"]
                children[from_id].append(to_id)
                parents[to_id].append(from_id)

        # Find start modules (no parents)
        start_modules = [
            m["id"] for m in workflow["modules"]
            if m["type"] == "start" or len(parents[m["id"]]) == 0
        ]
        if not start_modules:
            raise ValueError("No start module found")

        # Build execution levels using BFS
        execution_levels = []
        current_level = start_modules
        completed = set()

        while current_level:
            execution_levels.append(current_level)
            completed.update(current_level)

            # Find next level: modules whose ALL parents have completed
            next_level = []
            candidates = set()

            # Collect all children of current level
            for module_id in current_level:
                candidates.update(children[module_id])

            # Filter to only those whose all parents are complete
            for candidate in candidates:
                if candidate not in completed:
                    if all(parent in completed for parent in parents[candidate]):
                        next_level.append(candidate)

            current_level = next_level

        logger.info(f"Built execution levels: {execution_levels}")
        return execution_levels

    def _build_module_level_map(self, execution_order: List[List[str]]) -> Dict[str, int]:
        """Map each module ID to its execution level index"""
        level_map: Dict[str, int] = {}
        for level_index, level_modules in enumerate(execution_order):
            for module_id in level_modules:
                level_map[module_id] = level_index
        return level_map

    async def _process_retry_request(
        self,
        retry_request: Dict[str, Any],
        workflow: Dict[str, Any],
        module_outputs: Dict[str, Any],
        execution_repo: ExecutionRepository,
        execution_data: Dict[str, Any],
        execution_id: str,
        module_level_map: Dict[str, int],
        execution_order: List[List[str]]
    ) -> Optional[int]:
        """Handle retry instructions issued by QC modules"""
        raw_step = retry_request.get("step_number")
        total_levels = len(execution_order)

        if total_levels == 0:
            logger.warning("Retry requested but execution order is empty")
            return None

        try:
            step_number = int(raw_step)
        except (TypeError, ValueError):
            logger.warning(f"Ignoring retry request with invalid step number: {raw_step}")
            return None

        retry_level_index = step_number - 1
        if retry_level_index < 0:
            logger.warning(f"Retry step must be >= 1, received {step_number}")
            retry_level_index = 0

        if retry_level_index >= total_levels:
            logger.warning(
                f"Retry step {step_number} exceeds available levels ({total_levels}); "
                f"defaulting to last level"
            )
            retry_level_index = total_levels - 1
        removed_modules = []
        removed_modules = []
        for module_id, level_idx in list(module_level_map.items()):
            if level_idx >= retry_level_index:
                if module_outputs.pop(module_id, None) is not None:
                    removed_modules.append(module_id)

        logger.info(
            f"Cleared outputs for modules at level >= {retry_level_index} "
            f"(step {step_number}) due to retry request from {retry_request.get('requested_by')}. "
            f"Removed modules: {removed_modules}"
        )

        execution_data["module_outputs"] = module_outputs
        await execution_repo.update_execution_data(execution_id, execution_data)

        return retry_level_index

    def _get_module_inputs(
        self,
        module_id: str,
        workflow: Dict[str, Any],
        module_outputs: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Get inputs for a module from previous module outputs

        Supports multiple incoming connections - when multiple modules
        connect to the same input, their outputs are collected into a list.
        """
        inputs = {}
        input_sources = {}  # Track which inputs have multiple sources

        # Find all connections to this module
        incoming_connections = [
            conn for conn in workflow["connections"]
            if conn["to_module_id"] == module_id
        ]

        logger.info(f"Module {module_id} has {len(incoming_connections)} incoming connection(s)")

        for conn in incoming_connections:
            from_module = conn["from_module_id"]
            from_output = conn["from_output"]
            to_input = conn["to_input"]

            if from_module in module_outputs:
                outputs = module_outputs[from_module]
                if from_output in outputs:
                    output_data = outputs[from_output]

                    # Track multiple sources for same input
                    if to_input not in input_sources:
                        input_sources[to_input] = []
                    input_sources[to_input].append({
                        "from_module": from_module,
                        "data": output_data
                    })

        # Process collected inputs
        for input_name, sources in input_sources.items():
            if len(sources) == 1:
                # Single source - use directly
                inputs[input_name] = sources[0]["data"]
            else:
                # Multiple sources - flatten all data into single list
                # This is useful for A/B testing where multiple providers feed in
                # Each source["data"] is already a list of asset IDs, so we need to flatten
                flattened = []
                for source in sources:
                    data = source["data"]
                    if isinstance(data, list):
                        flattened.extend(data)
                    else:
                        flattened.append(data)
                inputs[input_name] = flattened
                logger.info(f"Input '{input_name}' has {len(sources)} sources - flattened to {len(flattened)} items")

        # Apply explicit input configuration overrides
        module_meta = next(
            (m for m in workflow.get("modules", []) if m.get("id") == module_id),
            {}
        )
        configured_inputs = self._resolve_configured_inputs(
            module_meta.get("input_config") or {},
            module_outputs
        )
        inputs.update(configured_inputs)

        logger.info(f"Module {module_id} inputs prepared: {list(inputs.keys())}")
        if not inputs and incoming_connections:
            logger.warning(f"Module {module_id} has {len(incoming_connections)} connections but no inputs!")
            logger.warning(f"Available module_outputs: {list(module_outputs.keys())}")
            for conn in incoming_connections:
                from_module = conn["from_module_id"]
                from_output = conn["from_output"]
                if from_module not in module_outputs:
                    logger.warning(f"  Missing: {from_module} (needed for input '{conn['to_input']}')")
                elif from_output not in module_outputs[from_module]:
                    logger.warning(f"  Missing output '{from_output}' from {from_module}")
                    logger.warning(f"  Available outputs from {from_module}: {list(module_outputs[from_module].keys())}")
        return inputs

    def _resolve_configured_inputs(
        self,
        input_config: Dict[str, Any],
        module_outputs: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Resolve explicitly configured inputs following precedence rules"""
        resolved: Dict[str, Any] = {}

        for input_name, config in input_config.items():
            if not isinstance(config, dict):
                continue

            value = None

            # 1. Previous module output override
            module_output_cfg = config.get("module_output") or {}
            from_module_id = module_output_cfg.get("module_id")
            output_key = module_output_cfg.get("output_key", "default")
            if from_module_id:
                output_payload = module_outputs.get(from_module_id, {})
                if output_key in output_payload:
                    value = output_payload[output_key]

            # 2. Asset repository references
            if value is None:
                asset_ids = config.get("asset_ids")
                if isinstance(asset_ids, str):
                    asset_ids = [asset_ids]
                if isinstance(asset_ids, list):
                    normalized = [asset_id.strip() for asset_id in asset_ids if asset_id and asset_id.strip()]
                    if normalized:
                        value = normalized

            # 3. Static fallback value
            if value is None and "static_value" in config:
                static_value = config.get("static_value")
                if isinstance(static_value, str):
                    if static_value.strip():
                        value = static_value
                elif static_value not in (None, ""):
                    value = static_value

            if value is not None:
                resolved[input_name] = value

        return resolved

    async def _build_module_config_with_bindings(
        self,
        module_config: Dict[str, Any],
        module_outputs: Dict[str, Any],
        asset_repo: AssetRepository
    ) -> Dict[str, Any]:
        """Merge dynamic text bindings into the module config before execution."""
        base_config = copy.deepcopy(module_config.get("config") or {})
        bindings = module_config.get("text_bindings") or {}
        if not bindings:
            return base_config

        if not asset_repo:
            logger.warning(
                "Module %s has text bindings but no asset repository is available",
                module_config.get("id")
            )
            return base_config

        binding_cache: Dict[tuple, Optional[str]] = {}

        for field_key, binding in bindings.items():
            if not isinstance(binding, dict):
                continue

            module_output = binding.get("module_output") or {}
            source_module = module_output.get("module_id")
            output_key = module_output.get("output_key", "default")
            if not source_module:
                continue

            cache_key = (source_module, output_key)
            if cache_key not in binding_cache:
                asset_ids = module_outputs.get(source_module, {}).get(output_key)
                binding_cache[cache_key] = await self._materialize_binding_text(
                    asset_repo,
                    asset_ids,
                    source_module,
                    output_key
                )

            text_value = binding_cache.get(cache_key)
            if text_value in (None, ""):
                continue

            self._assign_binding_value(base_config, field_key, text_value)

        return base_config

    async def _materialize_binding_text(
        self,
        asset_repo: AssetRepository,
        asset_ids: Any,
        source_module: str,
        output_key: str
    ) -> Optional[str]:
        """Fetch asset text payloads for a binding target."""
        normalized_ids = self._normalize_asset_ids(asset_ids)
        if not normalized_ids:
            logger.warning(
                "Text binding could not find assets for module %s output %s",
                source_module,
                output_key
            )
            return None

        try:
            assets = await asset_repo.get_by_ids(normalized_ids)
        except Exception as exc:
            logger.error(
                "Failed to fetch assets for text binding (%s.%s): %s",
                source_module,
                output_key,
                exc,
                exc_info=True
            )
            return None

        fragments: List[str] = []
        for asset in assets:
            if not asset:
                continue
            if asset.text_content:
                fragments.append(asset.text_content)
                continue
            if asset.payload is not None:
                try:
                    fragments.append(json.dumps(asset.payload))
                except TypeError:
                    fragments.append(str(asset.payload))
                continue
            metadata = asset.asset_metadata or {}
            inferred_text = metadata.get("text") or metadata.get("caption") or metadata.get("summary")
            if inferred_text:
                fragments.append(str(inferred_text))

        merged = "\n\n".join(fragment.strip() for fragment in fragments if isinstance(fragment, str) and fragment.strip())
        if not merged:
            logger.warning(
                "Assets for binding (%s.%s) did not contain text payloads",
                source_module,
                output_key
            )
            return None
        return merged

    def _assign_binding_value(self, config: Dict[str, Any], field_key: str, value: str) -> None:
        """Apply a resolved text binding to either config field or MCP argument."""
        text_value = value.strip() if isinstance(value, str) else value
        if field_key.startswith("tool_arg__"):
            argument_key = field_key.split("__", 1)[1]
            tool_args = config.setdefault("tool_arguments", {})
            tool_args[argument_key] = text_value
        else:
            config[field_key] = text_value

    def _normalize_asset_ids(self, asset_ids: Any) -> List[str]:
        """Ensure asset IDs are represented as a list of strings."""
        if not asset_ids:
            return []
        if isinstance(asset_ids, list):
            return [asset_id for asset_id in asset_ids if isinstance(asset_id, str) and asset_id.strip()]
        if isinstance(asset_ids, str):
            cleaned = asset_ids.strip()
            return [cleaned] if cleaned else []
        return []
