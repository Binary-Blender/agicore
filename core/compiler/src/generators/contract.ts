// CONTRACT codegen — emits SQL migration, Rust CRUD commands, and TypeScript interfaces + invoke wrappers

import type { AgiFile, ContractDecl } from '@agicore/parser';

export function generateContract(ast: AgiFile): Map<string, string> {
  const files = new Map<string, string>();
  if (ast.contracts.length === 0) return files;

  files.set('migrations/contracts.sql', buildContractsSql());
  files.set('src-tauri/src/commands/contracts.rs', buildContractsRs(ast.contracts));
  files.set('src/lib/contracts.ts', buildContractsTs(ast.contracts));

  return files;
}

// ─── SQL migration ────────────────────────────────────────────────────────────

function buildContractsSql(): string {
  return `-- CONTRACTS: peer-to-peer smart-contract records
-- @agicore-generated — DO NOT EDIT (regenerate via: agicore compile)
CREATE TABLE IF NOT EXISTS contracts (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  client_id TEXT NOT NULL,
  provider_id TEXT NOT NULL,
  terms TEXT NOT NULL,
  deliverables TEXT NOT NULL,
  payment TEXT NOT NULL,
  governance TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  signed_at TEXT,
  activated_at TEXT,
  completed_at TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_contracts_status ON contracts(status);
CREATE INDEX IF NOT EXISTS idx_contracts_client ON contracts(client_id);
CREATE INDEX IF NOT EXISTS idx_contracts_provider ON contracts(provider_id);
`;
}

// ─── Rust commands ────────────────────────────────────────────────────────────

function buildContractsRs(contracts: ContractDecl[]): string {
  const contractNames = contracts.map(c => `"${c.name}"`).join(', ');

  return `// CONTRACTS — Tauri CRUD commands
// @agicore-generated — DO NOT EDIT (regenerate via: agicore compile)
// Declared contracts: [${contractNames}]

use serde::{Deserialize, Serialize};
use tauri::State;
use crate::db::DbPool;

// ─── Types ────────────────────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ContractRecord {
    pub id: String,
    pub name: String,
    pub client_id: String,
    pub provider_id: String,
    pub terms: String,
    pub deliverables: String,
    pub payment: String,
    pub governance: String,
    pub status: String,
    pub signed_at: Option<String>,
    pub activated_at: Option<String>,
    pub completed_at: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateContractInput {
    pub name: String,
    pub client_id: String,
    pub provider_id: String,
    pub terms: String,
    pub deliverables: String,
    pub payment: String,
    pub governance: String,
}

// ─── Tauri commands ───────────────────────────────────────────────────────────

#[tauri::command]
pub fn create_contract(input: CreateContractInput, db: State<'_, DbPool>) -> Result<ContractRecord, String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    let id = uuid::Uuid::new_v4().to_string();
    let now = chrono::Utc::now().to_rfc3339();
    conn.execute(
        "INSERT INTO contracts (id, name, client_id, provider_id, terms, deliverables, payment, governance, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'draft', ?, ?)",
        rusqlite::params![id, input.name, input.client_id, input.provider_id, input.terms, input.deliverables, input.payment, input.governance, now, now],
    ).map_err(|e| e.to_string())?;
    drop(conn);
    get_contract(id, db)
}

#[tauri::command]
pub fn get_contract(id: String, db: State<'_, DbPool>) -> Result<ContractRecord, String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    conn.query_row(
        "SELECT id, name, client_id, provider_id, terms, deliverables, payment, governance, status, signed_at, activated_at, completed_at, created_at, updated_at FROM contracts WHERE id = ?",
        [&id], |row| Ok(ContractRecord {
            id: row.get(0)?, name: row.get(1)?, client_id: row.get(2)?,
            provider_id: row.get(3)?, terms: row.get(4)?, deliverables: row.get(5)?,
            payment: row.get(6)?, governance: row.get(7)?, status: row.get(8)?,
            signed_at: row.get(9)?, activated_at: row.get(10)?, completed_at: row.get(11)?,
            created_at: row.get(12)?, updated_at: row.get(13)?,
        }),
    ).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn list_contracts(db: State<'_, DbPool>) -> Result<Vec<ContractRecord>, String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn.prepare(
        "SELECT id, name, client_id, provider_id, terms, deliverables, payment, governance, status, signed_at, activated_at, completed_at, created_at, updated_at FROM contracts ORDER BY created_at DESC"
    ).map_err(|e| e.to_string())?;
    let rows = stmt.query_map([], |row| Ok(ContractRecord {
        id: row.get(0)?, name: row.get(1)?, client_id: row.get(2)?,
        provider_id: row.get(3)?, terms: row.get(4)?, deliverables: row.get(5)?,
        payment: row.get(6)?, governance: row.get(7)?, status: row.get(8)?,
        signed_at: row.get(9)?, activated_at: row.get(10)?, completed_at: row.get(11)?,
        created_at: row.get(12)?, updated_at: row.get(13)?,
    })).map_err(|e| e.to_string())?
    .collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())?;
    Ok(rows)
}

#[tauri::command]
pub fn update_contract_status(id: String, status: String, db: State<'_, DbPool>) -> Result<ContractRecord, String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    let now = chrono::Utc::now().to_rfc3339();
    conn.execute(
        "UPDATE contracts SET status = ?, updated_at = ? WHERE id = ?",
        rusqlite::params![status, now, id],
    ).map_err(|e| e.to_string())?;
    drop(conn);
    get_contract(id, db)
}
`;
}

// ─── TypeScript interfaces + invoke wrappers ──────────────────────────────────

function buildContractsTs(contracts: ContractDecl[]): string {
  const interfaceBlocks = contracts.map(decl => {
    const partyFields = decl.parties.map(p => `  ${p.role}: ${p.type};`).join('\n');
    const termFields = decl.terms.map(t => `  ${t.key}: string;`).join('\n');
    const deliverableFields = decl.deliverables.map(d => `  ${d.name}: ${d.required ? 'string' : 'string | undefined'};`).join('\n');
    const timestampsFields = decl.timestamps
      ? `  createdAt: string;\n  updatedAt: string;`
      : '';

    return `// ─── ${decl.name} ─────────────────────────────────────────────────────────────
// ${decl.description}

export interface ${decl.name}Parties {
${partyFields}
}

export interface ${decl.name}Terms {
${termFields}
}

export interface ${decl.name}Deliverables {
${deliverableFields}
}

export interface ${decl.name}Payment {
  method: '${decl.payment.method}';
  amount: number;
  currency: string;
  release: '${decl.payment.release}';
  recurring: boolean;
}

export interface ${decl.name}Governance {
  signedBy: '${decl.governance.signedBy}';
  dispute: '${decl.governance.dispute}';
}

export interface ${decl.name}Contract {
  parties: ${decl.name}Parties;
  terms: ${decl.name}Terms;
  deliverables: ${decl.name}Deliverables;
  payment: ${decl.name}Payment;
  governance: ${decl.name}Governance;
${timestampsFields}
}`;
  }).join('\n\n');

  return `// CONTRACTS — TypeScript interfaces and typed invoke wrappers
// @agicore-generated — DO NOT EDIT (regenerate via: agicore compile)

import { invoke } from '@tauri-apps/api/core';

// ─── Shared contract record ───────────────────────────────────────────────────

export type ContractStatus = 'draft' | 'pending_signature' | 'signed' | 'active' | 'completed' | 'cancelled' | 'disputed';

export interface ContractRecord {
  id: string;
  name: string;
  clientId: string;
  providerId: string;
  terms: string;
  deliverables: string;
  payment: string;
  governance: string;
  status: ContractStatus;
  signedAt: string | null;
  activatedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateContractInput {
  name: string;
  clientId: string;
  providerId: string;
  terms: string;
  deliverables: string;
  payment: string;
  governance: string;
}

${interfaceBlocks}

// ─── Typed invoke wrappers ────────────────────────────────────────────────────

export function createContract(input: CreateContractInput): Promise<ContractRecord> {
  return invoke('create_contract', { input });
}

export function getContract(id: string): Promise<ContractRecord> {
  return invoke('get_contract', { id });
}

export function listContracts(): Promise<ContractRecord[]> {
  return invoke('list_contracts');
}

export function updateContractStatus(id: string, status: ContractStatus): Promise<ContractRecord> {
  return invoke('update_contract_status', { id, status });
}
`;
}
