-- Migration 010: Link Quizzes to Training Modules Instead of Individual Videos
-- This allows all genre variations of a training module to share the same quiz

\c melody_lms_api

-- Add training_module_id column to quizzes table
ALTER TABLE quizzes ADD COLUMN IF NOT EXISTS training_module_id UUID REFERENCES training_modules(id) ON DELETE CASCADE;

-- Create index for training_module_id lookups
CREATE INDEX IF NOT EXISTS idx_quizzes_training_module_id ON quizzes(training_module_id);

-- Migrate existing quizzes: link them to training modules via their video's training_module_id
UPDATE quizzes q
SET training_module_id = v.training_module_id
FROM videos v
WHERE q.video_id = v.id
  AND v.training_module_id IS NOT NULL
  AND q.training_module_id IS NULL;

-- For backwards compatibility, keep video_id but make it nullable
-- This allows quizzes to be linked to either training modules OR individual videos
ALTER TABLE quizzes ALTER COLUMN video_id DROP NOT NULL;

-- Add constraint to ensure quiz is linked to either a training module OR a video
ALTER TABLE quizzes ADD CONSTRAINT check_quiz_link
  CHECK (
    (training_module_id IS NOT NULL AND video_id IS NULL) OR
    (training_module_id IS NULL AND video_id IS NOT NULL)
  );

-- Verify migration
SELECT
  q.id as quiz_id,
  q.training_module_id,
  q.video_id,
  tm.title as module_title,
  v.title as video_title
FROM quizzes q
LEFT JOIN training_modules tm ON q.training_module_id = tm.id
LEFT JOIN videos v ON q.video_id = v.id
ORDER BY tm.title, v.title;
