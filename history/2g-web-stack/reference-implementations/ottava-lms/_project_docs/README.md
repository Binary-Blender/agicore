# MelodyLMS - Music Video Learning Management System

Revolutionary compliance training through music videos. Transform mandatory training from a dreaded chore into content employees actually want to consume, while achieving 94% retention rates through musical memory encoding.

## Live Deployment

- **Frontend**: https://melody-lms-web.fly.dev
- **Backend API**: https://melody-lms-api.fly.dev
- **Database**: PostgreSQL (Fly.io Managed Postgres)

## Project Structure

```
melody-lms/
├── backend/          # Node.js/Express API
│   ├── src/
│   │   ├── config/       # Database configuration
│   │   ├── controllers/  # Route controllers
│   │   ├── middleware/   # Auth middleware
│   │   ├── models/       # (Future) Data models
│   │   ├── routes/       # API routes
│   │   ├── services/     # (Future) Business logic
│   │   ├── types/        # TypeScript types
│   │   └── utils/        # JWT utilities
│   ├── schema.sql    # Database schema
│   ├── Dockerfile    # Backend container
│   └── fly.toml      # Fly.io config
│
├── frontend/         # Next.js/React app
│   ├── app/          # Next.js app directory
│   ├── components/   # React components
│   ├── lib/          # Utilities
│   ├── hooks/        # Custom hooks
│   ├── Dockerfile    # Frontend container
│   └── fly.toml      # Fly.io config
│
└── _project_docs/    # Requirements and documentation
```

## Phase 1 MVP Features (Implemented)

### Backend API
- ✅ User authentication with JWT
- ✅ Video management (CRUD)
- ✅ Quiz system with multiple question types
- ✅ Watch-quiz-repeat loop logic
- ✅ Progress tracking
- ✅ Role-based access control (admin, manager, employee)
- ✅ Performance monitoring (slow query logging, request metrics, admin metrics API)
- ✅ Automated retention service (scheduled cleanup + manual CLI)
- ✅ Playlist management & user playlist progress APIs (P18 foundations)

### Frontend
- ✅ Landing page
- ✅ Basic layout and styling with Tailwind CSS
- ✅ TypeScript configuration
- ✅ Production-ready build

### Database
- ✅ PostgreSQL schema with all core tables
- ✅ Users, videos, quizzes, watch_sessions, quiz_attempts, progress
- ✅ Organizations for multi-tenancy
- ✅ Automatic timestamps and triggers

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user (requires auth)

### Videos
- `GET /api/videos` - Get all videos
- `GET /api/videos/:id` - Get video by ID
- `POST /api/videos` - Create video (admin/manager)
- `PUT /api/videos/:id` - Update video (admin/manager)
- `DELETE /api/videos/:id` - Delete video (admin/manager)

### Quizzes
- `POST /api/quizzes` - Create quiz (admin/manager)
- `GET /api/quizzes/video/:videoId` - Get quiz for video
- `POST /api/quizzes/submit` - Submit quiz attempt
- `GET /api/quizzes/attempts/:videoId` - Get user's quiz attempts

### Progress
- `POST /api/progress/watch` - Record watch session
- `GET /api/progress/user` - Get user's progress
- `GET /api/progress/video/:videoId` - Get progress for specific video
- `GET /api/progress/stats` - Get overall statistics

## Technology Stack

### Backend
- **Runtime**: Node.js 20
- **Framework**: Express 5
- **Language**: TypeScript
- **Database**: PostgreSQL 17
- **Authentication**: JWT (jsonwebtoken)
- **Password Hashing**: bcryptjs
- **Database Client**: node-postgres (pg)

### Frontend
- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **UI**: React 19
- **Styling**: Tailwind CSS 3.4
- **Build Tool**: Turbopack

### Deployment
- **Platform**: Fly.io
- **Database**: Fly.io Managed Postgres
- **Container**: Docker (multi-stage builds)
- **Region**: iad (Ashburn, Virginia)

## Database Schema

The system now spans learning, AI asset, and governance tables:

1. **organizations** – Multi-tenant org management
2. **users** – Account + RBAC metadata (preferred genres, departments)
3. **training_modules** – Policy PDFs, AI lyrics/overlays, song metadata
4. **videos** – Learning content catalog with genre + module links
5. **quizzes** – Linked to either training modules or standalone videos
6. **watch_sessions** – Source-of-truth for video viewing history
7. **quiz_attempts** – Quiz submissions (stored questions + answers + hints)
8. **progress** – Aggregated per-user/module completion state
9. **training_module_songs** – Historical AI songs + binary storage + status
10. **ai_assets / qc_tasks** – Audio asset repository + QC workflow
11. **visual_assets / visual_asset_qc_tasks / prompt_generation_logs** – Image/video pipeline with provider/job tracking
12. **video_favorites & audit_log** – User personalization + compliance logging

## Local Development

### Backend
```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your database credentials
npm run dev
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

### Database
Apply the schema to your local PostgreSQL:
```bash
psql -U your_user -d your_database -f backend/schema.sql
```

#### Database Cleanup Utilities
Run from `backend/` once your `.env` is configured:

```bash
# Preview affected rows per table (no writes)
npm run cleanup:db:stats

# Dry-run the retention rules
npm run cleanup:db:dry-run

# Execute retention policies (quiz attempts + watch sessions)
npm run cleanup:db
```
The CLI respects `QUIZ_ATTEMPTS_RETENTION_DAYS`, `WATCH_SESSIONS_RETENTION_DAYS`, and `CLEANUP_SCHEDULE` so you can mirror production behavior locally.

## Deployment

### Backend
```bash
cd backend
flyctl deploy
```

### Frontend
```bash
cd frontend
flyctl deploy
```

## Environment Variables

### Backend (.env)
```
PORT=3001
NODE_ENV=development
DATABASE_URL=postgresql://user:pass@host:5432/dbname
JWT_SECRET=your-secret-key
DEMO_MODE=true
CORS_ALLOWED_ORIGINS=http://localhost:3000

SONG_LIBRARY_DIR=./songs
VISUAL_LIBRARY_DIR=./visuals
PRUNE_SONGS_ON_BOOT=true
PRUNE_VISUALS_ON_BOOT=true

OPENAI_API_KEY=your-openai-key
OPENAI_MODEL=gpt-4o-mini
OPENAI_IMAGE_MODEL=gpt-image-1
ELEVENLABS_API_KEY=your-elevenlabs-token
AKOOL_API_KEY=your-akool-key
AKOOL_API_URL=https://api.akool.com/v1
TEXT_GENERATION_PROVIDER=openai
REFRAIN_API_URL=https://refrain-coding-api.fly.dev
REFRAIN_API_KEY=

VISUAL_ASSET_BASE_URL=http://localhost:3001
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
CLEANUP_SCHEDULE=0 2 * * *

# Performance monitoring
ENABLE_QUERY_LOGGING=true
SLOW_QUERY_THRESHOLD_MS=1000
PERFORMANCE_METRICS_ENABLED=true
```
> `ELEVENLABS_API_KEY` powers the AI song generator. `SONG_LIBRARY_DIR` is optional (defaults to `backend/songs`) and controls where generated MP3s are stored/served from. `DEMO_MODE` (default `true`) bypasses authentication so you can share the demo without user accounts; set to `false` once real auth is wired up. `PRUNE_SONGS_ON_BOOT` keeps the filesystem in sync with Postgres by removing orphaned MP3s every time the API boots (set to `false` to skip).

> `REDIS_URL` enables the shared cache tier (Redis or Upstash). When omitted the API falls back to an in-memory cache. Toggle `CACHE_ENABLED` to disable caching entirely and tune `CACHE_TTL_SECONDS` to control how long paginated search results are cached. Retention knobs (`QUIZ_ATTEMPTS_RETENTION_DAYS`, `WATCH_SESSIONS_RETENTION_DAYS`, `ENABLE_AUTOMATED_CLEANUP`, `CLEANUP_SCHEDULE`) control the automated cleanup scheduler and CLI output.

### Song Library Maintenance
- The backend keeps MP3s under `SONG_LIBRARY_DIR` (default `backend/songs`) **and** stores the binary in Postgres for durability.
- On boot the API automatically prunes any orphaned files (ones that no longer have a `training_module_songs` row). Set `PRUNE_SONGS_ON_BOOT=false` to disable.
- Run the cleanup by hand via `npm run songs:prune` (inside `backend/`). This uses the same logic as the boot-time cleanup and is handy before deployments or when pruning large batches.

### Frontend (.env)
```
NEXT_PUBLIC_API_URL=https://melody-lms-api.fly.dev
```

## Database Connection Strings

### Backend API Database
```
postgres://melody_lms_api:QtyiBfaZ1g7otMX@melody-lms-api-db.flycast:5432/melody_lms_api
```

### Managed Postgres (Alternative)
```
postgresql://fly-user:ZmswpcWgLyzX8yIQZSjjpjCm@pgbouncer.1zqyxr78q420wp8m.flympg.net/fly-db
```

## Next Steps (Phase 2+)

### Pending Features
- 🎬 Video player component with HTML5 video
- 📊 Admin dashboard for content management
- 🎮 Gamification system (points, badges, leaderboards)
- 📱 Mobile responsive design improvements
- 🎵 Playlist UI integration & gamification polish (backend playlist APIs shipped)
- 📈 Analytics dashboard
- 🔔 Email notifications
- 🎨 Enhanced UI/UX

### Future Phases
- Phase 2: Engagement features (playlist UI, gamification)
- Phase 3: Enterprise features (SSO, HRIS integration, mobile apps)
- Phase 4: AI features (personalization, smart recommendations)

## Support

For issues or questions:
- Check the API health: https://melody-lms-api.fly.dev/health
- Review logs: `flyctl logs -a melody-lms-api` or `flyctl logs -a melody-lms-web`

## License

Proprietary - All rights reserved
