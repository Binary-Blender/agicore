# AI Dev Stack: Quick Start Guide

**For AI Developers**: These are the rules you can implement IMMEDIATELY on every project.

---

## Immediate Rules (Implement Today)

### Rule 1: Explicit Types Everywhere

```python
# ❌ NEVER
def get_user(id):
    return db.query(User).get(id)

# ✅ ALWAYS
def get_user(user_id: UUID) -> User | None:
    """
    Get user by ID.

    Args:
        user_id: User UUID

    Returns:
        User if found, None otherwise
    """
    result: User | None = db.query(User).filter(User.id == user_id).first()
    return result
```

### Rule 2: Comprehensive Docstrings

**Minimum required**:
- One-sentence description
- Args section with types and descriptions
- Returns section with type and description
- Raises section with all possible exceptions

```python
def create_user(email: str, password: str) -> User:
    """
    Create a new user account.

    Args:
        email: User email address (must be unique)
        password: Plain text password (will be hashed)

    Returns:
        Created user instance

    Raises:
        UserAlreadyExistsError: If email already registered
        ValidationError: If email or password invalid
        DatabaseError: If database operation fails
    """
    # implementation
```

### Rule 3: Explicit Error Handling

```python
# ❌ NEVER
try:
    user = create_user(email, password)
except:
    print("Error")

# ✅ ALWAYS
try:
    user: User = create_user(email=email, password=password)
except UserAlreadyExistsError as e:
    logger.error(f"User already exists: {e.email}")
    raise
except ValidationError as e:
    logger.error(f"Validation error: {e.field} = {e.invalid_value}")
    raise
except DatabaseError as e:
    logger.error(f"Database error: {e}", exc_info=True)
    raise
```

### Rule 4: No Magic Values

```python
# ❌ NEVER
if user.role == "admin":
    timeout = 3600

# ✅ ALWAYS
class UserRole(str, Enum):
    ADMIN = "admin"
    USER = "user"

ADMIN_TIMEOUT_SECONDS: int = 3600

if user.role == UserRole.ADMIN:
    timeout: int = ADMIN_TIMEOUT_SECONDS
```

### Rule 5: Explicit Null Checks

```python
# ❌ NEVER
return user.email.lower()

# ✅ ALWAYS
if user.email is None:
    raise ValueError("User email is required")

email: str = user.email.lower()
return email
```

---

## Python Configuration (Copy-Paste Ready)

### pyproject.toml

```toml
[tool.poetry]
name = "project"
version = "0.1.0"
description = ""
authors = []

[tool.poetry.dependencies]
python = "^3.11"
fastapi = "^0.104.0"
sqlalchemy = {extras = ["asyncio"], version = "^2.0"}
pydantic = "^2.5"
pydantic-settings = "^2.1"
alembic = "^1.12"
asyncpg = "^0.29"
python-jose = {extras = ["cryptography"], version = "^3.3"}
passlib = {extras = ["bcrypt"], version = "^1.7"}
python-multipart = "^0.0.6"

[tool.poetry.group.dev.dependencies]
pytest = "^7.4"
pytest-asyncio = "^0.21"
pytest-cov = "^4.1"
hypothesis = "^6.92"
httpx = "^0.25"
mypy = "^1.7"
ruff = "^0.1"
black = "^23.11"

[tool.mypy]
python_version = "3.11"
strict = true
warn_return_any = true
warn_unused_configs = true
disallow_untyped_defs = true
disallow_any_unimplemented = true
check_untyped_defs = true
disallow_untyped_decorators = true
warn_redundant_casts = true
warn_unused_ignores = true
warn_no_return = true
warn_unreachable = true
strict_equality = true
strict_optional = true

[tool.ruff]
select = ["ALL"]
ignore = [
    "D203",    # one-blank-line-before-class
    "D213",    # multi-line-summary-second-line
]

[tool.pytest.ini_options]
asyncio_mode = "auto"
testpaths = ["tests"]
python_files = ["test_*.py"]
python_classes = ["Test*"]
python_functions = ["test_*"]
addopts = "--cov=app --cov-report=term-missing --cov-report=html --cov-fail-under=90"

[tool.coverage.run]
source = ["app"]
omit = ["tests/*", "**/__pycache__/*", "**/.venv/*"]

[build-system]
requires = ["poetry-core"]
build-backend = "poetry.core.masonry.api"
```

### TypeScript Configuration (tsconfig.json)

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "allowJs": false,
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "noImplicitOverride": true,
    "allowUnusedLabels": false,
    "allowUnreachableCode": false,
    "exactOptionalPropertyTypes": true,
    "noPropertyAccessFromIndexSignature": true,
    "verbatimModuleSyntax": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "jsx": "react-jsx"
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist"]
}
```

---

## Pre-Commit Checklist

Before committing ANY code, verify:

```bash
# Python
mypy .                 # Type checking
ruff check .          # Linting
black . --check       # Formatting check
pytest                # All tests pass

# TypeScript
npm run type-check    # tsc --noEmit
npm run lint          # eslint
npm run format:check  # prettier --check
npm run test          # vitest
```

**All must pass. No exceptions.**

---

## File Template: Python Service

```python
"""
User service module.

This module contains the UserService class which handles all
user-related business logic.
"""

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from uuid import UUID
from typing import Protocol

from app.models.user import User
from app.schemas.user import UserCreate, UserUpdate
from app.exceptions import (
    UserNotFoundError,
    UserAlreadyExistsError,
    DatabaseError,
)


class UserServiceProtocol(Protocol):
    """Protocol defining user service interface"""

    async def create_user(self, user_data: UserCreate) -> User:
        """Create new user"""
        ...


class UserService:
    """
    User service handling user operations.

    This service encapsulates all user-related business logic
    including creation, retrieval, updates, and deletion.
    """

    def __init__(self, db: AsyncSession):
        """
        Initialize service.

        Args:
            db: Database session
        """
        self.db: AsyncSession = db

    async def create_user(self, user_data: UserCreate) -> User:
        """
        Create new user.

        Args:
            user_data: Validated user creation data

        Returns:
            Created user instance

        Raises:
            UserAlreadyExistsError: If email already registered
            DatabaseError: If database operation fails
        """
        # Implementation here
        pass
```

---

## File Template: FastAPI Route

```python
"""
User API routes.

This module defines all HTTP endpoints for user operations.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from typing import Annotated
from uuid import UUID

from app.dependencies import get_db, get_current_user
from app.schemas.user import UserCreate, UserUpdate, UserResponse
from app.services.user_service import UserService
from app.models.user import User
from app.exceptions import UserAlreadyExistsError

router = APIRouter(
    prefix="/api/users",
    tags=["users"],
)

DatabaseDep = Annotated[AsyncSession, Depends(get_db)]
CurrentUserDep = Annotated[User, Depends(get_current_user)]


@router.post(
    "",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
    responses={
        201: {"description": "User created successfully"},
        409: {"description": "Email already registered"},
    },
)
async def create_user(
    user_data: UserCreate,
    db: DatabaseDep,
) -> UserResponse:
    """
    Create new user endpoint.

    Args:
        user_data: User creation data
        db: Database session

    Returns:
        Created user data

    Raises:
        HTTPException(409): If email already registered
    """
    service: UserService = UserService(db=db)

    try:
        user: User = await service.create_user(user_data=user_data)
        return UserResponse.model_validate(user)

    except UserAlreadyExistsError as e:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "error_type": "USER_ALREADY_EXISTS",
                "message": str(e),
                "details": {"email": e.email},
            },
        )
```

---

## File Template: Test

```python
"""
Tests for user service.

This module contains comprehensive tests for all UserService methods.
"""

import pytest
from uuid import UUID

from app.services.user_service import UserService
from app.schemas.user import UserCreate
from app.models.user import User
from app.exceptions import UserAlreadyExistsError


class TestUserService:
    """Test suite for UserService"""

    async def test_create_user_success(
        self,
        db_session: AsyncSession,
    ) -> None:
        """
        Test successful user creation.

        Scenario:
            - Valid user data provided
            - Email not already registered

        Expected:
            - User created in database
            - User has expected attributes
        """
        # Arrange
        user_data: UserCreate = UserCreate(
            email="test@example.com",
            password="SecurePassword123",
        )
        service: UserService = UserService(db=db_session)

        # Act
        user: User = await service.create_user(user_data=user_data)

        # Assert
        assert user.id is not None
        assert user.email == "test@example.com"
        assert user.is_active is True
```

---

## Common Patterns Quick Reference

### Pattern: Optional Return

```python
def get_user(user_id: UUID) -> User | None:
    """Return User or None if not found"""
    pass
```

### Pattern: Error Raising

```python
def get_user_or_raise(user_id: UUID) -> User:
    """
    Return User or raise error.

    Raises:
        UserNotFoundError: If user doesn't exist
    """
    user: User | None = get_user(user_id)

    if user is None:
        raise UserNotFoundError(user_id=user_id)

    return user
```

### Pattern: List Return

```python
def list_users(limit: int = 100, offset: int = 0) -> list[User]:
    """Return list of users (empty list if none)"""
    pass
```

### Pattern: Async Function

```python
async def async_operation() -> ResultType:
    """
    Async operation.

    Always use explicit return type annotation.
    """
    result: ResultType = await some_async_call()
    return result
```

---

## AI Generation Commands

### Generate Model from Migration

```
I have this Alembic migration: [paste migration]

Generate a SQLAlchemy 2.0 model following ai_dev_stack standards:
- Mapped[] annotations
- Explicit types
- Comprehensive docstring
- Python enum for DB enums
```

### Generate Tests

```
I have this service method: [paste method]

Generate comprehensive tests following ai_dev_stack standards:
- Success test
- Error test for each exception
- Property test with hypothesis
- Full AAA pattern
```

### Generate API Route

```
I have these schemas: [paste schemas]

Generate FastAPI CRUD routes following ai_dev_stack standards:
- Explicit types
- Comprehensive docstrings
- Error handling
- Response models
```

---

## Summary: What Changes TODAY

1. ✅ Add type annotations to EVERY function
2. ✅ Add comprehensive docstrings to EVERY function
3. ✅ Add explicit error handling (no bare except)
4. ✅ Replace magic values with typed constants/enums
5. ✅ Add explicit null checks
6. ✅ Configure mypy/ruff/tsc in strict mode
7. ✅ Write tests alongside code (not after)
8. ✅ Aim for 100% test coverage

**These rules apply to every line of code written from now on.**

**No exceptions. No compromises. No "I'll fix it later."**
