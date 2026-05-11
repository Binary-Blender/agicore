// Agicore Generated Rust Code
// App: novasyn_chat

use serde::{Deserialize, Serialize};
use crate::db::DbPool;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Tag {
    pub id: String,
    pub name: String,
    pub color: String,
    pub usage_count: i64,
    pub user_id: String,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateTagInput {
    pub name: String,
    pub color: Option<String>,
    pub usage_count: Option<i64>,
    pub user_id: String,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateTagInput {
    pub name: Option<String>,
    pub color: Option<String>,
    pub usage_count: Option<i64>,
}

impl Tag {
    fn from_row(row: &rusqlite::Row) -> Self {
        Self {
            id: row.get("id").unwrap(),
            name: row.get("name").unwrap(),
            color: row.get("color").unwrap(),
            usage_count: row.get("usage_count").unwrap(),
            user_id: row.get("user_id").unwrap(),
            created_at: row.get("created_at").unwrap(),
            updated_at: row.get("updated_at").unwrap(),
        }
    }
}

#[tauri::command]
pub fn list_tags(db: tauri::State<'_, DbPool>) -> Result<Vec<Tag>, String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn.prepare("SELECT * FROM tags ORDER BY created_at DESC")
        .map_err(|e| e.to_string())?;
    let rows = stmt.query_map([], |row| Ok(Tag::from_row(row)))
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;
    Ok(rows)
}

#[tauri::command]
pub fn create_tag(db: tauri::State<'_, DbPool>, input: CreateTagInput) -> Result<Tag, String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    let id = uuid::Uuid::new_v4().to_string();
    let now = chrono::Utc::now().to_rfc3339();
    conn.execute(
        "INSERT INTO tags (id, name, color, usage_count, user_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
        rusqlite::params![
            id,
            input.name,
            input.color.unwrap_or("#FCD34D".to_string()),
            input.usage_count.unwrap_or(0),
            input.user_id,
            &now,
            &now,
        ],
    ).map_err(|e| e.to_string())?;
    drop(conn);
    get_tag(db, id)
}

#[tauri::command]
pub fn get_tag(db: tauri::State<'_, DbPool>, id: String) -> Result<Tag, String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    conn.query_row("SELECT * FROM tags WHERE id = ?", [&id], |row| {
        Ok(Tag::from_row(row))
    }).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn update_tag(db: tauri::State<'_, DbPool>, id: String, input: UpdateTagInput) -> Result<Tag, String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    let mut sets: Vec<String> = Vec::new();
    let mut params: Vec<Box<dyn rusqlite::types::ToSql>> = Vec::new();
    if let Some(val) = input.name {
        sets.push("name = ?".to_string());
        params.push(Box::new(val));
    }
    if let Some(val) = input.color {
        sets.push("color = ?".to_string());
        params.push(Box::new(val));
    }
    if let Some(val) = input.usage_count {
        sets.push("usage_count = ?".to_string());
        params.push(Box::new(val));
    }
    sets.push("updated_at = ?".to_string());
    params.push(Box::new(chrono::Utc::now().to_rfc3339()));
    params.push(Box::new(id.clone()));
    let sql = format!("UPDATE tags SET {} WHERE id = ?", sets.join(", "));
    let param_refs: Vec<&dyn rusqlite::types::ToSql> = params.iter().map(|p| p.as_ref()).collect();
    conn.execute(&sql, param_refs.as_slice()).map_err(|e| e.to_string())?;
    drop(conn);
    get_tag(db, id)
}

#[tauri::command]
pub fn delete_tag(db: tauri::State<'_, DbPool>, id: String) -> Result<(), String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM tags WHERE id = ?", [&id])
        .map_err(|e| e.to_string())?;
    Ok(())
}
