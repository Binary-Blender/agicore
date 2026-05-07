# MelodyLMS - Current System State
**Last Updated:** November 18, 2025 (Deployed P16 - Database Cleanup UI)

## Deployment URLs
- **Frontend:** https://melody-lms-web.fly.dev
- **Backend API:** https://melody-lms-api.fly.dev
- **Health Check:** https://melody-lms-api.fly.dev/health

## Authentication
- **Admin Email:** admin@melodylms.com
- **Admin Password:** Admin123!
- **Demo Mode:** Enabled (bypasses auth in development)

## Technology Stack Summary

### Backend
- Node.js 20 + Express 5 + TypeScript 5.9
- PostgreSQL 17 (Fly.io managed)
- JWT authentication with bcrypt password hashing
- 10 controllers, 10 route files
- Auto-scaling on Fly.io (iad region)

### Frontend
- Next.js 16 (App Router) + React 19 + TypeScript 5.9
- Tailwind CSS 3.4
- 12 pages (including System Health dashboard), 9 AI Studio tab components
- Auto-scaling on Fly.io

## Implemented Features (Phase 1 MVP Complete)

### Core Learning System
- User registration and login (JWT-based)
- Role-based access control (admin, manager, employee)
- Training module management
- YouTube video integration
- Quiz system (multiple choice, true/false, fill-in-blank)
- Watch-quiz-repeat learning loop
- Progress tracking and statistics
- User dashboard with completion metrics

### AI Studio (Admin Interface)
1. **Policy Upload Tab** - PDF drag-drop, policy text extraction
2. **Lyrics Generator Tab** - AI-powered song lyrics from policy content
3. **Reminder Phrases Tab** - Reinforcement phrases and policy highlights
4. **Song Generator Tab** - Generate multiple genre variations
5. **Image Generation Tab** - AI-powered image creation from reminder phrases
   - Select reminder phrase or enter custom text
   - Generate contextual image prompts using policy and lyrics context
   - Configure image size (square/landscape/portrait), quality (standard/HD), and style (vivid/natural)
   - OpenAI DALL-E integration for image generation
   - Gallery view with approve/reject/delete actions
6. **Image to Video Tab** - Convert approved images to animated videos
   - Browse approved images from Image Generation
   - Configure animation prompts, resolution (720p/1080p/4K), and video length (5-10s)
   - Akool API integration (backend complete, requires API key)
   - Real-time status polling for in-progress jobs
   - Video playback with approve/reject/delete workflow
7. **Quiz Builder Tab** - AI + manual quiz question authoring
8. **Asset Repository Tab** - Manage generated audio assets, upload external files
9. **QC Queue Tab** - Review and approve/reject pending assets

### Asset Management System
- File upload with metadata (style, duration, description)
- Automatic QC task creation for pending assets
- Approval workflow with module linking
- Soft deletes with audit trail
- Storage: Filesystem + PostgreSQL fallback
- Visual asset pipeline (prompt generation, OpenAI images, Akool video jobs, QC-ready storage)
- Paginated asset repository with filters (`type`, `training_module_id`) and full-text search across title/description/style/module references

### Operational Visibility
- Performance monitor middleware tracks every HTTP request (rolling 1,000 sample window)
- Slow query logger captures top 100 queries exceeding `SLOW_QUERY_THRESHOLD_MS` and exposes them through `/api/metrics/slow-queries`
- `/api/metrics/performance`, `/api/metrics/endpoints`, `/api/metrics/recent` provide admin-only insight into request timings
- `/health/detailed` now reports aggregated performance status (avg response time, slow query count, total requests)

### Maintenance & Automation
- Daily retention scheduler (configurable via `ENABLE_AUTOMATED_CLEANUP` + `CLEANUP_SCHEDULE`) prunes `quiz_attempts` and `watch_sessions` while preserving the newest attempt per user/quiz.
- Manual CLI commands: `npm run cleanup:db:stats`, `npm run cleanup:db:dry-run`, and `npm run cleanup:db` provide stats/dry-run/exec modes for ad-hoc maintenance.
- `/health/detailed` now reports `cleanup_scheduler` status (running flag, next run, last run summary) so ops can confirm automation health at a glance.

### Playlist System Foundations (P18)
- Playlists let admins/managers orchestrate sequential module journeys with required or optional completion rules.
- Ordered playlist items prevent duplicates, support drag-style reordering, and automatically resequence positions on insert/delete.
- User playlist progress tracks current position, status (`not_started`, `in_progress`, `completed`), timestamps, and enforces completion checks before advancing.
- REST endpoints cover listing, CRUD, item management, and user progress actions (start/advance) so the UI can show required playlists first and resumable journeys.

## Database Schema (20+ Tables)

### Core Tables
- `users` - User accounts with RBAC
- `organizations` - Multi-tenant support
- `training_modules` - Grouped compliance training content
- `videos` - YouTube video references by genre
- `quizzes` - Quiz questions in JSONB format
- `progress` - User progress per module
- `watch_sessions` - Video viewing tracking
- `quiz_attempts` - Quiz submission history
- `playlists` - Ordered training paths scoped per organization with metadata (`is_required`, `auto_play`, creator)
- `playlist_items` - Junction table that sequences training modules inside a playlist with unique position + completion requirements
- `user_playlist_progress` - Tracks each employee's playlist status, current item pointer, timestamps, and auto-advance bookkeeping

### AI Asset Tables
- `ai_assets` - Generated/uploaded audio files
- `training_module_songs` - Song history per module
- `qc_tasks` - Quality control workflow tasks
- `visual_assets` - Generated/uploaded visual files (images/videos)
- `visual_asset_qc_tasks` - QC workflow for visual assets
- `prompt_generation_logs` - Context + prompts used for image generation
- `visual_assets.job_id` / `parent_asset_id` (migration 022) - async provider tracking + lineage for video generation

## API Endpoints

### Authentication (`/api/auth`)
- POST `/register` - Create new user
- POST `/login` - Authenticate user
- GET `/me` - Get current user info

### Training Modules (`/api/training-modules`)
- GET `/` - List all modules
- GET `/:id` - Get module with videos
- POST `/` - Create module (admin)
- PUT `/:id` - Update module (admin)
- DELETE `/:id` - Delete module (admin)
- POST `/:id/policy` - Upload policy PDF
- GET `/:id/policy/download` - Download policy
- DELETE `/:id/policy` - Clear policy
- GET `/:id/genres` - Available genre variations

### Assets (`/api/assets`)
- GET `/` - List approved assets (admin/manager)
- GET `/pending` - List pending QC assets (admin/manager)
- POST `/upload` - Upload new asset (admin/manager)
- POST `/:id/approve` - Approve asset (admin/manager)
- POST `/:id/reject` - Reject asset (admin/manager)
- PUT `/:id` - Update asset metadata (admin/manager)
- DELETE `/:id` - Remove asset (admin/manager)

### Videos (`/api/videos`)
- GET `/` - Paginated video library with filters for `genre`, `training_module_id`, and full-text search
- GET `/:id` - Retrieve video plus quiz metadata
- POST `/` - Create video (admin/manager)
- PUT `/:id` - Update video (admin/manager)
- DELETE `/:id` - Remove video (admin/manager)

### Playlists (`/api/playlists`)
- GET `/` - List playlists scoped to the user's organization (employees only see required/assigned playlists)
- GET `/:id` - Playlist details + ordered items with training module metadata and per-user progress snapshot
- POST `/` - Create playlist (admin/manager) with title/description/flags
- PUT `/:id` - Update playlist metadata (admin/manager)
- DELETE `/:id` - Remove playlist + cascade items/progress (admin only)
- POST `/:id/items` - Append or insert module into playlist with optional custom position
- PUT `/:id/items/:itemId` - Reorder playlist item positions with range resequencing
- DELETE `/:id/items/:itemId` - Remove module from playlist and close gaps
- GET `/progress` - Employee dashboard view of required + in-progress playlists with completion percentages
- GET `/:id/progress` - Detailed per-playlist progress with module completion flags
- POST `/:id/start` - Initialize user progress record (auto-picks first module or marks as completed if empty)
- POST `/:id/advance` - Advance to the next module after verifying required completion criteria

### Visual Assets (`/api/visual-assets`)
- GET `/` - List visual assets (filter by module/type/status)
- GET `/pending` - Pending QC items
- POST `/images` - Generate OpenAI image for reminder phrase
- POST `/videos` - Submit Akool video job from approved image
- GET `/videos/:id/status` - Poll job status / finalize asset
- POST `/:id/approve` - Approve visual asset
- POST `/:id/reject` - Reject visual asset
- PUT `/:id` - Update metadata / reassign module
- DELETE `/:id` - Remove asset + file

### Visual Prompt Generation (`/api/ai/visual`)
- POST `/prompt` - Generate contextual image prompt from reminder phrases

### System Configuration (`/api/system/config`)
- GET `/api/system/config` - Returns `demo_mode`, current environment, and allowed CORS origins (used for monitoring deployments)

### AI Generation (`/api/ai`)
- POST `/lyrics` - Generate song lyrics from policy
- POST `/overlays` - Generate overlay texts
- POST `/quiz` - Generate quiz questions
- POST `/song` - Generate audio song
- DELETE `/song/:id` - Delete generated song

### Quizzes (`/api/quizzes`)
- GET `/video/:videoId` - Get quiz for video
- GET `/training-module/:moduleId` - Get quiz for module
- POST `/` - Create quiz (admin)
- PUT `/:id` - Update quiz (admin)
- POST `/submit` - Submit quiz attempt
- GET `/attempts/:videoId` - Get user attempts
- GET `/latest/training-module/:moduleId` - Latest attempt

### Progress (`/api/progress`)
- POST `/watch` - Record watch session
- GET `/user` - Get user's progress
- GET `/video/:videoId` - Get video progress
- GET `/stats` - Get user statistics

### User Preferences (`/api/preferences`)
- GET `/genre` - Get preferred genre
- PUT `/genre` - Set preferred genre
- DELETE `/genre` - Clear preference

### Favorites (`/api/favorites`)
- GET `/` - List favorites
- POST `/` - Add favorite
- DELETE `/:videoId` - Remove favorite
- GET `/check/:videoId` - Check if favorited

## Frontend Pages

### User Pages
- `/` - Landing page
- `/login` - Authentication
- `/register` - New user registration
- `/dashboard` - Learning dashboard with progress
- `/training/[id]` - Watch videos and take quizzes
- `/favorites` - Saved content
- `/command-center` - User controls

### Admin Pages
- `/admin` - Admin dashboard
- `/admin/training-modules` - Manage training content
- `/admin/ai-studio` - 9-tab AI content creation interface
- `/admin/system` - System Health & Maintenance dashboard

## Recent Fixes Applied

### Backend (November 2025)
1. **Fixed TypeScript error** in `assetController.ts:321`
   - Changed `songResult.rowCount > 0` to `(songResult.rowCount ?? 0) > 0`
   - Resolved null safety issue

### Frontend (November 2025)
1. **Fixed hook declaration order** in `app/admin/ai-studio/page.tsx:844-862`
   - Reordered `markPendingAssetCleared` before `handlePendingAssetResolved`
   - Resolved "variable used before declaration" error

2. **Added Image Generation and Image-to-Video tabs** (November 16, 2025)
   - Created `components/ai-studio/ImageGenerationTab.tsx` - Full workflow for generating images from reminder phrases
   - Created `components/ai-studio/ImageToVideoTab.tsx` - Interface for converting images to videos
   - Updated `lib/api.ts` with `visualAssetsAPI` client for backend communication
   - Integrated both tabs into AI Studio page navigation
   - Expanded AI Studio from 7 tabs to 9 tabs

3. **Enabled Video Generation Backend** (November 16, 2025)
   - Backend: Created `akoolService.ts` for Akool API integration
   - Backend: Added `createVideoFromImage` and `getVideoGenerationStatus` endpoints
   - Backend: Created migration 022 for job tracking and parent asset linking
   - Frontend: Updated ImageToVideoTab to call actual backend APIs (removed "Coming Soon")
   - Frontend: Added status polling for in-progress video jobs
   - Frontend: Added video playback and QC workflow (approve/reject/delete)

4. **Security Hardening - P2 Complete** (November 16, 2025)
   - Backend: Added rate limiting middleware (300 req/15min global limit)
   - Backend: Implemented CORS whitelist (env var: CORS_ALLOWED_ORIGINS)
   - Backend: Added input validation with express-validator on auth and visual asset routes
   - Backend: Integrated helmet for security headers (CSP, HSTS, etc.)
   - Backend: Added demo mode warning on startup + /api/system/config endpoint
   - Frontend: Updated login/register pages to display validation error details
   - Frontend: Fixed password minimum length mismatch (8 chars to match backend)

5. **Operational Readiness - P3 Complete** (November 16, 2025)
   - Backend: Created migration 023 for audit_log table (sensitive operations tracking)
   - Backend: Added enhanced health check endpoint `/health/detailed` with:
     - Database connectivity and latency check
     - Memory usage monitoring (warns at 90%+)
     - Uptime tracking (formatted: days, hours, minutes)
   - Backend: Implemented graceful shutdown handlers (SIGTERM/SIGINT)
   - Backend: Closes database pool cleanly on shutdown
   - Backend: Fixed duplicate health routes registration issue
   - Backend: Added Morgan request logging middleware (`requestLogger.ts`)
   - Backend: Created audit service (`auditService.ts`) for tracking sensitive operations
   - Backend: Created global error handler (`errorHandler.ts`) with request IDs
   - Backend: Integrated all P3 middleware into server.ts

6. **Validation & Pagination - P4 & P5 Complete** (November 16, 2025)
   - Backend: Added quiz submission validation (`validateQuizSubmit`)
   - Backend: Validates video_id, quiz_id as UUIDs, answers as object
   - Backend: Integrated validation into quizRoutes.ts
   - Backend: Added pagination to visual assets list (`/api/visual-assets?page=1&limit=20`)
   - Backend: Added pagination to AI assets list (`/api/assets?page=1&limit=20`)
   - Backend: Response includes pagination metadata (page, limit, total, totalPages, hasNext, hasPrev)
   - Backend: Default page=1, limit=20, max limit=100

7. **Input Validation Sprint - P6 & P7 Complete** (November 16, 2025)
   - Backend: Added watch session validation (`validateWatchSession`)
   - Backend: Validates videoId, trainingModuleId (UUIDs), watchedSeconds, totalSeconds
   - Backend: Integrated into progressRoutes.ts
   - Backend: Added training module CRUD validation (`validateModuleCreate`, `validateModuleUpdate`)
   - Backend: Validates title, description, category, difficulty_level, estimated_duration
   - Backend: Integrated into trainingModuleRoutes.ts

8. **Extended Validation Sprint - P8 & P9 Complete** (November 17, 2025)
   - Backend: Added favorites validation (`validateAddFavorite`, `validateVideoIdParam`)
   - Backend: Validates video IDs in favorites routes (add, remove, check)
   - Backend: Integrated into favoritesRoutes.ts
   - Backend: Added genre preference validation (`validateGenrePreference`)
   - Backend: Validates genre string (required, max 50 chars)
   - Backend: Integrated into preferencesRoutes.ts
   - Backend: Added video creation validation (`validateVideoCreate`)
   - Backend: Validates training_module_id, youtube_url, genre, title, description
   - Backend: Integrated into videoRoutes.ts

9. **AI & Visual Validation Sprint - P14 & P15 Complete** (November 18, 2025)
   - Backend: Added `validateLyricsGeneration`, `validateOverlayGeneration`, `validateQuizGeneration`, `validateSongGeneration`
   - Backend: `/api/ai/lyrics`, `/api/ai/overlays`, `/api/ai/quiz`, `/api/ai/song` now validate payloads + enforce limits
   - Backend: Added `validateVisualAssetIdParam`, `validateVisualAssetUpdate`
   - Backend: `/api/visual-assets` ID routes now guard UUIDs and metadata updates before hitting controllers

10. **Search & Filtering Enhancements - P12 Complete** (November 18, 2025)
   - Backend: Added `validateVideoListQuery` middleware for query params
   - Backend: Video endpoint now supports `page`, `limit`, `genre`, `training_module_id`, `search` params
   - Backend: Full-text search across title, description, lyrics, transcript
   - Backend: Added `validateAssetListQuery` middleware for asset filtering
   - Backend: Asset endpoint supports `page`, `limit`, `type`, `training_module_id`, `search` params
   - Backend: Consistent pagination response block `{ page, limit, total, totalPages, hasNext, hasPrev }`
   - Backend: Created `src/utils/request.ts` with query parameter helpers
   - Backend: Created `src/utils/search.ts` with fuzzy search utilities

11. **Caching Layer - P13 Complete** (November 18, 2025)
    - Backend: Created `src/services/cacheService.ts` with Redis support
    - Backend: In-memory fallback when `REDIS_URL` not set
    - Backend: Cache controlled by `CACHE_ENABLED` (default true) and `CACHE_TTL_SECONDS` (default 120)
    - Backend: Video and asset list responses are cached with automatic invalidation
    - Backend: Cache keys invalidated on create/update/delete/approve/reject operations
    - Backend: Exports `getCache`, `setCache`, `deleteCacheKey`, `invalidateCacheByPrefix`

12. **Configurable Text Generation Provider** (November 18, 2025)
    - Backend: Created `src/services/refrainService.ts` for Refrain Coding API integration
    - Backend: Created `src/services/textGenerationProvider.ts` for provider switching
    - Backend: Set `TEXT_GENERATION_PROVIDER=refrain` to use self-hosted LLM (default: 'openai')
    - Backend: Lyrics, overlays, quiz, and visual prompt generation now use provider abstraction
    - Backend: OpenAI still required for image generation (DALL-E)
    - Backend: Easy to switch back by changing env var (no code changes needed)

13. **System Health & Maintenance Dashboard - P16 Complete** (November 18, 2025)
    - Frontend: Created `/admin/system` page with real-time health monitoring
    - Frontend: Displays cleanup scheduler status (enabled, running, next run, last run)
    - Frontend: Shows detailed last run summary with table breakdown per table (quiz_attempts, watch_sessions)
    - Frontend: Auto-refreshes every 30 seconds for live monitoring
    - Frontend: Displays database health, memory usage, and uptime metrics
    - Frontend: Added "System" navigation link to access the dashboard
    - Backend: P16 retention services deployed and operational (next run: 2 AM UTC daily)

## Known Limitations

### Authentication
- Demo mode bypasses JWT validation (for testing)
- No token refresh mechanism
- No password reset flow
- Custom Auth placeholder shows "Custom Auth Placeholder" in navigation

### Performance
- ~~No pagination on asset lists~~ → FIXED: Visual and AI assets now support pagination (?page=1&limit=20)
- ~~No caching layer~~ → FIXED: Configurable Redis/in-memory cache backs video + asset search responses (CACHE_ENABLED, CACHE_TTL_SECONDS, REDIS_URL)
- No CDN for static assets

### Security
- ~~CORS accepts all origins~~ → FIXED: Now uses whitelist (CORS_ALLOWED_ORIGINS env var)
- ~~No rate limiting~~ → FIXED: Global rate limit (300 req/15min configurable via env vars)
- No CSRF protection
- ~~No request logging/audit trail~~ → FIXED: Morgan request logging + auditService.ts for sensitive operations

### Features Not Yet Implemented
- Playlist system with auto-play
- Gamification (points, badges, leaderboards)
- Email notifications
- SSO integration (Okta, Azure AD)
- Advanced analytics/reporting
- Mobile native apps
- HRIS integrations

## File Structure

```
melody-lms/
├── backend/
│   ├── src/
│   │   ├── config/database.ts
│   │   ├── controllers/ (10 files)
│   │   ├── middleware/ (auth, rateLimit, validation, requestLogger, errorHandler)
│   │   ├── routes/ (11 files including healthRoutes)
│   │   ├── services/ (openai, song, audit, image, akool, cache)
│   │   ├── types/index.ts
│   │   ├── utils/ (jwt, s3, youtube, songCleanup, request, search)
│   │   └── server.ts
│   ├── migrations/ (20+ SQL files)
│   ├── Dockerfile
│   └── fly.toml
│
├── frontend/
│   ├── app/ (11 pages)
│   ├── components/
│   │   ├── ai-studio/ (9 tab components)
│   │   ├── Navigation.tsx
│   │   └── Toast.tsx
│   ├── lib/api.ts (API client)
│   ├── Dockerfile
│   └── fly.toml
│
└── _project_docs/ (this folder)
```

## Environment Variables

### Backend (Required)
```bash
PORT=3001
NODE_ENV=production
DATABASE_URL=postgresql://...
JWT_SECRET=your-secret-key
DEMO_MODE=true
CORS_ALLOWED_ORIGINS=https://melody-lms-web.fly.dev,http://localhost:3000

SONG_LIBRARY_DIR=./songs
VISUAL_LIBRARY_DIR=./visuals
PRUNE_SONGS_ON_BOOT=true
PRUNE_VISUALS_ON_BOOT=true

OPENAI_API_KEY=for-text-generation
OPENAI_MODEL=gpt-4o-mini
OPENAI_IMAGE_MODEL=gpt-image-1
ELEVENLABS_API_KEY=for-song-generation
AKOOL_API_KEY=your-akool-key
AKOOL_API_URL=https://api.akool.com/v1
TEXT_GENERATION_PROVIDER=openai
REFRAIN_API_URL=https://refrain-coding-api.fly.dev
REFRAIN_API_KEY=your-refrain-key

VISUAL_ASSET_BASE_URL=https://melody-lms-api.fly.dev
PUBLIC_BASE_URL=
MELODY_PUBLIC_URL=
POLICY_DOCUMENT_MAX_BYTES=10485760
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=300

CACHE_ENABLED=true
CACHE_TTL_SECONDS=120
REDIS_URL=redis://localhost:6379

QUIZ_ATTEMPTS_RETENTION_DAYS=90
WATCH_SESSIONS_RETENTION_DAYS=180
ENABLE_AUTOMATED_CLEANUP=true
CLEANUP_SCHEDULE="0 2 * * *"

ENABLE_QUERY_LOGGING=true
SLOW_QUERY_THRESHOLD_MS=1000
PERFORMANCE_METRICS_ENABLED=true

```

### Frontend (Required)
```bash
NEXT_PUBLIC_API_URL=https://melody-lms-api.fly.dev
```

## Deployment Commands

```bash
# Backend
cd backend
npm run build
flyctl deploy --ha=false

# Frontend
cd frontend
npm run build
flyctl deploy --ha=false
```

## Testing the Application

1. Visit https://melody-lms-web.fly.dev
2. Login with admin@melodylms.com / Admin123!
3. Navigate to Admin > AI Studio to test all 9 tabs
4. Go to Dashboard to see training modules
5. Click on a module to watch videos and take quizzes

## Cost (Fly.io)
- Backend: ~$5/month (shared-cpu-1x, 1GB RAM)
- Frontend: ~$5/month (shared-cpu-1x, 1GB RAM)
- Database: ~$2/month (shared-cpu-1x, 256MB, 1GB disk)
- **Total: ~$13/month** (with auto-stop enabled)

## Next Steps for Development

### Priority 1 (P17 – Performance Monitoring)
- Slow-query logging and timing instrumentation
- Middleware-level request metrics + sampling
- Admin-only metrics endpoint and `/health/detailed` enrichment
- Baseline monitoring playbook before next deployment

### Priority 2 (P18 – Playlist & Gamification Foundations)
- Playlist data model + CRUD for admins/managers
- Playlist progress endpoints (start/advance)
- Auto-play + ordering logic
- Early gamification hooks tied to playlist completion

### Priority 3 (Security Hardening Backlog)
- Disable demo mode before go-live
- Wire up customer auth provider (SSO/LDAP)
- Expand validation coverage to legacy routes
- Harden CORS/rate-limit defaults for enterprise tenants

---

*This document should be updated after each significant deployment or feature addition.*
