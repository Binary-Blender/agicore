"""Start module - begins workflow execution"""
from typing import Dict, Any, List
from .base import BaseModule, ModuleDefinition
import logging

logger = logging.getLogger(__name__)


class StartModule(BaseModule):
    """Module that starts a workflow execution"""

    def get_definition(self) -> ModuleDefinition:
        return ModuleDefinition(
            type="start",
            name="Start",
            description="Begins workflow execution with specified iterations",
            category="trigger",
            inputs=[],
            outputs=["trigger"],
            config_schema={
                "type": "object",
                "properties": {
                    "iterations": {
                        "type": ["integer", "string"],
                        "description": "Number of iterations or 'continuous'",
                        "default": 1,
                        "minimum": 1
                    }
                },
                "required": ["iterations"]
            },
            icon="▶️"
        )

    async def execute(self, inputs: Dict[str, Any], execution_context: Dict[str, Any]) -> Dict[str, Any]:
        """Execute the start module"""
        iterations = self.config.get("iterations", 1)
        current_iteration = execution_context.get("current_iteration", 0)

        logger.info(f"Start module executing - iteration {current_iteration + 1}/{iterations}")

        # Handle continuous mode
        if iterations == "continuous":
            should_continue = True
        else:
            should_continue = current_iteration < iterations

        # Store iteration info in execution context
        execution_context["iterations"] = iterations
        execution_context["current_iteration"] = current_iteration

        return {
            "trigger": {
                "iteration": current_iteration + 1,
                "total_iterations": iterations,
                "should_continue": should_continue,
                "timestamp": execution_context.get("started_at")
            }
        }