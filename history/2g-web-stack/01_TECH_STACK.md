# AI Dev Stack: Technology Choices

**Decision Framework**: For each technology choice, we optimize for:
1. Type safety and compile-time correctness
2. AI code generation quality (based on training data)
3. Explicit behavior over implicit magic
4. Tooling that generates code from schemas
5. Clear, machine-readable error messages

---

## Backend Languages

### Tier 1: Python 3.11+ (Primary Choice)

**Why Python wins for AI development**:
- Excellent AI code generation quality (massive training data)
- Type hints + mypy provide strong static typing
- Explicit is better than implicit (Zen of Python)
- Excellent error messages
- Best ecosystem for schema-driven development

**Configuration**:
```toml
# pyproject.toml
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
select = ["E", "F", "I", "N", "W", "ANN", "B", "A", "COM", "C4", "DTZ", "T10", "ISC", "ICN", "G", "PIE", "T20", "PYI", "PT", "Q", "RSE", "RET", "SLF", "SIM", "TID", "TCH", "ARG", "PTH", "ERA", "PD", "PGH", "PL", "TRY", "NPY", "RUF"]
```

**Required practices**:
- Type hints on every function signature
- Strict mypy checking in CI
- Pydantic for all data models
- SQLAlchemy 2.0 with typed models

**Example of AI-optimized Python**:
```python
from typing import TypedDict, NotRequired, Literal
from pydantic import BaseModel, Field, validator
from sqlalchemy.orm import Mapped, mapped_column
from datetime import datetime
from uuid import UUID

# Explicit type definitions
class UserRole(str, Enum):
    ADMIN = "admin"
    USER = "user"
    GUEST = "guest"

# Pydantic for validation
class UserCreate(BaseModel):
    email: str = Field(..., pattern=r"^[\w\.-]+@[\w\.-]+\.\w+$")
    password: str = Field(..., min_length=12)
    role: UserRole = UserRole.USER

    @validator("email")
    @classmethod
    def validate_email_domain(cls, v: str) -> str:
        if not v.endswith(("@company.com", "@trusted.com")):
            raise ValueError("Email must be from allowed domain")
        return v

# SQLAlchemy with full typing
class User(Base):
    __tablename__ = "users"

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[UserRole] = mapped_column(Enum(UserRole), nullable=False, default=UserRole.USER)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    # Explicit relationships
    api_keys: Mapped[list["ApiKey"]] = relationship("ApiKey", back_populates="user", cascade="all, delete-orphan")

# Service with explicit error handling
class UserServiceError(Exception):
    """Base exception for user service errors"""
    pass

class UserAlreadyExistsError(UserServiceError):
    def __init__(self, email: str):
        self.email = email
        super().__init__(f"User with email {email} already exists")

class UserService:
    def __init__(self, db: AsyncSession):
        self.db: AsyncSession = db

    async def create_user(self, user_data: UserCreate) -> User:
        """
        Create a new user.

        Args:
            user_data: Validated user creation data

        Returns:
            Created user instance

        Raises:
            UserAlreadyExistsError: If email already registered
            DatabaseError: If database operation fails
        """
        # Explicit existence check
        existing_user: User | None = await self.db.execute(
            select(User).where(User.email == user_data.email)
        ).scalar_one_or_none()

        if existing_user is not None:
            raise UserAlreadyExistsError(email=user_data.email)

        # Explicit password hashing
        password_hash: str = self._hash_password(user_data.password)

        # Explicit model creation
        user: User = User(
            email=user_data.email,
            password_hash=password_hash,
            role=user_data.role,
        )

        # Explicit database operations with error handling
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

        return user
```

**AI optimization notes**:
- Every type explicitly declared (Mapped[], explicit return types)
- Every error case has explicit exception type
- Every function has comprehensive docstring
- No implicit behavior anywhere

### Tier 2: TypeScript (Frontend + Backend where Python doesn't fit)

**Why TypeScript**:
- Strong static typing (better than JavaScript)
- Excellent AI code generation quality
- Required for frontend (React/Next.js)
- Good for backend when Node.js ecosystem needed

**Configuration**:
```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "noImplicitOverride": true,
    "allowUnusedLabels": false,
    "allowUnreachableCode": false,
    "exactOptionalPropertyTypes": true,
    "noPropertyAccessFromIndexSignature": true,
    "verbatimModuleSyntax": true
  }
}
```

### Tier 3: Rust (Future consideration for performance-critical services)

**Why Rust for later**:
- Ultimate type safety (borrow checker catches entire classes of bugs)
- Compile-time correctness guarantees
- No runtime errors from memory issues

**Current limitation**:
- My code generation quality is lower (less training data)
- Would need extensive testing to match Python quality
- Reserve for Phase 3+ when we need performance

---

## Backend Framework

### FastAPI (Primary)

**Why FastAPI**:
- Schema-first: Pydantic models drive everything
- Auto-generated OpenAPI specs
- Type hints throughout
- Dependency injection (explicit dependencies)
- Excellent error messages
- Async support

**AI-optimized setup**:
```python
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.responses import JSONResponse
from typing import Annotated

app = FastAPI(
    title="AI-Generated API",
    description="Schema-driven API with full type safety",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
)

# Explicit dependency injection
async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()

DatabaseDep = Annotated[AsyncSession, Depends(get_db)]

# Explicit error responses
class ErrorResponse(BaseModel):
    error_type: str
    error_message: str
    error_details: dict[str, Any] | None = None
    timestamp: datetime
    request_id: str

# Explicit route with all types
@app.post(
    "/api/users",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
    responses={
        201: {"description": "User created successfully"},
        400: {"model": ErrorResponse, "description": "Invalid input"},
        409: {"model": ErrorResponse, "description": "User already exists"},
        500: {"model": ErrorResponse, "description": "Server error"},
    },
)
async def create_user(
    user_data: UserCreate,
    db: DatabaseDep,
    request_id: Annotated[str, Header()] = None,
) -> UserResponse:
    """
    Create a new user account.

    Args:
        user_data: User creation data (validated)
        db: Database session (injected)
        request_id: Request tracking ID (optional header)

    Returns:
        Created user data

    Raises:
        HTTPException(400): If validation fails
        HTTPException(409): If user already exists
        HTTPException(500): If server error occurs
    """
    user_service = UserService(db=db)

    try:
        user: User = await user_service.create_user(user_data=user_data)
        return UserResponse.model_validate(user)

    except UserAlreadyExistsError as e:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=ErrorResponse(
                error_type="USER_ALREADY_EXISTS",
                error_message=str(e),
                error_details={"email": e.email},
                timestamp=datetime.utcnow(),
                request_id=request_id or "unknown",
            ).model_dump(),
        )

    except DatabaseError as e:
        logger.error(f"Database error creating user: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=ErrorResponse(
                error_type="DATABASE_ERROR",
                error_message="Failed to create user",
                error_details=None,  # Don't leak internal details
                timestamp=datetime.utcnow(),
                request_id=request_id or "unknown",
            ).model_dump(),
        )
```

---

## Database

### PostgreSQL 15+ (Primary)

**Why PostgreSQL**:
- Strong schema enforcement
- Rich type system (enums, arrays, JSON, etc.)
- Excellent constraint checking
- Best SQL database for schema-first development

**AI-optimized practices**:
```sql
-- Explicit schema with comprehensive constraints
CREATE TYPE user_role AS ENUM ('admin', 'user', 'guest');

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role user_role NOT NULL DEFAULT 'user',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    is_active BOOLEAN NOT NULL DEFAULT true,

    -- Explicit constraints
    CONSTRAINT email_format CHECK (email ~* '^[\w\.-]+@[\w\.-]+\.\w+$'),
    CONSTRAINT email_lowercase CHECK (email = LOWER(email)),
    CONSTRAINT password_hash_length CHECK (LENGTH(password_hash) >= 60)
);

-- Explicit indexes
CREATE INDEX idx_users_email ON users(email) WHERE is_active = true;
CREATE INDEX idx_users_role ON users(role) WHERE is_active = true;

-- Explicit trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```

### Migration Tool: Alembic

**Why Alembic**:
- Explicit migrations
- Version controlled
- Type-safe with SQLAlchemy models

**AI practices**:
- Every migration explicitly named
- Every migration has upgrade and downgrade
- Every migration has comprehensive docstring

---

## Frontend

### React 18+ with TypeScript (Primary)

**Why React + TS**:
- Excellent AI code generation quality
- Strong typing with TypeScript
- Declarative (easier for AI to reason about)
- Component-based (clear boundaries)

**Framework: Next.js 14+ (App Router)**

**Why Next.js**:
- File-based routing (explicit structure)
- Server components (explicit client/server boundary)
- Built-in API routes if needed
- Excellent TypeScript support

**AI-optimized setup**:
```typescript
// Explicit type definitions
type UserRole = 'admin' | 'user' | 'guest';

interface User {
  readonly id: string;
  readonly email: string;
  readonly role: UserRole;
  readonly createdAt: Date;
  readonly isActive: boolean;
}

interface UserListProps {
  readonly initialUsers: ReadonlyArray<User>;
  readonly currentUserRole: UserRole;
}

// Explicit error types
class UserFetchError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly errorType: string,
  ) {
    super(message);
    this.name = 'UserFetchError';
  }
}

// Explicit component with full typing
export function UserList({
  initialUsers,
  currentUserRole
}: UserListProps): JSX.Element {
  const [users, setUsers] = useState<ReadonlyArray<User>>(initialUsers);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<UserFetchError | null>(null);

  // Explicit fetch function
  const fetchUsers = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(null);

    try {
      const response: Response = await fetch('/api/users');

      if (!response.ok) {
        const errorData: { error_type: string; error_message: string } =
          await response.json();

        throw new UserFetchError(
          errorData.error_message,
          response.status,
          errorData.error_type,
        );
      }

      const data: { users: Array<User> } = await response.json();
      setUsers(data.users);

    } catch (err: unknown) {
      if (err instanceof UserFetchError) {
        setError(err);
      } else if (err instanceof Error) {
        setError(new UserFetchError(err.message, 500, 'UNKNOWN_ERROR'));
      } else {
        setError(new UserFetchError('An unknown error occurred', 500, 'UNKNOWN_ERROR'));
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // Explicit render logic
  if (error !== null) {
    return (
      <div className="error-container">
        <h2>Error Loading Users</h2>
        <p>{error.message}</p>
        <button onClick={() => fetchUsers()}>Retry</button>
      </div>
    );
  }

  if (loading) {
    return <div className="loading-spinner">Loading users...</div>;
  }

  return (
    <div className="user-list">
      {users.map((user: User) => (
        <UserCard
          key={user.id}
          user={user}
          canEdit={currentUserRole === 'admin'}
        />
      ))}
    </div>
  );
}
```

---

## Type Generation & Schema Tools

### 1. Pydantic (Python)
- All data models
- Request/response validation
- Config management

### 2. Zod (TypeScript)
- Runtime type validation
- Schema-driven forms
- API contract validation

### 3. OpenAPI Generator
- Generate TypeScript client from FastAPI OpenAPI spec
- Single source of truth for API types

### 4. Prisma or SQLAlchemy
- Database schema to typed models
- Type-safe query building

**Workflow**:
```
PostgreSQL Schema (migrations)
    ↓
SQLAlchemy Models (auto-generated types)
    ↓
Pydantic Models (API contracts)
    ↓
FastAPI Routes (OpenAPI spec)
    ↓
openapi-typescript-codegen
    ↓
TypeScript API Client (frontend)
```

---

## Testing

### Backend: pytest + hypothesis + pytest-asyncio

**Why pytest**:
- Explicit test structure
- Excellent error messages
- Type-safe with mypy

**Why hypothesis**:
- Property-based testing
- AI can generate properties easily
- Finds edge cases automatically

### Frontend: Vitest + Testing Library + Playwright

**Why Vitest**:
- Fast
- TypeScript native
- Compatible with Jest patterns (better AI training data)

**Why Playwright**:
- Explicit browser automation
- TypeScript support
- Good error messages

---

## Code Quality Tools

### Python
- **mypy** (strict mode): Type checking
- **ruff**: Fast linting (all rules enabled)
- **black**: Formatting (no config needed)
- **pytest-cov**: Coverage (100% target)

### TypeScript
- **tsc** (strict mode): Type checking
- **eslint** (all rules): Linting
- **prettier**: Formatting
- **vitest --coverage**: Coverage (100% target)

---

## Deployment

### Docker (Containerization)
- Explicit dependencies
- Reproducible builds
- Clear runtime environment

### Fly.io or Railway (Platform)
- Good error messages
- Simple deployment model
- PostgreSQL support

---

## Developer Tools We Need to Build

See [08_TOOLS_TO_BUILD.md](08_TOOLS_TO_BUILD.md) for comprehensive list.

**Immediate needs**:
1. Project scaffolder that generates full stack from schema
2. AI-optimized error reporter (machine-readable errors with suggestions)
3. Test generator (from types/schemas)
4. Documentation generator (from types + docstrings)

---

## Summary: The AI Dev Stack v1.0

```
Frontend:  Next.js 14 (App Router) + TypeScript (strict) + Zod + TanStack Query
Backend:   FastAPI + Python 3.11+ + Pydantic + SQLAlchemy 2.0 + mypy (strict)
Database:  PostgreSQL 15+ + Alembic
Testing:   pytest + hypothesis + Vitest + Playwright (100% coverage)
Types:     OpenAPI → TypeScript codegen (single source of truth)
Quality:   mypy + ruff + ESLint (all rules, no exceptions)
Deploy:    Docker + Fly.io/Railway
```

**Key Characteristics**:
- Every layer is strongly typed
- Schema drives everything
- Explicit over implicit everywhere
- 100% test coverage is default
- Machine-verifiable correctness at every stage
