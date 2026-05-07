# MelodyLMS System Architecture Guide

**For Backend AI Development**
**Last Updated:** November 18, 2025

## System Overview

MelodyLMS transforms boring compliance training into engaging music videos. The system uses AI to convert policy documents into catchy songs with synchronized lyrics overlays and quiz questions, achieving 94% knowledge retention through musical memory encoding.

## Core Workflow: Policy → Music Video → Quiz

```
1. Admin uploads PDF policy
   ↓
2. AI extracts text and generates song lyrics
   ↓
3. AI generates reminder phrases and policy highlights
   ↓
4. AI generates audio song in multiple genres (rock, hip-hop, country, etc.)
   ↓
5. AI generates background images from reminder phrases
   ↓
6. AI converts images to animated videos
   ↓
7. Admin reviews and approves all assets
   ↓
8. System creates training module with:
   - Background video
   - Audio overlay
   - Text overlays (reminder phrases synced to beat)
   - Quiz questions
   ↓
9. Employees watch video → take quiz → repeat if failed
   ↓
10. System tracks completion and scores
```

## Playlist & Progress Workflow (P18 Foundations)

```
1. Admin/manager creates playlist shell (title, description, required flag, auto-play)
   ↓
2. Admin adds training modules in desired order (positions auto-sequence and prevent duplicates)
   ↓
3. Employee views required + assigned playlists via `/api/playlists` + `/progress`
   ↓
4. Starting a playlist writes `user_playlist_progress` row and points at the first item
   ↓
5. Employee completes modules (quizzes/videos) → backend verifies completion before advancing
   ↓
6. Advancing moves pointer to the next item or marks playlist completed when finished
   ↓
7. UI can show completion percentages per playlist and the next module to tackle
```

## Technology Stack

### Backend
- **Runtime:** Node.js 20 (Alpine Linux in Docker)
- **Framework:** Express 5
- **Language:** TypeScript 5.9
- **Database:** PostgreSQL 17
- **Caching:** Redis (optional, falls back to in-memory)
- **Authentication:** JWT with bcrypt
- **Validation:** express-validator
- **Security:** helmet, cors, rate-limit
- **Deployment:** Fly.io (iad region)

### External APIs
- **OpenAI GPT-4** - Text generation (lyrics, prompts, quiz)
- **OpenAI DALL-E** - Image generation
- **ElevenLabs** - Audio generation (music)
- **Akool** - Video generation (image-to-video animation)
- **Refrain Coding** - Alternative text generation (self-hosted LLM)

## Database Schema Deep Dive

### Core User & Org Tables

**users**
- Stores user accounts with RBAC (admin, manager, employee)
- Links to organization for multi-tenancy
- Passwords hashed with bcrypt (10 rounds)
- Tracks creation timestamp

**organizations**
- Multi-tenant support (future expansion)
- Currently using default org for all users
- Will enable per-company branding later

### Training Content Tables

**training_modules**
- Core content container
- Links to policy PDF (stored in DB as bytea)
- Stores AI-generated content:
  - `policy_summary_text` - Extracted from PDF
  - `emphasis_prompt` - Admin's focus areas for lyrics
  - `ai_song_lyrics` - Generated lyrics
  - `ai_overlay_texts` - Reminder phrases (JSONB)
  - Links to approved assets via foreign keys

**videos**
- YouTube video library (optional - for non-AI content)
- Searchable by genre, module, title, description
- Cached with Redis (120s TTL default)
- Supports pagination and full-text search

**quizzes**
- JSONB structure for flexibility
- Question types: multiple_choice, true_false, fill_blank
- Each question has: id, text, type, options, correct_answer, points
- Passing score configurable (0-100%)
- Links to video or module (one or both)

### Progress Tracking Tables

**watch_sessions**
- Records every video view
- Tracks watch_percentage (0-100)
- Links to user, video, training module
- Used for completion calculations
- **Note:** Can grow large - P16 will add retention policy

**quiz_attempts**
- Records every quiz submission
- Stores user_answers (JSONB)
- Calculates score and pass/fail
- Links to user, quiz, video
- **Note:** Can grow large - P16 will add retention policy

**progress**
- Aggregate progress per user per module
- Tracks completion status (not_started, in_progress, completed)
- Stores last_accessed timestamp
- Updated after successful quiz pass

### Playlist Tables (P18)

**playlists**
- Stores ordered learning paths per organization
- Tracks `title`, `description`, `is_required`, `auto_play`, `created_by`, timestamps
- Organization cascade delete ensures tenant isolation

**playlist_items**
- Represents each training module entry in a playlist
- Enforces unique `(playlist_id, position)` and `(playlist_id, training_module_id)`
- Supports `require_completion` flag for modules that can be skipped/advised

**user_playlist_progress**
- Junction table linking users to playlists with a single active record
- Persists `status`, `current_item_id`, `started_at`, `completed_at`, `last_accessed`
- `current_item_id` references `playlist_items` so we can derive current module metadata quickly

### AI Asset Tables

**ai_assets**
- Stores generated/uploaded audio files
- Types: audio, image, video
- Status workflow: pending → approved/rejected
- File stored in filesystem + DB (bytea fallback)
- Metadata: title, description, style, duration
- Soft delete support (deleted_at)

**training_module_songs**
- History of all songs generated for a module
- Multiple genre variations per module
- Links to ai_assets for approved versions
- Stores generation parameters (style_preset, custom_style, duration)

**qc_tasks**
- Quality control workflow for ai_assets
- Status: pending, approved, rejected
- Assigned to admin/manager
- Rejection reason stored
- Auto-created on asset upload/generation

**visual_assets**
- Generated/uploaded images and videos
- Separate from ai_assets for organizational clarity
- Types: image, video
- Status: pending, approved, rejected
- File storage: filesystem + DB (bytea)
- Links to training_module_id when approved

**visual_asset_qc_tasks**
- QC workflow for visual assets
- Same pattern as qc_tasks
- Supports approval/rejection with reasons

**prompt_generation_logs**
- Audit trail for image generation
- Stores context (policy, lyrics, reminder phrase)
- Stores generated prompt
- Links to resulting visual_asset
- Useful for debugging and improving prompts

### Supporting Tables

**favorites**
- User's favorited videos
- Simple user_id + video_id junction table
- Enables quick access to preferred content

**user_genre_preferences**
- Stores preferred music genre per user
- Used to customize module presentation
- One preference per user (replaces on update)

**audit_log** (Added in P3, migration 023)
- Security audit trail
- Tracks sensitive operations: login, logout, role_change, asset_approval, etc.
- Stores user_id, action, resource_type, resource_id, ip_address, user_agent
- Retention: permanent (consider archival in P17+)

## Request Flow: AI Studio Workflow

### 1. Policy Upload

**Frontend:**
```typescript
POST /api/training-modules/:id/policy
Content-Type: multipart/form-data
Body: { policy_document: File }
```

**Backend:**
- `trainingModuleController.uploadPolicy()`
- Validates PDF file
- Extracts text using pdf-parse
- Stores PDF in database (bytea)
- Updates `training_modules.policy_summary_text`
- Returns extracted text to frontend

### 2. Lyrics Generation

**Frontend:**
```typescript
POST /api/ai/lyrics
Content-Type: multipart/form-data
Body: {
  policy_document: File,
  emphasis_prompt: string,
  policy_summary: string
}
Validation: validateLyricsGeneration (P14)
```

**Backend:**
- `aiController.createLyrics()`
- Uses `textGenerationProvider` (OpenAI or Refrain)
- Prompt: "Write catchy song lyrics about [policy] emphasizing [prompt]"
- Returns lyrics JSON
- Stores in `training_modules.ai_song_lyrics`

### 3. Reminder Phrases Generation

**Frontend:**
```typescript
POST /api/ai/overlays
Body: {
  song_lyrics: string,
  policy_summary: string
}
Validation: validateOverlayGeneration (P14)
```

**Backend:**
- `aiController.createReminderText()`
- Uses `textGenerationProvider`
- Generates two types:
  - `reinforcement` - Short catchy phrases
  - `policy_highlights` - Key policy points
- Returns JSONB structure
- Stores in `training_modules.ai_overlay_texts`

### 4. Song Generation

**Frontend:**
```typescript
POST /api/ai/song
Body: {
  training_module_id: UUID,
  lyrics: string,
  style_preset: string (e.g., "rock", "hip-hop"),
  duration_ms: number
}
Validation: validateSongGeneration (P14)
```

**Backend:**
- `aiController.createTrainingSong()`
- Uses `songService.generateSong()` → ElevenLabs API
- Saves MP3 to filesystem (`SONG_LIBRARY_DIR`)
- Stores binary in database as backup
- Creates `training_module_songs` record
- Creates `ai_assets` record (status: pending)
- Creates `qc_tasks` record
- Returns song URL + metadata

### 5. Image Generation

**Frontend:**
```typescript
POST /api/visual-assets/images
Body: {
  training_module_id: UUID,
  reminder_phrase: string,
  prompt: string (optional - can be AI-generated),
  size: "1024x1024" | "1792x1024" | "1024x1792",
  quality: "standard" | "hd",
  style: "vivid" | "natural"
}
Validation: validateImageGeneration (P2)
```

**Backend:**
- `visualAssetController.generateImageAsset()`
- If no prompt provided, calls `/api/ai/visual/prompt` to generate contextual prompt
- Uses `openaiService.generateImage()` → DALL-E API
- Downloads image from OpenAI URL
- Saves to filesystem (`VISUAL_LIBRARY_DIR`)
- Stores binary in database
- Creates `visual_assets` record (type: image, status: pending)
- Creates `visual_asset_qc_tasks` record
- Logs to `prompt_generation_logs`
- Returns asset metadata + URL

### 6. Video Generation (Image-to-Video)

**Frontend:**
```typescript
POST /api/visual-assets/videos
Body: {
  source_image_id: UUID,
  animation_prompt: string,
  duration: 5 | 10,
  resolution: "720p" | "1080p" | "4k"
}
Validation: validateVideoGeneration (P2)
```

**Backend:**
- `visualAssetController.createVideoFromImage()`
- Fetches source image from visual_assets
- Submits job to Akool API
- Creates `visual_assets` record (type: video, status: processing)
- Stores `job_id` for status polling
- Links to parent via `parent_asset_id`
- Returns job status

**Status Polling:**
```typescript
GET /api/visual-assets/videos/:id/status
Validation: validateVisualAssetIdParam (P15)
```

**Backend:**
- `visualAssetController.getVideoGenerationStatus()`
- Checks Akool API for job status
- When complete:
  - Downloads video from Akool
  - Saves to filesystem
  - Updates `visual_assets` record (status: pending)
  - Creates `visual_asset_qc_tasks` record
- Returns status + video URL when ready

### 7. Asset Approval

**Frontend:**
```typescript
POST /api/visual-assets/:id/approve
Body: {
  training_module_id: UUID (optional - reassign)
}
Validation: validateVisualAssetIdParam (P15)
```

**Backend:**
- `visualAssetController.approveVisualAsset()`
- Updates `visual_assets.status = 'approved'`
- Links to training module if provided
- Updates QC task status
- Invalidates cache (`cacheService.deleteCacheKey`)
- Logs to audit_log
- Returns updated asset

### 8. Quiz Generation

**Frontend:**
```typescript
POST /api/ai/quiz
Body: {
  policy_summary: string,
  reinforcement_phrases: string (optional),
  policy_highlight_phrases: string (optional),
  song_lyrics: string (optional)
}
Validation: validateQuizGeneration (P14)
```

**Backend:**
- `aiController.createQuizQuestions()`
- Uses `textGenerationProvider`
- Prompt: "Create 5-10 quiz questions about [policy] using [context]"
- Returns JSONB questions array
- Admin can manually edit before saving

**Quiz Creation:**
```typescript
POST /api/quizzes
Body: {
  training_module_id: UUID,
  video_id: UUID,
  questions: [
    {
      id: string,
      question: string,
      type: "multiple_choice" | "true_false" | "fill_blank",
      options: string[] (for multiple_choice),
      correct_answer: string | boolean,
      points: number
    }
  ],
  passing_score: number (0-100)
}
Validation: validateQuizCreate (P11)
```

**Backend:**
- `quizController.createQuiz()`
- Validates question structure
- Stores in `quizzes` table (JSONB)
- Links to module and/or video
- Returns quiz metadata

## Request Flow: Employee Learning

### 1. Browse Modules

**Frontend:**
```typescript
GET /api/training-modules
```

**Backend:**
- `trainingModuleController.getAllModules()`
- Fetches all published modules
- Joins with videos, assets, completion status
- Returns array with metadata

### 2. Watch Video

**Frontend:**
- Plays YouTube video or custom video
- Overlays reminder phrases at timed intervals
- Plays audio song in background
- Tracks watch percentage

**Record Watch Session:**
```typescript
POST /api/progress/watch
Body: {
  videoId: UUID,
  trainingModuleId: UUID,
  watchedSeconds: number,
  totalSeconds: number
}
OR
Body: {
  videoId: UUID,
  watch_percentage: number
}
Validation: validateWatchSession (P6)
```

**Backend:**
- `progressController.recordWatchSession()`
- Normalizes camelCase to snake_case
- Calculates watch_percentage if not provided
- Inserts into `watch_sessions`
- Updates `progress` table if completed (≥80%)
- Returns session record

### 3. Take Quiz

**Fetch Quiz:**
```typescript
GET /api/quizzes/video/:videoId
```

**Backend:**
- `quizController.getQuizForVideo()`
- Fetches quiz with questions (JSONB)
- Returns quiz structure

**Submit Quiz:**
```typescript
POST /api/quizzes/submit
Body: {
  video_id: UUID,
  quiz_id: UUID,
  answers: {
    [question_id]: string | boolean
  }
}
Validation: validateQuizSubmit (P4)
```

**Backend:**
- `quizController.submitQuiz()`
- Validates answers against correct_answer
- Calculates score (total points earned / total points possible)
- Determines pass/fail (score ≥ passing_score)
- Inserts into `quiz_attempts`
- Updates `progress` if passed
- Returns attempt with score and pass/fail

### 4. View Dashboard

**Frontend:**
```typescript
GET /api/progress/user
```

**Backend:**
- `progressController.getUserProgress()`
- Fetches all progress records for user
- Joins with training_modules
- Returns array with completion percentages

**Get Statistics:**
```typescript
GET /api/progress/stats
```

**Backend:**
- `progressController.getUserStats()`
- Aggregates:
  - Total modules
  - Completed modules
  - In-progress modules
  - Average quiz score
  - Total watch time
- Returns stats object

## Caching Strategy (P13)

### Cache Keys
```
videos:list:{page}:{limit}:{genre}:{module_id}:{search}
assets:list:{page}:{limit}:{type}:{module_id}:{search}
modules:list
training-module:{id}
video:{id}
```

### Cache Invalidation

**On Create/Update/Delete:**
- Delete specific cache keys
- Invalidate all list caches with prefix

**Example:**
```typescript
// After creating video
await cacheService.invalidateCacheByPrefix('videos:list:');

// After approving asset
await cacheService.deleteCacheKey(`asset:${id}`);
await cacheService.invalidateCacheByPrefix('assets:list:');
```

### Cache Configuration
```bash
REDIS_URL=redis://...  # Optional, falls back to in-memory
CACHE_ENABLED=true
CACHE_TTL_SECONDS=120
```

## Text Generation Provider Abstraction (P13)

### Provider Selection
```bash
TEXT_GENERATION_PROVIDER=openai  # or 'refrain'
```

### OpenAI Provider
- Uses GPT-4 or GPT-3.5
- Requires OPENAI_API_KEY
- Used for: lyrics, overlays, quiz, visual prompts

### Refrain Provider
- Self-hosted LLM (DeepSeek-Coder or similar)
- Requires REFRAIN_API_URL + REFRAIN_API_KEY
- Same interface as OpenAI
- Used for: lyrics, overlays, quiz, visual prompts

### Provider Interface
```typescript
interface TextGenerationProvider {
  generateText(prompt: string): Promise<string>;
}
```

### Usage in Controllers
```typescript
import { textGenerationProvider } from '../services/textGenerationProvider';

const result = await textGenerationProvider.generateText(prompt);
```

## Security Implementation

### Authentication Flow

1. **Registration:**
   - POST `/api/auth/register`
   - Validates email, password (min 8 chars)
   - Hashes password with bcrypt (10 rounds)
   - Creates user record
   - Returns JWT token

2. **Login:**
   - POST `/api/auth/login`
   - Validates credentials
   - Compares password with bcrypt
   - Generates JWT token (exp: 7 days)
   - Returns token + user info

3. **Protected Routes:**
   - Middleware: `authenticate()`
   - Extracts JWT from Authorization header
   - Verifies token with `jwt.verify()`
   - Attaches user to `req.user`
   - Continues or returns 401

4. **Role-Based Access:**
   - Middleware: `requireRole('admin', 'manager')`
   - Checks `req.user.role`
   - Returns 403 if unauthorized
   - Continues if authorized

### Input Validation (P2-P15)

All user-facing routes use express-validator:
```typescript
import { body, param, query } from 'express-validator';

export const validateXYZ = [
  body('field').trim().notEmpty().isLength({ max: 200 }),
  param('id').isUUID(),
  query('page').optional().isInt({ min: 1 }),
  handleValidationErrors,
];
```

**handleValidationErrors:**
```typescript
const errors = validationResult(req);
if (!errors.isEmpty()) {
  return res.status(400).json({
    error: 'Validation failed',
    details: errors.array()
  });
}
```

### Rate Limiting (P2)

```typescript
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300, // 300 requests per window
  message: 'Too many requests'
});

app.use(limiter);
```

**Configuration:**
```bash
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=300
```

### CORS Whitelist (P2)

```typescript
import cors from 'cors';

const allowedOrigins = process.env.CORS_ALLOWED_ORIGINS?.split(',') || [];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  }
}));
```

### Security Headers (P2)

```typescript
import helmet from 'helmet';

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true
  }
}));
```

## Error Handling (P3)

### Global Error Handler

```typescript
app.use((err, req, res, next) => {
  const requestId = req.headers['x-request-id'] || generateId();

  console.error({
    requestId,
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method
  });

  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    requestId
  });
});
```

### Controller Error Pattern

```typescript
try {
  const result = await someAsyncOperation();
  return res.json(result);
} catch (error) {
  console.error('Operation failed:', error);
  return res.status(500).json({
    error: 'Operation failed',
    details: error.message
  });
}
```

## Operational Readiness (P3)

### Health Check Endpoint

```typescript
GET /health/detailed

Response:
{
  "status": "healthy",
  "timestamp": "2025-11-18T03:46:09.939Z",
  "version": "1.0.0",
  "environment": "production",
  "demo_mode": true,
  "checks": {
    "database": {
      "status": "ok",
      "latency_ms": 30
    },
    "memory": {
      "status": "ok",
      "used_percent": 22.9,
      "free_mb": 742
    },
    "uptime": {
      "seconds": 27,
      "formatted": "0d 0h 0m"
    }
  }
}
```

### Request Logging

```typescript
import morgan from 'morgan';

app.use(morgan('combined'));
// Logs: IP, method, path, status, response time, user agent
```

### Audit Logging

```typescript
await auditService.log({
  user_id: req.user.id,
  action: 'asset_approval',
  resource_type: 'visual_asset',
  resource_id: assetId,
  ip_address: req.ip,
  user_agent: req.get('user-agent')
});
```

### Graceful Shutdown

```typescript
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('HTTP server closed');
    pool.end(() => {
      console.log('Database pool closed');
      process.exit(0);
    });
  });
});
```

## File Storage Strategy

### Dual Storage Pattern

All generated files (songs, images, videos) use dual storage:

1. **Filesystem** (primary)
   - Fast access for serving
   - Location: `SONG_LIBRARY_DIR`, `VISUAL_LIBRARY_DIR`
   - Served via Express static middleware or direct file stream

2. **Database (bytea)** (backup)
   - Durability guarantee
   - Used if filesystem file missing
   - Slower but reliable

### File Cleanup (P1, P3)

**Boot-time cleanup:**
```typescript
if (process.env.PRUNE_SONGS_ON_BOOT === 'true') {
  await pruneSongLibrary();
}
```

**Orphaned file detection:**
- Scan filesystem
- Query database for matching records
- Delete files without DB records
- Log deletion count

## Performance Optimization Strategies

### Database Query Optimization
- Use indexes on foreign keys (user_id, video_id, etc.)
- Use JSONB indexes for quiz questions
- Implement connection pooling (pg-pool)
- Use prepared statements (parameterized queries)

### API Response Optimization
- Implement pagination (default: 20 items per page, max: 100)
- Use Redis caching for expensive queries
- Lazy-load related data only when needed
- Return minimal fields for list endpoints

### File Serving Optimization
- Stream large files (don't load into memory)
- Use appropriate Content-Type headers
- Implement caching headers (Cache-Control, ETag)
- Consider CDN for production (TODO: Phase 2)

## Deployment Architecture

### Fly.io Configuration

**Backend (melody-lms-api):**
- Region: iad (Ashburn, VA)
- Machine: shared-cpu-1x, 1GB RAM
- Port: 3001 (internal), 443 (external HTTPS)
- Auto-scaling: Enabled
- Health checks: `/health`

**Database (melody-lms-api-db):**
- PostgreSQL 17
- Region: iad
- Machine: shared-cpu-1x, 256MB RAM, 1GB disk
- Connection: Internal DNS (flycast)

### Environment Strategy
- Production: Fly.io secrets (`flyctl secrets set`)
- Development: `.env` file (not committed)
- Staging: Separate Fly.io app (TODO)

### Deployment Process
```bash
cd backend
npm run build  # Verify TypeScript compilation
flyctl deploy --ha=false
```

### Rollback Strategy
```bash
flyctl releases list
flyctl releases rollback <version>
```

## Development Guidelines

### Adding a New Route

1. **Create validator** in `middleware/validation.ts`:
   ```typescript
   export const validateNewFeature = [
     body('field').trim().notEmpty(),
     handleValidationErrors,
   ];
   ```

2. **Create controller** in `controllers/newFeatureController.ts`:
   ```typescript
   export async function createNewFeature(req, res) {
     try {
       // Implementation
       return res.json(result);
     } catch (error) {
       console.error(error);
       return res.status(500).json({ error: error.message });
     }
   }
   ```

3. **Create route file** `routes/newFeatureRoutes.ts`:
   ```typescript
   import { Router } from 'express';
   import { authenticate, requireRole } from '../middleware/auth';
   import { validateNewFeature } from '../middleware/validation';
   import { createNewFeature } from '../controllers/newFeatureController';

   const router = Router();
   router.use(authenticate);
   router.post('/', requireRole('admin'), validateNewFeature, createNewFeature);
   export default router;
   ```

4. **Register route** in `server.ts`:
   ```typescript
   import newFeatureRoutes from './routes/newFeatureRoutes';
   app.use('/api/new-feature', newFeatureRoutes);
   ```

5. **Invalidate cache** if needed:
   ```typescript
   await cacheService.invalidateCacheByPrefix('related:');
   ```

6. **Add to documentation**:
   - Update `BACKEND_API_REFERENCE.md`
   - Update `BACKEND_IMPLEMENTATION_STATUS.md`

### Database Migration Pattern

1. Create SQL file: `migrations/024_add_new_table.sql`
2. Test locally
3. Apply to production:
   ```bash
   psql <DATABASE_URL> < migrations/024_add_new_table.sql
   ```
4. Document in `current_sprint.md`

### Testing Checklist

Before deploying:
- [ ] TypeScript builds cleanly (`npm run build`)
- [ ] Manual test all modified endpoints
- [ ] Verify validation rejects invalid inputs
- [ ] Check error handling for edge cases
- [ ] Test with demo mode enabled
- [ ] Verify cache invalidation works
- [ ] Check health endpoint after deployment
- [ ] Monitor logs for errors

---

*This guide should be referenced when implementing new features or debugging issues.*
*Last updated: November 18, 2025*
