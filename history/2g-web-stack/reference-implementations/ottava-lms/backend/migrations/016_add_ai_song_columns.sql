-- Migration 016: Add AI-generated song metadata to training modules

ALTER TABLE training_modules
  ADD COLUMN IF NOT EXISTS ai_song_url TEXT,
  ADD COLUMN IF NOT EXISTS ai_song_duration_seconds INTEGER,
  ADD COLUMN IF NOT EXISTS ai_song_style TEXT,
  ADD COLUMN IF NOT EXISTS ai_song_generated_at TIMESTAMPTZ;
