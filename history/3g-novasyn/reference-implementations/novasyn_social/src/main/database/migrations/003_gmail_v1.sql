-- NovaSyn Social: Gmail v1 "Airtight Loop" Migration
-- Migration 003 — Send support, sync cursors, draft state fixes

-- ============================================================
-- ACCOUNTS — Add Gmail history cursor for incremental sync
-- ============================================================
ALTER TABLE accounts ADD COLUMN sync_cursor TEXT;
-- Gmail: stores historyId for efficient delta sync
-- Other platforms: stores platform-specific cursor

-- ============================================================
-- MESSAGES — Add reply tracking fields
-- ============================================================
ALTER TABLE messages ADD COLUMN recipient_email TEXT;
ALTER TABLE messages ADD COLUMN in_reply_to TEXT;
-- in_reply_to: Message-ID header for threading replies
-- recipient_email: who to send replies to (parsed from From header on inbound)

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_messages_thread_id ON messages (thread_id);
CREATE INDEX IF NOT EXISTS idx_messages_external_id ON messages (external_id);
CREATE INDEX IF NOT EXISTS idx_drafts_is_accepted ON drafts (is_accepted);
