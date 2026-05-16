// AUTHORITY runtime — trust governance levels and admissibility verification

use serde::{Deserialize, Serialize};
use tauri::State;
use crate::db::DbPool;

// ─── Static AUTHORITY registry ────────────────────────────────────────────────

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
    AuthorityDef {
        name: "novasyn_trust",
        description: "Local-first NovaSyn trust authority for identity-signed content",
        levels: &[
            AuthorityLevel { name: "owner", description: "Device owner — full authority" },
            AuthorityLevel { name: "contributor", description: "Trusted collaborator" },
            AuthorityLevel { name: "public", description: "Anyone — read access only" },
        ],
        signing_required: false,
        signing_algorithm: "ed25519",
        verify_chain: false,
        admissibility: &[
            AuthorityAdmissibility { rule: "not_expired", condition: "packet_age < ttl" },
        ],
    },
];

// ─── Admissibility evaluator ──────────────────────────────────────────────────

// Evaluates simple admissibility conditions against a JSON payload
fn check_admissibility_condition(condition: &str, payload: &serde_json::Value) -> bool {
    let parts: Vec<&str> = condition.split_whitespace().collect();
    match parts.as_slice() {
        // "field IS NOT NULL"
        [field, "IS", "NOT", "NULL"] => {
            !payload.get(*field).map(|v| v.is_null()).unwrap_or(true)
        }
        // "field IS NULL"
        [field, "IS", "NULL"] => {
            payload.get(*field).map(|v| v.is_null()).unwrap_or(true)
        }
        // "field < number"
        [field, "<", val] => {
            let actual = payload.get(*field).and_then(|v| v.as_f64()).unwrap_or(f64::MAX);
            val.parse::<f64>().map(|v| actual < v).unwrap_or(false)
        }
        // "field > number"
        [field, ">", val] => {
            let actual = payload.get(*field).and_then(|v| v.as_f64()).unwrap_or(0.0);
            val.parse::<f64>().map(|v| actual > v).unwrap_or(false)
        }
        _ => true, // unknown conditions pass by default
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
            levels: def.levels.iter().map(|l| AuthorityLevelInfo {
                name: l.name.to_string(),
                description: l.description.to_string(),
            }).collect(),
            signing_required: def.signing_required,
            signing_algorithm: def.signing_algorithm.to_string(),
            verify_chain: def.verify_chain,
            admissibility: def.admissibility.iter().map(|a| AuthorityAdmissibilityInfo {
                rule: a.rule.to_string(),
                condition: a.condition.to_string(),
            }).collect(),
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
    // Validate level exists
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
    eprintln!("[Authority] Issued {} claim '{}' to '{}'", authority_name, level, subject);
    Ok(TrustClaim { id, authority_name, level, subject, signature: None, issued_at: now, expires_at, revoked: false })
}

#[tauri::command]
pub fn list_trust_claims(
    authority_name: Option<String>,
    db: State<'_, DbPool>,
) -> Result<Vec<TrustClaim>, String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    let rows = if let Some(name) = authority_name {
        let mut stmt = conn.prepare(
            "SELECT id, authority_name, level, subject, signature, issued_at, expires_at, revoked FROM trust_claims WHERE authority_name = ? ORDER BY issued_at DESC"
        ).map_err(|e| e.to_string())?;
        let v = stmt.query_map([name], |row| Ok(TrustClaim {
            id: row.get(0)?, authority_name: row.get(1)?, level: row.get(2)?,
            subject: row.get(3)?, signature: row.get(4)?, issued_at: row.get(5)?,
            expires_at: row.get(6)?, revoked: row.get::<_, i64>(7)? != 0,
        })).map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())?;
        v
    } else {
        let mut stmt = conn.prepare(
            "SELECT id, authority_name, level, subject, signature, issued_at, expires_at, revoked FROM trust_claims ORDER BY issued_at DESC LIMIT 100"
        ).map_err(|e| e.to_string())?;
        let v = stmt.query_map([], |row| Ok(TrustClaim {
            id: row.get(0)?, authority_name: row.get(1)?, level: row.get(2)?,
            subject: row.get(3)?, signature: row.get(4)?, issued_at: row.get(5)?,
            expires_at: row.get(6)?, revoked: row.get::<_, i64>(7)? != 0,
        })).map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())?;
        v
    };
    Ok(rows)
}

#[tauri::command]
pub fn revoke_trust_claim(claim_id: String, db: State<'_, DbPool>) -> Result<(), String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    conn.execute("UPDATE trust_claims SET revoked = 1 WHERE id = ?", [&claim_id])
        .map_err(|e| e.to_string())?;
    eprintln!("[Authority] Revoked claim: {}", claim_id);
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
    let mut failed_rules = Vec::new();
    for rule in def.admissibility {
        if !check_admissibility_condition(rule.condition, &payload) {
            failed_rules.push(rule.rule.to_string());
        }
    }
    Ok(AdmissibilityResult {
        authority: authority_name,
        passed: failed_rules.is_empty(),
        failed_rules,
    })
}
