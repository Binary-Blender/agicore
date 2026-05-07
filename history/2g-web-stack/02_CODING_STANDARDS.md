# AI Dev Stack: Coding Standards

**Purpose**: Define explicit, comprehensive coding standards optimized for AI code generation and AI code reading.

**Principle**: If it can be stated explicitly, it must be. If it can be checked by a machine, it will be.

---

## Universal Rules (All Languages)

### Rule 1: Explicit Types Everywhere

**Bad** (implicit types):
```python
def get_user(id):
    return db.query(User).filter(User.id == id).first()
```

**Good** (explicit types):
```python
def get_user(id: UUID) -> User | None:
    """
    Retrieve a user by ID.

    Args:
        id: User UUID identifier

    Returns:
        User instance if found, None otherwise
    """
    result: User | None = db.query(User).filter(User.id == id).first()
    return result
```

**Requirements**:
- Every function parameter has type annotation
- Every function return has type annotation
- Every variable assignment includes type annotation when not obvious
- Use explicit `None` in union types (e.g., `User | None`, not `Optional[User]`)

### Rule 2: Explicit Error Handling

**Bad** (silent failures):
```python
def create_user(email: str) -> User:
    user = User(email=email)
    db.add(user)
    db.commit()
    return user
```

**Good** (explicit error handling):
```python
class UserCreationError(Exception):
    """Raised when user creation fails"""
    pass

class UserAlreadyExistsError(UserCreationError):
    """Raised when email already registered"""
    def __init__(self, email: str):
        self.email: str = email
        super().__init__(f"User with email {email} already exists")

def create_user(email: str) -> User:
    """
    Create a new user.

    Args:
        email: User email address (must be unique)

    Returns:
        Created user instance

    Raises:
        UserAlreadyExistsError: If email already registered
        DatabaseError: If database operation fails
    """
    existing_user: User | None = db.query(User).filter(User.email == email).first()

    if existing_user is not None:
        raise UserAlreadyExistsError(email=email)

    user: User = User(email=email)

    try:
        db.add(user)
        db.commit()
        db.refresh(user)
    except IntegrityError as e:
        db.rollback()
        raise UserAlreadyExistsError(email=email) from e
    except SQLAlchemyError as e:
        db.rollback()
        raise DatabaseError("Failed to create user in database") from e

    return user
```

**Requirements**:
- Every possible error case has explicit exception type
- Every exception includes relevant context as attributes
- Every function documents all exceptions it can raise
- No bare `except:` clauses
- Always use `from e` when re-raising to preserve stack trace

### Rule 3: Comprehensive Documentation

**Bad** (no documentation):
```python
def process(data, mode=1):
    if mode == 1:
        return data.upper()
    return data.lower()
```

**Good** (comprehensive documentation):
```python
class ProcessingMode(IntEnum):
    """Text processing modes"""
    UPPERCASE = 1
    LOWERCASE = 2

def process_text(
    data: str,
    mode: ProcessingMode = ProcessingMode.UPPERCASE,
) -> str:
    """
    Process text according to specified mode.

    This function transforms input text based on the processing mode.
    Default behavior is to convert to uppercase.

    Args:
        data: Input text to process (must be non-empty)
        mode: Processing mode (defaults to UPPERCASE)

    Returns:
        Processed text string

    Raises:
        ValueError: If data is empty string

    Examples:
        >>> process_text("hello", ProcessingMode.UPPERCASE)
        "HELLO"
        >>> process_text("WORLD", ProcessingMode.LOWERCASE)
        "world"
    """
    if len(data) == 0:
        raise ValueError("Input data cannot be empty string")

    if mode == ProcessingMode.UPPERCASE:
        result: str = data.upper()
        return result
    elif mode == ProcessingMode.LOWERCASE:
        result: str = data.lower()
        return result
    else:
        raise ValueError(f"Unknown processing mode: {mode}")
```

**Requirements**:
- Every function has comprehensive docstring
- Docstring includes: description, args, returns, raises, examples
- Every class has docstring explaining purpose
- Every module has docstring explaining contents
- Complex logic has inline comments explaining "why", not "what"

### Rule 4: No Magic Numbers or Strings

**Bad** (magic values):
```python
if user.role == "admin":
    timeout = 3600
else:
    timeout = 300
```

**Good** (explicit constants):
```python
class UserRole(str, Enum):
    """User role types"""
    ADMIN = "admin"
    USER = "user"
    GUEST = "guest"

# Timeout durations in seconds
ADMIN_SESSION_TIMEOUT_SECONDS: int = 3600  # 1 hour
USER_SESSION_TIMEOUT_SECONDS: int = 300    # 5 minutes

def get_session_timeout(user_role: UserRole) -> int:
    """
    Get session timeout duration for user role.

    Args:
        user_role: User's role

    Returns:
        Timeout duration in seconds
    """
    if user_role == UserRole.ADMIN:
        return ADMIN_SESSION_TIMEOUT_SECONDS
    else:
        return USER_SESSION_TIMEOUT_SECONDS
```

**Requirements**:
- No hardcoded strings except in constant definitions
- No hardcoded numbers except in constant definitions
- All constants have SCREAMING_SNAKE_CASE names
- All constants have type annotations
- All constants have comments explaining value/units

### Rule 5: Explicit Null Handling

**Bad** (implicit null handling):
```typescript
function getUserEmail(user) {
    return user.email.toLowerCase();
}
```

**Good** (explicit null handling):
```typescript
interface User {
    readonly email: string | null;
    readonly id: string;
}

class UserEmailNotFoundError extends Error {
    constructor(public readonly userId: string) {
        super(`User ${userId} has no email address`);
        this.name = 'UserEmailNotFoundError';
    }
}

function getUserEmail(user: User): string {
    /**
     * Get user's email address in lowercase.
     *
     * @param user - User object
     * @returns Lowercase email address
     * @throws {UserEmailNotFoundError} If user has no email
     */
    if (user.email === null) {
        throw new UserEmailNotFoundError(user.id);
    }

    const lowercaseEmail: string = user.email.toLowerCase();
    return lowercaseEmail;
}
```

**Requirements**:
- Every nullable value explicitly checked before use
- Use `| null` or `| undefined`, never `?` alone in TypeScript
- No `!` non-null assertions in TypeScript without comment justification
- Explicit error on null when null is invalid

---

## Python-Specific Standards

### Type Annotations

```python
from typing import (
    Any,
    TypedDict,
    NotRequired,
    Literal,
    TypeAlias,
    Generic,
    TypeVar,
    Protocol,
)
from collections.abc import Sequence, Mapping, Callable, AsyncIterator

# Use modern union syntax (3.10+)
def get_user(user_id: UUID) -> User | None:  # Good
def get_user(user_id: UUID) -> Optional[User]:  # Bad - use | None

# Explicit collection types
def process_users(users: Sequence[User]) -> list[User]:  # Good
def process_users(users):  # Bad - no types

# Explicit mapping types
UserCache: TypeAlias = Mapping[UUID, User]  # Good

def get_cache() -> UserCache:
    cache: dict[UUID, User] = {}
    return cache

# Explicit callable types
UserValidator: TypeAlias = Callable[[User], bool]

def filter_users(
    users: Sequence[User],
    validator: UserValidator,
) -> list[User]:
    """Filter users using validator function"""
    filtered_users: list[User] = [
        user for user in users if validator(user)
    ]
    return filtered_users
```

### Pydantic Models

```python
from pydantic import BaseModel, Field, validator, root_validator
from datetime import datetime
from uuid import UUID

class UserBase(BaseModel):
    """Base user model with common fields"""
    email: str = Field(
        ...,
        description="User email address",
        pattern=r"^[\w\.-]+@[\w\.-]+\.\w+$",
        min_length=5,
        max_length=255,
    )

class UserCreate(UserBase):
    """User creation request model"""
    password: str = Field(
        ...,
        description="User password (plain text, will be hashed)",
        min_length=12,
        max_length=128,
    )
    role: UserRole = Field(
        default=UserRole.USER,
        description="User role (defaults to USER)",
    )

    @validator("password")
    @classmethod
    def validate_password_strength(cls, v: str) -> str:
        """
        Validate password meets strength requirements.

        Args:
            v: Password to validate

        Returns:
            Password if valid

        Raises:
            ValueError: If password doesn't meet requirements
        """
        if not any(c.isupper() for c in v):
            raise ValueError("Password must contain uppercase letter")
        if not any(c.islower() for c in v):
            raise ValueError("Password must contain lowercase letter")
        if not any(c.isdigit() for c in v):
            raise ValueError("Password must contain digit")

        return v

class UserResponse(UserBase):
    """User response model (no sensitive data)"""
    id: UUID = Field(..., description="User unique identifier")
    role: UserRole = Field(..., description="User role")
    created_at: datetime = Field(..., description="Account creation timestamp")
    is_active: bool = Field(..., description="Account active status")

    class Config:
        """Pydantic model configuration"""
        from_attributes = True  # Allow from ORM models
        json_encoders = {
            datetime: lambda v: v.isoformat(),
            UUID: lambda v: str(v),
        }
```

### Service Layer Pattern

```python
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Protocol

class UserServiceProtocol(Protocol):
    """Protocol defining user service interface"""

    async def create_user(self, user_data: UserCreate) -> User:
        """Create a new user"""
        ...

    async def get_user(self, user_id: UUID) -> User | None:
        """Get user by ID"""
        ...

    async def list_users(
        self,
        limit: int = 100,
        offset: int = 0,
    ) -> list[User]:
        """List users with pagination"""
        ...

class UserService:
    """
    User service handling user-related business logic.

    This service encapsulates all user operations including creation,
    retrieval, updates, and deletion. It handles validation, error
    handling, and database interactions.
    """

    def __init__(self, db: AsyncSession):
        """
        Initialize user service.

        Args:
            db: Database session for queries
        """
        self.db: AsyncSession = db

    async def create_user(self, user_data: UserCreate) -> User:
        """
        Create a new user account.

        Args:
            user_data: Validated user creation data

        Returns:
            Created user instance

        Raises:
            UserAlreadyExistsError: If email already registered
            DatabaseError: If database operation fails
        """
        # Implementation here (see earlier example)
        pass

    async def get_user(self, user_id: UUID) -> User | None:
        """
        Retrieve user by ID.

        Args:
            user_id: User UUID

        Returns:
            User instance if found, None otherwise

        Raises:
            DatabaseError: If database query fails
        """
        try:
            result = await self.db.execute(
                select(User).where(User.id == user_id)
            )
            user: User | None = result.scalar_one_or_none()
            return user

        except SQLAlchemyError as e:
            raise DatabaseError(f"Failed to retrieve user {user_id}") from e
```

### FastAPI Routes

```python
from fastapi import APIRouter, Depends, HTTPException, status, Header
from typing import Annotated

router = APIRouter(
    prefix="/api/users",
    tags=["users"],
)

# Explicit dependency types
DatabaseDep = Annotated[AsyncSession, Depends(get_db)]
CurrentUserDep = Annotated[User, Depends(get_current_user)]

@router.post(
    "",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
    responses={
        201: {"description": "User created successfully"},
        400: {"model": ErrorResponse, "description": "Validation error"},
        409: {"model": ErrorResponse, "description": "User already exists"},
        500: {"model": ErrorResponse, "description": "Server error"},
    },
    summary="Create a new user",
    description="Create a new user account with email and password",
)
async def create_user_endpoint(
    user_data: UserCreate,
    db: DatabaseDep,
    request_id: Annotated[str | None, Header()] = None,
) -> UserResponse:
    """
    Create a new user account.

    This endpoint creates a new user with the provided email and password.
    The password will be securely hashed before storage.

    Args:
        user_data: User creation data (validated by Pydantic)
        db: Database session (injected)
        request_id: Optional request tracking ID from header

    Returns:
        Created user data (without sensitive information)

    Raises:
        HTTPException(400): If validation fails
        HTTPException(409): If email already registered
        HTTPException(500): If server error occurs
    """
    user_service: UserService = UserService(db=db)

    try:
        user: User = await user_service.create_user(user_data=user_data)
        response: UserResponse = UserResponse.model_validate(user)
        return response

    except UserAlreadyExistsError as e:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "error_type": "USER_ALREADY_EXISTS",
                "error_message": str(e),
                "error_details": {"email": e.email},
                "timestamp": datetime.utcnow().isoformat(),
                "request_id": request_id or "unknown",
            },
        )

    except DatabaseError as e:
        # Log error with full context
        logger.error(
            "Database error creating user",
            extra={
                "email": user_data.email,
                "error": str(e),
                "request_id": request_id,
            },
            exc_info=True,
        )

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "error_type": "DATABASE_ERROR",
                "error_message": "Failed to create user",
                "timestamp": datetime.utcnow().isoformat(),
                "request_id": request_id or "unknown",
            },
        )
```

---

## TypeScript-Specific Standards

### Strict Type Configuration

```typescript
// Every file uses strict mode via tsconfig.json

// Explicit types on everything
interface User {
    readonly id: string;
    readonly email: string;
    readonly role: UserRole;
    readonly createdAt: Date;
}

// No `any` - use `unknown` and narrow
function processData(data: unknown): User {
    if (!isUser(data)) {
        throw new TypeError("Invalid user data");
    }
    return data;
}

// Type guards are explicit
function isUser(value: unknown): value is User {
    return (
        typeof value === "object" &&
        value !== null &&
        "id" in value &&
        typeof value.id === "string" &&
        "email" in value &&
        typeof value.email === "string" &&
        "role" in value &&
        isUserRole(value.role) &&
        "createdAt" in value &&
        value.createdAt instanceof Date
    );
}

function isUserRole(value: unknown): value is UserRole {
    return (
        value === "admin" ||
        value === "user" ||
        value === "guest"
    );
}
```

### React Components

```typescript
import { useState, useCallback, useEffect } from "react";

// Explicit prop types
interface UserListProps {
    readonly initialUsers: ReadonlyArray<User>;
    readonly onUserClick: (userId: string) => void;
    readonly currentUserRole: UserRole;
}

// Explicit state types
interface UserListState {
    readonly users: ReadonlyArray<User>;
    readonly loading: boolean;
    readonly error: Error | null;
}

/**
 * User list component displaying all users.
 *
 * @param props - Component props
 * @returns Rendered user list
 */
export function UserList({
    initialUsers,
    onUserClick,
    currentUserRole,
}: UserListProps): JSX.Element {
    const [users, setUsers] = useState<ReadonlyArray<User>>(initialUsers);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<Error | null>(null);

    // Explicit callback with full types
    const handleRefresh = useCallback(async (): Promise<void> => {
        setLoading(true);
        setError(null);

        try {
            const response: Response = await fetch("/api/users");

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data: unknown = await response.json();

            if (!isUserListResponse(data)) {
                throw new TypeError("Invalid user list response");
            }

            setUsers(data.users);

        } catch (err: unknown) {
            if (err instanceof Error) {
                setError(err);
            } else {
                setError(new Error("Unknown error occurred"));
            }
        } finally {
            setLoading(false);
        }
    }, []);

    // Explicit effect with dependencies
    useEffect((): void => {
        // Initial fetch if needed
        if (initialUsers.length === 0) {
            void handleRefresh();
        }
    }, [initialUsers.length, handleRefresh]);

    // Explicit render conditions
    if (error !== null) {
        return (
            <div className="error-container">
                <h2>Error Loading Users</h2>
                <p>{error.message}</p>
                <button onClick={() => void handleRefresh()}>
                    Retry
                </button>
            </div>
        );
    }

    if (loading) {
        return <LoadingSpinner />;
    }

    return (
        <div className="user-list">
            {users.map((user: User): JSX.Element => (
                <UserCard
                    key={user.id}
                    user={user}
                    onClick={() => onUserClick(user.id)}
                    canEdit={currentUserRole === "admin"}
                />
            ))}
        </div>
    );
}

// Type guard for API response
function isUserListResponse(value: unknown): value is { users: Array<User> } {
    return (
        typeof value === "object" &&
        value !== null &&
        "users" in value &&
        Array.isArray(value.users) &&
        value.users.every(isUser)
    );
}
```

### Error Handling

```typescript
// Explicit error classes
class ApiError extends Error {
    constructor(
        message: string,
        public readonly statusCode: number,
        public readonly errorType: string,
        public readonly details?: Record<string, unknown>,
    ) {
        super(message);
        this.name = "ApiError";
    }
}

class UserNotFoundError extends ApiError {
    constructor(userId: string) {
        super(
            `User ${userId} not found`,
            404,
            "USER_NOT_FOUND",
            { userId },
        );
        this.name = "UserNotFoundError";
    }
}

// Explicit error handling in async functions
async function getUser(userId: string): Promise<User> {
    /**
     * Fetch user by ID from API.
     *
     * @param userId - User UUID
     * @returns User data
     * @throws {UserNotFoundError} If user doesn't exist
     * @throws {ApiError} If API request fails
     */
    const response: Response = await fetch(`/api/users/${userId}`);

    if (response.status === 404) {
        throw new UserNotFoundError(userId);
    }

    if (!response.ok) {
        const errorData: unknown = await response.json();

        if (isErrorResponse(errorData)) {
            throw new ApiError(
                errorData.error_message,
                response.status,
                errorData.error_type,
                errorData.error_details,
            );
        }

        throw new ApiError(
            "Unknown API error",
            response.status,
            "UNKNOWN_ERROR",
        );
    }

    const data: unknown = await response.json();

    if (!isUser(data)) {
        throw new TypeError("Invalid user data from API");
    }

    return data;
}
```

---

## Testing Standards

### Every Function Has Tests

```python
import pytest
from hypothesis import given, strategies as st

# Test file: test_user_service.py

class TestUserService:
    """Test suite for UserService"""

    async def test_create_user_success(self, db_session: AsyncSession) -> None:
        """Test successful user creation"""
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
        assert user.role == UserRole.USER
        assert user.is_active is True

    async def test_create_user_duplicate_email(
        self,
        db_session: AsyncSession,
    ) -> None:
        """Test user creation fails with duplicate email"""
        # Arrange
        user_data: UserCreate = UserCreate(
            email="test@example.com",
            password="SecurePassword123",
        )
        service: UserService = UserService(db=db_session)
        await service.create_user(user_data=user_data)  # Create first user

        # Act & Assert
        with pytest.raises(UserAlreadyExistsError) as exc_info:
            await service.create_user(user_data=user_data)

        assert exc_info.value.email == "test@example.com"

    @given(
        email=st.emails(),
        password=st.text(min_size=12, max_size=128),
    )
    async def test_create_user_property_based(
        self,
        db_session: AsyncSession,
        email: str,
        password: str,
    ) -> None:
        """Property-based test: any valid email/password should work"""
        # This test runs with many generated inputs
        user_data: UserCreate = UserCreate(email=email, password=password)
        service: UserService = UserService(db=db_session)

        user: User = await service.create_user(user_data=user_data)

        assert user.email == email
        assert user.id is not None
```

---

## File Organization

```
project/
├── backend/
│   ├── app/
│   │   ├── __init__.py          # Package initialization
│   │   ├── main.py              # FastAPI app creation
│   │   ├── config.py            # Configuration (Pydantic Settings)
│   │   ├── dependencies.py      # Dependency injection providers
│   │   ├── models/              # SQLAlchemy models
│   │   │   ├── __init__.py
│   │   │   ├── user.py
│   │   │   └── base.py          # Base model class
│   │   ├── schemas/             # Pydantic schemas
│   │   │   ├── __init__.py
│   │   │   ├── user.py
│   │   │   └── common.py        # Shared schemas
│   │   ├── services/            # Business logic
│   │   │   ├── __init__.py
│   │   │   ├── user_service.py
│   │   │   └── base_service.py
│   │   ├── routes/              # API routes
│   │   │   ├── __init__.py
│   │   │   └── users.py
│   │   └── exceptions.py        # Custom exceptions
│   ├── tests/                   # Tests mirror app structure
│   │   ├── __init__.py
│   │   ├── conftest.py          # Pytest fixtures
│   │   ├── test_services/
│   │   │   └── test_user_service.py
│   │   └── test_routes/
│   │       └── test_users.py
│   ├── migrations/              # Alembic migrations
│   │   └── versions/
│   ├── pyproject.toml           # Python dependencies
│   └── README.md
└── frontend/
    ├── src/
    │   ├── components/          # React components
    │   │   ├── UserList.tsx
    │   │   └── UserCard.tsx
    │   ├── hooks/               # Custom React hooks
    │   │   └── useUsers.ts
    │   ├── services/            # API clients
    │   │   └── userService.ts
    │   ├── types/               # TypeScript types
    │   │   ├── user.ts
    │   │   └── api.ts
    │   └── utils/               # Utility functions
    │       └── validators.ts
    ├── tests/                   # Tests mirror src structure
    │   ├── components/
    │   │   └── UserList.test.tsx
    │   └── services/
    │       └── userService.test.ts
    ├── package.json
    └── tsconfig.json
```

---

## Summary: AI Coding Standards Checklist

**Before committing any code, verify**:

- [ ] Every function has explicit type annotations
- [ ] Every function has comprehensive docstring
- [ ] Every error case is explicitly handled
- [ ] Every error has a custom exception type
- [ ] No magic strings or numbers
- [ ] No implicit null/undefined handling
- [ ] Every function has corresponding tests
- [ ] Type checker passes (mypy/tsc in strict mode)
- [ ] Linter passes (ruff/eslint with all rules)
- [ ] 100% test coverage for new code
- [ ] No `any` types in TypeScript
- [ ] No untyped parameters in Python
- [ ] All constants are named and documented
- [ ] All complex logic has explanatory comments

**These standards are not aspirational. They are mandatory.**
