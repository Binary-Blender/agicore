"""Base module interface for the workflow platform"""
from abc import ABC, abstractmethod
from typing import Dict, Any, Optional
import logging
import httpx
import os

logger = logging.getLogger(__name__)


class BaseModule(ABC):
    """Abstract base class for all workflow modules"""

    def __init__(self, module_id: str, config: Dict[str, Any]):
        self.module_id = module_id
        self.config = config
        self.assets_service_url = os.getenv("ASSETS_SERVICE_URL", "http://localhost:8001")

    @abstractmethod
    async def execute(self, inputs: Dict[str, Any], context: Dict[str, Any]) -> Dict[str, Any]:
        """
        Execute the module logic

        Args:
            inputs: Dictionary of input values keyed by input name
            context: Context about the workflow execution
                - workflow_id: Workflow identifier
                - execution_id: Execution identifier
                - tenant_id: Tenant identifier
                - parameters: Initial workflow parameters

        Returns:
            Dictionary of output values keyed by output name
        """
        pass

    async def fetch_assets(self, asset_ids: list, tenant_id: str, api_key: str) -> list:
        """Fetch assets from Assets Service"""
        assets = []
        async with httpx.AsyncClient() as client:
            for asset_id in asset_ids:
                try:
                    response = await client.get(
                        f"{self.assets_service_url}/assets/{asset_id}",
                        headers={"Authorization": f"Bearer {api_key}"}
                    )
                    if response.status_code == 200:
                        assets.append(response.json())
                    else:
                        logger.warning(f"Failed to fetch asset {asset_id}: {response.status_code}")
                except Exception as e:
                    logger.error(f"Error fetching asset {asset_id}: {e}")

        return assets

    async def create_asset(
        self,
        asset_data: Dict[str, Any],
        tenant_id: str,
        api_key: str
    ) -> Optional[Dict[str, Any]]:
        """Create an asset in Assets Service"""
        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(
                    f"{self.assets_service_url}/assets",
                    json=asset_data,
                    headers={"Authorization": f"Bearer {api_key}"}
                )
                if response.status_code == 201:
                    return response.json()
                else:
                    logger.warning(f"Failed to create asset: {response.status_code}")
                    return None
            except Exception as e:
                logger.error(f"Error creating asset: {e}")
                return None


class ModuleRegistry:
    """Registry for available module types"""

    def __init__(self):
        self._modules: Dict[str, type] = {}

    def register(self, module_type: str, module_class: type):
        """Register a module class"""
        self._modules[module_type] = module_class
        logger.info(f"Registered module: {module_type}")

    def get(self, module_type: str) -> Optional[type]:
        """Get a module class by type"""
        return self._modules.get(module_type)

    def create_module(self, module_id: str, module_type: str, config: Dict[str, Any]) -> BaseModule:
        """Create a module instance"""
        module_class = self.get(module_type)
        if not module_class:
            raise ValueError(f"Unknown module type: {module_type}")
        return module_class(module_id, config)


# Global module registry
module_registry = ModuleRegistry()
