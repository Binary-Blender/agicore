"""End module - completes workflow execution"""
from typing import Dict, Any, List
from datetime import datetime
from .base import BaseModule, ModuleDefinition
import logging

logger = logging.getLogger(__name__)


class EndModule(BaseModule):
    """Module that completes workflow execution"""

    def get_definition(self) -> ModuleDefinition:
        return ModuleDefinition(
            type="end",
            name="End",
            description="Completes workflow execution",
            category="flow_control",
            inputs=["default"],
            outputs=[],
            config_schema={
                "type": "object",
                "properties": {
                    "message": {
                        "type": "string",
                        "description": "Optional completion message",
                        "default": "Workflow completed successfully"
                    }
                }
            },
            icon="⏹️"
        )

    async def execute(self, inputs: Dict[str, Any], execution_context: Dict[str, Any]) -> Dict[str, Any]:
        """Execute the end module"""
        message = self.config.get("message", "Workflow completed successfully")

        logger.info(f"End module executing: {message}")

        # Mark workflow as complete
        execution_context["workflow_complete"] = True
        execution_context["completion_message"] = message

        return {
            "completed": True,
            "message": message,
            "timestamp": datetime.now().isoformat()
        }