// AUTHORITY codegen — emits Rust trust governance engine

import type { AgiFile, AuthorityDecl } from '@agicore/parser';

export function generateAuthority(ast: AgiFile): Map<string, string> {
  const files = new Map<string, string>();
  if (ast.authorities.length === 0) return files;

  files.set('src-tauri/src/commands/authority.rs', buildAuthorityRs(ast.authorities));
  files.set('migrations/authority.sql', buildMigrationSql());

  return files;
}

// ─── Rust runtime ─────────────────────────────────────────────────────────────

function buildAuthorityRs(authorities: AuthorityDecl[]): string {
  const authorityDefs = authorities.map(a => {
    const levels = a.levels.map(l =>
      `        AuthorityLevel { name: "${l.name}", description: "${l.description.replace(/"/g, '\\"')}" },`
    ).join('\n');
    const admissibility = a.admissibility.map(r =>
      `        AuthorityAdmissibility { rule: "${r.name}", condition: "${r.condition.replace(/"/g, '\\"')}" },`
    ).join('\n');
    return `    AuthorityDef {
        name: "${a.name}",
        description: "${a.description.replace(/"/g, '\\"')}",
        levels: &[
${levels}
        ],
        signing_required: ${a.signing.required},
        signing_algorithm: "${a.signing.algorithm}",
        verify_chain: ${a.signing.verifyChain},
        admissibility: &[
${admissibility}
        ],
    },`;
  }).join('\n');

  return `// AUTHORITY runtime — trust governance levels and admissibility verification
// @agicore-generated — DO NOT EDIT (regenerate via: agicore compile)

use serde::{Deserialize, Serialize};
use tauri::State;
use crate::db::DbPool;

// ─── Authority registry ───────────────────────────────────────────────────────

struct AuthorityLevel {
    name: &'static str,
    description: &'static str,
}

struct AuthorityAdmissibility {
    rule: &'static str,
    condition: &'static str,
}

struct AuthorityDef {
    name: &'static str,
    description: &'static str,
    levels: &'static [AuthorityLevel],
    signing_required: bool,
    signing_algorithm: &'static str,
    verify_chain: bool,
    admissibility: &'static [AuthorityAdmissibility],
}

const AUTHORITIES: &[AuthorityDef] = &[
${authorityDefs}
];

// ─── Admissibility evaluator ──────────────────────────────────────────────────

fn check_admissibility_condition(condition: &str, payload: &serde_json::Value) -> bool {
    let parts: Vec<&str> = condition.split_whitespace().collect();
    match parts.as_slice() {
        [field, "IS", "NOT", "NULL"] => !payload.get(*field).map(|v| v.is_null()).unwrap_or(true),
        [field, "IS", "NULL"]        =>  payload.get(*field).map(|v| v.is_null()).unwrap_or(true),
        [field, "<", val] => payload.get(*field).and_then(|v| v.as_f64()).zip(val.parse::<f64>().ok()).map(|(a, b)| a < b).unwrap_or(false),
        [field, ">", val] => payload.get(*field).and_then(|v| v.as_f64()).zip(val.parse::<f64>().ok()).map(|(a, b)| a > b).unwrap_or(false),
        _ => true,
    }
}

// ─── Types ────────────────────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AuthorityLevelInfo {
    pub name: String,
    pub description: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AuthorityAdmissibilityInfo {
    pub rule: String,
    pub condition: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AuthorityInfo {
    pub name: String,
    pub description: String,
    pub levels: Vec<AuthorityLevelInfo>,
    pub signing_required: bool,
    pub signing_algorithm: String,
    pub verify_chain: bool,
    pub admissibility: Vec<AuthorityAdmissibilityInfo>,
    pub active_claims: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TrustClaim {
    pub id: String,
    pub authority_name: String,
    pub level: String,
    pub subject: String,
    pub signature: Option<String>,
    pub issued_at: String,
    pub expires_at: Option<String>,
    pub revoked: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AdmissibilityResult {
    pub authority: String,
    pub passed: bool,
    pub failed_rules: Vec<String>,
}

// ─── Tauri commands ───────────────────────────────────────────────────────────

#[tauri::command]
pub fn list_authorities(db: State<'_, DbPool>) -> Result<Vec<AuthorityInfo>, String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    AUTHORITIES.iter().map(|def| {
        let active_claims: i64 = conn.query_row(
            "SELECT COUNT(*) FROM trust_claims WHERE authority_name = ? AND revoked = 0",
            [def.name], |row| row.get(0),
        ).unwrap_or(0);
        Ok(AuthorityInfo {
            name: def.name.to_string(),
            description: def.description.to_string(),
            levels: def.levels.iter().map(|l| AuthorityLevelInfo { name: l.name.to_string(), description: l.description.to_string() }).collect(),
            signing_required: def.signing_required,
            signing_algorithm: def.signing_algorithm.to_string(),
            verify_chain: def.verify_chain,
            admissibility: def.admissibility.iter().map(|a| AuthorityAdmissibilityInfo { rule: a.rule.to_string(), condition: a.condition.to_string() }).collect(),
            active_claims,
        })
    }).collect()
}

#[tauri::command]
pub fn issue_trust_claim(
    authority_name: String,
    level: String,
    subject: String,
    expires_at: Option<String>,
    db: State<'_, DbPool>,
) -> Result<TrustClaim, String> {
    let def = AUTHORITIES.iter().find(|a| a.name == authority_name.as_str())
        .ok_or_else(|| format!("Unknown authority: {}", authority_name))?;
    if !def.levels.iter().any(|l| l.name == level.as_str()) {
        return Err(format!("Unknown level '{}' for authority '{}'", level, authority_name));
    }
    let conn = db.lock().map_err(|e| e.to_string())?;
    let id = uuid::Uuid::new_v4().to_string();
    let now = chrono::Utc::now().to_rfc3339();
    conn.execute(
        "INSERT INTO trust_claims (id, authority_name, level, subject, signature, issued_at, expires_at, revoked, created_at) VALUES (?, ?, ?, ?, NULL, ?, ?, 0, ?)",
        rusqlite::params![id, authority_name, level, subject, now, expires_at, now],
    ).map_err(|e| e.to_string())?;
    Ok(TrustClaim { id, authority_name, level, subject, signature: None, issued_at: now, expires_at, revoked: false })
}

#[tauri::command]
pub fn list_trust_claims(authority_name: Option<String>, db: State<'_, DbPool>) -> Result<Vec<TrustClaim>, String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    let rows = if let Some(name) = authority_name {
        let mut stmt = conn.prepare(
            "SELECT id, authority_name, level, subject, signature, issued_at, expires_at, revoked FROM trust_claims WHERE authority_name = ? ORDER BY issued_at DESC"
        ).map_err(|e| e.to_string())?;
        let v = stmt.query_map([name], |row| Ok(TrustClaim {
            id: row.get(0)?, authority_name: row.get(1)?, level: row.get(2)?,
            subject: row.get(3)?, signature: row.get(4)?, issued_at: row.get(5)?,
            expires_at: row.get(6)?, revoked: row.get::<_, i64>(7)? != 0,
        })).map_err(|e| e.to_string())?.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())?;
        v
    } else {
        let mut stmt = conn.prepare(
            "SELECT id, authority_name, level, subject, signature, issued_at, expires_at, revoked FROM trust_claims ORDER BY issued_at DESC LIMIT 100"
        ).map_err(|e| e.to_string())?;
        let v = stmt.query_map([], |row| Ok(TrustClaim {
            id: row.get(0)?, authority_name: row.get(1)?, level: row.get(2)?,
            subject: row.get(3)?, signature: row.get(4)?, issued_at: row.get(5)?,
            expires_at: row.get(6)?, revoked: row.get::<_, i64>(7)? != 0,
        })).map_err(|e| e.to_string())?.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())?;
        v
    };
    Ok(rows)
}

#[tauri::command]
pub fn revoke_trust_claim(claim_id: String, db: State<'_, DbPool>) -> Result<(), String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    conn.execute("UPDATE trust_claims SET revoked = 1 WHERE id = ?", [&claim_id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn check_admissibility(
    authority_name: String,
    payload: serde_json::Value,
    _db: State<'_, DbPool>,
) -> Result<AdmissibilityResult, String> {
    let def = AUTHORITIES.iter().find(|a| a.name == authority_name.as_str())
        .ok_or_else(|| format!("Unknown authority: {}", authority_name))?;
    let failed_rules: Vec<String> = def.admissibility.iter()
        .filter(|r| !check_admissibility_condition(r.condition, &payload))
        .map(|r| r.rule.to_string())
        .collect();
    Ok(AdmissibilityResult { authority: authority_name, passed: failed_rules.is_empty(), failed_rules })
}
`;
}

// ─── Migration ────────────────────────────────────────────────────────────────

function buildMigrationSql(): string {
  return `-- AUTHORITY: trust governance claims
CREATE TABLE IF NOT EXISTS trust_claims (
  id TEXT PRIMARY KEY,
  authority_name TEXT NOT NULL,
  level TEXT NOT NULL,
  subject TEXT NOT NULL,
  signature TEXT,
  issued_at TEXT NOT NULL,
  expires_at TEXT,
  revoked INTEGER NOT NULL DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_trust_claims_authority ON trust_claims(authority_name, revoked);
CREATE INDEX IF NOT EXISTS idx_trust_claims_subject ON trust_claims(subject, authority_name);
`;
}
