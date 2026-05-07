# AI Dev Stack: Code Generation Patterns

**Principle**: Hand-writing code is a fallback. Generation is primary.

---

## Code Generation Philosophy

**Target**: 90%+ of code is generated, 10% is hand-written

**What gets generated**:
- Database models from schema
- Pydantic models from database models
- API routes from schemas
- TypeScript types from OpenAPI
- API clients from OpenAPI
- Tests from function signatures
- Documentation from code

**What gets hand-written**:
- Business logic
- Complex algorithms
- Domain-specific validators
- Custom middleware

---

## Generation Layer 1: Database → Models

### Alembic Migration (Hand-Written)

```python
"""
Create users table

Revision ID: 001
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

def upgrade() -> None:
    """Create users table"""
    # Create enum
    op.execute("""
        CREATE TYPE user_role AS ENUM ('admin', 'user', 'guest')
    """)

    # Create table
    op.create_table(
        'users',
        sa.Column('id', UUID, primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('email', sa.String(255), nullable=False, unique=True),
        sa.Column('password_hash', sa.String(255), nullable=False),
        sa.Column('role', sa.Enum('admin', 'user', 'guest', name='user_role'), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('NOW()')),
        sa.Column('is_active', sa.Boolean, nullable=False, server_default=sa.text('true')),
    )

    # Create indexes
    op.create_index('idx_users_email', 'users', ['email'])

def downgrade() -> None:
    """Drop users table"""
    op.drop_table('users')
    op.execute("DROP TYPE user_role")
```

### SQLAlchemy Model (AI-Generated from Migration)

**AI Prompt**: "Generate SQLAlchemy model from migration 001_create_users.sql"

```python
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy import String, Boolean, DateTime, Enum
from datetime import datetime
from uuid import UUID, uuid4
import enum

class UserRole(str, enum.Enum):
    """User role enumeration"""
    ADMIN = "admin"
    USER = "user"
    GUEST = "guest"

class User(Base):
    """User model generated from migration 001"""
    __tablename__ = "users"

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[UserRole] = mapped_column(Enum(UserRole), nullable=False, default=UserRole.USER)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
```

**Generation Pattern**: Read migration → Extract schema → Generate typed model

---

## Generation Layer 2: Models → Pydantic Schemas

**AI Prompt**: "Generate Pydantic schemas for User model"

```python
from pydantic import BaseModel, Field, EmailStr
from datetime import datetime
from uuid import UUID

class UserBase(BaseModel):
    """Base user schema with shared fields"""
    email: EmailStr = Field(..., description="User email address")

class UserCreate(UserBase):
    """User creation schema"""
    password: str = Field(..., min_length=12, description="User password")
    role: UserRole = Field(default=UserRole.USER, description="User role")

class UserUpdate(BaseModel):
    """User update schema (all optional)"""
    email: EmailStr | None = None
    password: str | None = Field(None, min_length=12)
    role: UserRole | None = None
    is_active: bool | None = None

class UserResponse(UserBase):
    """User response schema"""
    id: UUID
    role: UserRole
    created_at: datetime
    is_active: bool

    class Config:
        from_attributes = True
```

**Generation Pattern**: Read model → Generate Create/Update/Response schemas

---

## Generation Layer 3: Schemas → API Routes

**AI Prompt**: "Generate CRUD routes for User with UserCreate, UserUpdate, UserResponse schemas"

```python
from fastapi import APIRouter, Depends, HTTPException, status
from typing import Annotated
from uuid import UUID

router = APIRouter(prefix="/api/users", tags=["users"])

DatabaseDep = Annotated[AsyncSession, Depends(get_db)]

@router.post("", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def create_user(
    user_data: UserCreate,
    db: DatabaseDep,
) -> UserResponse:
    """Create new user"""
    service: UserService = UserService(db=db)
    user: User = await service.create_user(user_data=user_data)
    return UserResponse.model_validate(user)

@router.get("/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: UUID,
    db: DatabaseDep,
) -> UserResponse:
    """Get user by ID"""
    service: UserService = UserService(db=db)
    user: User | None = await service.get_user(user_id=user_id)

    if user is None:
        raise HTTPException(status_code=404, detail="User not found")

    return UserResponse.model_validate(user)

@router.put("/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: UUID,
    update_data: UserUpdate,
    db: DatabaseDep,
    current_user: CurrentUserDep,
) -> UserResponse:
    """Update user"""
    service: UserService = UserService(db=db)
    user: User = await service.update_user(
        user_id=user_id,
        update_data=update_data,
        current_user=current_user,
    )
    return UserResponse.model_validate(user)

@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(
    user_id: UUID,
    db: DatabaseDep,
    current_user: CurrentUserDep,
) -> None:
    """Delete user"""
    service: UserService = UserService(db=db)
    await service.delete_user(user_id=user_id, current_user=current_user)
```

**Generation Pattern**: Read schemas → Generate CRUD endpoints with types

---

## Generation Layer 4: FastAPI → OpenAPI → TypeScript

### Step 1: FastAPI Auto-Generates OpenAPI

```json
{
  "openapi": "3.0.0",
  "paths": {
    "/api/users": {
      "post": {
        "requestBody": {
          "content": {
            "application/json": {
              "schema": {"$ref": "#/components/schemas/UserCreate"}
            }
          }
        },
        "responses": {
          "201": {
            "content": {
              "application/json": {
                "schema": {"$ref": "#/components/schemas/UserResponse"}
              }
            }
          }
        }
      }
    }
  },
  "components": {
    "schemas": {
      "UserCreate": {
        "type": "object",
        "required": ["email", "password"],
        "properties": {
          "email": {"type": "string", "format": "email"},
          "password": {"type": "string", "minLength": 12},
          "role": {"type": "string", "enum": ["admin", "user", "guest"]}
        }
      },
      "UserResponse": {
        "type": "object",
        "required": ["id", "email", "role", "created_at", "is_active"],
        "properties": {
          "id": {"type": "string", "format": "uuid"},
          "email": {"type": "string", "format": "email"},
          "role": {"type": "string", "enum": ["admin", "user", "guest"]},
          "created_at": {"type": "string", "format": "date-time"},
          "is_active": {"type": "boolean"}
        }
      }
    }
  }
}
```

### Step 2: Generate TypeScript Types

**Tool**: `openapi-typescript`

```bash
npx openapi-typescript http://localhost:8000/openapi.json -o src/types/api.ts
```

**Generated TypeScript**:

```typescript
// src/types/api.ts (auto-generated)

export interface paths {
    '/api/users': {
        post: {
            requestBody: {
                content: {
                    'application/json': components['schemas']['UserCreate'];
                };
            };
            responses: {
                201: {
                    content: {
                        'application/json': components['schemas']['UserResponse'];
                    };
                };
            };
        };
    };
    '/api/users/{user_id}': {
        get: {
            parameters: {
                path: {
                    user_id: string;
                };
            };
            responses: {
                200: {
                    content: {
                        'application/json': components['schemas']['UserResponse'];
                    };
                };
            };
        };
    };
}

export interface components {
    schemas: {
        UserCreate: {
            email: string;
            password: string;
            role?: 'admin' | 'user' | 'guest';
        };
        UserResponse: {
            id: string;
            email: string;
            role: 'admin' | 'user' | 'guest';
            created_at: string;
            is_active: boolean;
        };
    };
}
```

### Step 3: Generate Type-Safe API Client

**Tool**: `openapi-typescript-codegen` or custom generator

```typescript
// src/services/api.ts (auto-generated)

import type { components } from '../types/api';

type UserCreate = components['schemas']['UserCreate'];
type UserResponse = components['schemas']['UserResponse'];

export class UserApiClient {
    constructor(private readonly baseUrl: string) {}

    async createUser(data: UserCreate): Promise<UserResponse> {
        const response: Response = await fetch(`${this.baseUrl}/api/users`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(data),
        });

        if (!response.ok) {
            throw new ApiError(response);
        }

        return await response.json();
    }

    async getUser(userId: string): Promise<UserResponse> {
        const response: Response = await fetch(
            `${this.baseUrl}/api/users/${userId}`,
        );

        if (!response.ok) {
            throw new ApiError(response);
        }

        return await response.json();
    }
}
```

---

## Generation Layer 5: Tests from Signatures

**AI Prompt**: "Generate comprehensive tests for create_user function"

```python
import pytest
from hypothesis import given, strategies as st

class TestUserService:
    """Auto-generated tests for UserService.create_user"""

    async def test_create_user_success(
        self,
        db_session: AsyncSession,
    ) -> None:
        """Test successful user creation"""
        user_data: UserCreate = UserCreate(
            email="test@example.com",
            password="SecurePassword123",
        )
        service: UserService = UserService(db=db_session)

        user: User = await service.create_user(user_data=user_data)

        assert user.id is not None
        assert user.email == "test@example.com"
        assert user.is_active is True

    async def test_create_user_duplicate_email(
        self,
        db_session: AsyncSession,
        test_user: User,
    ) -> None:
        """Test duplicate email raises error"""
        user_data: UserCreate = UserCreate(
            email=test_user.email,
            password="DifferentPassword123",
        )
        service: UserService = UserService(db=db_session)

        with pytest.raises(UserAlreadyExistsError) as exc_info:
            await service.create_user(user_data=user_data)

        assert exc_info.value.email == test_user.email

    @given(email=st.emails(), password=st.text(min_size=12, max_size=128))
    async def test_create_user_property_based(
        self,
        db_session: AsyncSession,
        email: str,
        password: str,
    ) -> None:
        """Property test: any valid email/password works"""
        user_data: UserCreate = UserCreate(email=email, password=password)
        service: UserService = UserService(db=db_session)

        user: User = await service.create_user(user_data=user_data)

        assert user.email == email.lower()
```

**Generation Pattern**: Read function signature + docstring → Generate success/error/property tests

---

## AI Code Generation Prompts

### Prompt Template 1: Generate Model from Migration

```
Given this Alembic migration:

[MIGRATION CODE]

Generate a SQLAlchemy 2.0 model with:
- Mapped[] type annotations for all columns
- Explicit types (UUID, DateTime, Enum, etc.)
- Python enum for database enums
- Comprehensive docstrings
- Explicit defaults matching database
```

### Prompt Template 2: Generate Schemas from Model

```
Given this SQLAlchemy model:

[MODEL CODE]

Generate Pydantic schemas:
- UserBase: shared fields
- UserCreate: fields needed for creation + password
- UserUpdate: all fields optional
- UserResponse: all fields except password_hash

Include:
- Field descriptions
- Validators for email, password strength
- from_attributes = True in Config
```

### Prompt Template 3: Generate Service from Schemas

```
Given these schemas:

[SCHEMA CODE]

Generate a UserService class with:
- __init__(db: AsyncSession)
- create_user(user_data: UserCreate) -> User
- get_user(user_id: UUID) -> User | None
- update_user(user_id: UUID, update_data: UserUpdate, current_user: User) -> User
- delete_user(user_id: UUID, current_user: User) -> None

Include:
- Explicit error handling (all raises documented)
- Authorization checks
- Comprehensive docstrings
- Type annotations everywhere
```

### Prompt Template 4: Generate Tests

```
Generate comprehensive tests for this function:

[FUNCTION CODE]

Include:
- Success test with valid inputs
- Error test for each exception in docstring
- Property-based test with hypothesis
- Integration test if it's an API endpoint
- All tests with AAA pattern (Arrange, Act, Assert)
- Comprehensive assertions
```

---

## Tools for Code Generation

### Existing Tools
- **FastAPI**: Auto-generates OpenAPI
- **Pydantic**: Runtime validation from types
- **openapi-typescript**: OpenAPI → TypeScript types
- **Alembic**: Migration version control
- **SQLAlchemy**: ORM with typed queries

### Tools We Need to Build
See [08_TOOLS_TO_BUILD.md](08_TOOLS_TO_BUILD.md) for:
- Migration → Model generator
- Model → Service generator
- Service → Test generator
- Full stack scaffolder

---

## Summary: Code Generation Workflow

```
1. HAND-WRITE: Alembic migration (database schema)
   ↓
2. AI GENERATE: SQLAlchemy model from migration
   ↓
3. AI GENERATE: Pydantic schemas from model
   ↓
4. HAND-WRITE: Business logic in service layer
   ↓
5. AI GENERATE: API routes from schemas + service
   ↓
6. FASTAPI AUTO-GENERATES: OpenAPI specification
   ↓
7. TOOL GENERATES: TypeScript types from OpenAPI
   ↓
8. AI GENERATES: TypeScript API client from types
   ↓
9. AI GENERATES: Tests for all layers
   ↓
10. AI GENERATES: Documentation from code
```

**Human input**: Migration schema + business logic
**AI generates**: Everything else (90% of code)
