// Agicore Generated Rust Code
// App: novasyn_chat

use serde::{Deserialize, Serialize};
use crate::db::DbPool;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FolderItem {
    pub id: String,
    pub content: String,
    pub tokens: i64,
    pub item_type: Option<String>,
    pub filename: Option<String>,
    pub source_type: Option<String>,
    pub folder_id: String,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateFolderItemInput {
    pub content: String,
    pub tokens: i64,
    pub item_type: Option<String>,
    pub filename: Option<String>,
    pub source_type: Option<String>,
    pub folder_id: String,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateFolderItemInput {
    pub content: Option<String>,
    pub tokens: Option<i64>,
    pub item_type: Option<String>,
    pub filename: Option<String>,
    pub source_type: Option<String>,
}

impl FolderItem {
    fn from_row(row: &rusqlite::Row) -> Self {
        Self {
            id: row.get("id").unwrap(),
            content: row.get("content").unwrap(),
            tokens: row.get("tokens").unwrap(),
            item_type: row.get("item_type").ok(),
            filename: row.get("filename").ok(),
            source_type: row.get("source_type").ok(),
            folder_id: row.get("folder_id").unwrap(),
            created_at: row.get("created_at").unwrap(),
            updated_at: row.get("updated_at").unwrap(),
        }
    }
}

#[tauri::command]
pub fn list_folder_items(db: tauri::State<'_, DbPool>) -> Result<Vec<FolderItem>, String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn.prepare("SELECT * FROM folder_items ORDER BY created_at DESC")
        .map_err(|e| e.to_string())?;
    let rows = stmt.query_map([], |row| Ok(FolderItem::from_row(row)))
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;
    Ok(rows)
}

#[tauri::command]
pub fn create_folder_item(db: tauri::State<'_, DbPool>, input: CreateFolderItemInput) -> Result<FolderItem, String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    let id = uuid::Uuid::new_v4().to_string();
    let now = chrono::Utc::now().to_rfc3339();
    conn.execute(
        "INSERT INTO folder_items (id, content, tokens, item_type, filename, source_type, folder_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
        rusqlite::params![
            id,
            input.content,
            input.tokens,
            input.item_type,
            input.filename,
            input.source_type,
            input.folder_id,
            &now,
            &now,
        ],
    ).map_err(|e| e.to_string())?;
    drop(conn);
    get_folder_item(db, id)
}

#[tauri::command]
pub fn get_folder_item(db: tauri::State<'_, DbPool>, id: String) -> Result<FolderItem, String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    conn.query_row("SELECT * FROM folder_items WHERE id = ?", [&id], |row| {
        Ok(FolderItem::from_row(row))
    }).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn update_folder_item(db: tauri::State<'_, DbPool>, id: String, input: UpdateFolderItemInput) -> Result<FolderItem, String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    let mut sets: Vec<String> = Vec::new();
    let mut params: Vec<Box<dyn rusqlite::types::ToSql>> = Vec::new();
    if let Some(val) = input.content {
        sets.push("content = ?".to_string());
        params.push(Box::new(val));
    }
    if let Some(val) = input.tokens {
        sets.push("tokens = ?".to_string());
        params.push(Box::new(val));
    }
    if let Some(val) = input.item_type {
        sets.push("item_type = ?".to_string());
        params.push(Box::new(val));
    }
    if let Some(val) = input.filename {
        sets.push("filename = ?".to_string());
        params.push(Box::new(val));
    }
    if let Some(val) = input.source_type {
        sets.push("source_type = ?".to_string());
        params.push(Box::new(val));
    }
    sets.push("updated_at = ?".to_string());
    params.push(Box::new(chrono::Utc::now().to_rfc3339()));
    params.push(Box::new(id.clone()));
    let sql = format!("UPDATE folder_items SET {} WHERE id = ?", sets.join(", "));
    let param_refs: Vec<&dyn rusqlite::types::ToSql> = params.iter().map(|p| p.as_ref()).collect();
    conn.execute(&sql, param_refs.as_slice()).map_err(|e| e.to_string())?;
    drop(conn);
    get_folder_item(db, id)
}

#[tauri::command]
pub fn delete_folder_item(db: tauri::State<'_, DbPool>, id: String) -> Result<(), String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM folder_items WHERE id = ?", [&id])
        .map_err(|e| e.to_string())?;
    Ok(())
}
