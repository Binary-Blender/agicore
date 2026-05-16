// TRIGGER codegen — emits Rust reactive dispatcher and React UI stub

import type { AgiFile, TriggerDecl } from '@agicore/parser';

export function generateTrigger(ast: AgiFile): Map<string, string> {
  const files = new Map<string, string>();
  if (ast.triggers.length === 0) return files;

  files.set('src-tauri/src/commands/trigger.rs', buildTriggerRs(ast.triggers));
  files.set('migrations/triggers.sql', buildMigrationSql());
  files.set('src/components/TriggerView.tsx', buildTriggerViewStub(ast.triggers));

  return files;
}

// ─── Debounce parser ──────────────────────────────────────────────────────────

function parseDebounceToSecs(debounce: string | undefined): number {
  if (!debounce) return 0;
  const match = debounce.match(/^(\d+)(s|m|h)$/);
  if (!match) return 0;
  const n = parseInt(match[1]!, 10);
  const unit = match[2];
  if (unit === 's') return n;
  if (unit === 'm') return n * 60;
  if (unit === 'h') return n * 3600;
  return 0;
}

// ─── Rust runtime ─────────────────────────────────────────────────────────────

function buildTriggerRs(triggers: TriggerDecl[]): string {
  const triggerDefs = triggers.map(t => {
    const channels = t.when.channels.map(c => `"${c}"`).join(', ');
    const packet = t.when.packet ? `Some("${t.when.packet}")` : 'None';
    const debounce = parseDebounceToSecs(t.debounce);
    return `    TriggerDef {
        name: "${t.name}",
        description: "${t.description.replace(/"/g, '\\"')}",
        when_channels: &[${channels}],
        when_packet: ${packet},
        fires_kind: "${t.fires.kind}",
        fires_target: "${t.fires.target}",
        debounce_secs: ${debounce},
    },`;
  }).join('\n');

  const hasReasonerFires = triggers.some(t => t.fires.kind === 'reasoner');
  const reasonerImport = hasReasonerFires
    ? 'use super::channel::publish_message_internal;\nuse super::reasoner::{start_run, execute_reasoner, finish_run, fail_run, get_run};\nuse super::semantic_memory::store_insight;'
    : 'use super::channel::publish_message_internal;';

  return `// TRIGGER runtime — reactive event binding dispatcher
// @agicore-generated — DO NOT EDIT (regenerate via: agicore compile)

use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter, State};
use crate::ai_service::ApiKeyStore;
use crate::db::DbPool;
${reasonerImport}
use super::channel::mark_processed_internal;

// ─── Trigger registry ─────────────────────────────────────────────────────────

struct TriggerDef {
    name: &'static str,
    description: &'static str,
    when_channels: &'static [&'static str],
    when_packet: Option<&'static str>,
    fires_kind: &'static str,
    fires_target: &'static str,
    debounce_secs: u64,
}

const TRIGGERS: &[TriggerDef] = &[
${triggerDefs}
];

// ─── Types ────────────────────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TriggerLogEntry {
    pub id: String,
    pub trigger_name: String,
    pub channel_name: String,
    pub message_id: String,
    pub fires_kind: String,
    pub fires_target: String,
    pub status: String,
    pub fired_at: String,
}

impl TriggerLogEntry {
    fn from_row(row: &rusqlite::Row) -> Self {
        Self {
            id: row.get("id").unwrap(),
            trigger_name: row.get("trigger_name").unwrap(),
            channel_name: row.get("channel_name").unwrap(),
            message_id: row.get("message_id").unwrap(),
            fires_kind: row.get("fires_kind").unwrap(),
            fires_target: row.get("fires_target").unwrap(),
            status: row.get("status").unwrap(),
            fired_at: row.get("fired_at").unwrap(),
        }
    }
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TriggerStatus {
    pub name: String,
    pub description: String,
    pub when_channels: Vec<String>,
    pub when_packet: Option<String>,
    pub fires_kind: String,
    pub fires_target: String,
    pub debounce_secs: u64,
    pub last_fired: Option<TriggerLogEntry>,
}

// ─── Tauri commands ───────────────────────────────────────────────────────────

#[tauri::command]
pub fn list_trigger_statuses(db: State<'_, DbPool>) -> Result<Vec<TriggerStatus>, String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    let mut result = Vec::new();
    for def in TRIGGERS {
        let last_fired = conn.query_row(
            "SELECT * FROM trigger_log WHERE trigger_name = ? ORDER BY fired_at DESC LIMIT 1",
            [def.name], |row| Ok(TriggerLogEntry::from_row(row))
        ).ok();
        result.push(TriggerStatus {
            name: def.name.to_string(),
            description: def.description.to_string(),
            when_channels: def.when_channels.iter().map(|s| s.to_string()).collect(),
            when_packet: def.when_packet.map(|s| s.to_string()),
            fires_kind: def.fires_kind.to_string(),
            fires_target: def.fires_target.to_string(),
            debounce_secs: def.debounce_secs,
            last_fired,
        });
    }
    Ok(result)
}

#[tauri::command]
pub fn list_trigger_log(
    trigger_name: Option<String>,
    limit: Option<i64>,
    db: State<'_, DbPool>,
) -> Result<Vec<TriggerLogEntry>, String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    let lim = limit.unwrap_or(50);
    let rows = if let Some(name) = trigger_name {
        let mut stmt = conn.prepare(
            "SELECT * FROM trigger_log WHERE trigger_name = ? ORDER BY fired_at DESC LIMIT ?"
        ).map_err(|e| e.to_string())?;
        let v = stmt.query_map(rusqlite::params![name, lim], |row| Ok(TriggerLogEntry::from_row(row)))
            .map_err(|e| e.to_string())?
            .collect::<Result<Vec<_>, _>>()
            .map_err(|e| e.to_string())?;
        v
    } else {
        let mut stmt = conn.prepare(
            "SELECT * FROM trigger_log ORDER BY fired_at DESC LIMIT ?"
        ).map_err(|e| e.to_string())?;
        let v = stmt.query_map([lim], |row| Ok(TriggerLogEntry::from_row(row)))
            .map_err(|e| e.to_string())?
            .collect::<Result<Vec<_>, _>>()
            .map_err(|e| e.to_string())?;
        v
    };
    Ok(rows)
}

// ─── Dispatcher internals ─────────────────────────────────────────────────────

fn is_debounced(db: &DbPool, trigger_name: &str, debounce_secs: u64) -> bool {
    if debounce_secs == 0 { return false; }
    let conn = match db.lock() { Ok(c) => c, Err(_) => return false };
    conn.query_row(
        "SELECT fired_at FROM trigger_log WHERE trigger_name = ? AND status = 'fired' ORDER BY fired_at DESC LIMIT 1",
        [trigger_name], |row| row.get::<_, String>(0)
    ).map(|last| {
        if let Ok(t) = chrono::DateTime::parse_from_rfc3339(&last) {
            let elapsed = chrono::Utc::now().signed_duration_since(t.with_timezone(&chrono::Utc));
            elapsed.num_seconds() < debounce_secs as i64
        } else { false }
    }).unwrap_or(false)
}

fn log_fire(db: &DbPool, trigger_name: &str, channel_name: &str, message_id: &str, fires_kind: &str, fires_target: &str, status: &str) {
    let conn = match db.lock() { Ok(c) => c, Err(_) => return };
    let id = uuid::Uuid::new_v4().to_string();
    let now = chrono::Utc::now().to_rfc3339();
    let _ = conn.execute(
        "INSERT INTO trigger_log (id, trigger_name, channel_name, message_id, fires_kind, fires_target, status, fired_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
        rusqlite::params![id, trigger_name, channel_name, message_id, fires_kind, fires_target, status, now, now],
    );
}

async fn check_and_fire(app: &AppHandle, db: &DbPool, keys: &std::sync::Arc<ApiKeyStore>, default_model: &str) {
    for trigger in TRIGGERS {
        for channel_name in trigger.when_channels {
            let message = {
                let conn = match db.lock() { Ok(c) => c, Err(_) => continue };
                let row = if let Some(pkt) = trigger.when_packet {
                    conn.query_row(
                        "SELECT id, payload FROM channel_messages WHERE channel_name = ? AND packet_type = ? AND status = 'pending' ORDER BY published_at ASC LIMIT 1",
                        rusqlite::params![channel_name, pkt], |row| Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?))
                    ).ok()
                } else {
                    conn.query_row(
                        "SELECT id, payload FROM channel_messages WHERE channel_name = ? AND status = 'pending' ORDER BY published_at ASC LIMIT 1",
                        [channel_name], |row| Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?))
                    ).ok()
                };
                row
            };
            let (msg_id, _payload) = match message { Some(m) => m, None => continue };

            if is_debounced(db, trigger.name, trigger.debounce_secs) {
                log_fire(db, trigger.name, channel_name, &msg_id, trigger.fires_kind, trigger.fires_target, "debounced");
                let _ = mark_processed_internal(db, &msg_id);
                continue;
            }

            let _ = mark_processed_internal(db, &msg_id);
            log_fire(db, trigger.name, channel_name, &msg_id, trigger.fires_kind, trigger.fires_target, "fired");
            eprintln!("[Trigger] {} → {} {}", trigger.name, trigger.fires_kind, trigger.fires_target);
            let _ = app.emit("trigger-fired", serde_json::json!({
                "triggerName": trigger.name,
                "firesKind": trigger.fires_kind,
                "firesTarget": trigger.fires_target,
                "channelName": channel_name,
            }));

            match trigger.fires_kind {
                "reasoner" => {
                    let keys_snap: std::collections::HashMap<String, String> = match keys.lock() { Ok(k) => k.clone(), Err(_) => continue };
                    let target = trigger.fires_target;
                    let model = default_model.to_string();
                    let db_clone = db.clone();
                    let app_clone = app.clone();
                    tokio::spawn(async move {
                        let run_id = match start_run(&db_clone, target, &model) { Ok(id) => id, Err(e) => { eprintln!("[Trigger→Reasoner] {}", e); return; } };
                        let _ = app_clone.emit("reasoner-started", &run_id);
                        match execute_reasoner(target, &model, &db_clone, &keys_snap).await {
                            Ok((records, output)) => {
                                let _ = finish_run(&db_clone, &run_id, records, &output);
                                if let Ok(run) = get_run(&db_clone, &run_id) { let _ = app_clone.emit("reasoner-completed", run); }
                                let _ = publish_message_internal(&db_clone, "analysis_ready", Some("ReasonerOutput"), &output[..output.len().min(500)], Some(86400));
                                let mem_val = if output.len() > 1000 { format!("{}…", &output[..1000]) } else { output.clone() };
                                store_insight(&db_clone, "insights", &format!("{}:latest", target), &mem_val, &format!("reasoner:{}", target));
                                eprintln!("[Trigger→Reasoner] {} completed ({} records)", target, records);
                            }
                            Err(err) => { let _ = fail_run(&db_clone, &run_id, &err); eprintln!("[Trigger→Reasoner] {} failed: {}", target, err); }
                        }
                    });
                }
                _ => { eprintln!("[Trigger] fires_kind '{}' not implemented", trigger.fires_kind); }
            }
        }
    }
}

pub fn start_trigger_dispatcher(app: AppHandle, db: DbPool, keys: std::sync::Arc<ApiKeyStore>, default_model: String) {
    tokio::spawn(async move {
        tokio::time::sleep(tokio::time::Duration::from_secs(5)).await;
        let mut interval = tokio::time::interval(tokio::time::Duration::from_secs(5));
        loop {
            interval.tick().await;
            check_and_fire(&app, &db, &keys, &default_model).await;
        }
    });
}
`;
}

// ─── Migration ────────────────────────────────────────────────────────────────

function buildMigrationSql(): string {
  return `-- TRIGGER: reactive event binding audit log
CREATE TABLE IF NOT EXISTS trigger_log (
  id TEXT PRIMARY KEY,
  trigger_name TEXT NOT NULL,
  channel_name TEXT NOT NULL,
  message_id TEXT NOT NULL,
  fires_kind TEXT NOT NULL,
  fires_target TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'fired',
  fired_at TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_trigger_log_trigger ON trigger_log(trigger_name, fired_at DESC);
`;
}

// ─── React UI stub ────────────────────────────────────────────────────────────

function buildTriggerViewStub(triggers: TriggerDecl[]): string {
  const triggerNames = triggers.map(t => `'${t.name}'`).join(', ');
  return `// @agicore-protected — Trigger monitoring UI
// Generated by Agicore — customize freely, regeneration will not overwrite @agicore-protected files.
import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { Zap, RefreshCw } from 'lucide-react';

// Triggers declared in .agi source: ${triggerNames}

export function TriggerView() {
  const [triggers, setTriggers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    setLoading(true);
    try {
      setTriggers(await invoke('list_trigger_statuses'));
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => {
    refresh();
    const unsub = listen('trigger-fired', () => refresh());
    return () => { unsub.then(f => f()); };
  }, []);

  return (
    <div className="flex flex-col h-full p-6">
      <div className="flex items-center gap-3 mb-6">
        <Zap size={20} className="text-amber-400" />
        <h1 className="text-lg font-semibold">Triggers</h1>
        <button onClick={refresh} className="ml-auto p-1.5 hover:bg-gray-700 rounded"><RefreshCw size={16} /></button>
      </div>
      {loading ? <div className="text-gray-500 text-sm">Loading…</div> : (
        <div className="space-y-3">
          {triggers.map((t: any) => (
            <div key={t.name} className="p-4 border border-gray-700 rounded-lg">
              <div className="font-medium">{t.name}</div>
              <div className="text-sm text-gray-400">{t.description}</div>
              <div className="text-xs text-gray-500 mt-1">
                WHEN {t.whenChannels.join(', ')} → {t.firesKind}: {t.firesTarget}
                {t.lastFired && <span className="ml-3">Last fired: {new Date(t.lastFired.firedAt).toLocaleString()}</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
`;
}
