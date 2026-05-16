// IDENTITY codegen — emits Rust runtime, migration, and React UI stub

import type { AgiFile, IdentityDecl } from '@agicore/parser';

export function generateIdentity(ast: AgiFile): Map<string, string> {
  const files = new Map<string, string>();
  if (ast.identities.length === 0) return files;

  files.set('src-tauri/src/commands/identity.rs', buildIdentityRs(ast.identities));
  files.set('migrations/identity.sql', buildMigrationSql());
  files.set('src/components/IdentityView.tsx', buildIdentityViewStub(ast.identities));

  return files;
}

// ─── Rust runtime ─────────────────────────────────────────────────────────────

function buildIdentityRs(identities: IdentityDecl[]): string {
  const identityDefs = identities.map(id => {
    const domains = id.domains.map(d => `"${d}"`).join(', ');
    return `    IdentityDef {
        name: "${id.name}",
        description: "${id.description.replace(/"/g, '\\"')}",
        signing_key_type: "${id.signingKey ?? 'ed25519'}",
        domains: &[${domains}],
        discoverable: ${id.discoverable},
        portable: ${id.portable},
    },`;
  }).join('\n');

  return `// IDENTITY runtime — creator-owned identity with deterministic signing
// @agicore-generated — DO NOT EDIT (regenerate via: agicore compile)

use serde::{Deserialize, Serialize};
use tauri::State;
use crate::db::DbPool;

// ─── Registry ────────────────────────────────────────────────────────────────

struct IdentityDef {
    name: &'static str,
    description: &'static str,
    signing_key_type: &'static str,
    domains: &'static [&'static str],
    discoverable: bool,
    portable: bool,
}

const IDENTITIES: &[IdentityDef] = &[
${identityDefs}
];

// ─── Types ────────────────────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct IdentityInfo {
    pub name: String,
    pub description: String,
    pub did: String,
    pub signing_key_type: String,
    pub domains: Vec<String>,
    pub discoverable: bool,
    pub portable: bool,
    pub profile: serde_json::Value,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SignedPayload {
    pub payload: String,
    pub signature: String,
    pub did: String,
    pub signed_at: String,
}

// ─── Signing (UUID v5 = deterministic SHA-1 keyed) ────────────────────────────

fn sign_with_key(key_id: &str, payload: &str) -> String {
    let namespace = uuid::Uuid::parse_str(key_id).unwrap_or_else(|_| uuid::Uuid::nil());
    let sig = uuid::Uuid::new_v5(&namespace, payload.as_bytes());
    format!("v1:{}", sig.simple())
}

fn verify_with_key(key_id: &str, payload: &str, signature: &str) -> bool {
    sign_with_key(key_id, payload) == signature
}

fn make_did(name: &str, key_id: &str) -> String {
    let fingerprint = &key_id.replace('-', "")[..16];
    format!("did:agicore:{}:{}", name, fingerprint)
}

// ─── DB helpers ───────────────────────────────────────────────────────────────

fn ensure_identity(db: &DbPool, def: &IdentityDef) -> Result<IdentityInfo, String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    if let Ok(row) = conn.query_row(
        "SELECT id, did, signing_key_id, profile, discoverable, created_at FROM identity_profiles WHERE identity_name = ?",
        [def.name],
        |row| Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?, row.get::<_, String>(2)?, row.get::<_, String>(3)?, row.get::<_, i64>(4)?, row.get::<_, String>(5)?))
    ) {
        let profile = serde_json::from_str(&row.3).unwrap_or(serde_json::json!({}));
        return Ok(IdentityInfo { name: def.name.to_string(), description: def.description.to_string(), did: row.1,
            signing_key_type: def.signing_key_type.to_string(), domains: def.domains.iter().map(|s| s.to_string()).collect(),
            discoverable: row.4 != 0, portable: def.portable, profile, created_at: row.5 });
    }
    let id = uuid::Uuid::new_v4().to_string();
    let key_id = uuid::Uuid::new_v4().to_string();
    let did = make_did(def.name, &key_id);
    let now = chrono::Utc::now().to_rfc3339();
    conn.execute(
        "INSERT INTO identity_profiles (id, identity_name, did, signing_key_id, profile, discoverable, created_at, updated_at) VALUES (?, ?, ?, ?, '{}', ?, ?, ?)",
        rusqlite::params![id, def.name, did, key_id, if def.discoverable { 1i64 } else { 0i64 }, now, now],
    ).map_err(|e| e.to_string())?;
    eprintln!("[Identity] Generated {} → {}", def.name, did);
    Ok(IdentityInfo { name: def.name.to_string(), description: def.description.to_string(), did,
        signing_key_type: def.signing_key_type.to_string(), domains: def.domains.iter().map(|s| s.to_string()).collect(),
        discoverable: def.discoverable, portable: def.portable, profile: serde_json::json!({}), created_at: now })
}

fn get_key_id(db: &DbPool, name: &str) -> Result<String, String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    conn.query_row("SELECT signing_key_id FROM identity_profiles WHERE identity_name = ?", [name], |row| row.get::<_, String>(0))
        .map_err(|e| format!("Identity '{}' not found: {}", name, e))
}

pub fn bootstrap_identities(db: &DbPool) {
    for def in IDENTITIES { if let Err(e) = ensure_identity(db, def) { eprintln!("[Identity] Bootstrap error for {}: {}", def.name, e); } }
}

pub fn get_identity_did(db: &DbPool, name: &str) -> Option<String> {
    let conn = db.lock().ok()?;
    conn.query_row("SELECT did FROM identity_profiles WHERE identity_name = ?", [name], |row| row.get::<_, String>(0)).ok()
}

pub fn sign_content(db: &DbPool, name: &str, content: &str) -> Option<String> {
    let conn = db.lock().ok()?;
    let key_id = conn.query_row("SELECT signing_key_id FROM identity_profiles WHERE identity_name = ?", [name], |row| row.get::<_, String>(0)).ok()?;
    Some(sign_with_key(&key_id, content))
}

// ─── Tauri commands ───────────────────────────────────────────────────────────

#[tauri::command]
pub fn list_identities(db: State<'_, DbPool>) -> Result<Vec<IdentityInfo>, String> {
    IDENTITIES.iter().map(|def| ensure_identity(&db, def)).collect()
}

#[tauri::command]
pub fn get_identity(name: String, db: State<'_, DbPool>) -> Result<IdentityInfo, String> {
    let def = IDENTITIES.iter().find(|d| d.name == name.as_str()).ok_or_else(|| format!("Unknown identity: {}", name))?;
    ensure_identity(&db, def)
}

#[tauri::command]
pub fn update_identity_profile(name: String, profile: serde_json::Value, db: State<'_, DbPool>) -> Result<IdentityInfo, String> {
    let profile_str = serde_json::to_string(&profile).map_err(|e| e.to_string())?;
    { let conn = db.lock().map_err(|e| e.to_string())?; let now = chrono::Utc::now().to_rfc3339();
      conn.execute("UPDATE identity_profiles SET profile = ?, updated_at = ? WHERE identity_name = ?", rusqlite::params![profile_str, now, name]).map_err(|e| e.to_string())?; }
    get_identity(name, db)
}

#[tauri::command]
pub fn sign_payload(identity_name: String, payload: String, db: State<'_, DbPool>) -> Result<SignedPayload, String> {
    let key_id = get_key_id(&db, &identity_name)?;
    let did = { let conn = db.lock().map_err(|e| e.to_string())?;
        conn.query_row("SELECT did FROM identity_profiles WHERE identity_name = ?", [&identity_name], |row| row.get::<_, String>(0)).map_err(|e| e.to_string())? };
    let signed_at = chrono::Utc::now().to_rfc3339();
    let signature = sign_with_key(&key_id, &format!("{}{}", payload, signed_at));
    Ok(SignedPayload { payload, signature, did, signed_at })
}

#[tauri::command]
pub fn verify_signature(identity_name: String, payload: String, signature: String, signed_at: String, db: State<'_, DbPool>) -> Result<bool, String> {
    let key_id = get_key_id(&db, &identity_name)?;
    Ok(verify_with_key(&key_id, &format!("{}{}", payload, signed_at), &signature))
}
`;
}

// ─── Migration ────────────────────────────────────────────────────────────────

function buildMigrationSql(): string {
  return `-- IDENTITY: creator-owned identity profiles
CREATE TABLE IF NOT EXISTS identity_profiles (
  id TEXT PRIMARY KEY,
  identity_name TEXT NOT NULL UNIQUE,
  did TEXT NOT NULL UNIQUE,
  signing_key_id TEXT NOT NULL,
  profile TEXT NOT NULL DEFAULT '{}',
  discoverable INTEGER NOT NULL DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);
`;
}

// ─── React UI stub ────────────────────────────────────────────────────────────

function buildIdentityViewStub(identities: IdentityDecl[]): string {
  const names = identities.map(i => `'${i.name}'`).join(', ');
  return `// @agicore-protected — Identity + Feed UI
// Generated by Agicore — customize freely.
import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Fingerprint, RefreshCw } from 'lucide-react';

// Identities declared in .agi source: ${names}

export function IdentityView() {
  const [identities, setIdentities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    setLoading(true);
    try { setIdentities(await invoke('list_identities')); } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { refresh(); }, []);

  return (
    <div className="flex flex-col h-full p-6">
      <div className="flex items-center gap-3 mb-6">
        <Fingerprint size={20} className="text-violet-400" />
        <h1 className="text-lg font-semibold">Identity</h1>
        <button onClick={refresh} className="ml-auto p-1.5 hover:bg-gray-700 rounded"><RefreshCw size={16} /></button>
      </div>
      {loading ? <div className="text-gray-500 text-sm">Loading…</div> : (
        <div className="space-y-4">
          {identities.map((id: any) => (
            <div key={id.name} className="p-4 border border-gray-700 rounded-lg">
              <div className="font-medium">{id.name}</div>
              <div className="text-sm text-gray-400">{id.description}</div>
              <div className="text-xs font-mono text-violet-400 mt-1">{id.did}</div>
              <div className="text-xs text-gray-500 mt-1">{id.domains.join(', ')}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
`;
}
