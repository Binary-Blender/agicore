// SESSION codegen — emits Rust semantic operating-mode runtime and React UI stub

import type { AgiFile, SessionDecl } from '@agicore/parser';

export function generateSession(ast: AgiFile): Map<string, string> {
  const files = new Map<string, string>();
  if (ast.sessions.length === 0) return files;

  files.set('src-tauri/src/commands/session_mode.rs', buildSessionModeRs(ast.sessions));
  files.set('migrations/session_modes.sql', buildMigrationSql());
  files.set('src/components/SessionModeView.tsx', buildSessionModeViewStub(ast.sessions));

  return files;
}

// ─── Rust runtime ─────────────────────────────────────────────────────────────

function buildSessionModeRs(sessions: SessionDecl[]): string {
  const modeDefs = sessions.map(s => {
    const tools = s.tools.map(t => `"${t}"`).join(', ');
    return `    SessionModeDef {
        name: "${s.name}",
        description: "${s.description.replace(/"/g, '\\"')}",
        tools: &[${tools}],
        context: "${s.context}",
        memory: "${s.memory}",
        persist: ${s.persist},
    },`;
  }).join('\n');

  return `// SESSION MODE runtime — semantic operating modes with memory context
// @agicore-generated — DO NOT EDIT (regenerate via: agicore compile)

use serde::{Deserialize, Serialize};
use tauri::State;
use crate::db::DbPool;

// ─── Session mode registry ────────────────────────────────────────────────────

struct SessionModeDef {
    name: &'static str,
    description: &'static str,
    tools: &'static [&'static str],
    context: &'static str,
    memory: &'static str,
    persist: bool,
}

const SESSION_MODES: &[SessionModeDef] = &[
${modeDefs}
];

// ─── Types ────────────────────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SessionModeInfo {
    pub name: String,
    pub description: String,
    pub tools: Vec<String>,
    pub context: String,
    pub memory: String,
    pub persist: bool,
    pub is_active: bool,
    pub activated_at: Option<String>,
    pub memory_entries: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ModeMemoryEntry {
    pub id: String,
    pub mode_name: String,
    pub key: String,
    pub value: String,
    pub created_at: String,
    pub updated_at: String,
}

// ─── DB helpers ───────────────────────────────────────────────────────────────

fn get_active_mode_name(conn: &rusqlite::Connection) -> Option<String> {
    conn.query_row(
        "SELECT mode_name FROM session_mode_activations WHERE is_active = 1 ORDER BY activated_at DESC LIMIT 1",
        [], |row| row.get(0),
    ).ok()
}

fn count_memory(conn: &rusqlite::Connection, mode_name: &str) -> i64 {
    conn.query_row(
        "SELECT COUNT(*) FROM session_mode_memory WHERE mode_name = ?",
        [mode_name], |row| row.get(0),
    ).unwrap_or(0)
}

// ─── Tauri commands ───────────────────────────────────────────────────────────

#[tauri::command]
pub fn list_session_modes(db: State<'_, DbPool>) -> Result<Vec<SessionModeInfo>, String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    let active = get_active_mode_name(&conn);
    SESSION_MODES.iter().map(|def| {
        let is_active = active.as_deref() == Some(def.name);
        let activated_at: Option<String> = if is_active {
            conn.query_row(
                "SELECT activated_at FROM session_mode_activations WHERE mode_name = ? AND is_active = 1",
                [def.name], |row| row.get(0),
            ).ok()
        } else { None };
        Ok(SessionModeInfo {
            name: def.name.to_string(),
            description: def.description.to_string(),
            tools: def.tools.iter().map(|s| s.to_string()).collect(),
            context: def.context.to_string(),
            memory: def.memory.to_string(),
            persist: def.persist,
            is_active,
            activated_at,
            memory_entries: count_memory(&conn, def.name),
        })
    }).collect()
}

#[tauri::command]
pub fn get_active_mode(db: State<'_, DbPool>) -> Result<Option<SessionModeInfo>, String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    let name = match get_active_mode_name(&conn) { Some(n) => n, None => return Ok(None) };
    let def = match SESSION_MODES.iter().find(|d| d.name == name.as_str()) { Some(d) => d, None => return Ok(None) };
    let activated_at = conn.query_row(
        "SELECT activated_at FROM session_mode_activations WHERE mode_name = ? AND is_active = 1",
        [def.name], |row| row.get::<_, String>(0),
    ).ok();
    Ok(Some(SessionModeInfo {
        name: def.name.to_string(),
        description: def.description.to_string(),
        tools: def.tools.iter().map(|s| s.to_string()).collect(),
        context: def.context.to_string(),
        memory: def.memory.to_string(),
        persist: def.persist,
        is_active: true,
        activated_at,
        memory_entries: count_memory(&conn, def.name),
    }))
}

#[tauri::command]
pub fn set_active_mode(name: String, db: State<'_, DbPool>) -> Result<SessionModeInfo, String> {
    let def = SESSION_MODES.iter().find(|d| d.name == name.as_str())
        .ok_or_else(|| format!("Unknown session mode: {}", name))?;
    let conn = db.lock().map_err(|e| e.to_string())?;
    let now = chrono::Utc::now().to_rfc3339();
    conn.execute("UPDATE session_mode_activations SET is_active = 0 WHERE is_active = 1", [])
        .map_err(|e| e.to_string())?;
    let id = uuid::Uuid::new_v4().to_string();
    conn.execute(
        "INSERT INTO session_mode_activations (id, mode_name, is_active, activated_at, created_at) VALUES (?, ?, 1, ?, ?)",
        rusqlite::params![id, def.name, now, now],
    ).map_err(|e| e.to_string())?;
    eprintln!("[SessionMode] Activated: {}", def.name);
    Ok(SessionModeInfo {
        name: def.name.to_string(),
        description: def.description.to_string(),
        tools: def.tools.iter().map(|s| s.to_string()).collect(),
        context: def.context.to_string(),
        memory: def.memory.to_string(),
        persist: def.persist,
        is_active: true,
        activated_at: Some(now),
        memory_entries: count_memory(&conn, def.name),
    })
}

#[tauri::command]
pub fn get_mode_memory(mode_name: String, db: State<'_, DbPool>) -> Result<Vec<ModeMemoryEntry>, String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn.prepare(
        "SELECT id, mode_name, key, value, created_at, updated_at FROM session_mode_memory WHERE mode_name = ? ORDER BY updated_at DESC"
    ).map_err(|e| e.to_string())?;
    let v = stmt.query_map([&mode_name], |row| Ok(ModeMemoryEntry {
        id: row.get(0)?, mode_name: row.get(1)?, key: row.get(2)?,
        value: row.get(3)?, created_at: row.get(4)?, updated_at: row.get(5)?,
    })).map_err(|e| e.to_string())?
    .collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())?;
    Ok(v)
}

#[tauri::command]
pub fn set_mode_memory(mode_name: String, key: String, value: String, db: State<'_, DbPool>) -> Result<ModeMemoryEntry, String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    let now = chrono::Utc::now().to_rfc3339();
    let existing: Option<String> = conn.query_row(
        "SELECT id FROM session_mode_memory WHERE mode_name = ? AND key = ?",
        rusqlite::params![mode_name, key], |row| row.get(0),
    ).ok();
    if let Some(id) = existing {
        conn.execute("UPDATE session_mode_memory SET value = ?, updated_at = ? WHERE id = ?",
            rusqlite::params![value, now, id]).map_err(|e| e.to_string())?;
        Ok(ModeMemoryEntry { id, mode_name, key, value, created_at: now.clone(), updated_at: now })
    } else {
        let id = uuid::Uuid::new_v4().to_string();
        conn.execute(
            "INSERT INTO session_mode_memory (id, mode_name, key, value, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
            rusqlite::params![id, mode_name, key, value, now, now],
        ).map_err(|e| e.to_string())?;
        Ok(ModeMemoryEntry { id, mode_name, key, value, created_at: now.clone(), updated_at: now })
    }
}

#[tauri::command]
pub fn delete_mode_memory(mode_name: String, key: String, db: State<'_, DbPool>) -> Result<(), String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM session_mode_memory WHERE mode_name = ? AND key = ?",
        rusqlite::params![mode_name, key]).map_err(|e| e.to_string())?;
    Ok(())
}
`;
}

// ─── Migration ────────────────────────────────────────────────────────────────

function buildMigrationSql(): string {
  return `-- SESSION MODES: semantic operating mode activations
CREATE TABLE IF NOT EXISTS session_mode_activations (
  id TEXT PRIMARY KEY,
  mode_name TEXT NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 0,
  activated_at TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_session_mode_active ON session_mode_activations(mode_name, is_active);

-- SESSION MODE MEMORY: persistent key-value memory per mode
CREATE TABLE IF NOT EXISTS session_mode_memory (
  id TEXT PRIMARY KEY,
  mode_name TEXT NOT NULL,
  key TEXT NOT NULL,
  value TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  UNIQUE(mode_name, key)
);
CREATE INDEX IF NOT EXISTS idx_session_mode_memory ON session_mode_memory(mode_name, key);
`;
}

// ─── React UI stub ────────────────────────────────────────────────────────────

function buildSessionModeViewStub(sessions: SessionDecl[]): string {
  const names = sessions.map(s => `'${s.name}'`).join(', ');
  return `// @agicore-protected — Session mode switcher UI
// Generated by Agicore — customize freely.
import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Layers, CheckCircle, Brain, RefreshCw } from 'lucide-react';

// Session modes declared in .agi source: ${names}

export function SessionModeView() {
  const [modes, setModes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    setLoading(true);
    try { setModes(await invoke('list_session_modes')); } catch (e) { console.error(e); }
    setLoading(false);
  };

  const activate = async (name: string) => {
    try {
      await invoke('set_active_mode', { name });
      refresh();
    } catch (e) { console.error(e); }
  };

  useEffect(() => { refresh(); }, []);

  return (
    <div className="flex flex-col h-full p-6">
      <div className="flex items-center gap-3 mb-6">
        <Layers size={20} className="text-cyan-400" />
        <h1 className="text-lg font-semibold">Session Modes</h1>
        <button onClick={refresh} className="ml-auto p-1.5 hover:bg-gray-700 rounded"><RefreshCw size={16} /></button>
      </div>
      {loading ? <div className="text-gray-500 text-sm">Loading…</div> : (
        <div className="space-y-3">
          {modes.map((m: any) => (
            <div key={m.name} className={\`p-4 border rounded-lg transition-colors \${m.isActive ? 'border-cyan-500 bg-cyan-500/10' : 'border-gray-700 hover:border-gray-600'}\`}>
              <div className="flex items-center gap-2">
                {m.isActive ? <CheckCircle size={16} className="text-cyan-400" /> : <Brain size={16} className="text-gray-500" />}
                <span className="font-medium">{m.name}</span>
                {m.persist && <span className="text-xs text-amber-400 border border-amber-400/30 px-1.5 py-0.5 rounded">persistent</span>}
                {!m.isActive && (
                  <button onClick={() => activate(m.name)} className="ml-auto text-xs px-2 py-1 bg-cyan-600 hover:bg-cyan-500 rounded">Activate</button>
                )}
              </div>
              <div className="text-sm text-gray-400 mt-1">{m.description}</div>
              <div className="text-xs text-gray-500 mt-1">
                Tools: {m.tools.join(', ')} · Memory: {m.memory}
                {m.memoryEntries > 0 && <span className="ml-2 text-cyan-400">{m.memoryEntries} memory entries</span>}
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
