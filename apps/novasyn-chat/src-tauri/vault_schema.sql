-- Agicore Generated — DO NOT EDIT BY HAND
-- Vault schema: shared asset storage
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS vault_assets (
    id          TEXT PRIMARY KEY,
    asset_type  TEXT NOT NULL CHECK(asset_type IN ('text', 'json', 'code', 'prompt_template', 'skilldoc', 'exchange')),
    title       TEXT NOT NULL,
    content     TEXT NOT NULL,
    metadata    TEXT,
    created_at  TEXT NOT NULL,
    updated_at  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS vault_tags (
    id    TEXT PRIMARY KEY,
    name  TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS vault_asset_tags (
    asset_id  TEXT NOT NULL REFERENCES vault_assets(id) ON DELETE CASCADE,
    tag_id    TEXT NOT NULL REFERENCES vault_tags(id) ON DELETE CASCADE,
    PRIMARY KEY (asset_id, tag_id)
);

CREATE TABLE IF NOT EXISTS vault_provenance (
    id        TEXT PRIMARY KEY,
    asset_id  TEXT NOT NULL REFERENCES vault_assets(id) ON DELETE CASCADE,
    action    TEXT NOT NULL,
    source    TEXT,
    actor     TEXT,
    timestamp TEXT NOT NULL
);
