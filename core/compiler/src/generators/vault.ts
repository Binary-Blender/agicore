// VAULT Code Generator
// Generates vault.rs with a separate SQLite connection, asset CRUD,
// optional tag and provenance support.
// Activated when ast.vault is declared.

import type { AgiFile, VaultDecl } from '@agicore/parser';

// ── SQL schema ────────────────────────────────────────────────────────────────

function vaultSchema(vault: VaultDecl): string {
  const assetTypeList = vault.assetTypes.map(t => `'${t}'`).join(', ');
  const lines: string[] = [
    '-- Agicore Generated — DO NOT EDIT BY HAND',
    '-- Vault schema: shared asset storage',
    'PRAGMA journal_mode = WAL;',
    'PRAGMA foreign_keys = ON;',
    '',
    'CREATE TABLE IF NOT EXISTS vault_assets (',
    '    id          TEXT PRIMARY KEY,',
    `    asset_type  TEXT NOT NULL CHECK(asset_type IN (${assetTypeList})),`,
    '    title       TEXT NOT NULL,',
    '    content     TEXT NOT NULL,',
    '    metadata    TEXT,',
    '    created_at  TEXT NOT NULL,',
    '    updated_at  TEXT NOT NULL',
    ');',
    '',
  ];

  if (vault.tags) {
    lines.push(
      'CREATE TABLE IF NOT EXISTS vault_tags (',
      '    id    TEXT PRIMARY KEY,',
      '    name  TEXT NOT NULL UNIQUE',
      ');',
      '',
      'CREATE TABLE IF NOT EXISTS vault_asset_tags (',
      '    asset_id  TEXT NOT NULL REFERENCES vault_assets(id) ON DELETE CASCADE,',
      '    tag_id    TEXT NOT NULL REFERENCES vault_tags(id) ON DELETE CASCADE,',
      '    PRIMARY KEY (asset_id, tag_id)',
      ');',
      '',
    );
  }

  if (vault.provenance) {
    lines.push(
      'CREATE TABLE IF NOT EXISTS vault_provenance (',
      '    id        TEXT PRIMARY KEY,',
      '    asset_id  TEXT NOT NULL REFERENCES vault_assets(id) ON DELETE CASCADE,',
      '    action    TEXT NOT NULL,',
      '    source    TEXT,',
      '    actor     TEXT,',
      '    timestamp TEXT NOT NULL',
      ');',
      '',
    );
  }

  return lines.join('\n');
}

// ── vault.rs ──────────────────────────────────────────────────────────────────

function vaultRs(vault: VaultDecl): string {
  const lines: string[] = [
    '// Agicore Generated — DO NOT EDIT BY HAND',
    '// Re-run `agicore generate` to regenerate.',
    '// Vault: shared asset storage at ' + vault.path,
    '',
    '#![allow(unused_variables, dead_code)]',
    '',
    'use rusqlite::Connection;',
    'use serde::{Deserialize, Serialize};',
    'use std::path::PathBuf;',
    'use std::sync::Mutex;',
    '',
    'pub type VaultPool = Mutex<Connection>;',
    '',
    '// ── Init ─────────────────────────────────────────────────────────────────────',
    '',
    'pub fn init_vault(vault_path: PathBuf) -> VaultPool {',
    '    if let Some(parent) = vault_path.parent() {',
    '        std::fs::create_dir_all(parent).ok();',
    '    }',
    '    let conn = Connection::open(&vault_path).expect("Failed to open vault database");',
    '    conn.execute_batch(include_str!("../vault_schema.sql"))',
    '        .expect("Failed to run vault schema");',
    '    Mutex::new(conn)',
    '}',
    '',
    '/// Expand %APPDATA% / $HOME style placeholders to an absolute path.',
    'pub fn resolve_vault_path(raw: &str) -> PathBuf {',
    '    if raw.starts_with("%APPDATA%") {',
    '        let base = dirs::data_dir().unwrap_or_else(|| PathBuf::from("."));',
    '        return base.join(&raw[10..]); // strip "%APPDATA%/"',
    '    }',
    '    PathBuf::from(raw)',
    '}',
    '',
    '// ── Structs ──────────────────────────────────────────────────────────────────',
    '',
    '#[derive(Debug, Clone, Serialize, Deserialize)]',
    '#[serde(rename_all = "camelCase")]',
    'pub struct VaultAsset {',
    '    pub id: String,',
    '    pub asset_type: String,',
    '    pub title: String,',
    '    pub content: String,',
    '    pub metadata: Option<String>,',
    '    pub created_at: String,',
    '    pub updated_at: String,',
    '}',
    '',
    'impl VaultAsset {',
    '    fn from_row(row: &rusqlite::Row) -> Self {',
    '        Self {',
    '            id:         row.get("id").unwrap(),',
    '            asset_type: row.get("asset_type").unwrap(),',
    '            title:      row.get("title").unwrap(),',
    '            content:    row.get("content").unwrap(),',
    '            metadata:   row.get("metadata").ok(),',
    '            created_at: row.get("created_at").unwrap(),',
    '            updated_at: row.get("updated_at").unwrap(),',
    '        }',
    '    }',
    '}',
    '',
    '#[derive(Debug, Deserialize)]',
    '#[serde(rename_all = "camelCase")]',
    'pub struct SaveVaultAssetInput {',
    '    pub asset_type: String,',
    '    pub title: String,',
    '    pub content: String,',
    '    pub metadata: Option<String>,',
    '}',
    '',
    '// ── Commands ─────────────────────────────────────────────────────────────────',
    '',
    '#[tauri::command]',
    "pub fn vault_list_assets(vault: tauri::State<'_, VaultPool>) -> Result<Vec<VaultAsset>, String> {",
    '    let conn = vault.lock().map_err(|e| e.to_string())?;',
    '    let mut stmt = conn.prepare(',
    '        "SELECT * FROM vault_assets ORDER BY updated_at DESC"',
    '    ).map_err(|e| e.to_string())?;',
    '    let rows = stmt.query_map([], |row| Ok(VaultAsset::from_row(row)))',
    '        .map_err(|e| e.to_string())?',
    '        .collect::<Result<Vec<_>, _>>()',
    '        .map_err(|e| e.to_string())?;',
    '    Ok(rows)',
    '}',
    '',
    '#[tauri::command]',
    "pub fn vault_get_asset(vault: tauri::State<'_, VaultPool>, id: String) -> Result<VaultAsset, String> {",
    '    let conn = vault.lock().map_err(|e| e.to_string())?;',
    '    conn.query_row("SELECT * FROM vault_assets WHERE id = ?", [&id], |row| {',
    '        Ok(VaultAsset::from_row(row))',
    '    }).map_err(|e| e.to_string())',
    '}',
    '',
    '#[tauri::command]',
    "pub fn vault_save_asset(vault: tauri::State<'_, VaultPool>, input: SaveVaultAssetInput) -> Result<VaultAsset, String> {",
    '    let conn = vault.lock().map_err(|e| e.to_string())?;',
    '    let id = uuid::Uuid::new_v4().to_string();',
    '    let now = chrono::Utc::now().to_rfc3339();',
    '    conn.execute(',
    '        "INSERT INTO vault_assets (id, asset_type, title, content, metadata, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)",',
    '        rusqlite::params![id, input.asset_type, input.title, input.content, input.metadata, now, now],',
    '    ).map_err(|e| e.to_string())?;',
    '    conn.query_row("SELECT * FROM vault_assets WHERE id = ?", [&id], |row| {',
    '        Ok(VaultAsset::from_row(row))',
    '    }).map_err(|e| e.to_string())',
    '}',
    '',
    '#[tauri::command]',
    "pub fn vault_update_asset(vault: tauri::State<'_, VaultPool>, id: String, content: String, title: Option<String>) -> Result<VaultAsset, String> {",
    '    let conn = vault.lock().map_err(|e| e.to_string())?;',
    '    let now = chrono::Utc::now().to_rfc3339();',
    '    if let Some(t) = title {',
    '        conn.execute(',
    '            "UPDATE vault_assets SET content = ?, title = ?, updated_at = ? WHERE id = ?",',
    '            rusqlite::params![content, t, now, id],',
    '        ).map_err(|e| e.to_string())?;',
    '    } else {',
    '        conn.execute(',
    '            "UPDATE vault_assets SET content = ?, updated_at = ? WHERE id = ?",',
    '            rusqlite::params![content, now, id],',
    '        ).map_err(|e| e.to_string())?;',
    '    }',
    '    conn.query_row("SELECT * FROM vault_assets WHERE id = ?", [&id], |row| {',
    '        Ok(VaultAsset::from_row(row))',
    '    }).map_err(|e| e.to_string())',
    '}',
    '',
    '#[tauri::command]',
    "pub fn vault_delete_asset(vault: tauri::State<'_, VaultPool>, id: String) -> Result<(), String> {",
    '    let conn = vault.lock().map_err(|e| e.to_string())?;',
    '    conn.execute("DELETE FROM vault_assets WHERE id = ?", [&id])',
    '        .map_err(|e| e.to_string())?;',
    '    Ok(())',
    '}',
    '',
    '#[tauri::command]',
    "pub fn vault_search_assets(vault: tauri::State<'_, VaultPool>, query: String, asset_type: Option<String>) -> Result<Vec<VaultAsset>, String> {",
    '    let conn = vault.lock().map_err(|e| e.to_string())?;',
    '    let like = format!("%{}%", query);',
    '    let rows = if let Some(t) = asset_type {',
    '        let mut stmt = conn.prepare(',
    '            "SELECT * FROM vault_assets WHERE asset_type = ? AND (title LIKE ? OR content LIKE ?) ORDER BY updated_at DESC"',
    '        ).map_err(|e| e.to_string())?;',
    '        stmt.query_map(rusqlite::params![t, like, like], |row| Ok(VaultAsset::from_row(row)))',
    '            .map_err(|e| e.to_string())?',
    '            .collect::<Result<Vec<_>, _>>()',
    '            .map_err(|e| e.to_string())?',
    '    } else {',
    '        let mut stmt = conn.prepare(',
    '            "SELECT * FROM vault_assets WHERE title LIKE ? OR content LIKE ? ORDER BY updated_at DESC"',
    '        ).map_err(|e| e.to_string())?;',
    '        stmt.query_map(rusqlite::params![like, like], |row| Ok(VaultAsset::from_row(row)))',
    '            .map_err(|e| e.to_string())?',
    '            .collect::<Result<Vec<_>, _>>()',
    '            .map_err(|e| e.to_string())?',
    '    };',
    '    Ok(rows)',
    '}',
    '',
  ];

  if (vault.tags) {
    lines.push(
      '// ── Tag commands ─────────────────────────────────────────────────────────────',
      '',
      '#[derive(Debug, Clone, Serialize, Deserialize)]',
      '#[serde(rename_all = "camelCase")]',
      'pub struct VaultTag { pub id: String, pub name: String }',
      '',
      '#[tauri::command]',
      "pub fn vault_list_tags(vault: tauri::State<'_, VaultPool>) -> Result<Vec<VaultTag>, String> {",
      '    let conn = vault.lock().map_err(|e| e.to_string())?;',
      '    let mut stmt = conn.prepare("SELECT id, name FROM vault_tags ORDER BY name").map_err(|e| e.to_string())?;',
      '    let rows = stmt.query_map([], |row| Ok(VaultTag { id: row.get(0)?, name: row.get(1)? }))',
      '        .map_err(|e| e.to_string())?',
      '        .collect::<Result<Vec<_>, _>>()',
      '        .map_err(|e| e.to_string())?;',
      '    Ok(rows)',
      '}',
      '',
      '#[tauri::command]',
      "pub fn vault_tag_asset(vault: tauri::State<'_, VaultPool>, asset_id: String, tag_name: String) -> Result<(), String> {",
      '    let conn = vault.lock().map_err(|e| e.to_string())?;',
      '    let tag_id = uuid::Uuid::new_v4().to_string();',
      '    conn.execute(',
      '        "INSERT OR IGNORE INTO vault_tags (id, name) VALUES (?, ?)",',
      '        rusqlite::params![tag_id, tag_name],',
      '    ).map_err(|e| e.to_string())?;',
      '    let actual_tag_id: String = conn.query_row(',
      '        "SELECT id FROM vault_tags WHERE name = ?", [&tag_name], |r| r.get(0)',
      '    ).map_err(|e| e.to_string())?;',
      '    conn.execute(',
      '        "INSERT OR IGNORE INTO vault_asset_tags (asset_id, tag_id) VALUES (?, ?)",',
      '        rusqlite::params![asset_id, actual_tag_id],',
      '    ).map_err(|e| e.to_string())?;',
      '    Ok(())',
      '}',
      '',
    );
  }

  if (vault.provenance) {
    lines.push(
      '// ── Provenance commands ───────────────────────────────────────────────────────',
      '',
      '#[derive(Debug, Clone, Serialize, Deserialize)]',
      '#[serde(rename_all = "camelCase")]',
      'pub struct ProvenanceRecord {',
      '    pub id: String,',
      '    pub asset_id: String,',
      '    pub action: String,',
      '    pub source: Option<String>,',
      '    pub actor: Option<String>,',
      '    pub timestamp: String,',
      '}',
      '',
      '#[tauri::command]',
      "pub fn vault_record_provenance(vault: tauri::State<'_, VaultPool>, asset_id: String, action: String, source: Option<String>, actor: Option<String>) -> Result<(), String> {",
      '    let conn = vault.lock().map_err(|e| e.to_string())?;',
      '    let id = uuid::Uuid::new_v4().to_string();',
      '    let now = chrono::Utc::now().to_rfc3339();',
      '    conn.execute(',
      '        "INSERT INTO vault_provenance (id, asset_id, action, source, actor, timestamp) VALUES (?, ?, ?, ?, ?, ?)",',
      '        rusqlite::params![id, asset_id, action, source, actor, now],',
      '    ).map_err(|e| e.to_string())?;',
      '    Ok(())',
      '}',
      '',
      '#[tauri::command]',
      "pub fn vault_get_provenance(vault: tauri::State<'_, VaultPool>, asset_id: String) -> Result<Vec<ProvenanceRecord>, String> {",
      '    let conn = vault.lock().map_err(|e| e.to_string())?;',
      '    let mut stmt = conn.prepare(',
      '        "SELECT id, asset_id, action, source, actor, timestamp FROM vault_provenance WHERE asset_id = ? ORDER BY timestamp DESC"',
      '    ).map_err(|e| e.to_string())?;',
      '    let rows = stmt.query_map([&asset_id], |row| Ok(ProvenanceRecord {',
      '        id: row.get(0)?, asset_id: row.get(1)?, action: row.get(2)?,',
      '        source: row.get(3)?, actor: row.get(4)?, timestamp: row.get(5)?,',
      '    }))',
      '        .map_err(|e| e.to_string())?',
      '        .collect::<Result<Vec<_>, _>>()',
      '        .map_err(|e| e.to_string())?;',
      '    Ok(rows)',
      '}',
      '',
    );
  }

  return lines.join('\n');
}

// ── Public API ────────────────────────────────────────────────────────────────

export function generateVault(ast: AgiFile): Map<string, string> {
  const files = new Map<string, string>();
  if (!ast.vault) return files;

  files.set('src-tauri/src/vault.rs', vaultRs(ast.vault));
  files.set('src-tauri/vault_schema.sql', vaultSchema(ast.vault));
  return files;
}

export function vaultCommandNames(ast: AgiFile): string[] {
  if (!ast.vault) return [];
  const cmds = [
    'vault::vault_list_assets',
    'vault::vault_get_asset',
    'vault::vault_save_asset',
    'vault::vault_update_asset',
    'vault::vault_delete_asset',
    'vault::vault_search_assets',
  ];
  if (ast.vault.tags) {
    cmds.push('vault::vault_list_tags', 'vault::vault_tag_asset');
  }
  if (ast.vault.provenance) {
    cmds.push('vault::vault_record_provenance', 'vault::vault_get_provenance');
  }
  return cmds;
}

/** The vault path string from the DSL (for embedding in main.rs setup). */
export function vaultPath(ast: AgiFile): string {
  return ast.vault?.path ?? '';
}
