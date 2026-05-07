"""
Comprehensive audit logging system for compliance - Sprint 6.0
"""
from typing import Optional, Dict, Any
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
import uuid

from src.database.models import AuditLog
from src.auth.middleware import AuthenticatedUser


class AuditLogger:
    """Audit logger for tracking all system actions"""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def log(
        self,
        action: str,
        tenant_id: str,
        user_id: Optional[str] = None,
        resource_type: Optional[str] = None,
        resource_id: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        result: str = "success",
        duration_ms: Optional[int] = None
    ):
        """
        Log an audit event

        Args:
            action: Action performed (e.g., "workflow.execute", "qc.approve")
            tenant_id: Tenant ID
            user_id: User ID (optional for system actions)
            resource_type: Type of resource (workflow, execution, asset, etc.)
            resource_id: ID of the resource
            details: Additional context as JSON
            ip_address: Client IP address
            user_agent: Client user agent string
            result: Result of action (success, failure, unauthorized)
            duration_ms: How long the action took in milliseconds
        """
        audit_log = AuditLog(
            id=f"audit_{uuid.uuid4().hex[:8]}",
            tenant_id=tenant_id,
            user_id=user_id,
            action=action,
            resource_type=resource_type,
            resource_id=resource_id,
            details=details or {},
            ip_address=ip_address,
            user_agent=user_agent,
            result=result,
            duration_ms=duration_ms,
            timestamp=datetime.utcnow()
        )

        self.db.add(audit_log)
        await self.db.commit()

        return audit_log

    async def log_workflow_action(
        self,
        action: str,
        workflow_id: str,
        user: AuthenticatedUser,
        details: Optional[Dict] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        result: str = "success"
    ):
        """Log workflow-related actions"""
        return await self.log(
            action=f"workflow.{action}",
            tenant_id=user.tenant_id,
            user_id=user.user_id,
            resource_type="workflow",
            resource_id=workflow_id,
            details=details,
            ip_address=ip_address,
            user_agent=user_agent,
            result=result
        )

    async def log_execution_action(
        self,
        action: str,
        execution_id: str,
        user: Optional[AuthenticatedUser] = None,
        tenant_id: Optional[str] = None,
        details: Optional[Dict] = None,
        result: str = "success"
    ):
        """Log workflow execution actions"""
        return await self.log(
            action=f"execution.{action}",
            tenant_id=tenant_id or (user.tenant_id if user else None),
            user_id=user.user_id if user else None,
            resource_type="execution",
            resource_id=execution_id,
            details=details,
            result=result
        )

    async def log_qc_action(
        self,
        action: str,
        asset_id: str,
        user: AuthenticatedUser,
        decision: Optional[str] = None,
        details: Optional[Dict] = None,
        result: str = "success"
    ):
        """Log QC-related actions"""
        qc_details = details or {}
        if decision:
            qc_details["decision"] = decision

        return await self.log(
            action=f"qc.{action}",
            tenant_id=user.tenant_id,
            user_id=user.user_id,
            resource_type="asset",
            resource_id=asset_id,
            details=qc_details,
            result=result
        )

    async def log_mcp_action(
        self,
        action: str,
        server_id: str,
        user: Optional[AuthenticatedUser] = None,
        tenant_id: Optional[str] = None,
        details: Optional[Dict] = None,
        result: str = "success"
    ):
        """Log MCP server actions"""
        return await self.log(
            action=f"mcp.{action}",
            tenant_id=tenant_id or (user.tenant_id if user else None),
            user_id=user.user_id if user else None,
            resource_type="mcp_server",
            resource_id=server_id,
            details=details,
            result=result
        )

    async def log_cost_action(
        self,
        action: str,
        user: AuthenticatedUser,
        details: Optional[Dict] = None,
        result: str = "success"
    ):
        """Log cost management actions"""
        return await self.log(
            action=f"cost.{action}",
            tenant_id=user.tenant_id,
            user_id=user.user_id,
            resource_type="cost_config",
            details=details,
            result=result
        )

    async def log_user_action(
        self,
        action: str,
        target_user_id: str,
        user: AuthenticatedUser,
        details: Optional[Dict] = None,
        result: str = "success"
    ):
        """Log user management actions"""
        return await self.log(
            action=f"user.{action}",
            tenant_id=user.tenant_id,
            user_id=user.user_id,
            resource_type="user",
            resource_id=target_user_id,
            details=details,
            result=result
        )

    async def log_tenant_action(
        self,
        action: str,
        tenant_id: str,
        user: AuthenticatedUser,
        details: Optional[Dict] = None,
        result: str = "success"
    ):
        """Log tenant management actions"""
        return await self.log(
            action=f"tenant.{action}",
            tenant_id=user.tenant_id,  # Actor's tenant
            user_id=user.user_id,
            resource_type="tenant",
            resource_id=tenant_id,  # Target tenant
            details=details,
            result=result
        )

    async def log_auth_event(
        self,
        action: str,
        user_id: Optional[str] = None,
        tenant_id: Optional[str] = None,
        email: Optional[str] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        result: str = "success",
        details: Optional[Dict] = None
    ):
        """Log authentication events"""
        auth_details = details or {}
        if email:
            auth_details["email"] = email

        return await self.log(
            action=f"auth.{action}",
            tenant_id=tenant_id or "system",
            user_id=user_id,
            resource_type="authentication",
            details=auth_details,
            ip_address=ip_address,
            user_agent=user_agent,
            result=result
        )

    async def get_audit_trail(
        self,
        tenant_id: str,
        resource_type: Optional[str] = None,
        resource_id: Optional[str] = None,
        user_id: Optional[str] = None,
        action_filter: Optional[str] = None,
        limit: int = 100,
        offset: int = 0
    ) -> list:
        """
        Retrieve audit trail with filters

        Returns list of audit logs with newest first
        """
        query = select(AuditLog).where(AuditLog.tenant_id == tenant_id)

        if resource_type:
            query = query.where(AuditLog.resource_type == resource_type)

        if resource_id:
            query = query.where(AuditLog.resource_id == resource_id)

        if user_id:
            query = query.where(AuditLog.user_id == user_id)

        if action_filter:
            query = query.where(AuditLog.action.like(f"%{action_filter}%"))

        # Order by newest first
        query = query.order_by(AuditLog.timestamp.desc())

        # Apply pagination
        query = query.limit(limit).offset(offset)

        result = await self.db.execute(query)
        logs = result.scalars().all()

        return [
            {
                "id": log.id,
                "timestamp": log.timestamp.isoformat(),
                "action": log.action,
                "user_id": log.user_id,
                "resource_type": log.resource_type,
                "resource_id": log.resource_id,
                "details": log.details,
                "result": log.result,
                "duration_ms": log.duration_ms,
                "ip_address": str(log.ip_address) if log.ip_address else None,
            }
            for log in logs
        ]

    async def get_audit_stats(
        self,
        tenant_id: str,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None
    ) -> Dict:
        """Get audit statistics for a tenant"""
        query = select(
            func.count(AuditLog.id).label("total_events"),
            func.count(func.distinct(AuditLog.user_id)).label("unique_users"),
            func.count(
                func.case((AuditLog.result == "failure", 1))
            ).label("failed_events"),
            func.avg(AuditLog.duration_ms).label("avg_duration_ms")
        ).where(AuditLog.tenant_id == tenant_id)

        if start_date:
            query = query.where(AuditLog.timestamp >= start_date)

        if end_date:
            query = query.where(AuditLog.timestamp <= end_date)

        result = await self.db.execute(query)
        stats = result.first()

        return {
            "total_events": stats.total_events or 0,
            "unique_users": stats.unique_users or 0,
            "failed_events": stats.failed_events or 0,
            "success_rate": (
                ((stats.total_events - stats.failed_events) / stats.total_events * 100)
                if stats.total_events > 0
                else 100.0
            ),
            "avg_duration_ms": float(stats.avg_duration_ms) if stats.avg_duration_ms else 0.0
        }


# Helper function to get audit logger
async def get_audit_logger(db: AsyncSession) -> AuditLogger:
    """Dependency to get audit logger instance"""
    return AuditLogger(db)
