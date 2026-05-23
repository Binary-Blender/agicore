-- Backfill validation_errors column on databases created before it was
-- folded into the channel_messages CREATE TABLE in 001_initial.sql.
-- Loaded with `let _ =` in db.rs, so re-runs (duplicate column) are ignored.
ALTER TABLE channel_messages ADD COLUMN validation_errors TEXT;
