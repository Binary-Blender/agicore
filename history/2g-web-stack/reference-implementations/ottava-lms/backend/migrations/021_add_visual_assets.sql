-- 021_add_visual_assets.sql
-- Adds visual asset storage + QC tracking tables
-- Created: 2025-11-16

BEGIN;

CREATE TABLE IF NOT EXISTS visual_assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    training_module_id UUID REFERENCES training_modules(id) ON DELETE CASCADE,
    asset_type VARCHAR(20) NOT NULL CHECK (asset_type IN ('image', 'video')),
    public_url TEXT NOT NULL,
    storage_path TEXT,
    file_size_bytes INTEGER,
    mime_type VARCHAR(100),
    prompt TEXT NOT NULL,
    negative_prompt TEXT,
    original_prompt TEXT,
    provider VARCHAR(50) NOT NULL,
    provider_metadata JSONB DEFAULT '{}'::jsonb,
    quality_metrics JSONB DEFAULT '{}'::jsonb,
    source_reminder_phrase TEXT,
    source_image_id UUID REFERENCES visual_assets(id),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'deleted')),
    duration_seconds INTEGER,
    width INTEGER,
    height INTEGER,
    created_by VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    approved_at TIMESTAMPTZ,
    deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_visual_assets_module ON visual_assets(training_module_id);
CREATE INDEX IF NOT EXISTS idx_visual_assets_status ON visual_assets(status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_visual_assets_type ON visual_assets(asset_type);
CREATE INDEX IF NOT EXISTS idx_visual_assets_source ON visual_assets(source_image_id);
CREATE INDEX IF NOT EXISTS idx_visual_assets_phrase ON visual_assets(source_reminder_phrase);

CREATE TABLE IF NOT EXISTS visual_asset_qc_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    visual_asset_id UUID NOT NULL REFERENCES visual_assets(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'dismissed')),
    reviewer_email VARCHAR(255),
    decision VARCHAR(20) CHECK (decision IN ('approve', 'reject')),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_visual_asset_qc_status ON visual_asset_qc_tasks(status);

CREATE TABLE IF NOT EXISTS prompt_generation_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    training_module_id UUID REFERENCES training_modules(id) ON DELETE CASCADE,
    reminder_phrase TEXT NOT NULL,
    policy_snippet TEXT,
    lyrics_snippet TEXT,
    generated_prompt TEXT NOT NULL,
    user_modified_prompt TEXT,
    model_used VARCHAR(50) DEFAULT 'gpt-4o-mini',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_prompt_logs_module ON prompt_generation_logs(training_module_id);
CREATE INDEX IF NOT EXISTS idx_prompt_logs_phrase ON prompt_generation_logs(reminder_phrase);

COMMIT;
