-- Migration 009: Seed Training Modules and Organize Existing Videos
-- This migration creates sample training modules from existing videos

\c melody_lms_api

-- Create training modules for each existing video
INSERT INTO training_modules (id, organization_id, title, description, category, difficulty_level, estimated_duration_minutes, is_active, created_at, updated_at)
VALUES
  ('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000001', 'Binary Blender Case Study', 'Learn about the Binary Blender project implementation and architecture', 'Case Study', 'Intermediate', 45, true, NOW(), NOW()),
  ('22222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000001', 'Data Privacy Compliance', 'Understanding data privacy regulations and compliance requirements', 'Compliance', 'Advanced', 30, true, NOW(), NOW()),
  ('33333333-3333-3333-3333-333333333333', '00000000-0000-0000-0000-000000000001', 'HIPAA Compliance Training', 'Essential HIPAA compliance training for healthcare professionals', 'Healthcare', 'Beginner', 60, true, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Assign genres to existing videos and link them to training modules
-- Note: You'll need to create additional videos for other genres manually or via API

-- Update Binary Blender video (assign rock genre)
UPDATE videos
SET genre = 'rock', training_module_id = '11111111-1111-1111-1111-111111111111'
WHERE title = 'Binary-Blender Case Study';

-- Update Data Privacy video (assign jazz genre)
UPDATE videos
SET genre = 'jazz', training_module_id = '22222222-2222-2222-2222-222222222222'
WHERE title = 'Data Privacy Compliance Song';

-- Update HIPAA video (assign classical genre)
UPDATE videos
SET genre = 'classical', training_module_id = '33333333-3333-3333-3333-333333333333'
WHERE title = 'HIPAA Compliance 101';

-- Verify the changes
SELECT
  tm.title as module_title,
  v.title as video_title,
  v.genre,
  v.training_module_id
FROM training_modules tm
LEFT JOIN videos v ON tm.id = v.training_module_id
ORDER BY tm.title;
