-- Migration 015: Store emphasis prompt for each training module
ALTER TABLE training_modules
ADD COLUMN IF NOT EXISTS emphasis_prompt TEXT;
