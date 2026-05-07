"""
Repository pattern for database access
"""
import logging
from typing import List, Dict, Any, Optional, Tuple
from sqlalchemy import select, func, and_, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from datetime import datetime

from .models import Workflow, WorkflowModule, WorkflowConnection, WorkflowExecution, Tenant

logger = logging.getLogger(__name__)


class WorkflowRepository:
    """Repository for Workflow operations"""

    def __init__(self, session: AsyncSession):
        self.session = session

    async def create(self, workflow_data: Dict[str, Any]) -> Workflow:
        """Create a new workflow with modules and connections"""
        workflow = Workflow(
            name=workflow_data["name"],
            description=workflow_data.get("description"),
            tenant_id=workflow_data.get("tenant_id"),
            state=workflow_data.get("state", "draft")
        )
        self.session.add(workflow)
        await self.session.flush()

        # Create modules
        if "modules" in workflow_data:
            for module_data in workflow_data["modules"]:
                module = WorkflowModule(
                    id=module_data["id"],
                    workflow_id=workflow.id,
                    type=module_data["type"],
                    name=module_data.get("name", module_data["type"]),
                    config=module_data.get("config", {}),
                    position=module_data.get("position", {"x": 0, "y": 0})
                )
                self.session.add(module)

        # Create connections
        if "connections" in workflow_data:
            for conn_data in workflow_data["connections"]:
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

    async def get_by_id(self, workflow_id: str, tenant_id: Optional[str] = None) -> Optional[Workflow]:
        """Get workflow by ID with tenant isolation"""
        query = select(Workflow).where(Workflow.id == workflow_id)
        if tenant_id:
            query = query.where(Workflow.tenant_id == tenant_id)

        query = query.options(
            selectinload(Workflow.modules),
            selectinload(Workflow.connections)
        )

        result = await self.session.execute(query)
        return result.scalar_one_or_none()

    async def list_workflows(
        self,
        skip: int = 0,
        limit: int = 100,
        tenant_id: Optional[str] = None,
        state: Optional[str] = None
    ) -> Tuple[List[Workflow], int]:
        """List workflows with pagination and tenant isolation"""
        query = select(Workflow)

        if tenant_id:
            query = query.where(Workflow.tenant_id == tenant_id)
        if state:
            query = query.where(Workflow.state == state)

        # Get total count
        count_query = select(func.count()).select_from(query.subquery())
        total = await self.session.scalar(count_query)

        # Get paginated results
        query = query.offset(skip).limit(limit).order_by(Workflow.created_at.desc())
        result = await self.session.execute(query)
        workflows = result.scalars().all()

        return list(workflows), total or 0

    async def update(self, workflow_id: str, updates: Dict[str, Any], tenant_id: Optional[str] = None) -> Optional[Workflow]:
        """Update workflow"""
        workflow = await self.get_by_id(workflow_id, tenant_id)
        if not workflow:
            return None

        for key, value in updates.items():
            if hasattr(workflow, key):
                setattr(workflow, key, value)

        workflow.updated_at = datetime.utcnow()
        await self.session.commit()
        await self.session.refresh(workflow)
        return workflow

    async def delete(self, workflow_id: str, tenant_id: Optional[str] = None) -> bool:
        """Soft delete workflow"""
        workflow = await self.get_by_id(workflow_id, tenant_id)
        if not workflow:
            return False

        workflow.state = "archived"
        await self.session.commit()
        return True


class ExecutionRepository:
    """Repository for WorkflowExecution operations"""

    def __init__(self, session: AsyncSession):
        self.session = session

    async def create(self, execution_data: Dict[str, Any]) -> WorkflowExecution:
        """Create a new execution"""
        execution = WorkflowExecution(
            workflow_id=execution_data["workflow_id"],
            tenant_id=execution_data.get("tenant_id"),
            state=execution_data.get("state", "pending"),
            execution_data=execution_data.get("execution_data", {})
        )
        self.session.add(execution)
        await self.session.commit()
        await self.session.refresh(execution)
        return execution

    async def get_by_id(self, execution_id: str, tenant_id: Optional[str] = None) -> Optional[WorkflowExecution]:
        """Get execution by ID with tenant isolation"""
        query = select(WorkflowExecution).where(WorkflowExecution.id == execution_id)
        if tenant_id:
            query = query.where(WorkflowExecution.tenant_id == tenant_id)

        result = await self.session.execute(query)
        return result.scalar_one_or_none()

    async def list_executions(
        self,
        skip: int = 0,
        limit: int = 100,
        tenant_id: Optional[str] = None,
        workflow_id: Optional[str] = None,
        state: Optional[str] = None
    ) -> Tuple[List[WorkflowExecution], int]:
        """List executions with pagination and tenant isolation"""
        query = select(WorkflowExecution)

        if tenant_id:
            query = query.where(WorkflowExecution.tenant_id == tenant_id)
        if workflow_id:
            query = query.where(WorkflowExecution.workflow_id == workflow_id)
        if state:
            query = query.where(WorkflowExecution.state == state)

        # Get total count
        count_query = select(func.count()).select_from(query.subquery())
        total = await self.session.scalar(count_query)

        # Get paginated results
        query = query.offset(skip).limit(limit).order_by(WorkflowExecution.started_at.desc())
        result = await self.session.execute(query)
        executions = result.scalars().all()

        return list(executions), total or 0

    async def update_state(self, execution_id: str, state: str, tenant_id: Optional[str] = None) -> Optional[WorkflowExecution]:
        """Update execution state"""
        execution = await self.get_by_id(execution_id, tenant_id)
        if not execution:
            return None

        execution.state = state
        if state == "completed":
            execution.completed_at = datetime.utcnow()

        await self.session.commit()
        await self.session.refresh(execution)
        return execution

    async def update_execution_data(self, execution_id: str, data: Dict[str, Any], tenant_id: Optional[str] = None) -> Optional[WorkflowExecution]:
        """Update execution data"""
        execution = await self.get_by_id(execution_id, tenant_id)
        if not execution:
            return None

        execution.execution_data = data
        await self.session.commit()
        await self.session.refresh(execution)
        return execution

    async def pause_for_qc(self, execution_id: str, paused_data: Dict[str, Any], tenant_id: Optional[str] = None) -> Optional[WorkflowExecution]:
        """Pause execution for QC"""
        execution = await self.get_by_id(execution_id, tenant_id)
        if not execution:
            return None

        execution.state = "paused_for_qc"
        execution.paused_data = paused_data
        await self.session.commit()
        await self.session.refresh(execution)
        return execution

    async def get_stats(self, tenant_id: Optional[str] = None) -> Dict[str, Any]:
        """Get execution statistics"""
        query = select(WorkflowExecution)
        if tenant_id:
            query = query.where(WorkflowExecution.tenant_id == tenant_id)

        result = await self.session.execute(query)
        executions = result.scalars().all()

        total = len(executions)
        by_status = {}
        total_time = 0
        completed_count = 0

        for execution in executions:
            status = execution.state
            by_status[status] = by_status.get(status, 0) + 1

            if execution.completed_at and execution.started_at:
                duration = (execution.completed_at - execution.started_at).total_seconds()
                total_time += duration
                completed_count += 1

        avg_time = total_time / completed_count if completed_count > 0 else 0

        return {
            "total_executions": total,
            "executions_by_status": by_status,
            "avg_execution_time_seconds": round(avg_time, 2)
        }


class TenantRepository:
    """Repository for Tenant operations"""

    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_by_id(self, tenant_id: str) -> Optional[Tenant]:
        """Get tenant by ID"""
        result = await self.session.execute(
            select(Tenant).where(Tenant.id == tenant_id)
        )
        return result.scalar_one_or_none()

    async def create(self, tenant_data: Dict[str, Any]) -> Tenant:
        """Create a new tenant"""
        tenant = Tenant(
            name=tenant_data["name"],
            domain=tenant_data.get("domain"),
            settings=tenant_data.get("settings", {})
        )
        self.session.add(tenant)
        await self.session.commit()
        await self.session.refresh(tenant)
        return tenant
