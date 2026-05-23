// Andon Responder Generator
//
// Phase 11.4c of the Andon Loop architecture (see Idea Factory/andon_loop_architecture.md).
//
// Closes the Andon Loop end-to-end: an unresolved andon_event flows through
// respond_to_andon() which (1) finds the right MUTATION_POLICY by matching
// the failing workflow against policy targets, (2) generates a candidate
// mutation via the policy's ANDON_RESPONDER (stub in Phase 4c, real REASONER
// call in 4d), (3) creates a proposal, (4) verifies it via the tier verifier,
// (5) sends it to the sandbox, (6) records the proposal id back on the
// originating andon_event.row.
//
// Gated on the same condition as the mutations runtime (≥1 MUTATION_POLICY)
// so apps that haven't opted into the Andon Loop stay byte-identical.

import type { AgiFile } from '@agicore/parser';

function isEnabled(ast: AgiFile): boolean {
  return !!ast.mutationPolicies && ast.mutationPolicies.length > 0;
}

export function generateResponder(ast: AgiFile): Map<string, string> {
  const files = new Map<string, string>();
  if (!isEnabled(ast)) return files;
  files.set('src-tauri/src/commands/responder.rs', buildResponderRs());
  files.set('src/lib/responder.ts', buildResponderTs());
  return files;
}

export function responderCommandNames(ast: AgiFile): string[] {
  if (!isEnabled(ast)) return [];
  return ['respond_to_andon', 'list_andon_responder_dispositions'];
}

// ─── Rust runtime ──────────────────────────────────────────────────────────

function buildResponderRs(): string {
  return `// Agicore Generated — Andon responder (Phase 11.4c)
// DO NOT EDIT BY HAND. See core/compiler/src/generators/responder.ts.
//
// Drives the full Andon Loop: andon_event → MUTATION_POLICY lookup →
// REASONER-generated mutation → proposal → verify → sandbox → resolution.
//
// Phase 4c ships a deterministic stub responder so the wiring is exercisable
// without an AI service round-trip. Phase 4d swaps in the real REASONER
// dispatch (which already exists in commands::reasoner::execute_reasoner).

use crate::commands::mutations::{
    create_proposal_in_db, execute_sandbox, verify_and_persist,
    ProposalInput, SandboxOutcome, TierVerification,
};
use crate::db::DbPool;
use rusqlite::params;
use serde::{Deserialize, Serialize};
use tauri::State;

// ─── Public types ─────────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AndonContext {
    pub andon_event_id: String,
    pub workflow_name: Option<String>,
    pub trigger_category: String,
    pub failure_message: Option<String>,
    pub captured_state: serde_json::Value,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ResponderDraft {
    pub target: String,
    pub claimed_tier: i32,
    pub claimed_scope: Vec<String>,
    pub mutation_content: serde_json::Value,
    pub reasoning: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AndonResolution {
    pub andon_event_id: String,
    pub disposition: String,         // 'proposed' | 'no_policy' | 'no_responder' | 'no_candidate'
    pub policy_name: Option<String>,
    pub responder_name: Option<String>,
    pub proposal_id: Option<String>,
    pub verification: Option<TierVerification>,
    pub sandbox: Option<SandboxOutcome>,
    pub notes: Option<String>,
}

// ─── Policy lookup ────────────────────────────────────────────────────────

#[derive(Debug, Clone)]
struct PolicyRow {
    name: String,
    targets: Vec<String>,
    andon_responder: Option<String>,
}

fn load_all_policies(conn: &rusqlite::Connection) -> Result<Vec<PolicyRow>, String> {
    let mut stmt = conn
        .prepare("SELECT name, targets, andon_responder FROM mutation_policies")
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map([], |r| {
            let targets_str: String = r.get(1)?;
            let targets: Vec<String> = serde_json::from_str(&targets_str).unwrap_or_default();
            Ok(PolicyRow {
                name:            r.get(0)?,
                targets,
                andon_responder: r.get(2)?,
            })
        })
        .map_err(|e| e.to_string())?;
    let mut out = Vec::new();
    for r in rows { out.push(r.map_err(|e| e.to_string())?); }
    Ok(out)
}

/// Find the most-specific policy whose targets include the failing workflow.
/// When multiple policies match (rare), the first declared wins — declaration
/// order is the deterministic tiebreak.
fn policy_for_workflow<'a>(policies: &'a [PolicyRow], workflow_name: &str) -> Option<&'a PolicyRow> {
    policies.iter().find(|p| p.targets.iter().any(|t| t == workflow_name))
}

// ─── Stub responder (Phase 4c) ────────────────────────────────────────────

/// Generate a candidate mutation from the andon context. Phase 4c is a
/// deterministic stub:
///
///  - trigger 'no_rule_match'   → propose a T1 RULES_modify (add catchall)
///  - trigger 'score_threshold' → propose a T1 RULES_modify (lower threshold)
///  - trigger 'guard_failure'   → propose a T1 RULES_modify (add bypass rule)
///  - other categories          → returns None; the responder escalates with
///                                disposition='no_candidate' so a human can
///                                pick it up. Better to surface "I don't know"
///                                than to invent a low-quality mutation.
///
/// Phase 4d replaces the body of this function with a real REASONER call.
/// The signature stays stable: andon context in → draft (or None) out.
pub fn generate_stub_response(ctx: &AndonContext, target: &str) -> Option<ResponderDraft> {
    let category = ctx.trigger_category.as_str();
    match category {
        "no_rule_match" => Some(ResponderDraft {
            target: target.to_string(),
            claimed_tier: 1,
            claimed_scope: vec!["RULES_modify".to_string()],
            mutation_content: serde_json::json!({
                "kind":   "add_catchall_rule",
                "reason": format!("No rule matched in {}; proposing catchall to prevent re-pull", target),
                "rule": {
                    "name":      "auto_catchall_v1",
                    "condition": "TRUE",
                    "action":    "log_unclassified_event",
                },
            }),
            reasoning: format!(
                "Andon trigger '{}' — no classifier matched. Stub responder proposes a catchall rule to halt the andon and route unclassified events to a logging sink.",
                category
            ),
        }),
        "score_threshold" => Some(ResponderDraft {
            target: target.to_string(),
            claimed_tier: 1,
            claimed_scope: vec!["RULES_modify".to_string()],
            mutation_content: serde_json::json!({
                "kind":   "adjust_threshold",
                "reason": "Score below threshold; relaxing by 10%",
                "target_rule": "score_gate",
                "old_threshold_hint": 0.7,
                "new_threshold_hint": 0.63,
            }),
            reasoning: format!(
                "Andon trigger '{}' — score below threshold. Stub responder proposes a 10% threshold relaxation as the simplest mutation to unblock.",
                category
            ),
        }),
        "guard_failure" => Some(ResponderDraft {
            target: target.to_string(),
            claimed_tier: 1,
            claimed_scope: vec!["RULES_modify".to_string()],
            mutation_content: serde_json::json!({
                "kind":   "bypass_rule",
                "reason": "Guard rule rejected input that the andon trace shows is benign",
                "guard": "ingress_validation",
                "captured_input_sketch": ctx.captured_state.clone(),
            }),
            reasoning: format!(
                "Andon trigger '{}' — guard failure. Stub responder proposes a narrow bypass rule limited to the captured input shape.",
                category
            ),
        }),
        // For action_error, timeout, response_unparseable etc — escalate.
        // Stub doesn't pretend to know how to fix execution-layer faults;
        // those need real reasoning + often a human.
        _ => None,
    }
}

// ─── Andon → resolution pipeline ──────────────────────────────────────────

fn load_andon_context(conn: &rusqlite::Connection, andon_event_id: &str) -> Result<AndonContext, String> {
    let (workflow_name, trigger_category, failure_message, captured_state_str): (Option<String>, String, Option<String>, String) = conn
        .query_row(
            "SELECT workflow_name, trigger_category, failure_message, captured_state FROM andon_events WHERE id = ?",
            params![andon_event_id],
            |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?, r.get(3)?)),
        )
        .map_err(|e| format!("Andon event '{}' not found: {}", andon_event_id, e))?;
    let captured_state: serde_json::Value = serde_json::from_str(&captured_state_str)
        .unwrap_or(serde_json::Value::Null);
    Ok(AndonContext {
        andon_event_id: andon_event_id.to_string(),
        workflow_name,
        trigger_category,
        failure_message,
        captured_state,
    })
}

fn link_proposal_to_andon(db: &DbPool, andon_event_id: &str, proposal_id: &str) -> Result<(), String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "UPDATE andon_events SET resolution_mutation_id = ?, resolved_at = datetime('now') WHERE id = ?",
        params![proposal_id, andon_event_id],
    ).map_err(|e| e.to_string())?;
    Ok(())
}

/// The canonical end-to-end Andon Loop step.
///
/// Maps any one andon_event to an AndonResolution describing what happened:
///  - 'no_policy'    → no MUTATION_POLICY targets the failing workflow
///  - 'no_responder' → policy matched but ANDON_RESPONDER not declared
///  - 'no_candidate' → responder ran but declined to propose a mutation
///  - 'proposed'     → proposal created; carries verification + sandbox results
///
/// The resolution_mutation_id on the andon_event is updated only for the
/// 'proposed' disposition (the rest leave the andon open for a human).
pub fn respond_to_andon_impl(db: &DbPool, andon_event_id: &str) -> Result<AndonResolution, String> {
    // 1) Load andon context.
    let ctx = {
        let conn = db.lock().map_err(|e| e.to_string())?;
        load_andon_context(&conn, andon_event_id)?
    };

    let workflow_name = ctx.workflow_name.clone().unwrap_or_default();

    // 2) Find policy for this workflow.
    let policies = {
        let conn = db.lock().map_err(|e| e.to_string())?;
        load_all_policies(&conn)?
    };
    let policy = match policy_for_workflow(&policies, &workflow_name) {
        Some(p) => p.clone(),
        None => {
            return Ok(AndonResolution {
                andon_event_id: andon_event_id.to_string(),
                disposition: "no_policy".to_string(),
                policy_name: None,
                responder_name: None,
                proposal_id: None,
                verification: None,
                sandbox: None,
                notes: Some(format!("No MUTATION_POLICY targets workflow '{}'", workflow_name)),
            });
        }
    };

    let responder_name = match &policy.andon_responder {
        Some(r) => r.clone(),
        None => {
            return Ok(AndonResolution {
                andon_event_id: andon_event_id.to_string(),
                disposition: "no_responder".to_string(),
                policy_name: Some(policy.name.clone()),
                responder_name: None,
                proposal_id: None,
                verification: None,
                sandbox: None,
                notes: Some(format!("Policy '{}' has no ANDON_RESPONDER declared", policy.name)),
            });
        }
    };

    // 3) Generate candidate via stub responder (Phase 4d swaps real REASONER here).
    let target_for_proposal = workflow_name.clone();
    let draft = match generate_stub_response(&ctx, &target_for_proposal) {
        Some(d) => d,
        None => {
            return Ok(AndonResolution {
                andon_event_id: andon_event_id.to_string(),
                disposition: "no_candidate".to_string(),
                policy_name: Some(policy.name.clone()),
                responder_name: Some(responder_name),
                proposal_id: None,
                verification: None,
                sandbox: None,
                notes: Some(format!(
                    "Responder declined to propose for trigger '{}' — escalating for human review",
                    ctx.trigger_category
                )),
            });
        }
    };

    // 4) Create proposal.
    let proposer_identity = format!("responder:{}", responder_name);
    let input = ProposalInput {
        andon_event_id: Some(andon_event_id.to_string()),
        policy_name: policy.name.clone(),
        proposer_identity,
        target: draft.target,
        claimed_tier: draft.claimed_tier,
        claimed_scope: draft.claimed_scope,
        mutation_content: serde_json::json!({
            "reasoning": draft.reasoning,
            "mutation":  draft.mutation_content,
        }),
    };
    let proposal_id = create_proposal_in_db(db, &input)?;

    // 5) Verify.
    let verification = verify_and_persist(db, &proposal_id)?;

    // 6) Sandbox if the verifier allowed it. Otherwise the proposal sits in
    //    tier_rejected and the responder reports the verification result.
    let sandbox = if verification.allowed {
        Some(execute_sandbox(db, &proposal_id)?)
    } else {
        None
    };

    // 7) Link the proposal back to the andon event regardless of disposition.
    //    Even a tier_rejected attempt counts as "we tried" — the audit trail
    //    shows what the responder did.
    link_proposal_to_andon(db, andon_event_id, &proposal_id)?;

    Ok(AndonResolution {
        andon_event_id: andon_event_id.to_string(),
        disposition: "proposed".to_string(),
        policy_name: Some(policy.name),
        responder_name: Some(responder_name),
        proposal_id: Some(proposal_id),
        verification: Some(verification),
        sandbox,
        notes: None,
    })
}

// ─── Tauri commands ──────────────────────────────────────────────────────

#[tauri::command]
pub fn respond_to_andon(
    db: State<'_, DbPool>,
    andon_event_id: String,
) -> Result<AndonResolution, String> {
    respond_to_andon_impl(db.inner(), &andon_event_id)
}

#[tauri::command]
pub fn list_andon_responder_dispositions() -> Result<Vec<&'static str>, String> {
    // Static enumeration — handy for clients that want to render a legend.
    Ok(vec!["proposed", "no_policy", "no_responder", "no_candidate"])
}

#[cfg(test)]
mod tests {
    use super::*;

    fn ctx(category: &str) -> AndonContext {
        AndonContext {
            andon_event_id: "e1".to_string(),
            workflow_name: Some("order_flow".to_string()),
            trigger_category: category.to_string(),
            failure_message: None,
            captured_state: serde_json::json!({ "step": "validate" }),
        }
    }

    #[test]
    fn stub_proposes_for_no_rule_match() {
        let r = generate_stub_response(&ctx("no_rule_match"), "alert_rules");
        assert!(r.is_some());
        let d = r.unwrap();
        assert_eq!(d.claimed_tier, 1);
        assert_eq!(d.claimed_scope, vec!["RULES_modify".to_string()]);
        assert_eq!(d.target, "alert_rules");
        assert!(d.reasoning.contains("no_rule_match"));
    }

    #[test]
    fn stub_proposes_for_score_threshold() {
        let r = generate_stub_response(&ctx("score_threshold"), "alert_rules");
        assert!(r.is_some());
        let d = r.unwrap();
        assert_eq!(d.mutation_content.get("kind").and_then(|v| v.as_str()), Some("adjust_threshold"));
    }

    #[test]
    fn stub_proposes_for_guard_failure() {
        let r = generate_stub_response(&ctx("guard_failure"), "alert_rules");
        assert!(r.is_some());
    }

    #[test]
    fn stub_declines_for_action_error() {
        // Execution-layer errors get escalated, not auto-mutated.
        let r = generate_stub_response(&ctx("action_error"), "alert_rules");
        assert!(r.is_none());
    }

    #[test]
    fn stub_declines_for_timeout() {
        let r = generate_stub_response(&ctx("timeout"), "alert_rules");
        assert!(r.is_none());
    }

    #[test]
    fn policy_lookup_finds_matching_workflow() {
        let policies = vec![
            PolicyRow {
                name: "ops".to_string(),
                targets: vec!["order_flow".to_string(), "refund_flow".to_string()],
                andon_responder: Some("ops_responder".to_string()),
            },
            PolicyRow {
                name: "billing".to_string(),
                targets: vec!["invoice_flow".to_string()],
                andon_responder: None,
            },
        ];
        let hit = policy_for_workflow(&policies, "refund_flow");
        assert!(hit.is_some());
        assert_eq!(hit.unwrap().name, "ops");
    }

    #[test]
    fn policy_lookup_misses_unknown_workflow() {
        let policies = vec![
            PolicyRow {
                name: "ops".to_string(),
                targets: vec!["order_flow".to_string()],
                andon_responder: Some("r".to_string()),
            },
        ];
        assert!(policy_for_workflow(&policies, "no_such_flow").is_none());
    }
}
`;
}

// ─── TypeScript bindings ──────────────────────────────────────────────────

function buildResponderTs(): string {
  return `// Agicore Generated — Andon responder client bindings (Phase 11.4c)
// DO NOT EDIT BY HAND. See core/compiler/src/generators/responder.ts.

import { invoke } from '@tauri-apps/api/core';
import type { TierVerification, SandboxOutcome } from './mutations';

export type AndonResponderDisposition =
  | 'proposed'
  | 'no_policy'
  | 'no_responder'
  | 'no_candidate';

export interface AndonResolution {
  andonEventId: string;
  disposition: AndonResponderDisposition;
  policyName: string | null;
  responderName: string | null;
  proposalId: string | null;
  verification: TierVerification | null;
  sandbox: SandboxOutcome | null;
  notes: string | null;
}

export async function respondToAndon(andonEventId: string): Promise<AndonResolution> {
  return invoke<AndonResolution>('respond_to_andon', { andonEventId });
}

export async function listAndonResponderDispositions(): Promise<AndonResponderDisposition[]> {
  return invoke<AndonResponderDisposition[]>('list_andon_responder_dispositions');
}
`;
}
