-- Migration: Add genre support and favorites functionality
-- This migration adds:
-- 1. genre column to videos table
-- 2. training_module_id to group videos by module
-- 3. preferred_genre to users table
-- 4. video_favorites table for user favorites

-- Add genre and training_module_id to videos table
ALTER TABLE videos
ADD COLUMN IF NOT EXISTS genre VARCHAR(50),
ADD COLUMN IF NOT EXISTS training_module_id UUID;

-- Add preferred_genre to users table
ALTER TABLE users
ADD COLUMN IF NOT EXISTS preferred_genre VARCHAR(50);

-- Create video_favorites table
CREATE TABLE IF NOT EXISTS video_favorites (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    video_id UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, video_id)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_videos_genre ON videos(genre);
CREATE INDEX IF NOT EXISTS idx_videos_training_module ON videos(training_module_id);
CREATE INDEX IF NOT EXISTS idx_video_favorites_user ON video_favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_video_favorites_video ON video_favorites(video_id);

-- Add comments for documentation
COMMENT ON COLUMN videos.genre IS 'Music genre for the video (e.g., rock, pop, jazz, classical, hip-hop)';
COMMENT ON COLUMN videos.training_module_id IS 'Groups multiple videos of different genres under the same training module';
COMMENT ON COLUMN users.preferred_genre IS 'User''s preferred music genre for auto-selection';
COMMENT ON TABLE video_favorites IS 'Stores user favorite videos';
