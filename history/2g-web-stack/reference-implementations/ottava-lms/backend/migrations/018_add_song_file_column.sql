-- Migration 018: Preserve generated song audio in the database for reliable playback

ALTER TABLE training_module_songs
  ADD COLUMN IF NOT EXISTS song_file BYTEA;
