// Agicore Generated Rust Code
// App: novasyn_chat

use serde::{Deserialize, Serialize};
use crate::db::DbPool;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExchangeTag {
    pub id: String,
    pub exchange_id: String,
    pub tag_id: String,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateExchangeTagInput {
    pub exchange_id: String,
    pub tag_id: String,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateExchangeTagInput {
}

impl ExchangeTag {
    fn from_row(row: &rusqlite::Row) -> Self {
        Self {
            id: row.get("id").unwrap(),
            exchange_id: row.get("exchange_id").unwrap(),
            tag_id: row.get("tag_id").unwrap(),
            created_at: row.get("created_at").unwrap(),
            updated_at: row.get("updated_at").unwrap(),
        }
    }
}

#[tauri::command]
pub fn list_exchange_tags(db: tauri::State<'_, DbPool>) -> Result<Vec<ExchangeTag>, String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn.prepare("SELECT * FROM exchange_tags ORDER BY created_at DESC")
        .map_err(|e| e.to_string())?;
    let rows = stmt.query_map([], |row| Ok(ExchangeTag::from_row(row)))
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;
    Ok(rows)
}

#[tauri::command]
pub fn create_exchange_tag(db: tauri::State<'_, DbPool>, input: CreateExchangeTagInput) -> Result<ExchangeTag, String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    let id = uuid::Uuid::new_v4().to_string();
    let now = chrono::Utc::now().to_rfc3339();
    conn.execute(
        "INSERT INTO exchange_tags (id, exchange_id, tag_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
        rusqlite::params![
            id,
            input.exchange_id,
            input.tag_id,
            &now,
            &now,
        ],
    ).map_err(|e| e.to_string())?;
    drop(conn);
    get_exchange_tag(db, id)
}

#[tauri::command]
pub fn get_exchange_tag(db: tauri::State<'_, DbPool>, id: String) -> Result<ExchangeTag, String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    conn.query_row("SELECT * FROM exchange_tags WHERE id = ?", [&id], |row| {
        Ok(ExchangeTag::from_row(row))
    }).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn update_exchange_tag(db: tauri::State<'_, DbPool>, id: String, input: UpdateExchangeTagInput) -> Result<ExchangeTag, String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    let mut sets: Vec<String> = Vec::new();
    let mut params: Vec<Box<dyn rusqlite::types::ToSql>> = Vec::new();
    sets.push("updated_at = ?".to_string());
    params.push(Box::new(chrono::Utc::now().to_rfc3339()));
    params.push(Box::new(id.clone()));
    let sql = format!("UPDATE exchange_tags SET {} WHERE id = ?", sets.join(", "));
    let param_refs: Vec<&dyn rusqlite::types::ToSql> = params.iter().map(|p| p.as_ref()).collect();
    conn.execute(&sql, param_refs.as_slice()).map_err(|e| e.to_string())?;
    drop(conn);
    get_exchange_tag(db, id)
}

#[tauri::command]
pub fn delete_exchange_tag(db: tauri::State<'_, DbPool>, id: String) -> Result<(), String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM exchange_tags WHERE id = ?", [&id])
        .map_err(|e| e.to_string())?;
    Ok(())
}
