// CHANNEL codegen — emits Rust runtime, migration, and React UI stub

import type { AgiFile, ChannelDecl } from '@agicore/parser';

export function generateChannel(ast: AgiFile): Map<string, string> {
  const files = new Map<string, string>();
  if (ast.channels.length === 0) return files;

  files.set('src-tauri/src/commands/channel.rs', buildChannelRs(ast.channels));
  files.set('migrations/channels.sql', buildMigrationSql());
  files.set('src/components/ChannelView.tsx', buildChannelViewStub(ast.channels));

  return files;
}

// ─── Rust runtime ─────────────────────────────────────────────────────────────

function buildChannelRs(channels: ChannelDecl[]): string {
  const channelDefs = channels.map(ch => {
    const protocol = ch.protocol ?? 'local';
    const direction = ch.direction ?? 'bidirectional';
    const retry = ch.retry ?? 3;
    const timeout = ch.timeout ?? 30000;
    return `    ChannelDef {
        name: "${ch.name}",
        description: "${ch.description.replace(/"/g, '\\"')}",
        protocol: "${protocol}",
        direction: "${direction}",
        packet: "${ch.packet}",
        retry: ${retry},
        timeout_ms: ${timeout},
    },`;
  }).join('\n');

  return `// CHANNEL runtime — typed message passing backed by SQLite
// @agicore-generated — DO NOT EDIT (regenerate via: agicore compile)

use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter, State};
use crate::db::DbPool;

// ─── Channel registry ─────────────────────────────────────────────────────────

struct ChannelDef {
    name: &'static str,
    description: &'static str,
    protocol: &'static str,
    direction: &'static str,
    packet: &'static str,
    retry: u32,
    timeout_ms: u64,
}

const CHANNELS: &[ChannelDef] = &[
${channelDefs}
];

// ─── Types ────────────────────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ChannelMessage {
    pub id: String,
    pub channel_name: String,
    pub packet_type: Option<String>,
    pub payload: String,
    pub status: String,
    pub published_at: String,
    pub processed_at: Option<String>,
    pub expires_at: Option<String>,
    pub created_at: String,
}

impl ChannelMessage {
    pub fn from_row(row: &rusqlite::Row) -> Self {
        Self {
            id: row.get("id").unwrap(),
            channel_name: row.get("channel_name").unwrap(),
            packet_type: row.get("packet_type").ok(),
            payload: row.get("payload").unwrap(),
            status: row.get("status").unwrap(),
            published_at: row.get("published_at").unwrap(),
            processed_at: row.get("processed_at").ok(),
            expires_at: row.get("expires_at").ok(),
            created_at: row.get("created_at").unwrap(),
        }
    }
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ChannelSummary {
    pub name: String,
    pub description: String,
    pub protocol: String,
    pub direction: String,
    pub packet: String,
    pub total_messages: i64,
    pub pending_messages: i64,
    pub last_message_at: Option<String>,
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

pub fn publish_message_internal(
    db: &DbPool,
    channel: &str,
    packet_type: Option<&str>,
    payload: &str,
    ttl_seconds: Option<i64>,
) -> Result<ChannelMessage, String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    let id = uuid::Uuid::new_v4().to_string();
    let now = chrono::Utc::now().to_rfc3339();
    let expires_at = ttl_seconds.map(|ttl| {
        (chrono::Utc::now() + chrono::Duration::seconds(ttl)).to_rfc3339()
    });
    conn.execute(
        "INSERT INTO channel_messages (id, channel_name, packet_type, payload, status, published_at, expires_at, created_at) VALUES (?, ?, ?, ?, 'pending', ?, ?, ?)",
        rusqlite::params![id, channel, packet_type, payload, now, expires_at, now],
    ).map_err(|e| e.to_string())?;
    Ok(ChannelMessage {
        id,
        channel_name: channel.to_string(),
        packet_type: packet_type.map(|s| s.to_string()),
        payload: payload.to_string(),
        status: "pending".to_string(),
        published_at: now.clone(),
        processed_at: None,
        expires_at,
        created_at: now,
    })
}

pub fn mark_processed_internal(db: &DbPool, id: &str) -> Result<(), String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    let now = chrono::Utc::now().to_rfc3339();
    conn.execute(
        "UPDATE channel_messages SET status = 'processed', processed_at = ? WHERE id = ?",
        rusqlite::params![now, id],
    ).map_err(|e| e.to_string())?;
    Ok(())
}

// ─── Tauri commands ───────────────────────────────────────────────────────────

#[tauri::command]
pub fn publish_channel_message(
    channel: String,
    packet_type: Option<String>,
    payload: String,
    ttl_seconds: Option<i64>,
    app: AppHandle,
    db: State<'_, DbPool>,
) -> Result<ChannelMessage, String> {
    let msg = publish_message_internal(&db, &channel, packet_type.as_deref(), &payload, ttl_seconds)?;
    let _ = app.emit("channel-message", &msg);
    Ok(msg)
}

#[tauri::command]
pub fn list_channel_messages(
    channel: String,
    limit: Option<i64>,
    status_filter: Option<String>,
    db: State<'_, DbPool>,
) -> Result<Vec<ChannelMessage>, String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    let lim = limit.unwrap_or(50);
    let rows = if let Some(status) = status_filter {
        let mut stmt = conn.prepare(
            "SELECT * FROM channel_messages WHERE channel_name = ? AND status = ? ORDER BY published_at DESC LIMIT ?"
        ).map_err(|e| e.to_string())?;
        let v = stmt.query_map(rusqlite::params![channel, status, lim], |row| Ok(ChannelMessage::from_row(row)))
            .map_err(|e| e.to_string())?
            .collect::<Result<Vec<_>, _>>()
            .map_err(|e| e.to_string())?;
        v
    } else {
        let mut stmt = conn.prepare(
            "SELECT * FROM channel_messages WHERE channel_name = ? ORDER BY published_at DESC LIMIT ?"
        ).map_err(|e| e.to_string())?;
        let v = stmt.query_map(rusqlite::params![channel, lim], |row| Ok(ChannelMessage::from_row(row)))
            .map_err(|e| e.to_string())?
            .collect::<Result<Vec<_>, _>>()
            .map_err(|e| e.to_string())?;
        v
    };
    Ok(rows)
}

#[tauri::command]
pub fn list_all_channels(db: State<'_, DbPool>) -> Result<Vec<ChannelSummary>, String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    let mut result: Vec<ChannelSummary> = CHANNELS.iter().map(|def| ChannelSummary {
        name: def.name.to_string(),
        description: def.description.to_string(),
        protocol: def.protocol.to_string(),
        direction: def.direction.to_string(),
        packet: def.packet.to_string(),
        total_messages: 0,
        pending_messages: 0,
        last_message_at: None,
    }).collect();

    for summary in &mut result {
        if let Ok(row) = conn.query_row(
            "SELECT COUNT(*), SUM(CASE WHEN status='pending' THEN 1 ELSE 0 END), MAX(published_at) FROM channel_messages WHERE channel_name = ?",
            [&summary.name],
            |row| Ok((row.get::<_, i64>(0)?, row.get::<_, i64>(1)?, row.get::<_, Option<String>>(2)?))
        ) {
            summary.total_messages = row.0;
            summary.pending_messages = row.1;
            summary.last_message_at = row.2;
        }
    }

    Ok(result)
}

#[tauri::command]
pub fn clear_channel(channel: String, db: State<'_, DbPool>) -> Result<i64, String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    let count = conn.execute("DELETE FROM channel_messages WHERE channel_name = ?", [&channel])
        .map_err(|e| e.to_string())? as i64;
    Ok(count)
}

#[tauri::command]
pub fn mark_message_processed(id: String, db: State<'_, DbPool>) -> Result<(), String> {
    mark_processed_internal(&db, &id)
}
`;
}

// ─── Migration ────────────────────────────────────────────────────────────────

function buildMigrationSql(): string {
  return `-- CHANNEL: typed message passing with SQLite persistence
CREATE TABLE IF NOT EXISTS channel_messages (
  id TEXT PRIMARY KEY,
  channel_name TEXT NOT NULL,
  packet_type TEXT,
  payload TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  published_at TEXT NOT NULL,
  processed_at TEXT,
  expires_at TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_channel_messages_channel ON channel_messages(channel_name, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_channel_messages_status  ON channel_messages(status, channel_name);
`;
}

// ─── React UI stub ────────────────────────────────────────────────────────────

function buildChannelViewStub(channels: ChannelDecl[]): string {
  const channelNames = channels.map(ch => `'${ch.name}'`).join(', ');
  return `// @agicore-protected — Channel monitoring UI
// Generated by Agicore — customize freely, regeneration will not overwrite @agicore-protected files.
import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { Radio, Send, RefreshCw } from 'lucide-react';

// Channels declared in .agi source: ${channelNames}

export function ChannelView() {
  const [channels, setChannels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    setLoading(true);
    try {
      setChannels(await invoke('list_all_channels'));
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => {
    refresh();
    const unsub = listen('channel-message', () => refresh());
    return () => { unsub.then(f => f()); };
  }, []);

  return (
    <div className="flex flex-col h-full p-6">
      <div className="flex items-center gap-3 mb-6">
        <Radio size={20} className="text-indigo-400" />
        <h1 className="text-lg font-semibold">Channels</h1>
        <button onClick={refresh} className="ml-auto p-1.5 hover:bg-gray-700 rounded"><RefreshCw size={16} /></button>
      </div>
      {loading ? <div className="text-gray-500 text-sm">Loading…</div> : (
        <div className="space-y-3">
          {channels.map((ch: any) => (
            <div key={ch.name} className="p-4 border border-gray-700 rounded-lg">
              <div className="font-medium">{ch.name}</div>
              <div className="text-sm text-gray-400">{ch.description}</div>
              <div className="text-xs text-gray-500 mt-1">{ch.totalMessages} messages · {ch.pendingMessages} pending</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
`;
}
