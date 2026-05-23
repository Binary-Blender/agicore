// Shadow Evaluation Substrate
//
// Phase 11.5d of the Andon Loop architecture. After a proposal passes
// the deterministic sandbox AND its tier declares NBVE_WINDOW (the
// monitoring period during which the mutated rule set runs in shadow
// against production traffic), Agicore opens a mutation_shadow_evaluation
// row to track the observation window. SPC thresholds (defect rate,
// sample size) gate the eventual promotion to deployed.
//
// This is the SUBSTRATE: table + lifecycle helpers + Tauri commands.
// The actual dual-routing runtime — running the mutated rule set against
// real incoming events alongside the production set and recording per-
// event diffs — is the integration phase that follows.
//
// Lifecycle:
//   collecting       — observation window open; record_shadow_observation()
//                      appends per-event diff samples
//   sufficient_data  — sample_count >= min_window AND window elapsed;
//                      evaluate_shadow_window() may now be called
//   promoted         — SPC pass: defect_rate <= threshold; proposal can
//                      now safely transition to deployed
//   rolled_back      — SPC fail: shadow set diverges from prod beyond
//                      threshold; proposal rejected
//   inconclusive     — window elapsed without enough samples to evaluate

import type { AgiFile } from '@agicore/parser';

function isEnabled(ast: AgiFile): boolean {
  return !!ast.mutationPolicies && ast.mutationPolicies.length > 0;
}

export function generateShadowEval(ast: AgiFile): Map<string, string> {
  const files = new Map<string, string>();
  if (!isEnabled(ast)) return files;
  files.set('src-tauri/src/commands/shadow_eval.rs', buildShadowEvalRs());
  files.set('src/lib/shadow_eval.ts', buildShadowEvalTs());
  return files;
}

export function shadowEvalCommandNames(ast: AgiFile): string[] {
  if (!isEnabled(ast)) return [];
  return [
    'start_shadow_evaluation',
    'record_shadow_observation',
    'evaluate_shadow_window',
    'list_shadow_evaluations',
    'get_shadow_evaluation',
    'finalize_shadow_evaluations',   // Phase 11.5e — runtime closer
    'list_active_shadow_proposals',  // Phase 11.5e — for dual-routing helper
  ];
}

// ─── Rust runtime ──────────────────────────────────────────────────────────

function buildShadowEvalRs(): string {
  return `// Agicore Generated — Mutation shadow evaluation substrate (Phase 11.5d)
// DO NOT EDIT BY HAND. See core/compiler/src/generators/shadow_eval.ts.
//
// Tracks the NBVE shadow-mode observation window for tested mutation proposals.
// The integration that actually feeds observations from a dual-routing
// runtime lands in a future phase; this file owns the persistence + SPC
// gate logic so the integration just calls record_shadow_observation() per
// observed (prod, shadow) pair.

use crate::db::DbPool;
use rusqlite::params;
use serde::{Deserialize, Serialize};
use tauri::State;
use uuid::Uuid;

// ─── Public types ─────────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ShadowEvaluation {
    pub id: String,
    pub proposal_id: String,
    pub window_duration_ms: i64,
    pub status: String,                          // 'collecting' | 'sufficient_data' | 'promoted' | 'rolled_back' | 'inconclusive'
    pub samples_count: i64,
    pub samples_diverged: i64,                   // count where shadow != prod
    pub defect_rate: Option<f64>,                // diverged / count (None until first observation)
    pub defect_threshold: f64,                   // SPC: max acceptable defect rate
    pub min_samples: i64,                        // SPC: minimum sample count to evaluate
    pub started_at: String,
    pub window_ends_at: String,
    pub evaluated_at: Option<String>,
    pub spc_pass: Option<bool>,
    pub notes: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ShadowObservation {
    /// Free-form identifier for the production input the shadow saw.
    pub input_fingerprint: String,
    /// True when shadow output diverges from production output.
    pub diverged: bool,
    /// Optional diff payload (json), for debugging divergent samples.
    pub diff_detail: Option<serde_json::Value>,
}

// ─── Schema bootstrapping ────────────────────────────────────────────────

fn ensure_shadow_table(db: &DbPool) -> Result<(), String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    conn.execute_batch(
        "CREATE TABLE IF NOT EXISTS mutation_shadow_evaluations (
            id                    TEXT PRIMARY KEY,
            proposal_id           TEXT NOT NULL,
            window_duration_ms    INTEGER NOT NULL,
            status                TEXT NOT NULL DEFAULT 'collecting',
            samples_count         INTEGER NOT NULL DEFAULT 0,
            samples_diverged      INTEGER NOT NULL DEFAULT 0,
            defect_threshold      REAL NOT NULL DEFAULT 0.05,
            min_samples           INTEGER NOT NULL DEFAULT 100,
            started_at            TEXT NOT NULL,
            window_ends_at        TEXT NOT NULL,
            evaluated_at          TEXT,
            spc_pass              INTEGER,                       -- 1/0/NULL
            notes                 TEXT,
            UNIQUE (proposal_id)
         );
         CREATE INDEX IF NOT EXISTS idx_shadow_status   ON mutation_shadow_evaluations(status, started_at DESC);
         CREATE INDEX IF NOT EXISTS idx_shadow_proposal ON mutation_shadow_evaluations(proposal_id);

         CREATE TABLE IF NOT EXISTS mutation_shadow_observations (
            id                    TEXT PRIMARY KEY,
            shadow_eval_id        TEXT NOT NULL,
            input_fingerprint     TEXT NOT NULL,
            diverged              INTEGER NOT NULL,              -- 1/0
            diff_detail           TEXT,
            recorded_at           TEXT NOT NULL
         );
         CREATE INDEX IF NOT EXISTS idx_shadow_obs_eval ON mutation_shadow_observations(shadow_eval_id, recorded_at DESC);
         CREATE INDEX IF NOT EXISTS idx_shadow_obs_div  ON mutation_shadow_observations(shadow_eval_id, diverged);",
    ).map_err(|e| e.to_string())?;
    Ok(())
}

// ─── Helpers ─────────────────────────────────────────────────────────────

fn parse_duration_to_ms(s: &str) -> Option<u64> {
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

fn parse_row(r: &rusqlite::Row<'_>) -> rusqlite::Result<ShadowEvaluation> {
    let count: i64 = r.get(4)?;
    let diverged: i64 = r.get(5)?;
    let defect_rate = if count > 0 {
        Some((diverged as f64) / (count as f64))
    } else {
        None
    };
    let spc_pass_int: Option<i64> = r.get(11)?;
    let spc_pass = spc_pass_int.map(|v| v != 0);
    Ok(ShadowEvaluation {
        id:                  r.get(0)?,
        proposal_id:         r.get(1)?,
        window_duration_ms:  r.get(2)?,
        status:              r.get(3)?,
        samples_count:       count,
        samples_diverged:    diverged,
        defect_rate,
        defect_threshold:    r.get(6)?,
        min_samples:         r.get(7)?,
        started_at:          r.get(8)?,
        window_ends_at:      r.get(9)?,
        evaluated_at:        r.get(10)?,
        spc_pass,
        notes:               r.get(12)?,
    })
}

const COLS: &str = "id, proposal_id, window_duration_ms, status, samples_count, samples_diverged, defect_threshold, min_samples, started_at, window_ends_at, evaluated_at, spc_pass, notes";

// ─── Lifecycle helpers (callable from future sandbox integration) ────────

pub fn start_evaluation(
    db: &DbPool,
    proposal_id: &str,
    window_duration_str: &str,
    defect_threshold: f64,
    min_samples: i64,
) -> Result<ShadowEvaluation, String> {
    ensure_shadow_table(db)?;
    let window_ms = parse_duration_to_ms(window_duration_str)
        .ok_or_else(|| format!("Unparseable window duration: '{}'", window_duration_str))?;
    let id = Uuid::new_v4().to_string();
    let now = chrono::Utc::now();
    let started_at = now.to_rfc3339();
    let ends_at = (now + chrono::Duration::milliseconds(window_ms as i64)).to_rfc3339();
    {
        let conn = db.lock().map_err(|e| e.to_string())?;
        conn.execute(
            "INSERT INTO mutation_shadow_evaluations (id, proposal_id, window_duration_ms, status, defect_threshold, min_samples, started_at, window_ends_at) VALUES (?, ?, ?, 'collecting', ?, ?, ?, ?)",
            params![id, proposal_id, window_ms as i64, defect_threshold, min_samples, started_at, ends_at],
        ).map_err(|e| {
            if e.to_string().contains("UNIQUE") {
                format!("Shadow evaluation already exists for proposal '{}'", proposal_id)
            } else { e.to_string() }
        })?;
    }
    let conn = db.lock().map_err(|e| e.to_string())?;
    conn.query_row(&format!("SELECT {} FROM mutation_shadow_evaluations WHERE id = ?", COLS), params![id], parse_row)
        .map_err(|e| e.to_string())
}

pub fn record_observation(
    db: &DbPool,
    proposal_id: &str,
    obs: &ShadowObservation,
) -> Result<i64, String> {
    ensure_shadow_table(db)?;
    let eval_id: String = {
        let conn = db.lock().map_err(|e| e.to_string())?;
        conn.query_row(
            "SELECT id FROM mutation_shadow_evaluations WHERE proposal_id = ?",
            params![proposal_id],
            |r| r.get(0),
        ).map_err(|_| format!("No shadow evaluation open for proposal '{}'", proposal_id))?
    };
    let now = chrono::Utc::now().to_rfc3339();
    let diff_str = obs.diff_detail.as_ref().map(|v| v.to_string());
    {
        let conn = db.lock().map_err(|e| e.to_string())?;
        conn.execute(
            "INSERT INTO mutation_shadow_observations (id, shadow_eval_id, input_fingerprint, diverged, diff_detail, recorded_at) VALUES (?, ?, ?, ?, ?, ?)",
            params![Uuid::new_v4().to_string(), eval_id, obs.input_fingerprint, if obs.diverged { 1 } else { 0 }, diff_str, now],
        ).map_err(|e| e.to_string())?;
        conn.execute(
            "UPDATE mutation_shadow_evaluations SET samples_count = samples_count + 1, samples_diverged = samples_diverged + ? WHERE id = ?",
            params![if obs.diverged { 1 } else { 0 }, eval_id],
        ).map_err(|e| e.to_string())?;
    }
    // Return current sample count for the caller's convenience.
    let conn = db.lock().map_err(|e| e.to_string())?;
    conn.query_row(
        "SELECT samples_count FROM mutation_shadow_evaluations WHERE id = ?",
        params![eval_id],
        |r| r.get(0),
    ).map_err(|e| e.to_string())
}

/// Evaluate whether the shadow window has accumulated enough data AND
/// whether the observed defect rate satisfies the SPC threshold.
///
/// Decision rules:
///   - If samples_count < min_samples → 'inconclusive' (need more data
///     unless window has already elapsed, in which case still inconclusive)
///   - If window not yet elapsed AND samples_count < min_samples → no-op,
///     return current state with status='collecting'
///   - If samples_count >= min_samples AND defect_rate <= threshold →
///     'promoted' (caller may now transition the proposal to deployed)
///   - If samples_count >= min_samples AND defect_rate > threshold →
///     'rolled_back' (caller should reject the proposal)
pub fn evaluate_window(
    db: &DbPool,
    proposal_id: &str,
) -> Result<ShadowEvaluation, String> {
    ensure_shadow_table(db)?;
    let now = chrono::Utc::now();
    // Load current state.
    let eval = {
        let conn = db.lock().map_err(|e| e.to_string())?;
        conn.query_row(
            &format!("SELECT {} FROM mutation_shadow_evaluations WHERE proposal_id = ?", COLS),
            params![proposal_id],
            parse_row,
        ).map_err(|e| format!("No shadow evaluation for proposal '{}': {}", proposal_id, e))?
    };

    // Already evaluated → return as-is (idempotent).
    if eval.status == "promoted" || eval.status == "rolled_back" || eval.status == "inconclusive" {
        return Ok(eval);
    }

    let window_ends = chrono::DateTime::parse_from_rfc3339(&eval.window_ends_at)
        .map_err(|e| format!("Malformed window_ends_at: {}", e))?
        .with_timezone(&chrono::Utc);
    let window_elapsed = now >= window_ends;
    let enough_samples = eval.samples_count >= eval.min_samples;

    // Window still open + not enough samples → stay in collecting.
    if !window_elapsed && !enough_samples {
        return Ok(eval);
    }

    // Window open but we have enough samples → may evaluate early.
    // Window closed → must evaluate now (one way or the other).
    let dr = eval.defect_rate.unwrap_or(1.0);
    let (new_status, spc_pass, notes): (&str, bool, Option<String>) = if !enough_samples {
        ("inconclusive", false, Some(format!(
            "Window elapsed with {} samples (need {}); insufficient data to evaluate",
            eval.samples_count, eval.min_samples
        )))
    } else if dr <= eval.defect_threshold {
        ("promoted", true, Some(format!(
            "SPC pass: defect_rate={:.4} <= threshold={:.4} across {} samples",
            dr, eval.defect_threshold, eval.samples_count
        )))
    } else {
        ("rolled_back", false, Some(format!(
            "SPC fail: defect_rate={:.4} > threshold={:.4} across {} samples",
            dr, eval.defect_threshold, eval.samples_count
        )))
    };

    let evaluated_at = now.to_rfc3339();
    let spc_int: i64 = if spc_pass { 1 } else { 0 };
    {
        let conn = db.lock().map_err(|e| e.to_string())?;
        conn.execute(
            "UPDATE mutation_shadow_evaluations SET status = ?, evaluated_at = ?, spc_pass = ?, notes = ? WHERE proposal_id = ?",
            params![new_status, evaluated_at, spc_int, notes, proposal_id],
        ).map_err(|e| e.to_string())?;
    }
    let conn = db.lock().map_err(|e| e.to_string())?;
    conn.query_row(
        &format!("SELECT {} FROM mutation_shadow_evaluations WHERE proposal_id = ?", COLS),
        params![proposal_id],
        parse_row,
    ).map_err(|e| e.to_string())
}

// ─── Tauri commands ──────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StartEvalInput {
    pub proposal_id:          String,
    pub window:               String,             // "24h", "7d", etc
    pub defect_threshold:     f64,                // e.g., 0.05 = 5% max
    pub min_samples:          i64,                // e.g., 100
}

#[tauri::command]
pub fn start_shadow_evaluation(
    db: State<'_, DbPool>,
    input: StartEvalInput,
) -> Result<ShadowEvaluation, String> {
    start_evaluation(db.inner(), &input.proposal_id, &input.window, input.defect_threshold, input.min_samples)
}

#[tauri::command]
pub fn record_shadow_observation(
    db: State<'_, DbPool>,
    proposal_id: String,
    observation: ShadowObservation,
) -> Result<i64, String> {
    record_observation(db.inner(), &proposal_id, &observation)
}

#[tauri::command]
pub fn evaluate_shadow_window(
    db: State<'_, DbPool>,
    proposal_id: String,
) -> Result<ShadowEvaluation, String> {
    evaluate_window(db.inner(), &proposal_id)
}

#[tauri::command]
pub fn list_shadow_evaluations(
    db: State<'_, DbPool>,
    status: Option<String>,
    limit: Option<i64>,
) -> Result<Vec<ShadowEvaluation>, String> {
    ensure_shadow_table(db.inner())?;
    let conn = db.lock().map_err(|e| e.to_string())?;
    let lim = limit.unwrap_or(50).clamp(1, 1000);
    let mut sql = format!("SELECT {} FROM mutation_shadow_evaluations WHERE 1=1", COLS);
    let mut args: Vec<String> = Vec::new();
    if let Some(st) = &status { sql.push_str(" AND status = ?"); args.push(st.clone()); }
    sql.push_str(" ORDER BY started_at DESC LIMIT ?");
    let mut stmt = conn.prepare(&sql).map_err(|e| e.to_string())?;
    let param_refs: Vec<&dyn rusqlite::ToSql> = args
        .iter()
        .map(|s| s as &dyn rusqlite::ToSql)
        .chain(std::iter::once(&lim as &dyn rusqlite::ToSql))
        .collect();
    let rows = stmt
        .query_map(param_refs.as_slice(), parse_row)
        .map_err(|e| e.to_string())?;
    let mut out = Vec::new();
    for r in rows { out.push(r.map_err(|e| e.to_string())?); }
    Ok(out)
}

#[tauri::command]
pub fn get_shadow_evaluation(
    db: State<'_, DbPool>,
    proposal_id: String,
) -> Result<Option<ShadowEvaluation>, String> {
    ensure_shadow_table(db.inner())?;
    let conn = db.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn.prepare(&format!("SELECT {} FROM mutation_shadow_evaluations WHERE proposal_id = ?", COLS))
        .map_err(|e| e.to_string())?;
    let mut rows = stmt.query_map(params![proposal_id], parse_row).map_err(|e| e.to_string())?;
    match rows.next() {
        Some(r) => Ok(Some(r.map_err(|e| e.to_string())?)),
        None => Ok(None),
    }
}

// ─── Phase 11.5e — Runtime integration ────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ActiveShadowProposal {
    pub proposal_id:       String,
    pub target:            String,        // the mutation's target (module or workflow name)
    pub mutation_content:  serde_json::Value,
    pub samples_count:     i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FinalizationOutcome {
    pub total_active:        i64,
    pub promoted:            i64,
    pub rolled_back:         i64,
    pub inconclusive:        i64,
    pub still_collecting:    i64,
    pub transitions:         Vec<ProposalTransition>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProposalTransition {
    pub proposal_id: String,
    pub from_status: String,
    pub to_status:   String,
    pub reason:      String,
}

/// Phase 11.5e — fetch every proposal currently in 'shadow_evaluating'
/// status that targets the given workflow/module, with the mutation
/// content the consumer needs to dispatch the shadow run. Used by the
/// TS evaluateWithShadow helper to decide whether a given evaluation
/// path needs to ALSO run the shadow.
#[tauri::command]
pub fn list_active_shadow_proposals(
    db: State<'_, DbPool>,
    target: String,
) -> Result<Vec<ActiveShadowProposal>, String> {
    ensure_shadow_table(db.inner())?;
    let conn = db.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn.prepare(
        "SELECT p.id, p.target, p.mutation_content, COALESCE(s.samples_count, 0) FROM mutation_proposals p \
         LEFT JOIN mutation_shadow_evaluations s ON s.proposal_id = p.id \
         WHERE p.status = 'shadow_evaluating' AND p.target = ? \
         ORDER BY p.created_at DESC"
    ).map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map(params![target], |r| {
            let mc_str: String = r.get(2)?;
            let mc: serde_json::Value = serde_json::from_str(&mc_str).unwrap_or(serde_json::Value::Null);
            Ok(ActiveShadowProposal {
                proposal_id:      r.get(0)?,
                target:           r.get(1)?,
                mutation_content: mc,
                samples_count:    r.get(3)?,
            })
        })
        .map_err(|e| e.to_string())?;
    let mut out = Vec::new();
    for r in rows { out.push(r.map_err(|e| e.to_string())?); }
    Ok(out)
}

/// Phase 11.5e — runtime closer. Walks every shadow evaluation in
/// 'collecting' status, calls evaluate_window, and transitions the
/// originating proposal to its terminal status when the window decides:
///
///   shadow_evaluating + SPC pass  → deployed       + ledger SHADOW_PROMOTED
///   shadow_evaluating + SPC fail  → rejected       + ledger SHADOW_ROLLED_BACK
///   shadow_evaluating + inconclusive → escalated   + ledger SHADOW_INCONCLUSIVE
///                                      (kicks the decision to humans)
///   shadow_evaluating + still collecting → no-op   (window not yet elapsed
///                                                   OR not enough samples)
///
/// Designed to run on a cadence (every N minutes). The background poller
/// spawned in main.rs calls this; a UI button can also trigger it for
/// faster feedback during development.
#[tauri::command]
pub fn finalize_shadow_evaluations(
    db: State<'_, DbPool>,
) -> Result<FinalizationOutcome, String> {
    ensure_shadow_table(db.inner())?;
    let proposal_ids: Vec<String> = {
        let conn = db.lock().map_err(|e| e.to_string())?;
        let mut stmt = conn.prepare(
            "SELECT s.proposal_id FROM mutation_shadow_evaluations s \
             JOIN mutation_proposals p ON p.id = s.proposal_id \
             WHERE s.status = 'collecting' AND p.status = 'shadow_evaluating'"
        ).map_err(|e| e.to_string())?;
        stmt.query_map([], |r| r.get::<_, String>(0))
            .map_err(|e| e.to_string())?
            .collect::<Result<Vec<_>, _>>()
            .map_err(|e| e.to_string())?
    };
    let total_active = proposal_ids.len() as i64;
    let mut promoted = 0i64;
    let mut rolled_back = 0i64;
    let mut inconclusive = 0i64;
    let mut still_collecting = 0i64;
    let mut transitions = Vec::new();

    for proposal_id in proposal_ids {
        // Evaluate the window — may transition shadow status from collecting
        // to promoted/rolled_back/inconclusive, or stay in collecting if the
        // window hasn't elapsed yet.
        let eval = evaluate_window(db.inner(), &proposal_id)?;

        match eval.status.as_str() {
            "promoted" => {
                promoted += 1;
                let _ = transition_proposal(db.inner(), &proposal_id, "deployed", &eval)?;
                transitions.push(ProposalTransition {
                    proposal_id:  proposal_id.clone(),
                    from_status:  "shadow_evaluating".to_string(),
                    to_status:    "deployed".to_string(),
                    reason:       eval.notes.unwrap_or_default(),
                });
            }
            "rolled_back" => {
                rolled_back += 1;
                let _ = transition_proposal(db.inner(), &proposal_id, "rejected", &eval)?;
                transitions.push(ProposalTransition {
                    proposal_id:  proposal_id.clone(),
                    from_status:  "shadow_evaluating".to_string(),
                    to_status:    "rejected".to_string(),
                    reason:       eval.notes.unwrap_or_default(),
                });
            }
            "inconclusive" => {
                inconclusive += 1;
                let _ = transition_proposal(db.inner(), &proposal_id, "escalated", &eval)?;
                transitions.push(ProposalTransition {
                    proposal_id:  proposal_id.clone(),
                    from_status:  "shadow_evaluating".to_string(),
                    to_status:    "escalated".to_string(),
                    reason:       eval.notes.unwrap_or_default(),
                });
            }
            _ => {
                still_collecting += 1;  // window still open + not enough samples
            }
        }
    }

    Ok(FinalizationOutcome {
        total_active, promoted, rolled_back, inconclusive, still_collecting, transitions,
    })
}

/// Transition a proposal out of 'shadow_evaluating' to the resolved
/// terminal status and append a SHADOW_* ledger event. Idempotent
/// in practice — caller has already filtered to status='shadow_evaluating'.
fn transition_proposal(
    db: &DbPool,
    proposal_id: &str,
    to_status: &str,
    eval: &ShadowEvaluation,
) -> Result<(), String> {
    let now = chrono::Utc::now().to_rfc3339();
    let (policy_name, conn_release): (String, ()) = {
        let conn = db.lock().map_err(|e| e.to_string())?;
        let pn: String = conn.query_row(
            "SELECT policy_name FROM mutation_proposals WHERE id = ?",
            params![proposal_id],
            |r| r.get(0),
        ).map_err(|e| e.to_string())?;
        conn.execute(
            "UPDATE mutation_proposals SET status = ?, updated_at = ? WHERE id = ?",
            params![to_status, now, proposal_id],
        ).map_err(|e| e.to_string())?;
        (pn, ())
    };
    let _ = conn_release;

    let event_type = match to_status {
        "deployed"  => "SHADOW_PROMOTED",
        "rejected"  => "SHADOW_ROLLED_BACK",
        "escalated" => "SHADOW_INCONCLUSIVE",
        _ => "SHADOW_PROMOTED",
    };
    let payload = serde_json::json!({
        "samplesCount":    eval.samples_count,
        "samplesDiverged": eval.samples_diverged,
        "defectRate":      eval.defect_rate,
        "defectThreshold": eval.defect_threshold,
        "spcPass":         eval.spc_pass,
        "notes":           eval.notes,
        "decidedAt":       now,
    });
    let _ = crate::commands::ledger::append_entry(
        db, proposal_id, &policy_name, event_type, "shadow_runtime", payload,
    )?;
    Ok(())
}

// ─── Background poller (Phase 11.5e) ──────────────────────────────────────

/// Spawn a tokio task at app startup that calls finalize_shadow_evaluations
/// every check_interval_seconds. Independent task; failures don't propagate.
/// Called from main.rs setup hook (gated on hasMutationRuntime). The
/// default interval is 60s which is fast enough for typical NBVE windows
/// (24h+) without spinning unnecessarily.
pub fn start_shadow_finalizer(db: crate::db::DbPool, check_interval_seconds: u64) {
    tauri::async_runtime::spawn(async move {
        // Initial warm-up sleep so the poller doesn't run during app boot.
        tokio::time::sleep(tokio::time::Duration::from_secs(30)).await;
        let mut ticker = tokio::time::interval(tokio::time::Duration::from_secs(check_interval_seconds));
        ticker.tick().await;  // consume first immediate tick
        loop {
            ticker.tick().await;
            // Inline the finalization logic (can't easily call the Tauri
            // command from here without a State<'static>). Reuses the same
            // pure helper functions.
            let proposal_ids: Vec<String> = {
                let conn = match db.lock() { Ok(c) => c, Err(_) => continue };
                let mut stmt = match conn.prepare(
                    "SELECT s.proposal_id FROM mutation_shadow_evaluations s \
                     JOIN mutation_proposals p ON p.id = s.proposal_id \
                     WHERE s.status = 'collecting' AND p.status = 'shadow_evaluating'"
                ) { Ok(s) => s, Err(_) => continue };
                let rows = match stmt.query_map([], |r| r.get::<_, String>(0)) { Ok(r) => r, Err(_) => continue };
                let mut out = Vec::new();
                for r in rows { if let Ok(id) = r { out.push(id); } }
                out
            };
            for proposal_id in proposal_ids {
                let eval = match evaluate_window(&db, &proposal_id) { Ok(e) => e, Err(_) => continue };
                let to_status = match eval.status.as_str() {
                    "promoted"     => Some("deployed"),
                    "rolled_back"  => Some("rejected"),
                    "inconclusive" => Some("escalated"),
                    _ => None,
                };
                if let Some(to) = to_status {
                    let _ = transition_proposal(&db, &proposal_id, to, &eval);
                    eprintln!("[shadow_finalizer] proposal={} → {} ({})", proposal_id, to, eval.notes.unwrap_or_default());
                }
            }
        }
    });
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parse_duration_ms() {
        assert_eq!(parse_duration_to_ms("500ms"), Some(500));
        assert_eq!(parse_duration_to_ms("30s"),   Some(30_000));
        assert_eq!(parse_duration_to_ms("5m"),    Some(300_000));
        assert_eq!(parse_duration_to_ms("24h"),   Some(86_400_000));
        assert_eq!(parse_duration_to_ms("7d"),    Some(604_800_000));
    }

    #[test]
    fn parse_duration_rejects_bad_unit() {
        assert_eq!(parse_duration_to_ms("100x"), None);
        assert_eq!(parse_duration_to_ms("notanumber"), None);
        assert_eq!(parse_duration_to_ms(""), None);
    }
}
`;
}

// ─── TypeScript bindings ──────────────────────────────────────────────────

function buildShadowEvalTs(): string {
  return `// Agicore Generated — Shadow evaluation client bindings (Phase 11.5d)
// DO NOT EDIT BY HAND. See core/compiler/src/generators/shadow_eval.ts.

import { invoke } from '@tauri-apps/api/core';

export type ShadowStatus =
  | 'collecting'
  | 'sufficient_data'
  | 'promoted'
  | 'rolled_back'
  | 'inconclusive';

export interface ShadowEvaluation {
  id: string;
  proposalId: string;
  windowDurationMs: number;
  status: ShadowStatus;
  samplesCount: number;
  samplesDiverged: number;
  defectRate: number | null;
  defectThreshold: number;
  minSamples: number;
  startedAt: string;
  windowEndsAt: string;
  evaluatedAt: string | null;
  spcPass: boolean | null;
  notes: string | null;
}

export interface ShadowObservation {
  inputFingerprint: string;
  diverged: boolean;
  diffDetail?: unknown;
}

export interface StartEvalInput {
  proposalId: string;
  window: string;          // duration string: "24h" | "7d" | "5m" etc
  defectThreshold: number; // 0.05 = 5% max defect rate
  minSamples: number;      // e.g., 100
}

export async function startShadowEvaluation(input: StartEvalInput): Promise<ShadowEvaluation> {
  return invoke<ShadowEvaluation>('start_shadow_evaluation', { input });
}

export async function recordShadowObservation(
  proposalId: string,
  observation: ShadowObservation,
): Promise<number> {
  return invoke<number>('record_shadow_observation', { proposalId, observation });
}

export async function evaluateShadowWindow(proposalId: string): Promise<ShadowEvaluation> {
  return invoke<ShadowEvaluation>('evaluate_shadow_window', { proposalId });
}

export async function listShadowEvaluations(filter?: {
  status?: ShadowStatus;
  limit?: number;
}): Promise<ShadowEvaluation[]> {
  return invoke<ShadowEvaluation[]>('list_shadow_evaluations', {
    status: filter?.status ?? null,
    limit:  filter?.limit ?? null,
  });
}

export async function getShadowEvaluation(proposalId: string): Promise<ShadowEvaluation | null> {
  return invoke<ShadowEvaluation | null>('get_shadow_evaluation', { proposalId });
}

// ─── Phase 11.5e — Runtime integration ────────────────────────────────────

export interface ActiveShadowProposal {
  proposalId:      string;
  target:          string;
  mutationContent: unknown;
  samplesCount:    number;
}

export interface ProposalTransition {
  proposalId: string;
  fromStatus: string;
  toStatus:   string;
  reason:     string;
}

export interface FinalizationOutcome {
  totalActive:      number;
  promoted:         number;
  rolledBack:       number;
  inconclusive:     number;
  stillCollecting:  number;
  transitions:      ProposalTransition[];
}

export async function listActiveShadowProposals(target: string): Promise<ActiveShadowProposal[]> {
  return invoke<ActiveShadowProposal[]>('list_active_shadow_proposals', { target });
}

export async function finalizeShadowEvaluations(): Promise<FinalizationOutcome> {
  return invoke<FinalizationOutcome>('finalize_shadow_evaluations');
}

/**
 * Phase 11.5e — Dual-routing helper. The user's expert-system runtime calls
 * this wherever it evaluates an event/input for which a mutated rule set
 * MIGHT be in shadow mode. Pattern:
 *
 *   function classifyAlert(alert: Alert): Classification {
 *     return evaluateWithShadow('alert_classification', alert,
 *       (input) => productionClassifier(input),
 *       (input, shadowMutation) => applyMutationAndClassify(input, shadowMutation),
 *     );
 *   }
 *
 * Production always runs (its result is always returned). When a proposal
 * is in 'shadow_evaluating' targeting the given module/workflow, the
 * shadow function ALSO runs and the diff is recorded as a shadow
 * observation. If no shadow is active, the shadow function is skipped
 * (zero overhead).
 *
 * Equality is shallow JSON.stringify by default — pass a custom equals
 * if your outputs need structural comparison or tolerance windows.
 */
export async function evaluateWithShadow<TIn, TOut>(
  target:    string,
  input:     TIn,
  prodFn:    (input: TIn) => TOut,
  shadowFn:  (input: TIn, mutationContent: unknown) => TOut,
  options?: {
    equals?: (a: TOut, b: TOut) => boolean;
    fingerprint?: (input: TIn) => string;
  },
): Promise<TOut> {
  const prodOutput = prodFn(input);
  // Check for active shadows. If none, return prod result immediately.
  // (The list is small in steady state — usually 0 or 1 active per target.)
  let activeShadows: ActiveShadowProposal[] = [];
  try {
    activeShadows = await listActiveShadowProposals(target);
  } catch (e) {
    // If the lookup fails (DB down, runtime not initialised), production
    // path still works — the shadow eval just doesn't record this round.
    console.warn('[shadow] listActiveShadowProposals failed:', e);
    return prodOutput;
  }
  if (activeShadows.length === 0) return prodOutput;

  const equals = options?.equals ?? ((a, b) => JSON.stringify(a) === JSON.stringify(b));
  const fingerprint = options?.fingerprint ?? ((i) => JSON.stringify(i).substring(0, 200));
  const inputFingerprint = fingerprint(input);

  // Run the shadow against EACH active proposal. Record each observation
  // independently; they're separate evaluations even if they share input.
  for (const sp of activeShadows) {
    let shadowOutput: TOut;
    let diffDetail: unknown = null;
    let diverged: boolean;
    try {
      shadowOutput = shadowFn(input, sp.mutationContent);
      diverged = !equals(prodOutput, shadowOutput);
      if (diverged) {
        diffDetail = { prod: prodOutput, shadow: shadowOutput };
      }
    } catch (e) {
      // Shadow execution error counts as divergence — production rules
      // wouldn't have thrown.
      diverged = true;
      diffDetail = { error: String(e).substring(0, 200) };
    }
    try {
      await recordShadowObservation(sp.proposalId, {
        inputFingerprint,
        diverged,
        diffDetail,
      });
    } catch (e) {
      console.warn('[shadow] recordShadowObservation failed:', e);
      // Don't fail production — the shadow observation just doesn't land.
    }
  }

  return prodOutput;
}
`;
}
