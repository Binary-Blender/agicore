// Workflow Runtime Generator
//
// Phase 1b of the Andon Loop architecture (see Idea Factory/andon_loop_architecture.md).
//
// Emits a runtime that turns parsed WORKFLOW declarations into executable Tauri
// commands. Builds on the Phase 1a telemetry substrate — every step emits start
// and completion telemetry, and the accumulated workflow state is checkpointed
// after each successful step.
//
// Activated when ANY WORKFLOW is declared AND ast.app.telemetry is enabled.
// (Telemetry helpers are a hard runtime dependency; without them the workflow
//  runtime would have no audit trail, which defeats the whole architectural
//  point. Apps wanting workflows now opt in by also opting into telemetry.)
//
// Action dispatch:
//   For Phase 1b, this emits a placeholder dispatcher. Each step calls
//   dispatch_action(name, input_json) which currently returns a stubbed
//   JSON output. Real typed-action dispatch (calling the user's ACTION
//   functions through their generated Tauri command signatures) lands in
//   a focused follow-up. The workflow runtime captures everything else
//   accurately — state, checkpoints, telemetry, ON_FAIL semantics, PARALLEL
//   execution — so consumers can build against the API today, then get
//   real action invocations transparently when the dispatcher is wired.

import type { AgiFile, WorkflowDecl, WorkflowStep } from '@agicore/parser';
import { toSnakeCase } from '../naming.js';
import { actionDispatchSpec, type ActionDispatchSpec } from './actions.js';

// ─── public entrypoint ─────────────────────────────────────────────────────

function isEnabled(ast: AgiFile): boolean {
  const hasWorkflows = ast.workflows && ast.workflows.length > 0;
  const telemetryOn = !!ast.app.telemetry && ast.app.telemetry !== 'off';
  return hasWorkflows && telemetryOn;
}

export function generateWorkflow(ast: AgiFile): Map<string, string> {
  const files = new Map<string, string>();
  if (!isEnabled(ast)) return files;

  files.set('src-tauri/src/commands/workflow.rs', buildWorkflowRs(ast));
  files.set('src/lib/workflow.ts', buildWorkflowTs(ast));
  return files;
}

/**
 * SQL for the mutation_policies table + idempotent SEED inserts for every
 * declared MUTATION_POLICY. Splice into 001_initial.sql via sql.ts.
 *
 * The schema serializes the tier array as JSON in the `tiers` column —
 * keeps the table schema stable as new tier fields are added in later
 * phases, and the Phase 4 andon responder reads the whole policy at once
 * anyway, so JSON-blob storage matches the read pattern.
 */
export function mutationPoliciesSql(ast: AgiFile): string {
  if (!ast.mutationPolicies || ast.mutationPolicies.length === 0) return '';

  const tableDdl = `
-- MUTATION POLICIES: AI authorization scope per target set (Phase 11.3)
-- Each policy declares tiered mutation scopes + verification gates. The
-- Phase 4 andon-responder REASONER reads this table to bound its proposals.
CREATE TABLE IF NOT EXISTS mutation_policies (
  id                    TEXT PRIMARY KEY,
  name                  TEXT NOT NULL UNIQUE,
  targets               TEXT NOT NULL,                -- JSON array of module/workflow names
  tiers                 TEXT NOT NULL,                -- JSON array of tier descriptors
  andon_responder       TEXT,
  improvement_reasoner  TEXT,
  ledger                TEXT,
  created_at            TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_mutation_policies_name ON mutation_policies(name);`;

  const seedLines: string[] = ast.mutationPolicies.map((p) => {
    const id = `policy-${p.name}`;
    const targets = JSON.stringify(p.targets);
    const tiers = JSON.stringify(p.tiers.map((t) => ({
      tier: t.tier,
      name: t.name,
      scope: t.scope,
      autoDeploy: t.autoDeploy ?? null,
      require: t.require ?? null,
      regressionSuite: t.regressionSuite ?? null,
      monitoringWindow: t.monitoringWindow ?? null,
      nbveWindow: t.nbveWindow ?? null,
      approvalAuthority: t.approvalAuthority ?? null,
      approvalAuthorityOrdered: t.approvalAuthorityOrdered ?? null,
    })));
    const escape = (s: string) => s.replace(/'/g, "''");
    const cols = ['id', 'name', 'targets', 'tiers'];
    const vals = [`'${id}'`, `'${escape(p.name)}'`, `'${escape(targets)}'`, `'${escape(tiers)}'`];
    if (p.andonResponder)       { cols.push('andon_responder');      vals.push(`'${escape(p.andonResponder)}'`); }
    if (p.improvementReasoner)  { cols.push('improvement_reasoner'); vals.push(`'${escape(p.improvementReasoner)}'`); }
    if (p.ledger)               { cols.push('ledger');               vals.push(`'${escape(p.ledger)}'`); }
    return `INSERT OR IGNORE INTO mutation_policies (${cols.join(', ')}) VALUES (${vals.join(', ')});`;
  });

  // Phase 11.4a — mutation proposals + outcomes. Always emitted alongside
  // mutation_policies (the proposer needs somewhere to persist) — gated on
  // the same condition (≥1 declared MUTATION_POLICY) so apps without the
  // Andon Loop opted in stay byte-identical.
  const proposalsDdl = `

-- MUTATION PROPOSALS: every AI-proposed mutation lands here (Phase 11.4a).
-- One row per proposal; lifecycle is mechanical:
--   created → tier_verified → tested → (deployed | rejected | escalated)
-- The Phase 4b sandbox executor reads candidates with status='tier_verified',
-- runs them through the regression suite, and records the outcome here.
-- The Phase 6 approval-chain wiring reads status='escalated' for human signoff.
CREATE TABLE IF NOT EXISTS mutation_proposals (
  id                    TEXT PRIMARY KEY,
  andon_event_id        TEXT,                          -- null for improvement-loop proposals
  policy_name           TEXT NOT NULL,
  proposer_identity     TEXT NOT NULL,                 -- signed REASONER identity or 'human:<email>'
  target                TEXT NOT NULL,                 -- module/workflow this affects
  claimed_tier          INTEGER NOT NULL,              -- the tier the proposer DECLARED
  resolved_tier         INTEGER,                       -- the tier the verifier COMPUTED from scope
  claimed_scope         TEXT NOT NULL,                 -- JSON array of mutation kind strings
  mutation_content      TEXT NOT NULL,                 -- the DSL diff (free-form for now)
  status                TEXT NOT NULL DEFAULT 'created',  -- created | tier_verified | tier_rejected | tested | deployed | rejected | escalated | rolled_back
  rejection_reason      TEXT,                          -- populated on rejection
  test_evidence         TEXT,                          -- JSON: { resolved_failure: bool, regression: { total, unchanged, broken } }
  approval_chain        TEXT,                          -- JSON: signers + timestamps
  deploy_audit          TEXT,                          -- JSON: when, by whom, smoke test outcome
  created_at            TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at            TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_mutation_proposals_andon   ON mutation_proposals(andon_event_id);
CREATE INDEX IF NOT EXISTS idx_mutation_proposals_policy  ON mutation_proposals(policy_name, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mutation_proposals_status  ON mutation_proposals(status, created_at DESC);`;

  return tableDdl + '\n\n-- Idempotent seed: MUTATION_POLICY declarations from the .agi source\n' + seedLines.join('\n') + proposalsDdl;
}

// SQL for the workflow_checkpoints table — splice into 001_initial.sql via sql.ts.
export function workflowCheckpointsSql(ast: AgiFile): string {
  if (!isEnabled(ast)) return '';
  return `
-- WORKFLOW CHECKPOINTS: per-step state snapshots for the Andon Loop (Phase 1b)
-- Each successful step appends a row capturing the accumulated workflow
-- context. The runtime can resume from any saved checkpoint (Phase 2+
-- will use this for ANDON-triggered halt/resume).
CREATE TABLE IF NOT EXISTS workflow_checkpoints (
  id                 TEXT PRIMARY KEY,
  run_id             TEXT NOT NULL,
  workflow_name      TEXT NOT NULL,
  step_name          TEXT NOT NULL,
  step_index         INTEGER NOT NULL,
  accumulated_state  TEXT NOT NULL,
  status             TEXT NOT NULL DEFAULT 'completed',
  created_at         TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_wf_checkpoints_run      ON workflow_checkpoints(run_id, step_index);
CREATE INDEX IF NOT EXISTS idx_wf_checkpoints_workflow ON workflow_checkpoints(workflow_name, created_at DESC);

-- WORKFLOW RUNS: one row per workflow execution (current status + outcome).
-- workflow_checkpoints rows belong to a run via run_id.
CREATE TABLE IF NOT EXISTS workflow_runs (
  id                 TEXT PRIMARY KEY,
  workflow_name      TEXT NOT NULL,
  status             TEXT NOT NULL DEFAULT 'running',
  steps_completed    INTEGER NOT NULL DEFAULT 0,
  steps_total        INTEGER NOT NULL,
  input_data         TEXT,
  output_data        TEXT,
  error_message      TEXT,
  started_at         TEXT NOT NULL,
  completed_at       TEXT
);
CREATE INDEX IF NOT EXISTS idx_wf_runs_workflow ON workflow_runs(workflow_name, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_wf_runs_status   ON workflow_runs(status, started_at DESC);

-- ANDON EVENTS: every andon pull captured here with full context for the
-- AI responder REASONER (Phase 4) to consume. Append-only audit trail.
CREATE TABLE IF NOT EXISTS andon_events (
  id                 TEXT PRIMARY KEY,
  trigger_category   TEXT NOT NULL,        -- 'action_error' | 'timeout' | 'guard_failure' | 'no_rule_match' | 'score_threshold' | 'response_unparseable'
  workflow_run_id    TEXT,
  workflow_name      TEXT,
  step_name          TEXT,
  step_index         INTEGER,
  failure_message    TEXT,
  captured_state     TEXT NOT NULL,        -- JSON of the workflow context at halt time
  rollback_boundary  TEXT,                 -- 'internal' | 'external' | 'irreversible' | NULL
  resolution_mutation_id TEXT,             -- populated by Phase 4 when an andon is resolved
  fired_at           TEXT NOT NULL,
  resolved_at        TEXT
);
CREATE INDEX IF NOT EXISTS idx_andon_run        ON andon_events(workflow_run_id);
CREATE INDEX IF NOT EXISTS idx_andon_workflow   ON andon_events(workflow_name, fired_at DESC);
CREATE INDEX IF NOT EXISTS idx_andon_unresolved ON andon_events(resolved_at, fired_at DESC);
CREATE INDEX IF NOT EXISTS idx_andon_category   ON andon_events(trigger_category, fired_at DESC);`;
}

// ─── Rust runtime ──────────────────────────────────────────────────────────

function buildWorkflowRs(ast: AgiFile): string {
  const workflows = ast.workflows;

  // Resolve dispatch spec per unique action referenced across workflows.
  // Phase 1c: stop generating a runtime dispatcher; emit inline typed calls
  // at each step's call site. The lookup map gives the workflow function
  // builder the spec it needs per step.
  // Phase 11.3: also include COMPENSATING_ACTIONs declared on steps so the
  // andon path can call them with the same typed dispatch.
  const dispatchByAction = new Map<string, ActionDispatchSpec>();
  const collectAction = (name: string): void => {
    if (dispatchByAction.has(name)) return;
    const decl = ast.actions.find((a) => a.name === name);
    if (!decl) {
      dispatchByAction.set(name, {
        kind: 'unsupported',
        reason: `action '${name}' is not declared (workflow validator should catch this; defensive fallback)`,
      });
      return;
    }
    dispatchByAction.set(name, actionDispatchSpec(decl, ast));
  };
  for (const wf of workflows) {
    for (const step of wf.steps) {
      collectAction(step.action);
      if (step.compensatingAction) collectAction(step.compensatingAction);
    }
  }

  // Does ANY callable action need the API key store? Determines whether
  // the per-workflow run_* commands declare a store parameter.
  const anyActionNeedsStore = Array.from(dispatchByAction.values())
    .some((s) => s.kind === 'callable' && s.needsApiKeyStore);

  const perWorkflowFns = workflows
    .map((wf) => buildRunWorkflowFn(wf, dispatchByAction, anyActionNeedsStore))
    .join('\n\n');

  return `// Agicore Generated — Workflow runtime + checkpoint capture (Phase 1b)
// DO NOT EDIT BY HAND. See core/compiler/src/generators/workflow.ts.
//
// Each WORKFLOW becomes a run_<name> Tauri command. Steps execute in source
// order (or concurrently via PARALLEL). Every step boundary emits telemetry
// and saves a checkpoint. ON_FAIL semantics: stop (default) halts the run;
// skip continues to the next step; retry attempts once more.

use crate::commands::telemetry::{emit_telemetry, complete_telemetry};
use crate::db::DbPool;
use rusqlite::params;
use serde::{Deserialize, Serialize};
use std::time::Instant;
use tauri::State;
use uuid::Uuid;

// ─── Public types ─────────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WorkflowRunResult {
    pub run_id: String,
    pub workflow_name: String,
    pub status: String,           // "completed" | "failed" | "halted"
    pub steps_completed: i32,
    pub steps_total: i32,
    pub final_context: serde_json::Value,
    pub error: Option<String>,
    pub duration_ms: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WorkflowCheckpoint {
    pub id: String,
    pub run_id: String,
    pub workflow_name: String,
    pub step_name: String,
    pub step_index: i32,
    pub accumulated_state: serde_json::Value,
    pub status: String,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WorkflowRunSummary {
    pub id: String,
    pub workflow_name: String,
    pub status: String,
    pub steps_completed: i32,
    pub steps_total: i32,
    pub error_message: Option<String>,
    pub started_at: String,
    pub completed_at: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AndonEvent {
    pub id: String,
    pub trigger_category: String,
    pub workflow_run_id: Option<String>,
    pub workflow_name: Option<String>,
    pub step_name: Option<String>,
    pub step_index: Option<i32>,
    pub failure_message: Option<String>,
    pub captured_state: serde_json::Value,
    pub rollback_boundary: Option<String>,
    pub resolution_mutation_id: Option<String>,
    pub fired_at: String,
    pub resolved_at: Option<String>,
}

// ─── Internal: persistence helpers ────────────────────────────────────────

fn save_run_started(
    db: &DbPool,
    run_id: &str,
    workflow_name: &str,
    steps_total: i32,
    input: &serde_json::Value,
) {
    let now = chrono::Utc::now().to_rfc3339();
    let _ = (|| -> Result<(), rusqlite::Error> {
        let conn = db.lock().map_err(|_| rusqlite::Error::InvalidQuery)?;
        conn.execute(
            "INSERT INTO workflow_runs (id, workflow_name, status, steps_completed, steps_total, input_data, started_at) VALUES (?, ?, 'running', 0, ?, ?, ?)",
            params![run_id, workflow_name, steps_total, input.to_string(), now],
        )?;
        Ok(())
    })();
}

fn save_run_completed(
    db: &DbPool,
    run_id: &str,
    status: &str,
    steps_completed: i32,
    output: &serde_json::Value,
    error: Option<&str>,
) {
    let now = chrono::Utc::now().to_rfc3339();
    let _ = (|| -> Result<(), rusqlite::Error> {
        let conn = db.lock().map_err(|_| rusqlite::Error::InvalidQuery)?;
        conn.execute(
            "UPDATE workflow_runs SET status = ?, steps_completed = ?, output_data = ?, error_message = ?, completed_at = ? WHERE id = ?",
            params![status, steps_completed, output.to_string(), error, now, run_id],
        )?;
        Ok(())
    })();
}

fn save_checkpoint(
    db: &DbPool,
    run_id: &str,
    workflow_name: &str,
    step_name: &str,
    step_index: i32,
    state: &serde_json::Value,
    status: &str,
) {
    let now = chrono::Utc::now().to_rfc3339();
    let _ = (|| -> Result<(), rusqlite::Error> {
        let conn = db.lock().map_err(|_| rusqlite::Error::InvalidQuery)?;
        conn.execute(
            "INSERT INTO workflow_checkpoints (id, run_id, workflow_name, step_name, step_index, accumulated_state, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            params![
                Uuid::new_v4().to_string(),
                run_id, workflow_name, step_name, step_index,
                state.to_string(), status, now,
            ],
        )?;
        Ok(())
    })();
}

/// Parse a duration string like "30s", "5m", "1h", "500ms", "2d" into milliseconds.
/// Used to evaluate per-step TIMEOUT values declared in the DSL.
fn parse_duration_ms(s: &str) -> Option<u64> {
    let s = s.trim();
    let split_at = s.find(|c: char| c.is_alphabetic())?;
    let (num_str, suffix) = s.split_at(split_at);
    let n: u64 = num_str.trim().parse().ok()?;
    match suffix {
        "ms" => Some(n),
        "s"  => Some(n.saturating_mul(1_000)),
        "m"  => Some(n.saturating_mul(60_000)),
        "h"  => Some(n.saturating_mul(3_600_000)),
        "d"  => Some(n.saturating_mul(86_400_000)),
        _ => None,
    }
}

/// Persist an AndonEvent. The Andon Loop's audit trail. Phase 4's
/// andon-responder REASONER reads from this table.
fn emit_andon_event(
    db: &DbPool,
    run_id: Option<&str>,
    workflow_name: &str,
    step_name: Option<&str>,
    step_index: Option<i32>,
    trigger_category: &str,
    failure_message: Option<&str>,
    captured_state: &serde_json::Value,
    rollback_boundary: Option<&str>,
) -> String {
    let id = Uuid::new_v4().to_string();
    let now = chrono::Utc::now().to_rfc3339();
    let _ = (|| -> Result<(), rusqlite::Error> {
        let conn = db.lock().map_err(|_| rusqlite::Error::InvalidQuery)?;
        conn.execute(
            "INSERT INTO andon_events (id, trigger_category, workflow_run_id, workflow_name, step_name, step_index, failure_message, captured_state, rollback_boundary, fired_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            params![
                id, trigger_category, run_id, workflow_name, step_name, step_index,
                failure_message, captured_state.to_string(), rollback_boundary, now,
            ],
        )?;
        Ok(())
    })();
    // Also emit a telemetry record so the activity log shows the andon
    // alongside the workflow_step events that surrounded it.
    let _ = emit_telemetry(
        db, "andon_pulled", workflow_name, Some("workflow"),
        run_id, step_name, "andon",
        Some(&captured_state.to_string()), None, failure_message, None,
        Some(&format!("{{\"andon_event_id\":\"{}\",\"trigger\":\"{}\"}}", id, trigger_category)),
    );
    id
}

// ─── Parallel-batch fallback stub ─────────────────────────────────────────
//
// Phase 1c wires typed dispatch for SERIAL steps (one ACTION per step,
// known at codegen time, inlined as a direct typed call). Parallel batches
// still need a runtime-callable helper because the spawned 'static tasks
// can't capture tauri::State<'_, _> references with non-static lifetimes.
// Typed parallel dispatch is a focused Phase 1d follow-up; until then,
// parallel steps return a structured stub so the rest of the runtime
// (telemetry, checkpoints, ON_FAIL semantics) still exercises end-to-end.

async fn dispatch_action_stub(
    action_name: &str,
    input: serde_json::Value,
) -> Result<serde_json::Value, String> {
    Ok(serde_json::json!({
        "_stub": "parallel-typed-dispatch-pending",
        "action": action_name,
        "received_input": input,
        "note": "Serial steps use typed dispatch; parallel typed dispatch lands in Phase 1d."
    }))
}

// ─── Per-workflow Tauri commands ──────────────────────────────────────────
//
// Phase 1c: action dispatch is inlined into each SERIAL step's call site
// (one action per step is known at codegen time, so no runtime string lookup
// needed). The generated code uses crate::commands::* paths to invoke the
// typed ACTION function directly. Input/output conversion happens via serde
// at the boundary; internal action signatures are unchanged.

${perWorkflowFns}

// ─── Query commands: inspect runs + checkpoints ──────────────────────────

#[tauri::command]
pub fn list_workflow_runs(
    db: State<'_, DbPool>,
    workflow_name: Option<String>,
    limit: Option<i64>,
) -> Result<Vec<WorkflowRunSummary>, String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    let lim = limit.unwrap_or(50).clamp(1, 1000);

    let mut sql = String::from(
        "SELECT id, workflow_name, status, steps_completed, steps_total, error_message, started_at, completed_at FROM workflow_runs WHERE 1=1"
    );
    let mut args: Vec<String> = Vec::new();
    if let Some(wn) = &workflow_name {
        sql.push_str(" AND workflow_name = ?");
        args.push(wn.clone());
    }
    sql.push_str(" ORDER BY started_at DESC LIMIT ?");

    let mut stmt = conn.prepare(&sql).map_err(|e| e.to_string())?;
    let param_refs: Vec<&dyn rusqlite::ToSql> = args
        .iter()
        .map(|s| s as &dyn rusqlite::ToSql)
        .chain(std::iter::once(&lim as &dyn rusqlite::ToSql))
        .collect();

    let rows = stmt
        .query_map(param_refs.as_slice(), |row| {
            Ok(WorkflowRunSummary {
                id: row.get(0)?,
                workflow_name: row.get(1)?,
                status: row.get(2)?,
                steps_completed: row.get(3)?,
                steps_total: row.get(4)?,
                error_message: row.get(5)?,
                started_at: row.get(6)?,
                completed_at: row.get(7)?,
            })
        })
        .map_err(|e| e.to_string())?;
    let mut out = Vec::new();
    for r in rows { out.push(r.map_err(|e| e.to_string())?); }
    Ok(out)
}

#[tauri::command]
pub fn get_workflow_checkpoints(
    db: State<'_, DbPool>,
    run_id: String,
) -> Result<Vec<WorkflowCheckpoint>, String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare("SELECT id, run_id, workflow_name, step_name, step_index, accumulated_state, status, created_at FROM workflow_checkpoints WHERE run_id = ? ORDER BY step_index ASC")
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map(params![run_id], |row| {
            let state_str: String = row.get(5)?;
            let state: serde_json::Value = serde_json::from_str(&state_str).unwrap_or(serde_json::Value::Null);
            Ok(WorkflowCheckpoint {
                id: row.get(0)?,
                run_id: row.get(1)?,
                workflow_name: row.get(2)?,
                step_name: row.get(3)?,
                step_index: row.get(4)?,
                accumulated_state: state,
                status: row.get(6)?,
                created_at: row.get(7)?,
            })
        })
        .map_err(|e| e.to_string())?;
    let mut out = Vec::new();
    for r in rows { out.push(r.map_err(|e| e.to_string())?); }
    Ok(out)
}

#[tauri::command]
pub fn list_andon_events(
    db: State<'_, DbPool>,
    workflow_name: Option<String>,
    unresolved_only: Option<bool>,
    limit: Option<i64>,
) -> Result<Vec<AndonEvent>, String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    let lim = limit.unwrap_or(100).clamp(1, 10_000);

    let mut sql = String::from(
        "SELECT id, trigger_category, workflow_run_id, workflow_name, step_name, step_index, failure_message, captured_state, rollback_boundary, resolution_mutation_id, fired_at, resolved_at FROM andon_events WHERE 1=1"
    );
    let mut args: Vec<String> = Vec::new();
    if let Some(wn) = &workflow_name {
        sql.push_str(" AND workflow_name = ?");
        args.push(wn.clone());
    }
    if unresolved_only.unwrap_or(false) {
        sql.push_str(" AND resolved_at IS NULL");
    }
    sql.push_str(" ORDER BY fired_at DESC LIMIT ?");

    let mut stmt = conn.prepare(&sql).map_err(|e| e.to_string())?;
    let param_refs: Vec<&dyn rusqlite::ToSql> = args
        .iter()
        .map(|s| s as &dyn rusqlite::ToSql)
        .chain(std::iter::once(&lim as &dyn rusqlite::ToSql))
        .collect();
    let rows = stmt
        .query_map(param_refs.as_slice(), |row| {
            let state_str: String = row.get(7)?;
            let state: serde_json::Value = serde_json::from_str(&state_str).unwrap_or(serde_json::Value::Null);
            Ok(AndonEvent {
                id: row.get(0)?,
                trigger_category: row.get(1)?,
                workflow_run_id: row.get(2)?,
                workflow_name: row.get(3)?,
                step_name: row.get(4)?,
                step_index: row.get(5)?,
                failure_message: row.get(6)?,
                captured_state: state,
                rollback_boundary: row.get(8)?,
                resolution_mutation_id: row.get(9)?,
                fired_at: row.get(10)?,
                resolved_at: row.get(11)?,
            })
        })
        .map_err(|e| e.to_string())?;
    let mut out = Vec::new();
    for r in rows { out.push(r.map_err(|e| e.to_string())?); }
    Ok(out)
}

// Phase 11.8b — Runtime andon emission for MODULE EXPECTS_MATCH=true.
// The expert-system runtime calls this when no rule matches an incoming
// event and the module is declared with EXPECTS_MATCH true. Surfaces as
// a standard andon_event with trigger_category='no_rule_match', so the
// Phase 4c responder pipeline picks it up the same way it handles
// workflow-originated andons.
//
// Semantics:
//   workflow_name field stores the module name (the andon-events table
//   is shared across both kinds of producers).
//   workflow_run_id is null (modules don't have run ids).
//   step_name/step_index are null.
//   failure_message defaults to "No rule matched in module 'X'" when
//   not supplied; rollback_boundary is always None (no-match has no
//   side-effects to roll back).
#[tauri::command]
pub fn pull_module_andon(
    db: State<'_, DbPool>,
    module_name: String,
    event_payload: serde_json::Value,
    failure_reason: Option<String>,
) -> Result<String, String> {
    let msg_owned = failure_reason
        .unwrap_or_else(|| format!("No rule matched in module '{}'", module_name));
    let id = emit_andon_event(
        db.inner(),
        None,                          // no workflow_run_id
        &module_name,                  // module name in the workflow_name slot
        None, None,                    // no step
        "no_rule_match",               // trigger category
        Some(&msg_owned),
        &event_payload,
        None,                          // no rollback boundary for no-match
    );
    Ok(id)
}

#[tauri::command]
pub fn get_andon_event(
    db: State<'_, DbPool>,
    event_id: String,
) -> Result<Option<AndonEvent>, String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare("SELECT id, trigger_category, workflow_run_id, workflow_name, step_name, step_index, failure_message, captured_state, rollback_boundary, resolution_mutation_id, fired_at, resolved_at FROM andon_events WHERE id = ?")
        .map_err(|e| e.to_string())?;
    let mut rows = stmt
        .query_map(params![event_id], |row| {
            let state_str: String = row.get(7)?;
            let state: serde_json::Value = serde_json::from_str(&state_str).unwrap_or(serde_json::Value::Null);
            Ok(AndonEvent {
                id: row.get(0)?,
                trigger_category: row.get(1)?,
                workflow_run_id: row.get(2)?,
                workflow_name: row.get(3)?,
                step_name: row.get(4)?,
                step_index: row.get(5)?,
                failure_message: row.get(6)?,
                captured_state: state,
                rollback_boundary: row.get(8)?,
                resolution_mutation_id: row.get(9)?,
                fired_at: row.get(10)?,
                resolved_at: row.get(11)?,
            })
        })
        .map_err(|e| e.to_string())?;
    match rows.next() {
        Some(r) => Ok(Some(r.map_err(|e| e.to_string())?)),
        None => Ok(None),
    }
}
`;
}

function buildRunWorkflowFn(
  wf: WorkflowDecl,
  dispatchByAction: Map<string, ActionDispatchSpec>,
  anyActionNeedsStore: boolean,
): string {
  const fnName = `run_${toSnakeCase(wf.name)}`;
  const wfLiteral = wf.name;
  const stepsTotal = wf.steps.length;
  const parallelSet = new Set(wf.parallel ?? []);

  // Group steps: a step is "parallel" if its name is in the PARALLEL list.
  // Parallel steps are gathered into one batch that joins before the next
  // serial step runs. Phase 1b: simple grouping; sophisticated DAG comes
  // with the ANDON_ON DSL surface in Phase 2.
  const stepBlocks: string[] = [];
  let i = 0;
  while (i < wf.steps.length) {
    const step = wf.steps[i]!;
    if (parallelSet.has(step.name)) {
      const batch: WorkflowStep[] = [];
      let j = i;
      while (j < wf.steps.length && parallelSet.has(wf.steps[j]!.name)) {
        batch.push(wf.steps[j]!);
        j++;
      }
      stepBlocks.push(parallelBatchBlock(batch, i, wfLiteral));
      i = j;
    } else {
      const compensatingSpec = step.compensatingAction
        ? dispatchByAction.get(step.compensatingAction)
        : undefined;
      stepBlocks.push(serialStepBlock(step, i, wfLiteral, dispatchByAction.get(step.action), compensatingSpec));
      i++;
    }
  }

  const storeParam = anyActionNeedsStore
    ? `\n    store: State<'_, crate::ai_service::ApiKeyStore>,`
    : '';

  return `// ── Workflow: ${wf.name} (${stepsTotal} steps) ──
#[tauri::command]
pub async fn ${fnName}(
    input: serde_json::Value,
    db: State<'_, DbPool>,${storeParam}
) -> Result<WorkflowRunResult, String> {
    let run_id = Uuid::new_v4().to_string();
    let workflow_name = "${wfLiteral}";
    // db_arc: owned Arc<Mutex<Connection>> for helpers (telemetry/checkpoint)
    // and for moving into parallel-spawn tasks. db (the State) stays available
    // for serial typed dispatch since tauri::State implements Clone in 2.x.
    let db_arc: DbPool = db.inner().clone();
    let db_ref: &DbPool = &db_arc;
    let total_steps: i32 = ${stepsTotal};
    let started = Instant::now();

    save_run_started(db_ref, &run_id, workflow_name, total_steps, &input);
    let wf_event_id = emit_telemetry(
        db_ref, "workflow_started", workflow_name, Some("workflow"),
        Some(&run_id), None, "in_progress",
        Some(&input.to_string()), None, None, None, None,
    );

    let mut context = serde_json::json!({ "input": input, "outputs": {} });
    let mut steps_completed: i32 = 0;

${stepBlocks.join('\n\n')}

    let total_dur = started.elapsed().as_millis() as i64;
    save_run_completed(db_ref, &run_id, "completed", steps_completed, &context, None);
    complete_telemetry(db_ref, &wf_event_id, "success", Some(&context.to_string()), None, Some(total_dur));

    Ok(WorkflowRunResult {
        run_id, workflow_name: workflow_name.to_string(),
        status: "completed".to_string(),
        steps_completed, steps_total: total_steps,
        final_context: context, error: None,
        duration_ms: total_dur,
    })
}`;
}

function serialStepBlock(
  step: WorkflowStep,
  index: number,
  wfName: string,
  dispatchSpec: ActionDispatchSpec | undefined,
  compensatingSpec: ActionDispatchSpec | undefined,
): string {
  const stepName = step.name;
  const actionName = step.action;
  const onFail = step.onFail || 'stop';
  const andonOn = new Set(step.andonOn ?? []);
  const andonOnActionError = andonOn.has('action_error');
  const andonOnTimeout = andonOn.has('timeout');
  const timeoutMsLiteral = step.timeout ? jsonStringLit(step.timeout) : null;
  const rollbackBoundary = step.rollbackBoundary ?? null;

  const dispatchBlock = buildSerialDispatchBlock(actionName, dispatchSpec);
  const retryDispatchBlock = buildSerialDispatchBlock(actionName, dispatchSpec);
  // Phase 11.3: rollback-completer block runs in the andon path before the
  // halted result returns. external boundary → call COMPENSATING_ACTION.
  // irreversible boundary → emit "andon_escalated" telemetry (Phase 4
  // andon-responder REASONER will read the escalation target from there).
  const rollbackCompleter = buildRollbackCompleter(step, compensatingSpec);
  const andonHaltBlock = buildAndonHaltBlock(stepName, index, rollbackBoundary, rollbackCompleter);

  // The dispatch future is the inner async block. When the step declares a
  // TIMEOUT, wrap it in tokio::time::timeout so the runtime cancels rather
  // than waiting forever; the elapsed branch becomes the timeout-andon path.
  const dispatchInvocation = timeoutMsLiteral !== null
    ? `        let _timeout_ms: u64 = parse_duration_ms(${timeoutMsLiteral}).unwrap_or(0);
        let dispatch_result: Result<serde_json::Value, String> = if _timeout_ms > 0 {
            match tokio::time::timeout(
                std::time::Duration::from_millis(_timeout_ms),
                async {
${dispatchBlock}
                },
            ).await {
                Ok(inner) => inner,
                Err(_elapsed) => Err("__ANDON_TIMEOUT__".to_string()),
            }
        } else {
            async {
${dispatchBlock}
            }.await
        };`
    : `        let dispatch_result: Result<serde_json::Value, String> = async {
${dispatchBlock}
        }.await;`;

  // Error-path branching: prefer the andon arm when configured + matched,
  // else fall through to ON_FAIL semantics. Encoded as nested if-let-style
  // matching to keep the generated Rust readable.
  const errorArm = andonOnActionError || andonOnTimeout
    ? `            Err(e) => {
                let dur = step_started.elapsed().as_millis() as i64;
                complete_telemetry(db_ref, &step_event_id, "error", None, Some(&e), Some(dur));
                save_checkpoint(db_ref, &run_id, workflow_name, "${stepName}", ${index}, &context, "failed");
                let is_timeout = e == "__ANDON_TIMEOUT__";
                ${andonOnTimeout ? `if is_timeout {
                    ${andonHaltBlock.replace(/\n/g, '\n                    ')
                      .replace('__TRIGGER__', 'timeout')
                      .replace('__MESSAGE__', '"step exceeded TIMEOUT"')}
                }` : ''}
                ${andonOnActionError ? `if !is_timeout {
                    ${andonHaltBlock.replace(/\n/g, '\n                    ')
                      .replace('__TRIGGER__', 'action_error')
                      .replace('__MESSAGE__', '&e')}
                }` : ''}
${onFailHandler(onFail, wfName, stepName, retryDispatchBlock)}
            }`
    : `            Err(e) => {
                let dur = step_started.elapsed().as_millis() as i64;
                complete_telemetry(db_ref, &step_event_id, "error", None, Some(&e), Some(dur));
                save_checkpoint(db_ref, &run_id, workflow_name, "${stepName}", ${index}, &context, "failed");
${onFailHandler(onFail, wfName, stepName, retryDispatchBlock)}
            }`;

  return `    // step ${index}: ${stepName} (action: ${actionName}, on_fail: ${onFail}${step.andonOn ? `, andon_on: ${step.andonOn.join('+')}` : ''}${step.timeout ? `, timeout: ${step.timeout}` : ''}${step.rollbackBoundary ? `, rollback: ${step.rollbackBoundary}` : ''})
    {
        let step_event_id = emit_telemetry(
            db_ref, "workflow_step_started", "${actionName}", Some("action"),
            Some(&run_id), Some("${stepName}"), "in_progress",
            None, None, None, None, None,
        );
        let step_started = Instant::now();
        let step_input = context.clone();
${dispatchInvocation}
        match dispatch_result {
            Ok(output) => {
                let dur = step_started.elapsed().as_millis() as i64;
                if let Some(outs) = context.get_mut("outputs").and_then(|v| v.as_object_mut()) {
                    outs.insert("${stepName}".to_string(), output.clone());
                }
                save_checkpoint(db_ref, &run_id, workflow_name, "${stepName}", ${index}, &context, "completed");
                complete_telemetry(db_ref, &step_event_id, "success", Some(&output.to_string()), None, Some(dur));
                steps_completed += 1;
            }
${errorArm}
        }
    }`;
}

/**
 * Emit the body of an andon halt — persist the event, run the rollback
 * completer for the boundary, mark the run halted, close the workflow's
 * wrapping telemetry, and return a halted WorkflowRunResult.
 *
 * Placeholders __TRIGGER__ and __MESSAGE__ are replaced by the caller.
 */
function buildAndonHaltBlock(
  stepName: string,
  index: number,
  rollbackBoundary: string | null,
  rollbackCompleter: string,
): string {
  const rbLit = rollbackBoundary ? `Some("${rollbackBoundary}")` : 'None';
  return `let andon_id = emit_andon_event(
    db_ref,
    Some(&run_id),
    workflow_name,
    Some("${stepName}"),
    Some(${index}),
    "__TRIGGER__",
    Some(__MESSAGE__),
    &context,
    ${rbLit},
);
${rollbackCompleter}
let total_dur = started.elapsed().as_millis() as i64;
save_run_completed(db_ref, &run_id, "halted", steps_completed, &context, Some(&format!("andon:{}", andon_id)));
complete_telemetry(db_ref, &wf_event_id, "andon", Some(&context.to_string()), Some(&format!("andon_event_id={}", andon_id)), Some(total_dur));
return Ok(WorkflowRunResult {
    run_id, workflow_name: workflow_name.to_string(),
    status: "halted".to_string(),
    steps_completed, steps_total: total_steps,
    final_context: context, error: Some(format!("ANDON pulled at step '${stepName}' (event {})", andon_id)),
    duration_ms: total_dur,
});`;
}

/**
 * Emit the rollback-completer block for an andon halt:
 *   external boundary    → call COMPENSATING_ACTION inline (typed), log result
 *   irreversible boundary → emit "andon_escalated" telemetry with target
 *   internal boundary     → nothing (rollback is the andon-event capture itself)
 *
 * Phase 11.3 wires the synchronous completer; Phase 4 will wire compensating
 * actions that themselves take the workflow context as input.
 */
function buildRollbackCompleter(
  step: WorkflowStep,
  compensatingSpec: ActionDispatchSpec | undefined,
): string {
  const boundary = step.rollbackBoundary;
  if (!boundary || boundary === 'internal') return '// internal rollback: andon event capture IS the rollback';

  if (boundary === 'external') {
    if (!step.compensatingAction) {
      return `// external boundary without COMPENSATING_ACTION — logging and halting; effects remain.
eprintln!("[andon] step '${step.name}' has ROLLBACK_BOUNDARY external but no COMPENSATING_ACTION declared; side effects not undone.");`;
    }
    const compName = step.compensatingAction;
    const callBlock = buildSerialDispatchBlock(compName, compensatingSpec)
      .split('\n')
      .map((l) => '    ' + l)
      .join('\n');
    return `// COMPENSATING_ACTION: ${compName}
let comp_event_id = emit_telemetry(
    db_ref, "compensating_action_started", "${compName}", Some("action"),
    Some(&run_id), Some("${step.name}"), "in_progress",
    None, None, None, None, None,
);
let comp_started = Instant::now();
let comp_input = context.clone();
let _comp_result: Result<serde_json::Value, String> = async {
    let step_input = comp_input;
${callBlock}
}.await;
let comp_dur = comp_started.elapsed().as_millis() as i64;
match _comp_result {
    Ok(comp_out) => {
        complete_telemetry(db_ref, &comp_event_id, "success", Some(&comp_out.to_string()), None, Some(comp_dur));
        eprintln!("[andon] compensating action '${compName}' completed for step '${step.name}'");
    }
    Err(comp_err) => {
        complete_telemetry(db_ref, &comp_event_id, "error", None, Some(&comp_err), Some(comp_dur));
        eprintln!("[andon] compensating action '${compName}' FAILED for step '${step.name}': {}", comp_err);
    }
}`;
  }

  // irreversible
  const target = step.onAndonEscalate ?? 'human';
  return `// IRREVERSIBLE boundary: no rollback possible; escalating to ${target}.
let _ = emit_telemetry(
    db_ref, "andon_escalated", workflow_name, Some("workflow"),
    Some(&run_id), Some("${step.name}"), "andon",
    Some(&context.to_string()), None, Some(&format!("escalation_target=${target}")), None,
    Some(&format!("{{\\"andon_event_id\\":\\"{}\\",\\"target\\":\\"${target}\\"}}", andon_id)),
);`;
}

function jsonStringLit(s: string): string {
  return JSON.stringify(s);
}

/**
 * Emit the body of a per-step typed dispatch. Returns Rust code that yields
 * Result<serde_json::Value, String> from a captured `step_input` variable.
 *
 * For callable actions: typed serde conversion → call the typed function →
 * serde to_value the result. For unsupported actions: return Err with the
 * reason from the dispatch spec.
 */
function buildSerialDispatchBlock(actionName: string, spec: ActionDispatchSpec | undefined): string {
  if (!spec || spec.kind === 'unsupported') {
    const reason = spec?.kind === 'unsupported'
      ? spec.reason
      : `action '${actionName}' has no dispatch spec`;
    return `            let _ = step_input;
            Err(format!("Action '${actionName}' is not dispatchable from workflow runtime: ${reason.replace(/"/g, '\\"')}"))`;
  }

  // Callable. Two sub-cases: AI action (needs store) or not.
  const storeArg = spec.needsApiKeyStore ? ', store.clone()' : '';
  if (spec.inputStruct === null) {
    // Action with no INPUT parameters
    return `            let _ = step_input;
            let output = ${spec.modulePath}(db.clone()${storeArg}).await?;
            serde_json::to_value(output).map_err(|e| format!("Failed to serialize output of '${actionName}': {}", e))`;
  }
  return `            let typed_input: ${spec.inputStruct} = serde_json::from_value(step_input)
                .map_err(|e| format!("Invalid input for action '${actionName}': {}", e))?;
            let output = ${spec.modulePath}(typed_input, db.clone()${storeArg}).await?;
            serde_json::to_value(output).map_err(|e| format!("Failed to serialize output of '${actionName}': {}", e))`;
}

function parallelBatchBlock(batch: WorkflowStep[], startIndex: number, _wfName: string): string {
  // Spawn each step's dispatch via tauri::async_runtime, collect handles,
  // await all, then merge. On failure: await the rest before applying ON_FAIL
  // (keeps observability complete; no early cancellation that hides what other
  // parallel steps were doing).
  //
  // Phase 1c note: parallel steps use the dispatch_action_stub fallback for
  // action execution. Typed parallel dispatch requires either making typed
  // actions take raw &DbPool (invasive) or generating per-action 'static
  // adapters (focused Phase 1d work). The workflow runtime, telemetry, and
  // checkpoint flow still exercise end-to-end for parallel batches; only the
  // action output is stubbed.
  const stepCalls = batch.map((step, k) => {
    const idx = startIndex + k;
    return `        // parallel step ${idx}: ${step.name} (parallel typed dispatch is Phase 1d)
        {
            let _db_p = db_arc.clone();
            let run_id_p = run_id.clone();
            let context_p = context.clone();
            let step_event_id = emit_telemetry(
                db_ref, "workflow_step_started", "${step.action}", Some("action"),
                Some(&run_id), Some("${step.name}"), "in_progress",
                None, None, None, None, None,
            );
            let started_p = Instant::now();
            let handle = tauri::async_runtime::spawn(async move {
                let res = dispatch_action_stub("${step.action}", context_p).await;
                let dur = started_p.elapsed().as_millis() as i64;
                (res, dur, step_event_id, run_id_p)
            });
            handles.push((${idx}, "${step.name}".to_string(), "${step.action}".to_string(), "${step.onFail || 'stop'}".to_string(), handle));
        }`;
  }).join('\n');

  return `    // parallel batch of ${batch.length} steps starting at index ${startIndex}
    {
        let mut handles: Vec<(i32, String, String, String, tauri::async_runtime::JoinHandle<(Result<serde_json::Value, String>, i64, String, String)>)> = Vec::new();
${stepCalls}

        let mut batch_failed: Option<String> = None;
        for (idx, step_name, _action_name, on_fail, handle) in handles {
            match handle.await {
                Ok((Ok(output), dur, step_event_id, _)) => {
                    if let Some(outs) = context.get_mut("outputs").and_then(|v| v.as_object_mut()) {
                        outs.insert(step_name.clone(), output.clone());
                    }
                    save_checkpoint(db_ref, &run_id, workflow_name, &step_name, idx, &context, "completed");
                    complete_telemetry(db_ref, &step_event_id, "success", Some(&output.to_string()), None, Some(dur));
                    steps_completed += 1;
                }
                Ok((Err(e), dur, step_event_id, _)) => {
                    save_checkpoint(db_ref, &run_id, workflow_name, &step_name, idx, &context, "failed");
                    complete_telemetry(db_ref, &step_event_id, "error", None, Some(&e), Some(dur));
                    if on_fail == "stop" && batch_failed.is_none() {
                        batch_failed = Some(format!("Step '{}' failed: {}", step_name, e));
                    }
                }
                Err(join_err) => {
                    if batch_failed.is_none() {
                        batch_failed = Some(format!("Step '{}' task panicked: {}", step_name, join_err));
                    }
                }
            }
        }

        if let Some(err) = batch_failed {
            let total_dur = started.elapsed().as_millis() as i64;
            save_run_completed(db_ref, &run_id, "failed", steps_completed, &context, Some(&err));
            complete_telemetry(db_ref, &wf_event_id, "error", None, Some(&err), Some(total_dur));
            return Ok(WorkflowRunResult {
                run_id, workflow_name: workflow_name.to_string(),
                status: "failed".to_string(),
                steps_completed, steps_total: total_steps,
                final_context: context, error: Some(err),
                duration_ms: total_dur,
            });
        }
    }`;
}

function onFailHandler(onFail: string, _wfName: string, stepName: string, retryDispatchBlock: string): string {
  switch (onFail) {
    case 'skip':
      return `                eprintln!("[workflow] step '${stepName}' failed (on_fail: skip): {}", e);
                // continue to next step`;
    case 'retry':
      // Phase 1c retry: one immediate retry using the SAME typed dispatch
      // block that the initial attempt used. Inlined per step to keep the
      // call site monomorphic.
      return `                eprintln!("[workflow] step '${stepName}' failed (on_fail: retry): {} — retrying once", e);
                let retry_event_id = emit_telemetry(
                    db_ref, "workflow_step_retry", "${stepName}", Some("action"),
                    Some(&run_id), Some("${stepName}"), "in_progress",
                    None, None, None, None, None,
                );
                let retry_started = Instant::now();
                let step_input = context.clone();
                let retry_result: Result<serde_json::Value, String> = async {
${retryDispatchBlock}
                }.await;
                match retry_result {
                    Ok(retry_output) => {
                        let retry_dur = retry_started.elapsed().as_millis() as i64;
                        if let Some(outs) = context.get_mut("outputs").and_then(|v| v.as_object_mut()) {
                            outs.insert("${stepName}".to_string(), retry_output.clone());
                        }
                        save_checkpoint(db_ref, &run_id, workflow_name, "${stepName}", -1, &context, "completed");
                        complete_telemetry(db_ref, &retry_event_id, "success", Some(&retry_output.to_string()), None, Some(retry_dur));
                        steps_completed += 1;
                    }
                    Err(retry_err) => {
                        let retry_dur = retry_started.elapsed().as_millis() as i64;
                        complete_telemetry(db_ref, &retry_event_id, "error", None, Some(&retry_err), Some(retry_dur));
                        let total_dur = started.elapsed().as_millis() as i64;
                        save_run_completed(db_ref, &run_id, "failed", steps_completed, &context, Some(&retry_err));
                        complete_telemetry(db_ref, &wf_event_id, "error", None, Some(&retry_err), Some(total_dur));
                        return Ok(WorkflowRunResult {
                            run_id, workflow_name: workflow_name.to_string(),
                            status: "failed".to_string(),
                            steps_completed, steps_total: total_steps,
                            final_context: context, error: Some(retry_err),
                            duration_ms: total_dur,
                        });
                    }
                }`;
    case 'fallback':
      // No fallback action wired yet — same as stop with a clear note.
      return `                eprintln!("[workflow] step '${stepName}' failed (on_fail: fallback) — fallback action not yet supported, halting");
                let total_dur = started.elapsed().as_millis() as i64;
                save_run_completed(db_ref, &run_id, "failed", steps_completed, &context, Some(&e));
                complete_telemetry(db_ref, &wf_event_id, "error", None, Some(&e), Some(total_dur));
                return Ok(WorkflowRunResult {
                    run_id, workflow_name: workflow_name.to_string(),
                    status: "failed".to_string(),
                    steps_completed, steps_total: total_steps,
                    final_context: context, error: Some(e),
                    duration_ms: total_dur,
                });`;
    default: // 'stop'
      return `                let total_dur = started.elapsed().as_millis() as i64;
                save_run_completed(db_ref, &run_id, "failed", steps_completed, &context, Some(&e));
                complete_telemetry(db_ref, &wf_event_id, "error", None, Some(&e), Some(total_dur));
                return Ok(WorkflowRunResult {
                    run_id, workflow_name: workflow_name.to_string(),
                    status: "failed".to_string(),
                    steps_completed, steps_total: total_steps,
                    final_context: context, error: Some(e),
                    duration_ms: total_dur,
                });`;
  }
}

// ─── TypeScript client API ────────────────────────────────────────────────

function buildWorkflowTs(ast: AgiFile): string {
  const workflows = ast.workflows;
  const perWorkflowExports = workflows
    .map((wf) => {
      const fnName = `run${toPascalCaseLocal(wf.name)}`;
      const cmdName = `run_${toSnakeCase(wf.name)}`;
      return `export async function ${fnName}(input: unknown): Promise<WorkflowRunResult> {
  return invoke<WorkflowRunResult>('${cmdName}', { input });
}`;
    })
    .join('\n\n');

  return `// Agicore Generated — Workflow client API (Phase 1b)
// DO NOT EDIT BY HAND. See core/compiler/src/generators/workflow.ts.

import { invoke } from '@tauri-apps/api/core';

export interface WorkflowRunResult {
  runId: string;
  workflowName: string;
  status: 'completed' | 'failed' | 'halted' | string;
  stepsCompleted: number;
  stepsTotal: number;
  finalContext: unknown;
  error: string | null;
  durationMs: number;
}

export interface WorkflowCheckpoint {
  id: string;
  runId: string;
  workflowName: string;
  stepName: string;
  stepIndex: number;
  accumulatedState: unknown;
  status: string;
  createdAt: string;
}

export interface WorkflowRunSummary {
  id: string;
  workflowName: string;
  status: string;
  stepsCompleted: number;
  stepsTotal: number;
  errorMessage: string | null;
  startedAt: string;
  completedAt: string | null;
}

export interface AndonEvent {
  id: string;
  triggerCategory:
    | 'action_error'
    | 'timeout'
    | 'guard_failure'
    | 'no_rule_match'
    | 'score_threshold'
    | 'response_unparseable'
    | string;
  workflowRunId: string | null;
  workflowName: string | null;
  stepName: string | null;
  stepIndex: number | null;
  failureMessage: string | null;
  capturedState: unknown;
  rollbackBoundary: 'internal' | 'external' | 'irreversible' | null | string;
  resolutionMutationId: string | null;
  firedAt: string;
  resolvedAt: string | null;
}

${perWorkflowExports}

export async function listWorkflowRuns(
  workflowName?: string,
  limit?: number,
): Promise<WorkflowRunSummary[]> {
  return invoke<WorkflowRunSummary[]>('list_workflow_runs', { workflowName, limit });
}

export async function getWorkflowCheckpoints(runId: string): Promise<WorkflowCheckpoint[]> {
  return invoke<WorkflowCheckpoint[]>('get_workflow_checkpoints', { runId });
}

export async function listAndonEvents(
  workflowName?: string,
  unresolvedOnly?: boolean,
  limit?: number,
): Promise<AndonEvent[]> {
  return invoke<AndonEvent[]>('list_andon_events', { workflowName, unresolvedOnly, limit });
}

export async function getAndonEvent(eventId: string): Promise<AndonEvent | null> {
  return invoke<AndonEvent | null>('get_andon_event', { eventId });
}

/**
 * Phase 11.8b — Pull the andon cord from the expert-system runtime when a
 * MODULE declared with EXPECTS_MATCH=true processes an event that no rule
 * matched. Returns the new andon_event id. The Phase 4c responder pipeline
 * picks the event up on its next poll / scheduled tick.
 *
 * Use this from your TS rule-evaluation loop:
 *   const fired = evaluateRules(event);
 *   if (!fired.length && moduleExpectsMatch) {
 *     await pullModuleAndon('alert_classification', event);
 *   }
 */
export async function pullModuleAndon(
  moduleName: string,
  eventPayload: unknown,
  failureReason?: string,
): Promise<string> {
  return invoke<string>('pull_module_andon', {
    moduleName,
    eventPayload,
    failureReason: failureReason ?? null,
  });
}
`;
}

function toPascalCaseLocal(s: string): string {
  return s
    .split(/[_-]/)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join('');
}

// Names of all Tauri commands this generator registers, for main.rs invoke_handler.
export function workflowCommandNames(ast: AgiFile): string[] {
  if (!isEnabled(ast)) return [];
  const perWf = ast.workflows.map((wf) => `commands::workflow::run_${toSnakeCase(wf.name)}`);
  return [
    ...perWf,
    'commands::workflow::list_workflow_runs',
    'commands::workflow::get_workflow_checkpoints',
    'commands::workflow::list_andon_events',
    'commands::workflow::get_andon_event',
    'commands::workflow::pull_module_andon',
  ];
}
