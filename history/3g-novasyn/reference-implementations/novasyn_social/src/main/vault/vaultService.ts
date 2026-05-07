// NS Vault — Shared SQLite database service
// Location: %APPDATA%\NovaSyn\vault.db
// All NovaSyn apps share this database for cross-app asset storage

import Database from 'better-sqlite3';
import path from 'path';
import { app } from 'electron';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import type {
  VaultItem,
  VaultTag,
  VaultAnnotation,
  VaultSearchOptions,
  VaultStoreInput,
} from './vaultTypes';

const SOURCE_APP = 'novasyn-social';

let vaultDb: Database.Database | null = null;
let ftsAvailable = false;

function getVaultPath(): string {
  return path.join(app.getPath('appData'), 'NovaSyn', 'vault.db');
}

export function getVaultDatabase(): Database.Database {
  if (!vaultDb) {
    const dbPath = getVaultPath();
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });

    vaultDb = new Database(dbPath);
    vaultDb.pragma('journal_mode = WAL');
    vaultDb.pragma('foreign_keys = ON');
    vaultDb.pragma('busy_timeout = 5000'); // Wait up to 5s for write lock (multi-app access)

    console.log(`Vault database initialized at: ${dbPath}`);
  }
  return vaultDb;
}

export function closeVaultDatabase(): void {
  if (vaultDb) {
    vaultDb.close();
    vaultDb = null;
    console.log('Vault database closed');
  }
}

export function initVault(): void {
  const db = getVaultDatabase();

  db.exec(`
    CREATE TABLE IF NOT EXISTS vault_items (
      id TEXT PRIMARY KEY,
      item_type TEXT NOT NULL,
      source_app TEXT NOT NULL,
      title TEXT NOT NULL,
      content TEXT,
      file_path TEXT,
      output_type_hint TEXT,
      parent_id TEXT REFERENCES vault_items(id) ON DELETE SET NULL,
      metadata TEXT DEFAULT '{}',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS vault_tags (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      color TEXT DEFAULT '#3b82f6',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS vault_item_tags (
      item_id TEXT NOT NULL REFERENCES vault_items(id) ON DELETE CASCADE,
      tag_id TEXT NOT NULL REFERENCES vault_tags(id) ON DELETE CASCADE,
      PRIMARY KEY (item_id, tag_id)
    );

    CREATE TABLE IF NOT EXISTS vault_annotations (
      id TEXT PRIMARY KEY,
      item_id TEXT NOT NULL REFERENCES vault_items(id) ON DELETE CASCADE,
      content TEXT NOT NULL,
      author_app TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_vault_items_type ON vault_items(item_type);
    CREATE INDEX IF NOT EXISTS idx_vault_items_source ON vault_items(source_app);
    CREATE INDEX IF NOT EXISTS idx_vault_items_parent ON vault_items(parent_id);
    CREATE INDEX IF NOT EXISTS idx_vault_items_created ON vault_items(created_at);
    CREATE INDEX IF NOT EXISTS idx_vault_annotations_item ON vault_annotations(item_id);
  `);

  // FTS5 full-text search — may not be available in all better-sqlite3 builds
  try {
    db.exec(`
      CREATE VIRTUAL TABLE IF NOT EXISTS vault_fts USING fts5(
        title, content, source_app, item_type,
        content=vault_items, content_rowid=rowid
      );

      -- Triggers to keep FTS in sync
      CREATE TRIGGER IF NOT EXISTS vault_fts_insert AFTER INSERT ON vault_items BEGIN
        INSERT INTO vault_fts(rowid, title, content, source_app, item_type) VALUES (new.rowid, new.title, new.content, new.source_app, new.item_type);
      END;

      CREATE TRIGGER IF NOT EXISTS vault_fts_delete AFTER DELETE ON vault_items BEGIN
        INSERT INTO vault_fts(vault_fts, rowid, title, content, source_app, item_type) VALUES ('delete', old.rowid, old.title, old.content, old.source_app, old.item_type);
      END;

      CREATE TRIGGER IF NOT EXISTS vault_fts_update AFTER UPDATE ON vault_items BEGIN
        INSERT INTO vault_fts(vault_fts, rowid, title, content, source_app, item_type) VALUES ('delete', old.rowid, old.title, old.content, old.source_app, old.item_type);
        INSERT INTO vault_fts(rowid, title, content, source_app, item_type) VALUES (new.rowid, new.title, new.content, new.source_app, new.item_type);
      END;
    `);
    ftsAvailable = true;
    console.log('Vault FTS5 full-text search initialized');
  } catch (err) {
    ftsAvailable = false;
    console.warn('Vault FTS5 not available, falling back to LIKE search:', err);
  }

  console.log('Vault schema initialized');
}


// ---------------------------------------------------------------------------
// Row mapping helpers
// ---------------------------------------------------------------------------

function mapVaultItemRow(row: any): VaultItem {
  const db = getVaultDatabase();

  // Get tags for this item
  const tagRows = db.prepare(`
    SELECT t.name FROM vault_tags t
    JOIN vault_item_tags vit ON t.id = vit.tag_id
    WHERE vit.item_id = ?
  `).all(row.id) as { name: string }[];

  // Get annotation count
  const countRow = db.prepare(
    'SELECT COUNT(*) as count FROM vault_annotations WHERE item_id = ?'
  ).get(row.id) as { count: number };

  return {
    id: row.id,
    itemType: row.item_type,
    sourceApp: row.source_app,
    title: row.title,
    content: row.content || null,
    filePath: row.file_path || null,
    outputTypeHint: row.output_type_hint || null,
    parentId: row.parent_id || null,
    metadata: JSON.parse(row.metadata || '{}'),
    tags: tagRows.map((t) => t.name),
    annotationCount: countRow.count,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}


// ---------------------------------------------------------------------------
// CRUD Operations
// ---------------------------------------------------------------------------

export function vaultStore(input: VaultStoreInput): VaultItem {
  const db = getVaultDatabase();
  const id = uuidv4();
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO vault_items (id, item_type, source_app, title, content, file_path, output_type_hint, parent_id, metadata, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    input.itemType,
    SOURCE_APP,
    input.title,
    input.content || null,
    input.filePath || null,
    input.outputTypeHint || null,
    input.parentId || null,
    JSON.stringify(input.metadata || {}),
    now,
    now,
  );

  // Add tags if provided
  if (input.tags && input.tags.length > 0) {
    for (const tagName of input.tags) {
      const tagId = ensureTag(tagName);
      db.prepare('INSERT OR IGNORE INTO vault_item_tags (item_id, tag_id) VALUES (?, ?)').run(id, tagId);
    }
  }

  const row = db.prepare('SELECT * FROM vault_items WHERE id = ?').get(id);
  return mapVaultItemRow(row);
}

export function vaultGet(id: string): VaultItem | null {
  const db = getVaultDatabase();
  const row = db.prepare('SELECT * FROM vault_items WHERE id = ?').get(id);
  if (!row) return null;
  return mapVaultItemRow(row);
}

export function vaultList(options?: { limit?: number; offset?: number }): VaultItem[] {
  const db = getVaultDatabase();
  const limit = options?.limit || 100;
  const offset = options?.offset || 0;

  const rows = db.prepare(
    'SELECT * FROM vault_items ORDER BY created_at DESC LIMIT ? OFFSET ?'
  ).all(limit, offset) as any[];

  return rows.map(mapVaultItemRow);
}

export function vaultDelete(id: string): void {
  const db = getVaultDatabase();
  db.prepare('DELETE FROM vault_items WHERE id = ?').run(id);
}

export function vaultSearch(options: VaultSearchOptions): VaultItem[] {
  const db = getVaultDatabase();
  const conditions: string[] = ['1=1'];
  const params: any[] = [];

  if (options.itemType) {
    conditions.push('vi.item_type = ?');
    params.push(options.itemType);
  }

  if (options.sourceApp) {
    conditions.push('vi.source_app = ?');
    params.push(options.sourceApp);
  }

  if (options.parentId) {
    conditions.push('vi.parent_id = ?');
    params.push(options.parentId);
  }

  if (options.query) {
    if (ftsAvailable) {
      conditions.push('vi.rowid IN (SELECT rowid FROM vault_fts WHERE vault_fts MATCH ?)');
      params.push(options.query);
    } else {
      conditions.push('(vi.title LIKE ? OR vi.content LIKE ?)');
      const q = `%${options.query}%`;
      params.push(q, q);
    }
  }

  if (options.tags && options.tags.length > 0) {
    // Items that have ALL specified tags
    conditions.push(`vi.id IN (
      SELECT vit.item_id FROM vault_item_tags vit
      JOIN vault_tags t ON t.id = vit.tag_id
      WHERE t.name IN (${options.tags.map(() => '?').join(',')})
      GROUP BY vit.item_id
      HAVING COUNT(DISTINCT t.name) = ?
    )`);
    params.push(...options.tags, options.tags.length);
  }

  const limit = options.limit || 100;
  const offset = options.offset || 0;
  params.push(limit, offset);

  const sql = `
    SELECT vi.* FROM vault_items vi
    WHERE ${conditions.join(' AND ')}
    ORDER BY vi.created_at DESC
    LIMIT ? OFFSET ?
  `;

  const rows = db.prepare(sql).all(...params) as any[];
  return rows.map(mapVaultItemRow);
}


// ---------------------------------------------------------------------------
// Tags
// ---------------------------------------------------------------------------

function ensureTag(name: string, color?: string): string {
  const db = getVaultDatabase();
  const existing = db.prepare('SELECT id FROM vault_tags WHERE name = ?').get(name) as { id: string } | undefined;
  if (existing) return existing.id;

  const id = uuidv4();
  db.prepare('INSERT INTO vault_tags (id, name, color) VALUES (?, ?, ?)').run(id, name, color || '#3b82f6');
  return id;
}

export function vaultGetTags(): VaultTag[] {
  const db = getVaultDatabase();
  const rows = db.prepare('SELECT * FROM vault_tags ORDER BY name').all() as any[];
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    color: r.color,
    createdAt: r.created_at,
  }));
}

export function vaultAddTag(itemId: string, tagName: string, color?: string): void {
  const tagId = ensureTag(tagName, color);
  const db = getVaultDatabase();
  db.prepare('INSERT OR IGNORE INTO vault_item_tags (item_id, tag_id) VALUES (?, ?)').run(itemId, tagId);
}


// ---------------------------------------------------------------------------
// Annotations
// ---------------------------------------------------------------------------

export function vaultAnnotate(itemId: string, content: string): VaultAnnotation {
  const db = getVaultDatabase();
  const id = uuidv4();
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO vault_annotations (id, item_id, content, author_app, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(id, itemId, content, SOURCE_APP, now, now);

  return {
    id,
    itemId,
    content,
    authorApp: SOURCE_APP,
    createdAt: now,
    updatedAt: now,
  };
}

export function vaultGetAnnotations(itemId: string): VaultAnnotation[] {
  const db = getVaultDatabase();
  const rows = db.prepare(
    'SELECT * FROM vault_annotations WHERE item_id = ? ORDER BY created_at DESC'
  ).all(itemId) as any[];

  return rows.map((r) => ({
    id: r.id,
    itemId: r.item_id,
    content: r.content,
    authorApp: r.author_app,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }));
}


// ---------------------------------------------------------------------------
// Provenance
// ---------------------------------------------------------------------------

export function vaultGetProvenance(itemId: string): VaultItem[] {
  // Walk up the parent chain to build the provenance history
  const chain: VaultItem[] = [];
  let currentId: string | null = itemId;

  while (currentId) {
    const item = vaultGet(currentId);
    if (!item) break;
    chain.push(item);
    currentId = item.parentId;
  }

  return chain; // First item is the requested item, last is the root ancestor
}
