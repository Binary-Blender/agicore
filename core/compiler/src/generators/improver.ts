// Improvement Reasoner Generator
//
// Phase 11.5a of the Andon Loop architecture (see Idea Factory/andon_loop_architecture.md).
//
// Adds the proactive (kaizen) entry into the proposal lifecycle. Where Phase
// 4c's responder is *reactive* (an andon fires → propose a fix), the improver
// is *scheduled* (look at recent runs → propose an improvement).
//
// Both paths produce the same artifact — a MutationProposal — and run through
// the same verify+sandbox+deploy lifecycle. The tier verifier still gates,
// AUTO_DEPLOY still decides deploy vs escalate. The only difference is the
// proposer_identity ("improver:<reasoner>" vs "responder:<reasoner>") and the
// presence/absence of an andon_event_id linkage.
//
// Phase 5a ships a deterministic stub improver: it picks the policy, looks for
// any recent workflow_run, and proposes a low-risk RULES_modify (e.g., minor
// threshold tweak). Real REASONER dispatch arrives in Phase 5b/c alongside
// the NBVE shadow-evaluation substrate.
//
// Gated on the same condition as the mutations runtime (≥1 MUTATION_POLICY).

import type { AgiFile } from '@agicore/parser';

function isEnabled(ast: AgiFile): boolean {
  return !!ast.mutationPolicies && ast.mutationPolicies.length > 0;
}

export function generateImprover(ast: AgiFile): Map<string, string> {
  const files = new Map<string, string>();
  if (!isEnabled(ast)) return files;
  files.set('src-tauri/src/commands/improver.rs', buildImproverRs(ast));
  files.set('src/lib/improver.ts', buildImproverTs());
  return files;
}

export function improverCommandNames(ast: AgiFile): string[] {
  if (!isEnabled(ast)) return [];
  return [
    'run_improvement_cycle',
    'list_improvement_cycles',
    'record_ai_improvement_cycle',   // Phase 11.5c
  ];
}

/**
 * Returns true if the app has at least one (policy, reasoner, schedulable
 * cadence) triple — i.e., a kaizen loop the scheduler should drive.
 * The main.rs setup hook calls start_improvement_scheduler only when this
 * is true, so apps without scheduled improvers don't spawn an idle task.
 */
export function hasImprovementSchedule(ast: AgiFile): boolean {
  if (!isEnabled(ast)) return false;
  return collectScheduledImprovers(ast).length > 0;
}

interface ScheduledImprover {
  policyName: string;
  reasonerName: string;
  schedule: string;
  intervalSecs: number;
}

/** Map a ReasonerSchedule string to a polling interval in seconds.
 *  Returns null for non-schedulable cadences (on_demand, event_triggered)
 *  and for unrecognised strings (the kaizen loop is opt-in, not opt-out). */
function scheduleToSeconds(schedule: string): number | null {
  switch (schedule) {
    case 'hourly':           return 3600;
    case 'daily':            return 86400;
    case 'weekly':           return 604800;
    case 'on_demand':        return null;
    case 'event_triggered':  return null;
    default:                 return null;  // custom strings → manual trigger only for now
  }
}

function collectScheduledImprovers(ast: AgiFile): ScheduledImprover[] {
  const out: ScheduledImprover[] = [];
  for (const policy of ast.mutationPolicies ?? []) {
    const reasonerName = policy.improvementReasoner;
    if (!reasonerName) continue;
    const reasoner = ast.reasoners.find((r) => r.name === reasonerName);
    if (!reasoner) continue;  // validator already warns about dangling refs
    const interval = scheduleToSeconds(reasoner.schedule);
    if (interval === null) continue;
    out.push({
      policyName:    policy.name,
      reasonerName:  reasoner.name,
      schedule:      reasoner.schedule,
      intervalSecs:  interval,
    });
  }
  return out;
}

// ─── Rust runtime ──────────────────────────────────────────────────────────

function buildSchedulerBlock(scheduled: ScheduledImprover[]): string {
  // Always emit the start_improvement_scheduler function — main.rs calls
  // it whenever any policy declares an IMPROVEMENT_REASONER (regardless of
  // schedule), and downstream test fixtures expect it to be defined. When
  // no schedulable cadences exist, the body is a no-op (`let _ = db;`) so
  // the function signature stays stable.
  const tasks = scheduled.length === 0
    ? '    let _ = db;'
    : scheduled.map((s) => `
    // ${s.policyName} (reasoner: ${s.reasonerName}, schedule: ${s.schedule})
    {
        let db_clone = db.clone();
        tauri::async_runtime::spawn(async move {
            // Initial delay so the scheduler doesn't run during app warm-up.
            tokio::time::sleep(tokio::time::Duration::from_secs(60)).await;
            let mut ticker = tokio::time::interval(tokio::time::Duration::from_secs(${s.intervalSecs}));
            // First tick fires immediately; we already paused 60s, so consume it
            // and only ACT on subsequent ticks. That keeps the first run aligned
            // with the declared cadence rather than firing twice at startup.
            ticker.tick().await;
            loop {
                ticker.tick().await;
                match run_improvement_cycle_impl(&db_clone, "${s.policyName}") {
                    Ok(cycle) => eprintln!(
                        "[improver] policy={} disposition={} proposalId={:?}",
                        cycle.policy_name, cycle.disposition, cycle.proposal_id,
                    ),
                    Err(e) => eprintln!(
                        "[improver] policy=${s.policyName} cycle failed: {}",
                        e
                    ),
                }
            }
        });
    }
`).join('');
  return `
// ─── Phase 5b — Self-driving scheduler ────────────────────────────────────
//
// Spawns one independent task per (policy, reasoner) with a schedulable
// cadence. Tasks live for the lifetime of the app process. Failure in one
// loop doesn't affect the others.
//
// Schedulable cadences map to seconds at codegen time:
//   hourly  =     3600s
//   daily   =    86400s
//   weekly  =   604800s
//   on_demand / event_triggered / custom → not scheduled (manual trigger only)

pub fn start_improvement_scheduler(db: crate::db::DbPool) {
${tasks}
}
`;
}

function buildImproverRs(ast: AgiFile): string {
  const scheduled = collectScheduledImprovers(ast);
  const schedulerBlock = buildSchedulerBlock(scheduled);
  return `// Agicore Generated — Improvement reasoner (Phase 11.5a + 11.5b scheduler)
// DO NOT EDIT BY HAND. See core/compiler/src/generators/improver.ts.
//
// Scheduled / on-demand kaizen entry into the proposal lifecycle. Runs the
// IMPROVEMENT_REASONER for a given MUTATION_POLICY, drafts a candidate
// improvement, and pipes it through the same proposal pipeline that the
// andon responder uses.
//
// Disposition contract mirrors the responder's:
//   'proposed'       proposal created (carries verification + sandbox)
//   'no_policy'      no MUTATION_POLICY by that name
//   'no_reasoner'    policy exists but IMPROVEMENT_REASONER not declared
//   'no_candidate'   reasoner declined (insufficient signal in recent data)

use crate::commands::mutations::{
    create_proposal_in_db, execute_sandbox, verify_and_persist,
    ProposalInput, SandboxOutcome, TierVerification,
};
use crate::db::DbPool;
use rusqlite::params;
use serde::{Deserialize, Serialize};
use tauri::State;
use uuid::Uuid;

// ─── Public types ─────────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ImprovementCycle {
    pub id: String,
    pub policy_name: String,
    pub reasoner_name: Option<String>,
    pub disposition: String,
    pub proposal_id: Option<String>,
    pub verification: Option<TierVerification>,
    pub sandbox: Option<SandboxOutcome>,
    pub recent_runs_scanned: i64,
    pub notes: Option<String>,
    pub started_at: String,
    pub completed_at: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ImprovementDraft {
    pub target: String,
    pub claimed_tier: i32,
    pub claimed_scope: Vec<String>,
    pub mutation_content: serde_json::Value,
    pub reasoning: String,
}

// ─── Stub reasoner (Phase 5a) ─────────────────────────────────────────────

/// Generate an improvement candidate from a scan of recent activity. Phase
/// 5a is a deterministic stub: if any recent runs exist, propose a tiny T1
/// rule tweak; otherwise decline (insufficient signal).
///
/// Phase 5b/c replaces this with: (1) a real telemetry scan that identifies
/// candidates (low-confidence rule hits, recurring score-threshold misses,
/// stale rules with zero matches in N days), and (2) a real REASONER call
/// that consumes those candidates and proposes mutations. The interface
/// stays stable: (target, recent_runs) → draft (or None).
pub fn generate_stub_improvement(
    target: &str,
    recent_runs_scanned: i64,
) -> Option<ImprovementDraft> {
    if recent_runs_scanned == 0 {
        return None;
    }
    Some(ImprovementDraft {
        target: target.to_string(),
        claimed_tier: 1,
        claimed_scope: vec!["RULES_modify".to_string()],
        mutation_content: serde_json::json!({
            "kind":   "tighten_threshold",
            "reason": "Stub kaizen — proposing a 5% threshold tightening to surface borderline cases for review",
            "target_rule":          "score_gate",
            "old_threshold_hint":   0.70,
            "new_threshold_hint":   0.735,
            "expected_effect":      "marginal increase in escalation rate; expected zero false positives based on recent traffic shape",
        }),
        reasoning: format!(
            "Stub improver scanned {} recent run(s) on '{}' and proposes a low-risk threshold tightening. The mutation runs the same regression suite as andon-triggered proposals; if it doesn't strictly improve, it will be rejected or escalated.",
            recent_runs_scanned, target
        ),
    })
}

// ─── Persistence helpers ─────────────────────────────────────────────────

fn count_recent_completed_runs(db: &DbPool, workflow_name: &str) -> Result<i64, String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    let n: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM workflow_runs WHERE workflow_name = ? AND status = 'completed' AND started_at > datetime('now', '-7 days')",
            params![workflow_name],
            |r| r.get(0),
        )
        .unwrap_or(0);
    Ok(n)
}

#[derive(Debug, Clone)]
struct PolicySnapshot {
    name: String,
    targets: Vec<String>,
    improvement_reasoner: Option<String>,
}

fn load_policy(db: &DbPool, policy_name: &str) -> Result<Option<PolicySnapshot>, String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    let row = conn.query_row(
        "SELECT name, targets, improvement_reasoner FROM mutation_policies WHERE name = ?",
        params![policy_name],
        |r| {
            let targets_str: String = r.get(1)?;
            let targets: Vec<String> = serde_json::from_str(&targets_str).unwrap_or_default();
            Ok(PolicySnapshot {
                name: r.get(0)?,
                targets,
                improvement_reasoner: r.get(2)?,
            })
        },
    );
    match row {
        Ok(p) => Ok(Some(p)),
        Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
        Err(e) => Err(e.to_string()),
    }
}

fn ensure_cycles_table(db: &DbPool) -> Result<(), String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    conn.execute_batch(
        "CREATE TABLE IF NOT EXISTS improvement_cycles (
            id                    TEXT PRIMARY KEY,
            policy_name           TEXT NOT NULL,
            reasoner_name         TEXT,
            disposition           TEXT NOT NULL,
            proposal_id           TEXT,
            recent_runs_scanned   INTEGER NOT NULL DEFAULT 0,
            notes                 TEXT,
            started_at            TEXT NOT NULL,
            completed_at          TEXT
         );
         CREATE INDEX IF NOT EXISTS idx_improvement_cycles_policy ON improvement_cycles(policy_name, started_at DESC);",
    ).map_err(|e| e.to_string())?;
    Ok(())
}

fn insert_cycle_row(
    db: &DbPool,
    id: &str,
    policy_name: &str,
    reasoner_name: Option<&str>,
    disposition: &str,
    proposal_id: Option<&str>,
    recent_runs_scanned: i64,
    notes: Option<&str>,
    started_at: &str,
    completed_at: &str,
) -> Result<(), String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "INSERT INTO improvement_cycles (id, policy_name, reasoner_name, disposition, proposal_id, recent_runs_scanned, notes, started_at, completed_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
        params![id, policy_name, reasoner_name, disposition, proposal_id, recent_runs_scanned, notes, started_at, completed_at],
    ).map_err(|e| e.to_string())?;
    Ok(())
}

// ─── Pipeline ─────────────────────────────────────────────────────────────

pub fn run_improvement_cycle_impl(db: &DbPool, policy_name: &str) -> Result<ImprovementCycle, String> {
    ensure_cycles_table(db)?;
    let cycle_id   = Uuid::new_v4().to_string();
    let started_at = chrono::Utc::now().to_rfc3339();

    // 1) Load the policy.
    let policy = match load_policy(db, policy_name)? {
        Some(p) => p,
        None => {
            let cycle = build_cycle(
                &cycle_id, policy_name, None, "no_policy",
                None, None, None, 0,
                Some(format!("Policy '{}' not declared", policy_name)),
                &started_at,
            );
            insert_cycle_row(db, &cycle.id, &cycle.policy_name, cycle.reasoner_name.as_deref(),
                &cycle.disposition, cycle.proposal_id.as_deref(), cycle.recent_runs_scanned,
                cycle.notes.as_deref(), &cycle.started_at, cycle.completed_at.as_deref().unwrap_or(&started_at))?;
            return Ok(cycle);
        }
    };

    let reasoner_name = match &policy.improvement_reasoner {
        Some(r) => r.clone(),
        None => {
            let cycle = build_cycle(
                &cycle_id, &policy.name, None, "no_reasoner",
                None, None, None, 0,
                Some(format!("Policy '{}' has no IMPROVEMENT_REASONER declared", policy.name)),
                &started_at,
            );
            insert_cycle_row(db, &cycle.id, &cycle.policy_name, cycle.reasoner_name.as_deref(),
                &cycle.disposition, cycle.proposal_id.as_deref(), cycle.recent_runs_scanned,
                cycle.notes.as_deref(), &cycle.started_at, cycle.completed_at.as_deref().unwrap_or(&started_at))?;
            return Ok(cycle);
        }
    };

    // 2) Pick a target — Phase 5a uses the first policy target. Real
    //    reasoner will choose the highest-signal target across the set.
    let target = policy.targets.first().cloned().unwrap_or_default();

    // 3) Scan recent activity for that target.
    let recent_runs_scanned = if target.is_empty() {
        0
    } else {
        count_recent_completed_runs(db, &target).unwrap_or(0)
    };

    // 4) Generate candidate.
    let draft = match generate_stub_improvement(&target, recent_runs_scanned) {
        Some(d) => d,
        None => {
            let cycle = build_cycle(
                &cycle_id, &policy.name, Some(reasoner_name.clone()), "no_candidate",
                None, None, None, recent_runs_scanned,
                Some("Insufficient signal in recent runs to propose an improvement".to_string()),
                &started_at,
            );
            insert_cycle_row(db, &cycle.id, &cycle.policy_name, cycle.reasoner_name.as_deref(),
                &cycle.disposition, cycle.proposal_id.as_deref(), cycle.recent_runs_scanned,
                cycle.notes.as_deref(), &cycle.started_at, cycle.completed_at.as_deref().unwrap_or(&started_at))?;
            return Ok(cycle);
        }
    };

    // 5) Run through proposal pipeline.
    let proposer_identity = format!("improver:{}", reasoner_name);
    let input = ProposalInput {
        andon_event_id: None,
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
    let verification = verify_and_persist(db, &proposal_id)?;
    let sandbox = if verification.allowed {
        Some(execute_sandbox(db, &proposal_id)?)
    } else {
        None
    };

    let cycle = build_cycle(
        &cycle_id, &policy.name, Some(reasoner_name),
        "proposed",
        Some(proposal_id.clone()),
        Some(verification),
        sandbox,
        recent_runs_scanned,
        None,
        &started_at,
    );
    insert_cycle_row(db, &cycle.id, &cycle.policy_name, cycle.reasoner_name.as_deref(),
        &cycle.disposition, cycle.proposal_id.as_deref(), cycle.recent_runs_scanned,
        cycle.notes.as_deref(), &cycle.started_at, cycle.completed_at.as_deref().unwrap_or(&started_at))?;
    Ok(cycle)
}

#[allow(clippy::too_many_arguments)]
fn build_cycle(
    cycle_id: &str,
    policy_name: &str,
    reasoner_name: Option<String>,
    disposition: &str,
    proposal_id: Option<String>,
    verification: Option<TierVerification>,
    sandbox: Option<SandboxOutcome>,
    recent_runs_scanned: i64,
    notes: Option<String>,
    started_at: &str,
) -> ImprovementCycle {
    let completed_at = chrono::Utc::now().to_rfc3339();
    ImprovementCycle {
        id: cycle_id.to_string(),
        policy_name: policy_name.to_string(),
        reasoner_name,
        disposition: disposition.to_string(),
        proposal_id,
        verification,
        sandbox,
        recent_runs_scanned,
        notes,
        started_at: started_at.to_string(),
        completed_at: Some(completed_at),
    }
}

// ─── Tauri commands ──────────────────────────────────────────────────────

#[tauri::command]
pub fn run_improvement_cycle(
    db: State<'_, DbPool>,
    policy_name: String,
) -> Result<ImprovementCycle, String> {
    run_improvement_cycle_impl(db.inner(), &policy_name)
}

/// Phase 11.5c — Record an AI-orchestrated improvement cycle. The TS path
/// (runImprovementCycleWithAI) runs the proposal lifecycle itself via the
/// existing commands, then calls this to persist a tracking row in
/// improvement_cycles. This keeps the persistence model uniform across
/// the deterministic Rust path and the AI-orchestrated TS path.
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AiCycleInput {
    pub policy_name:           String,
    pub reasoner_name:         Option<String>,
    pub disposition:           String,        // 'proposed' | 'no_candidate' | etc
    pub proposal_id:           Option<String>,
    pub recent_runs_scanned:   i64,
    pub notes:                 Option<String>,
}

#[tauri::command]
pub fn record_ai_improvement_cycle(
    db: State<'_, DbPool>,
    input: AiCycleInput,
) -> Result<ImprovementCycle, String> {
    ensure_cycles_table(db.inner())?;
    let id = Uuid::new_v4().to_string();
    let now = chrono::Utc::now().to_rfc3339();
    insert_cycle_row(
        db.inner(),
        &id,
        &input.policy_name,
        input.reasoner_name.as_deref(),
        &input.disposition,
        input.proposal_id.as_deref(),
        input.recent_runs_scanned,
        input.notes.as_deref(),
        &now,
        &now,
    )?;
    Ok(ImprovementCycle {
        id,
        policy_name:        input.policy_name,
        reasoner_name:      input.reasoner_name,
        disposition:        input.disposition,
        proposal_id:        input.proposal_id,
        verification:       None,
        sandbox:            None,
        recent_runs_scanned: input.recent_runs_scanned,
        notes:              input.notes,
        started_at:         now.clone(),
        completed_at:       Some(now),
    })
}

#[tauri::command]
pub fn list_improvement_cycles(
    db: State<'_, DbPool>,
    policy_name: Option<String>,
    limit: Option<i64>,
) -> Result<Vec<ImprovementCycle>, String> {
    ensure_cycles_table(db.inner())?;
    let conn = db.lock().map_err(|e| e.to_string())?;
    let lim = limit.unwrap_or(50).clamp(1, 1000);
    let mut sql = String::from(
        "SELECT id, policy_name, reasoner_name, disposition, proposal_id, recent_runs_scanned, notes, started_at, completed_at FROM improvement_cycles WHERE 1=1"
    );
    let mut args: Vec<String> = Vec::new();
    if let Some(pn) = &policy_name { sql.push_str(" AND policy_name = ?"); args.push(pn.clone()); }
    sql.push_str(" ORDER BY started_at DESC LIMIT ?");
    let mut stmt = conn.prepare(&sql).map_err(|e| e.to_string())?;
    let param_refs: Vec<&dyn rusqlite::ToSql> = args
        .iter()
        .map(|s| s as &dyn rusqlite::ToSql)
        .chain(std::iter::once(&lim as &dyn rusqlite::ToSql))
        .collect();
    let rows = stmt
        .query_map(param_refs.as_slice(), |row| {
            Ok(ImprovementCycle {
                id: row.get(0)?,
                policy_name: row.get(1)?,
                reasoner_name: row.get(2)?,
                disposition: row.get(3)?,
                proposal_id: row.get(4)?,
                verification: None,   // not denormalised onto the cycle row; fetch via proposal_id
                sandbox: None,
                recent_runs_scanned: row.get(5)?,
                notes: row.get(6)?,
                started_at: row.get(7)?,
                completed_at: row.get(8)?,
            })
        })
        .map_err(|e| e.to_string())?;
    let mut out = Vec::new();
    for r in rows { out.push(r.map_err(|e| e.to_string())?); }
    Ok(out)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn stub_declines_when_no_recent_runs() {
        let r = generate_stub_improvement("order_flow", 0);
        assert!(r.is_none(), "no signal → no candidate");
    }

    #[test]
    fn stub_proposes_when_runs_exist() {
        let r = generate_stub_improvement("order_flow", 50);
        assert!(r.is_some());
        let d = r.unwrap();
        assert_eq!(d.claimed_tier, 1);
        assert_eq!(d.claimed_scope, vec!["RULES_modify".to_string()]);
        assert_eq!(d.target, "order_flow");
        // Tightening, not loosening — kaizen is conservative
        let kind = d.mutation_content.get("kind").and_then(|v| v.as_str());
        assert_eq!(kind, Some("tighten_threshold"));
        let new_hint = d.mutation_content.get("new_threshold_hint").and_then(|v| v.as_f64()).unwrap_or(0.0);
        let old_hint = d.mutation_content.get("old_threshold_hint").and_then(|v| v.as_f64()).unwrap_or(0.0);
        assert!(new_hint > old_hint, "tightening should raise the threshold");
    }

    #[test]
    fn stub_reasoning_mentions_run_count() {
        let r = generate_stub_improvement("flow_x", 42).unwrap();
        assert!(r.reasoning.contains("42"), "reasoning explains the scan basis");
    }
}
${schedulerBlock}`;
}

// ─── TypeScript bindings ──────────────────────────────────────────────────

function buildImproverTs(): string {
  return `// Agicore Generated — Improvement reasoner client bindings (Phase 11.5a)
// DO NOT EDIT BY HAND. See core/compiler/src/generators/improver.ts.

import { invoke } from '@tauri-apps/api/core';
import type { TierVerification, SandboxOutcome } from './mutations';

export type ImprovementDisposition =
  | 'proposed'
  | 'no_policy'
  | 'no_reasoner'
  | 'no_candidate';

export interface ImprovementCycle {
  id: string;
  policyName: string;
  reasonerName: string | null;
  disposition: ImprovementDisposition;
  proposalId: string | null;
  verification: TierVerification | null;
  sandbox: SandboxOutcome | null;
  recentRunsScanned: number;
  notes: string | null;
  startedAt: string;
  completedAt: string | null;
}

export async function runImprovementCycle(policyName: string): Promise<ImprovementCycle> {
  return invoke<ImprovementCycle>('run_improvement_cycle', { policyName });
}

export async function listImprovementCycles(filter?: {
  policyName?: string;
  limit?: number;
}): Promise<ImprovementCycle[]> {
  return invoke<ImprovementCycle[]>('list_improvement_cycles', {
    policyName: filter?.policyName ?? null,
    limit:      filter?.limit ?? null,
  });
}

// ─── Phase 11.5c — Real AI improver (TS-orchestrated) ─────────────────────
//
// runImprovementCycle (above) uses a deterministic stub that proposes a
// conservative threshold tweak when any recent runs exist. runImprovementCycleWithAI
// instead calls send_chat with a JSON-output prompt, parses the result,
// and runs it through the same verify+sandbox pipeline.
//
// Usage:
//   const cycle = await runImprovementCycleWithAI({
//     policyName:       'ops_mutation_policy',
//     proposerIdentity: \`improver-ai:claude-sonnet-4-6:\${user.id}\`,
//     model:            'claude-sonnet-4-6',
//     contextSummary:   'Last 50 runs averaged 92% accuracy with 3 borderline misses on stripe webhook events.',
//   });

interface ChatResponseImp { content: string; model: string; provider: string; }

export interface ImprovementDraftFromAI {
  target: string;
  claimedTier: number;
  claimedScope: string[];
  mutationContent: unknown;
  reasoning: string;
}

export interface AiImproverParams {
  policyName: string;
  proposerIdentity: string;
  model: string;
  /** Optional caller-supplied summary of recent activity to focus the AI's attention.
   *  When omitted, a generic "improve the system" prompt is used. */
  contextSummary?: string;
  /** Override the default system prompt (advanced). */
  systemPrompt?: string;
}

export function defaultImproverSystemPrompt(): string {
  return [
    'You are an improvement reasoner for an AI-authored expert system. Your job is the kaizen role: surface small, low-risk improvements based on observed system behavior, without breaking anything that currently works.',
    '',
    'Respond with EXACTLY one JSON object matching this shape (no prose, no code fences):',
    '{',
    '  "target":          "<name of the module/workflow to refine>",',
    '  "claimed_tier":    <integer 1-5; prefer the LOWEST tier that suffices>,',
    '  "claimed_scope":   ["RULES_modify" | "WORKFLOW_modify" | ...],',
    '  "mutation_content": { "kind": "<change kind>", ...details... },',
    '  "reasoning":       "<one sentence explaining the expected improvement>"',
    '}',
    '',
    'If you do not see a clear improvement to propose, respond instead with:',
    '{ "decline": true, "reason": "<short reason>" }',
    '',
    'Rules:',
    '- Prefer CONSERVATIVE tweaks (e.g., tightening thresholds, adding catchall rules) over disruptive ones.',
    '- Prefer the smallest tier that genuinely covers your scope.',
    '- If recent activity does not warrant a change, decline — the regression suite penalises noise.',
    '- The proposal will be tier-verified + regression-tested before any deploy.',
  ].join('\\n');
}

export function defaultImproverUserMessage(params: { policyName: string; contextSummary?: string }): string {
  return [
    \`Improvement cycle for policy: \${params.policyName}\`,
    '',
    params.contextSummary
      ? \`Recent activity summary:\\n\${params.contextSummary}\`
      : 'No specific activity summary provided. Propose a conservative improvement based on what a typical mature expert system would benefit from refining.',
    '',
    'Propose a single mutation that would improve system behavior.',
  ].join('\\n');
}

export function parseImprovementDraft(raw: string): ImprovementDraftFromAI | null {
  const fence = raw.match(/\`\`\`(?:json)?\\s*([\\s\\S]*?)\`\`\`/);
  const body = fence ? fence[1] : raw;
  const start = body.indexOf('{');
  const end = body.lastIndexOf('}');
  if (start < 0 || end < 0 || end < start) return null;
  let parsed: any;
  try { parsed = JSON.parse(body.substring(start, end + 1)); } catch { return null; }
  if (parsed?.decline === true) return null;
  if (
    typeof parsed?.target !== 'string' ||
    typeof parsed?.claimed_tier !== 'number' ||
    !Array.isArray(parsed?.claimed_scope) ||
    !parsed?.claimed_scope.every((s: unknown) => typeof s === 'string') ||
    parsed?.mutation_content === undefined ||
    typeof parsed?.reasoning !== 'string'
  ) {
    return null;
  }
  return {
    target:          parsed.target,
    claimedTier:     parsed.claimed_tier,
    claimedScope:    parsed.claimed_scope,
    mutationContent: parsed.mutation_content,
    reasoning:       parsed.reasoning,
  };
}

/**
 * AI-orchestrated improvement cycle. Mirrors runImprovementCycle (the stub
 * version) but routes proposal generation through send_chat. Records an
 * improvement_cycles row at the end with disposition='proposed' on success
 * or 'no_candidate' on AI failure / decline.
 */
export async function runImprovementCycleWithAI(params: AiImproverParams): Promise<ImprovementCycle> {
  const systemPrompt = params.systemPrompt ?? defaultImproverSystemPrompt();
  const userMessage  = defaultImproverUserMessage({
    policyName:     params.policyName,
    contextSummary: params.contextSummary,
  });

  let aiResp: ChatResponseImp;
  try {
    aiResp = await invoke<ChatResponseImp>('send_chat', {
      request: {
        messages: [{ role: 'user', content: userMessage }],
        model: params.model,
        system_prompt: systemPrompt,
      },
      requestId: \`improver-\${params.policyName}-\${Date.now()}\`,
    });
  } catch (e) {
    return invoke<ImprovementCycle>('record_ai_improvement_cycle', {
      input: {
        policyName:        params.policyName,
        reasonerName:      \`ai:\${params.model}\`,
        disposition:       'no_candidate',
        proposalId:        null,
        recentRunsScanned: 0,
        notes:             \`AI call failed: \${String(e).substring(0, 200)}\`,
      },
    });
  }

  const draft = parseImprovementDraft(aiResp.content);
  if (!draft) {
    return invoke<ImprovementCycle>('record_ai_improvement_cycle', {
      input: {
        policyName:        params.policyName,
        reasonerName:      \`ai:\${params.model}\`,
        disposition:       'no_candidate',
        proposalId:        null,
        recentRunsScanned: 0,
        notes:             'AI declined or response unparseable',
      },
    });
  }

  const proposalId = await invoke<string>('create_mutation_proposal', {
    input: {
      andonEventId:     null,                // proactive, not reactive
      policyName:       params.policyName,
      proposerIdentity: params.proposerIdentity,
      target:           draft.target,
      claimedTier:      draft.claimedTier,
      claimedScope:     draft.claimedScope,
      mutationContent:  { reasoning: draft.reasoning, mutation: draft.mutationContent },
    },
  });
  const verification = await invoke<TierVerification>('verify_mutation_proposal', { proposalId });
  let sandbox: SandboxOutcome | null = null;
  if (verification.allowed) {
    sandbox = await invoke<SandboxOutcome>('execute_proposal_sandbox', { proposalId });
  }

  const cycle = await invoke<ImprovementCycle>('record_ai_improvement_cycle', {
    input: {
      policyName:        params.policyName,
      reasonerName:      \`ai:\${params.model}\`,
      disposition:       'proposed',
      proposalId,
      recentRunsScanned: 0,
      notes:             null,
    },
  });
  // Stitch the verification + sandbox onto the returned cycle so callers
  // can read the full outcome without an extra fetch. The persisted row
  // doesn't carry these fields (they live on the proposal); this is a
  // convenience join for the caller.
  return { ...cycle, verification, sandbox };
}

export async function recordAiImprovementCycle(input: {
  policyName: string;
  reasonerName: string | null;
  disposition: ImprovementDisposition;
  proposalId: string | null;
  recentRunsScanned: number;
  notes: string | null;
}): Promise<ImprovementCycle> {
  return invoke<ImprovementCycle>('record_ai_improvement_cycle', { input });
}
`;
}
