# AI Dev Stack: Architecture Patterns

**Purpose**: Define architectural patterns optimized for AI code generation, reasoning, and maintenance.

---

## Core Pattern: Schema-Driven Architecture

**Principle**: A single schema is the source of truth. Everything else is generated.

```
PostgreSQL Schema (DDL)
    ↓ [Alembic Migration]
SQLAlchemy Models (Python classes with types)
    ↓ [Pydantic model_validate]
Pydantic Schemas (API contracts)
    ↓ [FastAPI routes]
OpenAPI Specification (machine-readable API docs)
    ↓ [openapi-typescript-codegen]
TypeScript Types & API Client (frontend)
    ↓ [React components]
UI Components (type-safe)
```

**AI Optimization**: Single source of truth eliminates inconsistencies. AI generates each layer mechanically from schema.

---

## Pattern 1: Explicit Layered Architecture

### Layer 1: Database (PostgreSQL)

**Responsibility**: Data persistence, constraints, relationships

```sql
-- Migration: 001_create_users.sql
CREATE TYPE user_role AS ENUM ('admin', 'user', 'guest');

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role user_role NOT NULL DEFAULT 'user',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    is_active BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT email_format CHECK (email ~* '^[\w\.-]+@[\w\.-]+\.\w+$'),
    CONSTRAINT email_lowercase CHECK (email = LOWER(email))
);

CREATE INDEX idx_users_email ON users(email) WHERE is_active = true;
```

**AI Pattern**: Every table created via Alembic migration. No manual schema changes.

### Layer 2: Models (SQLAlchemy)

**Responsibility**: ORM mapping, database queries

```python
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import String, Boolean, DateTime, Enum
from datetime import datetime
from uuid import UUID, uuid4
import enum

class UserRole(str, enum.Enum):
    """User role enumeration matching database enum"""
    ADMIN = "admin"
    USER = "user"
    GUEST = "guest"

class User(Base):
    """
    User model representing users table.

    This is the ORM representation of the database table.
    All queries should use this model, never raw SQL.
    """
    __tablename__ = "users"

    # Explicit column mappings with full types
    id: Mapped[UUID] = mapped_column(
        primary_key=True,
        default=uuid4,
        nullable=False,
    )
    email: Mapped[str] = mapped_column(
        String(255),
        unique=True,
        nullable=False,
        index=True,
    )
    password_hash: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )
    role: Mapped[UserRole] = mapped_column(
        Enum(UserRole, name="user_role"),
        nullable=False,
        default=UserRole.USER,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=datetime.utcnow,
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=True,
    )

    # Explicit relationships
    api_keys: Mapped[list["ApiKey"]] = relationship(
        "ApiKey",
        back_populates="user",
        cascade="all, delete-orphan",
        lazy="selectin",  # Explicit loading strategy
    )

    def __repr__(self) -> str:
        """Explicit repr for debugging"""
        return f"User(id={self.id}, email={self.email}, role={self.role})"
```

**AI Pattern**: Models mirror database schema exactly. No business logic in models.

### Layer 3: Schemas (Pydantic)

**Responsibility**: Data validation, API contracts, serialization

```python
from pydantic import BaseModel, Field, EmailStr, validator
from datetime import datetime
from uuid import UUID

class UserBase(BaseModel):
    """Base user schema with common fields"""
    email: EmailStr = Field(
        ...,
        description="User email address (must be unique)",
        examples=["user@example.com"],
    )

class UserCreate(UserBase):
    """Schema for creating new user"""
    password: str = Field(
        ...,
        description="User password (will be hashed)",
        min_length=12,
        max_length=128,
        examples=["SecurePassword123!"],
    )
    role: UserRole = Field(
        default=UserRole.USER,
        description="User role (defaults to 'user')",
    )

    @validator("password")
    @classmethod
    def validate_password_strength(cls, v: str) -> str:
        """Validate password meets security requirements"""
        if not any(c.isupper() for c in v):
            raise ValueError("Password must contain uppercase letter")
        if not any(c.islower() for c in v):
            raise ValueError("Password must contain lowercase letter")
        if not any(c.isdigit() for c in v):
            raise ValueError("Password must contain digit")
        return v

class UserUpdate(BaseModel):
    """Schema for updating existing user (all fields optional)"""
    email: EmailStr | None = Field(None, description="Updated email")
    password: str | None = Field(None, min_length=12, max_length=128)
    role: UserRole | None = Field(None, description="Updated role")
    is_active: bool | None = Field(None, description="Updated active status")

class UserResponse(UserBase):
    """Schema for user in API responses (no sensitive data)"""
    id: UUID = Field(..., description="User unique identifier")
    role: UserRole = Field(..., description="User role")
    created_at: datetime = Field(..., description="Account creation time")
    is_active: bool = Field(..., description="Account active status")

    class Config:
        """Pydantic configuration"""
        from_attributes = True  # Enable ORM mode
        json_encoders = {
            datetime: lambda v: v.isoformat(),
            UUID: lambda v: str(v),
        }
```

**AI Pattern**: Three schema types per entity: Create, Update, Response. Base schema for shared fields.

### Layer 4: Services (Business Logic)

**Responsibility**: Business logic, orchestration, error handling

```python
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Protocol

# Explicit service protocol (interface)
class UserServiceProtocol(Protocol):
    """Protocol defining user service interface"""

    async def create_user(self, user_data: UserCreate) -> User:
        """Create new user"""
        ...

    async def get_user(self, user_id: UUID) -> User | None:
        """Get user by ID"""
        ...

    async def update_user(
        self,
        user_id: UUID,
        update_data: UserUpdate,
    ) -> User:
        """Update user"""
        ...

    async def delete_user(self, user_id: UUID) -> None:
        """Delete user"""
        ...

class UserService:
    """
    User service implementing business logic.

    This service encapsulates all user-related operations.
    It handles validation, authorization, and error handling.
    All database operations go through this service.
    """

    def __init__(self, db: AsyncSession):
        """
        Initialize service with database session.

        Args:
            db: Async database session
        """
        self.db: AsyncSession = db

    async def create_user(self, user_data: UserCreate) -> User:
        """
        Create new user account.

        Business logic:
        1. Check email not already registered
        2. Hash password securely
        3. Create user record
        4. Return created user

        Args:
            user_data: Validated user creation data

        Returns:
            Created user instance

        Raises:
            UserAlreadyExistsError: If email registered
            DatabaseError: If database operation fails
        """
        # Step 1: Check existence
        existing_user: User | None = await self._get_user_by_email(
            email=user_data.email
        )

        if existing_user is not None:
            raise UserAlreadyExistsError(email=user_data.email)

        # Step 2: Hash password
        password_hash: str = self._hash_password(password=user_data.password)

        # Step 3: Create user
        user: User = User(
            email=user_data.email.lower(),  # Normalize email
            password_hash=password_hash,
            role=user_data.role,
        )

        try:
            self.db.add(user)
            await self.db.commit()
            await self.db.refresh(user)
        except IntegrityError as e:
            await self.db.rollback()
            raise UserAlreadyExistsError(email=user_data.email) from e
        except SQLAlchemyError as e:
            await self.db.rollback()
            raise DatabaseError("Failed to create user") from e

        # Step 4: Return
        return user

    async def _get_user_by_email(self, email: str) -> User | None:
        """
        Internal helper to get user by email.

        Args:
            email: Email address to search

        Returns:
            User if found, None otherwise
        """
        result = await self.db.execute(
            select(User).where(User.email == email.lower())
        )
        user: User | None = result.scalar_one_or_none()
        return user

    def _hash_password(self, password: str) -> str:
        """
        Hash password securely.

        Args:
            password: Plain text password

        Returns:
            Bcrypt password hash
        """
        import bcrypt

        password_bytes: bytes = password.encode("utf-8")
        salt: bytes = bcrypt.gensalt()
        password_hash: bytes = bcrypt.hashpw(password_bytes, salt)
        return password_hash.decode("utf-8")
```

**AI Pattern**:
- Services contain ALL business logic
- Services are the only layer that touches models
- Services have explicit error handling
- Internal helpers are prefixed with `_`

### Layer 5: Routes (API Endpoints)

**Responsibility**: HTTP handling, request/response transformation

```python
from fastapi import APIRouter, Depends, HTTPException, status
from typing import Annotated

router = APIRouter(
    prefix="/api/users",
    tags=["users"],
)

# Explicit dependency types
DatabaseDep = Annotated[AsyncSession, Depends(get_db)]

@router.post(
    "",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
    responses={
        201: {"description": "User created successfully"},
        409: {"description": "Email already registered"},
        500: {"description": "Server error"},
    },
)
async def create_user(
    user_data: UserCreate,
    db: DatabaseDep,
) -> UserResponse:
    """
    Create new user endpoint.

    This endpoint handles user registration.
    It validates input, creates user, and returns user data.

    Args:
        user_data: User creation data (validated by Pydantic)
        db: Database session (injected)

    Returns:
        Created user data

    Raises:
        HTTPException(409): If email already registered
        HTTPException(500): If server error
    """
    service: UserService = UserService(db=db)

    try:
        user: User = await service.create_user(user_data=user_data)
        response: UserResponse = UserResponse.model_validate(user)
        return response

    except UserAlreadyExistsError as e:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "error_type": "USER_ALREADY_EXISTS",
                "message": str(e),
                "details": {"email": e.email},
            },
        )

    except DatabaseError as e:
        logger.error(f"Database error: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "error_type": "DATABASE_ERROR",
                "message": "Failed to create user",
            },
        )
```

**AI Pattern**:
- Routes are THIN - only HTTP handling
- All logic delegated to services
- Explicit error mapping to HTTP codes
- Comprehensive OpenAPI metadata

---

## Pattern 2: Dependency Injection

**AI Advantage**: Explicit dependencies make testing and reasoning easier.

```python
# dependencies.py

from typing import AsyncGenerator, Annotated
from fastapi import Depends, Header, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """
    Dependency providing database session.

    Yields:
        Database session

    Ensures:
        Session is closed after request
    """
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()

async def get_current_user(
    token: Annotated[str, Header(alias="Authorization")],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> User:
    """
    Dependency providing current authenticated user.

    Args:
        token: JWT token from Authorization header
        db: Database session

    Returns:
        Authenticated user

    Raises:
        HTTPException(401): If token invalid or user not found
    """
    if not token.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authorization header format",
        )

    token_value: str = token[7:]  # Remove "Bearer " prefix

    try:
        payload: dict[str, Any] = decode_jwt(token_value)
        user_id: UUID = UUID(payload["user_id"])

    except (KeyError, ValueError, JWTError) as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
        ) from e

    user_service: UserService = UserService(db=db)
    user: User | None = await user_service.get_user(user_id=user_id)

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive",
        )

    return user

# Type aliases for reuse
DatabaseDep = Annotated[AsyncSession, Depends(get_db)]
CurrentUserDep = Annotated[User, Depends(get_current_user)]

# Usage in routes:
@router.get("/me")
async def get_current_user_endpoint(
    current_user: CurrentUserDep,
) -> UserResponse:
    """Get current user's data"""
    return UserResponse.model_validate(current_user)
```

**AI Pattern**: All dependencies explicitly typed and documented.

---

## Pattern 3: Explicit Error Hierarchy

```python
# exceptions.py

class ApplicationError(Exception):
    """Base exception for all application errors"""
    def __init__(self, message: str):
        self.message: str = message
        super().__init__(message)

class DatabaseError(ApplicationError):
    """Database operation errors"""
    pass

class NotFoundError(ApplicationError):
    """Resource not found errors"""
    def __init__(self, resource_type: str, resource_id: str | UUID):
        self.resource_type: str = resource_type
        self.resource_id: str = str(resource_id)
        super().__init__(
            f"{resource_type} with id {resource_id} not found"
        )

class AlreadyExistsError(ApplicationError):
    """Resource already exists errors"""
    def __init__(self, resource_type: str, identifier: str):
        self.resource_type: str = resource_type
        self.identifier: str = identifier
        super().__init__(
            f"{resource_type} with {identifier} already exists"
        )

class AuthenticationError(ApplicationError):
    """Authentication errors"""
    pass

class AuthorizationError(ApplicationError):
    """Authorization errors"""
    def __init__(self, action: str, resource_type: str):
        self.action: str = action
        self.resource_type: str = resource_type
        super().__init__(
            f"Not authorized to {action} {resource_type}"
        )

# Specific errors inherit from base errors
class UserNotFoundError(NotFoundError):
    """User not found error"""
    def __init__(self, user_id: UUID):
        self.user_id: UUID = user_id
        super().__init__("User", user_id)

class UserAlreadyExistsError(AlreadyExistsError):
    """User already exists error"""
    def __init__(self, email: str):
        self.email: str = email
        super().__init__("User", f"email={email}")
```

**AI Pattern**: Hierarchical errors with explicit attributes for all context.

---

## Pattern 4: Configuration as Code

```python
# config.py

from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache

class Settings(BaseSettings):
    """
    Application settings loaded from environment.

    All configuration comes from environment variables.
    No hardcoded configuration allowed.
    """
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )

    # Database
    database_url: str = Field(
        ...,
        description="PostgreSQL connection URL",
        examples=["postgresql+asyncpg://user:pass@localhost/db"],
    )
    database_pool_size: int = Field(
        default=5,
        ge=1,
        le=20,
        description="Database connection pool size",
    )

    # Security
    jwt_secret_key: str = Field(
        ...,
        description="Secret key for JWT signing (must be secure random)",
        min_length=32,
    )
    jwt_algorithm: str = Field(
        default="HS256",
        description="JWT signing algorithm",
    )
    jwt_expiration_minutes: int = Field(
        default=60,
        ge=5,
        le=10080,
        description="JWT token expiration in minutes",
    )

    # Application
    app_name: str = Field(
        default="AI Dev Stack API",
        description="Application name",
    )
    app_version: str = Field(
        default="1.0.0",
        description="Application version",
    )
    debug: bool = Field(
        default=False,
        description="Debug mode (never true in production)",
    )

    @validator("jwt_secret_key")
    @classmethod
    def validate_secret_key_strength(cls, v: str) -> str:
        """Validate secret key is cryptographically strong"""
        if len(v) < 32:
            raise ValueError("Secret key must be at least 32 characters")
        return v

@lru_cache
def get_settings() -> Settings:
    """
    Get cached settings instance.

    Returns:
        Application settings

    Note:
        Settings are cached after first load.
    """
    return Settings()
```

**AI Pattern**: All config is typed, validated, and environment-based.

---

## Pattern 5: Testing Patterns

```python
# conftest.py

import pytest
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker
from httpx import AsyncClient
from fastapi import FastAPI

@pytest.fixture
async def db_engine():
    """Create test database engine"""
    engine = create_async_engine(
        "postgresql+asyncpg://test:test@localhost/test_db",
        echo=False,
    )

    # Create tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    yield engine

    # Drop tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)

    await engine.dispose()

@pytest.fixture
async def db_session(db_engine) -> AsyncSession:
    """Create test database session"""
    SessionLocal = sessionmaker(
        db_engine,
        class_=AsyncSession,
        expire_on_commit=False,
    )

    async with SessionLocal() as session:
        yield session

@pytest.fixture
async def test_user(db_session: AsyncSession) -> User:
    """Create test user"""
    user: User = User(
        email="test@example.com",
        password_hash="hashed_password",
        role=UserRole.USER,
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user

@pytest.fixture
async def api_client(app: FastAPI) -> AsyncClient:
    """Create test API client"""
    async with AsyncClient(app=app, base_url="http://test") as client:
        yield client
```

**AI Pattern**: Comprehensive fixtures for every test scenario.

---

## Summary: Architecture Checklist

- [ ] Database schema is single source of truth
- [ ] Models mirror database exactly (no business logic)
- [ ] Three Pydantic schemas per entity (Create, Update, Response)
- [ ] All business logic in service layer
- [ ] Routes are thin HTTP handlers only
- [ ] Explicit dependency injection everywhere
- [ ] Hierarchical error types with context
- [ ] All configuration from environment (Pydantic Settings)
- [ ] Comprehensive test fixtures for all layers
- [ ] Clear separation of concerns (no layer skipping)
