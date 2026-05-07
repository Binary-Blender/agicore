# MelodyLMS – Sprint 2025-11 Backend Tasks (Phase 2)
**Created:** 2025-11-18
**Owner:** Backend AI
**Status:** ✅ P16, P17, P18 Complete
**Last Updated:** 2025-11-19 - Playlist system foundations merged with API + migration

---

## ✅ COMPLETED (All Phase 1 Priorities + P16)

- **P1: Video Generation Backend** ✅
- **P2: Security Hardening** ✅
- **P3: Operational Readiness** ✅
- **P4: Quiz Submit Validation** ✅
- **P5: Asset Pagination** ✅
- **P6: Watch Session Validation** ✅
- **P7: Training Module CRUD Validation** ✅
- **P8: Favorites Validation** ✅
- **P9: Preferences & Video Creation Validation** ✅
- **P10: Asset Upload Validation** ✅
- **P11: Quiz CRUD Validation** ✅
- **P11.5: Asset Approval Validation** ✅
- **P12: Search & Filtering Enhancements** ✅
- **P13: Caching Layer Prep** ✅
- **P14: AI Generation Validation** ✅
- **P15: Visual Asset Validation** ✅
- **P16: Database Cleanup & Retention Policies** ✅ **DEPLOYED**

**Total Phase 1 + P16 Time:** ~48 hours of backend development
**Deployment Status:** ✅ Production (deployed Nov 18, 2025)

---

## 🎯 CURRENT SPRINT (P17-P18)

### Priority Overview

| Priority | Feature | Estimated Time | Status | Deployment Target |
|----------|---------|----------------|--------|-------------------|
| P17 | Performance Monitoring | ~6 hours | ✅ Complete | Week of Nov 18 |
| P18 | Playlist System Foundations | ~10 hours | ⏳ Queued | Week of Nov 25 |

**Total Sprint Estimate:** 16 hours

---

## 🔍 P17: Performance Monitoring & Instrumentation

### Business Context
As the system scales and handles more users, we need visibility into:
- Which database queries are slow and need optimization
- Which API endpoints have performance issues
- Overall system response times and trends
- Memory usage patterns that might indicate leaks

This priority provides the instrumentation needed to identify and fix performance bottlenecks proactively.

### Technical Architecture

**Monitoring Approach:**
- In-memory metrics storage (low overhead, no external dependencies)
- Rolling window of recent data (prevents unbounded memory growth)
- Admin-only API endpoints for metrics access
- Integration with existing health check system
- Optional export to external monitoring systems (future enhancement)

**Performance Impact:**
- Minimal overhead (<5ms per request)
- Memory-bounded storage (max 1000 requests + 100 slow queries)
- Can be disabled via environment variable if needed

**Implementation Status:** ✅ Query logger, performance middleware, metrics routes, and health check updates deployed on Nov 18, 2025.

---

### Task 1: Database Query Performance Logger

**Estimated Time:** 2.5 hours

**File:** `src/middleware/queryLogger.ts`

**Objective:** Wrap the database connection pool to automatically log slow queries without modifying existing controller code.

**Requirements:**

1. **Query Timing**
   - Measure execution time for all database queries
   - Log queries that exceed configurable threshold (default: 1000ms)
   - Include query text (truncated to 200 chars), duration, row count, timestamp

2. **Storage & Memory Management**
   - Maintain rolling buffer of last 100 slow queries
   - Auto-evict oldest entries when buffer is full
   - Provide getter for slow query history
   - Provide clear function to reset buffer

3. **Configuration**
   - `SLOW_QUERY_THRESHOLD_MS` - Query duration threshold (default: 1000)
   - `ENABLE_QUERY_LOGGING` - Feature flag to disable logging (default: true)

4. **Integration**
   - Wrap existing `pool.query` method transparently
   - Preserve original query result and error handling
   - No changes required to existing controller code

**Acceptance Criteria:**
- [ ] Queries slower than threshold are logged to console with `[SlowQuery]` prefix
- [ ] Query buffer never exceeds 100 entries
- [ ] Original query functionality is preserved (same results, same errors)
- [ ] Logging can be disabled without code changes (env var)
- [ ] Query text is sanitized/truncated to prevent log flooding
- [ ] Async query execution timing is accurate

**Edge Cases to Handle:**
- Queries with no result set (INSERT/UPDATE/DELETE)
- Queries that error before completion
- Parameterized queries (show placeholder, not actual values)
- Concurrent queries (thread-safe buffer management)
- Pool connection errors vs query errors

**Testing Requirements:**
```typescript
// Unit tests to create:
- Should log queries exceeding threshold
- Should not log queries below threshold
- Should maintain max buffer size of 100
- Should clear buffer when clearSlowQueries() called
- Should handle query errors gracefully
- Should return exact copy of slow queries (not reference)
- Should work with both string queries and query objects
- Should be disabled when ENABLE_QUERY_LOGGING=false
```

**Implementation Notes:**
```typescript
// Wrap pool.query at module initialization
const originalQuery = pool.query.bind(pool);

pool.query = function(...args: any[]): any {
  const startTime = Date.now();
  const query = typeof args[0] === 'string' ? args[0] : args[0]?.text;

  return originalQuery(...args)
    .then((result: any) => {
      const duration = Date.now() - startTime;
      if (ENABLE_QUERY_LOGGING && duration > SLOW_QUERY_THRESHOLD_MS) {
        logSlowQuery(query, duration, result.rowCount);
      }
      return result;
    })
    .catch((error: any) => {
      // Log error but don't suppress it
      const duration = Date.now() - startTime;
      console.error(`[QueryError] ${duration}ms - ${query?.substring(0, 200)}`);
      throw error;
    });
} as any;
```

---

### Task 2: HTTP Request Performance Middleware

**Estimated Time:** 2 hours

**File:** `src/middleware/performanceMonitor.ts`

**Objective:** Track response times for all HTTP requests to identify slow endpoints and overall API health.

**Requirements:**

1. **Request Timing**
   - Measure total request-response cycle time
   - Track HTTP method, path, status code, duration
   - Log requests exceeding 3 seconds to console
   - Store metrics in rolling buffer

2. **Metrics Storage**
   - Maintain last 1000 request metrics in memory
   - Auto-evict oldest when buffer is full
   - Group metrics by endpoint for aggregation

3. **Aggregation Functions**
   - Calculate average response time across all requests
   - Identify slowest endpoints by average duration
   - Support filtering by time window (future enhancement)

4. **Integration**
   - Add as Express middleware before route handlers
   - Use `res.on('finish')` to capture final timing
   - Works with error responses (4xx, 5xx)

**Acceptance Criteria:**
- [ ] All HTTP requests are timed and stored
- [ ] Metrics buffer never exceeds 1000 entries
- [ ] Average response time calculation is accurate
- [ ] Slowest endpoints are correctly ranked by avg duration
- [ ] Slow requests (>3s) are logged to console with `[SlowRequest]` prefix
- [ ] Metrics survive across multiple requests (in-memory persistence)

**Edge Cases to Handle:**
- Requests that error before completion
- Requests closed by client mid-stream
- Very fast requests (<1ms)
- Concurrent requests (thread-safe buffer)
- Dynamic route parameters (e.g., `/api/videos/:id` grouped correctly)

**Data Structures:**
```typescript
interface PerformanceMetric {
  path: string;           // e.g., "/api/videos"
  method: string;         // e.g., "GET"
  duration: number;       // milliseconds
  statusCode: number;     // HTTP status
  timestamp: string;      // ISO 8601
}

// Grouped aggregation
interface EndpointStats {
  path: string;           // e.g., "GET /api/videos"
  avgDuration: number;    // average ms
  count: number;          // total requests
  minDuration: number;    // fastest request
  maxDuration: number;    // slowest request
}
```

**Testing Requirements:**
```typescript
// Unit tests to create:
- Should capture metrics for successful requests
- Should capture metrics for error responses
- Should maintain max buffer size of 1000
- Should calculate correct average response time
- Should identify slowest endpoints correctly
- Should handle concurrent requests safely
- Should log slow requests to console
- Should work with parameterized routes
```

**Security Considerations:**
- Don't log sensitive query parameters (passwords, tokens)
- Sanitize paths before logging
- Rate-limit metrics endpoint to prevent DoS
- Require admin authentication for metrics access

---

### Task 3: Performance Metrics API Endpoints

**Estimated Time:** 1.5 hours

**File:** `src/routes/metricsRoutes.ts`

**Objective:** Provide admin-only HTTP endpoints to query performance metrics.

**Requirements:**

1. **Endpoint: GET /api/metrics/performance**
   - Returns aggregated performance statistics
   - Response includes: total requests, avg response time, slowest endpoints, recent metrics
   - Admin authentication required
   - Supports optional query params: `limit` (default 50, max 1000)

2. **Endpoint: GET /api/metrics/slow-queries**
   - Returns list of slow database queries
   - Response includes: query count, threshold, query details
   - Admin authentication required
   - Supports optional query params: `limit` (default 100)

3. **Endpoint: POST /api/metrics/slow-queries/clear**
   - Clears slow query buffer
   - Admin authentication required
   - Returns success message with count of cleared queries

4. **Endpoint: GET /api/metrics/endpoints**
   - Returns per-endpoint statistics
   - Groups by method + path
   - Shows min/max/avg/count per endpoint
   - Admin authentication required

**Response Schemas:**

```typescript
// GET /api/metrics/performance
{
  totalRequests: number;
  averageResponseTimeMs: number;
  slowestEndpoints: Array<{
    path: string;
    avgDuration: number;
    count: number;
  }>;
  recentMetrics: Array<PerformanceMetric>;
}

// GET /api/metrics/slow-queries
{
  totalSlowQueries: number;
  threshold: number;
  queries: Array<{
    query: string;
    duration: number;
    timestamp: string;
    rows?: number;
  }>;
}

// POST /api/metrics/slow-queries/clear
{
  message: string;
  clearedCount: number;
}
```

**Acceptance Criteria:**
- [ ] All endpoints require admin role (401/403 on unauthorized)
- [ ] Performance endpoint returns correct aggregated stats
- [ ] Slow queries endpoint returns query list with details
- [ ] Clear endpoint successfully resets buffer
- [ ] Limit parameters are respected and validated
- [ ] Invalid limit values return 400 error
- [ ] Endpoints return JSON with proper content-type

**Validation Requirements:**
```typescript
// Create validators in validation.ts
export const validateMetricsQuery = [
  query('limit')
    .optional()
    .isInt({ min: 1, max: 1000 })
    .withMessage('Limit must be between 1 and 1000'),
  handleValidationErrors
];
```

**Testing Requirements:**
```typescript
// Integration tests to create:
- Should return 401 without authentication
- Should return 403 for non-admin users
- Should return performance metrics for admin
- Should return slow queries for admin
- Should clear slow queries buffer
- Should respect limit parameter
- Should reject invalid limit values
- Should handle empty metrics gracefully
```

**Integration Points:**
- Add route to `server.ts`: `app.use('/api/metrics', metricsRoutes);`
- Use existing `authenticate` and `requireRole` middleware
- Import helpers from `queryLogger` and `performanceMonitor`

---

### Task 4: Health Check Integration

**Estimated Time:** 0.5 hours

**File:** `src/routes/healthRoutes.ts`

**Objective:** Add performance metrics summary to existing `/health/detailed` endpoint.

**Requirements:**

1. **Add Performance Section**
   - Include average response time
   - Include slow query count
   - Include request count (last window)
   - Don't break existing health check structure

2. **Maintain Backwards Compatibility**
   - Add new `performance` section to existing response
   - Don't modify existing sections (database, memory, uptime, cleanup_scheduler)
   - Ensure response time stays under 200ms

**Response Schema Addition:**
```typescript
// Add to existing /health/detailed response
{
  status: "healthy" | "degraded",
  timestamp: string,
  checks: {
    database: {...},
    memory: {...},
    uptime: {...},
    cleanup_scheduler: {...},
    performance: {                    // NEW SECTION
      averageResponseTimeMs: number,
      slowQueriesCount: number,
      totalRequests: number,
      status: "ok" | "degraded"       // degraded if avgResponseTime > 1000ms
    }
  }
}
```

**Acceptance Criteria:**
- [ ] Performance section added to `/health/detailed` response
- [ ] Existing health check sections unchanged
- [ ] Performance status is "ok" when avgResponseTime < 1000ms
- [ ] Performance status is "degraded" when avgResponseTime >= 1000ms
- [ ] Health check responds in <200ms even with monitoring enabled

**Testing Requirements:**
```typescript
// Tests to update:
- Should include performance section in detailed health
- Should mark performance as degraded when slow
- Should mark performance as ok when fast
- Should not break existing health check tests
```

---

### Environment Variables

Add to `.env.example` and production environment:

```bash
# Performance Monitoring
SLOW_QUERY_THRESHOLD_MS=1000      # Queries slower than this are logged
ENABLE_QUERY_LOGGING=true         # Set false to disable query logging
PERFORMANCE_METRICS_ENABLED=true  # Set false to disable request tracking
```

---

### Deployment Checklist

**Pre-Deployment:**
- [ ] All TypeScript compiles without errors
- [ ] Unit tests pass for queryLogger
- [ ] Unit tests pass for performanceMonitor
- [ ] Integration tests pass for metrics endpoints
- [ ] Health check tests pass with new performance section
- [ ] Environment variables documented

**Deployment:**
- [ ] Update backend `.env` with new variables
- [ ] Deploy backend to fly.io
- [ ] Verify `/health/detailed` includes performance section
- [ ] Verify `/api/metrics/performance` requires admin auth
- [ ] Generate some load to populate metrics
- [ ] Check metrics are being captured correctly

**Post-Deployment:**
- [ ] Monitor for 24 hours to ensure no memory leaks
- [ ] Review slow query logs to identify optimization opportunities
- [ ] Document any performance issues discovered
- [ ] Create optimization tickets for slow queries/endpoints

---

### Frontend Integration (Optional)

**System Health Page Enhancement:**
If time permits, add performance metrics to `/admin/system` page:

**Location:** `frontend/app/admin/system/page.tsx`

**Features to Add:**
1. Display average response time
2. Show slow query count
3. List top 5 slowest endpoints
4. Refresh button to clear slow queries

**API Integration:**
```typescript
// Add to existing health fetch
const healthData = await fetch('/health/detailed');
const performanceData = await fetch('/api/metrics/performance');

// Display in UI
<div className="bg-white shadow rounded-lg p-6">
  <h3>API Performance</h3>
  <p>Average Response Time: {health.checks.performance.averageResponseTimeMs}ms</p>
  <p>Slow Queries: {health.checks.performance.slowQueriesCount}</p>
</div>
```

---

## 🎵 P18: Playlist System Foundations

### Business Context
Enable administrators to create sequential training paths where employees complete modules in a specific order. This supports:
- Mandatory compliance training sequences
- Progressive skill development
- Department-specific training tracks
- New hire onboarding workflows

**User Stories:**
- As an admin, I want to create playlists of training modules so employees complete them in order
- As an admin, I want to require completion of each module before proceeding
- As an employee, I want to see my progress through assigned playlists
- As an employee, I want to automatically advance to the next module when I complete one

---

### Technical Architecture

**Database Design:**
- `playlists` - Playlist metadata (title, description, settings)
- `playlist_items` - Ordered list of modules per playlist
- `user_playlist_progress` - Track user progress through playlists

**Key Features:**
- Position-based ordering (modules have specific sequence)
- Unique constraints prevent duplicate modules in same playlist
- Cascade deletes when playlist is removed
- Progress tracking separate from module completion (user may complete module outside playlist)

**Business Rules:**
1. Playlists can be required (mandatory) or optional
2. Auto-play automatically shows next module on completion
3. Users can only advance if previous module is completed (when require_completion=true)
4. Completing all modules marks playlist as completed
5. Progress persists across sessions

---

### Task 1: Database Schema & Migration

**Status:** ✅ Completed (migration `backend/migrations/024_add_playlists.sql`)

**Estimated Time:** 1 hour

**File:** `backend/migrations/024_add_playlists.sql`

**Objective:** Create database tables to support playlist system with proper constraints and indexes.

**Requirements:**

1. **Playlists Table**
   - UUID primary key
   - Organization scoping (multi-tenant support)
   - Title (required, max 200 chars)
   - Description (optional, text)
   - Creator tracking (references users)
   - is_required flag (boolean, default false)
   - auto_play flag (boolean, default true)
   - Timestamps (created_at, updated_at)

2. **Playlist Items Table**
   - UUID primary key
   - Foreign key to playlists (cascade delete)
   - Foreign key to training_modules (cascade delete)
   - Position integer (for ordering)
   - require_completion flag (boolean, default true)
   - Unique constraint on (playlist_id, position)
   - Unique constraint on (playlist_id, training_module_id) - prevents duplicates

3. **User Playlist Progress Table**
   - UUID primary key
   - Foreign key to users (cascade delete)
   - Foreign key to playlists (cascade delete)
   - Foreign key to current_item_id (nullable, references playlist_items)
   - Status enum: not_started, in_progress, completed
   - Timestamps: started_at, completed_at, last_accessed
   - Unique constraint on (user_id, playlist_id)

4. **Indexes**
   - playlists(organization_id) - for tenant filtering
   - playlist_items(playlist_id) - for item lookup
   - user_playlist_progress(user_id) - for user dashboard
   - user_playlist_progress(playlist_id) - for playlist reporting

**Migration SQL:**
```sql
-- Playlists table
CREATE TABLE playlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  is_required BOOLEAN DEFAULT false,
  auto_play BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Playlist items (ordered)
CREATE TABLE playlist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  playlist_id UUID NOT NULL REFERENCES playlists(id) ON DELETE CASCADE,
  training_module_id UUID NOT NULL REFERENCES training_modules(id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  require_completion BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(playlist_id, position),
  UNIQUE(playlist_id, training_module_id)
);

-- User playlist progress
CREATE TABLE user_playlist_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  playlist_id UUID NOT NULL REFERENCES playlists(id) ON DELETE CASCADE,
  current_item_id UUID REFERENCES playlist_items(id) ON DELETE SET NULL,
  status VARCHAR(20) DEFAULT 'not_started',
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  last_accessed TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, playlist_id),
  CONSTRAINT valid_status CHECK (status IN ('not_started', 'in_progress', 'completed'))
);

-- Indexes
CREATE INDEX idx_playlists_org ON playlists(organization_id);
CREATE INDEX idx_playlists_created_by ON playlists(created_by);
CREATE INDEX idx_playlist_items_playlist ON playlist_items(playlist_id);
CREATE INDEX idx_playlist_items_module ON playlist_items(training_module_id);
CREATE INDEX idx_user_playlist_progress_user ON user_playlist_progress(user_id);
CREATE INDEX idx_user_playlist_progress_playlist ON user_playlist_progress(playlist_id);
CREATE INDEX idx_user_playlist_progress_status ON user_playlist_progress(status);
```

**Acceptance Criteria:**
- [ ] Migration runs successfully on clean database
- [ ] All foreign keys are enforced
- [ ] Unique constraints prevent duplicate positions
- [ ] Unique constraints prevent duplicate modules in playlist
- [ ] Cascade deletes work correctly (test by deleting playlist)
- [ ] Status check constraint enforces valid values
- [ ] All indexes are created

**Testing Migration:**
```sql
-- Test script to validate schema
INSERT INTO playlists (organization_id, title, created_by)
  VALUES ('org-uuid', 'Test Playlist', 'user-uuid');

INSERT INTO playlist_items (playlist_id, training_module_id, position)
  VALUES ('playlist-uuid', 'module-uuid', 1);

-- Should fail (duplicate position)
INSERT INTO playlist_items (playlist_id, training_module_id, position)
  VALUES ('playlist-uuid', 'other-module-uuid', 1);

-- Should fail (duplicate module)
INSERT INTO playlist_items (playlist_id, training_module_id, position)
  VALUES ('playlist-uuid', 'module-uuid', 2);
```

---

### Task 2: Playlist CRUD Controller

**Status:** ✅ Completed (`src/controllers/playlistController.ts`)

**Estimated Time:** 3 hours

**File:** `backend/src/controllers/playlistController.ts`

**Objective:** Implement full Create, Read, Update, Delete operations for playlists and playlist items.

**Requirements:**

1. **List Playlists (GET /api/playlists)**
   - Filter by organization_id (from authenticated user)
   - Optional filter: is_required (query param)
   - Include item count for each playlist
   - Return paginated results (default 20, max 100)
   - Admin sees all org playlists, employees see assigned/required

2. **Get Playlist Details (GET /api/playlists/:id)**
   - Return playlist with all items (ordered by position)
   - Include module details for each item (title, description, duration)
   - Include user's progress if authenticated
   - Check organization access (playlist.organization_id === user.organization_id)

3. **Create Playlist (POST /api/playlists)**
   - Admin/Manager only
   - Validate required fields: title, organization_id
   - Auto-set created_by to authenticated user
   - Auto-set created_at, updated_at
   - Return created playlist with ID

4. **Update Playlist (PUT /api/playlists/:id)**
   - Admin/Manager only
   - Allow updating: title, description, is_required, auto_play
   - Cannot change organization_id (security)
   - Update updated_at timestamp
   - Check organization access

5. **Delete Playlist (DELETE /api/playlists/:id)**
   - Admin only
   - Cascade delete playlist_items and user_playlist_progress
   - Check organization access
   - Return 204 No Content on success

6. **Add Item to Playlist (POST /api/playlists/:id/items)**
   - Admin/Manager only
   - Validate training_module_id exists
   - Auto-assign position (max position + 1)
   - Or accept position parameter (re-sequence others)
   - Prevent duplicate modules
   - Check both playlist and module belong to same organization

7. **Reorder Playlist Items (PUT /api/playlists/:id/items/:itemId)**
   - Admin/Manager only
   - Update position of specific item
   - Re-sequence other items to maintain unique positions
   - Body: { position: number }

8. **Remove Item from Playlist (DELETE /api/playlists/:id/items/:itemId)**
   - Admin/Manager only
   - Re-sequence remaining items (close gaps)
   - Return 204 No Content on success

**Response Schemas:**

```typescript
// GET /api/playlists
{
  playlists: Array<{
    id: string;
    title: string;
    description: string | null;
    is_required: boolean;
    auto_play: boolean;
    item_count: number;
    created_at: string;
    created_by: {
      id: string;
      email: string;
    };
  }>;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// GET /api/playlists/:id
{
  id: string;
  title: string;
  description: string | null;
  is_required: boolean;
  auto_play: boolean;
  items: Array<{
    id: string;
    position: number;
    require_completion: boolean;
    training_module: {
      id: string;
      title: string;
      description: string;
      estimated_duration: number;
    };
  }>;
  user_progress?: {
    status: 'not_started' | 'in_progress' | 'completed';
    current_position: number | null;
    started_at: string | null;
    completed_at: string | null;
  };
}
```

**Acceptance Criteria:**
- [ ] List endpoint returns playlists scoped to user's organization
- [ ] Create endpoint validates required fields
- [ ] Update endpoint prevents organization_id changes
- [ ] Delete endpoint requires admin role
- [ ] Add item endpoint prevents duplicate modules
- [ ] Add item endpoint assigns sequential position
- [ ] Reorder endpoint re-sequences positions correctly
- [ ] Remove item endpoint closes position gaps
- [ ] All endpoints check organization access
- [ ] All endpoints return proper HTTP status codes

**Edge Cases to Handle:**
- Playlist not found (404)
- Playlist belongs to different organization (403)
- Module not found when adding item (404)
- Module belongs to different organization (400)
- Duplicate module in playlist (409)
- Invalid position when reordering (400)
- Playlist item not found (404)
- Empty playlist (valid state)
- Reordering to same position (no-op)

**Testing Requirements:**
```typescript
// Integration tests to create:
- Should list playlists for user's organization
- Should not list playlists from other organizations
- Should create playlist with valid data
- Should reject create with missing title
- Should update playlist title
- Should not allow updating organization_id
- Should delete playlist and cascade to items
- Should add item to playlist with auto-position
- Should reject duplicate module in playlist
- Should reorder items correctly
- Should remove item and re-sequence
- Should return 403 for cross-org access
- Should require admin for delete
- Should require admin/manager for create/update
```

---

### Task 3: Playlist Progress Controller

**Status:** ✅ Completed (`src/controllers/playlistProgressController.ts`)

**Estimated Time:** 2.5 hours

**File:** `backend/src/controllers/playlistProgressController.ts`

**Objective:** Track user progress through playlists and handle auto-advance logic.

**Requirements:**

1. **Get User's Playlists (GET /api/playlists/progress)**
   - Return all playlists for user's organization
   - Include user's progress for each
   - Filter: status (not_started, in_progress, completed)
   - Order by: required first, then last_accessed

2. **Get Playlist Progress (GET /api/playlists/:id/progress)**
   - Return detailed progress for specific playlist
   - Include current position
   - Include completion status of each module
   - Calculate overall completion percentage

3. **Start Playlist (POST /api/playlists/:id/start)**
   - Create user_playlist_progress record
   - Set status to 'in_progress'
   - Set current_item_id to first item (position 1)
   - Set started_at timestamp
   - Return updated progress

4. **Advance to Next Module (POST /api/playlists/:id/advance)**
   - Verify current module is completed (check progress table)
   - Move current_item_id to next position
   - If no more items, set status to 'completed' and completed_at
   - Respect require_completion flag
   - Update last_accessed timestamp
   - Return updated progress and next module

5. **Mark Playlist Complete (Internal)**
   - Called automatically when user completes last module
   - Set status to 'completed'
   - Set completed_at timestamp
   - Emit event for potential gamification hooks

**Business Logic:**

```typescript
// Advance logic pseudocode
async function advancePlaylist(userId: string, playlistId: string) {
  // 1. Get user's progress record
  const progress = await getProgressRecord(userId, playlistId);

  // 2. Get current item
  const currentItem = await getPlaylistItem(progress.current_item_id);

  // 3. Check if current module is completed
  if (currentItem.require_completion) {
    const moduleCompleted = await checkModuleCompletion(
      userId,
      currentItem.training_module_id
    );
    if (!moduleCompleted) {
      throw new Error('Current module not completed');
    }
  }

  // 4. Get next item
  const nextItem = await getNextPlaylistItem(
    playlistId,
    currentItem.position
  );

  // 5. Update progress
  if (nextItem) {
    // Move to next item
    await updateProgress(progress.id, {
      current_item_id: nextItem.id,
      last_accessed: new Date()
    });
    return { nextModule: nextItem, completed: false };
  } else {
    // Playlist completed
    await updateProgress(progress.id, {
      status: 'completed',
      completed_at: new Date(),
      last_accessed: new Date()
    });
    return { nextModule: null, completed: true };
  }
}
```

**Response Schemas:**

```typescript
// GET /api/playlists/progress
{
  playlists: Array<{
    playlist: {
      id: string;
      title: string;
      is_required: boolean;
      item_count: number;
    };
    progress: {
      status: string;
      current_position: number | null;
      completed_count: number;
      total_count: number;
      completion_percentage: number;
      started_at: string | null;
      completed_at: string | null;
    };
  }>;
}

// POST /api/playlists/:id/advance
{
  progress: {
    status: string;
    current_position: number | null;
  };
  nextModule: {
    id: string;
    title: string;
    description: string;
  } | null;
  completed: boolean;
}
```

**Acceptance Criteria:**
- [ ] Starting playlist creates progress record
- [ ] Starting already-started playlist returns existing progress
- [ ] Advance checks module completion before proceeding
- [ ] Advance moves to next position correctly
- [ ] Advance marks playlist complete on last item
- [ ] Advance respects require_completion flag
- [ ] Progress endpoint shows accurate completion percentage
- [ ] Required playlists appear first in list

**Edge Cases to Handle:**
- Starting a completed playlist (allow restart?)
- Advancing when current module not completed (reject with 400)
- Advancing when already on last module (mark complete)
- Module completed outside playlist context (still counts)
- Playlist modified after user started (handle missing items)
- Item deleted while user is on it (skip to next)

**Testing Requirements:**
```typescript
// Integration tests to create:
- Should create progress when starting playlist
- Should return existing progress on re-start
- Should advance to next module when current complete
- Should reject advance when module incomplete
- Should mark playlist complete on last module
- Should calculate completion percentage correctly
- Should allow skipping if require_completion=false
- Should list user's playlists with progress
- Should order by required first
```

---

### Task 4: Validation Middleware

**Status:** ✅ Completed (`validatePlaylist*` groups added to `src/middleware/validation.ts`)

**Estimated Time:** 1 hour

**File:** `backend/src/middleware/validation.ts`

**Objective:** Add input validation for all playlist endpoints.

**Validators to Create:**

```typescript
// Playlist creation/update
export const validatePlaylistCreate = [
  body('title')
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Title must be 1-200 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 5000 })
    .withMessage('Description must be under 5000 characters'),
  body('is_required')
    .optional()
    .isBoolean()
    .withMessage('is_required must be boolean'),
  body('auto_play')
    .optional()
    .isBoolean()
    .withMessage('auto_play must be boolean'),
  handleValidationErrors
];

export const validatePlaylistUpdate = [
  body('title')
    .optional()
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Title must be 1-200 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 5000 })
    .withMessage('Description must be under 5000 characters'),
  body('is_required')
    .optional()
    .isBoolean()
    .withMessage('is_required must be boolean'),
  body('auto_play')
    .optional()
    .isBoolean()
    .withMessage('auto_play must be boolean'),
  body('organization_id')
    .not().exists()
    .withMessage('Cannot change organization_id'),
  handleValidationErrors
];

// Playlist item operations
export const validatePlaylistItemAdd = [
  body('training_module_id')
    .isUUID()
    .withMessage('training_module_id must be valid UUID'),
  body('position')
    .optional()
    .isInt({ min: 1 })
    .withMessage('position must be positive integer'),
  body('require_completion')
    .optional()
    .isBoolean()
    .withMessage('require_completion must be boolean'),
  handleValidationErrors
];

export const validatePlaylistItemReorder = [
  body('position')
    .isInt({ min: 1 })
    .withMessage('position must be positive integer'),
  handleValidationErrors
];

// UUID parameter validation
export const validatePlaylistIdParam = [
  param('id')
    .isUUID()
    .withMessage('Playlist ID must be valid UUID'),
  handleValidationErrors
];

export const validatePlaylistItemIdParam = [
  param('itemId')
    .isUUID()
    .withMessage('Item ID must be valid UUID'),
  handleValidationErrors
];

// List query validation
export const validatePlaylistListQuery = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('page must be positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('limit must be 1-100'),
  query('is_required')
    .optional()
    .isBoolean()
    .withMessage('is_required must be boolean'),
  handleValidationErrors
];
```

**Acceptance Criteria:**
- [ ] All validators return 400 with error details on invalid input
- [ ] UUID validation catches malformed IDs
- [ ] String length limits are enforced
- [ ] Boolean coercion works correctly
- [ ] organization_id cannot be updated (rejected)
- [ ] Optional fields don't fail when omitted

---

### Task 5: API Routes & Integration

**Status:** ✅ Completed (`src/routes/playlistRoutes.ts`, `src/server.ts`)

**Estimated Time:** 1 hour

**File:** `backend/src/routes/playlistRoutes.ts`

**Objective:** Wire up all controllers with proper authentication and validation.

**Routes to Create:**

```typescript
import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth';
import * as playlistController from '../controllers/playlistController';
import * as progressController from '../controllers/playlistProgressController';
import * as validation from '../middleware/validation';

const router = Router();

// All routes require authentication
router.use(authenticate);

// List playlists (all authenticated users)
router.get(
  '/',
  validation.validatePlaylistListQuery,
  playlistController.listPlaylists
);

// Get playlist details (all authenticated users)
router.get(
  '/:id',
  validation.validatePlaylistIdParam,
  playlistController.getPlaylistDetails
);

// Create playlist (admin/manager only)
router.post(
  '/',
  requireRole('admin', 'manager'),
  validation.validatePlaylistCreate,
  playlistController.createPlaylist
);

// Update playlist (admin/manager only)
router.put(
  '/:id',
  requireRole('admin', 'manager'),
  validation.validatePlaylistIdParam,
  validation.validatePlaylistUpdate,
  playlistController.updatePlaylist
);

// Delete playlist (admin only)
router.delete(
  '/:id',
  requireRole('admin'),
  validation.validatePlaylistIdParam,
  playlistController.deletePlaylist
);

// Add item to playlist (admin/manager only)
router.post(
  '/:id/items',
  requireRole('admin', 'manager'),
  validation.validatePlaylistIdParam,
  validation.validatePlaylistItemAdd,
  playlistController.addItemToPlaylist
);

// Reorder item (admin/manager only)
router.put(
  '/:id/items/:itemId',
  requireRole('admin', 'manager'),
  validation.validatePlaylistIdParam,
  validation.validatePlaylistItemIdParam,
  validation.validatePlaylistItemReorder,
  playlistController.reorderPlaylistItem
);

// Remove item (admin/manager only)
router.delete(
  '/:id/items/:itemId',
  requireRole('admin', 'manager'),
  validation.validatePlaylistIdParam,
  validation.validatePlaylistItemIdParam,
  playlistController.removePlaylistItem
);

// Progress routes (all authenticated users)
router.get('/progress', progressController.getUserPlaylists);

router.get(
  '/:id/progress',
  validation.validatePlaylistIdParam,
  progressController.getPlaylistProgress
);

router.post(
  '/:id/start',
  validation.validatePlaylistIdParam,
  progressController.startPlaylist
);

router.post(
  '/:id/advance',
  validation.validatePlaylistIdParam,
  progressController.advancePlaylist
);

export default router;
```

**Integration in server.ts:**
```typescript
import playlistRoutes from './routes/playlistRoutes';
app.use('/api/playlists', playlistRoutes);
```

**Acceptance Criteria:**
- [ ] All routes registered correctly
- [ ] Authentication middleware runs first on all routes
- [ ] Role checks enforce admin/manager requirements
- [ ] Validation runs before controllers
- [ ] Routes return proper HTTP status codes
- [ ] Error handling works for all routes

---

### Environment Variables

No new environment variables needed for P18.

---

### Deployment Checklist

**Pre-Deployment:**
- [ ] Run migration 024 in staging environment
- [ ] Verify schema with sample data
- [ ] All TypeScript compiles without errors
- [ ] Unit tests pass for all controllers
- [ ] Integration tests pass for all endpoints
- [ ] Validation tests pass

**Deployment:**
- [ ] Run migration 024 in production: `psql $DATABASE_URL -f migrations/024_add_playlists.sql`
- [ ] Deploy backend to fly.io
- [ ] Verify health check still passes
- [ ] Test playlist creation via API
- [ ] Test playlist progress tracking

**Post-Deployment:**
- [ ] Create sample playlists for testing
- [ ] Verify required playlists appear for employees
- [ ] Test complete workflow (create → add items → start → advance → complete)
- [ ] Monitor database for performance issues
- [ ] Document any issues discovered

---

### Frontend Integration (Future)

**Admin Pages to Create:**
- `/admin/playlists` - List and manage playlists
- `/admin/playlists/new` - Create new playlist
- `/admin/playlists/:id/edit` - Edit playlist and reorder items

**Employee Pages to Create:**
- `/playlists` - View assigned and required playlists
- `/playlists/:id` - View playlist with progress
- Integrate with existing `/training/:moduleId` page for seamless navigation

**Dashboard Integration:**
- Show required incomplete playlists prominently
- Show in-progress playlists
- Show completed playlists with completion date

---

## 📊 Sprint Summary

### Time Estimates

| Priority | Task | Time |
|----------|------|------|
| **P17 - Performance Monitoring** | | **6h** |
| P17.1 | Query Logger | 2.5h |
| P17.2 | Request Monitor | 2h |
| P17.3 | Metrics API | 1.5h |
| P17.4 | Health Integration | 0.5h |
| **P18 - Playlist System** | | **10h** |
| P18.1 | Database Schema | 1h |
| P18.2 | Playlist CRUD | 3h |
| P18.3 | Progress Tracking | 2.5h |
| P18.4 | Validation | 1h |
| P18.5 | Routes & Integration | 1h |
| P18.6 | Testing & Deployment | 1.5h |
| **TOTAL** | | **16h** |

### Dependencies

**P17:**
- No new npm packages required
- Builds on existing health check system
- Uses existing auth middleware

**P18:**
- No new npm packages required
- Requires migration 024 before deployment
- Uses existing auth and validation patterns

---

## 🚀 Deployment Strategy

### P17: Performance Monitoring
**Target:** Week of November 18, 2025

1. **Development Phase** (2-3 hours)
   - Implement query logger and request monitor
   - Create metrics endpoints
   - Integrate with health check

2. **Testing Phase** (1 hour)
   - Unit tests for logging functions
   - Integration tests for metrics endpoints
   - Load testing to verify overhead is minimal

3. **Deployment Phase**
   - Deploy to production
   - Monitor for 24 hours
   - Review slow query logs
   - Create optimization tickets if needed

4. **Optimization Phase** (ongoing)
   - Review metrics weekly
   - Optimize slow queries
   - Adjust thresholds based on real usage

### P18: Playlist System
**Target:** Week of November 25, 2025

1. **Development Phase** (6-7 hours)
   - Create migration and test in staging
   - Implement all controllers and routes
   - Add validation middleware

2. **Testing Phase** (2-3 hours)
   - Unit tests for business logic
   - Integration tests for all endpoints
   - End-to-end workflow testing

3. **Deployment Phase**
   - Run migration in production
   - Deploy backend code
   - Create sample playlists for QA
   - Document workflow for administrators

4. **Frontend Phase** (separate sprint)
   - Create admin playlist management UI
   - Create employee playlist view
   - Integrate with existing dashboard

---

## 🧪 Testing Strategy

### P17 Testing Requirements

**Unit Tests:**
```typescript
// queryLogger.test.ts
describe('Query Logger', () => {
  it('should log queries exceeding threshold');
  it('should maintain max buffer size');
  it('should handle query errors gracefully');
  it('should be disabled via env var');
});

// performanceMonitor.test.ts
describe('Performance Monitor', () => {
  it('should capture request metrics');
  it('should calculate average response time');
  it('should identify slowest endpoints');
  it('should maintain max buffer size');
});
```

**Integration Tests:**
```typescript
// metrics.test.ts
describe('Metrics API', () => {
  it('should require admin authentication');
  it('should return performance metrics');
  it('should return slow queries');
  it('should clear slow query buffer');
  it('should include performance in health check');
});
```

### P18 Testing Requirements

**Unit Tests:**
```typescript
// playlistController.test.ts
describe('Playlist Controller', () => {
  it('should create playlist with valid data');
  it('should prevent duplicate modules');
  it('should reorder items correctly');
  it('should re-sequence on item removal');
  it('should enforce organization boundaries');
});

// playlistProgressController.test.ts
describe('Playlist Progress', () => {
  it('should start playlist');
  it('should advance to next module');
  it('should mark playlist complete');
  it('should check module completion before advance');
  it('should calculate completion percentage');
});
```

**Integration Tests:**
```typescript
// playlists.test.ts
describe('Playlist API', () => {
  it('should create playlist (admin)');
  it('should reject creation (employee)');
  it('should add items in sequence');
  it('should prevent cross-org access');
  it('should track user progress');
  it('should auto-advance on completion');
});
```

---

## 📋 Implementation Checklist

### Before Starting Development
- [ ] Read all task descriptions carefully
- [ ] Review existing code patterns in codebase
- [ ] Check database schema for related tables
- [ ] Understand authentication/authorization flow
- [ ] Review validation patterns in validation.ts

### During Development
- [ ] Write tests alongside implementation
- [ ] Run TypeScript compiler frequently
- [ ] Test edge cases as you go
- [ ] Document complex business logic
- [ ] Use existing patterns consistently
- [ ] Handle errors gracefully

### Before Marking Complete
- [ ] All TypeScript compiles without errors
- [ ] All tests pass
- [ ] Manual testing of happy path
- [ ] Manual testing of error cases
- [ ] Code self-review completed
- [ ] Documentation updated
- [ ] Deployment checklist ready

---

## 🔄 Success Criteria

### P17 Success Metrics
- [ ] Slow queries are logged with <5ms overhead
- [ ] Request metrics captured with <3ms overhead
- [ ] Memory usage stable over 24 hours (no leaks)
- [ ] Admin can view performance dashboard
- [ ] At least 3 optimization opportunities identified

### P18 Success Metrics
- [ ] Admin can create and manage playlists
- [ ] Employees can start and progress through playlists
- [ ] Auto-advance works correctly
- [ ] Required playlists enforce completion order
- [ ] Progress persists across sessions
- [ ] No cross-organization data leakage

---

*Sprint planned: November 18, 2025*
*Ready for Backend AI implementation*
*Follow ai_coding_guidelines.md for all development work*
