// IDENTITY runtime — creator-owned identity with deterministic signing
// Uses UUID v5 (SHA-1 based) for portable, key-bound signatures.
// For production: swap sign/verify for ed25519-dalek.

use serde::{Deserialize, Serialize};
use tauri::State;
use crate::db::DbPool;

// ─── Static IDENTITY registry ─────────────────────────────────────────────────

struct IdentityDef {
    name: &'static str,
    description: &'static str,
    signing_key_type: &'static str,
    domains: &'static [&'static str],
    discoverable: bool,
    portable: bool,
}

const IDENTITIES: &[IdentityDef] = &[
    IdentityDef {
        name: "novasyn_user",
        description: "Your local NovaSyn Chat identity — signs insights and published feeds",
        signing_key_type: "ed25519",
        domains: &["knowledge_management", "ai_chat", "personal_productivity"],
        discoverable: true,
        portable: true,
    },
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

// ─── Signing engine ───────────────────────────────────────────────────────────

// UUID v5 is SHA-1(namespace_uuid + name) → deterministic, payload-bound.
// The identity's key_id is the namespace; the payload is the name.
// Same key + same payload → same signature. Different payload → different signature.
fn sign_with_key(key_id: &str, payload: &str) -> String {
    let namespace = uuid::Uuid::parse_str(key_id).unwrap_or_else(|_| uuid::Uuid::nil());
    let sig = uuid::Uuid::new_v5(&namespace, payload.as_bytes());
    format!("v1:{}", sig.simple())
}

fn verify_with_key(key_id: &str, payload: &str, signature: &str) -> bool {
    let expected = sign_with_key(key_id, payload);
    expected == signature
}

fn make_did(name: &str, key_id: &str) -> String {
    let fingerprint = &key_id.replace('-', "")[..16];
    format!("did:agicore:{}:{}", name, fingerprint)
}

// ─── DB helpers ───────────────────────────────────────────────────────────────

fn ensure_identity(db: &DbPool, def: &IdentityDef) -> Result<IdentityInfo, String> {
    let conn = db.lock().map_err(|e| e.to_string())?;

    // Try to load existing identity
    if let Ok(row) = conn.query_row(
        "SELECT id, did, signing_key_id, profile, discoverable, created_at FROM identity_profiles WHERE identity_name = ?",
        [def.name],
        |row| Ok((
            row.get::<_, String>(0)?,
            row.get::<_, String>(1)?,
            row.get::<_, String>(2)?,
            row.get::<_, String>(3)?,
            row.get::<_, i64>(4)?,
            row.get::<_, String>(5)?,
        ))
    ) {
        let profile: serde_json::Value = serde_json::from_str(&row.3).unwrap_or(serde_json::json!({}));
        return Ok(IdentityInfo {
            name: def.name.to_string(),
            description: def.description.to_string(),
            did: row.1,
            signing_key_type: def.signing_key_type.to_string(),
            domains: def.domains.iter().map(|s| s.to_string()).collect(),
            discoverable: row.4 != 0,
            portable: def.portable,
            profile,
            created_at: row.5,
        });
    }

    // Generate fresh identity
    let id = uuid::Uuid::new_v4().to_string();
    let key_id = uuid::Uuid::new_v4().to_string();
    let did = make_did(def.name, &key_id);
    let now = chrono::Utc::now().to_rfc3339();
    let discoverable = if def.discoverable { 1i64 } else { 0i64 };

    conn.execute(
        "INSERT INTO identity_profiles (id, identity_name, did, signing_key_id, profile, discoverable, created_at, updated_at) VALUES (?, ?, ?, ?, '{}', ?, ?, ?)",
        rusqlite::params![id, def.name, did, key_id, discoverable, now, now],
    ).map_err(|e| e.to_string())?;

    eprintln!("[Identity] Generated {} → {}", def.name, did);

    Ok(IdentityInfo {
        name: def.name.to_string(),
        description: def.description.to_string(),
        did,
        signing_key_type: def.signing_key_type.to_string(),
        domains: def.domains.iter().map(|s| s.to_string()).collect(),
        discoverable: def.discoverable,
        portable: def.portable,
        profile: serde_json::json!({}),
        created_at: now,
    })
}

fn get_key_id(db: &DbPool, name: &str) -> Result<String, String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    conn.query_row(
        "SELECT signing_key_id FROM identity_profiles WHERE identity_name = ?",
        [name],
        |row| row.get::<_, String>(0),
    ).map_err(|e| format!("Identity '{}' not found: {}", name, e))
}

// ─── Bootstrap ────────────────────────────────────────────────────────────────

/// Called at startup to ensure all declared identities are initialized.
pub fn bootstrap_identities(db: &DbPool) {
    for def in IDENTITIES {
        if let Err(e) = ensure_identity(db, def) {
            eprintln!("[Identity] Bootstrap failed for {}: {}", def.name, e);
        }
    }
}

// ─── Tauri commands ───────────────────────────────────────────────────────────

#[tauri::command]
pub fn list_identities(db: State<'_, DbPool>) -> Result<Vec<IdentityInfo>, String> {
    let mut result = Vec::new();
    for def in IDENTITIES {
        match ensure_identity(&db, def) {
            Ok(info) => result.push(info),
            Err(e) => eprintln!("[Identity] list_identities error for {}: {}", def.name, e),
        }
    }
    Ok(result)
}

#[tauri::command]
pub fn get_identity(name: String, db: State<'_, DbPool>) -> Result<IdentityInfo, String> {
    let def = IDENTITIES.iter().find(|d| d.name == name.as_str())
        .ok_or_else(|| format!("Unknown identity: {}", name))?;
    ensure_identity(&db, def)
}

#[tauri::command]
pub fn update_identity_profile(
    name: String,
    profile: serde_json::Value,
    db: State<'_, DbPool>,
) -> Result<IdentityInfo, String> {
    let profile_str = serde_json::to_string(&profile).map_err(|e| e.to_string())?;
    {
        let conn = db.lock().map_err(|e| e.to_string())?;
        let now = chrono::Utc::now().to_rfc3339();
        conn.execute(
            "UPDATE identity_profiles SET profile = ?, updated_at = ? WHERE identity_name = ?",
            rusqlite::params![profile_str, now, name],
        ).map_err(|e| e.to_string())?;
    }
    get_identity(name, db)
}

#[tauri::command]
pub fn sign_payload(
    identity_name: String,
    payload: String,
    db: State<'_, DbPool>,
) -> Result<SignedPayload, String> {
    let key_id = get_key_id(&db, &identity_name)?;
    let did = {
        let conn = db.lock().map_err(|e| e.to_string())?;
        conn.query_row(
            "SELECT did FROM identity_profiles WHERE identity_name = ?",
            [&identity_name],
            |row| row.get::<_, String>(0),
        ).map_err(|e| e.to_string())?
    };
    let signed_at = chrono::Utc::now().to_rfc3339();
    let signature = sign_with_key(&key_id, &format!("{}{}", payload, signed_at));
    Ok(SignedPayload { payload, signature, did, signed_at })
}

#[tauri::command]
pub fn verify_signature(
    identity_name: String,
    payload: String,
    signature: String,
    signed_at: String,
    db: State<'_, DbPool>,
) -> Result<bool, String> {
    let key_id = get_key_id(&db, &identity_name)?;
    Ok(verify_with_key(&key_id, &format!("{}{}", payload, signed_at), &signature))
}

// ─── Public helpers used by feed.rs ──────────────────────────────────────────

pub fn get_identity_did(db: &DbPool, name: &str) -> Option<String> {
    let conn = db.lock().ok()?;
    conn.query_row(
        "SELECT did FROM identity_profiles WHERE identity_name = ?",
        [name], |row| row.get::<_, String>(0)
    ).ok()
}

pub fn sign_content(db: &DbPool, name: &str, content: &str) -> Option<String> {
    let conn = db.lock().ok()?;
    let key_id = conn.query_row(
        "SELECT signing_key_id FROM identity_profiles WHERE identity_name = ?",
        [name], |row| row.get::<_, String>(0)
    ).ok()?;
    Some(sign_with_key(&key_id, content))
}
