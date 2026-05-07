-- Migration 011: Enforce single quiz per training module (and per standalone video)
-- Ensures data integrity so that admins cannot accidentally create duplicate quizzes.

-- Training modules should only ever have one quiz record
CREATE UNIQUE INDEX IF NOT EXISTS idx_quizzes_training_module_unique
ON quizzes(training_module_id)
WHERE training_module_id IS NOT NULL;

-- Standalone videos (without a module) should also only have one quiz
CREATE UNIQUE INDEX IF NOT EXISTS idx_quizzes_video_unique
ON quizzes(video_id)
WHERE video_id IS NOT NULL;
