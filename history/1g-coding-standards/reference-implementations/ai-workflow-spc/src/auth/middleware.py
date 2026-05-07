"""
Authentication and authorization middleware for FastAPI
"""
from typing import Optional, Callable
from functools import wraps
from fastapi import HTTPException, status, Request, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import jwt
import os
from datetime import datetime, timedelta

from src.database.models import User, Tenant
from src.auth.permissions import Permission, has_permission, has_any_permission
from src.database.connection import get_db


# JWT Configuration
SECRET_KEY = os.getenv("JWT_SECRET_KEY", "your-secret-key-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24 hours

security = HTTPBearer()


class AuthenticatedUser:
    """Represents an authenticated user with tenant and role information"""

    def __init__(self, user_id: str, tenant_id: str, email: str, role: str, name: Optional[str] = None):
        self.user_id = user_id
        self.tenant_id = tenant_id
        self.email = email
        self.role = role
        self.name = name

    def has_permission(self, permission: Permission) -> bool:
        """Check if user has a specific permission"""
        return has_permission(self.role, permission)

    def has_any_permission(self, permissions: list[Permission]) -> bool:
        """Check if user has any of the specified permissions"""
        return has_any_permission(self.role, permissions)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Create JWT access token"""
    to_encode = data.copy()

    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)

    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

    return encoded_jwt


def decode_access_token(token: str) -> dict:
    """Decode and verify JWT access token"""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except jwt.JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db)
) -> AuthenticatedUser:
    """
    Get current authenticated user from JWT token
    This is a FastAPI dependency that can be used in route handlers
    """
    token = credentials.credentials

    # Decode token
    payload = decode_access_token(token)

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials"
        )

    # Fetch user from database
    result = await db.execute(
        select(User).where(User.id == user_id, User.is_active == True)
    )
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive"
        )

    return AuthenticatedUser(
        user_id=user.id,
        tenant_id=user.tenant_id,
        email=user.email,
        role=user.role,
        name=user.name
    )


async def get_optional_user(
    request: Request,
    db: AsyncSession = Depends(get_db)
) -> Optional[AuthenticatedUser]:
    """
    Get current user if authenticated, otherwise None
    Useful for endpoints that work both authenticated and unauthenticated
    """
    auth_header = request.headers.get("Authorization")

    if not auth_header or not auth_header.startswith("Bearer "):
        return None

    token = auth_header.replace("Bearer ", "")

    try:
        payload = decode_access_token(token)
        user_id = payload.get("sub")

        if user_id:
            result = await db.execute(
                select(User).where(User.id == user_id, User.is_active == True)
            )
            user = result.scalar_one_or_none()

            if user:
                return AuthenticatedUser(
                    user_id=user.id,
                    tenant_id=user.tenant_id,
                    email=user.email,
                    role=user.role,
                    name=user.name
                )
    except HTTPException:
        pass

    return None


def require_permission(permission: Permission):
    """
    Decorator to require a specific permission for a route
    Usage:
        @app.get("/workflows")
        @require_permission(Permission.WORKFLOWS_VIEW)
        async def get_workflows(current_user: AuthenticatedUser = Depends(get_current_user)):
            ...
    """
    def decorator(func: Callable):
        @wraps(func)
        async def wrapper(*args, current_user: AuthenticatedUser = Depends(get_current_user), **kwargs):
            if not current_user.has_permission(permission):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Permission denied: {permission.value} required"
                )
            return await func(*args, current_user=current_user, **kwargs)
        return wrapper
    return decorator


def require_any_permission(permissions: list[Permission]):
    """
    Decorator to require any of the specified permissions
    """
    def decorator(func: Callable):
        @wraps(func)
        async def wrapper(*args, current_user: AuthenticatedUser = Depends(get_current_user), **kwargs):
            if not current_user.has_any_permission(permissions):
                perm_str = ", ".join([p.value for p in permissions])
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Permission denied: One of [{perm_str}] required"
                )
            return await func(*args, current_user=current_user, **kwargs)
        return wrapper
    return decorator


def require_role(required_role: str):
    """
    Decorator to require a specific role
    """
    def decorator(func: Callable):
        @wraps(func)
        async def wrapper(*args, current_user: AuthenticatedUser = Depends(get_current_user), **kwargs):
            if current_user.role != required_role:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Role '{required_role}' required"
                )
            return await func(*args, current_user=current_user, **kwargs)
        return wrapper
    return decorator


async def check_tenant_access(
    user: AuthenticatedUser,
    resource_tenant_id: str
) -> bool:
    """
    Check if user has access to a resource from a specific tenant
    Super admins can access all tenants
    """
    if user.role == "super_admin":
        return True

    return user.tenant_id == resource_tenant_id


async def enforce_tenant_isolation(
    user: AuthenticatedUser,
    resource_tenant_id: str
):
    """
    Enforce tenant isolation - raises exception if user doesn't have access
    """
    if not await check_tenant_access(user, resource_tenant_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: Resource belongs to different tenant"
        )
