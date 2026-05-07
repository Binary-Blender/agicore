"""End module - Workflow completion"""
import logging
from typing import Dict, Any
from .base import BaseModule

logger = logging.getLogger(__name__)


class EndModule(BaseModule):
    """End module that marks workflow completion"""

    async def execute(self, inputs: Dict[str, Any], context: Dict[str, Any]) -> Dict[str, Any]:
        """
        End module collects all inputs and marks completion
        """
        logger.info(f"End module {self.module_id}: Workflow completed")

        # Collect all inputs
        results = {}
        for key, value in inputs.items():
            results[key] = value

        return {
            "results": results,
            "status": "completed"
        }
