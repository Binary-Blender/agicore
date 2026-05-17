// Agicore Generated Rust Code
// App: novasyn_chat

use serde::{Deserialize, Serialize};
use crate::db::DbPool;
use std::collections::HashMap;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Session {
    pub id: String,
    pub name: String,
    pub system_prompt: Option<String>,
    pub selected_folders: Option<String>,
    pub is_archived: bool,
    pub user_id: String,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateSessionInput {
    pub name: String,
    pub user_id: String,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateSessionInput {
    pub name: Option<String>,
    pub system_prompt: Option<String>,
    pub selected_folders: Option<String>,
    pub is_archived: Option<bool>,
}

impl Session {
    fn from_row(row: &rusqlite::Row) -> Self {
        Self {
            id: row.get("id").unwrap(),
            name: row.get("name").unwrap(),
            system_prompt: row.get("system_prompt").unwrap_or(None),
            selected_folders: row.get("selected_folders").unwrap_or(None),
            is_archived: row.get::<_, i64>("is_archived").unwrap_or(0) != 0,
            user_id: row.get("user_id").unwrap(),
            created_at: row.get("created_at").unwrap(),
            updated_at: row.get("updated_at").unwrap(),
        }
    }
}

#[tauri::command]
pub fn list_sessions(db: tauri::State<'_, DbPool>) -> Result<Vec<Session>, String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn.prepare("SELECT * FROM sessions ORDER BY created_at DESC")
        .map_err(|e| e.to_string())?;
    let rows = stmt.query_map([], |row| Ok(Session::from_row(row)))
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;
    Ok(rows)
}

#[tauri::command]
pub fn create_session(db: tauri::State<'_, DbPool>, input: CreateSessionInput) -> Result<Session, String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    let id = uuid::Uuid::new_v4().to_string();
    let now = chrono::Utc::now().to_rfc3339();
    conn.execute(
        "INSERT INTO sessions (id, name, user_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
        rusqlite::params![
            id,
            input.name,
            input.user_id,
            &now,
            &now,
        ],
    ).map_err(|e| e.to_string())?;
    drop(conn);
    get_session(db, id)
}

#[tauri::command]
pub fn get_session(db: tauri::State<'_, DbPool>, id: String) -> Result<Session, String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    conn.query_row("SELECT * FROM sessions WHERE id = ?", [&id], |row| {
        Ok(Session::from_row(row))
    }).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn update_session(db: tauri::State<'_, DbPool>, id: String, input: UpdateSessionInput) -> Result<Session, String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    let mut sets: Vec<String> = Vec::new();
    let mut params: Vec<Box<dyn rusqlite::types::ToSql>> = Vec::new();
    if let Some(val) = input.name {
        sets.push("name = ?".to_string());
        params.push(Box::new(val));
    }
    if let Some(val) = input.system_prompt {
        sets.push("system_prompt = ?".to_string());
        params.push(Box::new(val));
    }
    if let Some(val) = input.selected_folders {
        sets.push("selected_folders = ?".to_string());
        params.push(Box::new(val));
    }
    if let Some(val) = input.is_archived {
        sets.push("is_archived = ?".to_string());
        params.push(Box::new(if val { 1i64 } else { 0i64 }));
    }
    sets.push("updated_at = ?".to_string());
    params.push(Box::new(chrono::Utc::now().to_rfc3339()));
    params.push(Box::new(id.clone()));
    let sql = format!("UPDATE sessions SET {} WHERE id = ?", sets.join(", "));
    let param_refs: Vec<&dyn rusqlite::types::ToSql> = params.iter().map(|p| p.as_ref()).collect();
    conn.execute(&sql, param_refs.as_slice()).map_err(|e| e.to_string())?;
    drop(conn);
    get_session(db, id)
}

#[tauri::command]
pub fn delete_session(db: tauri::State<'_, DbPool>, id: String) -> Result<(), String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM sessions WHERE id = ?", [&id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn get_session_message_counts(db: tauri::State<'_, DbPool>) -> Result<HashMap<String, i64>, String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn.prepare(
        "SELECT session_id, COUNT(*) FROM chat_messages GROUP BY session_id"
    ).map_err(|e| e.to_string())?;
    let mut map = HashMap::new();
    let rows = stmt.query_map([], |row| {
        Ok((row.get::<_, String>(0)?, row.get::<_, i64>(1)?))
    }).map_err(|e| e.to_string())?;
    for row in rows {
        let (sid, cnt) = row.map_err(|e| e.to_string())?;
        map.insert(sid, cnt);
    }
    Ok(map)
}

#[tauri::command]
pub fn copy_session_messages(
    db: tauri::State<'_, DbPool>,
    source_session_id: String,
    target_session_id: String,
) -> Result<i32, String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn.prepare(
        "SELECT user_message, ai_message, user_tokens, ai_tokens, total_tokens, model, provider
         FROM chat_messages WHERE session_id = ? ORDER BY created_at ASC"
    ).map_err(|e| e.to_string())?;
    let rows: Vec<_> = stmt.query_map([&source_session_id], |row| {
        Ok((
            row.get::<_, String>(0)?,
            row.get::<_, String>(1)?,
            row.get::<_, i64>(2)?,
            row.get::<_, i64>(3)?,
            row.get::<_, i64>(4)?,
            row.get::<_, String>(5)?,
            row.get::<_, String>(6)?,
        ))
    }).map_err(|e| e.to_string())?
    .collect::<Result<_, _>>().map_err(|e| e.to_string())?;
    let count = rows.len() as i32;
    let now = chrono::Utc::now().to_rfc3339();
    for (user_msg, ai_msg, user_tokens, ai_tokens, total_tokens, model, provider) in rows {
        let id = uuid::Uuid::new_v4().to_string();
        conn.execute(
            "INSERT INTO chat_messages (id, user_message, ai_message, user_tokens, ai_tokens, total_tokens, model, provider, user_id, session_id, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'default-user', ?, ?, ?)",
            rusqlite::params![id, user_msg, ai_msg, user_tokens, ai_tokens, total_tokens, model, provider, target_session_id, &now, &now],
        ).map_err(|e| e.to_string())?;
    }
    Ok(count)
}
