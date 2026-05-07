# AI Dev Stack: Error Handling

**Principle**: Errors are data. All errors are explicit, typed, and machine-readable.

---

## Error Philosophy

**Human approach**: Try to recover silently, log errors, hope for the best
**AI approach**: Make errors impossible to ignore, explicit to handle, easy to diagnose

---

## Error Hierarchy

```python
# Base exception with all context
class ApplicationError(Exception):
    """
    Base exception for all application errors.

    All custom exceptions inherit from this.
    Provides structured error data for AI consumption.
    """

    def __init__(
        self,
        message: str,
        error_code: str | None = None,
        details: dict[str, Any] | None = None,
    ):
        self.message: str = message
        self.error_code: str = error_code or self.__class__.__name__
        self.details: dict[str, Any] = details or {}
        self.timestamp: datetime = datetime.utcnow()
        super().__init__(message)

    def to_dict(self) -> dict[str, Any]:
        """Convert error to machine-readable dict"""
        return {
            "error_type": self.error_code,
            "error_message": self.message,
            "error_details": self.details,
            "timestamp": self.timestamp.isoformat(),
        }

# Domain-specific errors
class DatabaseError(ApplicationError):
    """Database operation errors"""
    pass

class ValidationError(ApplicationError):
    """Data validation errors"""

    def __init__(
        self,
        message: str,
        field: str,
        invalid_value: Any,
        expected_type: str | None = None,
    ):
        self.field: str = field
        self.invalid_value: Any = invalid_value
        self.expected_type: str | None = expected_type

        details: dict[str, Any] = {
            "field": field,
            "invalid_value": str(invalid_value),
        }
        if expected_type:
            details["expected_type"] = expected_type

        super().__init__(message, details=details)

class NotFoundError(ApplicationError):
    """Resource not found errors"""

    def __init__(self, resource_type: str, identifier: str | UUID):
        self.resource_type: str = resource_type
        self.identifier: str = str(identifier)

        super().__init__(
            message=f"{resource_type} not found: {identifier}",
            error_code="NOT_FOUND",
            details={
                "resource_type": resource_type,
                "identifier": str(identifier),
            },
        )

class AlreadyExistsError(ApplicationError):
    """Resource already exists errors"""

    def __init__(
        self,
        resource_type: str,
        field: str,
        value: str,
    ):
        self.resource_type: str = resource_type
        self.field: str = field
        self.value: str = value

        super().__init__(
            message=f"{resource_type} with {field}={value} already exists",
            error_code="ALREADY_EXISTS",
            details={
                "resource_type": resource_type,
                "field": field,
                "value": value,
            },
        )

class AuthenticationError(ApplicationError):
    """Authentication failures"""
    pass

class AuthorizationError(ApplicationError):
    """Authorization failures"""

    def __init__(
        self,
        user_id: UUID,
        action: str,
        resource_type: str,
        resource_id: str | None = None,
    ):
        self.user_id: UUID = user_id
        self.action: str = action
        self.resource_type: str = resource_type
        self.resource_id: str | None = resource_id

        message: str = f"User {user_id} not authorized to {action} {resource_type}"
        if resource_id:
            message += f" {resource_id}"

        super().__init__(
            message=message,
            error_code="UNAUTHORIZED",
            details={
                "user_id": str(user_id),
                "action": action,
                "resource_type": resource_type,
                "resource_id": resource_id,
            },
        )
```

---

## Error Handling Patterns

### Pattern 1: Explicit Error Cases

```python
async def get_user(user_id: UUID) -> User:
    """
    Get user by ID.

    Args:
        user_id: User UUID

    Returns:
        User instance

    Raises:
        UserNotFoundError: If user doesn't exist
        DatabaseError: If database query fails
    """
    try:
        result = await db.execute(
            select(User).where(User.id == user_id)
        )
        user: User | None = result.scalar_one_or_none()

        if user is None:
            raise UserNotFoundError(user_id=user_id)

        return user

    except SQLAlchemyError as e:
        raise DatabaseError(
            message=f"Failed to retrieve user {user_id}",
            details={"user_id": str(user_id), "sql_error": str(e)},
        ) from e
```

### Pattern 2: Service Layer Error Handling

```python
class UserService:
    """User service with comprehensive error handling"""

    async def update_user(
        self,
        user_id: UUID,
        update_data: UserUpdate,
        current_user: User,
    ) -> User:
        """
        Update user.

        Args:
            user_id: User to update
            update_data: Update data
            current_user: User making request

        Returns:
            Updated user

        Raises:
            UserNotFoundError: If user doesn't exist
            AuthorizationError: If current user can't update target user
            UserAlreadyExistsError: If new email already taken
            DatabaseError: If database operation fails
        """
        # Step 1: Get existing user
        existing_user: User | None = await self.get_user(user_id)

        if existing_user is None:
            raise UserNotFoundError(user_id=user_id)

        # Step 2: Check authorization
        if not self._can_update_user(current_user, existing_user):
            raise AuthorizationError(
                user_id=current_user.id,
                action="update",
                resource_type="User",
                resource_id=str(user_id),
            )

        # Step 3: Check email uniqueness if changing email
        if update_data.email is not None and update_data.email != existing_user.email:
            email_check: User | None = await self._get_user_by_email(
                update_data.email
            )

            if email_check is not None:
                raise UserAlreadyExistsError(
                    resource_type="User",
                    field="email",
                    value=update_data.email,
                )

        # Step 4: Apply updates
        if update_data.email is not None:
            existing_user.email = update_data.email.lower()

        if update_data.password is not None:
            existing_user.password_hash = self._hash_password(update_data.password)

        if update_data.role is not None:
            existing_user.role = update_data.role

        if update_data.is_active is not None:
            existing_user.is_active = update_data.is_active

        # Step 5: Commit
        try:
            await self.db.commit()
            await self.db.refresh(existing_user)
        except IntegrityError as e:
            await self.db.rollback()
            raise UserAlreadyExistsError(
                resource_type="User",
                field="email",
                value=update_data.email or existing_user.email,
            ) from e
        except SQLAlchemyError as e:
            await self.db.rollback()
            raise DatabaseError(
                message=f"Failed to update user {user_id}",
                details={"user_id": str(user_id), "sql_error": str(e)},
            ) from e

        return existing_user
```

### Pattern 3: API Error Mapping

```python
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

app = FastAPI()

@app.exception_handler(ApplicationError)
async def application_error_handler(
    request: Request,
    exc: ApplicationError,
) -> JSONResponse:
    """
    Handle all application errors with consistent format.

    Args:
        request: FastAPI request
        exc: Application error

    Returns:
        JSON error response
    """
    # Map error types to HTTP status codes
    status_code_map: dict[type, int] = {
        NotFoundError: 404,
        AlreadyExistsError: 409,
        ValidationError: 400,
        AuthenticationError: 401,
        AuthorizationError: 403,
        DatabaseError: 500,
    }

    status_code: int = status_code_map.get(type(exc), 500)

    # Build machine-readable error response
    error_response: dict[str, Any] = exc.to_dict()
    error_response["request_id"] = request.state.request_id
    error_response["path"] = request.url.path

    # Log error with full context
    logger.error(
        f"{exc.error_code}: {exc.message}",
        extra={
            "error_type": exc.error_code,
            "error_details": exc.details,
            "request_id": request.state.request_id,
            "path": request.url.path,
            "method": request.method,
        },
        exc_info=True if status_code >= 500 else False,
    )

    return JSONResponse(
        status_code=status_code,
        content=error_response,
    )

@app.middleware("http")
async def add_request_id(request: Request, call_next):
    """Add unique request ID for error tracking"""
    request.state.request_id = str(uuid4())
    response = await call_next(request)
    response.headers["X-Request-ID"] = request.state.request_id
    return response
```

---

## TypeScript Error Handling

```typescript
// Explicit error classes
export class ApiError extends Error {
    constructor(
        message: string,
        public readonly statusCode: number,
        public readonly errorType: string,
        public readonly details?: Record<string, unknown>,
        public readonly requestId?: string,
    ) {
        super(message);
        this.name = 'ApiError';
    }

    toJSON(): Record<string, unknown> {
        return {
            name: this.name,
            message: this.message,
            errorType: this.errorType,
            statusCode: this.statusCode,
            details: this.details,
            requestId: this.requestId,
        };
    }
}

export class UserNotFoundError extends ApiError {
    constructor(userId: string, requestId?: string) {
        super(
            `User ${userId} not found`,
            404,
            'USER_NOT_FOUND',
            { userId },
            requestId,
        );
        this.name = 'UserNotFoundError';
    }
}

// Explicit error handling in async functions
export async function getUser(userId: string): Promise<User> {
    const response: Response = await fetch(`/api/users/${userId}`);

    // Extract request ID
    const requestId: string | null = response.headers.get('X-Request-ID');

    // Handle non-OK responses
    if (!response.ok) {
        const errorData: unknown = await response.json();

        if (isErrorResponse(errorData)) {
            // Map to specific error types
            if (errorData.error_type === 'NOT_FOUND') {
                throw new UserNotFoundError(userId, requestId ?? undefined);
            }

            // Generic API error
            throw new ApiError(
                errorData.error_message,
                response.status,
                errorData.error_type,
                errorData.error_details,
                requestId ?? undefined,
            );
        }

        // Unknown error format
        throw new ApiError(
            'Unknown error occurred',
            response.status,
            'UNKNOWN_ERROR',
            undefined,
            requestId ?? undefined,
        );
    }

    // Parse successful response
    const data: unknown = await response.json();

    if (!isUser(data)) {
        throw new TypeError('Invalid user data from API');
    }

    return data;
}

// Type guard for error responses
function isErrorResponse(value: unknown): value is {
    error_type: string;
    error_message: string;
    error_details?: Record<string, unknown>;
} {
    return (
        typeof value === 'object' &&
        value !== null &&
        'error_type' in value &&
        typeof value.error_type === 'string' &&
        'error_message' in value &&
        typeof value.error_message === 'string'
    );
}
```

---

## AI-Optimized Error Messages

### Bad Error (Human-style)
```
Error: Something went wrong
```

**Problems**:
- No context
- No error type
- Not actionable

### Good Error (AI-style)
```json
{
  "error_type": "USER_ALREADY_EXISTS",
  "error_message": "User with email=test@example.com already exists",
  "error_details": {
    "resource_type": "User",
    "field": "email",
    "value": "test@example.com",
    "existing_user_id": "550e8400-e29b-41d4-a716-446655440000"
  },
  "timestamp": "2025-12-15T10:30:00Z",
  "request_id": "req_123abc",
  "path": "/api/users",
  "suggestions": [
    "Use existing user with ID 550e8400-e29b-41d4-a716-446655440000",
    "Try a different email address",
    "Call GET /api/users?email=test@example.com to retrieve existing user"
  ]
}
```

**AI advantages**:
- Error type for pattern matching
- Full context for diagnosis
- Actionable suggestions
- Request ID for tracing

---

## Error Recovery Patterns

```python
from tenacity import (
    retry,
    stop_after_attempt,
    wait_exponential,
    retry_if_exception_type,
)

@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=1, max=10),
    retry=retry_if_exception_type(DatabaseError),
    reraise=True,
)
async def get_user_with_retry(user_id: UUID) -> User:
    """
    Get user with automatic retry on database errors.

    Retries up to 3 times with exponential backoff.

    Args:
        user_id: User UUID

    Returns:
        User instance

    Raises:
        UserNotFoundError: If user doesn't exist (not retried)
        DatabaseError: If all retries fail
    """
    return await get_user(user_id)
```

---

## Summary: Error Handling Checklist

- [ ] All errors inherit from ApplicationError
- [ ] Every error has explicit type/code
- [ ] Every error includes full context
- [ ] Every error is documented in function docstring
- [ ] API errors return machine-readable JSON
- [ ] Every error has request ID for tracing
- [ ] Errors include actionable suggestions
- [ ] Error types map to appropriate HTTP codes
- [ ] No silent failures anywhere
- [ ] All errors are logged with context
