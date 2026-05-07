"""Start module - Entry point for workflows"""
import logging
from typing import Dict, Any
from .base import BaseModule

logger = logging.getLogger(__name__)


class StartModule(BaseModule):
    """Start module that passes through initial parameters"""

    async def execute(self, inputs: Dict[str, Any], context: Dict[str, Any]) -> Dict[str, Any]:
        """
        Start module simply passes through the workflow parameters
        """
        logger.info(f"Start module {self.module_id}: Initializing workflow")

        # Get initial parameters from context
        parameters = context.get("parameters", {})

        # Return parameters as outputs
        return {
            "output": parameters
        }
