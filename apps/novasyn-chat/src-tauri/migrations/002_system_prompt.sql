-- Migration: add system_prompt to sessions
ALTER TABLE sessions ADD COLUMN system_prompt TEXT;
