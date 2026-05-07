"""
Authentication and authorization module for Sprint 6.0
"""
from src.auth.permissions import Permission, get_role_permissions, has_permission
from src.auth.middleware import (
    AuthenticatedUser,
    get_current_user,
    get_optional_user,
    require_permission,
    require_any_permission,
    require_role,
    check_tenant_access,
    enforce_tenant_isolation,
    create_access_token,
)

__all__ = [
    "Permission",
    "get_role_permissions",
    "has_permission",
    "AuthenticatedUser",
    "get_current_user",
    "get_optional_user",
    "require_permission",
    "require_any_permission",
    "require_role",
    "check_tenant_access",
    "enforce_tenant_isolation",
    "create_access_token",
]
