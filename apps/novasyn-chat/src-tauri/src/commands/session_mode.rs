// SESSION MODE runtime — semantic operating modes with memory context

use serde::{Deserialize, Serialize};
use tauri::State;
use crate::db::DbPool;

// ─── Static SESSION_MODES registry ───────────────────────────────────────────

struct SessionModeDef {
    name: &'static str,
    description: &'static str,
    tools: &'static [&'static str],
    context: &'static str,
    memory: &'static str,
    persist: bool,
}

const SESSION_MODES: &[SessionModeDef] = &[
    SessionModeDef {
        name: "chat_mode",
        description: "General AI conversation — open-ended chat with memory of current session",
        tools: &["chat", "search", "vault_browse"],
        context: "conversation",
        memory: "session",
        persist: false,
    },
    SessionModeDef {
        name: "research_mode",
        description: "Deep research with web search, vault access, and cross-session knowledge retention",
        tools: &["chat", "search", "web_search", "vault_browse", "vault_save"],
        context: "structured",
        memory: "persistent",
        persist: true,
    },
    SessionModeDef {
        name: "creative_mode",
        description: "Long-form creative writing and ideation with continuity tracking",
        tools: &["chat", "editor", "outline", "vault_save"],
        context: "structured",
        memory: "persistent",
        persist: true,
    },
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
        [],
        |row| row.get(0),
    ).ok()
}

fn count_memory(conn: &rusqlite::Connection, mode_name: &str) -> i64 {
    conn.query_row(
        "SELECT COUNT(*) FROM session_mode_memory WHERE mode_name = ?",
        [mode_name],
        |row| row.get(0),
    ).unwrap_or(0)
}

// ─── Tauri commands ───────────────────────────────────────────────────────────

#[tauri::command]
pub fn list_session_modes(db: State<'_, DbPool>) -> Result<Vec<SessionModeInfo>, String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    let active = get_active_mode_name(&conn);
    let mut result = Vec::new();
    for def in SESSION_MODES {
        let is_active = active.as_deref() == Some(def.name);
        let activated_at: Option<String> = if is_active {
            conn.query_row(
                "SELECT activated_at FROM session_mode_activations WHERE mode_name = ? AND is_active = 1",
                [def.name], |row| row.get(0),
            ).ok()
        } else { None };
        let memory_entries = count_memory(&conn, def.name);
        result.push(SessionModeInfo {
            name: def.name.to_string(),
            description: def.description.to_string(),
            tools: def.tools.iter().map(|s| s.to_string()).collect(),
            context: def.context.to_string(),
            memory: def.memory.to_string(),
            persist: def.persist,
            is_active,
            activated_at,
            memory_entries,
        });
    }
    Ok(result)
}

#[tauri::command]
pub fn get_active_mode(db: State<'_, DbPool>) -> Result<Option<SessionModeInfo>, String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    let name = match get_active_mode_name(&conn) {
        Some(n) => n,
        None => return Ok(None),
    };
    let def = match SESSION_MODES.iter().find(|d| d.name == name.as_str()) {
        Some(d) => d,
        None => return Ok(None),
    };
    let activated_at = conn.query_row(
        "SELECT activated_at FROM session_mode_activations WHERE mode_name = ? AND is_active = 1",
        [def.name], |row| row.get::<_, String>(0),
    ).ok();
    let memory_entries = count_memory(&conn, def.name);
    Ok(Some(SessionModeInfo {
        name: def.name.to_string(),
        description: def.description.to_string(),
        tools: def.tools.iter().map(|s| s.to_string()).collect(),
        context: def.context.to_string(),
        memory: def.memory.to_string(),
        persist: def.persist,
        is_active: true,
        activated_at,
        memory_entries,
    }))
}

#[tauri::command]
pub fn set_active_mode(name: String, db: State<'_, DbPool>) -> Result<SessionModeInfo, String> {
    let def = SESSION_MODES.iter().find(|d| d.name == name.as_str())
        .ok_or_else(|| format!("Unknown session mode: {}", name))?;
    let conn = db.lock().map_err(|e| e.to_string())?;
    let now = chrono::Utc::now().to_rfc3339();
    // Deactivate all current modes
    conn.execute("UPDATE session_mode_activations SET is_active = 0 WHERE is_active = 1", [])
        .map_err(|e| e.to_string())?;
    // Insert new activation record
    let id = uuid::Uuid::new_v4().to_string();
    conn.execute(
        "INSERT INTO session_mode_activations (id, mode_name, is_active, activated_at, created_at) VALUES (?, ?, 1, ?, ?)",
        rusqlite::params![id, def.name, now, now],
    ).map_err(|e| e.to_string())?;
    eprintln!("[SessionMode] Activated: {}", def.name);
    let memory_entries = count_memory(&conn, def.name);
    Ok(SessionModeInfo {
        name: def.name.to_string(),
        description: def.description.to_string(),
        tools: def.tools.iter().map(|s| s.to_string()).collect(),
        context: def.context.to_string(),
        memory: def.memory.to_string(),
        persist: def.persist,
        is_active: true,
        activated_at: Some(now),
        memory_entries,
    })
}

#[tauri::command]
pub fn get_mode_memory(
    mode_name: String,
    db: State<'_, DbPool>,
) -> Result<Vec<ModeMemoryEntry>, String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn.prepare(
        "SELECT id, mode_name, key, value, created_at, updated_at FROM session_mode_memory WHERE mode_name = ? ORDER BY updated_at DESC"
    ).map_err(|e| e.to_string())?;
    let rows = stmt.query_map([&mode_name], |row| Ok(ModeMemoryEntry {
        id: row.get(0)?,
        mode_name: row.get(1)?,
        key: row.get(2)?,
        value: row.get(3)?,
        created_at: row.get(4)?,
        updated_at: row.get(5)?,
    })).map_err(|e| e.to_string())?
    .collect::<Result<Vec<_>, _>>()
    .map_err(|e| e.to_string())?;
    Ok(rows)
}

#[tauri::command]
pub fn set_mode_memory(
    mode_name: String,
    key: String,
    value: String,
    db: State<'_, DbPool>,
) -> Result<ModeMemoryEntry, String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    let now = chrono::Utc::now().to_rfc3339();
    // Upsert
    let existing: Option<String> = conn.query_row(
        "SELECT id FROM session_mode_memory WHERE mode_name = ? AND key = ?",
        rusqlite::params![mode_name, key],
        |row| row.get(0),
    ).ok();
    if let Some(id) = existing {
        conn.execute(
            "UPDATE session_mode_memory SET value = ?, updated_at = ? WHERE id = ?",
            rusqlite::params![value, now, id],
        ).map_err(|e| e.to_string())?;
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
pub fn delete_mode_memory(
    mode_name: String,
    key: String,
    db: State<'_, DbPool>,
) -> Result<(), String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "DELETE FROM session_mode_memory WHERE mode_name = ? AND key = ?",
        rusqlite::params![mode_name, key],
    ).map_err(|e| e.to_string())?;
    Ok(())
}
