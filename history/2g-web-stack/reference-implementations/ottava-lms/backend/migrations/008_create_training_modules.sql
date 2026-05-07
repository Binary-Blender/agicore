-- Migration: Create training_modules table
-- This migration adds a proper training_modules table to organize videos by training class
-- Each training module can have multiple videos (one per genre)

-- Create training_modules table
CREATE TABLE IF NOT EXISTS training_modules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100),
    difficulty_level VARCHAR(50),
    estimated_duration_minutes INTEGER,
    thumbnail_url TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add foreign key constraint to videos table (training_module_id already exists)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'fk_videos_training_module'
    ) THEN
        ALTER TABLE videos
        ADD CONSTRAINT fk_videos_training_module
        FOREIGN KEY (training_module_id)
        REFERENCES training_modules(id)
        ON DELETE SET NULL;
    END IF;
END $$;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_training_modules_org ON training_modules(organization_id);
CREATE INDEX IF NOT EXISTS idx_training_modules_category ON training_modules(category);
CREATE INDEX IF NOT EXISTS idx_training_modules_active ON training_modules(is_active);

-- Add comments for documentation
COMMENT ON TABLE training_modules IS 'Training modules that group videos by genre';
COMMENT ON COLUMN training_modules.title IS 'Title of the training module (e.g., "Basic Music Theory")';
COMMENT ON COLUMN training_modules.category IS 'Category of training (e.g., "theory", "technique", "performance")';
COMMENT ON COLUMN training_modules.difficulty_level IS 'Difficulty level (e.g., "beginner", "intermediate", "advanced")';
