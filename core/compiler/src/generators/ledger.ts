// Mutation Ledger Generator
//
// Phase 11.7 of the Andon Loop architecture (see Idea Factory/andon_loop_architecture.md).
//
// Tamper-evident, append-only audit log for every proposal state transition.
// Each entry hash-chains to the previous one — if any row is rewritten
// after the fact, verify_ledger_integrity catches it because the recorded
// self_hash won't match what the recomputation produces.
//
// Hooked at every transition point in the proposal lifecycle:
//   create_proposal_in_db         → "PROPOSED"
//   verify_and_persist            → "TIER_VERIFIED" | "TIER_REJECTED"
//   execute_sandbox               → "TESTED" + ("DEPLOYED" | "ESCALATED" | "REJECTED_BY_SANDBOX")
//   approve_proposal              → "APPROVED"
//   reject_proposal               → "REJECTED_BY_AUTHORITY"
//
// The LEDGER name from the MUTATION_POLICY declaration becomes the ledger_name
// column on each entry — multiple ledgers can coexist in one physical table,
// distinguished by policy LEDGER declaration. Policies without LEDGER get
// "default" as the ledger name.
//
// Gated on the same condition as the mutations runtime (≥1 MUTATION_POLICY).

import type { AgiFile } from '@agicore/parser';

function isEnabled(ast: AgiFile): boolean {
  return !!ast.mutationPolicies && ast.mutationPolicies.length > 0;
}

export function generateLedger(ast: AgiFile): Map<string, string> {
  const files = new Map<string, string>();
  if (!isEnabled(ast)) return files;
  files.set('src-tauri/src/commands/ledger.rs', buildLedgerRs());
  files.set('src/lib/ledger.ts', buildLedgerTs());
  return files;
}

export function ledgerCommandNames(ast: AgiFile): string[] {
  if (!isEnabled(ast)) return [];
  return [
    'list_ledger_entries',
    'get_ledger_entries_for_proposal',
    'verify_ledger_integrity',
    'list_ledger_sink_status',   // Phase 11.7b
  ];
}

// ─── Rust runtime ──────────────────────────────────────────────────────────

function buildLedgerRs(): string {
  return `// Agicore Generated — Mutation ledger (Phase 11.7)
// DO NOT EDIT BY HAND. See core/compiler/src/generators/ledger.ts.
//
// Hash-chained, append-only audit log. Every proposal lifecycle transition
// produces one ledger entry, linked to the previous entry by SHA-256.
// Designed for compliance audit + tamper detection.

use crate::db::DbPool;
use rusqlite::params;
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use tauri::State;
use uuid::Uuid;

// ─── Public types ─────────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LedgerEntry {
    pub id: String,
    pub sequence_num: i64,
    pub ledger_name: String,
    pub proposal_id: String,
    pub policy_name: String,
    pub event_type: String,
    pub actor: String,
    pub payload: serde_json::Value,
    pub prev_hash: String,
    pub self_hash: String,
    pub recorded_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct IntegrityReport {
    pub total_entries: i64,
    pub chains_verified: i64,
    pub broken_chain_at_sequence: Option<i64>,
    pub broken_chain_reason: Option<String>,
    pub all_good: bool,
}

// ─── Schema bootstrapping ────────────────────────────────────────────────

pub fn ensure_ledger_table(db: &DbPool) -> Result<(), String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    conn.execute_batch(
        "CREATE TABLE IF NOT EXISTS mutation_ledger (
            id              TEXT PRIMARY KEY,
            sequence_num    INTEGER NOT NULL,
            ledger_name     TEXT NOT NULL DEFAULT 'default',
            proposal_id     TEXT NOT NULL,
            policy_name     TEXT NOT NULL,
            event_type      TEXT NOT NULL,
            actor           TEXT NOT NULL,
            payload         TEXT NOT NULL,
            prev_hash       TEXT NOT NULL,
            self_hash       TEXT NOT NULL,
            recorded_at     TEXT NOT NULL,
            UNIQUE (ledger_name, sequence_num)
         );
         CREATE INDEX IF NOT EXISTS idx_ledger_proposal ON mutation_ledger(proposal_id, sequence_num);
         CREATE INDEX IF NOT EXISTS idx_ledger_policy   ON mutation_ledger(policy_name, recorded_at DESC);
         CREATE INDEX IF NOT EXISTS idx_ledger_event    ON mutation_ledger(event_type, recorded_at DESC);
         CREATE INDEX IF NOT EXISTS idx_ledger_chain    ON mutation_ledger(ledger_name, sequence_num);",
    ).map_err(|e| e.to_string())?;
    Ok(())
}

// ─── Hash chain ──────────────────────────────────────────────────────────

/// Compute the canonical self_hash for an entry. Inputs:
///   prev_hash || ledger_name || sequence_num || proposal_id || policy_name
///   || event_type || actor || payload_json || recorded_at
/// joined by 0x1F (unit separator) so no two distinct inputs can collide via
/// concatenation ambiguity.
pub fn compute_self_hash(
    prev_hash: &str,
    ledger_name: &str,
    sequence_num: i64,
    proposal_id: &str,
    policy_name: &str,
    event_type: &str,
    actor: &str,
    payload: &serde_json::Value,
    recorded_at: &str,
) -> String {
    let sep: char = '\\u{1F}';
    let payload_str = canonical_json(payload);
    let buf = format!(
        "{p}{s}{ln}{s}{n}{s}{pid}{s}{pol}{s}{ev}{s}{ac}{s}{pl}{s}{ts}",
        p   = prev_hash,
        s   = sep,
        ln  = ledger_name,
        n   = sequence_num,
        pid = proposal_id,
        pol = policy_name,
        ev  = event_type,
        ac  = actor,
        pl  = payload_str,
        ts  = recorded_at,
    );
    let mut hasher = Sha256::new();
    hasher.update(buf.as_bytes());
    format!("{:x}", hasher.finalize())
}

/// Deterministic JSON serialisation — sorts object keys so two semantically
/// equivalent payloads always produce the same string (and thus the same hash).
pub fn canonical_json(v: &serde_json::Value) -> String {
    match v {
        serde_json::Value::Object(map) => {
            let mut keys: Vec<&String> = map.keys().collect();
            keys.sort();
            let mut out = String::from("{");
            for (i, k) in keys.iter().enumerate() {
                if i > 0 { out.push(','); }
                out.push_str(&serde_json::to_string(k).unwrap_or_default());
                out.push(':');
                out.push_str(&canonical_json(&map[*k]));
            }
            out.push('}');
            out
        }
        serde_json::Value::Array(arr) => {
            let mut out = String::from("[");
            for (i, item) in arr.iter().enumerate() {
                if i > 0 { out.push(','); }
                out.push_str(&canonical_json(item));
            }
            out.push(']');
            out
        }
        other => serde_json::to_string(other).unwrap_or_default(),
    }
}

// ─── Append helper (the workhorse) ───────────────────────────────────────

/// Append one entry to the ledger. Used by mutations.rs + approvals.rs at
/// every status transition. Returns the entry as written, so callers can
/// surface the sequence number / hash to clients.
///
/// Resolves ledger_name from MUTATION_POLICY.ledger; falls back to "default"
/// when the policy didn't declare a LEDGER.
pub fn append_entry(
    db: &DbPool,
    proposal_id: &str,
    policy_name: &str,
    event_type: &str,
    actor: &str,
    payload: serde_json::Value,
) -> Result<LedgerEntry, String> {
    ensure_ledger_table(db)?;

    // 1) Look up the policy's LEDGER name (defaults to "default").
    let ledger_name: String = {
        let conn = db.lock().map_err(|e| e.to_string())?;
        let s: Option<String> = conn
            .query_row(
                "SELECT ledger FROM mutation_policies WHERE name = ?",
                params![policy_name],
                |r| r.get(0),
            )
            .ok();
        s.unwrap_or_else(|| "default".to_string())
    };

    // 2) Get next sequence_num + prev_hash atomically per ledger.
    //    We grab the latest row's hash + sequence in a single read; if there
    //    are no prior entries, prev_hash is the genesis sentinel.
    let (next_seq, prev_hash) = {
        let conn = db.lock().map_err(|e| e.to_string())?;
        let last: Option<(i64, String)> = conn
            .query_row(
                "SELECT sequence_num, self_hash FROM mutation_ledger WHERE ledger_name = ? ORDER BY sequence_num DESC LIMIT 1",
                params![ledger_name],
                |r| Ok((r.get(0)?, r.get(1)?)),
            )
            .ok();
        match last {
            Some((seq, hash)) => (seq + 1, hash),
            None              => (1, "GENESIS".to_string()),
        }
    };

    // 3) Compose entry + compute self_hash.
    let id          = Uuid::new_v4().to_string();
    let recorded_at = chrono::Utc::now().to_rfc3339();
    let self_hash   = compute_self_hash(
        &prev_hash, &ledger_name, next_seq, proposal_id, policy_name,
        event_type, actor, &payload, &recorded_at,
    );

    // 4) Insert.
    {
        let conn = db.lock().map_err(|e| e.to_string())?;
        conn.execute(
            "INSERT INTO mutation_ledger (id, sequence_num, ledger_name, proposal_id, policy_name, event_type, actor, payload, prev_hash, self_hash, recorded_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            params![
                id, next_seq, ledger_name, proposal_id, policy_name,
                event_type, actor, payload.to_string(),
                prev_hash, self_hash, recorded_at,
            ],
        ).map_err(|e| e.to_string())?;
    }

    let entry = LedgerEntry {
        id, sequence_num: next_seq, ledger_name,
        proposal_id: proposal_id.to_string(),
        policy_name: policy_name.to_string(),
        event_type: event_type.to_string(),
        actor: actor.to_string(),
        payload, prev_hash, self_hash, recorded_at,
    };

    // 5) Phase 11.7b — opportunistic external sink. When the env var
    //    AGICORE_LEDGER_SINK_PATH is set, also append the entry as a
    //    JSON line to <path>/<ledger_name>.jsonl. Failure to write the
    //    sink is logged but does NOT fail the operation — the SQLite
    //    write is the authoritative source; the sink is a redundant
    //    copy for off-DB compliance archival. If the user needs strict
    //    "fail loud on sink miss" semantics, they can wrap this with
    //    a watchdog that compares SQLite count to sink line count.
    if let Err(e) = maybe_append_to_sink(&entry) {
        eprintln!("[ledger] sink write failed (entry still in SQLite): {}", e);
    }

    Ok(entry)
}

/// Phase 11.7b — File-system sink for ledger entries. Runtime-gated by
/// AGICORE_LEDGER_SINK_PATH env var; when set, each entry is appended as
/// a JSON line to <path>/<ledger_name>.jsonl. The path is created on first
/// write if missing. Files are opened in append-mode and the write is
/// fsync'd so crash recovery still has the most recent entries.
fn maybe_append_to_sink(entry: &LedgerEntry) -> Result<(), String> {
    let base = match std::env::var("AGICORE_LEDGER_SINK_PATH") {
        Ok(p) if !p.is_empty() => std::path::PathBuf::from(p),
        _ => return Ok(()),  // not configured → no-op
    };
    std::fs::create_dir_all(&base).map_err(|e| format!("create_dir_all({}): {}", base.display(), e))?;
    // Per-ledger file so multiple ledgers in the same app don't interleave.
    let safe_name = entry.ledger_name
        .chars()
        .map(|c| if c.is_alphanumeric() || c == '_' || c == '-' { c } else { '_' })
        .collect::<String>();
    let path = base.join(format!("{}.jsonl", safe_name));
    let line = serde_json::to_string(entry)
        .map_err(|e| format!("serialize entry: {}", e))?;
    use std::io::Write;
    let mut f = std::fs::OpenOptions::new()
        .create(true).append(true).open(&path)
        .map_err(|e| format!("open({}): {}", path.display(), e))?;
    f.write_all(line.as_bytes()).map_err(|e| format!("write: {}", e))?;
    f.write_all(b"\n").map_err(|e| format!("write newline: {}", e))?;
    f.sync_data().map_err(|e| format!("fsync: {}", e))?;
    Ok(())
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LedgerSinkStatus {
    pub configured:    bool,
    pub base_path:     Option<String>,
    pub ledgers:       Vec<LedgerSinkFile>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LedgerSinkFile {
    pub ledger_name:   String,
    pub file_path:     String,
    pub bytes_on_disk: u64,
}

// ─── Integrity verification ──────────────────────────────────────────────

/// Walk every entry in a ledger in sequence order. For each, recompute
/// self_hash from the recorded inputs + the previous row's self_hash. If
/// any recomputed hash differs from what's persisted, that entry has been
/// tampered with (or the chain is broken). Returns the first broken sequence
/// number for fast triage.
pub fn verify_integrity_impl(db: &DbPool, ledger_name: &str) -> Result<IntegrityReport, String> {
    ensure_ledger_table(db)?;
    let conn = db.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare("SELECT sequence_num, proposal_id, policy_name, event_type, actor, payload, prev_hash, self_hash, recorded_at FROM mutation_ledger WHERE ledger_name = ? ORDER BY sequence_num ASC")
        .map_err(|e| e.to_string())?;
    let rows: Vec<(i64, String, String, String, String, String, String, String, String)> = stmt
        .query_map(params![ledger_name], |r| Ok((
            r.get(0)?, r.get(1)?, r.get(2)?, r.get(3)?, r.get(4)?,
            r.get(5)?, r.get(6)?, r.get(7)?, r.get(8)?,
        )))
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    let mut expected_prev = "GENESIS".to_string();
    let mut chains_verified: i64 = 0;
    let total = rows.len() as i64;

    for (i, (seq, pid, pol, ev, ac, payload_str, prev, self_h, ts)) in rows.iter().enumerate() {
        let expected_seq = (i as i64) + 1;
        if *seq != expected_seq {
            return Ok(IntegrityReport {
                total_entries: total, chains_verified,
                broken_chain_at_sequence: Some(*seq),
                broken_chain_reason: Some(format!(
                    "Sequence gap: expected {} but found {}", expected_seq, seq
                )),
                all_good: false,
            });
        }
        if *prev != expected_prev {
            return Ok(IntegrityReport {
                total_entries: total, chains_verified,
                broken_chain_at_sequence: Some(*seq),
                broken_chain_reason: Some(format!(
                    "Broken prev_hash at sequence {}: expected '{}' but found '{}'",
                    seq, expected_prev, prev
                )),
                all_good: false,
            });
        }
        let payload_val: serde_json::Value = serde_json::from_str(payload_str)
            .unwrap_or(serde_json::Value::Null);
        let recomputed = compute_self_hash(
            prev, ledger_name, *seq, pid, pol, ev, ac, &payload_val, ts,
        );
        if recomputed != *self_h {
            return Ok(IntegrityReport {
                total_entries: total, chains_verified,
                broken_chain_at_sequence: Some(*seq),
                broken_chain_reason: Some(format!(
                    "self_hash mismatch at sequence {}: row tampered or payload modified",
                    seq
                )),
                all_good: false,
            });
        }
        chains_verified += 1;
        expected_prev = self_h.clone();
    }

    Ok(IntegrityReport {
        total_entries: total,
        chains_verified,
        broken_chain_at_sequence: None,
        broken_chain_reason: None,
        all_good: true,
    })
}

// ─── Tauri commands ──────────────────────────────────────────────────────

#[tauri::command]
pub fn list_ledger_entries(
    db: State<'_, DbPool>,
    ledger_name: Option<String>,
    policy_name: Option<String>,
    event_type: Option<String>,
    limit: Option<i64>,
) -> Result<Vec<LedgerEntry>, String> {
    ensure_ledger_table(db.inner())?;
    let conn = db.lock().map_err(|e| e.to_string())?;
    let lim = limit.unwrap_or(200).clamp(1, 10_000);
    let mut sql = String::from(
        "SELECT id, sequence_num, ledger_name, proposal_id, policy_name, event_type, actor, payload, prev_hash, self_hash, recorded_at FROM mutation_ledger WHERE 1=1"
    );
    let mut args: Vec<String> = Vec::new();
    if let Some(ln) = &ledger_name { sql.push_str(" AND ledger_name = ?"); args.push(ln.clone()); }
    if let Some(pn) = &policy_name { sql.push_str(" AND policy_name = ?"); args.push(pn.clone()); }
    if let Some(ev) = &event_type  { sql.push_str(" AND event_type = ?");  args.push(ev.clone()); }
    sql.push_str(" ORDER BY recorded_at DESC LIMIT ?");
    let mut stmt = conn.prepare(&sql).map_err(|e| e.to_string())?;
    let param_refs: Vec<&dyn rusqlite::ToSql> = args
        .iter()
        .map(|s| s as &dyn rusqlite::ToSql)
        .chain(std::iter::once(&lim as &dyn rusqlite::ToSql))
        .collect();
    let rows = stmt
        .query_map(param_refs.as_slice(), |r| {
            let payload_str: String = r.get(7)?;
            let payload: serde_json::Value = serde_json::from_str(&payload_str)
                .unwrap_or(serde_json::Value::Null);
            Ok(LedgerEntry {
                id:           r.get(0)?,
                sequence_num: r.get(1)?,
                ledger_name:  r.get(2)?,
                proposal_id:  r.get(3)?,
                policy_name:  r.get(4)?,
                event_type:   r.get(5)?,
                actor:        r.get(6)?,
                payload,
                prev_hash:    r.get(8)?,
                self_hash:    r.get(9)?,
                recorded_at:  r.get(10)?,
            })
        })
        .map_err(|e| e.to_string())?;
    let mut out = Vec::new();
    for r in rows { out.push(r.map_err(|e| e.to_string())?); }
    Ok(out)
}

#[tauri::command]
pub fn get_ledger_entries_for_proposal(
    db: State<'_, DbPool>,
    proposal_id: String,
) -> Result<Vec<LedgerEntry>, String> {
    ensure_ledger_table(db.inner())?;
    let conn = db.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare("SELECT id, sequence_num, ledger_name, proposal_id, policy_name, event_type, actor, payload, prev_hash, self_hash, recorded_at FROM mutation_ledger WHERE proposal_id = ? ORDER BY sequence_num ASC")
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map(params![proposal_id], |r| {
            let payload_str: String = r.get(7)?;
            let payload: serde_json::Value = serde_json::from_str(&payload_str)
                .unwrap_or(serde_json::Value::Null);
            Ok(LedgerEntry {
                id:           r.get(0)?,
                sequence_num: r.get(1)?,
                ledger_name:  r.get(2)?,
                proposal_id:  r.get(3)?,
                policy_name:  r.get(4)?,
                event_type:   r.get(5)?,
                actor:        r.get(6)?,
                payload,
                prev_hash:    r.get(8)?,
                self_hash:    r.get(9)?,
                recorded_at:  r.get(10)?,
            })
        })
        .map_err(|e| e.to_string())?;
    let mut out = Vec::new();
    for r in rows { out.push(r.map_err(|e| e.to_string())?); }
    Ok(out)
}

/// Phase 11.7b — surface the current ledger-sink configuration + per-file
/// disk-byte counts so an admin UI can confirm the sink is actually
/// receiving writes (vs the env var being unset / a misconfigured path).
#[tauri::command]
pub fn list_ledger_sink_status(
    db: State<'_, DbPool>,
) -> Result<LedgerSinkStatus, String> {
    let base = std::env::var("AGICORE_LEDGER_SINK_PATH")
        .ok()
        .filter(|s| !s.is_empty());
    if base.is_none() {
        return Ok(LedgerSinkStatus { configured: false, base_path: None, ledgers: Vec::new() });
    }
    let base_str = base.unwrap();
    let base_path = std::path::PathBuf::from(&base_str);

    ensure_ledger_table(db.inner())?;
    let conn = db.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn.prepare("SELECT DISTINCT ledger_name FROM mutation_ledger")
        .map_err(|e| e.to_string())?;
    let names: Vec<String> = stmt
        .query_map([], |r| r.get::<_, String>(0))
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    let mut files = Vec::new();
    for name in names {
        let safe = name.chars().map(|c| if c.is_alphanumeric() || c == '_' || c == '-' { c } else { '_' }).collect::<String>();
        let path = base_path.join(format!("{}.jsonl", safe));
        let bytes = std::fs::metadata(&path).map(|m| m.len()).unwrap_or(0);
        files.push(LedgerSinkFile {
            ledger_name:   name,
            file_path:     path.display().to_string(),
            bytes_on_disk: bytes,
        });
    }

    Ok(LedgerSinkStatus {
        configured: true,
        base_path:  Some(base_str),
        ledgers:    files,
    })
}

#[tauri::command]
pub fn verify_ledger_integrity(
    db: State<'_, DbPool>,
    ledger_name: Option<String>,
) -> Result<IntegrityReport, String> {
    verify_integrity_impl(db.inner(), ledger_name.as_deref().unwrap_or("default"))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn canonical_json_sorts_object_keys() {
        let a = serde_json::json!({ "b": 1, "a": 2, "c": 3 });
        let b = serde_json::json!({ "c": 3, "a": 2, "b": 1 });
        assert_eq!(canonical_json(&a), canonical_json(&b));
        assert_eq!(canonical_json(&a), r#"{"a":2,"b":1,"c":3}"#);
    }

    #[test]
    fn canonical_json_preserves_array_order() {
        let v = serde_json::json!([3, 1, 2]);
        assert_eq!(canonical_json(&v), "[3,1,2]");
    }

    #[test]
    fn compute_self_hash_is_deterministic() {
        let payload = serde_json::json!({ "x": 1 });
        let h1 = compute_self_hash("PREV", "default", 1, "p1", "pol", "PROPOSED", "actor", &payload, "ts");
        let h2 = compute_self_hash("PREV", "default", 1, "p1", "pol", "PROPOSED", "actor", &payload, "ts");
        assert_eq!(h1, h2);
        assert_eq!(h1.len(), 64);  // SHA-256 hex = 64 chars
    }

    #[test]
    fn compute_self_hash_differs_on_payload_change() {
        let p1 = serde_json::json!({ "x": 1 });
        let p2 = serde_json::json!({ "x": 2 });
        let h1 = compute_self_hash("PREV", "default", 1, "p", "pol", "PROPOSED", "actor", &p1, "ts");
        let h2 = compute_self_hash("PREV", "default", 1, "p", "pol", "PROPOSED", "actor", &p2, "ts");
        assert_ne!(h1, h2);
    }

    #[test]
    fn compute_self_hash_differs_on_prev_hash_change() {
        let payload = serde_json::json!({ "x": 1 });
        let h1 = compute_self_hash("PREV1", "default", 1, "p", "pol", "PROPOSED", "actor", &payload, "ts");
        let h2 = compute_self_hash("PREV2", "default", 1, "p", "pol", "PROPOSED", "actor", &payload, "ts");
        assert_ne!(h1, h2);
    }
}
`;
}

// ─── TypeScript bindings ──────────────────────────────────────────────────

function buildLedgerTs(): string {
  return `// Agicore Generated — Mutation ledger client bindings (Phase 11.7)
// DO NOT EDIT BY HAND. See core/compiler/src/generators/ledger.ts.

import { invoke } from '@tauri-apps/api/core';

export type LedgerEventType =
  | 'PROPOSED'
  | 'TIER_VERIFIED'
  | 'TIER_REJECTED'
  | 'TESTED'
  | 'DEPLOYED'
  | 'ESCALATED'
  | 'REJECTED_BY_SANDBOX'
  | 'SHADOW_EVALUATING'         // Phase 11.5e — tier with NBVE_WINDOW entered shadow mode
  | 'SHADOW_PROMOTED'           // Phase 11.5e — SPC pass, proposal advances to deployed
  | 'SHADOW_ROLLED_BACK'        // Phase 11.5e — SPC fail, proposal rejected
  | 'SHADOW_INCONCLUSIVE'       // Phase 11.5e — window elapsed without enough samples
  | 'PARTIAL_APPROVAL'          // Phase 11.6b — N-of-N intermediate sigs
  | 'APPROVED'
  | 'REJECTED_BY_AUTHORITY';

export interface LedgerEntry {
  id: string;
  sequenceNum: number;
  ledgerName: string;
  proposalId: string;
  policyName: string;
  eventType: LedgerEventType;
  actor: string;
  payload: unknown;
  prevHash: string;
  selfHash: string;
  recordedAt: string;
}

export interface IntegrityReport {
  totalEntries: number;
  chainsVerified: number;
  brokenChainAtSequence: number | null;
  brokenChainReason: string | null;
  allGood: boolean;
}

export async function listLedgerEntries(filter?: {
  ledgerName?: string;
  policyName?: string;
  eventType?: LedgerEventType;
  limit?: number;
}): Promise<LedgerEntry[]> {
  return invoke<LedgerEntry[]>('list_ledger_entries', {
    ledgerName: filter?.ledgerName ?? null,
    policyName: filter?.policyName ?? null,
    eventType:  filter?.eventType  ?? null,
    limit:      filter?.limit      ?? null,
  });
}

export async function getLedgerEntriesForProposal(proposalId: string): Promise<LedgerEntry[]> {
  return invoke<LedgerEntry[]>('get_ledger_entries_for_proposal', { proposalId });
}

export async function verifyLedgerIntegrity(ledgerName?: string): Promise<IntegrityReport> {
  return invoke<IntegrityReport>('verify_ledger_integrity', {
    ledgerName: ledgerName ?? null,
  });
}

// Phase 11.7b — File-system sink status

export interface LedgerSinkFile {
  ledgerName:   string;
  filePath:     string;
  bytesOnDisk:  number;
}

export interface LedgerSinkStatus {
  configured:   boolean;
  basePath:     string | null;
  ledgers:      LedgerSinkFile[];
}

export async function listLedgerSinkStatus(): Promise<LedgerSinkStatus> {
  return invoke<LedgerSinkStatus>('list_ledger_sink_status');
}
`;
}
