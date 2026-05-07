-- Migration 012: Add AI content fields to training_modules

ALTER TABLE training_modules
ADD COLUMN IF NOT EXISTS ai_song_lyrics TEXT,
ADD COLUMN IF NOT EXISTS ai_overlay_texts JSONB;

COMMENT ON COLUMN training_modules.ai_song_lyrics IS 'Latest AI-generated or manually curated song lyrics for this module.';
COMMENT ON COLUMN training_modules.ai_overlay_texts IS 'JSON payload containing reinforcement and policy highlight reminder text.';
