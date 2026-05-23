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
CREATE INDEX IF NOT EXISTS idx_wf_runs_status   ON workflow_runs(status, started_at DESC);`;
}

// ─── Rust runtime ──────────────────────────────────────────────────────────

function buildWorkflowRs(ast: AgiFile): string {
  const workflows = ast.workflows;

  // Resolve dispatch spec per unique action referenced across workflows.
  // Phase 1c: stop generating a runtime dispatcher; emit inline typed calls
  // at each step's call site. The lookup map gives the workflow function
  // builder the spec it needs per step.
  const dispatchByAction = new Map<string, ActionDispatchSpec>();
  for (const wf of workflows) {
    for (const step of wf.steps) {
      if (dispatchByAction.has(step.action)) continue;
      const decl = ast.actions.find((a) => a.name === step.action);
      if (!decl) {
        dispatchByAction.set(step.action, {
          kind: 'unsupported',
          reason: `action '${step.action}' is not declared (workflow validator should catch this; defensive fallback)`,
        });
        continue;
      }
      dispatchByAction.set(step.action, actionDispatchSpec(decl, ast));
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
      stepBlocks.push(serialStepBlock(step, i, wfLiteral, dispatchByAction.get(step.action)));
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
): string {
  const stepName = step.name;
  const actionName = step.action;
  const onFail = step.onFail || 'stop';

  const dispatchBlock = buildSerialDispatchBlock(actionName, dispatchSpec);
  const retryDispatchBlock = buildSerialDispatchBlock(actionName, dispatchSpec);

  return `    // step ${index}: ${stepName} (action: ${actionName}, on_fail: ${onFail})
    {
        let step_event_id = emit_telemetry(
            db_ref, "workflow_step_started", "${actionName}", Some("action"),
            Some(&run_id), Some("${stepName}"), "in_progress",
            None, None, None, None, None,
        );
        let step_started = Instant::now();
        let step_input = context.clone();
        let dispatch_result: Result<serde_json::Value, String> = async {
${dispatchBlock}
        }.await;
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
            Err(e) => {
                let dur = step_started.elapsed().as_millis() as i64;
                complete_telemetry(db_ref, &step_event_id, "error", None, Some(&e), Some(dur));
                save_checkpoint(db_ref, &run_id, workflow_name, "${stepName}", ${index}, &context, "failed");
${onFailHandler(onFail, wfName, stepName, retryDispatchBlock)}
            }
        }
    }`;
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
  ];
}
