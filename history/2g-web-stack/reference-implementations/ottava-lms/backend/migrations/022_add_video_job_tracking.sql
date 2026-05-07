-- 022_add_video_job_tracking.sql
-- Adds async job tracking + parent linkage for visual assets
-- Created: 2025-11-16

BEGIN;

ALTER TABLE visual_assets
    ADD COLUMN IF NOT EXISTS job_id TEXT,
    ADD COLUMN IF NOT EXISTS parent_asset_id UUID REFERENCES visual_assets(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_visual_assets_job_id
    ON visual_assets(job_id)
    WHERE job_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_visual_assets_parent
    ON visual_assets(parent_asset_id)
    WHERE parent_asset_id IS NOT NULL;

COMMIT;
