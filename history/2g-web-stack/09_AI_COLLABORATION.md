# AI Dev Stack: AI-to-AI Collaboration Protocols

**How multiple AI agents collaborate on code**

---

## Collaboration Scenarios

### Scenario 1: Human → AI (Most Common)
Human provides requirements, AI implements

### Scenario 2: AI → AI (Handoff)
One AI starts work, another AI continues

### Scenario 3: AI + AI (Parallel)
Multiple AIs work on same codebase simultaneously

### Scenario 4: AI → Human → AI (Review)
AI implements, human reviews, AI revises

---

## Protocol 1: Context Handoff

**Problem**: AI A starts work, session ends. AI B needs to continue.

**Solution**: Comprehensive documentation + explicit state

### What AI A Leaves Behind:

```markdown
# HANDOFF_NOTES.md

## What Was Implemented

### Completed:
- [x] Database migration for users table (migrations/001_create_users.sql)
- [x] User SQLAlchemy model (app/models/user.py)
- [x] User Pydantic schemas (app/schemas/user.py)
- [x] UserService with create/get methods (app/services/user_service.py)
- [x] User API routes - POST and GET only (app/routes/users.py)
- [x] Unit tests for UserService (tests/test_services/test_user_service.py)

### In Progress:
- [ ] User API routes - PUT and DELETE (app/routes/users.py:45)
      - PUT route scaffolded but needs authorization check
      - DELETE route not started
- [ ] Integration tests for API (tests/test_api/test_users.py)
      - Only POST test written, need GET/PUT/DELETE tests

### Not Started:
- [ ] Frontend user management UI
- [ ] Password reset flow
- [ ] Email verification

## Current State

### Files Modified:
- app/models/user.py (new file, complete)
- app/schemas/user.py (new file, complete)
- app/services/user_service.py (new file, 80% complete - missing update/delete)
- app/routes/users.py (new file, 50% complete - missing PUT/DELETE)
- migrations/001_create_users.sql (new file, complete)
- tests/test_services/test_user_service.py (new file, complete for implemented methods)

### Dependencies Added:
- passlib[bcrypt] (for password hashing)
- python-jose[cryptography] (for JWT, not yet used)

### Known Issues:
1. UserService.update_user needs authorization check before allowing updates
2. Need to decide: soft delete (is_active=False) or hard delete?
3. Email validation currently Pydantic only - should we add unique constraint at DB level?

## Next Steps (Priority Order):

1. **HIGH**: Implement authorization middleware
   - Check if current_user can update target user
   - Admin can update anyone, users can only update self

2. **HIGH**: Complete UserService.update_user and .delete_user methods
   - Add authorization checks
   - Decide on soft vs hard delete strategy

3. **MEDIUM**: Complete API routes (PUT /api/users/{id}, DELETE /api/users/{id})
   - Use get_current_user dependency
   - Return appropriate error codes (403 for unauthorized)

4. **MEDIUM**: Write integration tests for all endpoints

5. **LOW**: Add password reset flow (new feature, not blocking)

## Questions for Next AI:

1. Soft delete or hard delete for users? (Recommend soft delete for audit trail)
2. Should we add email verification before activating accounts?
3. JWT expiration time - currently 60 minutes, is this appropriate?

## Code Generation Commands Used:

```bash
ai-codegen models --from-migration migrations/001_create_users.sql
ai-codegen schemas --from-model app/models/user.py
ai-testgen service app/services/user_service.py
```

## Testing Status:

```
test_services/test_user_service.py::TestUserService::test_create_user_success PASSED
test_services/test_user_service.py::TestUserService::test_create_user_duplicate_email PASSED
test_services/test_user_service.py::TestUserService::test_get_user_success PASSED
test_services/test_user_service.py::TestUserService::test_get_user_not_found PASSED

Coverage: 95% (app/services/user_service.py)
Missing coverage: update_user and delete_user methods (not yet implemented)
```

## Architecture Decisions Made:

1. **Password hashing**: Using bcrypt via passlib (industry standard)
2. **User roles**: Enum at database level (admin/user/guest)
3. **Email**: Lowercase only (enforced by CHECK constraint)
4. **User IDs**: UUID v4 (for security, non-sequential)
5. **Timestamps**: Timezone-aware (TIMESTAMPTZ)
6. **Service layer**: Handles all business logic, routes are thin

## References:

- AI Dev Stack standards: /path/to/ai_dev_stack/_project_docs/
- Migration: migrations/001_create_users.sql:1
- Model: app/models/user.py:15
- Service: app/services/user_service.py:25
```

**Key points**:
- Explicit completed/in-progress/not-started lists
- File references with line numbers
- Known issues documented
- Questions for next developer
- Architecture decisions recorded
- Commands used (reproducible)

---

## Protocol 2: Explicit Todos in Code

**Problem**: AI needs to mark where work is incomplete

**Solution**: Explicit TODO comments with context

```python
def update_user(
    self,
    user_id: UUID,
    update_data: UserUpdate,
    current_user: User,
) -> User:
    """
    Update user.

    TODO(ai-2024-12-15): Add authorization check
    - Admin can update any user
    - Regular users can only update themselves
    - Guest users cannot update anyone

    See: app/middleware/auth.py for authorization helpers

    Example:
        if not can_update_user(current_user, target_user):
            raise AuthorizationError(...)
    """
    # Current implementation (no auth check yet)
    pass
```

**Format**:
- `TODO(ai-YYYY-MM-DD): Description`
- Include what needs to be done
- Include why it's not done yet
- Include references to relevant code
- Include example of what completed code should look like

---

## Protocol 3: Type-Driven Collaboration

**Problem**: AI B doesn't know what AI A intended

**Solution**: Types + tests = executable specification

### Example:

**AI A defines interface**:
```python
class UserServiceProtocol(Protocol):
    """
    Protocol defining user service interface.

    Any implementation of this service must provide these methods.
    """

    async def create_user(self, user_data: UserCreate) -> User:
        """Create new user. Raises UserAlreadyExistsError if email taken."""
        ...

    async def get_user(self, user_id: UUID) -> User | None:
        """Get user by ID. Returns None if not found."""
        ...

    async def update_user(
        self,
        user_id: UUID,
        update_data: UserUpdate,
        current_user: User,
    ) -> User:
        """
        Update user.

        Raises:
            UserNotFoundError: If user doesn't exist
            AuthorizationError: If current_user cannot update target user
        """
        ...
```

**AI B implements**:
```python
class UserService:
    """Implementation of UserServiceProtocol"""

    async def update_user(
        self,
        user_id: UUID,
        update_data: UserUpdate,
        current_user: User,
    ) -> User:
        # Implementation here
        # Type checker ensures signature matches protocol
        # Tests ensure behavior matches docstring
        pass
```

**Benefit**: Type checker verifies AI B implements what AI A designed

---

## Protocol 4: Test-Driven Handoff

**AI A writes tests, AI B implements**:

```python
# tests/test_user_service.py (written by AI A)

class TestUserService:
    """Tests for UserService - SPECIFICATION for AI B"""

    async def test_update_user_as_admin(
        self,
        db_session: AsyncSession,
        admin_user: User,
        regular_user: User,
    ) -> None:
        """
        Admin should be able to update any user.

        AI B: Implement update_user to make this test pass.
        """
        service = UserService(db=db_session)
        update_data = UserUpdate(email="newemail@example.com")

        # Admin updates regular user - should succeed
        updated_user = await service.update_user(
            user_id=regular_user.id,
            update_data=update_data,
            current_user=admin_user,
        )

        assert updated_user.email == "newemail@example.com"

    async def test_update_user_as_regular_user_self(
        self,
        db_session: AsyncSession,
        regular_user: User,
    ) -> None:
        """
        Regular user should be able to update themselves.

        AI B: Implement update_user to make this test pass.
        """
        service = UserService(db=db_session)
        update_data = UserUpdate(full_name="New Name")

        # User updates self - should succeed
        updated_user = await service.update_user(
            user_id=regular_user.id,
            update_data=update_data,
            current_user=regular_user,  # Same user
        )

        assert updated_user.full_name == "New Name"

    async def test_update_user_as_regular_user_other(
        self,
        db_session: AsyncSession,
        regular_user: User,
        other_user: User,
    ) -> None:
        """
        Regular user should NOT be able to update other users.

        AI B: Implement update_user to make this test pass.
        """
        service = UserService(db=db_session)
        update_data = UserUpdate(email="hacked@example.com")

        # User tries to update other user - should raise AuthorizationError
        with pytest.raises(AuthorizationError) as exc_info:
            await service.update_user(
                user_id=other_user.id,
                update_data=update_data,
                current_user=regular_user,
            )

        assert exc_info.value.action == "update"
        assert exc_info.value.resource_type == "User"
```

**AI B runs tests, implements until all pass**

---

## Protocol 5: Explicit State Files

**Problem**: Multiple AIs need to coordinate

**Solution**: Machine-readable state files

```json
// .ai-state.json

{
  "project": "user-management-api",
  "version": "1.0.0",
  "last_updated": "2025-12-15T10:30:00Z",
  "last_updated_by": "claude-sonnet-4.5",

  "architecture": {
    "backend": "fastapi",
    "frontend": "nextjs",
    "database": "postgresql",
    "orm": "sqlalchemy",
    "testing": "pytest"
  },

  "migrations": {
    "latest": "001_create_users",
    "pending": []
  },

  "features": {
    "user_authentication": {
      "status": "in_progress",
      "completion": 60,
      "files": [
        "app/models/user.py",
        "app/services/user_service.py",
        "app/routes/users.py"
      ],
      "blockers": [
        "Need to implement authorization middleware"
      ],
      "next_steps": [
        "Implement update_user with auth checks",
        "Implement delete_user",
        "Add integration tests"
      ]
    },
    "password_reset": {
      "status": "not_started",
      "dependencies": ["user_authentication"]
    }
  },

  "known_issues": [
    {
      "file": "app/services/user_service.py",
      "line": 85,
      "issue": "Missing authorization check in update_user",
      "severity": "high"
    }
  ],

  "decisions": [
    {
      "decision": "Use bcrypt for password hashing",
      "rationale": "Industry standard, secure",
      "date": "2025-12-15",
      "alternatives_considered": ["argon2", "scrypt"]
    },
    {
      "decision": "Use UUID for user IDs",
      "rationale": "Security (non-sequential), globally unique",
      "date": "2025-12-15"
    }
  ]
}
```

**Usage**:
```bash
# AI reads current state
ai-collab status

# AI updates state after work
ai-collab update --feature user_authentication --completion 75

# AI checks for conflicts
ai-collab check-conflicts
```

---

## Protocol 6: Atomic Commits with Context

**Every commit includes**:

```
git commit -m "$(cat <<'EOF'
Implement UserService.create_user method

WHAT:
- Add create_user method to UserService
- Hash passwords with bcrypt before storage
- Check for duplicate emails before creation

WHY:
- Needed for user registration flow
- Part of user_authentication feature (60% → 70%)

TESTS:
- test_create_user_success: User created successfully
- test_create_user_duplicate_email: Raises UserAlreadyExistsError
- Coverage: 95% on user_service.py

RELATED:
- Implements UserServiceProtocol.create_user
- Used by POST /api/users route
- See: app/routes/users.py:25

NEXT STEPS:
- Implement update_user method
- Add authorization checks

REFS:
- Migration: migrations/001_create_users.sql
- Model: app/models/user.py:15
- Schema: app/schemas/user.py:10
- Tests: tests/test_user_service.py:20

AI: claude-sonnet-4.5
Date: 2025-12-15T10:30:00Z
EOF
)"
```

**Benefits**:
- Next AI understands commit without reading code
- Explicit what/why/tests/next-steps
- References to related files

---

## Protocol 7: Code Review Protocol

**AI B reviews AI A's code**:

```python
# AI B adds review comments as docstrings

def create_user(self, user_data: UserCreate) -> User:
    """
    Create new user.

    REVIEW (ai-2025-12-15):
    ✅ Good: Explicit type annotations
    ✅ Good: Comprehensive error handling
    ✅ Good: Tests cover all cases
    ⚠️  Consider: Add rate limiting for registration (prevent spam)
    ⚠️  Consider: Add email domain whitelist/blacklist
    ❌ Issue: Password hash not salted (security risk)

    FIX REQUIRED:
    - Line 45: Use bcrypt.gensalt() to generate unique salt per user
    - See: https://en.wikipedia.org/wiki/Salt_(cryptography)
    """
    pass
```

**AI A addresses review**:
```python
def create_user(self, user_data: UserCreate) -> User:
    """
    Create new user.

    REVIEW ADDRESSED (ai-2025-12-15):
    ✅ Fixed: Now using bcrypt.gensalt() for unique salt per user
    ✅ Added: Rate limiting via SlowAPI middleware (10 req/hour)
    📝 Deferred: Email domain whitelist (will implement in v2, created ticket)
    """
    pass
```

---

## Summary: AI Collaboration Best Practices

### For AI Completing Work:
1. ✅ Update HANDOFF_NOTES.md with current state
2. ✅ Mark incomplete work with TODO comments
3. ✅ Update .ai-state.json
4. ✅ Write comprehensive commit messages
5. ✅ Leave tests for next AI to implement
6. ✅ Document all architecture decisions

### For AI Picking Up Work:
1. ✅ Read HANDOFF_NOTES.md first
2. ✅ Check .ai-state.json for current state
3. ✅ Run tests to understand expected behavior
4. ✅ Check git log for recent changes
5. ✅ Look for TODO comments in code
6. ✅ Review Protocol definitions for interfaces

### For All AIs:
1. ✅ Follow AI Dev Stack coding standards
2. ✅ Write comprehensive docstrings
3. ✅ Add explicit type annotations
4. ✅ Write tests alongside code
5. ✅ Document decisions and rationale
6. ✅ Use Protocol classes for interfaces
7. ✅ Leave code better than you found it

**The goal**: Any AI should be able to pick up where another AI left off with zero human explanation.
