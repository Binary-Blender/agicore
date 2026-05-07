# Melody LMS Song Generation Plan

## 1. Objectives
- Extend AI Studio so admins can convert generated lyrics into polished training songs automatically.
- Orchestrate 11Labs Music API calls safely (keys, retries, credit awareness).
- Persist audio files + metadata and surface songs in both admin and learner experiences.
- Maintain resilience (drafts, idempotent workflows, background jobs) so admins can leave/resume work anytime.

## 2. Requirements Recap
- Use 11Labs Music API (compose endpoint) via ElevenLabs SDK (Python) or HTTP.
- Inputs: policy text, generated lyrics, emphasis points, module name/style preset, target duration (10s–5min).
- Outputs: MP3 (44100/128kbps) saved under `./songs/<module>/training_song_<timestamp>.mp3` (or cloud storage equivalent) + metadata (style, duration, timestamp, emphasis list).
- Provide quick/preset-driven requests and advanced options (composition plan) later.
- Support batch generation and credit awareness (optional future work).

## 3. Implementation Phases

### Phase 0 – Prereqs & Utilities
1. **Env wiring**: ensure `ELEVENLABS_API_KEY` stored as Fly secret + `.env` for local. Add config helper (Node) to read key for child process/SDK usage.
2. **File storage decision**: short-term keep MP3s on backend filesystem, long-term push to S3 bucket (reuse existing asset pipeline). Define interface so storage backend can swap.
3. **Shared types**: extend `training_modules` schema with `ai_song_url`, `ai_song_duration_seconds`, `ai_song_style`, `ai_song_generated_at`.

### Phase 1 – Backend Song Service
1. **Service wrapper**: create `/backend/src/services/songGenerator.ts` (Node) that shells out to Python helper or hits ElevenLabs HTTP directly. Accepts lyrics, style, duration, emphasis, moduleId, returns metadata + saved path.
2. **Python helper** (optional): adapt `_project_docs/song_generation/melody_quick_integration.py` into reusable CLI (e.g., `python scripts/generate_song.py --module <id>`). Ensure Node service can invoke via `child_process` with JSON I/O.
3. **API endpoint**: new route `POST /api/ai/song` (admin/manager only) to request generation. Payload: moduleId, lyrics override, emphasis list, style preset, duration. Response: job id.
4. **Job handling**: for MVP run synchronously (warn UI about 1–2 min). Next iteration: move to queue (BullMQ) and add `/api/ai/song/:jobId` for status. Save job records in `ai_song_jobs` table.
5. **Persistence**: once generation succeeds, upload MP3 to storage (local path or S3) and update `training_modules` columns. Store local file path for download fallback.
6. **Logging & errors**: capture ElevenLabs errors, timeouts, credit usage warnings; return structured error to UI.

### Phase 2 – AI Studio Integration
1. **New tab/section**: add “Song Generator” tab after Lyrics. Show current module selection, display generated song metadata or call-to-action if none.
2. **Form controls**: pick style preset (dropdown using README presets), optional custom style, duration slider, emphasis multi-select (reuse reminder phrases), lyrics preview (readonly). Provide “Generate Song” button with progress banner.
3. **State handling**: reuse draft system so partially configured song settings persist without saving to module until API success. Show status (queued, rendering, ready) via polling endpoint (Phase 1 job IDs).
4. **Success UI**: display audio player (HTML5) with download link, metadata, “Attach to module” confirmation (automatic once saved). Offer “Regenerate” with same settings.

### Phase 3 – Learner Experience
1. **Training module page**: if `ai_song_url` present, show “Listen to Official Policy Song” player before videos. Provide download + duration.
2. **Progress rules**: optionally require listening before quiz (future). For now, treat as supplementary asset.
3. **Analytics**: log when users play/download song (optional future work).

### Phase 4 – Enhancements & Automation (future backlog)
- Batch generation for multiple modules via admin CLI.
- Composition planning UI (verse/chorus mapping) leveraging `elevenlabs_music_generator.py` advanced features.
- Credit monitoring dashboard + alerts.
- Background worker autoscaling + retry policies.

## 4. Risks & Mitigations
- **API latency / rate limits**: implement exponential backoff + job queue so UI stays responsive.
- **Large files**: ensure storage bucket and CDN ready; stream upload rather than saving to disk when feasible.
- **Secrets exposure**: keep API key server-side only; never expose to browser.
- **User abandonment**: rely on job ID + drafts so work resumes gracefully if admin closes tab.

## 5. Next Actions
1. Add DB migration for song columns + optional `ai_song_jobs` table.
2. Implement backend service wrapper + `/api/ai/song` endpoint.
3. Scaffold AI Studio “Song Generator” tab with placeholder UI calling new endpoint.
4. Wire training module page audio player to new columns.

_This document will be updated as implementation progresses._
