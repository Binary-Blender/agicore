// Telemetry Code Generator
//
// Phase 1a of the Andon Loop architecture (see Idea Factory/andon_loop_architecture.md).
//
// Emits the telemetry substrate that every later Andon Loop phase builds on:
//   - SQL: a telemetry_events table with indexes (folded into 001_initial.sql)
//   - Rust: src-tauri/src/commands/telemetry.rs with emit_telemetry() helper
//     plus Tauri commands for querying recent events + summaries
//   - TypeScript: src/lib/telemetry.ts with typed invoke wrappers + types
//
// Activated when ast.app.telemetry === 'auto' or 'explicit'.
// When 'off' or unset (default), this generator emits nothing — preserves
// backward compatibility with apps that never opted in.
//
// Auto-instrumentation of ACTION / REASONER / TRIGGER bodies is a future
// enhancement (Phase 1b — paired with workflow runtime + checkpoints). For
// Phase 1a, code paths emit telemetry by calling the helper explicitly.

import type { AgiFile } from '@agicore/parser';

// ─── public entrypoint ─────────────────────────────────────────────────────

export function generateTelemetry(ast: AgiFile): Map<string, string> {
  const files = new Map<string, string>();

  // Telemetry is opt-in. Default ('off' or undefined) emits nothing.
  if (!ast.app.telemetry || ast.app.telemetry === 'off') return files;

  files.set('src-tauri/src/commands/telemetry.rs', buildTelemetryRs(ast));
  files.set('src/lib/telemetry.ts', buildTelemetryTs(ast));

  return files;
}

// ─── SQL schema (used by sql.ts via the helper below) ──────────────────────

/**
 * Returns the SQL for the telemetry table + indexes, ready to append to the
 * initial migration. Returns empty string when telemetry is off/unset.
 *
 * Exported (not just internal) so generators/sql.ts can splice this into
 * the unified 001_initial.sql migration alongside entity tables.
 */
export function telemetrySql(ast: AgiFile): string {
  if (!ast.app.telemetry || ast.app.telemetry === 'off') return '';

  return `
-- TELEMETRY: append-only event log for the Andon Loop architecture (Phase 1a)
-- Every event the system emits lands here. Read by the activity-log query
-- API, the Andon responder REASONER, and the improvement-loop REASONER.
CREATE TABLE IF NOT EXISTS telemetry_events (
  id            TEXT PRIMARY KEY,
  event_type    TEXT NOT NULL,
  source_name   TEXT NOT NULL,
  source_kind   TEXT,
  workflow_run_id TEXT,
  step_name     TEXT,
  status        TEXT NOT NULL DEFAULT 'success',
  input_data    TEXT,
  output_data   TEXT,
  error_message TEXT,
  duration_ms   INTEGER,
  started_at    TEXT NOT NULL,
  completed_at  TEXT,
  metadata      TEXT,
  created_at    TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_telemetry_event_type ON telemetry_events(event_type, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_telemetry_source     ON telemetry_events(source_name, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_telemetry_workflow   ON telemetry_events(workflow_run_id, step_name);
CREATE INDEX IF NOT EXISTS idx_telemetry_status     ON telemetry_events(status, started_at DESC);`;
}

// ─── Rust: telemetry.rs helpers + Tauri commands ───────────────────────────

function buildTelemetryRs(_ast: AgiFile): string {
  return `// Agicore Generated — Telemetry helpers + query API (Phase 1a)
// DO NOT EDIT BY HAND. See core/compiler/src/generators/telemetry.ts.

use crate::db::DbPool;
use rusqlite::params;
use serde::{Deserialize, Serialize};
use tauri::State;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TelemetryEvent {
    pub id: String,
    pub event_type: String,
    pub source_name: String,
    pub source_kind: Option<String>,
    pub workflow_run_id: Option<String>,
    pub step_name: Option<String>,
    pub status: String,
    pub input_data: Option<String>,
    pub output_data: Option<String>,
    pub error_message: Option<String>,
    pub duration_ms: Option<i64>,
    pub started_at: String,
    pub completed_at: Option<String>,
    pub metadata: Option<String>,
    pub created_at: Option<String>,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TelemetryFilter {
    pub event_type: Option<String>,
    pub source_name: Option<String>,
    pub workflow_run_id: Option<String>,
    pub status: Option<String>,
    pub since: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TelemetrySummary {
    pub total_events: i64,
    pub events_by_type: Vec<(String, i64)>,
    pub events_by_source: Vec<(String, i64)>,
    pub error_rate: f64,
    pub window_hours: i64,
}

// ─── internal helper: emit one event ─────────────────────────────────────

/// Append a telemetry event. Returns the new event id.
///
/// Called from generated runtime code (action handlers, reasoner runs,
/// trigger firings). Designed to never fail the caller — a telemetry write
/// failure is logged but does not propagate.
pub fn emit_telemetry(
    db: &DbPool,
    event_type: &str,
    source_name: &str,
    source_kind: Option<&str>,
    workflow_run_id: Option<&str>,
    step_name: Option<&str>,
    status: &str,
    input_data: Option<&str>,
    output_data: Option<&str>,
    error_message: Option<&str>,
    duration_ms: Option<i64>,
    metadata: Option<&str>,
) -> String {
    let id = Uuid::new_v4().to_string();
    let now = chrono::Utc::now().to_rfc3339();
    let completed_at = if status == "in_progress" { None } else { Some(now.clone()) };

    let result = (|| -> Result<(), rusqlite::Error> {
        let conn = db.lock().map_err(|_| rusqlite::Error::InvalidQuery)?;
        conn.execute(
            "INSERT INTO telemetry_events (id, event_type, source_name, source_kind, workflow_run_id, step_name, status, input_data, output_data, error_message, duration_ms, started_at, completed_at, metadata) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            params![
                id, event_type, source_name, source_kind, workflow_run_id, step_name,
                status, input_data, output_data, error_message, duration_ms,
                now, completed_at, metadata,
            ],
        )?;
        Ok(())
    })();

    if let Err(e) = result {
        eprintln!("[telemetry] emit failed (non-fatal): {}", e);
    }

    id
}

/// Update an in-progress event with completion data. Used when the caller
/// emitted a "started" event and now wants to attach the outcome without
/// creating a second record.
pub fn complete_telemetry(
    db: &DbPool,
    event_id: &str,
    status: &str,
    output_data: Option<&str>,
    error_message: Option<&str>,
    duration_ms: Option<i64>,
) {
    let now = chrono::Utc::now().to_rfc3339();
    let result = (|| -> Result<(), rusqlite::Error> {
        let conn = db.lock().map_err(|_| rusqlite::Error::InvalidQuery)?;
        conn.execute(
            "UPDATE telemetry_events SET status = ?, output_data = ?, error_message = ?, duration_ms = ?, completed_at = ? WHERE id = ?",
            params![status, output_data, error_message, duration_ms, now, event_id],
        )?;
        Ok(())
    })();

    if let Err(e) = result {
        eprintln!("[telemetry] complete failed (non-fatal): {}", e);
    }
}

// ─── Tauri commands: query the activity log ─────────────────────────────

#[tauri::command]
pub fn query_telemetry(
    db: State<'_, DbPool>,
    filter: Option<TelemetryFilter>,
    limit: Option<i64>,
) -> Result<Vec<TelemetryEvent>, String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    let lim = limit.unwrap_or(100).clamp(1, 10_000);
    let f = filter.unwrap_or_default();

    let mut sql = String::from(
        "SELECT id, event_type, source_name, source_kind, workflow_run_id, step_name, status, input_data, output_data, error_message, duration_ms, started_at, completed_at, metadata, created_at FROM telemetry_events WHERE 1=1"
    );
    let mut args: Vec<String> = Vec::new();

    if let Some(et) = &f.event_type      { sql.push_str(" AND event_type = ?");       args.push(et.clone()); }
    if let Some(sn) = &f.source_name     { sql.push_str(" AND source_name = ?");      args.push(sn.clone()); }
    if let Some(wf) = &f.workflow_run_id { sql.push_str(" AND workflow_run_id = ?");  args.push(wf.clone()); }
    if let Some(st) = &f.status          { sql.push_str(" AND status = ?");           args.push(st.clone()); }
    if let Some(sc) = &f.since           { sql.push_str(" AND started_at >= ?");      args.push(sc.clone()); }

    sql.push_str(" ORDER BY started_at DESC LIMIT ?");

    let mut stmt = conn.prepare(&sql).map_err(|e| e.to_string())?;
    let param_refs: Vec<&dyn rusqlite::ToSql> = args
        .iter()
        .map(|s| s as &dyn rusqlite::ToSql)
        .chain(std::iter::once(&lim as &dyn rusqlite::ToSql))
        .collect();

    let rows = stmt
        .query_map(param_refs.as_slice(), |row| {
            Ok(TelemetryEvent {
                id: row.get(0)?,
                event_type: row.get(1)?,
                source_name: row.get(2)?,
                source_kind: row.get(3)?,
                workflow_run_id: row.get(4)?,
                step_name: row.get(5)?,
                status: row.get(6)?,
                input_data: row.get(7)?,
                output_data: row.get(8)?,
                error_message: row.get(9)?,
                duration_ms: row.get(10)?,
                started_at: row.get(11)?,
                completed_at: row.get(12)?,
                metadata: row.get(13)?,
                created_at: row.get(14)?,
            })
        })
        .map_err(|e| e.to_string())?;

    let mut out = Vec::new();
    for r in rows { out.push(r.map_err(|e| e.to_string())?); }
    Ok(out)
}

#[tauri::command]
pub fn get_telemetry_summary(
    db: State<'_, DbPool>,
    window_hours: Option<i64>,
) -> Result<TelemetrySummary, String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    let hours = window_hours.unwrap_or(24).clamp(1, 24 * 365);

    // hours is clamped to [1, 24*365] above so chrono::Duration::hours is safe here
    let since = chrono::Utc::now() - chrono::Duration::hours(hours);
    let since_str = since.to_rfc3339();

    let total: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM telemetry_events WHERE started_at >= ?",
            params![since_str],
            |r| r.get(0),
        )
        .map_err(|e| e.to_string())?;

    let mut by_type = Vec::new();
    {
        let mut stmt = conn
            .prepare("SELECT event_type, COUNT(*) c FROM telemetry_events WHERE started_at >= ? GROUP BY event_type ORDER BY c DESC LIMIT 20")
            .map_err(|e| e.to_string())?;
        let rows = stmt
            .query_map(params![since_str], |r| Ok((r.get::<_, String>(0)?, r.get::<_, i64>(1)?)))
            .map_err(|e| e.to_string())?;
        for r in rows { by_type.push(r.map_err(|e| e.to_string())?); }
    }

    let mut by_source = Vec::new();
    {
        let mut stmt = conn
            .prepare("SELECT source_name, COUNT(*) c FROM telemetry_events WHERE started_at >= ? GROUP BY source_name ORDER BY c DESC LIMIT 20")
            .map_err(|e| e.to_string())?;
        let rows = stmt
            .query_map(params![since_str], |r| Ok((r.get::<_, String>(0)?, r.get::<_, i64>(1)?)))
            .map_err(|e| e.to_string())?;
        for r in rows { by_source.push(r.map_err(|e| e.to_string())?); }
    }

    let errors: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM telemetry_events WHERE started_at >= ? AND status = 'error'",
            params![since_str],
            |r| r.get(0),
        )
        .map_err(|e| e.to_string())?;

    let error_rate = if total > 0 { errors as f64 / total as f64 } else { 0.0 };

    Ok(TelemetrySummary {
        total_events: total,
        events_by_type: by_type,
        events_by_source: by_source,
        error_rate,
        window_hours: hours,
    })
}

#[tauri::command]
pub fn clear_telemetry_before(
    db: State<'_, DbPool>,
    before: String,
) -> Result<i64, String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    let n = conn
        .execute("DELETE FROM telemetry_events WHERE started_at < ?", params![before])
        .map_err(|e| e.to_string())?;
    Ok(n as i64)
}
`;
}

// ─── TypeScript: typed invoke wrappers + types ─────────────────────────────

function buildTelemetryTs(_ast: AgiFile): string {
  return `// Agicore Generated — Telemetry client API (Phase 1a)
// DO NOT EDIT BY HAND. See core/compiler/src/generators/telemetry.ts.

import { invoke } from '@tauri-apps/api/core';

export interface TelemetryEvent {
  id: string;
  eventType: string;
  sourceName: string;
  sourceKind: string | null;
  workflowRunId: string | null;
  stepName: string | null;
  status: 'success' | 'error' | 'andon' | 'in_progress' | string;
  inputData: string | null;
  outputData: string | null;
  errorMessage: string | null;
  durationMs: number | null;
  startedAt: string;
  completedAt: string | null;
  metadata: string | null;
  createdAt: string | null;
}

export interface TelemetryFilter {
  eventType?: string;
  sourceName?: string;
  workflowRunId?: string;
  status?: string;
  since?: string;
}

export interface TelemetrySummary {
  totalEvents: number;
  eventsByType: Array<[string, number]>;
  eventsBySource: Array<[string, number]>;
  errorRate: number;
  windowHours: number;
}

export async function queryTelemetry(
  filter?: TelemetryFilter,
  limit?: number,
): Promise<TelemetryEvent[]> {
  return invoke<TelemetryEvent[]>('query_telemetry', { filter, limit });
}

export async function getTelemetrySummary(windowHours?: number): Promise<TelemetrySummary> {
  return invoke<TelemetrySummary>('get_telemetry_summary', { windowHours });
}

export async function clearTelemetryBefore(before: string): Promise<number> {
  return invoke<number>('clear_telemetry_before', { before });
}
`;
}
