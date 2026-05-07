"""Workflow execution engine"""
import asyncio
import copy
import json
from typing import Dict, Any, List, Optional, TYPE_CHECKING
from datetime import datetime
import logging
from ..models.workflow import (
    Workflow, WorkflowExecution, ExecutionState,
    Connection, ModuleConfig
)
from ..modules import module_registry

if TYPE_CHECKING:
    from ..database.repositories import AssetRepository

logger = logging.getLogger(__name__)


class WorkflowEngine:
    """Executes workflows by orchestrating modules"""

    def __init__(self, asset_repo: Optional['AssetRepository'] = None):
        self.executions: Dict[str, WorkflowExecution] = {}
        self.paused_executions: Dict[str, Dict[str, Any]] = {}
        self.global_context = {
            "qc_queue": [],
            "assets": []
        }
        self.asset_repo = asset_repo

    async def execute_workflow(self, workflow: Workflow,
                             initial_context: Optional[Dict[str, Any]] = None) -> WorkflowExecution:
        """Execute a workflow"""
        # Create execution record
        execution = WorkflowExecution(
            workflow_id=workflow.id,
            execution_data=initial_context or {}
        )

        self.executions[execution.id] = execution

        # Create execution context
        context = {
            "execution_id": execution.id,
            "workflow_id": workflow.id,
            "started_at": execution.started_at.isoformat(),
            "global_context": self.global_context,
            **(initial_context or {})
        }

        logger.info(f"Starting workflow execution: {execution.id}")

        try:
            # Build execution graph
            graph = self._build_execution_graph(workflow)

            # Execute modules in topological order
            await self._execute_graph(workflow, execution, graph, context)

            # Mark as completed if not paused
            if execution.state != ExecutionState.PAUSED_FOR_QC:
                execution.state = ExecutionState.COMPLETED
                execution.completed_at = datetime.now()
                logger.info(f"Workflow execution completed: {execution.id}")

        except Exception as e:
            logger.error(f"Workflow execution failed: {e}")
            execution.state = ExecutionState.FAILED
            execution.completed_at = datetime.now()
            raise

        return execution

    async def resume_execution(self, execution_id: str, resume_data: Dict[str, Any]) -> WorkflowExecution:
        """Resume a paused workflow execution"""
        execution = self.executions.get(execution_id)
        if not execution:
            raise ValueError(f"Execution not found: {execution_id}")

        if execution.state != ExecutionState.PAUSED_FOR_QC:
            raise ValueError(f"Execution not paused: {execution_id}")

        paused_data = self.paused_executions.get(execution_id)
        if not paused_data:
            raise ValueError(f"No paused data found for: {execution_id}")

        logger.info(f"Resuming workflow execution: {execution_id}")

        # Update state
        execution.state = ExecutionState.RUNNING

        # Get workflow
        workflow = paused_data["workflow"]
        context = paused_data["context"]
        graph = paused_data["graph"]
        module_outputs = paused_data["module_outputs"]

        # Add resume data to context
        context.update(resume_data)

        # Clear the pause flag when resuming
        context.pop("should_pause", None)
        context.pop("pause_reason", None)

        # Resume from paused module
        current_module_id = execution.current_module_id
        module_config = next(m for m in workflow.modules if m.id == current_module_id)
        module = module_registry.create_module(
            module_config.id,
            module_config.type,
            module_config.config
        )

        # Call module's on_resume
        await module.on_resume(context, resume_data)

        # Continue execution
        await self._execute_graph(
            workflow, execution, graph, context,
            resume_from=current_module_id,
            module_outputs=module_outputs
        )

        # Clean up paused data
        del self.paused_executions[execution_id]

        if execution.state != ExecutionState.PAUSED_FOR_QC:
            execution.state = ExecutionState.COMPLETED
            execution.completed_at = datetime.now()

        return execution

    def _build_execution_graph(self, workflow: Workflow) -> Dict[str, List[str]]:
        """Build a dependency graph for module execution"""
        graph = {module.id: [] for module in workflow.modules}

        for connection in workflow.connections:
            if connection.to_module_id in graph:
                graph[connection.to_module_id].append(connection.from_module_id)

        return graph

    async def _execute_graph(self, workflow: Workflow, execution: WorkflowExecution,
                           graph: Dict[str, List[str]], context: Dict[str, Any],
                           resume_from: Optional[str] = None,
                           module_outputs: Optional[Dict[str, Any]] = None):
        """Execute modules in dependency order using asset-centric architecture"""
        module_outputs = module_outputs or {}
        executed = set(module_outputs.keys())

        # Get execution order
        order = self._topological_sort(graph)

        # Skip to resume point if specified
        if resume_from:
            resume_index = order.index(resume_from)
            order = order[resume_index:]

        logger.info(f"[WORKFLOW-ENGINE] Starting execution of {len(order)} modules: {order}")

        for module_id in order:
            if module_id in executed and module_id != resume_from:
                logger.info(f"[WORKFLOW-ENGINE] Skipping already executed module {module_id}")
                continue

            # Get module configuration
            module_config = next(m for m in workflow.modules if m.id == module_id)

            # Create module instance
            logger.info(f"[WORKFLOW-ENGINE] Creating module {module_id} ({module_config.type})")
            runtime_config = await self._build_runtime_config_with_bindings(
                module_config,
                module_outputs
            )
            module = module_registry.create_module(
                module_config.id,
                module_config.type,
                runtime_config
            )

            # Inject asset repository
            if self.asset_repo:
                logger.info(f"[WORKFLOW-ENGINE] Injecting asset repository into module {module_id}")
                module._set_asset_repo(self.asset_repo)
            else:
                logger.warning(f"[WORKFLOW-ENGINE] No asset repository available for module {module_id}")

            # Gather asset ID inputs from previous modules (ASSET-CENTRIC)
            input_asset_ids = {}
            for connection in workflow.connections:
                if connection.to_module_id == module_id:
                    from_output = module_outputs.get(connection.from_module_id, {})
                    if connection.from_output in from_output:
                        asset_ids = from_output[connection.from_output]
                        input_asset_ids[connection.to_input] = asset_ids
                        logger.info(f"[WORKFLOW-ENGINE] Input '{connection.to_input}' for module {module_id}: {len(asset_ids) if isinstance(asset_ids, list) else 'N/A'} asset IDs")

            input_asset_ids = self._apply_input_config_overrides(
                module_config,
                module_outputs,
                input_asset_ids
            )

            # Update execution state
            execution.current_module_id = module_id
            logger.info(f"[WORKFLOW-ENGINE] Executing module {module_id} ({module_config.type}) with {len(input_asset_ids)} inputs")

            # Add asset_repo to context for modules that need it
            execution_context = {
                **context,
                "asset_repo": self.asset_repo
            }

            # Execute module with asset IDs (ASSET-CENTRIC)
            logger.info(f"[WORKFLOW-ENGINE] Calling execute_with_asset_ids for module {module_id}")
            output_asset_ids = await module.execute_with_asset_ids(input_asset_ids, execution_context)
            logger.info(f"[WORKFLOW-ENGINE] Module {module_id} returned {len(output_asset_ids)} output keys: {list(output_asset_ids.keys())}")

            # Log output details
            for output_name, asset_ids in output_asset_ids.items():
                count = len(asset_ids) if isinstance(asset_ids, list) else 'N/A'
                logger.info(f"[WORKFLOW-ENGINE] Output '{output_name}': {count} asset IDs")

            # Check if we should pause
            if context.get("should_pause"):
                execution.state = ExecutionState.PAUSED_FOR_QC
                await module.on_pause(context)

                # Store paused state WITHOUT the current module's outputs
                # The outputs will be set when the workflow resumes
                self.paused_executions[execution.id] = {
                    "workflow": workflow,
                    "context": context,
                    "graph": graph,
                    "module_outputs": module_outputs.copy()  # Don't include current module
                }

                logger.info(f"[WORKFLOW-ENGINE] Workflow paused at module {module_id}")
                return

            # Only store outputs if we're not pausing (OUTPUTS ARE NOW ASSET IDs)
            module_outputs[module_id] = output_asset_ids
            executed.add(module_id)
            logger.info(f"[WORKFLOW-ENGINE] Module {module_id} execution complete, stored outputs")

    def _apply_input_config_overrides(
        self,
        module_config: ModuleConfig,
        module_outputs: Dict[str, Any],
        existing_inputs: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Apply explicit input configuration (module outputs, assets, static)"""
        input_config = getattr(module_config, "input_config", None) or {}
        if not input_config:
            return existing_inputs

        resolved = dict(existing_inputs)

        for input_name, config in input_config.items():
            if not isinstance(config, dict):
                continue

            value = None

            module_output_cfg = config.get("module_output") or {}
            from_module_id = module_output_cfg.get("module_id")
            output_key = module_output_cfg.get("output_key", "default")
            if from_module_id:
                output_payload = module_outputs.get(from_module_id, {})
                if output_key in output_payload:
                    value = output_payload[output_key]

            if value is None:
                asset_ids = config.get("asset_ids")
                if isinstance(asset_ids, str):
                    asset_ids = [asset_ids]
                if isinstance(asset_ids, list):
                    normalized = [asset_id.strip() for asset_id in asset_ids if asset_id and asset_id.strip()]
                    if normalized:
                        value = normalized

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

    async def _build_runtime_config_with_bindings(
        self,
        module_config: ModuleConfig,
        module_outputs: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Apply dynamic text bindings to the module config before instantiation."""
        base_config = copy.deepcopy(module_config.config or {})
        bindings = getattr(module_config, "text_bindings", None) or {}
        if not bindings:
            return base_config

        if not self.asset_repo:
            logger.warning(
                "Module %s has text bindings but no asset repository is configured",
                module_config.id
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
        asset_ids: Any,
        source_module: str,
        output_key: str
    ) -> Optional[str]:
        """Retrieve text payloads from asset IDs for a binding."""
        normalized_ids = self._normalize_asset_ids(asset_ids)
        if not normalized_ids:
            logger.warning(
                "Text binding could not find assets for module %s output %s",
                source_module,
                output_key
            )
            return None

        try:
            assets = await self.asset_repo.get_by_ids(normalized_ids)
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
            if getattr(asset, "text_content", None):
                fragments.append(asset.text_content)
                continue
            if getattr(asset, "payload", None) is not None:
                try:
                    fragments.append(json.dumps(asset.payload))
                except TypeError:
                    fragments.append(str(asset.payload))
                continue
            metadata = getattr(asset, "asset_metadata", None) or {}
            inferred_text = metadata.get("text") or metadata.get("caption") or metadata.get("summary")
            if inferred_text:
                fragments.append(str(inferred_text))

        merged = "\n\n".join(
            fragment.strip()
            for fragment in fragments
            if isinstance(fragment, str) and fragment.strip()
        )
        if not merged:
            logger.warning(
                "Assets for binding (%s.%s) did not contain text payloads",
                source_module,
                output_key
            )
            return None
        return merged

    def _assign_binding_value(self, config: Dict[str, Any], field_key: str, value: str) -> None:
        """Assign a binding value to either a config field or MCP argument."""
        text_value = value.strip() if isinstance(value, str) else value
        if field_key.startswith("tool_arg__"):
            argument_key = field_key.split("__", 1)[1]
            tool_args = config.setdefault("tool_arguments", {})
            tool_args[argument_key] = text_value
        else:
            config[field_key] = text_value

    def _normalize_asset_ids(self, asset_ids: Any) -> List[str]:
        """Normalize asset identifiers into a simple list of strings."""
        if not asset_ids:
            return []
        if isinstance(asset_ids, list):
            return [asset_id for asset_id in asset_ids if isinstance(asset_id, str) and asset_id.strip()]
        if isinstance(asset_ids, str):
            cleaned = asset_ids.strip()
            return [cleaned] if cleaned else []
        return []

    def _topological_sort(self, graph: Dict[str, List[str]]) -> List[str]:
        """Perform topological sort on the dependency graph"""
        visited = set()
        stack = []

        def visit(node):
            if node in visited:
                return
            visited.add(node)
            for dep in graph.get(node, []):
                visit(dep)
            stack.append(node)

        for node in graph:
            visit(node)

        return stack

    def get_execution_status(self, execution_id: str) -> Optional[WorkflowExecution]:
        """Get the status of a workflow execution"""
        return self.executions.get(execution_id)

    def get_pending_qc_tasks(self) -> List[Dict[str, Any]]:
        """Get all pending QC tasks across all workflows"""
        pending = []
        for task in self.global_context["qc_queue"]:
            if task.get("state") == "pending":
                pending.append(task)
        return pending

    async def submit_qc_results(self, task_id: str, results: Dict[str, Any]) -> bool:
        """Submit QC results for a task"""
        # Find the task
        task = None
        for t in self.global_context["qc_queue"]:
            if t["id"] == task_id:
                task = t
                break

        if not task:
            return False

        # Update task state
        task["state"] = "completed"
        task["completed_at"] = datetime.now().isoformat()
        task["reviewer_decision"] = results

        # Update asset states in global context based on QC decisions
        if "assets" in self.global_context and "images" in task:
            for image in task["images"]:
                image_id = image.get("id")
                decision = results.get(image_id, {}).get("decision")

                # Find and update the asset in global context
                for asset in self.global_context["assets"]:
                    if asset.get("id") == image_id:
                        if decision == "pass":
                            asset["state"] = "approved"
                            asset["updated_at"] = datetime.now().isoformat()
                            logger.info(f"Asset {image_id} approved in global context")
                        elif decision == "fail":
                            asset["state"] = "rejected"
                            asset["updated_at"] = datetime.now().isoformat()
                            logger.info(f"Asset {image_id} rejected in global context")
                        break

        # Find associated execution
        execution_id = task["workflow_execution_id"]

        # Resume the workflow with QC results - await instead of create_task
        try:
            await self.resume_execution(execution_id, {"qc_results": results})
            logger.info(f"Workflow {execution_id} resumed successfully after QC")
        except Exception as e:
            logger.error(f"Failed to resume workflow {execution_id}: {e}")
            return False

        return True
