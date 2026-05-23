// Approval Chain Generator
//
// Phase 11.6 of the Andon Loop architecture (see Idea Factory/andon_loop_architecture.md).
//
// Consumer for the 'escalated' proposal status. A proposal escalates when:
//   - the resolved tier has AUTO_DEPLOY=false, or
//   - the sandbox passed but the tier requires human signoff anyway.
//
// Phase 6 makes that escalation path actionable: an approval_request row
// auto-materialises (lazily on first list call, and explicitly via
// open_approval_request_for_proposal which the sandbox calls when it
// produces 'escalated' status). A reviewer with the required authority
// approves or rejects, and the proposal moves to terminal status with a
// full audit chain.
//
// Approval lifecycle:
//   pending  ── approve_proposal ──► approved → proposal status: 'deployed'
//      │
//      └────── reject_proposal  ──► rejected → proposal status: 'rejected'
//
// Both transitions are recorded on approval_chain (JSON column on the
// proposal row) with timestamp + resolver identity + decision notes.
//
// Gated on the same condition as the mutations runtime (≥1 MUTATION_POLICY).

import type { AgiFile } from '@agicore/parser';

function isEnabled(ast: AgiFile): boolean {
  return !!ast.mutationPolicies && ast.mutationPolicies.length > 0;
}

export function generateApprovals(ast: AgiFile): Map<string, string> {
  const files = new Map<string, string>();
  if (!isEnabled(ast)) return files;
  files.set('src-tauri/src/commands/approvals.rs', buildApprovalsRs());
  files.set('src/lib/approvals.ts', buildApprovalsTs());
  return files;
}

export function approvalsCommandNames(ast: AgiFile): string[] {
  if (!isEnabled(ast)) return [];
  return [
    'list_approval_requests',
    'get_approval_request',
    'open_approval_request_for_proposal',
    'approve_proposal',
    'reject_proposal',
  ];
}

// ─── Rust runtime ──────────────────────────────────────────────────────────

function buildApprovalsRs(): string {
  return `// Agicore Generated — Approval chain (Phase 11.6)
// DO NOT EDIT BY HAND. See core/compiler/src/generators/approvals.ts.
//
// The human-in-the-loop side of the Andon Loop. Where the deterministic
// verifier auto-deploys low-risk proposals, the approval chain handles the
// escalated path: a reviewer with the policy-declared APPROVAL_AUTHORITY
// approves or rejects, and the proposal transitions to its terminal state
// with full audit.

use crate::commands::ledger::append_entry as ledger_append;
use crate::db::DbPool;
use rusqlite::params;
use serde::{Deserialize, Serialize};
use tauri::State;
use uuid::Uuid;

// ─── Public types ─────────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ApprovalRequest {
    pub id: String,
    pub proposal_id: String,
    pub policy_name: String,
    pub required_authority: Option<String>,    // None = any authenticated reviewer
    pub status: String,                        // 'pending' | 'approved' | 'rejected'
    pub resolved_by: Option<String>,
    pub resolved_at: Option<String>,
    pub decision_notes: Option<String>,
    pub requested_at: String,
}

// ─── Schema bootstrapping ────────────────────────────────────────────────

fn ensure_approvals_table(db: &DbPool) -> Result<(), String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    conn.execute_batch(
        "CREATE TABLE IF NOT EXISTS approval_requests (
            id                  TEXT PRIMARY KEY,
            proposal_id         TEXT NOT NULL,
            policy_name         TEXT NOT NULL,
            required_authority  TEXT,                         -- JSON: single string OR string[]
            required_threshold  INTEGER NOT NULL DEFAULT 1,   -- Phase 11.6b: signatures needed to advance
            status              TEXT NOT NULL DEFAULT 'pending',
            signatures          TEXT NOT NULL DEFAULT '[]',   -- Phase 11.6b: JSON array of signoff records
            resolved_by         TEXT,                         -- last resolver (terminal signature)
            resolved_at         TEXT,
            decision_notes      TEXT,
            requested_at        TEXT NOT NULL,
            UNIQUE (proposal_id)
         );
         CREATE INDEX IF NOT EXISTS idx_approvals_status   ON approval_requests(status, requested_at DESC);
         CREATE INDEX IF NOT EXISTS idx_approvals_proposal ON approval_requests(proposal_id);
         CREATE INDEX IF NOT EXISTS idx_approvals_policy   ON approval_requests(policy_name, requested_at DESC);",
    ).map_err(|e| e.to_string())?;
    // Defensive column adds for upgrades from a pre-6b schema (no-op when columns exist).
    let _ = conn.execute("ALTER TABLE approval_requests ADD COLUMN required_threshold INTEGER NOT NULL DEFAULT 1", []);
    let _ = conn.execute("ALTER TABLE approval_requests ADD COLUMN signatures TEXT NOT NULL DEFAULT '[]'", []);
    Ok(())
}

// ─── Authority lookup ────────────────────────────────────────────────────

/// Resolved authority set for a tier. The 'authorities' field is the list
/// of signer names; 'threshold' is how many must approve before deploy.
/// 'ordered' (Phase 11.6c) when true requires signatures to arrive in the
/// declared list order — the Nth signature must come from authorities[N-1].
/// An empty authorities vec means no APPROVAL_AUTHORITY declared (open chain).
#[derive(Debug, Clone)]
pub struct AuthoritySet {
    pub authorities: Vec<String>,
    pub threshold:   usize,
    pub ordered:     bool,
}

/// Read approvalAuthority for a (policy, resolved_tier) pair. Phase 11.6b
/// returns an AuthoritySet that handles both the single-string form (1-of-1)
/// and the bracketed-list form (N-of-N). Returns Err only on policy lookup
/// failure. The empty AuthoritySet (zero authorities) means "open chain" —
/// any single reviewer can sign.
pub fn lookup_authority_set(
    db: &DbPool,
    policy_name: &str,
    resolved_tier: i32,
) -> Result<AuthoritySet, String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    let tiers_str: String = conn
        .query_row(
            "SELECT tiers FROM mutation_policies WHERE name = ?",
            params![policy_name],
            |r| r.get::<_, String>(0),
        )
        .map_err(|e| format!("Policy '{}' not found: {}", policy_name, e))?;
    let tiers: Vec<serde_json::Value> = serde_json::from_str(&tiers_str).unwrap_or_default();
    let tier_value = tiers.iter()
        .find(|t| t.get("tier").and_then(|v| v.as_i64()) == Some(resolved_tier as i64));
    let raw = tier_value.and_then(|t| t.get("approvalAuthority"));

    let authorities: Vec<String> = match raw {
        None | Some(serde_json::Value::Null) => Vec::new(),
        Some(serde_json::Value::String(s))   => vec![s.clone()],
        Some(serde_json::Value::Array(arr))  => arr.iter()
            .filter_map(|v| v.as_str().map(|s| s.to_string()))
            .collect(),
        Some(_) => Vec::new(),  // malformed → treat as open chain (safe default)
    };
    let threshold = authorities.len().max(1);  // open chain = 1 signer needed
    // Phase 11.6c — ordered flag. Only meaningful with N>1 authorities;
    // for single-signer (or open chain), order is moot so we ignore the flag.
    let ordered = tier_value
        .and_then(|t| t.get("approvalAuthorityOrdered"))
        .and_then(|v| v.as_bool())
        .unwrap_or(false)
        && authorities.len() > 1;
    Ok(AuthoritySet { authorities, threshold, ordered })
}

/// Back-compat shim — returns just the JSON-serialised authority for the
/// approval_requests.required_authority column. Single string stays single;
/// arrays serialize as JSON arrays.
pub fn lookup_required_authority(
    db: &DbPool,
    policy_name: &str,
    resolved_tier: i32,
) -> Result<Option<String>, String> {
    let set = lookup_authority_set(db, policy_name, resolved_tier)?;
    Ok(match set.authorities.len() {
        0 => None,
        1 => Some(set.authorities.into_iter().next().unwrap()),
        _ => Some(serde_json::Value::Array(
            set.authorities.iter().map(|a| serde_json::Value::String(a.clone())).collect()
        ).to_string()),
    })
}

// ─── Open request ────────────────────────────────────────────────────────

/// Open (or return existing) approval request for a proposal. Idempotent —
/// the table's UNIQUE(proposal_id) constraint prevents duplicates; the
/// helper looks up the existing row instead of erroring.
pub fn open_request_impl(db: &DbPool, proposal_id: &str) -> Result<ApprovalRequest, String> {
    ensure_approvals_table(db)?;

    // 1) Look up the proposal to get policy_name + resolved_tier.
    let (policy_name, resolved_tier_opt, status): (String, Option<i32>, String) = {
        let conn = db.lock().map_err(|e| e.to_string())?;
        conn.query_row(
            "SELECT policy_name, resolved_tier, status FROM mutation_proposals WHERE id = ?",
            params![proposal_id],
            |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?)),
        ).map_err(|e| format!("Proposal '{}' not found: {}", proposal_id, e))?
    };

    if status != "escalated" && status != "tested" && status != "tier_verified" {
        return Err(format!(
            "Approval request requires proposal status in {{escalated, tested, tier_verified}}; got '{}'",
            status
        ));
    }
    let resolved_tier = resolved_tier_opt.ok_or_else(|| {
        format!("Proposal '{}' has no resolved_tier", proposal_id)
    })?;

    // 2) Lookup authority + threshold. Phase 11.6b — threshold is the
    //    number of signers required (1 for single auth or open chain;
    //    N for an N-of-N multi-signer list).
    let auth_set = lookup_authority_set(db, &policy_name, resolved_tier)?;
    let required_authority = lookup_required_authority(db, &policy_name, resolved_tier)?;
    let required_threshold = auth_set.threshold as i64;

    // 3) Check for existing open request. UNIQUE(proposal_id) ensures
    //    at most one — return it instead of erroring.
    {
        let conn = db.lock().map_err(|e| e.to_string())?;
        let existing = conn.query_row(
            "SELECT id, proposal_id, policy_name, required_authority, status, resolved_by, resolved_at, decision_notes, requested_at FROM approval_requests WHERE proposal_id = ?",
            params![proposal_id],
            |r| Ok(ApprovalRequest {
                id:                 r.get(0)?,
                proposal_id:        r.get(1)?,
                policy_name:        r.get(2)?,
                required_authority: r.get(3)?,
                status:             r.get(4)?,
                resolved_by:        r.get(5)?,
                resolved_at:        r.get(6)?,
                decision_notes:     r.get(7)?,
                requested_at:       r.get(8)?,
            }),
        );
        if let Ok(existing) = existing {
            return Ok(existing);
        }
    }

    // 4) Insert.
    let id = Uuid::new_v4().to_string();
    let now = chrono::Utc::now().to_rfc3339();
    {
        let conn = db.lock().map_err(|e| e.to_string())?;
        conn.execute(
            "INSERT INTO approval_requests (id, proposal_id, policy_name, required_authority, required_threshold, status, signatures, requested_at) VALUES (?, ?, ?, ?, ?, 'pending', '[]', ?)",
            params![id, proposal_id, policy_name, required_authority, required_threshold, now],
        ).map_err(|e| e.to_string())?;
    }

    Ok(ApprovalRequest {
        id, proposal_id: proposal_id.to_string(), policy_name, required_authority,
        status: "pending".to_string(),
        resolved_by: None, resolved_at: None, decision_notes: None,
        requested_at: now,
    })
}

// ─── Decision recording ──────────────────────────────────────────────────

/// Multi-signer signoff path (Phase 11.6b). Appends the resolver's
/// decision to the approval_request.signatures JSON list. For 'rejected',
/// any single rejection terminates the chain — proposal becomes 'rejected'
/// immediately. For 'approved', the chain stays pending until the count of
/// approvals reaches required_threshold, at which point the proposal
/// becomes 'deployed' and the approval row becomes status='approved'.
///
/// The approval_chain JSON column on the proposal accumulates every
/// signoff event regardless — that's the full per-signer audit.
fn record_decision(
    db: &DbPool,
    proposal_id: &str,
    decision: &str,         // 'approved' | 'rejected'
    resolver: &str,
    notes: Option<&str>,
) -> Result<ApprovalRequest, String> {
    ensure_approvals_table(db)?;
    let now = chrono::Utc::now().to_rfc3339();

    // 1) Read current approval state (must be pending; collect signatures + threshold).
    let (signatures_str, threshold): (String, i64) = {
        let conn = db.lock().map_err(|e| e.to_string())?;
        conn.query_row(
            "SELECT signatures, required_threshold FROM approval_requests WHERE proposal_id = ? AND status = 'pending'",
            params![proposal_id],
            |r| Ok((r.get::<_, String>(0)?, r.get::<_, i64>(1)?)),
        ).map_err(|_| format!(
            "No pending approval request found for proposal '{}' (already resolved, or never opened)",
            proposal_id
        ))?
    };
    let mut signatures: Vec<serde_json::Value> = serde_json::from_str(&signatures_str).unwrap_or_default();

    // 1a) Phase 11.6c — when the bound authority set is ordered, validate
    //     the resolver matches the next-expected signer position. Approvals
    //     are positional: the Nth approval must come from authorities[N-1].
    //     Rejections still terminate immediately regardless of order (any
    //     authority in the chain can veto).
    if decision == "approved" {
        let (policy_name, resolved_tier_opt): (String, Option<i32>) = {
            let conn = db.lock().map_err(|e| e.to_string())?;
            conn.query_row(
                "SELECT policy_name, resolved_tier FROM mutation_proposals WHERE id = ?",
                params![proposal_id],
                |r| Ok((r.get(0)?, r.get(1)?)),
            ).map_err(|e| e.to_string())?
        };
        if let Some(resolved_tier) = resolved_tier_opt {
            let auth_set = lookup_authority_set(db, &policy_name, resolved_tier)?;
            if auth_set.ordered && !auth_set.authorities.is_empty() {
                let prior_approvals = signatures.iter()
                    .filter(|s| s.get("decision").and_then(|v| v.as_str()) == Some("approved"))
                    .count();
                if prior_approvals < auth_set.authorities.len() {
                    let expected = &auth_set.authorities[prior_approvals];
                    if expected != resolver {
                        return Err(format!(
                            "Ordered signing chain — position {} requires signer '{}' but '{}' attempted to sign (out-of-order rejected)",
                            prior_approvals + 1, expected, resolver
                        ));
                    }
                }
                // (If prior_approvals >= len, the chain is already at threshold
                //  — record_decision will mark terminal on this approval, but
                //  the extra signature is harmless.)
            }
        }
    }

    // 2) Append this signature.
    let new_sig = serde_json::json!({
        "signer":   resolver,
        "decision": decision,
        "at":       now,
        "notes":    notes,
    });
    signatures.push(new_sig);
    let signatures_json = serde_json::Value::Array(signatures.clone()).to_string();

    // 3) Decide whether the chain advances to a terminal state.
    //    - Any single 'rejected' = chain terminates as rejected.
    //    - 'approved' tally >= threshold = chain terminates as approved.
    //    - Otherwise: chain stays pending; partial signoff recorded.
    let approve_count = signatures.iter()
        .filter(|s| s.get("decision").and_then(|v| v.as_str()) == Some("approved"))
        .count() as i64;
    let any_rejection = signatures.iter()
        .any(|s| s.get("decision").and_then(|v| v.as_str()) == Some("rejected"));

    let (terminal, approval_status): (bool, &str) = if any_rejection {
        (true, "rejected")
    } else if approve_count >= threshold {
        (true, "approved")
    } else {
        (false, "pending")
    };

    // 4) Update approval row. Only set resolved_* fields on terminal transition.
    {
        let conn = db.lock().map_err(|e| e.to_string())?;
        if terminal {
            conn.execute(
                "UPDATE approval_requests SET status = ?, signatures = ?, resolved_by = ?, resolved_at = ?, decision_notes = ? WHERE proposal_id = ?",
                params![approval_status, signatures_json, resolver, now, notes, proposal_id],
            ).map_err(|e| e.to_string())?;
        } else {
            conn.execute(
                "UPDATE approval_requests SET signatures = ? WHERE proposal_id = ?",
                params![signatures_json, proposal_id],
            ).map_err(|e| e.to_string())?;
        }
    }

    // 5) Append this signoff to the proposal's approval_chain. Every
    //    individual signature appears here regardless of whether the chain
    //    has reached threshold — full per-signer audit.
    let chain_entry = serde_json::json!({
        "decision": decision,
        "resolver": resolver,
        "at":       now,
        "notes":    notes,
        "terminal": terminal,
    });
    {
        let conn = db.lock().map_err(|e| e.to_string())?;
        let existing: Option<String> = conn.query_row(
            "SELECT approval_chain FROM mutation_proposals WHERE id = ?",
            params![proposal_id],
            |r| r.get(0),
        ).map_err(|e| e.to_string())?;
        let new_chain = match existing.as_deref() {
            None | Some("") => serde_json::Value::Array(vec![chain_entry]),
            Some(s) => {
                let mut arr: Vec<serde_json::Value> = serde_json::from_str(s).unwrap_or_default();
                arr.push(chain_entry);
                serde_json::Value::Array(arr)
            }
        };
        // Only transition the proposal status on the terminal sig; partial
        // signoffs leave the proposal in 'escalated' so it stays in the
        // approval queue UI.
        if terminal {
            let new_proposal_status = if any_rejection { "rejected" } else { "deployed" };
            let audit = serde_json::json!({
                "trigger":       "approval_chain",
                "finalResolver": resolver,
                "finalDecision": if any_rejection { "rejected" } else { "approved" },
                "decidedAt":     now,
                "notes":         notes,
                "signatures":    signatures,
            });
            conn.execute(
                "UPDATE mutation_proposals SET status = ?, approval_chain = ?, deploy_audit = COALESCE(deploy_audit, ?), updated_at = ? WHERE id = ?",
                params![new_proposal_status, new_chain.to_string(), audit.to_string(), now, proposal_id],
            ).map_err(|e| e.to_string())?;
        } else {
            // Partial signoff — update only the chain audit, leave status.
            conn.execute(
                "UPDATE mutation_proposals SET approval_chain = ?, updated_at = ? WHERE id = ?",
                params![new_chain.to_string(), now, proposal_id],
            ).map_err(|e| e.to_string())?;
        }
    }

    // 6) Phase 11.7 ledger entry. Choose event type by terminality:
    //    - terminal approved → "APPROVED"
    //    - terminal rejected → "REJECTED_BY_AUTHORITY"
    //    - partial signoff   → "PARTIAL_APPROVAL"  (new in Phase 11.6b)
    let policy_name: String = {
        let conn = db.lock().map_err(|e| e.to_string())?;
        conn.query_row(
            "SELECT policy_name FROM mutation_proposals WHERE id = ?",
            params![proposal_id],
            |r| r.get(0),
        ).map_err(|e| e.to_string())?
    };
    let event_type = if !terminal {
        "PARTIAL_APPROVAL"
    } else if any_rejection {
        "REJECTED_BY_AUTHORITY"
    } else {
        "APPROVED"
    };
    let _ = ledger_append(db, proposal_id, &policy_name, event_type, resolver, serde_json::json!({
        "decision":       decision,
        "decidedAt":      now,
        "notes":          notes,
        "approvals":      approve_count,
        "threshold":      threshold,
        "remaining":      (threshold - approve_count).max(0),
        "terminal":       terminal,
    }))?;

    // 7) Return the updated approval row.
    let conn = db.lock().map_err(|e| e.to_string())?;
    conn.query_row(
        "SELECT id, proposal_id, policy_name, required_authority, status, resolved_by, resolved_at, decision_notes, requested_at FROM approval_requests WHERE proposal_id = ?",
        params![proposal_id],
        |r| Ok(ApprovalRequest {
            id:                 r.get(0)?,
            proposal_id:        r.get(1)?,
            policy_name:        r.get(2)?,
            required_authority: r.get(3)?,
            status:             r.get(4)?,
            resolved_by:        r.get(5)?,
            resolved_at:        r.get(6)?,
            decision_notes:     r.get(7)?,
            requested_at:       r.get(8)?,
        }),
    ).map_err(|e| e.to_string())
}

// ─── Tauri commands ──────────────────────────────────────────────────────

#[tauri::command]
pub fn list_approval_requests(
    db: State<'_, DbPool>,
    status: Option<String>,
    policy_name: Option<String>,
    limit: Option<i64>,
) -> Result<Vec<ApprovalRequest>, String> {
    ensure_approvals_table(db.inner())?;
    let conn = db.lock().map_err(|e| e.to_string())?;
    let lim = limit.unwrap_or(100).clamp(1, 10_000);
    let mut sql = String::from(
        "SELECT id, proposal_id, policy_name, required_authority, status, resolved_by, resolved_at, decision_notes, requested_at FROM approval_requests WHERE 1=1"
    );
    let mut args: Vec<String> = Vec::new();
    if let Some(st) = &status { sql.push_str(" AND status = ?"); args.push(st.clone()); }
    if let Some(pn) = &policy_name { sql.push_str(" AND policy_name = ?"); args.push(pn.clone()); }
    sql.push_str(" ORDER BY requested_at DESC LIMIT ?");
    let mut stmt = conn.prepare(&sql).map_err(|e| e.to_string())?;
    let param_refs: Vec<&dyn rusqlite::ToSql> = args
        .iter()
        .map(|s| s as &dyn rusqlite::ToSql)
        .chain(std::iter::once(&lim as &dyn rusqlite::ToSql))
        .collect();
    let rows = stmt
        .query_map(param_refs.as_slice(), |r| Ok(ApprovalRequest {
            id:                 r.get(0)?,
            proposal_id:        r.get(1)?,
            policy_name:        r.get(2)?,
            required_authority: r.get(3)?,
            status:             r.get(4)?,
            resolved_by:        r.get(5)?,
            resolved_at:        r.get(6)?,
            decision_notes:     r.get(7)?,
            requested_at:       r.get(8)?,
        }))
        .map_err(|e| e.to_string())?;
    let mut out = Vec::new();
    for r in rows { out.push(r.map_err(|e| e.to_string())?); }
    Ok(out)
}

#[tauri::command]
pub fn get_approval_request(
    db: State<'_, DbPool>,
    request_id: String,
) -> Result<Option<ApprovalRequest>, String> {
    ensure_approvals_table(db.inner())?;
    let conn = db.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare("SELECT id, proposal_id, policy_name, required_authority, status, resolved_by, resolved_at, decision_notes, requested_at FROM approval_requests WHERE id = ?")
        .map_err(|e| e.to_string())?;
    let mut rows = stmt
        .query_map(params![request_id], |r| Ok(ApprovalRequest {
            id:                 r.get(0)?,
            proposal_id:        r.get(1)?,
            policy_name:        r.get(2)?,
            required_authority: r.get(3)?,
            status:             r.get(4)?,
            resolved_by:        r.get(5)?,
            resolved_at:        r.get(6)?,
            decision_notes:     r.get(7)?,
            requested_at:       r.get(8)?,
        }))
        .map_err(|e| e.to_string())?;
    match rows.next() {
        Some(r) => Ok(Some(r.map_err(|e| e.to_string())?)),
        None => Ok(None),
    }
}

#[tauri::command]
pub fn open_approval_request_for_proposal(
    db: State<'_, DbPool>,
    proposal_id: String,
) -> Result<ApprovalRequest, String> {
    open_request_impl(db.inner(), &proposal_id)
}

#[tauri::command]
pub fn approve_proposal(
    db: State<'_, DbPool>,
    proposal_id: String,
    resolver: String,
    notes: Option<String>,
) -> Result<ApprovalRequest, String> {
    record_decision(db.inner(), &proposal_id, "approved", &resolver, notes.as_deref())
}

#[tauri::command]
pub fn reject_proposal(
    db: State<'_, DbPool>,
    proposal_id: String,
    resolver: String,
    notes: Option<String>,
) -> Result<ApprovalRequest, String> {
    record_decision(db.inner(), &proposal_id, "rejected", &resolver, notes.as_deref())
}
`;
}

// ─── TypeScript bindings ──────────────────────────────────────────────────

function buildApprovalsTs(): string {
  return `// Agicore Generated — Approval chain client bindings (Phase 11.6)
// DO NOT EDIT BY HAND. See core/compiler/src/generators/approvals.ts.

import { invoke } from '@tauri-apps/api/core';

export type ApprovalStatus = 'pending' | 'approved' | 'rejected';

export interface ApprovalRequest {
  id: string;
  proposalId: string;
  policyName: string;
  requiredAuthority: string | null;
  status: ApprovalStatus;
  resolvedBy: string | null;
  resolvedAt: string | null;
  decisionNotes: string | null;
  requestedAt: string;
}

export async function listApprovalRequests(filter?: {
  status?: ApprovalStatus;
  policyName?: string;
  limit?: number;
}): Promise<ApprovalRequest[]> {
  return invoke<ApprovalRequest[]>('list_approval_requests', {
    status:     filter?.status ?? null,
    policyName: filter?.policyName ?? null,
    limit:      filter?.limit ?? null,
  });
}

export async function getApprovalRequest(requestId: string): Promise<ApprovalRequest | null> {
  return invoke<ApprovalRequest | null>('get_approval_request', { requestId });
}

export async function openApprovalRequestForProposal(proposalId: string): Promise<ApprovalRequest> {
  return invoke<ApprovalRequest>('open_approval_request_for_proposal', { proposalId });
}

export async function approveProposal(
  proposalId: string,
  resolver: string,
  notes?: string,
): Promise<ApprovalRequest> {
  return invoke<ApprovalRequest>('approve_proposal', {
    proposalId, resolver, notes: notes ?? null,
  });
}

export async function rejectProposal(
  proposalId: string,
  resolver: string,
  notes?: string,
): Promise<ApprovalRequest> {
  return invoke<ApprovalRequest>('reject_proposal', {
    proposalId, resolver, notes: notes ?? null,
  });
}
`;
}
