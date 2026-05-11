// Agicore Generated Rust Code
// App: novasyn_chat

use serde::{Deserialize, Serialize};
use crate::db::DbPool;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ChatMessageTag {
    pub id: String,
    pub chat_message_id: String,
    pub tag_id: String,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateChatMessageTagInput {
    pub chat_message_id: String,
    pub tag_id: String,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateChatMessageTagInput {
}

impl ChatMessageTag {
    fn from_row(row: &rusqlite::Row) -> Self {
        Self {
            id: row.get("id").unwrap(),
            chat_message_id: row.get("chat_message_id").unwrap(),
            tag_id: row.get("tag_id").unwrap(),
            created_at: row.get("created_at").unwrap(),
            updated_at: row.get("updated_at").unwrap(),
        }
    }
}

#[tauri::command]
pub fn list_chat_message_tags(db: tauri::State<'_, DbPool>) -> Result<Vec<ChatMessageTag>, String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn.prepare("SELECT * FROM chat_message_tags ORDER BY created_at DESC")
        .map_err(|e| e.to_string())?;
    let rows = stmt.query_map([], |row| Ok(ChatMessageTag::from_row(row)))
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;
    Ok(rows)
}

#[tauri::command]
pub fn create_chat_message_tag(db: tauri::State<'_, DbPool>, input: CreateChatMessageTagInput) -> Result<ChatMessageTag, String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    let id = uuid::Uuid::new_v4().to_string();
    let now = chrono::Utc::now().to_rfc3339();
    conn.execute(
        "INSERT INTO chat_message_tags (id, chat_message_id, tag_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
        rusqlite::params![
            id,
            input.chat_message_id,
            input.tag_id,
            &now,
            &now,
        ],
    ).map_err(|e| e.to_string())?;
    drop(conn);
    get_chat_message_tag(db, id)
}

#[tauri::command]
pub fn get_chat_message_tag(db: tauri::State<'_, DbPool>, id: String) -> Result<ChatMessageTag, String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    conn.query_row("SELECT * FROM chat_message_tags WHERE id = ?", [&id], |row| {
        Ok(ChatMessageTag::from_row(row))
    }).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn update_chat_message_tag(db: tauri::State<'_, DbPool>, id: String, input: UpdateChatMessageTagInput) -> Result<ChatMessageTag, String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    let mut sets: Vec<String> = Vec::new();
    let mut params: Vec<Box<dyn rusqlite::types::ToSql>> = Vec::new();
    sets.push("updated_at = ?".to_string());
    params.push(Box::new(chrono::Utc::now().to_rfc3339()));
    params.push(Box::new(id.clone()));
    let sql = format!("UPDATE chat_message_tags SET {} WHERE id = ?", sets.join(", "));
    let param_refs: Vec<&dyn rusqlite::types::ToSql> = params.iter().map(|p| p.as_ref()).collect();
    conn.execute(&sql, param_refs.as_slice()).map_err(|e| e.to_string())?;
    drop(conn);
    get_chat_message_tag(db, id)
}

#[tauri::command]
pub fn delete_chat_message_tag(db: tauri::State<'_, DbPool>, id: String) -> Result<(), String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM chat_message_tags WHERE id = ?", [&id])
        .map_err(|e| e.to_string())?;
    Ok(())
}
