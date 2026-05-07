"""
Simplified workflow execution engine for MVP
"""
import asyncio
import logging
from typing import Dict, List, Any, Optional
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession

from src.database.repositories import ExecutionRepository, WorkflowRepository

logger = logging.getLogger(__name__)


class WorkflowEngine:
    """Executes workflows by orchestrating modules"""

    def __init__(self):
        self.db_session: Optional[AsyncSession] = None
        self.module_registry = {}  # Will hold registered modules

    def set_db_session(self, session: AsyncSession):
        """Set the database session for the engine"""
        self.db_session = session

    def register_module(self, module_type: str, module_class):
        """Register a module type"""
        self.module_registry[module_type] = module_class
        logger.info(f"Registered module: {module_type}")

    async def execute_workflow_async(
        self,
        workflow_id: str,
        execution_id: str,
        parameters: Dict[str, Any],
        tenant_id: Optional[str] = None
    ) -> None:
        """Execute a workflow asynchronously"""
        if not self.db_session:
            raise ValueError("Database session not set")

        execution_repo = ExecutionRepository(self.db_session)
        workflow_repo = WorkflowRepository(self.db_session)

        # Get workflow
        workflow = await workflow_repo.get_by_id(workflow_id, tenant_id)
        if not workflow:
            raise ValueError(f"Workflow {workflow_id} not found")

        # Get execution
        execution = await execution_repo.get_by_id(execution_id, tenant_id)
        if not execution:
            raise ValueError(f"Execution {execution_id} not found")

        try:
            # Update state to running
            await execution_repo.update_state(execution_id, "running", tenant_id)

            # Build execution order
            execution_order = self._build_execution_order(workflow)
            logger.info(f"Execution order for workflow {workflow_id}: {execution_order}")

            # Initialize context
            context = {
                "workflow_id": workflow_id,
                "execution_id": execution_id,
                "tenant_id": tenant_id,
                "parameters": parameters,
            }

            # Execute modules level by level
            module_outputs = {}

            for level_index, level_modules in enumerate(execution_order):
                logger.info(f"Executing level {level_index} with {len(level_modules)} module(s): {level_modules}")

                # Execute all modules in this level IN PARALLEL using asyncio.gather
                if len(level_modules) == 1:
                    # Single module - execute directly
                    module_id = level_modules[0]
                    module_config = next(
                        (m for m in workflow.modules if m.id == module_id),
                        None
                    )
                    if not module_config:
                        logger.error(f"Module {module_id} not found in workflow")
                        continue

                    inputs = self._get_module_inputs(module_id, workflow, module_outputs)
                    module_type = module_config.type
                    if module_type not in self.module_registry:
                        logger.warning(f"Module type {module_type} not registered, skipping")
                        continue

                    module_class = self.module_registry[module_type]
                    module = module_class(module_id, module_config.config)

                    logger.info(f"Executing module {module_id} ({module_type})")
                    outputs = await module.execute(inputs, context)
                    module_outputs[module_id] = outputs
                    logger.info(f"Module {module_id} outputs: {list(outputs.keys())}")

                else:
                    # Multiple modules - execute in parallel
                    logger.info(f"Executing {len(level_modules)} modules in PARALLEL")

                    # Prepare all modules for parallel execution
                    tasks = []
                    task_module_ids = []

                    for module_id in level_modules:
                        module_config = next(
                            (m for m in workflow.modules if m.id == module_id),
                            None
                        )
                        if not module_config:
                            logger.error(f"Module {module_id} not found in workflow")
                            continue

                        module_type = module_config.type
                        if module_type not in self.module_registry:
                            logger.warning(f"Module type {module_type} not registered, skipping")
                            continue

                        inputs = self._get_module_inputs(module_id, workflow, module_outputs)
                        module_class = self.module_registry[module_type]
                        module = module_class(module_id, module_config.config)

                        # Create task for parallel execution
                        task = self._execute_module_with_retry(module, inputs, context, module_id, module_type)
                        tasks.append(task)
                        task_module_ids.append(module_id)

                    # Execute all tasks in parallel
                    if tasks:
                        results = await asyncio.gather(*tasks, return_exceptions=True)

                        # Process results
                        for module_id, result in zip(task_module_ids, results):
                            if isinstance(result, Exception):
                                logger.error(f"Module {module_id} failed: {str(result)}")
                                module_outputs[module_id] = {
                                    "status": "failed",
                                    "error": str(result)
                                }
                            else:
                                module_outputs[module_id] = result
                                logger.info(f"Module {module_id} outputs: {list(result.keys())}")

                # Update execution data after each level
                execution.execution_data["module_outputs"] = module_outputs
                await execution_repo.update_execution_data(
                    execution_id,
                    execution.execution_data,
                    tenant_id
                )

            # Workflow completed
            await execution_repo.update_state(execution_id, "completed", tenant_id)
            logger.info(f"Workflow execution {execution_id} completed successfully")

        except Exception as e:
            logger.error(f"Workflow execution failed: {str(e)}")
            await execution_repo.update_state(execution_id, "failed", tenant_id)
            raise

    def _build_execution_order(self, workflow) -> List[List[str]]:
        """
        Build execution levels for parallel execution
        Returns a list of lists, where each inner list contains modules
        that can be executed in parallel.
        """
        modules = {m.id: m for m in workflow.modules}
        connections = workflow.connections

        # Build adjacency lists
        children = {module_id: [] for module_id in modules}
        parents = {module_id: [] for module_id in modules}

        for conn in connections:
            from_id = conn.from_module_id
            to_id = conn.to_module_id
            children[from_id].append(to_id)
            parents[to_id].append(from_id)

        # Find start modules (no parents)
        start_modules = [
            m.id for m in workflow.modules
            if m.type == "start" or len(parents[m.id]) == 0
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

    def _get_module_inputs(
        self,
        module_id: str,
        workflow,
        module_outputs: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Get inputs for a module from previous module outputs"""
        inputs = {}

        # Find all connections to this module
        incoming_connections = [
            conn for conn in workflow.connections
            if conn.to_module_id == module_id
        ]

        logger.info(f"Module {module_id} has {len(incoming_connections)} incoming connection(s)")

        for conn in incoming_connections:
            from_module = conn.from_module_id
            from_output = conn.from_output
            to_input = conn.to_input

            if from_module in module_outputs:
                outputs = module_outputs[from_module]
                if from_output in outputs:
                    inputs[to_input] = outputs[from_output]

        logger.info(f"Module {module_id} inputs prepared: {list(inputs.keys())}")
        return inputs

    async def _execute_module_with_retry(
        self,
        module,
        inputs: Dict[str, Any],
        context: Dict[str, Any],
        module_id: str,
        module_type: str,
        max_retries: int = 3
    ) -> Dict[str, Any]:
        """
        Execute a module with retry logic for transient failures

        Args:
            module: Module instance to execute
            inputs: Module inputs
            context: Execution context
            module_id: Module ID for logging
            module_type: Module type for logging
            max_retries: Maximum number of retry attempts

        Returns:
            Module outputs
        """
        last_exception = None

        for attempt in range(max_retries):
            try:
                logger.info(f"Executing module {module_id} ({module_type}) - attempt {attempt + 1}/{max_retries}")
                outputs = await module.execute(inputs, context)
                return outputs

            except Exception as e:
                last_exception = e
                logger.warning(f"Module {module_id} attempt {attempt + 1} failed: {str(e)}")

                if attempt < max_retries - 1:
                    # Exponential backoff
                    wait_time = 2 ** attempt  # 1s, 2s, 4s
                    logger.info(f"Retrying module {module_id} in {wait_time}s...")
                    await asyncio.sleep(wait_time)
                else:
                    logger.error(f"Module {module_id} failed after {max_retries} attempts")

        # All retries failed
        raise last_exception


# Global workflow engine instance
workflow_engine = WorkflowEngine()
