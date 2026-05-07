-- Teams
CREATE TABLE IF NOT EXISTS teams (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Channels (like Slack channels)
CREATE TABLE IF NOT EXISTS channels (
  id TEXT PRIMARY KEY,
  team_id TEXT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  is_direct INTEGER DEFAULT 0,    -- 1 = DM between two people
  is_ai_enabled INTEGER DEFAULT 1, -- BabyAI participates
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Members
CREATE TABLE IF NOT EXISTS members (
  id TEXT PRIMARY KEY,
  team_id TEXT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  avatar_color TEXT DEFAULT '#3b82f6',
  role TEXT DEFAULT 'member',     -- 'owner', 'admin', 'member'
  is_self INTEGER DEFAULT 0,      -- 1 = this is the local user
  is_online INTEGER DEFAULT 0,
  last_seen TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Channel membership
CREATE TABLE IF NOT EXISTS channel_members (
  channel_id TEXT NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
  member_id TEXT NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  joined_at TEXT DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (channel_id, member_id)
);

-- Messages
CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  channel_id TEXT NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
  sender_id TEXT NOT NULL REFERENCES members(id),
  content TEXT NOT NULL,
  message_type TEXT DEFAULT 'text',  -- 'text', 'vault_share', 'ai_response', 'system', 'file'
  reply_to TEXT REFERENCES messages(id) ON DELETE SET NULL,  -- threading
  vault_item_id TEXT,                -- for vault_share type
  metadata TEXT DEFAULT '{}',        -- JSON: reactions, edits, attachments
  is_pinned INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Threads (reply chains)
CREATE INDEX IF NOT EXISTS idx_messages_reply ON messages(reply_to);
CREATE INDEX IF NOT EXISTS idx_messages_channel ON messages(channel_id);
CREATE INDEX IF NOT EXISTS idx_messages_created ON messages(created_at);
CREATE INDEX IF NOT EXISTS idx_channels_team ON channels(team_id);
CREATE INDEX IF NOT EXISTS idx_members_team ON members(team_id);

-- Call history
CREATE TABLE IF NOT EXISTS calls (
  id TEXT PRIMARY KEY,
  channel_id TEXT NOT NULL REFERENCES channels(id),
  started_by TEXT NOT NULL REFERENCES members(id),
  call_type TEXT DEFAULT 'voice',   -- 'voice', 'video', 'screen_share'
  status TEXT DEFAULT 'active',     -- 'active', 'ended'
  transcript TEXT,                   -- AI-generated transcript
  summary TEXT,                      -- AI-generated summary
  action_items TEXT DEFAULT '[]',    -- JSON array
  started_at TEXT DEFAULT CURRENT_TIMESTAMP,
  ended_at TEXT,
  duration_seconds INTEGER DEFAULT 0
);
