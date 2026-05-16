// MODULE codegen — emits Rust composable expert-system module engine and React UI stub

import type { AgiFile, ModuleDecl } from '@agicore/parser';

export function generateModule(ast: AgiFile): Map<string, string> {
  const files = new Map<string, string>();
  if (ast.modules.length === 0) return files;

  files.set('src-tauri/src/commands/module_engine.rs', buildModuleEngineRs(ast.modules));
  files.set('migrations/modules.sql', buildMigrationSql());
  files.set('src/components/ModuleView.tsx', buildModuleViewStub(ast.modules));

  return files;
}

// ─── Rust runtime ─────────────────────────────────────────────────────────────

function buildModuleEngineRs(modules: ModuleDecl[]): string {
  const moduleDefs = modules.map(m => {
    const activateWhen = m.activateWhen ? `Some("${m.activateWhen.replace(/"/g, '\\"')}")` : 'None';
    const deactivateWhen = m.deactivateWhen ? `Some("${m.deactivateWhen.replace(/"/g, '\\"')}")` : 'None';
    const patterns = m.patterns.map(p => `"${p.name}"`).join(', ');
    const rules = m.rules.map(r => `"${r.name}"`).join(', ');
    return `    ModuleDef {
        name: "${m.name}",
        description: "${m.description.replace(/"/g, '\\"')}",
        activate_when: ${activateWhen},
        deactivate_when: ${deactivateWhen},
        patterns: &[${patterns}],
        rules: &[${rules}],
    },`;
  }).join('\n');

  return `// MODULE ENGINE runtime — composable expert-system module registry with runtime activation
// @agicore-generated — DO NOT EDIT (regenerate via: agicore compile)

use serde::{Deserialize, Serialize};
use tauri::State;
use crate::db::DbPool;

// ─── Module registry ──────────────────────────────────────────────────────────

struct ModuleDef {
    name: &'static str,
    description: &'static str,
    activate_when: Option<&'static str>,
    deactivate_when: Option<&'static str>,
    patterns: &'static [&'static str],
    rules: &'static [&'static str],
}

const MODULES: &[ModuleDef] = &[
${moduleDefs}
];

// ─── Condition evaluator ──────────────────────────────────────────────────────

fn evaluate_condition(condition: &str, db: &DbPool) -> bool {
    let conn = match db.lock() { Ok(c) => c, Err(_) => return false };
    let parts: Vec<&str> = condition.split_whitespace().collect();
    if parts.len() != 3 { return false; }
    let (field, op, value) = (parts[0], parts[1], parts[2]);
    let stored: Option<String> = conn.query_row(
        "SELECT value FROM module_facts WHERE key = ?",
        [field], |row| row.get(0),
    ).ok();
    let stored_str = stored.as_deref().unwrap_or("0");
    match op {
        ">=" => stored_str.parse::<f64>().ok().zip(value.parse::<f64>().ok()).map(|(a, b)| a >= b).unwrap_or(false),
        ">"  => stored_str.parse::<f64>().ok().zip(value.parse::<f64>().ok()).map(|(a, b)| a >  b).unwrap_or(false),
        "<=" => stored_str.parse::<f64>().ok().zip(value.parse::<f64>().ok()).map(|(a, b)| a <= b).unwrap_or(false),
        "<"  => stored_str.parse::<f64>().ok().zip(value.parse::<f64>().ok()).map(|(a, b)| a <  b).unwrap_or(false),
        "==" => stored_str == value,
        "!=" => stored_str != value,
        _    => false,
    }
}

// ─── Types ────────────────────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ModuleStatus {
    pub name: String,
    pub description: String,
    pub is_active: bool,
    pub activate_when: Option<String>,
    pub deactivate_when: Option<String>,
    pub patterns: Vec<String>,
    pub rules: Vec<String>,
    pub activated_at: Option<String>,
    pub activation_count: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ModuleFact {
    pub key: String,
    pub value: String,
    pub updated_at: String,
}

// ─── DB helpers ───────────────────────────────────────────────────────────────

fn is_module_active(conn: &rusqlite::Connection, name: &str) -> bool {
    conn.query_row(
        "SELECT is_active FROM module_activations WHERE module_name = ? ORDER BY created_at DESC LIMIT 1",
        [name], |row| row.get::<_, i64>(0),
    ).map(|v| v != 0).unwrap_or(false)
}

fn get_activated_at(conn: &rusqlite::Connection, name: &str) -> Option<String> {
    conn.query_row(
        "SELECT activated_at FROM module_activations WHERE module_name = ? AND is_active = 1 ORDER BY activated_at DESC LIMIT 1",
        [name], |row| row.get(0),
    ).ok()
}

fn get_activation_count(conn: &rusqlite::Connection, name: &str) -> i64 {
    conn.query_row(
        "SELECT COUNT(*) FROM module_activations WHERE module_name = ?",
        [name], |row| row.get(0),
    ).unwrap_or(0)
}

// ─── Tauri commands ───────────────────────────────────────────────────────────

#[tauri::command]
pub fn list_module_statuses(db: State<'_, DbPool>) -> Result<Vec<ModuleStatus>, String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    Ok(MODULES.iter().map(|def| ModuleStatus {
        name: def.name.to_string(),
        description: def.description.to_string(),
        is_active: is_module_active(&conn, def.name),
        activate_when: def.activate_when.map(|s| s.to_string()),
        deactivate_when: def.deactivate_when.map(|s| s.to_string()),
        patterns: def.patterns.iter().map(|s| s.to_string()).collect(),
        rules: def.rules.iter().map(|s| s.to_string()).collect(),
        activated_at: get_activated_at(&conn, def.name),
        activation_count: get_activation_count(&conn, def.name),
    }).collect())
}

#[tauri::command]
pub fn set_module_active(name: String, active: bool, db: State<'_, DbPool>) -> Result<ModuleStatus, String> {
    let def = MODULES.iter().find(|d| d.name == name.as_str())
        .ok_or_else(|| format!("Unknown module: {}", name))?;
    let conn = db.lock().map_err(|e| e.to_string())?;
    let now = chrono::Utc::now().to_rfc3339();
    let id = uuid::Uuid::new_v4().to_string();
    if !active {
        conn.execute(
            "UPDATE module_activations SET is_active = 0 WHERE module_name = ? AND is_active = 1",
            [def.name],
        ).map_err(|e| e.to_string())?;
    }
    conn.execute(
        "INSERT INTO module_activations (id, module_name, is_active, activated_at, created_at) VALUES (?, ?, ?, ?, ?)",
        rusqlite::params![id, def.name, if active { 1i64 } else { 0i64 }, now, now],
    ).map_err(|e| e.to_string())?;
    eprintln!("[Module] {} → {}", def.name, if active { "activated" } else { "deactivated" });
    let activation_count = get_activation_count(&conn, def.name);
    Ok(ModuleStatus {
        name: def.name.to_string(),
        description: def.description.to_string(),
        is_active: active,
        activate_when: def.activate_when.map(|s| s.to_string()),
        deactivate_when: def.deactivate_when.map(|s| s.to_string()),
        patterns: def.patterns.iter().map(|s| s.to_string()).collect(),
        rules: def.rules.iter().map(|s| s.to_string()).collect(),
        activated_at: if active { Some(now) } else { None },
        activation_count,
    })
}

#[tauri::command]
pub fn check_module_conditions(db: State<'_, DbPool>) -> Result<Vec<ModuleStatus>, String> {
    let mut changed = Vec::new();
    for def in MODULES {
        let currently_active = { let conn = db.lock().map_err(|e| e.to_string())?; is_module_active(&conn, def.name) };
        let should_activate = def.activate_when.map(|c| evaluate_condition(c, &db)).unwrap_or(false);
        let should_deactivate = def.deactivate_when.map(|c| evaluate_condition(c, &db)).unwrap_or(false);
        let new_active = if should_deactivate { false } else if should_activate { true } else { currently_active };
        if new_active != currently_active {
            let conn = db.lock().map_err(|e| e.to_string())?;
            let now = chrono::Utc::now().to_rfc3339();
            let id = uuid::Uuid::new_v4().to_string();
            conn.execute("UPDATE module_activations SET is_active = 0 WHERE module_name = ? AND is_active = 1", [def.name]).ok();
            conn.execute(
                "INSERT INTO module_activations (id, module_name, is_active, activated_at, created_at) VALUES (?, ?, ?, ?, ?)",
                rusqlite::params![id, def.name, if new_active { 1i64 } else { 0i64 }, now, now],
            ).ok();
            eprintln!("[Module] Auto-{}: {}", if new_active { "activated" } else { "deactivated" }, def.name);
            let activation_count = get_activation_count(&conn, def.name);
            changed.push(ModuleStatus {
                name: def.name.to_string(), description: def.description.to_string(),
                is_active: new_active,
                activate_when: def.activate_when.map(|s| s.to_string()),
                deactivate_when: def.deactivate_when.map(|s| s.to_string()),
                patterns: def.patterns.iter().map(|s| s.to_string()).collect(),
                rules: def.rules.iter().map(|s| s.to_string()).collect(),
                activated_at: if new_active { Some(now) } else { None },
                activation_count,
            });
        }
    }
    Ok(changed)
}

#[tauri::command]
pub fn list_module_facts(db: State<'_, DbPool>) -> Result<Vec<ModuleFact>, String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn.prepare("SELECT key, value, updated_at FROM module_facts ORDER BY updated_at DESC").map_err(|e| e.to_string())?;
    let v = stmt.query_map([], |row| Ok(ModuleFact { key: row.get(0)?, value: row.get(1)?, updated_at: row.get(2)? }))
        .map_err(|e| e.to_string())?.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())?;
    Ok(v)
}

#[tauri::command]
pub fn set_module_fact(key: String, value: String, db: State<'_, DbPool>) -> Result<ModuleFact, String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    let now = chrono::Utc::now().to_rfc3339();
    conn.execute(
        "INSERT INTO module_facts (key, value, updated_at) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at",
        rusqlite::params![key, value, now],
    ).map_err(|e| e.to_string())?;
    Ok(ModuleFact { key, value, updated_at: now })
}
`;
}

// ─── Migration ────────────────────────────────────────────────────────────────

function buildMigrationSql(): string {
  return `-- MODULES: expert-system module activation log
CREATE TABLE IF NOT EXISTS module_activations (
  id TEXT PRIMARY KEY,
  module_name TEXT NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 0,
  activated_at TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_module_activations ON module_activations(module_name, created_at DESC);

-- MODULE FACTS: runtime fact store for condition evaluation
CREATE TABLE IF NOT EXISTS module_facts (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT DEFAULT (datetime('now'))
);
`;
}

// ─── React UI stub ────────────────────────────────────────────────────────────

function buildModuleViewStub(modules: ModuleDecl[]): string {
  const names = modules.map(m => `'${m.name}'`).join(', ');
  return `// @agicore-protected — Module activation and fact management UI
// Generated by Agicore — customize freely.
import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Puzzle, Activity, RefreshCw, Toggle } from 'lucide-react';

// Modules declared in .agi source: ${names}

export function ModuleView() {
  const [modules, setModules] = useState<any[]>([]);
  const [facts, setFacts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    setLoading(true);
    try {
      const [mods, fs] = await Promise.all([
        invoke<any[]>('list_module_statuses'),
        invoke<any[]>('list_module_facts'),
      ]);
      setModules(mods);
      setFacts(fs);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const toggle = async (name: string, active: boolean) => {
    try {
      await invoke('set_module_active', { name, active: !active });
      refresh();
    } catch (e) { console.error(e); }
  };

  const checkConditions = async () => {
    try { await invoke('check_module_conditions'); refresh(); } catch (e) { console.error(e); }
  };

  useEffect(() => { refresh(); }, []);

  return (
    <div className="flex flex-col h-full p-6">
      <div className="flex items-center gap-3 mb-6">
        <Puzzle size={20} className="text-emerald-400" />
        <h1 className="text-lg font-semibold">Modules</h1>
        <button onClick={checkConditions} className="ml-auto text-xs px-2 py-1 bg-emerald-700 hover:bg-emerald-600 rounded">Check Conditions</button>
        <button onClick={refresh} className="p-1.5 hover:bg-gray-700 rounded"><RefreshCw size={16} /></button>
      </div>
      {loading ? <div className="text-gray-500 text-sm">Loading…</div> : (
        <div className="space-y-3">
          {modules.map((m: any) => (
            <div key={m.name} className={\`p-4 border rounded-lg \${m.isActive ? 'border-emerald-500 bg-emerald-500/10' : 'border-gray-700'}\`}>
              <div className="flex items-center gap-2">
                <Activity size={16} className={m.isActive ? 'text-emerald-400' : 'text-gray-500'} />
                <span className="font-medium">{m.name}</span>
                {m.activateWhen && <span className="text-xs text-gray-500 font-mono">WHEN {m.activateWhen}</span>}
                <button onClick={() => toggle(m.name, m.isActive)} className={\`ml-auto text-xs px-2 py-1 rounded \${m.isActive ? 'bg-red-700 hover:bg-red-600' : 'bg-emerald-700 hover:bg-emerald-600'}\`}>
                  {m.isActive ? 'Deactivate' : 'Activate'}
                </button>
              </div>
              <div className="text-sm text-gray-400 mt-1">{m.description}</div>
              <div className="text-xs text-gray-500 mt-1">
                Patterns: {m.patterns.join(', ')} · Rules: {m.rules.join(', ')}
                · Activated {m.activationCount}×
              </div>
            </div>
          ))}
          {facts.length > 0 && (
            <div className="mt-4">
              <div className="text-xs text-gray-500 mb-2 uppercase tracking-wider">Module Facts</div>
              <div className="space-y-1">
                {facts.map((f: any) => (
                  <div key={f.key} className="flex items-center gap-3 text-sm font-mono">
                    <span className="text-gray-400">{f.key}</span>
                    <span className="text-emerald-400">= {f.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
`;
}
