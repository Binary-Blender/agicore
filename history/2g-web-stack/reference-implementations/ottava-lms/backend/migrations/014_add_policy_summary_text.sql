-- Migration 014: add policy_summary_text column

ALTER TABLE training_modules
ADD COLUMN IF NOT EXISTS policy_summary_text TEXT;
