"""Base module interface for the workflow platform"""
from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Dict, List, Any, Optional, TYPE_CHECKING, Union
from datetime import datetime
import logging
import copy
import uuid

if TYPE_CHECKING:
    from src.database.repositories import AssetRepository

logger = logging.getLogger(__name__)


@dataclass
class ModuleDefinition:
    """Defines a module type and its capabilities"""
    type: str
    name: str
    description: str
    category: str  # "trigger", "action", "transform", "output"
    inputs: List[str]  # Required input types
    outputs: List[str]  # Output types produced
    config_schema: Dict[str, Any]  # JSON schema for configuration
    icon: str = "📦"  # Emoji icon for UI


class BaseModule(ABC):
    """Abstract base class for all workflow modules"""

    def __init__(self, module_id: str, config: Dict[str, Any]):
        self.module_id = module_id
        self.config = config
        self._asset_repo: Optional['AssetRepository'] = None
        self._latest_input_asset_ids: Dict[str, List[str]] = {}
        self._validate_config()

    def _set_asset_repo(self, asset_repo: 'AssetRepository'):
        """Set the asset repository for this module (called by workflow engine)"""
        self._asset_repo = asset_repo

    # ------------------------------------------------------------------
    # Logging helpers
    # ------------------------------------------------------------------
    def _log_execution_event(
        self,
        execution_context: Optional[Dict[str, Any]],
        level: Union[int, str],
        message: str,
        details: Optional[Any] = None
    ) -> None:
        """
        Record a structured execution log entry and emit through the standard logger.

        Args:
            execution_context: Workflow execution context dict.
            level: Logging level (int or string).
            message: Human readable message.
            details: Optional structured payload (dict/list/str/primitive).
        """
        # Normalise logging level
        if isinstance(level, str):
            level_name = level.upper()
            level_no = getattr(logging, level_name, logging.INFO)
        else:
            level_no = level
            level_name = logging.getLevelName(level_no)

        # Prepare entry
        entry = {
            "timestamp": datetime.utcnow().isoformat(),
            "level": level_name,
            "message": message,
            "module_id": self.module_id,
            "module_type": self.__class__.__name__
        }

        if details is not None:
            entry["details"] = self._sanitize_details(copy.deepcopy(details))

        # Persist in execution context
        if execution_context is not None:
            execution_context.setdefault("execution_logs", []).append(entry)

        # Emit to standard logger (single line with optional details)
        logger_obj = logging.getLogger(f"{self.__class__.__module__}.{self.__class__.__name__}")
        if "details" in entry:
            logger_obj.log(level_no, f"{message} | details={entry['details']}")
        else:
            logger_obj.log(level_no, message)

    def _log_info(self, execution_context: Optional[Dict[str, Any]], message: str, details: Optional[Any] = None) -> None:
        self._log_execution_event(execution_context, logging.INFO, message, details)

    def _log_warning(self, execution_context: Optional[Dict[str, Any]], message: str, details: Optional[Any] = None) -> None:
        self._log_execution_event(execution_context, logging.WARNING, message, details)

    def _log_error(self, execution_context: Optional[Dict[str, Any]], message: str, details: Optional[Any] = None) -> None:
        self._log_execution_event(execution_context, logging.ERROR, message, details)

    def _sanitize_details(self, value: Any) -> Any:
        """Recursively sanitise detail payloads to avoid leaking sensitive data."""
        sensitive_tokens = ("key", "secret", "token", "password", "credential")

        if isinstance(value, dict):
            sanitized = {}
            for key, val in value.items():
                if any(token in key.lower() for token in sensitive_tokens):
                    sanitized[key] = "***"
                else:
                    sanitized[key] = self._sanitize_details(val)
            return sanitized
        if isinstance(value, list):
            return [self._sanitize_details(item) for item in value]
        if isinstance(value, tuple):
            return tuple(self._sanitize_details(item) for item in value)
        if isinstance(value, str):
            # Truncate excessively long strings
            return value if len(value) <= 500 else value[:497] + "..."
        return value

    @abstractmethod
    def get_definition(self) -> ModuleDefinition:
        """Return the module definition"""
        pass

    @abstractmethod
    async def execute(self, inputs: Dict[str, Any], execution_context: Dict[str, Any]) -> Dict[str, Any]:
        """
        Execute the module logic (LEGACY - will be deprecated)

        Args:
            inputs: Dictionary of input values keyed by input name
            execution_context: Context about the workflow execution

        Returns:
            Dictionary of output values keyed by output name
        """
        pass

    async def execute_with_asset_ids(
        self,
        input_asset_ids: Dict[str, List[str]],
        execution_context: Dict[str, Any]
    ) -> Dict[str, List[str]]:
        """
        Execute the module logic with asset IDs (NEW ASSET-CENTRIC APPROACH)

        Args:
            input_asset_ids: Dictionary of asset ID lists keyed by input name
            execution_context: Context about the workflow execution
                - Must include 'asset_repo' for asset operations
                - Must include 'workflow_id', 'execution_id' for lineage

        Returns:
            Dictionary of asset ID lists keyed by output name

        Module Implementation Pattern:
            1. Fetch assets from repo if needed: await self.fetch_assets(asset_ids)
            2. Process them
            3. Create new assets: await self.create_asset(url, metadata)
            4. Return new asset IDs
        """
        # Default implementation: Call legacy execute() and convert
        # Subclasses can override this for full asset-centric implementation

        import time
        module_start = time.time()

        self._log_info(
            execution_context,
            f"[ASSET-CENTRIC] Module {self.module_id}: Starting asset-centric execution",
            {"input_asset_counts": {name: len(ids) for name, ids in input_asset_ids.items()}}
        )

        logger.info(f"[ASSET-CENTRIC] Module {self.module_id}: Starting asset-centric execution")
        logger.info(f"[ASSET-CENTRIC] Input asset IDs: {input_asset_ids}")

        # Fetch assets and convert to legacy format
        legacy_inputs = {}
        for input_name, asset_ids in input_asset_ids.items():
            if asset_ids:
                logger.info(f"[ASSET-CENTRIC] Fetching {len(asset_ids)} assets for input '{input_name}'")
                assets = await self.fetch_assets(asset_ids)
                logger.info(f"[ASSET-CENTRIC] Fetched {len(assets)} assets successfully")
                legacy_inputs[input_name] = [
                    {
                        "id": asset.id,
                        "type": asset.type,
                        "url": asset.url,
                        "prompt": asset.prompt,
                        "metadata": (asset.asset_metadata or {}),
                        "module_id": asset.module_id or (asset.asset_metadata or {}).get("module_id"),
                        "module_label": (asset.asset_metadata or {}).get("module_label"),
                        "state": asset.state,
                        "provider": asset.provider,
                        "provider_metadata": asset.provider_metadata,
                        "quality_metrics": asset.quality_metrics,
                        "created_at": asset.created_at.isoformat() if asset.created_at else None
                    }
                    for asset in assets
                ]

        # Execute legacy module
        logger.info(f"[ASSET-CENTRIC] Executing legacy module logic")
        previous_input_snapshot = self._latest_input_asset_ids
        self._latest_input_asset_ids = input_asset_ids
        legacy_outputs = await self.execute(legacy_inputs, execution_context)
        self._latest_input_asset_ids = previous_input_snapshot
        logger.info(f"[ASSET-CENTRIC] Legacy module returned {len(legacy_outputs)} outputs: {list(legacy_outputs.keys())}")

        # Convert legacy outputs to asset IDs
        # Track URLs we've already created assets for to avoid duplicates
        url_to_asset_id = {}
        output_asset_ids = {}
        for output_name, output_data in legacy_outputs.items():
            asset_ids = []

            # Handle different output formats
            if isinstance(output_data, list):
                logger.info(f"[ASSET-CENTRIC] Output '{output_name}' contains {len(output_data)} items")
                for i, item in enumerate(output_data):
                    if isinstance(item, dict) and "url" in item:
                        url = item["url"]
                        # Check if we already created an asset for this URL
                        if url in url_to_asset_id:
                            logger.info(f"[ASSET-CENTRIC] Reusing existing asset for duplicate URL: {url[:100]}...")
                            asset_ids.append(url_to_asset_id[url])
                        else:
                            logger.info(f"[ASSET-CENTRIC] Creating asset {i+1}/{len(output_data)} from URL: {url[:100]}...")
                            # Create asset from legacy output
                            asset = await self.create_asset(
                                url=url,
                                asset_type=item.get("type", "image"),
                                metadata={
                                    "prompt": item.get("prompt"),
                                    "provider": item.get("provider"),
                                    "provider_metadata": item.get("provider_metadata"),
                                    "quality_metrics": item.get("quality_metrics"),
                                    "state": item.get("state"),
                                    "source_asset_ids": [aid for aids in input_asset_ids.values() for aid in aids]
                                },
                                execution_context=execution_context
                            )
                            logger.info(f"[ASSET-CENTRIC] Created asset {asset.id}")
                            url_to_asset_id[url] = asset.id
                            asset_ids.append(asset.id)
                    elif isinstance(item, str):
                        # Assume it's already an asset ID
                        logger.info(f"[ASSET-CENTRIC] Item {i+1} is already an asset ID: {item}")
                        asset_ids.append(item)
            elif isinstance(output_data, dict):
                # Some modules return single objects instead of lists
                if "url" in output_data:
                    url = output_data["url"]
                    # Check if we already created an asset for this URL
                    if url in url_to_asset_id:
                        logger.info(f"[ASSET-CENTRIC] Reusing existing asset for duplicate URL: {url[:100]}...")
                        asset_ids.append(url_to_asset_id[url])
                    else:
                        logger.info(f"[ASSET-CENTRIC] Creating asset from single dict output: {url[:100]}...")
                        asset = await self.create_asset(
                            url=url,
                            asset_type=output_data.get("type", "image"),
                            metadata={
                                "prompt": output_data.get("prompt"),
                                "provider": output_data.get("provider"),
                                "provider_metadata": output_data.get("provider_metadata"),
                                "quality_metrics": output_data.get("quality_metrics"),
                                "state": output_data.get("state"),
                                "source_asset_ids": [aid for aids in input_asset_ids.values() for aid in aids]
                            },
                            execution_context=execution_context
                        )
                        logger.info(f"[ASSET-CENTRIC] Created asset {asset.id}")
                        url_to_asset_id[url] = asset.id
                        asset_ids.append(asset.id)

            output_asset_ids[output_name] = asset_ids

        module_elapsed = time.time() - module_start
        logger.info(f"[ASSET-CENTRIC] Module {self.module_id}: Completed in {module_elapsed:.3f}s")
        self._log_info(
            execution_context,
            f"[ASSET-CENTRIC] Module {self.module_id}: Completed asset-centric execution",
            {
                "duration_seconds": round(module_elapsed, 3),
                "output_asset_counts": {name: len(ids) for name, ids in output_asset_ids.items()}
            }
        )
        return output_asset_ids

    # Helper methods for asset operations

    async def fetch_assets(self, asset_ids: List[str]) -> List[Any]:
        """Fetch assets from repository by IDs"""
        if not self._asset_repo:
            raise RuntimeError("Asset repository not set. Workflow engine must call _set_asset_repo()")

        import time
        start_time = time.time()
        logger.info(f"[ASSET-FETCH] Fetching {len(asset_ids)} assets: {asset_ids}")

        assets = await self._asset_repo.get_by_ids(asset_ids)

        elapsed = time.time() - start_time
        logger.info(f"[ASSET-FETCH] Successfully fetched {len(assets)} assets in {elapsed:.3f}s")
        return assets

    async def fetch_asset(self, asset_id: str) -> Optional[Any]:
        """Fetch a single asset from repository by ID"""
        assets = await self.fetch_assets([asset_id])
        return assets[0] if assets else None

    def _flatten_input_asset_ids(self) -> List[str]:
        flattened: List[str] = []
        for ids in self._latest_input_asset_ids.values():
            flattened.extend(ids)
        return flattened

    def _generate_inline_url(self, asset_type: str) -> str:
        return f"inline://{asset_type}/{uuid.uuid4().hex}"

    async def create_asset(
        self,
        *,
        asset_type: str = "image",
        url: Optional[str] = None,
        text_content: Optional[str] = None,
        payload: Optional[Dict[str, Any]] = None,
        metadata: Optional[Dict[str, Any]] = None,
        execution_context: Optional[Dict[str, Any]] = None
    ) -> Any:
        """
        Create a new asset in the repository

        Args:
            asset_type: Type of asset (image, video, text, audio, json, etc.)
            url: Asset URL (will be auto-generated for inline assets)
            text_content: Optional inline text payload
            payload: Optional structured payload for arbitrary data
            metadata: Additional metadata (prompt, provider info, quality metrics, etc.)
            execution_context: If provided, extracts workflow_id and execution_id for lineage

        Returns:
            Created Asset object
        """
        if not self._asset_repo:
            raise RuntimeError("Asset repository not set. Workflow engine must call _set_asset_repo()")

        metadata = (metadata or {}).copy()

        workflow_id = metadata.pop("workflow_id", None)
        execution_id = metadata.pop("execution_id", None)
        module_label = metadata.pop("module_label", None)
        prompt = metadata.pop("prompt", None)
        state = metadata.pop("state", "unchecked")
        provider = metadata.pop("provider", None)
        provider_metadata = metadata.pop("provider_metadata", None)
        quality_metrics = metadata.pop("quality_metrics", None)
        source_asset_ids = metadata.pop("source_asset_ids", None)
        tags = metadata.pop("tags", [])
        collection_id = metadata.pop("collection_id", None)
        asset_metadata = metadata.pop("asset_metadata", {})
        extra_metadata = metadata  # Any remaining keys

        if execution_context:
            workflow_id = workflow_id or execution_context.get("workflow_id")
            execution_id = execution_id or execution_context.get("execution_id")
            module_labels = execution_context.get("module_labels", {})
            module_label = module_label or module_labels.get(self.module_id)
            if source_asset_ids is None:
                source_asset_ids = self._flatten_input_asset_ids()

        if source_asset_ids is None:
            source_asset_ids = self._flatten_input_asset_ids()

        if not url:
            url = self._generate_inline_url(asset_type)

        asset_payload = {
            "url": url,
            "type": asset_type,
            "prompt": prompt,
            "state": state,
            "provider": provider,
            "provider_metadata": provider_metadata,
            "quality_metrics": quality_metrics,
            "workflow_id": workflow_id,
            "execution_id": execution_id,
            "module_id": self.module_id,
            "source_asset_ids": source_asset_ids or [],
            "tags": tags or [],
            "collection_id": collection_id,
            "text_content": text_content,
            "payload": payload,
            "metadata": {
                **asset_metadata,
                **extra_metadata,
                **({"module_label": module_label} if module_label else {})
            }
        }

        asset = await self._asset_repo.create(asset_payload)

        if execution_context is not None:
            execution_context.setdefault("generated_assets", []).append({
                "id": asset.id,
                "type": asset.type,
                "url": asset.url,
                "provider": asset.provider,
                "state": asset.state,
                "module_label": module_label
            })

        return asset

    def _validate_config(self):
        """Validate the module configuration against schema"""
        # TODO: Implement JSON schema validation
        pass

    async def on_pause(self, execution_context: Dict[str, Any]) -> None:
        """Called when execution is paused (e.g., for QC)"""
        pass

    async def on_resume(self, execution_context: Dict[str, Any], resume_data: Dict[str, Any]) -> None:
        """Called when execution resumes after pause"""
        pass


class ModuleRegistry:
    """Registry for available module types"""

    def __init__(self):
        self._modules: Dict[str, type] = {}

    def register(self, module_class: type):
        """Register a module class"""
        instance = module_class("temp", {})
        definition = instance.get_definition()
        self._modules[definition.type] = module_class
        logger.info(f"Registered module: {definition.type}")

    def get(self, module_type: str) -> Optional[type]:
        """Get a module class by type"""
        return self._modules.get(module_type)

    def list_modules(self) -> List[ModuleDefinition]:
        """List all available module definitions"""
        definitions = []
        for module_class in self._modules.values():
            instance = module_class("temp", {})
            definitions.append(instance.get_definition())
        return definitions

    def create_module(self, module_id: str, module_type: str, config: Dict[str, Any]) -> BaseModule:
        """Create a module instance"""
        module_class = self.get(module_type)
        if not module_class:
            raise ValueError(f"Unknown module type: {module_type}")
        return module_class(module_id, config)


# Global module registry
module_registry = ModuleRegistry()
