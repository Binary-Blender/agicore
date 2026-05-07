"""
Authentication and user management API endpoints - Sprint 6.0
"""
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Request
from pydantic import BaseModel, EmailStr
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import bcrypt
import uuid
from datetime import datetime

from src.database.connection import get_db
from src.database.models import User, Tenant
from src.auth.middleware import (
    create_access_token,
    get_current_user,
    AuthenticatedUser,
    require_permission,
)
from src.auth.permissions import Permission
from src.auth.audit import AuditLogger


router = APIRouter(prefix="/api/auth", tags=["Authentication"])


# Request/Response Models
class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    name: Optional[str] = None
    tenant_name: Optional[str] = None  # Create new tenant if provided


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict


class UserResponse(BaseModel):
    id: str
    email: str
    name: Optional[str]
    role: str
    tenant_id: str
    is_active: bool


class UpdateUserRequest(BaseModel):
    name: Optional[str] = None
    role: Optional[str] = None
    is_active: Optional[bool] = None


# Helper Functions
def hash_password(password: str) -> str:
    """Hash a password using bcrypt"""
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')


def verify_password(password: str, hashed: str) -> bool:
    """Verify a password against its hash"""
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))


# Endpoints
@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(
    data: RegisterRequest,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """
    Register a new user and optionally create a new tenant

    If tenant_name is provided, creates a new tenant.
    Otherwise, user must be invited to an existing tenant.
    """
    audit_logger = AuditLogger(db)

    # Check if email already exists
    result = await db.execute(select(User).where(User.email == data.email))
    existing_user = result.scalar_one_or_none()

    if existing_user:
        await audit_logger.log_auth_event(
            action="register",
            email=data.email,
            ip_address=request.client.host if request.client else None,
            result="failure",
            details={"error": "Email already registered"}
        )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )

    # Create or get tenant
    tenant = None
    if data.tenant_name:
        # Create new tenant
        tenant = Tenant(
            id=f"tenant_{uuid.uuid4().hex[:8]}",
            name=data.tenant_name,
            is_active=True
        )
        db.add(tenant)
        await db.flush()
    else:
        # For now, create a default tenant if none provided
        # In production, users should be invited to existing tenants
        tenant = Tenant(
            id=f"tenant_{uuid.uuid4().hex[:8]}",
            name=f"Tenant for {data.email}",
            is_active=True
        )
        db.add(tenant)
        await db.flush()

    # Create user
    user = User(
        id=f"user_{uuid.uuid4().hex[:8]}",
        tenant_id=tenant.id,
        email=data.email,
        name=data.name,
        role="admin" if data.tenant_name else "viewer",  # First user in tenant is admin
        password_hash=hash_password(data.password),
        auth_provider="local",
        is_active=True,
        created_at=datetime.utcnow()
    )

    db.add(user)
    await db.commit()
    await db.refresh(user)

    # Log successful registration
    await audit_logger.log_auth_event(
        action="register",
        user_id=user.id,
        tenant_id=tenant.id,
        email=data.email,
        ip_address=request.client.host if request.client else None,
        result="success"
    )

    # Generate access token
    access_token = create_access_token(
        data={"sub": user.id, "email": user.email, "role": user.role, "tenant_id": tenant.id}
    )

    return TokenResponse(
        access_token=access_token,
        user={
            "id": user.id,
            "email": user.email,
            "name": user.name,
            "role": user.role,
            "tenant_id": tenant.id
        }
    )


@router.post("/login", response_model=TokenResponse)
async def login(
    data: LoginRequest,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """Authenticate user and return access token"""
    audit_logger = AuditLogger(db)

    # Find user by email
    result = await db.execute(
        select(User).where(User.email == data.email, User.is_active == True)
    )
    user = result.scalar_one_or_none()

    if not user or not verify_password(data.password, user.password_hash):
        await audit_logger.log_auth_event(
            action="login",
            email=data.email,
            ip_address=request.client.host if request.client else None,
            result="failure",
            details={"error": "Invalid credentials"}
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )

    # Update last login
    user.last_login = datetime.utcnow()
    await db.commit()

    # Log successful login
    await audit_logger.log_auth_event(
        action="login",
        user_id=user.id,
        tenant_id=user.tenant_id,
        email=data.email,
        ip_address=request.client.host if request.client else None,
        result="success"
    )

    # Generate access token
    access_token = create_access_token(
        data={"sub": user.id, "email": user.email, "role": user.role, "tenant_id": user.tenant_id}
    )

    return TokenResponse(
        access_token=access_token,
        user={
            "id": user.id,
            "email": user.email,
            "name": user.name,
            "role": user.role,
            "tenant_id": user.tenant_id
        }
    )


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get current authenticated user's information"""
    result = await db.execute(select(User).where(User.id == current_user.user_id))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    return UserResponse(
        id=user.id,
        email=user.email,
        name=user.name,
        role=user.role,
        tenant_id=user.tenant_id,
        is_active=user.is_active
    )


@router.get("/users", response_model=list[UserResponse])
async def list_users(
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """List all users in current tenant (requires admin role)"""
    if not current_user.has_permission(Permission.USERS_VIEW):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Permission denied"
        )

    # Get all users in tenant
    result = await db.execute(
        select(User).where(User.tenant_id == current_user.tenant_id)
    )
    users = result.scalars().all()

    return [
        UserResponse(
            id=user.id,
            email=user.email,
            name=user.name,
            role=user.role,
            tenant_id=user.tenant_id,
            is_active=user.is_active
        )
        for user in users
    ]


@router.post("/users", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def create_user(
    email: EmailStr,
    password: str,
    role: str = "viewer",
    name: Optional[str] = None,
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Create a new user in current tenant (requires admin role)"""
    if not current_user.has_permission(Permission.USERS_CREATE):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Permission denied"
        )

    audit_logger = AuditLogger(db)

    # Check if email already exists
    result = await db.execute(select(User).where(User.email == email))
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already exists"
        )

    # Create user
    user = User(
        id=f"user_{uuid.uuid4().hex[:8]}",
        tenant_id=current_user.tenant_id,
        email=email,
        name=name,
        role=role,
        password_hash=hash_password(password),
        auth_provider="local",
        is_active=True
    )

    db.add(user)
    await db.commit()
    await db.refresh(user)

    # Log user creation
    await audit_logger.log_user_action(
        action="create",
        target_user_id=user.id,
        user=current_user,
        details={"email": email, "role": role},
        result="success"
    )

    return UserResponse(
        id=user.id,
        email=user.email,
        name=user.name,
        role=user.role,
        tenant_id=user.tenant_id,
        is_active=user.is_active
    )


@router.patch("/users/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: str,
    data: UpdateUserRequest,
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Update a user (requires admin role)"""
    if not current_user.has_permission(Permission.USERS_EDIT):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Permission denied"
        )

    audit_logger = AuditLogger(db)

    # Get user
    result = await db.execute(
        select(User).where(User.id == user_id, User.tenant_id == current_user.tenant_id)
    )
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    # Update fields
    changes = {}
    if data.name is not None:
        user.name = data.name
        changes["name"] = data.name

    if data.role is not None:
        user.role = data.role
        changes["role"] = data.role

    if data.is_active is not None:
        user.is_active = data.is_active
        changes["is_active"] = data.is_active

    await db.commit()
    await db.refresh(user)

    # Log update
    await audit_logger.log_user_action(
        action="update",
        target_user_id=user_id,
        user=current_user,
        details={"changes": changes},
        result="success"
    )

    return UserResponse(
        id=user.id,
        email=user.email,
        name=user.name,
        role=user.role,
        tenant_id=user.tenant_id,
        is_active=user.is_active
    )


@router.delete("/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(
    user_id: str,
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Delete a user (requires admin role)"""
    if not current_user.has_permission(Permission.USERS_DELETE):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Permission denied"
        )

    audit_logger = AuditLogger(db)

    # Get user
    result = await db.execute(
        select(User).where(User.id == user_id, User.tenant_id == current_user.tenant_id)
    )
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    # Don't allow deleting self
    if user.id == current_user.user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete your own account"
        )

    await db.delete(user)
    await db.commit()

    # Log deletion
    await audit_logger.log_user_action(
        action="delete",
        target_user_id=user_id,
        user=current_user,
        details={"email": user.email},
        result="success"
    )

    return None
