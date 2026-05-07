# AI Dev Stack: Testing Strategy

**Principle**: Testing is not optional. 100% coverage is default. AI can generate comprehensive tests automatically.

---

## Core Testing Philosophy

### Human Testing Approach
- Manual testing
- Tests as afterthought
- "Good enough" coverage (60-80%)
- Fear of writing tests (boring, time-consuming)

### AI Testing Approach
- Automated generation from types/schemas
- Tests generated alongside code
- 100% coverage is default (AI doesn't get bored)
- Property-based testing finds edge cases
- Tests are executable specifications

---

## Testing Pyramid (AI-Optimized)

```
         /\
        /E2E\        10% - Full system tests
       /------\
      /  API  \      30% - Integration tests
     /--------\
    / UNIT     \     60% - Unit tests + Property tests
   /____________\
```

But with AI generation, we can afford much higher integration test coverage.

---

## Layer 1: Unit Tests

**Coverage**: Every function, every method, every edge case

### Standard Unit Test Template

```python
import pytest
from typing import Any

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
            - User has all expected attributes
            - Password is hashed (not plain text)
        """
        # Arrange
        user_data: UserCreate = UserCreate(
            email="test@example.com",
            password="SecurePassword123",
            role=UserRole.USER,
        )
        service: UserService = UserService(db=db_session)

        # Act
        user: User = await service.create_user(user_data=user_data)

        # Assert
        assert user.id is not None, "User should have ID"
        assert user.email == "test@example.com", "Email should match input"
        assert user.role == UserRole.USER, "Role should be USER"
        assert user.is_active is True, "User should be active by default"
        assert user.password_hash != user_data.password, "Password should be hashed"
        assert len(user.password_hash) > 0, "Password hash should not be empty"

    async def test_create_user_duplicate_email(
        self,
        db_session: AsyncSession,
        test_user: User,  # Fixture providing existing user
    ) -> None:
        """
        Test user creation fails with duplicate email.

        Scenario:
            - User with email already exists
            - Attempt to create user with same email

        Expected:
            - UserAlreadyExistsError raised
            - Error contains email address
            - No user created in database
        """
        # Arrange
        user_data: UserCreate = UserCreate(
            email=test_user.email,  # Use existing email
            password="DifferentPassword123",
        )
        service: UserService = UserService(db=db_session)

        # Act & Assert
        with pytest.raises(UserAlreadyExistsError) as exc_info:
            await service.create_user(user_data=user_data)

        # Verify error details
        error: UserAlreadyExistsError = exc_info.value
        assert error.email == test_user.email, "Error should contain email"

        # Verify no duplicate created
        users_count: int = await db_session.scalar(
            select(func.count()).select_from(User)
        )
        assert users_count == 1, "Should still have only one user"

    async def test_create_user_invalid_password(
        self,
        db_session: AsyncSession,
    ) -> None:
        """
        Test user creation fails with weak password.

        Scenario:
            - Password doesn't meet strength requirements
            - Missing uppercase, lowercase, or digit

        Expected:
            - ValidationError raised by Pydantic
            - Error message explains requirement
        """
        # Arrange
        service: UserService = UserService(db=db_session)

        # Test missing uppercase
        with pytest.raises(ValueError) as exc_info:
            UserCreate(
                email="test@example.com",
                password="weakpassword123",  # No uppercase
            )
        assert "uppercase" in str(exc_info.value).lower()

        # Test missing lowercase
        with pytest.raises(ValueError) as exc_info:
            UserCreate(
                email="test@example.com",
                password="WEAKPASSWORD123",  # No lowercase
            )
        assert "lowercase" in str(exc_info.value).lower()

        # Test missing digit
        with pytest.raises(ValueError) as exc_info:
            UserCreate(
                email="test@example.com",
                password="WeakPassword",  # No digit
            )
        assert "digit" in str(exc_info.value).lower()

    async def test_create_user_database_error(
        self,
        db_session_with_error: AsyncSession,  # Mock session that raises errors
    ) -> None:
        """
        Test user creation handles database errors.

        Scenario:
            - Database operation fails
            - SQLAlchemyError raised during commit

        Expected:
            - DatabaseError raised
            - Session is rolled back
            - Original error is chained
        """
        # Arrange
        user_data: UserCreate = UserCreate(
            email="test@example.com",
            password="SecurePassword123",
        )
        service: UserService = UserService(db=db_session_with_error)

        # Act & Assert
        with pytest.raises(DatabaseError) as exc_info:
            await service.create_user(user_data=user_data)

        # Verify error chaining
        assert exc_info.value.__cause__ is not None, "Should chain original error"
```

**AI Pattern**: Every test is comprehensive with explicit:
- Scenario description
- Expected outcome
- Detailed assertions
- Error verification

---

## Layer 2: Property-Based Tests

**Coverage**: Find edge cases humans/AI might miss

```python
from hypothesis import given, strategies as st, assume
from hypothesis import settings as hypothesis_settings

class TestUserServiceProperties:
    """Property-based tests for UserService"""

    @given(
        email=st.emails(),
        password=st.text(
            alphabet=st.characters(
                whitelist_categories=("L", "N"),
                min_codepoint=32,
                max_codepoint=126,
            ),
            min_size=12,
            max_size=128,
        ),
    )
    @hypothesis_settings(max_examples=100)
    async def test_create_user_with_any_valid_email_password(
        self,
        db_session: AsyncSession,
        email: str,
        password: str,
    ) -> None:
        """
        Property: Any valid email and password should create user successfully.

        This test generates 100 random valid email/password combinations
        and verifies user creation works for all of them.
        """
        # Ensure password meets strength requirements
        assume(any(c.isupper() for c in password))
        assume(any(c.islower() for c in password))
        assume(any(c.isdigit() for c in password))

        # Arrange
        user_data: UserCreate = UserCreate(
            email=email,
            password=password,
        )
        service: UserService = UserService(db=db_session)

        # Act
        user: User = await service.create_user(user_data=user_data)

        # Assert properties
        assert user.id is not None
        assert user.email == email.lower()  # Should normalize to lowercase
        assert user.password_hash != password  # Should be hashed
        assert user.is_active is True

    @given(
        user_role=st.sampled_from([UserRole.ADMIN, UserRole.USER, UserRole.GUEST]),
    )
    async def test_create_user_with_any_role(
        self,
        db_session: AsyncSession,
        user_role: UserRole,
    ) -> None:
        """
        Property: User creation should work with any valid role.
        """
        # Arrange
        user_data: UserCreate = UserCreate(
            email=f"test_{user_role.value}@example.com",
            password="SecurePassword123",
            role=user_role,
        )
        service: UserService = UserService(db=db_session)

        # Act
        user: User = await service.create_user(user_data=user_data)

        # Assert
        assert user.role == user_role

    @given(
        emails=st.lists(
            st.emails(),
            min_size=1,
            max_size=10,
            unique=True,
        ),
    )
    async def test_create_multiple_users_all_succeed(
        self,
        db_session: AsyncSession,
        emails: list[str],
    ) -> None:
        """
        Property: Creating multiple users with unique emails should all succeed.
        """
        service: UserService = UserService(db=db_session)

        for email in emails:
            user_data: UserCreate = UserCreate(
                email=email,
                password="SecurePassword123",
            )
            user: User = await service.create_user(user_data=user_data)
            assert user.email == email.lower()

        # Verify all created
        users_count: int = await db_session.scalar(
            select(func.count()).select_from(User)
        )
        assert users_count == len(emails)
```

**AI Advantage**: AI can generate hundreds of property tests covering vast input space.

---

## Layer 3: Integration Tests

**Coverage**: API endpoints, database integration, service integration

```python
from httpx import AsyncClient
import pytest

class TestUserAPI:
    """Integration tests for user API endpoints"""

    async def test_create_user_endpoint_success(
        self,
        api_client: AsyncClient,
    ) -> None:
        """
        Test POST /api/users creates user successfully.

        Integration points:
            - FastAPI request validation
            - Service layer
            - Database persistence
            - Response serialization
        """
        # Arrange
        request_data: dict[str, Any] = {
            "email": "test@example.com",
            "password": "SecurePassword123",
            "role": "user",
        }

        # Act
        response: Response = await api_client.post(
            "/api/users",
            json=request_data,
        )

        # Assert response
        assert response.status_code == 201, "Should return 201 Created"

        response_data: dict[str, Any] = response.json()
        assert "id" in response_data, "Response should include user ID"
        assert response_data["email"] == "test@example.com"
        assert response_data["role"] == "user"
        assert "password" not in response_data, "Should not return password"
        assert "password_hash" not in response_data, "Should not return hash"

    async def test_create_user_endpoint_duplicate_email(
        self,
        api_client: AsyncClient,
        test_user: User,
    ) -> None:
        """
        Test POST /api/users returns 409 for duplicate email.

        Integration points:
            - Request validation
            - Service error handling
            - HTTP error mapping
        """
        # Arrange
        request_data: dict[str, Any] = {
            "email": test_user.email,
            "password": "DifferentPassword123",
        }

        # Act
        response: Response = await api_client.post(
            "/api/users",
            json=request_data,
        )

        # Assert
        assert response.status_code == 409, "Should return 409 Conflict"

        error_data: dict[str, Any] = response.json()
        assert error_data["error_type"] == "USER_ALREADY_EXISTS"
        assert test_user.email in error_data["message"]
        assert "details" in error_data
        assert error_data["details"]["email"] == test_user.email

    async def test_create_user_endpoint_invalid_email(
        self,
        api_client: AsyncClient,
    ) -> None:
        """
        Test POST /api/users returns 422 for invalid email.

        Integration points:
            - Pydantic validation
            - FastAPI error handling
        """
        # Arrange
        request_data: dict[str, Any] = {
            "email": "not-an-email",  # Invalid format
            "password": "SecurePassword123",
        }

        # Act
        response: Response = await api_client.post(
            "/api/users",
            json=request_data,
        )

        # Assert
        assert response.status_code == 422, "Should return 422 Validation Error"

        error_data: dict[str, Any] = response.json()
        assert "detail" in error_data
        # Pydantic validation error format
        assert isinstance(error_data["detail"], list)
        assert any("email" in str(err).lower() for err in error_data["detail"])
```

---

## Layer 4: End-to-End Tests

**Coverage**: Complete user flows through UI

```typescript
// e2e/user-registration.spec.ts

import { test, expect } from '@playwright/test';

test.describe('User Registration Flow', () => {
    test('should register new user successfully', async ({ page }) => {
        // Navigate to registration page
        await page.goto('/register');

        // Fill form
        await page.fill('input[name="email"]', 'newuser@example.com');
        await page.fill('input[name="password"]', 'SecurePassword123');
        await page.fill('input[name="confirmPassword"]', 'SecurePassword123');

        // Submit
        await page.click('button[type="submit"]');

        // Wait for redirect to dashboard
        await page.waitForURL('/dashboard');

        // Verify user is logged in
        const userEmail = await page.textContent('[data-testid="user-email"]');
        expect(userEmail).toBe('newuser@example.com');
    });

    test('should show error for duplicate email', async ({ page }) => {
        // Navigate to registration page
        await page.goto('/register');

        // Fill with existing user email
        await page.fill('input[name="email"]', 'existing@example.com');
        await page.fill('input[name="password"]', 'SecurePassword123');
        await page.fill('input[name="confirmPassword"]', 'SecurePassword123');

        // Submit
        await page.click('button[type="submit"]');

        // Verify error message
        const errorMessage = await page.textContent('[data-testid="error-message"]');
        expect(errorMessage).toContain('already exists');
    });
});
```

---

## Test Organization

```
backend/
├── tests/
│   ├── conftest.py           # Shared fixtures
│   ├── test_unit/            # Unit tests
│   │   ├── test_services/
│   │   │   ├── test_user_service.py
│   │   │   └── test_user_service_properties.py
│   │   └── test_utils/
│   │       └── test_validators.py
│   ├── test_integration/     # Integration tests
│   │   ├── test_api/
│   │   │   └── test_users_api.py
│   │   └── test_database/
│   │       └── test_user_queries.py
│   └── test_e2e/             # End-to-end tests
│       └── test_user_flows.py

frontend/
├── tests/
│   ├── unit/                 # Component tests
│   │   └── UserList.test.tsx
│   ├── integration/          # Service integration tests
│   │   └── userService.test.ts
│   └── e2e/                  # Playwright tests
│       └── user-registration.spec.ts
```

---

## Coverage Requirements

### Mandatory 100% Coverage For:
- [ ] All service methods
- [ ] All API endpoints
- [ ] All Pydantic validators
- [ ] All custom exceptions
- [ ] All utility functions

### 90%+ Coverage For:
- [ ] Database queries
- [ ] React components
- [ ] TypeScript utilities

### E2E Coverage:
- [ ] Every critical user flow
- [ ] Every error scenario users might encounter

---

## AI Test Generation Workflow

```python
# Given a function signature:
async def create_user(user_data: UserCreate) -> User:
    """Create new user"""
    pass

# AI generates automatically:
# 1. Success test
# 2. Each error case test (from raises docstring)
# 3. Property-based tests for input variations
# 4. Integration test for API endpoint
# 5. E2E test for UI flow
```

**Result**: 5+ comprehensive tests generated automatically from single function.

---

## Summary: Testing Checklist

Before marking any feature complete:

- [ ] Unit tests for every function (success + all error cases)
- [ ] Property-based tests for functions with variable inputs
- [ ] Integration tests for every API endpoint
- [ ] E2E test for critical user flows
- [ ] 100% line coverage
- [ ] 100% branch coverage
- [ ] All tests have clear docstrings explaining scenario
- [ ] All tests use explicit assertions with messages
- [ ] Test names describe what they test
- [ ] Fixtures provided for all common test data
