// Agicore Generated Rust Code
// App: novasyn_chat

use serde::{Deserialize, Serialize};
use crate::db::DbPool;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Folder {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub parent_id: Option<String>,
    pub total_tokens: i64,
    pub user_id: String,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateFolderInput {
    pub name: String,
    pub description: Option<String>,
    pub parent_id: Option<String>,
    pub total_tokens: Option<i64>,
    pub user_id: String,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateFolderInput {
    pub name: Option<String>,
    pub description: Option<String>,
    pub parent_id: Option<String>,
    pub total_tokens: Option<i64>,
}

impl Folder {
    fn from_row(row: &rusqlite::Row) -> Self {
        Self {
            id: row.get("id").unwrap(),
            name: row.get("name").unwrap(),
            description: row.get("description").ok(),
            parent_id: row.get("parent_id").ok(),
            total_tokens: row.get("total_tokens").unwrap(),
            user_id: row.get("user_id").unwrap(),
            created_at: row.get("created_at").unwrap(),
            updated_at: row.get("updated_at").unwrap(),
        }
    }
}

#[tauri::command]
pub fn list_folders(db: tauri::State<'_, DbPool>) -> Result<Vec<Folder>, String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn.prepare("SELECT * FROM folders ORDER BY created_at DESC")
        .map_err(|e| e.to_string())?;
    let rows = stmt.query_map([], |row| Ok(Folder::from_row(row)))
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;
    Ok(rows)
}

#[tauri::command]
pub fn create_folder(db: tauri::State<'_, DbPool>, input: CreateFolderInput) -> Result<Folder, String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    let id = uuid::Uuid::new_v4().to_string();
    let now = chrono::Utc::now().to_rfc3339();
    conn.execute(
        "INSERT INTO folders (id, name, description, parent_id, total_tokens, user_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        rusqlite::params![
            id,
            input.name,
            input.description,
            input.parent_id,
            input.total_tokens.unwrap_or(0),
            input.user_id,
            &now,
            &now,
        ],
    ).map_err(|e| e.to_string())?;
    drop(conn);
    get_folder(db, id)
}

#[tauri::command]
pub fn get_folder(db: tauri::State<'_, DbPool>, id: String) -> Result<Folder, String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    conn.query_row("SELECT * FROM folders WHERE id = ?", [&id], |row| {
        Ok(Folder::from_row(row))
    }).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn update_folder(db: tauri::State<'_, DbPool>, id: String, input: UpdateFolderInput) -> Result<Folder, String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    let mut sets: Vec<String> = Vec::new();
    let mut params: Vec<Box<dyn rusqlite::types::ToSql>> = Vec::new();
    if let Some(val) = input.name {
        sets.push("name = ?".to_string());
        params.push(Box::new(val));
    }
    if let Some(val) = input.description {
        sets.push("description = ?".to_string());
        params.push(Box::new(val));
    }
    if let Some(val) = input.parent_id {
        sets.push("parent_id = ?".to_string());
        params.push(Box::new(val));
    }
    if let Some(val) = input.total_tokens {
        sets.push("total_tokens = ?".to_string());
        params.push(Box::new(val));
    }
    sets.push("updated_at = ?".to_string());
    params.push(Box::new(chrono::Utc::now().to_rfc3339()));
    params.push(Box::new(id.clone()));
    let sql = format!("UPDATE folders SET {} WHERE id = ?", sets.join(", "));
    let param_refs: Vec<&dyn rusqlite::types::ToSql> = params.iter().map(|p| p.as_ref()).collect();
    conn.execute(&sql, param_refs.as_slice()).map_err(|e| e.to_string())?;
    drop(conn);
    get_folder(db, id)
}

#[tauri::command]
pub fn delete_folder(db: tauri::State<'_, DbPool>, id: String) -> Result<(), String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM folders WHERE id = ?", [&id])
        .map_err(|e| e.to_string())?;
    Ok(())
}
