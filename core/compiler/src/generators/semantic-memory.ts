// SEMANTIC MEMORY codegen — emits cross-session persistent intelligence store
// Emitted when app has reasoners, sessions, or modules (anything that produces
// cross-run knowledge worth retaining).

import type { AgiFile } from '@agicore/parser';

export function generateSemanticMemory(ast: AgiFile): Map<string, string> {
  const files = new Map<string, string>();
  const needsMemory =
    ast.reasoners.length > 0 ||
    ast.sessions.length > 0 ||
    ast.modules.length > 0;
  if (!needsMemory) return files;

  files.set('src-tauri/src/commands/semantic_memory.rs', buildSemanticMemoryRs());
  files.set('migrations/semantic_memory.sql', buildMigrationSql());
  files.set('src/components/MemoryView.tsx', buildMemoryViewStub());

  return files;
}

// ─── Rust runtime ─────────────────────────────────────────────────────────────

function buildSemanticMemoryRs(): string {
  return `// SEMANTIC MEMORY runtime — cross-session persistent intelligence store
// Namespaced, confidence-weighted, tag-indexed, TTL-aware memory with access tracking.
// @agicore-generated — DO NOT EDIT (regenerate via: agicore compile)

use serde::{Deserialize, Serialize};
use tauri::State;
use crate::db::DbPool;

// ─── Types ────────────────────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MemoryEntry {
    pub id: String,
    pub namespace: String,
    pub key: String,
    pub value: String,
    pub tags: Vec<String>,
    pub confidence: f64,
    pub source: String,
    pub ttl_hours: i64,
    pub created_at: String,
    pub accessed_at: String,
    pub access_count: i64,
    pub expires_at: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MemoryStats {
    pub namespace: String,
    pub count: i64,
    pub avg_confidence: f64,
    pub newest_at: Option<String>,
    pub oldest_at: Option<String>,
    pub most_accessed_key: Option<String>,
    pub total_access_count: i64,
}

// ─── DB helpers ───────────────────────────────────────────────────────────────

fn tags_to_str(tags: &[String]) -> String { tags.join(",") }

fn str_to_tags(s: &str) -> Vec<String> {
    if s.is_empty() { return vec![]; }
    s.split(',').map(|t| t.trim().to_string()).filter(|t| !t.is_empty()).collect()
}

fn row_to_entry(row: &rusqlite::Row) -> rusqlite::Result<MemoryEntry> {
    let tags_str: String = row.get(4)?;
    Ok(MemoryEntry {
        id: row.get(0)?, namespace: row.get(1)?, key: row.get(2)?,
        value: row.get(3)?, tags: str_to_tags(&tags_str),
        confidence: row.get(5)?, source: row.get(6)?, ttl_hours: row.get(7)?,
        created_at: row.get(8)?, accessed_at: row.get(9)?,
        access_count: row.get(10)?, expires_at: row.get(11)?,
    })
}

fn is_expired(entry: &MemoryEntry) -> bool {
    entry.expires_at.as_ref().and_then(|e| chrono::DateTime::parse_from_rfc3339(e).ok())
        .map(|t| chrono::Utc::now() > t.with_timezone(&chrono::Utc)).unwrap_or(false)
}

// ─── Public helpers (called from trigger.rs after reasoner completion) ────────

pub fn store_insight(db: &DbPool, namespace: &str, key: &str, value: &str, source: &str) {
    let conn = match db.lock() { Ok(c) => c, Err(_) => return };
    let now = chrono::Utc::now().to_rfc3339();
    let id = uuid::Uuid::new_v4().to_string();
    let _ = conn.execute(
        "INSERT INTO semantic_memory (id, namespace, key, value, tags, confidence, source, ttl_hours, created_at, accessed_at, access_count, expires_at)
         VALUES (?, ?, ?, ?, '', 0.8, ?, 0, ?, ?, 0, NULL)
         ON CONFLICT(namespace, key) DO UPDATE SET
           value = excluded.value, source = excluded.source,
           confidence = MIN(1.0, confidence + 0.05), accessed_at = excluded.accessed_at",
        rusqlite::params![id, namespace, key, value, source, now, now],
    );
}

// ─── Tauri commands ───────────────────────────────────────────────────────────

#[tauri::command]
pub fn mem_store(
    namespace: String, key: String, value: String,
    tags: Option<Vec<String>>, confidence: Option<f64>,
    source: Option<String>, ttl_hours: Option<i64>,
    db: State<'_, DbPool>,
) -> Result<MemoryEntry, String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    let now = chrono::Utc::now().to_rfc3339();
    let id = uuid::Uuid::new_v4().to_string();
    let tags_str = tags_to_str(&tags.unwrap_or_default());
    let conf = confidence.unwrap_or(1.0).clamp(0.0, 1.0);
    let src = source.unwrap_or_else(|| "user".to_string());
    let ttl = ttl_hours.unwrap_or(0);
    let expires_at: Option<String> = if ttl > 0 {
        Some((chrono::Utc::now() + chrono::Duration::hours(ttl)).to_rfc3339())
    } else { None };
    let existing: Option<String> = conn.query_row(
        "SELECT id FROM semantic_memory WHERE namespace = ? AND key = ?",
        rusqlite::params![namespace, key], |row| row.get(0),
    ).ok();
    if let Some(eid) = existing {
        conn.execute(
            "UPDATE semantic_memory SET value=?,tags=?,confidence=?,source=?,ttl_hours=?,accessed_at=?,access_count=access_count+1,expires_at=? WHERE id=?",
            rusqlite::params![value, tags_str, conf, src, ttl, now, expires_at, eid],
        ).map_err(|e| e.to_string())?;
        conn.query_row("SELECT id,namespace,key,value,tags,confidence,source,ttl_hours,created_at,accessed_at,access_count,expires_at FROM semantic_memory WHERE id=?", [eid], |row| row_to_entry(row)).map_err(|e| e.to_string())
    } else {
        conn.execute(
            "INSERT INTO semantic_memory (id,namespace,key,value,tags,confidence,source,ttl_hours,created_at,accessed_at,access_count,expires_at) VALUES (?,?,?,?,?,?,?,?,?,?,0,?)",
            rusqlite::params![id, namespace, key, value, tags_str, conf, src, ttl, now, now, expires_at],
        ).map_err(|e| e.to_string())?;
        conn.query_row("SELECT id,namespace,key,value,tags,confidence,source,ttl_hours,created_at,accessed_at,access_count,expires_at FROM semantic_memory WHERE id=?", [id], |row| row_to_entry(row)).map_err(|e| e.to_string())
    }
}

#[tauri::command]
pub fn mem_recall(key: String, namespace: Option<String>, db: State<'_, DbPool>) -> Result<Option<MemoryEntry>, String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    let now = chrono::Utc::now().to_rfc3339();
    let entry = if let Some(ns) = namespace {
        conn.query_row("SELECT id,namespace,key,value,tags,confidence,source,ttl_hours,created_at,accessed_at,access_count,expires_at FROM semantic_memory WHERE namespace=? AND key=?", rusqlite::params![ns, key], |row| row_to_entry(row)).ok()
    } else {
        conn.query_row("SELECT id,namespace,key,value,tags,confidence,source,ttl_hours,created_at,accessed_at,access_count,expires_at FROM semantic_memory WHERE key=? ORDER BY confidence DESC LIMIT 1", [&key], |row| row_to_entry(row)).ok()
    };
    if let Some(ref e) = entry {
        if is_expired(e) { return Ok(None); }
        conn.execute("UPDATE semantic_memory SET accessed_at=?,access_count=access_count+1 WHERE id=?", rusqlite::params![now, e.id]).ok();
    }
    Ok(entry)
}

#[tauri::command]
pub fn mem_search(query: String, namespace: Option<String>, tags: Option<Vec<String>>, limit: Option<i64>, db: State<'_, DbPool>) -> Result<Vec<MemoryEntry>, String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    let now = chrono::Utc::now().to_rfc3339();
    let lim = limit.unwrap_or(20);
    let like = format!("%{}%", query);
    let mut entries: Vec<MemoryEntry> = if let Some(ns) = namespace {
        let mut stmt = conn.prepare("SELECT id,namespace,key,value,tags,confidence,source,ttl_hours,created_at,accessed_at,access_count,expires_at FROM semantic_memory WHERE namespace=? AND (key LIKE ? OR value LIKE ?) AND (expires_at IS NULL OR expires_at>?) ORDER BY confidence DESC,accessed_at DESC LIMIT ?").map_err(|e| e.to_string())?;
        stmt.query_map(rusqlite::params![ns, like, like, now, lim], |row| row_to_entry(row)).map_err(|e| e.to_string())?.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())?
    } else {
        let mut stmt = conn.prepare("SELECT id,namespace,key,value,tags,confidence,source,ttl_hours,created_at,accessed_at,access_count,expires_at FROM semantic_memory WHERE (key LIKE ? OR value LIKE ?) AND (expires_at IS NULL OR expires_at>?) ORDER BY confidence DESC,accessed_at DESC LIMIT ?").map_err(|e| e.to_string())?;
        stmt.query_map(rusqlite::params![like, like, now, lim], |row| row_to_entry(row)).map_err(|e| e.to_string())?.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())?
    };
    if let Some(required_tags) = tags {
        if !required_tags.is_empty() {
            entries.retain(|e| required_tags.iter().any(|t| e.tags.contains(t)));
        }
    }
    Ok(entries)
}

#[tauri::command]
pub fn mem_list(namespace: Option<String>, limit: Option<i64>, db: State<'_, DbPool>) -> Result<Vec<MemoryEntry>, String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    let now = chrono::Utc::now().to_rfc3339();
    let lim = limit.unwrap_or(50);
    let rows = if let Some(ns) = namespace {
        let mut stmt = conn.prepare("SELECT id,namespace,key,value,tags,confidence,source,ttl_hours,created_at,accessed_at,access_count,expires_at FROM semantic_memory WHERE namespace=? AND (expires_at IS NULL OR expires_at>?) ORDER BY accessed_at DESC LIMIT ?").map_err(|e| e.to_string())?;
        stmt.query_map(rusqlite::params![ns, now, lim], |row| row_to_entry(row)).map_err(|e| e.to_string())?.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())?
    } else {
        let mut stmt = conn.prepare("SELECT id,namespace,key,value,tags,confidence,source,ttl_hours,created_at,accessed_at,access_count,expires_at FROM semantic_memory WHERE expires_at IS NULL OR expires_at>? ORDER BY accessed_at DESC LIMIT ?").map_err(|e| e.to_string())?;
        stmt.query_map(rusqlite::params![now, lim], |row| row_to_entry(row)).map_err(|e| e.to_string())?.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())?
    };
    Ok(rows)
}

#[tauri::command]
pub fn mem_forget(namespace: String, key: String, db: State<'_, DbPool>) -> Result<(), String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM semantic_memory WHERE namespace=? AND key=?", rusqlite::params![namespace, key]).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn mem_prune(db: State<'_, DbPool>) -> Result<i64, String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    let now = chrono::Utc::now().to_rfc3339();
    let count: i64 = conn.query_row("SELECT COUNT(*) FROM semantic_memory WHERE expires_at IS NOT NULL AND expires_at<=?", [&now], |row| row.get(0)).unwrap_or(0);
    conn.execute("DELETE FROM semantic_memory WHERE expires_at IS NOT NULL AND expires_at<=?", [&now]).map_err(|e| e.to_string())?;
    Ok(count)
}

#[tauri::command]
pub fn mem_stats(db: State<'_, DbPool>) -> Result<Vec<MemoryStats>, String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    let now = chrono::Utc::now().to_rfc3339();
    let mut ns_stmt = conn.prepare("SELECT DISTINCT namespace FROM semantic_memory WHERE expires_at IS NULL OR expires_at>? ORDER BY namespace").map_err(|e| e.to_string())?;
    let namespaces: Vec<String> = ns_stmt.query_map([&now], |row| row.get(0)).map_err(|e| e.to_string())?.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())?;
    let mut stats = Vec::new();
    for ns in namespaces {
        let count: i64 = conn.query_row("SELECT COUNT(*) FROM semantic_memory WHERE namespace=? AND (expires_at IS NULL OR expires_at>?)", rusqlite::params![ns, now], |row| row.get(0)).unwrap_or(0);
        let avg_confidence: f64 = conn.query_row("SELECT AVG(confidence) FROM semantic_memory WHERE namespace=? AND (expires_at IS NULL OR expires_at>?)", rusqlite::params![ns, now], |row| row.get(0)).unwrap_or(0.0);
        let newest_at: Option<String> = conn.query_row("SELECT MAX(created_at) FROM semantic_memory WHERE namespace=?", [&ns], |row| row.get(0)).ok().flatten();
        let oldest_at: Option<String> = conn.query_row("SELECT MIN(created_at) FROM semantic_memory WHERE namespace=?", [&ns], |row| row.get(0)).ok().flatten();
        let most_accessed_key: Option<String> = conn.query_row("SELECT key FROM semantic_memory WHERE namespace=? ORDER BY access_count DESC LIMIT 1", [&ns], |row| row.get(0)).ok();
        let total_access_count: i64 = conn.query_row("SELECT SUM(access_count) FROM semantic_memory WHERE namespace=?", [&ns], |row| row.get(0)).unwrap_or(0);
        stats.push(MemoryStats { namespace: ns, count, avg_confidence, newest_at, oldest_at, most_accessed_key, total_access_count });
    }
    Ok(stats)
}

#[tauri::command]
pub fn mem_namespaces(db: State<'_, DbPool>) -> Result<Vec<String>, String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    let now = chrono::Utc::now().to_rfc3339();
    let mut stmt = conn.prepare("SELECT DISTINCT namespace FROM semantic_memory WHERE expires_at IS NULL OR expires_at>? ORDER BY namespace").map_err(|e| e.to_string())?;
    let v = stmt.query_map([now], |row| row.get::<_, String>(0)).map_err(|e| e.to_string())?.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())?;
    Ok(v)
}
`;
}

// ─── Migration ────────────────────────────────────────────────────────────────

function buildMigrationSql(): string {
  return `-- SEMANTIC MEMORY: cross-session persistent intelligence store
CREATE TABLE IF NOT EXISTS semantic_memory (
  id TEXT PRIMARY KEY,
  namespace TEXT NOT NULL,
  key TEXT NOT NULL,
  value TEXT NOT NULL,
  tags TEXT NOT NULL DEFAULT '',
  confidence REAL NOT NULL DEFAULT 1.0,
  source TEXT NOT NULL DEFAULT 'user',
  ttl_hours INTEGER NOT NULL DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  accessed_at TEXT DEFAULT (datetime('now')),
  access_count INTEGER NOT NULL DEFAULT 0,
  expires_at TEXT,
  UNIQUE(namespace, key)
);
CREATE INDEX IF NOT EXISTS idx_semantic_memory_ns ON semantic_memory(namespace, accessed_at DESC);
CREATE INDEX IF NOT EXISTS idx_semantic_memory_conf ON semantic_memory(confidence DESC, accessed_at DESC);
CREATE INDEX IF NOT EXISTS idx_semantic_memory_expires ON semantic_memory(expires_at) WHERE expires_at IS NOT NULL;
`;
}

// ─── React UI stub ────────────────────────────────────────────────────────────

function buildMemoryViewStub(): string {
  return `// @agicore-protected — Semantic memory browser UI
// Generated by Agicore — customize freely.
import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Brain, Search, Trash2, RefreshCw, BarChart3 } from 'lucide-react';

export function MemoryView() {
  const [namespaces, setNamespaces] = useState<string[]>([]);
  const [selectedNs, setSelectedNs] = useState<string | null>(null);
  const [entries, setEntries] = useState<any[]>([]);
  const [stats, setStats] = useState<any[]>([]);
  const [query, setQuery] = useState('');
  const [tab, setTab] = useState<'browse' | 'search' | 'stats'>('browse');
  const [loading, setLoading] = useState(false);

  const refresh = async () => {
    const [ns, st] = await Promise.all([
      invoke<string[]>('mem_namespaces'),
      invoke<any[]>('mem_stats'),
    ]);
    setNamespaces(ns);
    setStats(st);
    if (selectedNs) await loadNs(selectedNs);
  };

  const loadNs = async (ns: string) => {
    setLoading(true);
    setSelectedNs(ns);
    try { setEntries(await invoke('mem_list', { namespace: ns, limit: 100 })); } catch (e) { console.error(e); }
    setLoading(false);
  };

  const search = async () => {
    if (!query.trim()) return;
    setLoading(true);
    try { setEntries(await invoke('mem_search', { query, namespace: selectedNs, limit: 50 })); } catch (e) { console.error(e); }
    setLoading(false);
  };

  const forget = async (namespace: string, key: string) => {
    await invoke('mem_forget', { namespace, key });
    refresh();
  };

  const prune = async () => {
    const count = await invoke<number>('mem_prune');
    alert(\`Pruned \${count} expired entries\`);
    refresh();
  };

  useEffect(() => { refresh(); }, []);

  return (
    <div className="flex flex-col h-full p-6">
      <div className="flex items-center gap-3 mb-4">
        <Brain size={20} className="text-indigo-400" />
        <h1 className="text-lg font-semibold">Semantic Memory</h1>
        <div className="flex gap-1 ml-4">
          {(['browse', 'search', 'stats'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={\`px-2 py-1 text-xs rounded transition-colors \${tab === t ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:bg-gray-700'}\`}>
              {t}
            </button>
          ))}
        </div>
        <button onClick={prune} className="ml-auto text-xs px-2 py-1 border border-gray-600 hover:bg-gray-700 rounded">Prune expired</button>
        <button onClick={refresh} className="p-1.5 hover:bg-gray-700 rounded"><RefreshCw size={16} /></button>
      </div>

      {tab === 'browse' && (
        <div className="flex gap-4 flex-1 overflow-hidden">
          <div className="w-44 flex-shrink-0 space-y-1">
            {namespaces.map(ns => (
              <button key={ns} onClick={() => loadNs(ns)}
                className={\`w-full text-left px-3 py-2 text-sm rounded transition-colors \${selectedNs === ns ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:bg-gray-800'}\`}>
                {ns}
              </button>
            ))}
          </div>
          <div className="flex-1 overflow-auto space-y-2">
            {loading ? <div className="text-gray-500 text-sm">Loading…</div> : entries.map((e: any) => (
              <div key={e.id} className="p-3 border border-gray-700 rounded-lg group">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-indigo-300">{e.key}</span>
                  <span className="text-xs text-gray-500">conf: {e.confidence.toFixed(2)}</span>
                  <span className="text-xs text-gray-600">{e.source}</span>
                  <button onClick={() => forget(e.namespace, e.key)} className="ml-auto opacity-0 group-hover:opacity-100 p-1 hover:text-red-400 transition">
                    <Trash2 size={12} />
                  </button>
                </div>
                <div className="text-xs text-gray-400 mt-1 line-clamp-2">{e.value}</div>
                {e.tags.length > 0 && <div className="flex gap-1 mt-1">{e.tags.map((t: string) => <span key={t} className="text-xs bg-indigo-900/40 text-indigo-300 px-1 rounded">{t}</span>)}</div>}
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'search' && (
        <div className="flex flex-col gap-3 flex-1 overflow-hidden">
          <div className="flex gap-2">
            <input value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && search()}
              placeholder="Search key or value…" className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded text-sm focus:outline-none focus:border-indigo-500" />
            <button onClick={search} className="px-3 py-2 bg-indigo-600 hover:bg-indigo-500 rounded text-sm flex items-center gap-1"><Search size={14} /> Search</button>
          </div>
          <div className="flex-1 overflow-auto space-y-2">
            {entries.map((e: any) => (
              <div key={e.id} className="p-3 border border-gray-700 rounded-lg group">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 bg-gray-800 px-1.5 py-0.5 rounded">{e.namespace}</span>
                  <span className="text-sm font-medium text-indigo-300">{e.key}</span>
                  <span className="text-xs text-gray-500">{e.confidence.toFixed(2)}</span>
                  <button onClick={() => forget(e.namespace, e.key)} className="ml-auto opacity-0 group-hover:opacity-100 p-1 hover:text-red-400 transition"><Trash2 size={12} /></button>
                </div>
                <div className="text-xs text-gray-400 mt-1 line-clamp-3">{e.value}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'stats' && (
        <div className="space-y-3 overflow-auto flex-1">
          {stats.map((s: any) => (
            <div key={s.namespace} className="p-4 border border-gray-700 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <BarChart3 size={16} className="text-indigo-400" />
                <span className="font-medium">{s.namespace}</span>
                <span className="text-sm text-gray-400">{s.count} entries</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs text-gray-500">
                <div>Avg confidence: <span className="text-indigo-300">{s.avgConfidence?.toFixed(2)}</span></div>
                <div>Total recalls: <span className="text-indigo-300">{s.totalAccessCount}</span></div>
                {s.mostAccessedKey && <div className="col-span-2">Most recalled: <span className="text-indigo-300 font-mono">{s.mostAccessedKey}</span></div>}
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
