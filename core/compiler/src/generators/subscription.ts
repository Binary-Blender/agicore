// SUBSCRIPTION codegen — emits SQL migration, Rust CRUD commands, and TypeScript interfaces + invoke wrappers

import type { AgiFile, SubscriptionDecl } from '@agicore/parser';

export function generateSubscription(ast: AgiFile): Map<string, string> {
  const files = new Map<string, string>();
  if (ast.subscriptions.length === 0) return files;

  files.set('migrations/subscriptions.sql', buildSubscriptionsSql());
  files.set('src-tauri/src/commands/subscriptions.rs', buildSubscriptionsRs(ast.subscriptions));
  files.set('src/lib/subscriptions.ts', buildSubscriptionsTs(ast.subscriptions));

  return files;
}

// ─── SQL migration ────────────────────────────────────────────────────────────

function buildSubscriptionsSql(): string {
  return `-- SUBSCRIPTIONS: recurring payment and access records
-- @agicore-generated — DO NOT EDIT (regenerate via: agicore compile)
CREATE TABLE IF NOT EXISTS subscriptions (
  id TEXT PRIMARY KEY,
  subscription_name TEXT NOT NULL,
  provider_id TEXT NOT NULL,
  subscriber_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  amount REAL NOT NULL,
  interval TEXT NOT NULL,
  auto_renew INTEGER NOT NULL DEFAULT 1,
  started_at TEXT NOT NULL,
  renews_at TEXT,
  cancelled_at TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_provider ON subscriptions(provider_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_subscriber ON subscriptions(subscriber_id);
`;
}

// ─── Rust commands ────────────────────────────────────────────────────────────

function buildSubscriptionsRs(subscriptions: SubscriptionDecl[]): string {
  const subNames = subscriptions.map(s => `"${s.name}"`).join(', ');

  return `// SUBSCRIPTIONS — Tauri CRUD commands
// @agicore-generated — DO NOT EDIT (regenerate via: agicore compile)
// Declared subscriptions: [${subNames}]

use serde::{Deserialize, Serialize};
use tauri::State;
use crate::db::DbPool;

// ─── Types ────────────────────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SubscriptionRecord {
    pub id: String,
    pub subscription_name: String,
    pub provider_id: String,
    pub subscriber_id: String,
    pub status: String,
    pub amount: f64,
    pub interval: String,
    pub auto_renew: bool,
    pub started_at: String,
    pub renews_at: Option<String>,
    pub cancelled_at: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateSubscriptionInput {
    pub subscription_name: String,
    pub provider_id: String,
    pub subscriber_id: String,
    pub amount: f64,
    pub interval: String,
    pub auto_renew: bool,
    pub started_at: String,
}

// ─── Tauri commands ───────────────────────────────────────────────────────────

#[tauri::command]
pub fn create_subscription(input: CreateSubscriptionInput, db: State<'_, DbPool>) -> Result<SubscriptionRecord, String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    let id = uuid::Uuid::new_v4().to_string();
    let now = chrono::Utc::now().to_rfc3339();
    let auto_renew_int = if input.auto_renew { 1i64 } else { 0i64 };
    conn.execute(
        "INSERT INTO subscriptions (id, subscription_name, provider_id, subscriber_id, status, amount, interval, auto_renew, started_at, created_at, updated_at) VALUES (?, ?, ?, ?, 'active', ?, ?, ?, ?, ?, ?)",
        rusqlite::params![id, input.subscription_name, input.provider_id, input.subscriber_id, input.amount, input.interval, auto_renew_int, input.started_at, now, now],
    ).map_err(|e| e.to_string())?;
    drop(conn);
    get_subscription_by_id(id, db)
}

fn get_subscription_by_id(id: String, db: State<'_, DbPool>) -> Result<SubscriptionRecord, String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    conn.query_row(
        "SELECT id, subscription_name, provider_id, subscriber_id, status, amount, interval, auto_renew, started_at, renews_at, cancelled_at, created_at, updated_at FROM subscriptions WHERE id = ?",
        [&id], |row| {
            let auto_renew_int: i64 = row.get(7)?;
            Ok(SubscriptionRecord {
                id: row.get(0)?, subscription_name: row.get(1)?, provider_id: row.get(2)?,
                subscriber_id: row.get(3)?, status: row.get(4)?, amount: row.get(5)?,
                interval: row.get(6)?, auto_renew: auto_renew_int != 0,
                started_at: row.get(8)?, renews_at: row.get(9)?, cancelled_at: row.get(10)?,
                created_at: row.get(11)?, updated_at: row.get(12)?,
            })
        },
    ).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn list_subscriptions(db: State<'_, DbPool>) -> Result<Vec<SubscriptionRecord>, String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn.prepare(
        "SELECT id, subscription_name, provider_id, subscriber_id, status, amount, interval, auto_renew, started_at, renews_at, cancelled_at, created_at, updated_at FROM subscriptions ORDER BY created_at DESC"
    ).map_err(|e| e.to_string())?;
    let rows = stmt.query_map([], |row| {
        let auto_renew_int: i64 = row.get(7)?;
        Ok(SubscriptionRecord {
            id: row.get(0)?, subscription_name: row.get(1)?, provider_id: row.get(2)?,
            subscriber_id: row.get(3)?, status: row.get(4)?, amount: row.get(5)?,
            interval: row.get(6)?, auto_renew: auto_renew_int != 0,
            started_at: row.get(8)?, renews_at: row.get(9)?, cancelled_at: row.get(10)?,
            created_at: row.get(11)?, updated_at: row.get(12)?,
        })
    }).map_err(|e| e.to_string())?
    .collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())?;
    Ok(rows)
}

#[tauri::command]
pub fn cancel_subscription(id: String, db: State<'_, DbPool>) -> Result<SubscriptionRecord, String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    let now = chrono::Utc::now().to_rfc3339();
    conn.execute(
        "UPDATE subscriptions SET status = 'cancelled', cancelled_at = ?, updated_at = ? WHERE id = ?",
        rusqlite::params![now, now, id],
    ).map_err(|e| e.to_string())?;
    drop(conn);
    get_subscription_by_id(id, db)
}
`;
}

// ─── TypeScript interfaces + invoke wrappers ──────────────────────────────────

function buildSubscriptionsTs(subscriptions: SubscriptionDecl[]): string {
  const interfaceBlocks = subscriptions.map(decl => {
    const perksType = decl.terms.perks.length > 0
      ? `Array<${decl.terms.perks.map(p => `'${p}'`).join(' | ')}>`
      : 'string[]';

    return `// ─── ${decl.name} ─────────────────────────────────────────────────────────────
// ${decl.description}

export interface ${decl.name}Record {
  id: string;
  provider: string;
  subscriber: string;
  status: 'active' | 'paused' | 'cancelled' | 'expired';
  amount: number;
  currency: string;
  interval: '${decl.terms.interval}';
  perks: ${perksType};
  autoRenew: boolean;
  startedAt: string;
  renewsAt: string | null;
  cancelledAt: string | null;
}

export const ${decl.name}Config = {
  provider: '${decl.provider}',
  subscriber: '${decl.subscriber}',
  terms: {
    amount: ${decl.terms.amount},
    interval: '${decl.terms.interval}',
    perks: [${decl.terms.perks.map(p => `'${p}'`).join(', ')}],
  },
  payment: {
    method: '${decl.payment.method}',
    autoRenew: ${decl.payment.autoRenew},
  },
} as const;`;
  }).join('\n\n');

  return `// SUBSCRIPTIONS — TypeScript interfaces and typed invoke wrappers
// @agicore-generated — DO NOT EDIT (regenerate via: agicore compile)

import { invoke } from '@tauri-apps/api/core';

// ─── Shared subscription record ───────────────────────────────────────────────

export interface SubscriptionRecord {
  id: string;
  subscriptionName: string;
  providerId: string;
  subscriberId: string;
  status: 'active' | 'paused' | 'cancelled' | 'expired';
  amount: number;
  interval: string;
  autoRenew: boolean;
  startedAt: string;
  renewsAt: string | null;
  cancelledAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSubscriptionInput {
  subscriptionName: string;
  providerId: string;
  subscriberId: string;
  amount: number;
  interval: string;
  autoRenew: boolean;
  startedAt: string;
}

${interfaceBlocks}

// ─── Typed invoke wrappers ────────────────────────────────────────────────────

export function createSubscription(input: CreateSubscriptionInput): Promise<SubscriptionRecord> {
  return invoke('create_subscription', { input });
}

export function listSubscriptions(): Promise<SubscriptionRecord[]> {
  return invoke('list_subscriptions');
}

export function cancelSubscription(id: string): Promise<SubscriptionRecord> {
  return invoke('cancel_subscription', { id });
}
`;
}
