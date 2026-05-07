-- Migration 017: Persist history of AI-generated training songs

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS training_module_songs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  training_module_id UUID NOT NULL REFERENCES training_modules(id) ON DELETE CASCADE,
  song_url TEXT NOT NULL,
  song_style TEXT,
  song_duration_seconds INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Backfill existing songs captured on the training_modules table
INSERT INTO training_module_songs (training_module_id, song_url, song_style, song_duration_seconds, created_at)
SELECT id, ai_song_url, ai_song_style, ai_song_duration_seconds, COALESCE(ai_song_generated_at, NOW())
FROM training_modules
WHERE ai_song_url IS NOT NULL;
