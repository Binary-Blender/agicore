-- Migration: add selected_folders to sessions
ALTER TABLE sessions ADD COLUMN selected_folders TEXT DEFAULT '[]';
