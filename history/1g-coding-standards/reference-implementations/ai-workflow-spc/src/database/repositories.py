"""
Repository classes for database operations
"""
from typing import List, Optional, Dict, Any, Iterable
from sqlalchemy import select, update, delete, func
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession
import logging
import uuid

from src.database.models import (
    Workflow,
    WorkflowModule,
    WorkflowConnection,
    WorkflowExecution,
    Asset,
    QCTask,
    QCDecision,
    AssetCollection,
    InstalledMCPServer,
)
from src.utils.asset_cache import asset_cache, snapshot_from_record, AssetSnapshot

logger = logging.getLogger(__name__)
_UNSET = object()


class WorkflowRepository:
    """Repository for workflow operations"""

    def __init__(self, session: AsyncSession):
        self.session = session

    async def create(self, workflow_data: Dict[str, Any]) -> Workflow:
        """Create a new workflow"""
        workflow = Workflow(
            name=workflow_data["name"],
            description=workflow_data.get("description", ""),
            state=workflow_data.get("state", "draft")
        )

        # Add modules
        for module_data in workflow_data.get("modules", []):
            module = WorkflowModule(
                id=module_data["id"],
                workflow_id=workflow.id,
                type=module_data["type"],
                name=module_data.get("name", module_data["type"]),  # Use type as fallback
                config=module_data.get("config", {}),
                text_bindings=module_data.get("text_bindings", {}),
                ui_overrides=module_data.get("ui_overrides", {}),
                input_config=module_data.get("input_config", {}),
                position=module_data.get("position", {"x": 0, "y": 0})
            )
            workflow.modules.append(module)

        # Add connections
        for conn_data in workflow_data.get("connections", []):
            connection = WorkflowConnection(
                workflow_id=workflow.id,
                from_module_id=conn_data["from_module_id"],
                from_output=conn_data["from_output"],
                to_module_id=conn_data["to_module_id"],
                to_input=conn_data["to_input"],
                condition=conn_data.get("condition")
            )
            workflow.connections.append(connection)

        self.session.add(workflow)
        await self.session.commit()
        await self.session.refresh(workflow)
        return workflow

    async def get_by_id(self, workflow_id: str) -> Optional[Workflow]:
        """Get a workflow by ID with all related data"""
        stmt = (
            select(Workflow)
            .where(Workflow.id == workflow_id)
            .options(
                selectinload(Workflow.modules),
                selectinload(Workflow.connections)
            )
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_all(self) -> List[Workflow]:
        """Get all workflows"""
        stmt = select(Workflow).options(
            selectinload(Workflow.modules),
            selectinload(Workflow.connections)
        )
        result = await self.session.execute(stmt)
        return result.scalars().all()

    async def update(self, workflow_id: str, workflow_data: Dict[str, Any]) -> Optional[Workflow]:
        """Update an existing workflow"""
        workflow = await self.get_by_id(workflow_id)
        if not workflow:
            return None

        # Update basic fields
        workflow.name = workflow_data["name"]
        workflow.description = workflow_data.get("description", "")

        # Clear existing modules and connections
        await self.session.execute(
            delete(WorkflowModule).where(WorkflowModule.workflow_id == workflow_id)
        )
        await self.session.execute(
            delete(WorkflowConnection).where(WorkflowConnection.workflow_id == workflow_id)
        )

        # Add new modules
        for module_data in workflow_data.get("modules", []):
            module = WorkflowModule(
                id=module_data["id"],
                workflow_id=workflow.id,
                type=module_data["type"],
                name=module_data["name"],
                config=module_data.get("config", {}),
                text_bindings=module_data.get("text_bindings", {}),
                ui_overrides=module_data.get("ui_overrides", {}),
                input_config=module_data.get("input_config", {}),
                position=module_data.get("position", {"x": 0, "y": 0})
            )
            self.session.add(module)

        # Add new connections
        for conn_data in workflow_data.get("connections", []):
            connection = WorkflowConnection(
                workflow_id=workflow.id,
                from_module_id=conn_data["from_module_id"],
                from_output=conn_data["from_output"],
                to_module_id=conn_data["to_module_id"],
                to_input=conn_data["to_input"],
                condition=conn_data.get("condition")
            )
            self.session.add(connection)

        await self.session.commit()
        await self.session.refresh(workflow)
        return workflow

    async def delete(self, workflow_id: str) -> bool:
        """Delete a workflow"""
        workflow = await self.get_by_id(workflow_id)
        if not workflow:
            return False

        await self.session.delete(workflow)
        await self.session.commit()
        return True


class ExecutionRepository:
    """Repository for workflow execution operations"""

    def __init__(self, session: AsyncSession):
        self.session = session

    async def create(self, workflow_id: str, execution_data: Dict[str, Any] = None) -> WorkflowExecution:
        """Create a new workflow execution"""
        execution = WorkflowExecution(
            workflow_id=workflow_id,
            state="running",
            execution_data=execution_data or {}
        )
        self.session.add(execution)
        await self.session.commit()
        await self.session.refresh(execution)
        return execution

    async def get_by_id(self, execution_id: str) -> Optional[WorkflowExecution]:
        """Get an execution by ID"""
        stmt = (
            select(WorkflowExecution)
            .where(WorkflowExecution.id == execution_id)
            .options(selectinload(WorkflowExecution.qc_tasks))
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_all(self) -> List[WorkflowExecution]:
        """Get all non-archived executions"""
        stmt = select(WorkflowExecution).where(WorkflowExecution.archived == False)
        result = await self.session.execute(stmt)
        return result.scalars().all()

    async def get_by_workflow(self, workflow_id: str) -> List[WorkflowExecution]:
        """Get all executions for a workflow"""
        stmt = select(WorkflowExecution).where(WorkflowExecution.workflow_id == workflow_id)
        result = await self.session.execute(stmt)
        return result.scalars().all()

    async def update_state(self, execution_id: str, state: str, current_module_id: str = None) -> Optional[WorkflowExecution]:
        """Update execution state"""
        execution = await self.get_by_id(execution_id)
        if not execution:
            return None

        execution.state = state
        if current_module_id is not None:
            execution.current_module_id = current_module_id

        if state == "completed" or state == "failed":
            from datetime import datetime
            execution.completed_at = datetime.now()

        await self.session.commit()
        await self.session.refresh(execution)
        return execution

    async def update_execution_data(self, execution_id: str, data: Dict[str, Any]) -> Optional[WorkflowExecution]:
        """Update execution data"""
        execution = await self.get_by_id(execution_id)
        if not execution:
            return None

        execution.execution_data = data
        await self.session.commit()
        await self.session.refresh(execution)
        return execution

    async def pause_for_qc(self, execution_id: str, paused_data: Dict[str, Any]) -> Optional[WorkflowExecution]:
        """Pause execution for QC"""
        execution = await self.get_by_id(execution_id)
        if not execution:
            return None

        execution.state = "paused_for_qc"
        execution.paused_data = paused_data
        await self.session.commit()
        await self.session.refresh(execution)
        return execution

    async def archive(self, execution_id: str) -> bool:
        """Archive an execution (soft delete)"""
        execution = await self.get_by_id(execution_id)
        if not execution:
            return False

        execution.archived = True
        await self.session.commit()
        return True


class AssetRepository:
    """Repository for asset operations"""

    def __init__(self, session: AsyncSession):
        self.session = session

    def _to_snapshots(self, records: Iterable[Asset]) -> List[AssetSnapshot]:
        """Convert ORM Asset rows into cached snapshots."""
        snapshots: List[AssetSnapshot] = []
        for record in records:
            snapshot = snapshot_from_record(record)
            asset_cache.set(snapshot)
            snapshots.append(snapshot)
        return snapshots

    def _filter_by_tags(
        self,
        snapshots: List[AssetSnapshot],
        tags: Optional[List[str]],
        mode: str = "any"
    ) -> List[AssetSnapshot]:
        """Apply tag filters (any/all) client-side."""
        if not tags:
            return snapshots

        normalized = [tag.strip().lower() for tag in tags if tag and tag.strip()]
        if not normalized:
            return snapshots

        filtered: List[AssetSnapshot] = []
        for snapshot in snapshots:
            available = {(tag or "").strip().lower() for tag in (snapshot.tags or []) if tag}
            if not available:
                continue
            if mode == "all":
                if all(tag in available for tag in normalized):
                    filtered.append(snapshot)
            else:
                if any(tag in available for tag in normalized):
                    filtered.append(snapshot)
        return filtered

    async def create(self, asset_data: Dict[str, Any]) -> Asset:
        """Create a new asset"""
        url = asset_data.get("url") or f"inline://asset/{uuid.uuid4().hex}"
        asset = Asset(
            type=asset_data.get("type", "image"),
            url=url,
            prompt=asset_data.get("prompt"),
            asset_metadata=asset_data.get("metadata", {}),
            state=asset_data.get("state", "unchecked"),
            text_content=asset_data.get("text_content"),
            payload=asset_data.get("payload"),
            # Lineage tracking
            workflow_id=asset_data.get("workflow_id"),
            execution_id=asset_data.get("execution_id"),
            module_id=asset_data.get("module_id"),
            source_asset_ids=asset_data.get("source_asset_ids", []),
            # Provider tracking
            provider=asset_data.get("provider"),
            provider_metadata=asset_data.get("provider_metadata"),
            quality_metrics=asset_data.get("quality_metrics"),
            # Organization
            tags=asset_data.get("tags", []),
            collection_id=asset_data.get("collection_id")
        )
        self.session.add(asset)
        await self.session.commit()
        await self.session.refresh(asset)
        asset_cache.set(snapshot_from_record(asset))
        return asset

    async def create_many(self, assets_data: List[Dict[str, Any]]) -> List[Asset]:
        """Create multiple assets"""
        assets = []
        for asset_data in assets_data:
            url = asset_data.get("url") or f"inline://asset/{uuid.uuid4().hex}"
            asset = Asset(
                type=asset_data.get("type", "image"),
                url=url,
                prompt=asset_data.get("prompt"),
                asset_metadata=asset_data.get("metadata", {}),
                state=asset_data.get("state", "unchecked"),
                text_content=asset_data.get("text_content"),
                payload=asset_data.get("payload"),
                # Lineage tracking
                workflow_id=asset_data.get("workflow_id"),
                execution_id=asset_data.get("execution_id"),
                module_id=asset_data.get("module_id"),
                source_asset_ids=asset_data.get("source_asset_ids", []),
                # Provider tracking
                provider=asset_data.get("provider"),
                provider_metadata=asset_data.get("provider_metadata"),
                quality_metrics=asset_data.get("quality_metrics"),
                # Organization
                tags=asset_data.get("tags", []),
                collection_id=asset_data.get("collection_id")
            )
            assets.append(asset)
            self.session.add(asset)

        await self.session.commit()
        for asset in assets:
            await self.session.refresh(asset)
            asset_cache.set(snapshot_from_record(asset))
        return assets

    async def get_by_id(self, asset_id: str) -> Optional[Asset]:
        """Get an asset by ID"""
        stmt = select(Asset).where(Asset.id == asset_id)
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_all(
        self,
        state: Optional[str] = None,
        collection_id: Optional[str] = None,
        unassigned_only: bool = False,
        asset_type: Optional[str] = None,
        limit: Optional[int] = None,
        *,
        states: Optional[List[str]] = None,
        tags: Optional[List[str]] = None,
        tag_mode: str = "any",
        sort_by: str = "created_at",
        sort_direction: str = "desc"
    ) -> List[AssetSnapshot]:
        """Get all non-archived assets, with optional filters"""
        stmt = select(Asset).where(Asset.archived == False)

        state_filters = list(states or [])
        if state:
            state_filters.append(state)
        if state_filters:
            stmt = stmt.where(Asset.state.in_(state_filters))
        if collection_id:
            stmt = stmt.where(Asset.collection_id == collection_id)
        elif unassigned_only:
            stmt = stmt.where(Asset.collection_id.is_(None))
        if asset_type:
            stmt = stmt.where(Asset.type == asset_type)

        sort_column_map = {
            "created_at": Asset.created_at,
            "updated_at": Asset.updated_at,
            "state": Asset.state,
            "provider": Asset.provider
        }
        sort_column = sort_column_map.get(sort_by, Asset.created_at)
        if sort_direction == "asc":
            stmt = stmt.order_by(sort_column.asc())
        else:
            stmt = stmt.order_by(sort_column.desc())

        if limit:
            stmt = stmt.limit(limit)
        result = await self.session.execute(stmt)
        snapshots = self._to_snapshots(result.scalars().all())
        return self._filter_by_tags(snapshots, tags, tag_mode)

    async def query_assets(
        self,
        *,
        asset_ids: Optional[List[str]] = None,
        state: Optional[str] = None,
        collection_id: Optional[str] = None,
        asset_type: Optional[str] = None,
        limit: Optional[int] = None,
        states: Optional[List[str]] = None,
        tags: Optional[List[str]] = None,
        tag_mode: str = "any",
        sort_by: str = "created_at",
        sort_direction: str = "desc"
    ) -> List[AssetSnapshot]:
        """
        Flexible asset query used by automation modules and the asset loader.
        """
        state_filters = list(states or [])
        if state:
            state_filters.append(state)

        if asset_ids:
            snapshots = await self.get_by_ids(asset_ids)
            if state_filters:
                allowed = {s.lower() for s in state_filters}
                snapshots = [snap for snap in snapshots if snap.state and snap.state.lower() in allowed]
            if collection_id:
                snapshots = [snap for snap in snapshots if snap.collection_id == collection_id]
            if asset_type:
                snapshots = [snap for snap in snapshots if snap.type == asset_type]
            if limit is not None:
                snapshots = snapshots[:limit]
            return self._filter_by_tags(snapshots, tags, tag_mode)

        stmt = select(Asset).where(Asset.archived == False)
        if state_filters:
            stmt = stmt.where(Asset.state.in_(state_filters))
        if collection_id:
            stmt = stmt.where(Asset.collection_id == collection_id)
        if asset_type:
            stmt = stmt.where(Asset.type == asset_type)

        sort_column_map = {
            "created_at": Asset.created_at,
            "updated_at": Asset.updated_at,
            "state": Asset.state,
            "provider": Asset.provider
        }
        sort_column = sort_column_map.get(sort_by, Asset.created_at)
        if sort_direction == "asc":
            stmt = stmt.order_by(sort_column.asc())
        else:
            stmt = stmt.order_by(sort_column.desc())

        if limit:
            stmt = stmt.limit(limit)

        result = await self.session.execute(stmt)
        snapshots = self._to_snapshots(result.scalars().all())
        return self._filter_by_tags(snapshots, tags, tag_mode)

    async def update_state(self, asset_id: str, state: str) -> Optional[Asset]:
        """Update asset state"""
        asset = await self.get_by_id(asset_id)
        if not asset:
            return None

        asset.state = state
        await self.session.commit()
        await self.session.refresh(asset)
        asset_cache.set(snapshot_from_record(asset))
        return asset

    async def archive(self, asset_id: str) -> bool:
        """Archive an asset (soft delete)"""
        asset = await self.get_by_id(asset_id)
        if not asset:
            return False

        asset.archived = True
        await self.session.commit()
        asset_cache.invalidate(asset_id)
        return True

    async def archive_many(self, asset_ids: List[str]) -> int:
        """Archive multiple assets (soft delete)"""
        count = 0
        for asset_id in asset_ids:
            asset = await self.get_by_id(asset_id)
            if asset:
                asset.archived = True
                count += 1

        await self.session.commit()
        asset_cache.invalidate_many(asset_ids)
        return count

    # Asset-Centric Architecture Methods

    async def get_by_ids(self, asset_ids: List[str]) -> List[AssetSnapshot]:
        """
        Get multiple assets by their IDs with caching.

        Returns lightweight AssetSnapshot objects so callers can access
        attributes without worrying about session scope.
        """
        if not asset_ids:
            return []

        cached: Dict[str, AssetSnapshot] = {}
        missing: List[str] = []

        for asset_id in asset_ids:
            snapshot = asset_cache.get(asset_id)
            if snapshot:
                cached[asset_id] = snapshot
            else:
                missing.append(asset_id)

        fetched: Dict[str, AssetSnapshot] = {}
        if missing:
            stmt = select(Asset).where(Asset.id.in_(missing))
            result = await self.session.execute(stmt)
            records = result.scalars().all()
            for record in records:
                snapshot = snapshot_from_record(record)
                asset_cache.set(snapshot)
                fetched[record.id] = snapshot

        ordered: List[AssetSnapshot] = []
        for asset_id in asset_ids:
            snapshot = cached.get(asset_id) or fetched.get(asset_id)
            if snapshot:
                ordered.append(snapshot)
        return ordered

    async def get_by_execution(self, execution_id: str) -> List[Asset]:
        """Get all assets created by a specific execution"""
        stmt = select(Asset).where(
            Asset.execution_id == execution_id,
            Asset.archived == False
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def get_by_module(self, module_id: str) -> List[Asset]:
        """Get all assets created by a specific module"""
        stmt = select(Asset).where(
            Asset.module_id == module_id,
            Asset.archived == False
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def create_from_url(self, url: Optional[str], metadata: Dict[str, Any]) -> Asset:
        """Create an asset from a URL with metadata (simplified creation)"""
        payload = {
            "url": url,
            "type": metadata.get("type", "image"),
            "prompt": metadata.get("prompt"),
            "metadata": metadata.get("asset_metadata", {}),
            "state": metadata.get("state", "unchecked"),
            "provider": metadata.get("provider"),
            "provider_metadata": metadata.get("provider_metadata"),
            "quality_metrics": metadata.get("quality_metrics"),
            "workflow_id": metadata.get("workflow_id"),
            "execution_id": metadata.get("execution_id"),
            "module_id": metadata.get("module_id"),
            "source_asset_ids": metadata.get("source_asset_ids", []),
            "tags": metadata.get("tags", []),
            "collection_id": metadata.get("collection_id"),
            "text_content": metadata.get("text_content"),
            "payload": metadata.get("payload")
        }
        return await self.create(payload)

    # ------------------------------------------------------------------
    # Collection / Folder helpers
    # ------------------------------------------------------------------

    async def list_collections(self) -> List[AssetCollection]:
        stmt = select(AssetCollection).order_by(AssetCollection.name)
        result = await self.session.execute(stmt)
        return result.scalars().all()

    async def get_collection(self, collection_id: str) -> Optional[AssetCollection]:
        stmt = select(AssetCollection).where(AssetCollection.id == collection_id)
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def create_collection(
        self,
        name: str,
        description: Optional[str] = None,
        parent_id: Optional[str] = None
    ) -> AssetCollection:
        if parent_id:
            parent = await self.get_collection(parent_id)
            if not parent:
                raise ValueError("Parent collection not found")

        collection = AssetCollection(
            name=name,
            description=description,
            parent_id=parent_id
        )
        self.session.add(collection)
        await self.session.commit()
        await self.session.refresh(collection)
        return collection

    async def update_collection(
        self,
        collection_id: str,
        name: Optional[str] = None,
        description: Optional[str] = None,
        parent_id: Optional[str] = _UNSET
    ) -> Optional[AssetCollection]:
        collection = await self.get_collection(collection_id)
        if not collection:
            return None

        if name:
            collection.name = name
        if description is not None:
            collection.description = description

        if parent_id is not _UNSET:
            if parent_id == collection_id:
                raise ValueError("Collection cannot be its own parent")

            if parent_id:
                parent = await self.get_collection(parent_id)
                if not parent:
                    raise ValueError("Parent collection not found")
                collection.parent_id = parent_id
            else:
                collection.parent_id = None

        await self.session.commit()
        await self.session.refresh(collection)
        return collection

    async def move_assets_to_collection(
        self,
        asset_ids: List[str],
        collection_id: Optional[str]
    ) -> int:
        if not asset_ids:
            return 0

        stmt = (
            update(Asset)
            .where(Asset.id.in_(asset_ids))
            .values(collection_id=collection_id)
        )
        result = await self.session.execute(stmt)
        await self.session.commit()
        asset_cache.invalidate_many(asset_ids)
        return result.rowcount or 0

    async def get_collection_asset_counts(self) -> Dict[Optional[str], int]:
        """Return a mapping of collection_id -> asset count (including None for unassigned)."""
        stmt = (
            select(Asset.collection_id, func.count(Asset.id))
            .where(Asset.archived == False)
            .group_by(Asset.collection_id)
        )
        result = await self.session.execute(stmt)
        counts = {}
        for collection_id, count in result.all():
            counts[collection_id] = count
        return counts


class QCTaskRepository:
    """Repository for QC task operations"""

    def __init__(self, session: AsyncSession):
        self.session = session

    async def create(self, qc_data: Dict[str, Any]) -> QCTask:
        """Create a new QC task"""
        qc_task = QCTask(
            execution_id=qc_data["execution_id"],
            module_id=qc_data["module_id"],
            task_type=qc_data.get("task_type", "pass_fail"),
            status="pending"
        )
        self.session.add(qc_task)
        await self.session.commit()
        await self.session.refresh(qc_task)
        return qc_task

    async def get_by_id(self, task_id: str) -> Optional[QCTask]:
        """Get a QC task by ID"""
        stmt = (
            select(QCTask)
            .where(QCTask.id == task_id)
            .options(selectinload(QCTask.decisions))
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_pending(self) -> List[QCTask]:
        """Get all pending QC tasks"""
        stmt = (
            select(QCTask)
            .where(QCTask.status == "pending")
            .options(selectinload(QCTask.execution))
        )
        result = await self.session.execute(stmt)
        return result.scalars().all()

    async def submit_decisions(self, task_id: str, decisions: List[Dict[str, Any]]) -> bool:
        """Submit QC decisions"""
        qc_task = await self.get_by_id(task_id)
        if not qc_task:
            return False

        for decision_data in decisions:
            decision = QCDecision(
                qc_task_id=task_id,
                asset_id=decision_data["asset_id"],
                decision=decision_data["decision"]
            )
            self.session.add(decision)

        from datetime import datetime
        qc_task.status = "completed"
        qc_task.completed_at = datetime.now()

        await self.session.commit()
        return True

    async def delete(self, task_id: str) -> bool:
        """Delete a QC task"""
        qc_task = await self.get_by_id(task_id)
        if not qc_task:
            return False

        await self.session.delete(qc_task)
        await self.session.commit()
        return True


class MCPServerRepository:
    """Repository for tracking installed MCP servers."""

    def __init__(self, session: AsyncSession):
        self.session = session

    async def list_status_map(self) -> Dict[str, str]:
        stmt = select(InstalledMCPServer.server_id, InstalledMCPServer.status)
        result = await self.session.execute(stmt)
        return {row[0]: row[1] for row in result.all()}

    async def get_by_server_id(self, server_id: str) -> Optional[InstalledMCPServer]:
        stmt = select(InstalledMCPServer).where(InstalledMCPServer.server_id == server_id)
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def mark_installed(self, server_id: str) -> InstalledMCPServer:
        record = await self.get_by_server_id(server_id)
        if record:
            record.status = "installed"
        else:
            record = InstalledMCPServer(server_id=server_id, status="installed")
            self.session.add(record)
        await self.session.commit()
        await self.session.refresh(record)
        return record

    async def mark_uninstalled(self, server_id: str) -> InstalledMCPServer:
        record = await self.get_by_server_id(server_id)
        if record:
            record.status = "not_installed"
        else:
            record = InstalledMCPServer(server_id=server_id, status="not_installed")
            self.session.add(record)
        await self.session.commit()
        await self.session.refresh(record)
        return record

    async def is_installed(self, server_id: str) -> bool:
        record = await self.get_by_server_id(server_id)
        return bool(record and record.status != "not_installed")
