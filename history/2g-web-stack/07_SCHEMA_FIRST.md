# AI Dev Stack: Schema-First Development

**Principle**: Define schema once. Generate everything else.

---

## What is Schema-First?

**Traditional approach**: Write code, then document it
**Schema-first approach**: Define data structures formally, generate code from schema

**Benefits for AI**:
- Single source of truth eliminates inconsistencies
- Code generation is mechanical (AI excels at this)
- Changes propagate automatically
- Types flow through entire stack
- Impossible to have frontend/backend mismatches

---

## The Schema-First Flow

```
1. DATABASE SCHEMA (PostgreSQL DDL)
   ↓
2. ORM MODELS (SQLAlchemy with Mapped[] types)
   ↓
3. API CONTRACTS (Pydantic models)
   ↓
4. API SPECIFICATION (OpenAPI/JSON Schema)
   ↓
5. FRONTEND TYPES (TypeScript interfaces)
   ↓
6. API CLIENT (Typed HTTP client)
   ↓
7. UI COMPONENTS (Type-safe React components)
```

Every layer is generated from the previous layer.
Change database schema → entire stack updates automatically.

---

## Step 1: Define Database Schema

**This is the only place we define structure**:

```sql
-- migrations/001_create_users.sql

CREATE TYPE user_role AS ENUM ('admin', 'user', 'guest');

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL UNIQUE,
    full_name VARCHAR(255) NOT NULL,
    role user_role NOT NULL DEFAULT 'user',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    is_active BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT email_format CHECK (email ~* '^[\w\.-]+@[\w\.-]+\.\w+$'),
    CONSTRAINT email_lowercase CHECK (email = LOWER(email)),
    CONSTRAINT full_name_not_empty CHECK (LENGTH(TRIM(full_name)) > 0)
);

CREATE INDEX idx_users_email ON users(email) WHERE is_active = true;
CREATE INDEX idx_users_role ON users(role) WHERE is_active = true;
```

**Key points**:
- Constraints at database level (email format, lowercase, etc.)
- Enums for fixed sets of values
- Explicit defaults
- Proper indexes

---

## Step 2: Generate ORM Models

**AI Prompt**: "Generate SQLAlchemy model from migration 001_create_users.sql"

**Generated code**:

```python
# app/models/user.py (AUTO-GENERATED)

from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy import String, Boolean, DateTime, Enum
from datetime import datetime
from uuid import UUID, uuid4
import enum

class UserRole(str, enum.Enum):
    """User role enumeration (from database enum)"""
    ADMIN = "admin"
    USER = "user"
    GUEST = "guest"

class User(Base):
    """User model (generated from migration 001_create_users)"""
    __tablename__ = "users"

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
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
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
    )
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
```

**Notice**: Types, defaults, constraints all match database exactly.

---

## Step 3: Generate Pydantic Schemas

**AI Prompt**: "Generate Pydantic schemas from User model"

**Generated code**:

```python
# app/schemas/user.py (AUTO-GENERATED)

from pydantic import BaseModel, Field, EmailStr
from datetime import datetime
from uuid import UUID
from app.models.user import UserRole

class UserBase(BaseModel):
    """Base user schema with common fields"""
    email: EmailStr = Field(..., description="User email address")
    full_name: str = Field(..., min_length=1, max_length=255, description="User full name")

class UserCreate(UserBase):
    """User creation schema"""
    role: UserRole = Field(default=UserRole.USER, description="User role")

class UserUpdate(BaseModel):
    """User update schema (all fields optional)"""
    email: EmailStr | None = Field(None, description="Updated email")
    full_name: str | None = Field(None, min_length=1, max_length=255, description="Updated name")
    role: UserRole | None = Field(None, description="Updated role")
    is_active: bool | None = Field(None, description="Updated active status")

class UserResponse(UserBase):
    """User response schema (for API responses)"""
    id: UUID = Field(..., description="User ID")
    role: UserRole = Field(..., description="User role")
    created_at: datetime = Field(..., description="Creation timestamp")
    updated_at: datetime = Field(..., description="Last update timestamp")
    is_active: bool = Field(..., description="Active status")

    class Config:
        from_attributes = True
```

**Notice**: Schemas match model, but with API-appropriate variations (Create has password, Response doesn't).

---

## Step 4: FastAPI Auto-Generates OpenAPI

**No manual work needed**:

```python
# app/routes/users.py

from fastapi import APIRouter
from app.schemas.user import UserCreate, UserUpdate, UserResponse

router = APIRouter(prefix="/api/users", tags=["users"])

@router.post("", response_model=UserResponse, status_code=201)
async def create_user(user_data: UserCreate) -> UserResponse:
    """Create new user"""
    # implementation
    pass
```

**FastAPI automatically generates**:

```json
{
  "openapi": "3.0.0",
  "components": {
    "schemas": {
      "UserCreate": {
        "type": "object",
        "required": ["email", "full_name"],
        "properties": {
          "email": {"type": "string", "format": "email"},
          "full_name": {"type": "string", "minLength": 1, "maxLength": 255},
          "role": {"type": "string", "enum": ["admin", "user", "guest"], "default": "user"}
        }
      },
      "UserResponse": {
        "type": "object",
        "required": ["id", "email", "full_name", "role", "created_at", "updated_at", "is_active"],
        "properties": {
          "id": {"type": "string", "format": "uuid"},
          "email": {"type": "string", "format": "email"},
          "full_name": {"type": "string"},
          "role": {"type": "string", "enum": ["admin", "user", "guest"]},
          "created_at": {"type": "string", "format": "date-time"},
          "updated_at": {"type": "string", "format": "date-time"},
          "is_active": {"type": "boolean"}
        }
      }
    }
  }
}
```

---

## Step 5: Generate TypeScript Types

**Command**:
```bash
npx openapi-typescript http://localhost:8000/openapi.json -o src/types/api.ts
```

**Generated TypeScript**:

```typescript
// src/types/api.ts (AUTO-GENERATED)

export type UserRole = 'admin' | 'user' | 'guest';

export interface UserCreate {
  email: string;
  full_name: string;
  role?: UserRole;
}

export interface UserUpdate {
  email?: string;
  full_name?: string;
  role?: UserRole;
  is_active?: boolean;
}

export interface UserResponse {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  created_at: string;
  updated_at: string;
  is_active: boolean;
}
```

**Notice**: TypeScript types match Python schemas exactly.

---

## Step 6: Generate API Client

**AI Prompt**: "Generate type-safe API client for User endpoints"

**Generated code**:

```typescript
// src/services/userApi.ts (AUTO-GENERATED)

import type { UserCreate, UserUpdate, UserResponse } from '../types/api';

export class UserApi {
  constructor(private readonly baseUrl: string) {}

  async createUser(data: UserCreate): Promise<UserResponse> {
    const response = await fetch(`${this.baseUrl}/api/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new ApiError(response);
    }

    return await response.json();
  }

  async getUser(userId: string): Promise<UserResponse> {
    const response = await fetch(`${this.baseUrl}/api/users/${userId}`);

    if (!response.ok) {
      throw new ApiError(response);
    }

    return await response.json();
  }

  async updateUser(userId: string, data: UserUpdate): Promise<UserResponse> {
    const response = await fetch(`${this.baseUrl}/api/users/${userId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new ApiError(response);
    }

    return await response.json();
  }
}
```

**Notice**: Fully type-safe, methods match backend exactly.

---

## Step 7: Use in React Components

**Now we have end-to-end type safety**:

```typescript
import { useState } from 'react';
import { UserApi } from '../services/userApi';
import type { UserResponse } from '../types/api';

export function UserProfile({ userId }: { userId: string }) {
  const [user, setUser] = useState<UserResponse | null>(null);
  const userApi = new UserApi('http://localhost:8000');

  useEffect(() => {
    userApi.getUser(userId).then(setUser);
  }, [userId]);

  if (!user) return <div>Loading...</div>;

  return (
    <div>
      <h1>{user.full_name}</h1>
      <p>{user.email}</p>
      <p>Role: {user.role}</p>
      {/* TypeScript knows all these fields exist and their types */}
    </div>
  );
}
```

**TypeScript will error if**:
- We try to access a field that doesn't exist
- We pass wrong type to API method
- We forget to handle null case

---

## The Power of Schema-First

### Scenario: Add a new field

**Step 1**: Update database schema
```sql
ALTER TABLE users ADD COLUMN phone_number VARCHAR(20);
```

**Step 2**: Run code generation
```bash
ai-codegen models --from-migration
ai-codegen schemas --from-models
# Restart backend (OpenAPI updates automatically)
npx openapi-typescript http://localhost:8000/openapi.json -o src/types/api.ts
ai-codegen api-client --from-types
```

**Result**:
- SQLAlchemy model has `phone_number: Mapped[str | None]`
- Pydantic schemas have `phone_number: str | None = None`
- OpenAPI spec includes phone_number field
- TypeScript types include `phone_number?: string`
- API client methods accept/return phone_number
- React components can use phone_number with full type safety

**Time**: ~1 minute
**Errors**: Zero (types enforce correctness)

---

## Schema-First Checklist

For every new feature:

1. [ ] Define database schema (migration)
2. [ ] Generate model from schema
3. [ ] Generate Pydantic schemas from model
4. [ ] Implement service logic (hand-written)
5. [ ] Generate API routes from schemas + service
6. [ ] FastAPI auto-generates OpenAPI
7. [ ] Generate TypeScript types from OpenAPI
8. [ ] Generate API client from types
9. [ ] Use in React components with full type safety

**Hand-written code**: Steps 4 only (business logic)
**Generated code**: Steps 2, 3, 5, 7, 8 (80% of code)

---

## Benefits Summary

**For AI Developers**:
- ✅ Single source of truth (database schema)
- ✅ Mechanical code generation (no creativity needed)
- ✅ Type safety catches errors early
- ✅ Changes propagate automatically
- ✅ Frontend/backend always in sync

**For Code Quality**:
- ✅ Zero frontend/backend type mismatches
- ✅ Database constraints enforced
- ✅ API contracts explicit and versioned
- ✅ Refactoring is safe (types guide changes)

**For Velocity**:
- ✅ Add new field: <5 minutes
- ✅ Add new resource: <10 minutes
- ✅ No manual synchronization needed
- ✅ Tests generated automatically

---

## Anti-Pattern: Code-First

**Don't do this**:
```
Write backend code → Write frontend code → Hope they match
```

**Problems**:
- Frontend/backend drift
- Type mismatches at runtime
- Manual synchronization required
- Changes require updates in multiple places

**Do this instead**:
```
Define schema → Generate everything → Types enforce correctness
```

---

## Tools for Schema-First

### Existing Tools:
- **Alembic**: Database migrations
- **FastAPI**: Auto-generates OpenAPI from Pydantic
- **openapi-typescript**: OpenAPI → TypeScript types
- **Pydantic**: Runtime validation from types

### Tools to Build:
- **ai-codegen**: Migration → Model → Schema pipeline
- **ai-scaffold**: Full stack from schema definition
- **ai-sync**: Detect schema drift and auto-fix

See [08_TOOLS_TO_BUILD.md](08_TOOLS_TO_BUILD.md) for details.

---

## Summary

**Schema-First Development**:
1. Define structure once (database schema)
2. Generate code mechanically (AI excels at this)
3. Types flow through entire stack
4. Frontend and backend cannot drift
5. Changes propagate automatically
6. AI writes 80%+ of the code

**This is how AI developers should work.**
