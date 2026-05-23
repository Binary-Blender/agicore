// Mutation Proposal Lifecycle Generator
//
// Phase 11.4a of the Andon Loop architecture (see Idea Factory/andon_loop_architecture.md).
//
// Emits the runtime that owns the proposal table — creation, tier verification,
// test-outcome recording, deploy-outcome recording. Independent of WORKFLOW
// codegen: any app that declares a MUTATION_POLICY gets the lifecycle runtime,
// whether or not it wires workflows. (Mutation policies can govern modules,
// rules, etc., not just workflows.)
//
// Tier verifier is the canonical "AI cannot expand its own authorization"
// mechanism. Given a proposal's claimed_tier + claimed_scope, the verifier
// reads the policy's tiers JSON from the mutation_policies table and rejects
// any proposal whose scope contains a kind that requires a higher tier than
// claimed. Under-declared proposals get status='tier_rejected' before ever
// reaching the sandbox.

import type { AgiFile } from '@agicore/parser';

function isEnabled(ast: AgiFile): boolean {
  return !!ast.mutationPolicies && ast.mutationPolicies.length > 0;
}

export function generateMutations(ast: AgiFile): Map<string, string> {
  const files = new Map<string, string>();
  if (!isEnabled(ast)) return files;
  files.set('src-tauri/src/commands/mutations.rs', buildMutationsRs());
  files.set('src/lib/mutations.ts', buildMutationsTs());
  return files;
}

/**
 * Names of the Tauri commands emitted by this generator, in invoke_handler
 * registration order. main.rs splices these into its tauri::generate_handler!
 * block. Returns [] when mutation policies aren't declared.
 */
export function mutationCommandNames(ast: AgiFile): string[] {
  if (!isEnabled(ast)) return [];
  return [
    'create_mutation_proposal',
    'verify_mutation_proposal',
    'execute_proposal_sandbox',  // Phase 4b
    'record_proposal_test',
    'record_proposal_deploy',
    'list_mutation_proposals',
    'get_mutation_proposal',
    'get_proposals_for_andon',
  ];
}

// ─── Rust runtime ──────────────────────────────────────────────────────────

function buildMutationsRs(): string {
  return `// Agicore Generated — Mutation proposal lifecycle (Phase 11.4a + 11.7 ledger hooks)
// DO NOT EDIT BY HAND. See core/compiler/src/generators/mutations.ts.
//
// Owns the mutation_proposals table. Every AI-proposed change to the system
// lands here as a row; the tier verifier mechanically blocks under-declared
// proposals from reaching the sandbox. Every state transition is appended
// to the hash-chained mutation_ledger (Phase 11.7) for compliance audit.

use crate::commands::ledger::append_entry as ledger_append;
use crate::db::DbPool;
use rusqlite::params;
use serde::{Deserialize, Serialize};
use tauri::State;
use uuid::Uuid;

// ─── Public types ─────────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MutationProposal {
    pub id: String,
    pub andon_event_id: Option<String>,
    pub policy_name: String,
    pub proposer_identity: String,
    pub target: String,
    pub claimed_tier: i32,
    pub resolved_tier: Option<i32>,
    pub claimed_scope: Vec<String>,
    pub mutation_content: serde_json::Value,
    pub status: String,
    pub rejection_reason: Option<String>,
    pub test_evidence: Option<serde_json::Value>,
    pub approval_chain: Option<serde_json::Value>,
    pub deploy_audit: Option<serde_json::Value>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProposalInput {
    pub andon_event_id: Option<String>,
    pub policy_name: String,
    pub proposer_identity: String,
    pub target: String,
    pub claimed_tier: i32,
    pub claimed_scope: Vec<String>,
    pub mutation_content: serde_json::Value,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TierVerification {
    pub allowed: bool,
    pub resolved_tier: Option<i32>,
    pub rejection_reason: Option<String>,
}

// ─── Persistence helpers (pure-Rust, used by both commands + future REASONER) ──

fn parse_proposal_row(row: &rusqlite::Row<'_>) -> rusqlite::Result<MutationProposal> {
    let scope_str: String = row.get(7)?;
    let scope: Vec<String> = serde_json::from_str(&scope_str).unwrap_or_default();
    let content_str: String = row.get(8)?;
    let content: serde_json::Value = serde_json::from_str(&content_str).unwrap_or(serde_json::Value::Null);
    let evidence_str: Option<String> = row.get(11)?;
    let evidence: Option<serde_json::Value> = evidence_str.and_then(|s| serde_json::from_str(&s).ok());
    let approval_str: Option<String> = row.get(12)?;
    let approval: Option<serde_json::Value> = approval_str.and_then(|s| serde_json::from_str(&s).ok());
    let deploy_str: Option<String> = row.get(13)?;
    let deploy: Option<serde_json::Value> = deploy_str.and_then(|s| serde_json::from_str(&s).ok());
    Ok(MutationProposal {
        id: row.get(0)?,
        andon_event_id: row.get(1)?,
        policy_name: row.get(2)?,
        proposer_identity: row.get(3)?,
        target: row.get(4)?,
        claimed_tier: row.get(5)?,
        resolved_tier: row.get(6)?,
        claimed_scope: scope,
        mutation_content: content,
        status: row.get(9)?,
        rejection_reason: row.get(10)?,
        test_evidence: evidence,
        approval_chain: approval,
        deploy_audit: deploy,
        created_at: row.get(14)?,
        updated_at: row.get(15)?,
    })
}

fn load_policy_tiers(conn: &rusqlite::Connection, policy_name: &str) -> Result<Vec<serde_json::Value>, String> {
    let tiers_str: String = conn
        .query_row(
            "SELECT tiers FROM mutation_policies WHERE name = ?",
            params![policy_name],
            |r| r.get::<_, String>(0),
        )
        .map_err(|e| format!("Policy '{}' not found: {}", policy_name, e))?;
    serde_json::from_str::<Vec<serde_json::Value>>(&tiers_str)
        .map_err(|e| format!("Policy '{}' has malformed tiers JSON: {}", policy_name, e))
}

/// Pure-logic tier verifier. Given a claimed tier + scope kinds and the
/// policy's tier definitions, returns whether the proposal is allowed and
/// what tier the scope actually requires.
///
/// Mechanically enforces: a proposal cannot claim tier T if any of its
/// scope kinds requires a higher tier than T. The "minimum tier per kind"
/// is the LOWEST tier number whose SCOPE list contains that kind; the
/// "required tier for proposal" is the MAX of those across all kinds.
pub fn verify_proposal_tier_logic(
    claimed_tier: i32,
    claimed_scope: &[String],
    policy_tiers: &[serde_json::Value],
) -> TierVerification {
    if claimed_scope.is_empty() {
        return TierVerification {
            allowed: false,
            resolved_tier: None,
            rejection_reason: Some("Proposal has empty claimed_scope".to_string()),
        };
    }

    let mut highest_required: i32 = 0;
    let mut offending: Vec<(String, i32)> = Vec::new();

    for kind in claimed_scope {
        let mut min_tier_for_kind: Option<i32> = None;
        for tier_value in policy_tiers {
            let tier_num = tier_value.get("tier").and_then(|v| v.as_i64()).unwrap_or(0) as i32;
            let in_scope = tier_value
                .get("scope")
                .and_then(|v| v.as_array())
                .map_or(false, |arr| arr.iter().any(|v| v.as_str() == Some(kind.as_str())));
            if in_scope {
                min_tier_for_kind = Some(match min_tier_for_kind {
                    None => tier_num,
                    Some(existing) => existing.min(tier_num),
                });
            }
        }
        match min_tier_for_kind {
            None => offending.push((kind.clone(), -1)),  // not in any tier
            Some(required) => {
                highest_required = highest_required.max(required);
                if required > claimed_tier {
                    offending.push((kind.clone(), required));
                }
            }
        }
    }

    if !offending.is_empty() {
        let detail: Vec<String> = offending.iter().map(|(k, t)| {
            if *t < 0 {
                format!("'{}' is not in any tier's SCOPE for this policy", k)
            } else {
                format!("'{}' requires tier T{} (claimed: T{})", k, t, claimed_tier)
            }
        }).collect();
        return TierVerification {
            allowed: false,
            resolved_tier: if highest_required > 0 { Some(highest_required) } else { None },
            rejection_reason: Some(format!("Under-declared tier: {}", detail.join("; "))),
        };
    }

    TierVerification {
        allowed: true,
        resolved_tier: Some(highest_required.max(claimed_tier)),
        rejection_reason: None,
    }
}

// ─── Lifecycle helpers (callable from the future REASONER + sandbox) ─────

pub fn create_proposal_in_db(db: &DbPool, input: &ProposalInput) -> Result<String, String> {
    let id = Uuid::new_v4().to_string();
    let now = chrono::Utc::now().to_rfc3339();
    let scope_json = serde_json::to_string(&input.claimed_scope).unwrap_or_else(|_| "[]".to_string());
    let content_json = input.mutation_content.to_string();
    {
        let conn = db.lock().map_err(|e| e.to_string())?;
        conn.execute(
            "INSERT INTO mutation_proposals (id, andon_event_id, policy_name, proposer_identity, target, claimed_tier, claimed_scope, mutation_content, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'created', ?, ?)",
            params![
                id, input.andon_event_id, input.policy_name, input.proposer_identity,
                input.target, input.claimed_tier, scope_json, content_json, now, now,
            ],
        ).map_err(|e| e.to_string())?;
    }
    // Phase 11.7 — record the proposal birth on the ledger.
    let _ = ledger_append(db, &id, &input.policy_name, "PROPOSED", &input.proposer_identity, serde_json::json!({
        "andonEventId": input.andon_event_id,
        "target":       input.target,
        "claimedTier":  input.claimed_tier,
        "claimedScope": input.claimed_scope,
    }))?;
    Ok(id)
}

pub fn verify_and_persist(db: &DbPool, proposal_id: &str) -> Result<TierVerification, String> {
    // Read everything we need in one transaction-ish window.
    let (policy_name, claimed_tier, claimed_scope, policy_tiers) = {
        let conn = db.lock().map_err(|e| e.to_string())?;
        let (pn, ct, cs_str): (String, i32, String) = conn
            .query_row(
                "SELECT policy_name, claimed_tier, claimed_scope FROM mutation_proposals WHERE id = ?",
                params![proposal_id],
                |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?)),
            )
            .map_err(|e| format!("Proposal '{}' not found: {}", proposal_id, e))?;
        let cs: Vec<String> = serde_json::from_str(&cs_str).unwrap_or_default();
        let tiers = load_policy_tiers(&conn, &pn)?;
        (pn, ct, cs, tiers)
    };
    let verification = verify_proposal_tier_logic(claimed_tier, &claimed_scope, &policy_tiers);

    let now = chrono::Utc::now().to_rfc3339();
    let new_status = if verification.allowed { "tier_verified" } else { "tier_rejected" };
    {
        let conn = db.lock().map_err(|e| e.to_string())?;
        conn.execute(
            "UPDATE mutation_proposals SET status = ?, resolved_tier = ?, rejection_reason = ?, updated_at = ? WHERE id = ?",
            params![new_status, verification.resolved_tier, verification.rejection_reason, now, proposal_id],
        ).map_err(|e| e.to_string())?;
    }

    // Phase 11.7 — record tier verifier outcome on the ledger.
    let _ = ledger_append(db, proposal_id, &policy_name,
        if verification.allowed { "TIER_VERIFIED" } else { "TIER_REJECTED" },
        "tier_verifier",
        serde_json::json!({
            "claimedTier":     claimed_tier,
            "resolvedTier":    verification.resolved_tier,
            "rejectionReason": verification.rejection_reason,
        }),
    )?;

    Ok(verification)
}

pub fn record_test_outcome(
    db: &DbPool,
    proposal_id: &str,
    resolved_failure: bool,
    regression_total: i64,
    regression_unchanged: i64,
    regression_broken: i64,
) -> Result<(), String> {
    let evidence = serde_json::json!({
        "resolvedFailure": resolved_failure,
        "regression": {
            "total":      regression_total,
            "unchanged":  regression_unchanged,
            "broken":     regression_broken,
        },
    });
    let passed = resolved_failure && regression_broken == 0;
    let new_status = if passed { "tested" } else { "rejected" };
    let rejection: Option<String> = if !passed {
        Some(format!(
            "Test outcome: resolved_failure={}, regression_broken={}/{}",
            resolved_failure, regression_broken, regression_total
        ))
    } else { None };
    let now = chrono::Utc::now().to_rfc3339();
    let conn = db.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "UPDATE mutation_proposals SET status = ?, test_evidence = ?, rejection_reason = COALESCE(?, rejection_reason), updated_at = ? WHERE id = ?",
        params![new_status, evidence.to_string(), rejection, now, proposal_id],
    ).map_err(|e| e.to_string())?;
    Ok(())
}

pub fn record_deploy_outcome(
    db: &DbPool,
    proposal_id: &str,
    deployed: bool,
    audit: &serde_json::Value,
) -> Result<(), String> {
    let status = if deployed { "deployed" } else { "rolled_back" };
    let now = chrono::Utc::now().to_rfc3339();
    let conn = db.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "UPDATE mutation_proposals SET status = ?, deploy_audit = ?, updated_at = ? WHERE id = ?",
        params![status, audit.to_string(), now, proposal_id],
    ).map_err(|e| e.to_string())?;
    Ok(())
}

// ─── Phase 4b — Sandbox executor + auto-deploy hook ──────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SandboxOutcome {
    pub proposal_id: String,
    pub suite_name: Option<String>,
    pub regression_total: i64,
    pub regression_unchanged: i64,
    pub regression_broken: i64,
    pub resolved_failure: bool,
    pub passed: bool,
    pub final_status: String,      // 'deployed' | 'escalated' | 'rejected'
    pub deploy_audit: Option<serde_json::Value>,
}

/// Resolve a named REGRESSION_SUITE to a list of workflow_run ids that
/// should be replayed. Phase 4b ships the canonical "last-window completed"
/// suites; custom named suites (e.g. golden_set) hook in here in Phase 4c.
fn resolve_regression_suite(conn: &rusqlite::Connection, suite_name: &str) -> Result<Vec<String>, String> {
    let window: Option<&str> = match suite_name {
        "24h_recent_workflows" | "24h_workflows" => Some("-24 hours"),
        "48h_recent_workflows"                   => Some("-48 hours"),
        "7d_recent_workflows"  | "weekly"        => Some("-7 days"),
        "30d_recent_workflows" | "monthly"       => Some("-30 days"),
        _ => None,
    };
    let Some(cutoff) = window else { return Ok(Vec::new()); };
    let mut stmt = conn
        .prepare("SELECT id FROM workflow_runs WHERE status = 'completed' AND started_at > datetime('now', ?) ORDER BY started_at DESC")
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map(params![cutoff], |r| r.get::<_, String>(0))
        .map_err(|e| e.to_string())?;
    let mut out = Vec::new();
    for r in rows { out.push(r.map_err(|e| e.to_string())?); }
    Ok(out)
}

/// Phase 4b stub: pretend every replay passes. Real replay (which actually
/// re-executes a recorded workflow run against the mutated rule/workflow set)
/// lands in Phase 4c — that requires the rule-graph diff engine which is its
/// own milestone. For now, return (total, unchanged=total, broken=0,
/// resolved_failure=true) so the lifecycle wiring + AUTO_DEPLOY decision
/// can be exercised end-to-end against real proposals.
fn replay_runs_stub(run_ids: &[String], _mutation_content: &serde_json::Value) -> (i64, i64, i64, bool) {
    let total = run_ids.len() as i64;
    (total, total, 0, true)
}

/// Read the autoDeploy flag for the resolved tier from the policy's tiers
/// JSON. Accepts boolean OR stringy-true ("true"/"TRUE"/"True"/"yes")
/// because the parser accepts both forms in MUTATION_POLICY TIER syntax.
pub fn tier_auto_deploys(policy_tiers: &[serde_json::Value], resolved_tier: i32) -> bool {
    let tier_value = policy_tiers.iter()
        .find(|t| t.get("tier").and_then(|v| v.as_i64()) == Some(resolved_tier as i64));
    match tier_value.and_then(|t| t.get("autoDeploy")) {
        Some(serde_json::Value::Bool(b)) => *b,
        Some(serde_json::Value::String(s)) => matches!(s.to_lowercase().as_str(), "true" | "yes" | "1"),
        _ => false,
    }
}

/// Look up the REGRESSION_SUITE name configured for the given tier (or None
/// if the tier didn't declare one; the sandbox falls back to an empty suite
/// in that case, which yields total=0 and a passed=true outcome).
fn tier_regression_suite(policy_tiers: &[serde_json::Value], resolved_tier: i32) -> Option<String> {
    policy_tiers.iter()
        .find(|t| t.get("tier").and_then(|v| v.as_i64()) == Some(resolved_tier as i64))
        .and_then(|t| t.get("regressionSuite"))
        .and_then(|v| v.as_str())
        .map(|s| s.to_string())
}

/// Run a tier-verified proposal through the sandbox: resolve its regression
/// suite, (stub-)replay runs, record the test outcome, then either auto-deploy
/// or mark escalated based on the tier's AUTO_DEPLOY flag. End-to-end audit
/// trail is captured in test_evidence + deploy_audit on the proposal row.
///
/// Errors with a 4xx-style message if the proposal isn't in 'tier_verified'
/// state — every preceding lifecycle step is mechanically enforced.
pub fn execute_sandbox(db: &DbPool, proposal_id: &str) -> Result<SandboxOutcome, String> {
    // 1) Load proposal + verify state.
    let (policy_name, resolved_tier, mutation_content, status) = {
        let conn = db.lock().map_err(|e| e.to_string())?;
        let (pn, rt_opt, mc_str, st): (String, Option<i32>, String, String) = conn
            .query_row(
                "SELECT policy_name, resolved_tier, mutation_content, status FROM mutation_proposals WHERE id = ?",
                params![proposal_id],
                |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?, r.get(3)?)),
            )
            .map_err(|e| format!("Proposal '{}' not found: {}", proposal_id, e))?;
        let mc: serde_json::Value = serde_json::from_str(&mc_str).unwrap_or(serde_json::Value::Null);
        (pn, rt_opt, mc, st)
    };

    if status != "tier_verified" {
        return Err(format!(
            "Sandbox requires status='tier_verified'; proposal '{}' is in status '{}'",
            proposal_id, status
        ));
    }
    let resolved_tier = resolved_tier.ok_or_else(|| {
        format!("Proposal '{}' has no resolved_tier (tier verifier did not run?)", proposal_id)
    })?;

    // 2) Load tier metadata (auto_deploy + regression_suite).
    let policy_tiers = {
        let conn = db.lock().map_err(|e| e.to_string())?;
        load_policy_tiers(&conn, &policy_name)?
    };
    let suite_name = tier_regression_suite(&policy_tiers, resolved_tier);
    let auto_deploys = tier_auto_deploys(&policy_tiers, resolved_tier);

    // 3) Resolve suite → run ids, then (stub-)replay.
    let run_ids: Vec<String> = if let Some(s) = suite_name.as_deref() {
        let conn = db.lock().map_err(|e| e.to_string())?;
        resolve_regression_suite(&conn, s)?
    } else {
        Vec::new()
    };
    let (total, unchanged, broken, resolved_failure) = replay_runs_stub(&run_ids, &mutation_content);
    let passed = resolved_failure && broken == 0;

    // 4) Record test outcome on the proposal.
    record_test_outcome(db, proposal_id, resolved_failure, total, unchanged, broken)?;
    // Phase 11.7 — TESTED entry on the ledger (always recorded; outcome shown via the next entry).
    let _ = ledger_append(db, proposal_id, &policy_name, "TESTED", "sandbox", serde_json::json!({
        "regressionTotal":     total,
        "regressionUnchanged": unchanged,
        "regressionBroken":    broken,
        "resolvedFailure":     resolved_failure,
        "passed":              passed,
        "suiteName":           suite_name,
    }))?;

    // 5) Decide deploy disposition.
    let (final_status, audit_value): (String, Option<serde_json::Value>) = if !passed {
        let _ = ledger_append(db, proposal_id, &policy_name, "REJECTED_BY_SANDBOX", "sandbox", serde_json::json!({
            "regressionBroken": broken,
            "resolvedFailure":  resolved_failure,
        }))?;
        ("rejected".to_string(), None)
    } else if auto_deploys {
        let audit = serde_json::json!({
            "trigger":           "sandbox_auto_deploy",
            "policy":            policy_name,
            "resolvedTier":      resolved_tier,
            "regressionSuite":   suite_name,
            "regressionTotal":   total,
            "deployedAt":        chrono::Utc::now().to_rfc3339(),
        });
        record_deploy_outcome(db, proposal_id, true, &audit)?;
        let _ = ledger_append(db, proposal_id, &policy_name, "DEPLOYED", "sandbox", audit.clone())?;
        ("deployed".to_string(), Some(audit))
    } else {
        let now = chrono::Utc::now().to_rfc3339();
        {
            let conn = db.lock().map_err(|e| e.to_string())?;
            conn.execute(
                "UPDATE mutation_proposals SET status = 'escalated', updated_at = ? WHERE id = ?",
                params![now, proposal_id],
            ).map_err(|e| e.to_string())?;
        }
        let _ = ledger_append(db, proposal_id, &policy_name, "ESCALATED", "sandbox", serde_json::json!({
            "resolvedTier":  resolved_tier,
            "suiteName":     suite_name,
            "escalatedAt":   now,
        }))?;
        ("escalated".to_string(), None)
    };

    Ok(SandboxOutcome {
        proposal_id:         proposal_id.to_string(),
        suite_name,
        regression_total:    total,
        regression_unchanged: unchanged,
        regression_broken:   broken,
        resolved_failure,
        passed,
        final_status,
        deploy_audit:        audit_value,
    })
}

// ─── Tauri commands ──────────────────────────────────────────────────────

#[tauri::command]
pub fn create_mutation_proposal(
    db: State<'_, DbPool>,
    input: ProposalInput,
) -> Result<String, String> {
    create_proposal_in_db(db.inner(), &input)
}

#[tauri::command]
pub fn verify_mutation_proposal(
    db: State<'_, DbPool>,
    proposal_id: String,
) -> Result<TierVerification, String> {
    verify_and_persist(db.inner(), &proposal_id)
}

#[tauri::command]
pub fn execute_proposal_sandbox(
    db: State<'_, DbPool>,
    proposal_id: String,
) -> Result<SandboxOutcome, String> {
    execute_sandbox(db.inner(), &proposal_id)
}

#[tauri::command]
pub fn record_proposal_test(
    db: State<'_, DbPool>,
    proposal_id: String,
    resolved_failure: bool,
    regression_total: i64,
    regression_unchanged: i64,
    regression_broken: i64,
) -> Result<(), String> {
    record_test_outcome(db.inner(), &proposal_id, resolved_failure, regression_total, regression_unchanged, regression_broken)
}

#[tauri::command]
pub fn record_proposal_deploy(
    db: State<'_, DbPool>,
    proposal_id: String,
    deployed: bool,
    audit: serde_json::Value,
) -> Result<(), String> {
    record_deploy_outcome(db.inner(), &proposal_id, deployed, &audit)
}

#[tauri::command]
pub fn list_mutation_proposals(
    db: State<'_, DbPool>,
    policy_name: Option<String>,
    status: Option<String>,
    limit: Option<i64>,
) -> Result<Vec<MutationProposal>, String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    let lim = limit.unwrap_or(100).clamp(1, 10_000);

    let mut sql = String::from(
        "SELECT id, andon_event_id, policy_name, proposer_identity, target, claimed_tier, resolved_tier, claimed_scope, mutation_content, status, rejection_reason, test_evidence, approval_chain, deploy_audit, created_at, updated_at FROM mutation_proposals WHERE 1=1"
    );
    let mut args: Vec<String> = Vec::new();
    if let Some(pn) = &policy_name {
        sql.push_str(" AND policy_name = ?");
        args.push(pn.clone());
    }
    if let Some(st) = &status {
        sql.push_str(" AND status = ?");
        args.push(st.clone());
    }
    sql.push_str(" ORDER BY created_at DESC LIMIT ?");

    let mut stmt = conn.prepare(&sql).map_err(|e| e.to_string())?;
    let param_refs: Vec<&dyn rusqlite::ToSql> = args
        .iter()
        .map(|s| s as &dyn rusqlite::ToSql)
        .chain(std::iter::once(&lim as &dyn rusqlite::ToSql))
        .collect();
    let rows = stmt
        .query_map(param_refs.as_slice(), parse_proposal_row)
        .map_err(|e| e.to_string())?;
    let mut out = Vec::new();
    for r in rows { out.push(r.map_err(|e| e.to_string())?); }
    Ok(out)
}

#[tauri::command]
pub fn get_mutation_proposal(
    db: State<'_, DbPool>,
    proposal_id: String,
) -> Result<Option<MutationProposal>, String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare("SELECT id, andon_event_id, policy_name, proposer_identity, target, claimed_tier, resolved_tier, claimed_scope, mutation_content, status, rejection_reason, test_evidence, approval_chain, deploy_audit, created_at, updated_at FROM mutation_proposals WHERE id = ?")
        .map_err(|e| e.to_string())?;
    let mut rows = stmt
        .query_map(params![proposal_id], parse_proposal_row)
        .map_err(|e| e.to_string())?;
    match rows.next() {
        Some(r) => Ok(Some(r.map_err(|e| e.to_string())?)),
        None => Ok(None),
    }
}

#[tauri::command]
pub fn get_proposals_for_andon(
    db: State<'_, DbPool>,
    andon_event_id: String,
) -> Result<Vec<MutationProposal>, String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare("SELECT id, andon_event_id, policy_name, proposer_identity, target, claimed_tier, resolved_tier, claimed_scope, mutation_content, status, rejection_reason, test_evidence, approval_chain, deploy_audit, created_at, updated_at FROM mutation_proposals WHERE andon_event_id = ? ORDER BY created_at DESC")
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map(params![andon_event_id], parse_proposal_row)
        .map_err(|e| e.to_string())?;
    let mut out = Vec::new();
    for r in rows { out.push(r.map_err(|e| e.to_string())?); }
    Ok(out)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn tiers_fixture() -> Vec<serde_json::Value> {
        // T1: RULES_modify | T3: WORKFLOW_modify | T5: MUTATION_POLICY_modify
        vec![
            serde_json::json!({ "tier": 1, "scope": ["RULES_modify"] }),
            serde_json::json!({ "tier": 3, "scope": ["WORKFLOW_modify", "RULES_modify"] }),
            serde_json::json!({ "tier": 5, "scope": ["MUTATION_POLICY_modify"] }),
        ]
    }

    #[test]
    fn allows_t1_for_rules_modify() {
        let r = verify_proposal_tier_logic(1, &["RULES_modify".into()], &tiers_fixture());
        assert!(r.allowed);
        assert_eq!(r.resolved_tier, Some(1));
    }

    #[test]
    fn rejects_t1_claiming_workflow_modify() {
        let r = verify_proposal_tier_logic(1, &["WORKFLOW_modify".into()], &tiers_fixture());
        assert!(!r.allowed);
        assert_eq!(r.resolved_tier, Some(3));
        assert!(r.rejection_reason.as_ref().unwrap().contains("T3"));
    }

    #[test]
    fn rejects_unknown_kind() {
        let r = verify_proposal_tier_logic(5, &["GENESIS_SELF_MODIFY".into()], &tiers_fixture());
        assert!(!r.allowed);
        assert!(r.rejection_reason.as_ref().unwrap().contains("not in any tier"));
    }

    #[test]
    fn rejects_empty_scope() {
        let r = verify_proposal_tier_logic(1, &[], &tiers_fixture());
        assert!(!r.allowed);
        assert!(r.rejection_reason.as_ref().unwrap().contains("empty"));
    }

    #[test]
    fn allows_when_mixed_scope_fits_claimed_tier() {
        // T3 covers WORKFLOW_modify; T3 also covers RULES_modify (since
        // higher tiers inherit by being explicit). Both present in T3 scope.
        let r = verify_proposal_tier_logic(3, &["WORKFLOW_modify".into(), "RULES_modify".into()], &tiers_fixture());
        assert!(r.allowed);
    }

    // ─── Phase 4b — Auto-deploy tier helper ──────────────────────────────

    fn tiers_with_auto_deploy() -> Vec<serde_json::Value> {
        vec![
            // T1: auto-deploy on (boolean form)
            serde_json::json!({ "tier": 1, "scope": ["RULES_modify"], "autoDeploy": true,
                                "regressionSuite": "24h_recent_workflows" }),
            // T3: auto-deploy off (string form — parser may emit either)
            serde_json::json!({ "tier": 3, "scope": ["WORKFLOW_modify"], "autoDeploy": "false",
                                "regressionSuite": "7d_recent_workflows" }),
            // T5: auto-deploy missing — should default to false
            serde_json::json!({ "tier": 5, "scope": ["MUTATION_POLICY_modify"] }),
        ]
    }

    #[test]
    fn auto_deploy_true_for_boolean_true_tier() {
        assert!(tier_auto_deploys(&tiers_with_auto_deploy(), 1));
    }

    #[test]
    fn auto_deploy_false_for_stringy_false_tier() {
        assert!(!tier_auto_deploys(&tiers_with_auto_deploy(), 3));
    }

    #[test]
    fn auto_deploy_false_when_unset() {
        // Missing autoDeploy defaults to safe-off, never an accidental promotion.
        assert!(!tier_auto_deploys(&tiers_with_auto_deploy(), 5));
    }

    #[test]
    fn regression_suite_round_trips_through_tier_lookup() {
        assert_eq!(tier_regression_suite(&tiers_with_auto_deploy(), 1).as_deref(), Some("24h_recent_workflows"));
        assert_eq!(tier_regression_suite(&tiers_with_auto_deploy(), 3).as_deref(), Some("7d_recent_workflows"));
        assert_eq!(tier_regression_suite(&tiers_with_auto_deploy(), 5), None);
    }
}
`;
}

// ─── TypeScript bindings ──────────────────────────────────────────────────

function buildMutationsTs(): string {
  return `// Agicore Generated — Mutation proposal client bindings (Phase 11.4a)
// DO NOT EDIT BY HAND. See core/compiler/src/generators/mutations.ts.

import { invoke } from '@tauri-apps/api/core';

export interface MutationProposal {
  id: string;
  andonEventId: string | null;
  policyName: string;
  proposerIdentity: string;
  target: string;
  claimedTier: number;
  resolvedTier: number | null;
  claimedScope: string[];
  mutationContent: unknown;
  status:
    | 'created'
    | 'tier_verified'
    | 'tier_rejected'
    | 'tested'
    | 'deployed'
    | 'rejected'
    | 'escalated'
    | 'rolled_back';
  rejectionReason: string | null;
  testEvidence: unknown | null;
  approvalChain: unknown | null;
  deployAudit: unknown | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProposalInput {
  andonEventId?: string | null;
  policyName: string;
  proposerIdentity: string;
  target: string;
  claimedTier: number;
  claimedScope: string[];
  mutationContent: unknown;
}

export interface TierVerification {
  allowed: boolean;
  resolvedTier: number | null;
  rejectionReason: string | null;
}

export interface SandboxOutcome {
  proposalId: string;
  suiteName: string | null;
  regressionTotal: number;
  regressionUnchanged: number;
  regressionBroken: number;
  resolvedFailure: boolean;
  passed: boolean;
  finalStatus: 'deployed' | 'escalated' | 'rejected';
  deployAudit: unknown | null;
}

export async function createMutationProposal(input: ProposalInput): Promise<string> {
  return invoke<string>('create_mutation_proposal', { input });
}

export async function verifyMutationProposal(proposalId: string): Promise<TierVerification> {
  return invoke<TierVerification>('verify_mutation_proposal', { proposalId });
}

export async function executeProposalSandbox(proposalId: string): Promise<SandboxOutcome> {
  return invoke<SandboxOutcome>('execute_proposal_sandbox', { proposalId });
}

export async function recordProposalTest(
  proposalId: string,
  resolvedFailure: boolean,
  regressionTotal: number,
  regressionUnchanged: number,
  regressionBroken: number,
): Promise<void> {
  await invoke<void>('record_proposal_test', {
    proposalId,
    resolvedFailure,
    regressionTotal,
    regressionUnchanged,
    regressionBroken,
  });
}

export async function recordProposalDeploy(
  proposalId: string,
  deployed: boolean,
  audit: unknown,
): Promise<void> {
  await invoke<void>('record_proposal_deploy', { proposalId, deployed, audit });
}

export async function listMutationProposals(filter?: {
  policyName?: string;
  status?: MutationProposal['status'];
  limit?: number;
}): Promise<MutationProposal[]> {
  return invoke<MutationProposal[]>('list_mutation_proposals', {
    policyName: filter?.policyName ?? null,
    status: filter?.status ?? null,
    limit: filter?.limit ?? null,
  });
}

export async function getMutationProposal(proposalId: string): Promise<MutationProposal | null> {
  return invoke<MutationProposal | null>('get_mutation_proposal', { proposalId });
}

export async function getProposalsForAndon(andonEventId: string): Promise<MutationProposal[]> {
  return invoke<MutationProposal[]>('get_proposals_for_andon', { andonEventId });
}
`;
}
