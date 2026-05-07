"""
Role-Based Access Control (RBAC) permissions system for Sprint 6.0
"""
from enum import Enum
from typing import Set, Dict, List
from dataclasses import dataclass


class Permission(str, Enum):
    """All available permissions in the system"""

    # Workflow permissions
    WORKFLOWS_VIEW = "workflows:view"
    WORKFLOWS_CREATE = "workflows:create"
    WORKFLOWS_EDIT = "workflows:edit"
    WORKFLOWS_DELETE = "workflows:delete"
    WORKFLOWS_EXECUTE = "workflows:execute"

    # Execution permissions
    EXECUTIONS_VIEW = "executions:view"
    EXECUTIONS_STOP = "executions:stop"
    EXECUTIONS_RETRY = "executions:retry"

    # Asset permissions
    ASSETS_VIEW = "assets:view"
    ASSETS_UPLOAD = "assets:upload"
    ASSETS_DELETE = "assets:delete"

    # QC permissions
    QC_VIEW = "qc:view"
    QC_REVIEW = "qc:review"
    QC_APPROVE = "qc:approve"
    QC_REJECT = "qc:reject"

    # MCP Server permissions
    MCP_SERVERS_VIEW = "mcp_servers:view"
    MCP_SERVERS_CREATE = "mcp_servers:create"
    MCP_SERVERS_EDIT = "mcp_servers:edit"
    MCP_SERVERS_DELETE = "mcp_servers:delete"
    MCP_SERVERS_DEPLOY = "mcp_servers:deploy"

    # Cost permissions
    COST_VIEW = "cost:view"
    COST_CONFIGURE_LIMITS = "cost:configure_limits"
    COST_CONFIGURE_ROUTING = "cost:configure_routing"
    COST_VIEW_ALL_TENANTS = "cost:view_all_tenants"

    # User management permissions
    USERS_VIEW = "users:view"
    USERS_CREATE = "users:create"
    USERS_EDIT = "users:edit"
    USERS_DELETE = "users:delete"

    # Tenant management permissions
    TENANTS_VIEW = "tenants:view"
    TENANTS_CREATE = "tenants:create"
    TENANTS_EDIT = "tenants:edit"
    TENANTS_DELETE = "tenants:delete"

    # Analytics permissions
    ANALYTICS_VIEW = "analytics:view"
    ANALYTICS_EXPORT = "analytics:export"

    # Audit log permissions
    AUDIT_VIEW = "audit:view"
    AUDIT_EXPORT = "audit:export"

    # System admin permissions
    SYSTEM_ADMIN = "system:admin"
    SYSTEM_CONFIGURE = "system:configure"


@dataclass
class Role:
    """Role definition with associated permissions"""
    name: str
    description: str
    permissions: Set[Permission]


# Define all available roles
ROLES: Dict[str, Role] = {
    "admin": Role(
        name="admin",
        description="Full administrative access to all resources",
        permissions={
            # All permissions
            Permission.WORKFLOWS_VIEW,
            Permission.WORKFLOWS_CREATE,
            Permission.WORKFLOWS_EDIT,
            Permission.WORKFLOWS_DELETE,
            Permission.WORKFLOWS_EXECUTE,
            Permission.EXECUTIONS_VIEW,
            Permission.EXECUTIONS_STOP,
            Permission.EXECUTIONS_RETRY,
            Permission.ASSETS_VIEW,
            Permission.ASSETS_UPLOAD,
            Permission.ASSETS_DELETE,
            Permission.QC_VIEW,
            Permission.QC_REVIEW,
            Permission.QC_APPROVE,
            Permission.QC_REJECT,
            Permission.MCP_SERVERS_VIEW,
            Permission.MCP_SERVERS_CREATE,
            Permission.MCP_SERVERS_EDIT,
            Permission.MCP_SERVERS_DELETE,
            Permission.MCP_SERVERS_DEPLOY,
            Permission.COST_VIEW,
            Permission.COST_CONFIGURE_LIMITS,
            Permission.COST_CONFIGURE_ROUTING,
            Permission.USERS_VIEW,
            Permission.USERS_CREATE,
            Permission.USERS_EDIT,
            Permission.USERS_DELETE,
            Permission.TENANTS_VIEW,
            Permission.TENANTS_EDIT,
            Permission.ANALYTICS_VIEW,
            Permission.ANALYTICS_EXPORT,
            Permission.AUDIT_VIEW,
            Permission.AUDIT_EXPORT,
            Permission.SYSTEM_ADMIN,
            Permission.SYSTEM_CONFIGURE,
        }
    ),

    "workflow_designer": Role(
        name="workflow_designer",
        description="Can create and manage workflows",
        permissions={
            Permission.WORKFLOWS_VIEW,
            Permission.WORKFLOWS_CREATE,
            Permission.WORKFLOWS_EDIT,
            Permission.WORKFLOWS_DELETE,
            Permission.WORKFLOWS_EXECUTE,
            Permission.EXECUTIONS_VIEW,
            Permission.EXECUTIONS_STOP,
            Permission.EXECUTIONS_RETRY,
            Permission.ASSETS_VIEW,
            Permission.ASSETS_UPLOAD,
            Permission.MCP_SERVERS_VIEW,
            Permission.ANALYTICS_VIEW,
        }
    ),

    "qc_operator": Role(
        name="qc_operator",
        description="Can review and approve/reject quality control tasks",
        permissions={
            Permission.QC_VIEW,
            Permission.QC_REVIEW,
            Permission.QC_APPROVE,
            Permission.QC_REJECT,
            Permission.ASSETS_VIEW,
            Permission.EXECUTIONS_VIEW,
            Permission.WORKFLOWS_VIEW,
        }
    ),

    "cost_manager": Role(
        name="cost_manager",
        description="Can view and manage cost optimization",
        permissions={
            Permission.COST_VIEW,
            Permission.COST_CONFIGURE_LIMITS,
            Permission.COST_CONFIGURE_ROUTING,
            Permission.ANALYTICS_VIEW,
            Permission.ANALYTICS_EXPORT,
            Permission.MCP_SERVERS_VIEW,
            Permission.EXECUTIONS_VIEW,
            Permission.WORKFLOWS_VIEW,
        }
    ),

    "viewer": Role(
        name="viewer",
        description="Read-only access to all resources",
        permissions={
            Permission.WORKFLOWS_VIEW,
            Permission.EXECUTIONS_VIEW,
            Permission.ASSETS_VIEW,
            Permission.QC_VIEW,
            Permission.MCP_SERVERS_VIEW,
            Permission.COST_VIEW,
            Permission.ANALYTICS_VIEW,
        }
    ),

    "super_admin": Role(
        name="super_admin",
        description="Super admin with cross-tenant access",
        permissions={
            # All admin permissions plus cross-tenant
            Permission.WORKFLOWS_VIEW,
            Permission.WORKFLOWS_CREATE,
            Permission.WORKFLOWS_EDIT,
            Permission.WORKFLOWS_DELETE,
            Permission.WORKFLOWS_EXECUTE,
            Permission.EXECUTIONS_VIEW,
            Permission.EXECUTIONS_STOP,
            Permission.EXECUTIONS_RETRY,
            Permission.ASSETS_VIEW,
            Permission.ASSETS_UPLOAD,
            Permission.ASSETS_DELETE,
            Permission.QC_VIEW,
            Permission.QC_REVIEW,
            Permission.QC_APPROVE,
            Permission.QC_REJECT,
            Permission.MCP_SERVERS_VIEW,
            Permission.MCP_SERVERS_CREATE,
            Permission.MCP_SERVERS_EDIT,
            Permission.MCP_SERVERS_DELETE,
            Permission.MCP_SERVERS_DEPLOY,
            Permission.COST_VIEW,
            Permission.COST_CONFIGURE_LIMITS,
            Permission.COST_CONFIGURE_ROUTING,
            Permission.COST_VIEW_ALL_TENANTS,
            Permission.USERS_VIEW,
            Permission.USERS_CREATE,
            Permission.USERS_EDIT,
            Permission.USERS_DELETE,
            Permission.TENANTS_VIEW,
            Permission.TENANTS_CREATE,
            Permission.TENANTS_EDIT,
            Permission.TENANTS_DELETE,
            Permission.ANALYTICS_VIEW,
            Permission.ANALYTICS_EXPORT,
            Permission.AUDIT_VIEW,
            Permission.AUDIT_EXPORT,
            Permission.SYSTEM_ADMIN,
            Permission.SYSTEM_CONFIGURE,
        }
    ),
}


def get_role_permissions(role_name: str) -> Set[Permission]:
    """Get all permissions for a given role"""
    role = ROLES.get(role_name)
    if not role:
        return set()
    return role.permissions


def has_permission(role_name: str, permission: Permission) -> bool:
    """Check if a role has a specific permission"""
    role_permissions = get_role_permissions(role_name)
    return permission in role_permissions


def has_any_permission(role_name: str, permissions: List[Permission]) -> bool:
    """Check if a role has any of the specified permissions"""
    role_permissions = get_role_permissions(role_name)
    return any(perm in role_permissions for perm in permissions)


def has_all_permissions(role_name: str, permissions: List[Permission]) -> bool:
    """Check if a role has all of the specified permissions"""
    role_permissions = get_role_permissions(role_name)
    return all(perm in role_permissions for perm in permissions)


def get_available_roles() -> List[str]:
    """Get list of all available role names"""
    return list(ROLES.keys())


def get_role_info(role_name: str) -> Dict:
    """Get detailed information about a role"""
    role = ROLES.get(role_name)
    if not role:
        return None

    return {
        "name": role.name,
        "description": role.description,
        "permissions": [perm.value for perm in role.permissions],
        "permission_count": len(role.permissions)
    }
