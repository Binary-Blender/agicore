// DISPUTE codegen — emits SQL migration, Rust commands, and TypeScript state machine + invoke wrappers

import type { AgiFile, DisputeDecl } from '@agicore/parser';

export function generateDispute(ast: AgiFile): Map<string, string> {
  const files = new Map<string, string>();
  if (ast.disputes.length === 0) return files;

  files.set('migrations/disputes.sql', buildDisputesSql());
  files.set('src-tauri/src/commands/disputes.rs', buildDisputesRs(ast.disputes));
  files.set('src/lib/disputes.ts', buildDisputesTs(ast.disputes));

  return files;
}

// ─── SQL migration ────────────────────────────────────────────────────────────

function buildDisputesSql(): string {
  return `-- DISPUTES: contract dispute lifecycle records
-- @agicore-generated — DO NOT EDIT (regenerate via: agicore compile)
CREATE TABLE IF NOT EXISTS disputes (
  id TEXT PRIMARY KEY,
  dispute_name TEXT NOT NULL,
  contract_id TEXT NOT NULL,
  state TEXT NOT NULL DEFAULT 'opened',
  resolution TEXT,
  opened_at TEXT NOT NULL,
  resolved_at TEXT,
  notes TEXT NOT NULL DEFAULT '',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_disputes_contract ON disputes(contract_id);
CREATE INDEX IF NOT EXISTS idx_disputes_state ON disputes(state);
`;
}

// ─── Rust commands ────────────────────────────────────────────────────────────

function buildDisputesRs(disputes: DisputeDecl[]): string {
  const disputeNames = disputes.map(d => `"${d.name}"`).join(', ');

  return `// DISPUTES — Tauri commands for dispute lifecycle management
// @agicore-generated — DO NOT EDIT (regenerate via: agicore compile)
// Declared disputes: [${disputeNames}]

use serde::{Deserialize, Serialize};
use tauri::State;
use crate::db::DbPool;

// ─── Types ────────────────────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DisputeRecord {
    pub id: String,
    pub dispute_name: String,
    pub contract_id: String,
    pub state: String,
    pub resolution: Option<String>,
    pub opened_at: String,
    pub resolved_at: Option<String>,
    pub notes: String,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct OpenDisputeInput {
    pub dispute_name: String,
    pub contract_id: String,
    pub notes: String,
}

// ─── DB helper ────────────────────────────────────────────────────────────────

fn fetch_dispute(id: &str, conn: &rusqlite::Connection) -> Result<DisputeRecord, String> {
    conn.query_row(
        "SELECT id, dispute_name, contract_id, state, resolution, opened_at, resolved_at, notes, created_at, updated_at FROM disputes WHERE id = ?",
        [id], |row| Ok(DisputeRecord {
            id: row.get(0)?, dispute_name: row.get(1)?, contract_id: row.get(2)?,
            state: row.get(3)?, resolution: row.get(4)?, opened_at: row.get(5)?,
            resolved_at: row.get(6)?, notes: row.get(7)?,
            created_at: row.get(8)?, updated_at: row.get(9)?,
        }),
    ).map_err(|e| e.to_string())
}

// ─── Tauri commands ───────────────────────────────────────────────────────────

#[tauri::command]
pub fn open_dispute(input: OpenDisputeInput, db: State<'_, DbPool>) -> Result<DisputeRecord, String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    let id = uuid::Uuid::new_v4().to_string();
    let now = chrono::Utc::now().to_rfc3339();
    conn.execute(
        "INSERT INTO disputes (id, dispute_name, contract_id, state, opened_at, notes, created_at, updated_at) VALUES (?, ?, ?, 'opened', ?, ?, ?, ?)",
        rusqlite::params![id, input.dispute_name, input.contract_id, now, input.notes, now, now],
    ).map_err(|e| e.to_string())?;
    let record = fetch_dispute(&id, &conn)?;
    Ok(record)
}

#[tauri::command]
pub fn get_dispute(id: String, db: State<'_, DbPool>) -> Result<DisputeRecord, String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    fetch_dispute(&id, &conn)
}

#[tauri::command]
pub fn list_disputes(db: State<'_, DbPool>) -> Result<Vec<DisputeRecord>, String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn.prepare(
        "SELECT id, dispute_name, contract_id, state, resolution, opened_at, resolved_at, notes, created_at, updated_at FROM disputes ORDER BY opened_at DESC"
    ).map_err(|e| e.to_string())?;
    let rows = stmt.query_map([], |row| Ok(DisputeRecord {
        id: row.get(0)?, dispute_name: row.get(1)?, contract_id: row.get(2)?,
        state: row.get(3)?, resolution: row.get(4)?, opened_at: row.get(5)?,
        resolved_at: row.get(6)?, notes: row.get(7)?,
        created_at: row.get(8)?, updated_at: row.get(9)?,
    })).map_err(|e| e.to_string())?
    .collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())?;
    Ok(rows)
}

#[tauri::command]
pub fn resolve_dispute(id: String, resolution: String, db: State<'_, DbPool>) -> Result<DisputeRecord, String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    let now = chrono::Utc::now().to_rfc3339();
    conn.execute(
        "UPDATE disputes SET state = 'resolved', resolution = ?, resolved_at = ?, updated_at = ? WHERE id = ?",
        rusqlite::params![resolution, now, now, id],
    ).map_err(|e| e.to_string())?;
    let record = fetch_dispute(&id, &conn)?;
    Ok(record)
}

#[tauri::command]
pub fn transition_dispute(id: String, new_state: String, db: State<'_, DbPool>) -> Result<DisputeRecord, String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    let now = chrono::Utc::now().to_rfc3339();
    conn.execute(
        "UPDATE disputes SET state = ?, updated_at = ? WHERE id = ?",
        rusqlite::params![new_state, now, id],
    ).map_err(|e| e.to_string())?;
    let record = fetch_dispute(&id, &conn)?;
    Ok(record)
}
`;
}

// ─── TypeScript state machine + invoke wrappers ───────────────────────────────

function buildDisputesTs(disputes: DisputeDecl[]): string {
  const interfaceBlocks = disputes.map(decl => {
    const stateUnion = decl.states.map(s => `'${s}'`).join(' | ');
    const resolutionUnion = decl.resolutions.map(r => `'${r}'`).join(' | ');

    const transitionEntries = decl.states.map((state, i) => {
      const next = decl.states.slice(i + 1, i + 2);
      return `  ${state}: [${next.map(s => `'${s}'`).join(', ')}],`;
    }).join('\n');

    return `// ─── ${decl.name} ─────────────────────────────────────────────────────────────
// ${decl.description}

export type ${decl.name}State = ${stateUnion};

export type ${decl.name}Resolution = ${resolutionUnion};

export interface ${decl.name}Record {
  id: string;
  contractId: string;
  state: ${decl.name}State;
  resolution: ${decl.name}Resolution | null;
  openedAt: string;
  resolvedAt: string | null;
  notes: string;
}

export const ${decl.name}Transitions: Record<${decl.name}State, ${decl.name}State[]> = {
${transitionEntries}
};

export const ${decl.name}ContractRef = '${decl.contract}';`;
  }).join('\n\n');

  return `// DISPUTES — TypeScript state machine types and typed invoke wrappers
// @agicore-generated — DO NOT EDIT (regenerate via: agicore compile)

import { invoke } from '@tauri-apps/api/core';

// ─── Shared dispute record ────────────────────────────────────────────────────

export interface DisputeRecord {
  id: string;
  disputeName: string;
  contractId: string;
  state: string;
  resolution: string | null;
  openedAt: string;
  resolvedAt: string | null;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface OpenDisputeInput {
  disputeName: string;
  contractId: string;
  notes: string;
}

${interfaceBlocks}

// ─── Typed invoke wrappers ────────────────────────────────────────────────────

export function openDispute(input: OpenDisputeInput): Promise<DisputeRecord> {
  return invoke('open_dispute', { input });
}

export function getDispute(id: string): Promise<DisputeRecord> {
  return invoke('get_dispute', { id });
}

export function listDisputes(): Promise<DisputeRecord[]> {
  return invoke('list_disputes');
}

export function resolveDispute(id: string, resolution: string): Promise<DisputeRecord> {
  return invoke('resolve_dispute', { id, resolution });
}

export function transitionDispute(id: string, newState: string): Promise<DisputeRecord> {
  return invoke('transition_dispute', { id, newState });
}
`;
}
