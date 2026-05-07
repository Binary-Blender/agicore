-- Migration 020: Asset repository and QC workflow support

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS ai_assets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  training_module_id UUID REFERENCES training_modules(id) ON DELETE SET NULL,
  asset_type TEXT NOT NULL DEFAULT 'audio',
  title TEXT,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  storage_path TEXT NOT NULL,
  public_url TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  duration_seconds INTEGER,
  style TEXT,
  source TEXT,
  uploaded_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  approved_at TIMESTAMPTZ,
  rejected_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_ai_assets_status ON ai_assets(status);
CREATE INDEX IF NOT EXISTS idx_ai_assets_training_module ON ai_assets(training_module_id);

CREATE TABLE IF NOT EXISTS qc_tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  asset_id UUID NOT NULL REFERENCES ai_assets(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending',
  reviewer TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_qc_tasks_status ON qc_tasks(status);

ALTER TABLE training_module_songs
  ADD COLUMN IF NOT EXISTS asset_id UUID REFERENCES ai_assets(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'approved';

UPDATE training_module_songs
   SET status = 'approved'
 WHERE status IS NULL;
