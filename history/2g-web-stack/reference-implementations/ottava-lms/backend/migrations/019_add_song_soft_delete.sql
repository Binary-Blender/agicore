-- Migration 019: Support soft-deleting songs and clean up orphaned entries

ALTER TABLE training_module_songs
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Remove legacy rows that never stored the audio binary
DELETE FROM training_module_songs
 WHERE song_file IS NULL;

-- Clear module-level song pointers that no longer have backing records
UPDATE training_modules tm
   SET ai_song_url = NULL,
       ai_song_duration_seconds = NULL,
       ai_song_style = NULL,
       ai_song_generated_at = NULL
 WHERE ai_song_url IS NOT NULL
   AND NOT EXISTS (
     SELECT 1
       FROM training_module_songs ms
      WHERE ms.training_module_id = tm.id
        AND ms.song_url = tm.ai_song_url
        AND ms.deleted_at IS NULL
   );
