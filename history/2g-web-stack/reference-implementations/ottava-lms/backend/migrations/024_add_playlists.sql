-- Playlist system schema (P18)

CREATE TABLE IF NOT EXISTS playlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  is_required BOOLEAN NOT NULL DEFAULT false,
  auto_play BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS playlist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  playlist_id UUID NOT NULL REFERENCES playlists(id) ON DELETE CASCADE,
  training_module_id UUID NOT NULL REFERENCES training_modules(id) ON DELETE CASCADE,
  position INTEGER NOT NULL CHECK (position >= 1),
  require_completion BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (playlist_id, position),
  UNIQUE (playlist_id, training_module_id)
);

CREATE TABLE IF NOT EXISTS user_playlist_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  playlist_id UUID NOT NULL REFERENCES playlists(id) ON DELETE CASCADE,
  current_item_id UUID REFERENCES playlist_items(id) ON DELETE SET NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'not_started',
  started_at TIMESTAMP WITHOUT TIME ZONE,
  completed_at TIMESTAMP WITHOUT TIME ZONE,
  last_accessed TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (user_id, playlist_id),
  CONSTRAINT user_playlist_progress_valid_status CHECK (
    status IN ('not_started', 'in_progress', 'completed')
  )
);

CREATE INDEX IF NOT EXISTS idx_playlists_org ON playlists (organization_id);
CREATE INDEX IF NOT EXISTS idx_playlists_created_by ON playlists (created_by);

CREATE INDEX IF NOT EXISTS idx_playlist_items_playlist ON playlist_items (playlist_id);
CREATE INDEX IF NOT EXISTS idx_playlist_items_module ON playlist_items (training_module_id);

CREATE INDEX IF NOT EXISTS idx_user_playlist_progress_user ON user_playlist_progress (user_id);
CREATE INDEX IF NOT EXISTS idx_user_playlist_progress_playlist ON user_playlist_progress (playlist_id);
CREATE INDEX IF NOT EXISTS idx_user_playlist_progress_status ON user_playlist_progress (status);

