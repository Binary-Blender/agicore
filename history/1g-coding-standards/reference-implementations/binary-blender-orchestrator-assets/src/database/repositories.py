"""Repository pattern for database access with comprehensive error handling"""
from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, delete, func
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from fastapi import HTTPException
from .models import Asset, QCTask, QCDecision, ABTestResult
import logging

logger = logging.getLogger(__name__)


class AssetRepository:
    """Repository for Asset operations"""

    def __init__(self, session: AsyncSession):
        self.session = session

    async def create_asset(self, tenant_id: Optional[str] = None, **kwargs) -> Asset:
        """Create new asset with error handling"""
        try:
            # Add tenant_id if provided (for multi-tenancy)
            if tenant_id:
                kwargs['tenant_id'] = tenant_id

            asset = Asset(**kwargs)
            self.session.add(asset)
            await self.session.commit()
            await self.session.refresh(asset)
            logger.info(f"Created asset: {asset.id} for tenant: {tenant_id}")
            return asset
        except IntegrityError as e:
            await self.session.rollback()
            logger.error(f"Duplicate or constraint violation creating asset: {e}")
            raise HTTPException(status_code=409, detail="Asset already exists or constraint violation")
        except SQLAlchemyError as e:
            await self.session.rollback()
            logger.error(f"Database error creating asset: {e}")
            raise HTTPException(status_code=500, detail="Database error occurred")
        except Exception as e:
            await self.session.rollback()
            logger.error(f"Unexpected error creating asset: {e}")
            raise HTTPException(status_code=500, detail="Internal server error")

    async def get_asset(self, asset_id: str, tenant_id: Optional[str] = None) -> Optional[Asset]:
        """Get asset by ID with tenant isolation"""
        try:
            query = select(Asset).where(
                Asset.id == asset_id,
                Asset.archived.is_(False)  # Fixed: proper boolean comparison
            )

            # Tenant isolation
            if tenant_id:
                query = query.where(Asset.tenant_id == tenant_id)

            result = await self.session.execute(query)
            return result.scalars().first()
        except SQLAlchemyError as e:
            logger.error(f"Database error fetching asset {asset_id}: {e}")
            raise HTTPException(status_code=500, detail="Database error occurred")

    async def list_assets(
        self,
        skip: int = 0,
        limit: int = 100,
        state: Optional[str] = None,
        execution_id: Optional[str] = None,
        provider: Optional[str] = None,
        asset_type: Optional[str] = None,
        tenant_id: Optional[str] = None
    ) -> tuple[List[Asset], int]:
        """List assets with filters, returns (assets, total_count)"""
        try:
            # Base query
            query = select(Asset).where(Asset.archived.is_(False))  # Fixed

            # Tenant isolation
            if tenant_id:
                query = query.where(Asset.tenant_id == tenant_id)

            # Filters
            if state:
                query = query.where(Asset.state == state)
            if execution_id:
                query = query.where(Asset.execution_id == execution_id)
            if provider:
                query = query.where(Asset.provider == provider)
            if asset_type:
                query = query.where(Asset.type == asset_type)

            # Get total count for pagination
            count_query = select(func.count()).select_from(Asset).where(query.whereclause)
            total_result = await self.session.execute(count_query)
            total = total_result.scalar() or 0

            # Apply pagination and ordering
            query = query.offset(skip).limit(limit).order_by(Asset.created_at.desc())
            result = await self.session.execute(query)
            assets = result.scalars().all()

            return list(assets), total
        except SQLAlchemyError as e:
            logger.error(f"Database error listing assets: {e}")
            raise HTTPException(status_code=500, detail="Database error occurred")

    async def update_state(self, asset_id: str, state: str, tenant_id: Optional[str] = None) -> Optional[Asset]:
        """Update asset state with tenant isolation"""
        try:
            update_query = update(Asset).where(Asset.id == asset_id)

            # Tenant isolation
            if tenant_id:
                update_query = update_query.where(Asset.tenant_id == tenant_id)

            update_query = update_query.values(state=state)

            await self.session.execute(update_query)
            await self.session.commit()
            return await self.get_asset(asset_id, tenant_id)
        except SQLAlchemyError as e:
            await self.session.rollback()
            logger.error(f"Database error updating asset {asset_id}: {e}")
            raise HTTPException(status_code=500, detail="Database error occurred")

    async def delete_asset(self, asset_id: str, tenant_id: Optional[str] = None):
        """Soft delete asset with tenant isolation"""
        try:
            update_query = update(Asset).where(Asset.id == asset_id)

            # Tenant isolation
            if tenant_id:
                update_query = update_query.where(Asset.tenant_id == tenant_id)

            update_query = update_query.values(archived=True)

            result = await self.session.execute(update_query)
            await self.session.commit()

            if result.rowcount == 0:
                raise HTTPException(status_code=404, detail="Asset not found")

            logger.info(f"Archived asset: {asset_id}")
        except HTTPException:
            raise
        except SQLAlchemyError as e:
            await self.session.rollback()
            logger.error(f"Database error deleting asset {asset_id}: {e}")
            raise HTTPException(status_code=500, detail="Database error occurred")


class QCTaskRepository:
    """Repository for QC Task operations"""

    def __init__(self, session: AsyncSession):
        self.session = session

    async def create_task(self, execution_id: str, module_id: str) -> QCTask:
        """Create new QC task with error handling"""
        try:
            task = QCTask(execution_id=execution_id, module_id=module_id)
            self.session.add(task)
            await self.session.commit()
            await self.session.refresh(task)
            logger.info(f"Created QC task: {task.id}")
            return task
        except IntegrityError as e:
            await self.session.rollback()
            logger.error(f"Constraint violation creating QC task: {e}")
            raise HTTPException(status_code=409, detail="QC task constraint violation")
        except SQLAlchemyError as e:
            await self.session.rollback()
            logger.error(f"Database error creating QC task: {e}")
            raise HTTPException(status_code=500, detail="Database error occurred")

    async def get_task(self, task_id: str) -> Optional[QCTask]:
        """Get QC task by ID"""
        try:
            result = await self.session.execute(
                select(QCTask).where(QCTask.id == task_id)
            )
            return result.scalars().first()
        except SQLAlchemyError as e:
            logger.error(f"Database error fetching QC task {task_id}: {e}")
            raise HTTPException(status_code=500, detail="Database error occurred")

    async def list_pending_tasks(self, limit: int = 50) -> List[QCTask]:
        """List pending QC tasks"""
        try:
            result = await self.session.execute(
                select(QCTask)
                .where(QCTask.status == "pending")
                .order_by(QCTask.created_at.asc())
                .limit(limit)
            )
            return list(result.scalars().all())
        except SQLAlchemyError as e:
            logger.error(f"Database error listing QC tasks: {e}")
            raise HTTPException(status_code=500, detail="Database error occurred")

    async def complete_task(self, task_id: str):
        """Mark task as completed"""
        try:
            result = await self.session.execute(
                update(QCTask)
                .where(QCTask.id == task_id)
                .values(status="completed", completed_at=func.now())
            )
            await self.session.commit()

            if result.rowcount == 0:
                raise HTTPException(status_code=404, detail="QC task not found")

            logger.info(f"Completed QC task: {task_id}")
        except HTTPException:
            raise
        except SQLAlchemyError as e:
            await self.session.rollback()
            logger.error(f"Database error completing QC task {task_id}: {e}")
            raise HTTPException(status_code=500, detail="Database error occurred")

    async def create_decision(
        self,
        task_id: str,
        asset_id: str,
        decision: str
    ) -> QCDecision:
        """Create QC decision with error handling"""
        try:
            qc_decision = QCDecision(
                qc_task_id=task_id,
                asset_id=asset_id,
                decision=decision
            )
            self.session.add(qc_decision)
            await self.session.commit()
            await self.session.refresh(qc_decision)
            return qc_decision
        except IntegrityError as e:
            await self.session.rollback()
            logger.error(f"Constraint violation creating QC decision: {e}")
            raise HTTPException(status_code=409, detail="QC decision constraint violation")
        except SQLAlchemyError as e:
            await self.session.rollback()
            logger.error(f"Database error creating QC decision: {e}")
            raise HTTPException(status_code=500, detail="Database error occurred")


class ABTestRepository:
    """Repository for A/B Test operations"""

    def __init__(self, session: AsyncSession):
        self.session = session

    async def create_result(self, **kwargs) -> ABTestResult:
        """Create A/B test result with error handling"""
        try:
            result = ABTestResult(**kwargs)
            self.session.add(result)
            await self.session.commit()
            await self.session.refresh(result)
            logger.info(f"Created A/B test result: {result.id}")
            return result
        except IntegrityError as e:
            await self.session.rollback()
            logger.error(f"Constraint violation creating A/B test result: {e}")
            raise HTTPException(status_code=409, detail="A/B test result constraint violation")
        except SQLAlchemyError as e:
            await self.session.rollback()
            logger.error(f"Database error creating A/B test result: {e}")
            raise HTTPException(status_code=500, detail="Database error occurred")

    async def get_results(self, execution_id: Optional[str] = None) -> List[ABTestResult]:
        """Get A/B test results"""
        try:
            query = select(ABTestResult)
            if execution_id:
                query = query.where(ABTestResult.execution_id == execution_id)
            query = query.order_by(ABTestResult.created_at.desc())
            result = await self.session.execute(query)
            return list(result.scalars().all())
        except SQLAlchemyError as e:
            logger.error(f"Database error fetching A/B test results: {e}")
            raise HTTPException(status_code=500, detail="Database error occurred")
