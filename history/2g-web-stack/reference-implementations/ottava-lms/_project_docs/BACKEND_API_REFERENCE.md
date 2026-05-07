# MelodyLMS Backend API Reference

## Base URL
```
Production: https://melody-lms-api.fly.dev
Development: http://localhost:3001
```

## Authentication

All authenticated endpoints require a Bearer token in the Authorization header:
```
Authorization: Bearer <jwt_token>
```

### Demo Mode
When `DEMO_MODE=true` (default in development), a hardcoded user is injected:
```javascript
{
  id: '969e76bd-d496-4073-a775-743a87cf1958',
  email: 'demo@example.com',
  role: 'admin',
  organizationId: '00000000-0000-0000-0000-000000000001'
}
```

---

## Endpoints

### Health Check (Simple)
```
GET /health
```
**Response:**
```json
{
  "status": "ok",
  "timestamp": "2025-11-16T13:18:13.981Z"
}
```

### Health Check (Detailed)
```
GET /health/detailed
```
**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-11-16T16:00:34.011Z",
  "version": "1.0.0",
  "environment": "production",
  "demo_mode": true,
  "checks": {
    "database": {
      "status": "ok",
      "latency_ms": 34
    },
    "memory": {
      "status": "ok",
      "used_percent": 21.9,
      "free_mb": 751
    },
    "uptime": {
      "seconds": 100,
      "formatted": "0d 0h 1m"
    }
  }
}
```
**Status Values:** healthy, degraded, unhealthy
**Check Statuses:** ok, warning, error, unknown

---

## Authentication API

### Register User
```
POST /api/auth/register
```
**Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "organization_id": "uuid",
  "department": "optional",
  "role": "employee"  // employee, manager, admin
}
```
**Response:** User object + JWT token

### Login
```
POST /api/auth/login
```
**Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```
**Response:**
```json
{
  "token": "jwt_token_here",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "role": "admin",
    "organization_id": "uuid"
  }
}
```

### Get Current User
```
GET /api/auth/me
Authorization: Bearer <token>
```
**Response:** User object

---

## Training Modules API

### List All Modules
```
GET /api/training-modules
Authorization: Bearer <token>
```
**Response:**
```json
{
  "training_modules": [
    {
      "id": "uuid",
      "title": "HIPAA Compliance",
      "description": "Healthcare privacy training",
      "policy_document_filename": "hipaa.pdf",
      "ai_song_url": "/songs/uuid/song.mp3",
      "ai_song_duration_seconds": 180,
      "ai_song_style": "Pop",
      "ai_lyrics": "Generated lyrics...",
      "ai_overlay_texts": {...},
      "videos": [...],
      "quiz": {...},
      "songs": [...],
      "progress": {...}
    }
  ]
}
```

### Get Single Module
```
GET /api/training-modules/:id?preferred_genre=Rock
Authorization: Bearer <token>
```
**Query Params:**
- `preferred_genre` (optional): Filter videos by genre

**Response:** Training module with videos, quiz, and progress

### Create Module
```
POST /api/training-modules
Authorization: Bearer <token>
Role Required: admin
```
**Body:**
```json
{
  "title": "Data Privacy 101",
  "description": "Learn data protection basics",
  "emphasis_prompt": "Focus on GDPR compliance"
}
```
**Response:** Created module object

### Update Module
```
PUT /api/training-modules/:id
Authorization: Bearer <token>
Role Required: admin
```
**Body:** Any updatable fields (title, description, ai_lyrics, ai_overlay_texts, etc.)

### Delete Module
```
DELETE /api/training-modules/:id
Authorization: Bearer <token>
Role Required: admin
```
**Response:** `{ success: true }`

### Upload Policy Document
```
POST /api/training-modules/:id/policy
Authorization: Bearer <token>
Content-Type: multipart/form-data
Role Required: admin
```
**Form Data:**
- `policy`: PDF file (max 10MB)

**Response:**
```json
{
  "message": "Policy uploaded successfully",
  "filename": "policy.pdf",
  "size": 245678,
  "mime_type": "application/pdf"
}
```

### Download Policy Document
```
GET /api/training-modules/:id/policy/download
Authorization: Bearer <token>
```
**Response:** Binary PDF file with appropriate headers

### Clear Policy Document
```
DELETE /api/training-modules/:id/policy
Authorization: Bearer <token>
Role Required: admin
```

### Get Available Genres
```
GET /api/training-modules/:id/genres
Authorization: Bearer <token>
```
**Response:**
```json
{
  "genres": ["Pop", "Rock", "Country", "Hip-Hop"]
}
```

---

## Videos API

### List Videos
```
GET /api/videos?page=1&limit=20&genre=Pop&training_module_id=<uuid>&search=hipaa
Authorization: Bearer <token>
```
**Query Params:**
- `page` (optional, default `1`, max `1000`)
- `limit` (optional, default `20`, max `100`)
- `genre` (optional): Case-insensitive match
- `training_module_id` (optional): Scope to a module
- `search` (optional): Fuzzy text search across title, description, lyrics, and transcripts

**Response:**
```json
{
  "videos": [
    {
      "id": "uuid",
      "title": "HIPAA Compliance 101",
      "description": "Learn HIPAA through music",
      "duration_seconds": 180,
      "thumbnail_url": "https://img.youtube.com/...",
      "s3_url": "https://www.youtube.com/embed/...",
      "genre": "Pop",
      "training_module_id": "uuid",
      "created_at": "2025-11-16T10:00:00Z",
      "updated_at": "2025-11-16T10:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 3,
    "totalPages": 1,
    "hasNext": false,
    "hasPrev": false
  }
}
```

### Get Video
```
GET /api/videos/:id
Authorization: Bearer <token>
```
**Response:** Video object with quiz metadata (if linked quiz exists)

### Create Video
```
POST /api/videos
Authorization: Bearer <token>
Role Required: admin or manager
```
**Body:** `title`, `description`, `duration_seconds`, `s3_url` (or YouTube URL), `genre`, `training_module_id`

### Update Video
```
PUT /api/videos/:id
Authorization: Bearer <token>
Role Required: admin or manager
```
**Body:** Any mutable fields (title, description, genre, transcript, lyrics, training_module_id, etc.)

### Delete Video
```
DELETE /api/videos/:id
Authorization: Bearer <token>
Role Required: admin or manager
```

---

## Assets API

All asset endpoints require `admin` or `manager` role.

### List Approved Assets
```
GET /api/assets?type=audio&page=1&limit=20&training_module_id=<uuid>&search=hipaa
Authorization: Bearer <token>
```
**Query Params:**
- `page` (optional, default `1`, max `1000`)
- `limit` (optional, default `20`, max `100`)
- `type` (optional): `audio`, `image`, or `video`
- `training_module_id` (optional): Filter by module
- `search` (optional): Fuzzy match across title, description, style, and module title

**Response:**
```json
{
  "assets": [
    {
      "id": "uuid",
      "asset_type": "audio",
      "training_module_id": "uuid",
      "training_module_title": "HIPAA Compliance",
      "title": "HIPAA Training Mix",
      "description": "Generated compliance song",
      "status": "approved",
      "public_url": "/songs/uuid/song.mp3",
      "metadata": {},
      "duration_seconds": 180,
      "style": "Pop",
      "source": "ai-generated",
      "created_at": "2025-11-16T10:00:00Z",
      "approved_at": "2025-11-16T11:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 5,
    "totalPages": 1,
    "hasNext": false,
    "hasPrev": false
  }
}
```

### List Pending Assets (QC Queue)
```
GET /api/assets/pending
Authorization: Bearer <token>
```
**Response:** Array of pending assets awaiting approval

### Upload Asset
```
POST /api/assets/upload
Authorization: Bearer <token>
Content-Type: multipart/form-data
```
**Form Data:**
- `asset`: Audio file (required)
- `training_module_id`: UUID (optional)
- `asset_type`: string (default: "audio")
- `title`: string (optional)
- `description`: string (optional)
- `style`: string (optional)
- `duration_seconds`: number (optional)
- `auto_approve`: "true" | "false" (default: "true")

**Behavior:**
- If `auto_approve=true`: Asset is immediately approved and linked to module
- If `auto_approve=false`: Asset goes to QC queue (pending status)

### Approve Asset
```
POST /api/assets/:id/approve
Authorization: Bearer <token>
```
**Side Effects:**
- Updates asset status to "approved"
- Completes associated QC task
- Links song to training module (updates module's ai_song_url)
- Updates training_module_songs status

### Reject Asset
```
POST /api/assets/:id/reject
Authorization: Bearer <token>
```
**Side Effects:**
- Sets asset status to "rejected"
- Soft deletes the asset (deleted_at timestamp)
- Completes associated QC task
- Updates training_module_songs status to "rejected"

### Update Asset
```
PUT /api/assets/:id
Authorization: Bearer <token>
```
**Body:**
```json
{
  "training_module_id": "uuid",
  "title": "Updated Title",
  "description": "New description",
  "style": "Rock",
  "duration_seconds": 240
}
```
**Side Effects:**
- Updates asset metadata
- If module changed: Updates old module (clears song), updates new module (links song)
- Updates training_module_songs record

### Delete Asset
```
DELETE /api/assets/:id
Authorization: Bearer <token>
```
**Side Effects:**
- Soft deletes asset (sets deleted_at, status="deleted")
- Soft deletes associated training_module_songs
- Completes any pending QC tasks
- Clears module's ai_song_url if linked
- Removes physical file from filesystem

---

## AI Generation API

### Generate Lyrics
```
POST /api/ai/lyrics
Authorization: Bearer <token>
Content-Type: multipart/form-data
```
**Form Data:**
- `policy`: PDF file (optional if policy_text provided)
- `policy_text`: string (optional if PDF provided)
- `emphasis_prompt`: string (optional)

**Response:**
```json
{
  "lyrics": "Generated song lyrics based on policy content..."
}
```

### Generate Overlay Texts
```
POST /api/ai/overlays
Authorization: Bearer <token>
Content-Type: multipart/form-data
```
**Form Data:**
- `policy`: PDF file (optional)
- `policy_text`: string (optional)
- `lyrics`: string (optional)

**Response:**
```json
{
  "reinforcement": ["Remember to...", "Always ensure..."],
  "policy_highlights": ["Key requirement 1", "Important rule 2"]
}
```

### Generate Quiz Questions
```
POST /api/ai/quiz
Authorization: Bearer <token>
Content-Type: multipart/form-data
```
**Form Data:**
- `policy`: PDF file (optional)
- `policy_text`: string (optional)
- `num_questions`: number (default: 5)

**Response:**
```json
{
  "questions": [
    {
      "id": "q1",
      "type": "multiple_choice",
      "question": "What is the main requirement?",
      "options": ["A", "B", "C", "D"],
      "correct_answer": "A"
    }
  ]
}
```

### Generate Song
```
POST /api/ai/song
Authorization: Bearer <token>
Content-Type: application/json
```
**Body:**
```json
{
  "training_module_id": "uuid",
  "lyrics": "Song lyrics here...",
  "style_preset": "Pop",
  "custom_style": "Upbeat corporate training",
  "duration_ms": 180000,
  "emphasis_points": ["compliance", "safety"]
}
```
**Response:**
```json
{
  "songId": "uuid",
  "songUrl": "/songs/uuid/song.mp3",
  "duration_seconds": 180,
  "style": "Pop"
}
```
**Side Effects:**
- Creates audio file in SONG_LIBRARY_DIR
- Creates training_module_songs record
- Updates training module's ai_song fields

### Delete Song
```
DELETE /api/ai/song/:songId
Authorization: Bearer <token>
```
**Side Effects:**
- Soft deletes training_module_songs record
- Clears module's ai_song_url if it was the active song
- Does NOT delete physical file (cleanup handles this)

---

## Quiz API

### Get Quiz by Video ID
```
GET /api/quizzes/video/:videoId
Authorization: Bearer <token>
```

### Get Quiz by Training Module ID
```
GET /api/quizzes/training-module/:moduleId
Authorization: Bearer <token>
```
**Response:**
```json
{
  "quiz": {
    "id": "uuid",
    "training_module_id": "uuid",
    "questions": [
      {
        "id": "q1",
        "type": "multiple_choice",
        "question": "...",
        "options": [...],
        "correct_answer": "..."
      }
    ]
  }
}
```

### Create Quiz
```
POST /api/quizzes
Authorization: Bearer <token>
Role Required: admin
```
**Body:**
```json
{
  "training_module_id": "uuid",
  "questions": [...]
}
```

### Update Quiz
```
PUT /api/quizzes/:id
Authorization: Bearer <token>
Role Required: admin
```

### Submit Quiz Attempt
```
POST /api/quizzes/submit
Authorization: Bearer <token>
```
**Body:**
```json
{
  "video_id": "uuid",
  "quiz_id": "uuid",
  "answers": {
    "q1": "user_answer",
    "q2": "user_answer"
  },
  "hints_used": ["q1"]
}
```
**Response:**
```json
{
  "score": 80,
  "passed": true,
  "attempt_id": "uuid",
  "correct_answers": {...},
  "results": {...}
}
```

### Get Attempts for Video
```
GET /api/quizzes/attempts/:videoId
Authorization: Bearer <token>
```

### Get Latest Attempt for Training Module
```
GET /api/quizzes/latest/training-module/:moduleId
Authorization: Bearer <token>
```

---

## Progress API

### Record Watch Session
```
POST /api/progress/watch
Authorization: Bearer <token>
```
**Body:**
```json
{
  "video_id": "uuid",
  "watch_percentage": 85,
  "device_type": "desktop"
}
```

### Get User Progress
```
GET /api/progress/user
Authorization: Bearer <token>
```
**Response:** Array of progress records for all modules

### Get Video Progress
```
GET /api/progress/video/:videoId
Authorization: Bearer <token>
```

### Get User Statistics
```
GET /api/progress/stats
Authorization: Bearer <token>
```
**Response:**
```json
{
  "total_videos": 10,
  "completed_videos": 7,
  "completion_rate": 70,
  "average_score": 85,
  "total_watch_time": 3600
}
```

---

## Preferences API

### Get Genre Preference
```
GET /api/preferences/genre
Authorization: Bearer <token>
```
**Response:**
```json
{
  "genre": "Rock"
}
```

### Set Genre Preference
```
PUT /api/preferences/genre
Authorization: Bearer <token>
```
**Body:**
```json
{
  "genre": "Pop"
}
```

### Clear Genre Preference
```
DELETE /api/preferences/genre
Authorization: Bearer <token>
```

---

## Favorites API

### List Favorites
```
GET /api/favorites
Authorization: Bearer <token>
```

### Add Favorite
```
POST /api/favorites
Authorization: Bearer <token>
```
**Body:**
```json
{
  "video_id": "uuid"
}
```

### Remove Favorite
```
DELETE /api/favorites/:videoId
Authorization: Bearer <token>
```

### Check Favorite Status
```
GET /api/favorites/check/:videoId
Authorization: Bearer <token>
```
**Response:**
```json
{
  "is_favorited": true
}
```

---

## Static File Serving

### Song Files
```
GET /songs/:moduleId/:filename
```
**Behavior:**
1. Checks filesystem at `SONG_LIBRARY_DIR/:moduleId/:filename`
2. If not found, queries PostgreSQL for binary data
3. Returns audio/mpeg with Cache-Control headers

---

## Error Responses

All errors follow this format:
```json
{
  "error": "Error message describing what went wrong"
}
```

Common HTTP Status Codes:
- `400` - Bad Request (invalid input)
- `401` - Unauthorized (missing or invalid token)
- `403` - Forbidden (insufficient role)
- `404` - Not Found
- `500` - Internal Server Error

---

## Role-Based Access Control

| Role | Capabilities |
|------|-------------|
| employee | View modules, take quizzes, track progress |
| manager | All employee + asset management |
| admin | All manager + create/delete modules, manage quizzes |

---

## Data Models

### User
```typescript
{
  id: string;
  email: string;
  role: 'employee' | 'manager' | 'admin';
  organization_id: string;
  department?: string;
  created_at: Date;
  updated_at: Date;
}
```

### Training Module
```typescript
{
  id: string;
  title: string;
  description?: string;
  organization_id: string;
  policy_document_filename?: string;
  policy_document_mime_type?: string;
  policy_document_size?: number;
  policy_document_blob?: Buffer;
  policy_summary?: string;
  emphasis_prompt?: string;
  ai_lyrics?: string;
  ai_overlay_texts?: {
    reinforcement: string[];
    policy_highlights: string[];
  };
  ai_song_url?: string;
  ai_song_duration_seconds?: number;
  ai_song_style?: string;
  ai_song_generated_at?: Date;
  created_at: Date;
  updated_at: Date;
  deleted_at?: Date;
}
```

### AI Asset
```typescript
{
  id: string;
  training_module_id?: string;
  asset_type: string;
  title: string;
  description?: string;
  status: 'pending' | 'approved' | 'rejected' | 'deleted';
  storage_path: string;
  public_url: string;
  metadata: object;
  duration_seconds?: number;
  style?: string;
  source: string;
  uploaded_by?: string;
  created_at: Date;
  approved_at?: Date;
  rejected_at?: Date;
  deleted_at?: Date;
}
```

---

## Performance Considerations

1. **Asset listing limited to 200 items** - pagination not implemented
2. **No request caching** - every request hits database
3. **Song files served from filesystem** - falls back to database
4. **Large file uploads** - limited to 10MB
5. **Auto-scaling** - machines stop when idle (cold start ~5s)

---

## Integration Points for Backend AI

### When Adding New Features
1. Create controller in `backend/src/controllers/`
2. Create route in `backend/src/routes/`
3. Register route in `backend/src/server.ts`
4. Add types to `backend/src/types/index.ts`
5. Update frontend API client in `frontend/lib/api.ts`

### Database Migrations
Located in `backend/migrations/`
- Sequential numbering (001, 002, etc.)
- Must be idempotent (safe to run multiple times)
- Apply via direct SQL execution on Fly.io PostgreSQL

### Environment Variables
Set via Fly.io secrets:
```bash
flyctl secrets set KEY=value
```

---

## Visual Prompt API

### Generate Visual Prompt
```
POST /api/ai/visual/prompt
Authorization: Bearer <token>
Role Required: admin or manager
```
**Body:**
```json
{
  "training_module_id": "uuid",
  "reminder_phrase": "Lock your workstation",
  "policy_override": "optional raw policy text",
  "lyrics_override": "optional lyrics excerpt",
  "user_modified_prompt": "optional manual tweak for logging"
}
```
**Response:**
```json
{
  "prompt": "Ultra-realistic office scene ...",
  "negative_prompt": "no text overlays, no branding",
  "log": {
    "id": "uuid",
    "created_at": "2025-11-16T14:22:33.000Z"
  },
  "usage": {
    "prompt_tokens": 820,
    "completion_tokens": 240,
    "total_tokens": 1060
  }
}
```

## Visual Prompt API

### Generate Visual Prompt
```
POST /api/ai/visual/prompt
Authorization: Bearer <token>
Role Required: admin or manager
```
**Body:**
```json
{
  "training_module_id": "uuid",
  "reminder_phrase": "Lock your workstation",
  "policy_override": "optional raw policy text",
  "lyrics_override": "optional lyrics excerpt",
  "user_modified_prompt": "optional manual tweak for logging"
}
```

**Response:** JSON describing `prompt`, `negative_prompt`, `log` metadata, and token usage.

---

## Visual Assets API

### List Visual Assets
```
GET /api/visual-assets?status=approved&asset_type=image&training_module_id=uuid
Authorization: Bearer <token>
Role Required: admin or manager
```

### List Pending Visual Assets
```
GET /api/visual-assets/pending
Authorization: Bearer <token>
Role Required: admin or manager
```

### Generate Image Asset
```
POST /api/visual-assets/images
Authorization: Bearer <token>
Role Required: admin or manager
```
**Body:**
```json
{
  "training_module_id": "uuid",
  "reminder_phrase": "Secure badge at all times",
  "prompt": "optional manual override",
  "negative_prompt": "optional",
  "size": "1024x1024",
  "quality": "standard",
  "style": "vivid"
}
```

### Generate Video Asset
```
POST /api/visual-assets/videos
Authorization: Bearer <token>
Role Required: admin or manager
```
**Body:**
```json
{
  "source_image_id": "uuid",
  "animation_prompt": "Camera pans across ...",
  "duration": 5,
  "resolution": "1080p"
}
```
**Response:** `{"job_id":"akool_job_123","visual_asset_id":"uuid","status":"processing"}`

### Poll Video Job Status
```
GET /api/visual-assets/videos/:id/status
Authorization: Bearer <token>
```
Returns current Akool job status. Once completed the backend downloads the rendered video, stores it under `/visuals/...`, and enqueues a QC task with the asset moved to `pending`.

### Approve / Reject Visual Asset
```
POST /api/visual-assets/:id/approve
POST /api/visual-assets/:id/reject
```

### Update Visual Asset Metadata
```
PUT /api/visual-assets/:id
```

### Delete Visual Asset
```
DELETE /api/visual-assets/:id
```

Visual asset responses include: `id`, `training_module_id`, `training_module_title`, `asset_type`, `public_url`, `prompt`, `negative_prompt`, `status`, `provider`, `provider_metadata`, `quality_metrics`, `source_reminder_phrase`, dimensions, timestamps, `qc_status`, `job_id`, and `parent_asset_id`.

---

## Playlists API

### List Playlists
```
GET /api/playlists?page=1&limit=20&is_required=true
Authorization: Bearer <token>
```
Employees see required playlists (or ones they have started). Admins/managers see all playlists for their organization.

**Response:**
```json
{
  "playlists": [
    {
      "id": "3a8d...7b9",
      "title": "IT Security Onboarding",
      "description": "Complete these baseline modules in order.",
      "is_required": true,
      "auto_play": true,
      "item_count": 4,
      "created_at": "2025-11-19T14:05:11.233Z",
      "updated_at": "2025-11-19T14:06:01.114Z",
      "created_by": { "id": "user-uuid", "email": "admin@melodylms.com" }
    }
  ],
  "pagination": { "page": 1, "limit": 20, "total": 1, "totalPages": 1 }
}
```

### Get Playlist Details
```
GET /api/playlists/:id
Authorization: Bearer <token>
```

**Response:**
```json
{
  "id": "3a8d...7b9",
  "title": "IT Security Onboarding",
  "is_required": true,
  "auto_play": true,
  "items": [
    {
      "id": "item-uuid",
      "position": 1,
      "require_completion": true,
      "training_module": {
        "id": "module-uuid",
        "title": "Acceptable Use",
        "estimated_duration": 20
      }
    }
  ],
  "user_progress": {
    "status": "in_progress",
    "current_position": 1,
    "started_at": "2025-11-19T14:07:00.000Z",
    "completed_at": null
  }
}
```

### Create / Update Playlist
```
POST /api/playlists
PUT  /api/playlists/:id
Authorization: Bearer <admin|manager token>
Body: {
  "title": "Security Ramp",
  "description": "Complete before week 2",
  "is_required": true,
  "auto_play": false
}
```

### Delete Playlist
```
DELETE /api/playlists/:id
Authorization: Bearer <admin token>
```

### Add Item to Playlist
```
POST /api/playlists/:id/items
Authorization: Bearer <admin|manager token>
Body: {
  "training_module_id": "module-uuid",
  "position": 2,
  "require_completion": true
}
```
If `position` is omitted the module is appended.

### Reorder Item
```
PUT /api/playlists/:id/items/:itemId
Body: { "position": 1 }
```

### Remove Item
```
DELETE /api/playlists/:id/items/:itemId
```

### List User Playlists (Progress)
```
GET /api/playlists/progress?status=in_progress
Authorization: Bearer <token>
```

**Response:**
```json
{
  "playlists": [
    {
      "id": "3a8d...7b9",
      "title": "IT Security Onboarding",
      "item_count": 4,
      "status": "in_progress",
      "current_position": 2,
      "completed_count": 1,
      "completion_percentage": 25,
      "last_accessed": "2025-11-19T15:12:00.000Z"
    }
  ]
}
```

### Get Playlist Progress Details
```
GET /api/playlists/:id/progress
```
Returns each item with `completed` flag and an aggregate summary `{ total_items, completed_items, completion_percentage }`.

### Start Playlist / Advance Playlist
```
POST /api/playlists/:id/start
POST /api/playlists/:id/advance
```
`/start` creates a `user_playlist_progress` row if one does not exist. `/advance` verifies the current module is complete (when `require_completion=true`) before moving to the next position and returns `{ progress, nextModule, completed }`.

---

### Metrics API (Admin Only)

All metrics endpoints require admin authentication (`authenticate` + `requireRole('admin')`). Use the `limit` query param (default varies) to control the number of records returned.

#### Get Performance Summary
```
GET /api/metrics/performance?limit=50
```
**Response:**
```json
{
  "totalRequests": 1240,
  "averageResponseTimeMs": 182.4,
  "slowestEndpoints": [
    { "path": "GET /api/videos", "avgDuration": 420.1, "count": 18 },
    { "path": "POST /api/ai/song", "avgDuration": 310.5, "count": 6 }
  ],
  "recentMetrics": [
    { "path": "/api/videos", "method": "GET", "duration": 180.2, "statusCode": 200, "timestamp": "2025-11-18T05:12:19.011Z" }
  ]
}
```

#### List Slow Queries
```
GET /api/metrics/slow-queries?limit=100
```
**Response:**
```json
{
  "totalSlowQueries": 12,
  "threshold": 1000,
  "queries": [
    {
      "query": "SELECT * FROM quiz_attempts WHERE user_id = $1 ORDER BY completed_at DESC",
      "durationMs": 1650.13,
      "rows": 120,
      "timestamp": "2025-11-18T04:30:11.226Z"
    }
  ]
}
```

#### Clear Slow Query Buffer
```
POST /api/metrics/slow-queries/clear
```
**Response:** `{ "message": "Slow query buffer cleared", "clearedCount": 12 }`

#### Endpoint Statistics
```
GET /api/metrics/endpoints
```
**Response:**
```json
{
  "endpoints": [
    { "path": "GET /api/videos", "avgDuration": 210.4, "count": 75, "minDuration": 32.1, "maxDuration": 480.9 }
  ]
}
```

#### Recent Request Samples
```
GET /api/metrics/recent?limit=50
```
Returns the most recent request metrics in reverse chronological order.

---

## System Config API

### Get System Configuration
```
GET /api/system/config
```
**Response:**
```json
{
  "demo_mode": false,
  "environment": "production",
  "allowed_origins": ["https://melody-lms-web.fly.dev"]
}
```

---

*This API reference should be updated whenever new endpoints are added or existing ones are modified.*
