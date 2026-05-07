"""Asset repository for persisting and retrieving assets

This module provides both a production AssetRepository (database-backed)
and an InMemoryAssetRepository (for testing/demos).
"""

from typing import List, Dict, Any, Optional
from datetime import datetime
from uuid import uuid4
from src.models.workflow import Asset, AssetState


class InMemoryAssetRepository:
    """In-memory asset repository for development and testing

    This is a simple dictionary-based implementation for demos.
    Use the production AssetRepository for real workloads.
    """

    def __init__(self):
        self.assets: Dict[str, Asset] = {}

    async def create(self, asset_data: Dict[str, Any]) -> Asset:
        """Create a new asset

        Args:
            asset_data: Asset properties dict

        Returns:
            Created Asset object
        """
        asset_id = asset_data.get("id") or f"asset_{uuid4().hex[:8]}"

        asset = Asset(
            id=asset_id,
            type=asset_data.get("type", "unknown"),
            url=asset_data.get("url", ""),
            prompt=asset_data.get("prompt"),
            state=AssetState(asset_data.get("state", "unchecked")),
            workflow_execution_id=asset_data.get("execution_id", ""),
            workflow_id=asset_data.get("workflow_id"),
            module_id=asset_data.get("module_id"),
            provider=asset_data.get("provider"),
            provider_metadata=asset_data.get("provider_metadata") or {},
            quality_metrics=asset_data.get("quality_metrics") or {},
            asset_metadata=asset_data.get("asset_metadata", {}),
            source_asset_ids=asset_data.get("source_asset_ids", []),
            text_content=asset_data.get("text_content"),
            payload=asset_data.get("payload"),
            tags=asset_data.get("tags", []),
            collection_id=asset_data.get("collection_id"),
            created_at=datetime.now(),
            updated_at=datetime.now()
        )

        self.assets[asset_id] = asset
        return asset

    async def get_by_ids(self, asset_ids: List[str]) -> List[Asset]:
        """Fetch multiple assets by ID

        Args:
            asset_ids: List of asset IDs to fetch

        Returns:
            List of Asset objects (may be shorter if some IDs not found)
        """
        return [self.assets[aid] for aid in asset_ids if aid in self.assets]

    async def get_by_id(self, asset_id: str) -> Optional[Asset]:
        """Fetch single asset by ID

        Args:
            asset_id: Asset ID to fetch

        Returns:
            Asset object or None if not found
        """
        return self.assets.get(asset_id)

    async def update_state(self, asset_id: str, state: AssetState) -> Optional[Asset]:
        """Update asset approval state

        Args:
            asset_id: Asset ID
            state: New state (unchecked, approved, rejected)

        Returns:
            Updated Asset object or None if not found
        """
        asset = self.assets.get(asset_id)
        if asset:
            asset.state = state
            asset.updated_at = datetime.now()
        return asset

    async def get_by_execution(self, execution_id: str) -> List[Asset]:
        """Get all assets created during an execution

        Args:
            execution_id: Workflow execution ID

        Returns:
            List of Asset objects
        """
        return [
            asset for asset in self.assets.values()
            if asset.workflow_execution_id == execution_id
        ]

    async def get_lineage(self, asset_id: str) -> List[Asset]:
        """Get full parent chain for an asset

        Args:
            asset_id: Asset ID to trace

        Returns:
            List of assets from child to oldest ancestor
        """
        lineage = []
        current = await self.get_by_id(asset_id)

        while current:
            lineage.append(current)
            # Get first parent (simplified for demo)
            if current.source_asset_ids:
                current = await self.get_by_id(current.source_asset_ids[0])
            else:
                break

        return lineage


class AssetRepository:
    """Production asset repository backed by PostgreSQL

    Uses SQLAlchemy async for database operations.
    See alembic migrations for schema definition.

    TODO: Implement production version with database connection
    """

    def __init__(self, db_session):
        self.db = db_session

    async def create(self, asset_data: Dict[str, Any]) -> Asset:
        # TODO: INSERT INTO assets ...
        raise NotImplementedError("Production repository not yet implemented")

    async def get_by_ids(self, asset_ids: List[str]) -> List[Asset]:
        # TODO: SELECT * FROM assets WHERE id IN (...)
        raise NotImplementedError("Production repository not yet implemented")

    async def update_state(self, asset_id: str, state: AssetState) -> Optional[Asset]:
        # TODO: UPDATE assets SET state = ? WHERE id = ?
        raise NotImplementedError("Production repository not yet implemented")

    async def get_lineage(self, asset_id: str) -> List[Asset]:
        # TODO: Recursive CTE query on source_asset_ids
        raise NotImplementedError("Production repository not yet implemented")
