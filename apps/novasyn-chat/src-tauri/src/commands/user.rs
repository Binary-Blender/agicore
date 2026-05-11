// Agicore Generated Rust Code
// App: novasyn_chat

use serde::{Deserialize, Serialize};
use crate::db::DbPool;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct User {
    pub id: String,
    pub email: String,
    pub name: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateUserInput {
    pub email: String,
    pub name: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateUserInput {
    pub email: Option<String>,
    pub name: Option<String>,
}

impl User {
    fn from_row(row: &rusqlite::Row) -> Self {
        Self {
            id: row.get("id").unwrap(),
            email: row.get("email").unwrap(),
            name: row.get("name").ok(),
            created_at: row.get("created_at").unwrap(),
            updated_at: row.get("updated_at").unwrap(),
        }
    }
}

#[tauri::command]
pub fn list_users(db: tauri::State<'_, DbPool>) -> Result<Vec<User>, String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn.prepare("SELECT * FROM users ORDER BY created_at DESC")
        .map_err(|e| e.to_string())?;
    let rows = stmt.query_map([], |row| Ok(User::from_row(row)))
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;
    Ok(rows)
}

#[tauri::command]
pub fn create_user(db: tauri::State<'_, DbPool>, input: CreateUserInput) -> Result<User, String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    let id = uuid::Uuid::new_v4().to_string();
    let now = chrono::Utc::now().to_rfc3339();
    conn.execute(
        "INSERT INTO users (id, email, name, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
        rusqlite::params![
            id,
            input.email,
            input.name,
            &now,
            &now,
        ],
    ).map_err(|e| e.to_string())?;
    drop(conn);
    get_user(db, id)
}

#[tauri::command]
pub fn get_user(db: tauri::State<'_, DbPool>, id: String) -> Result<User, String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    conn.query_row("SELECT * FROM users WHERE id = ?", [&id], |row| {
        Ok(User::from_row(row))
    }).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn update_user(db: tauri::State<'_, DbPool>, id: String, input: UpdateUserInput) -> Result<User, String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    let mut sets: Vec<String> = Vec::new();
    let mut params: Vec<Box<dyn rusqlite::types::ToSql>> = Vec::new();
    if let Some(val) = input.email {
        sets.push("email = ?".to_string());
        params.push(Box::new(val));
    }
    if let Some(val) = input.name {
        sets.push("name = ?".to_string());
        params.push(Box::new(val));
    }
    sets.push("updated_at = ?".to_string());
    params.push(Box::new(chrono::Utc::now().to_rfc3339()));
    params.push(Box::new(id.clone()));
    let sql = format!("UPDATE users SET {} WHERE id = ?", sets.join(", "));
    let param_refs: Vec<&dyn rusqlite::types::ToSql> = params.iter().map(|p| p.as_ref()).collect();
    conn.execute(&sql, param_refs.as_slice()).map_err(|e| e.to_string())?;
    drop(conn);
    get_user(db, id)
}

#[tauri::command]
pub fn delete_user(db: tauri::State<'_, DbPool>, id: String) -> Result<(), String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM users WHERE id = ?", [&id])
        .map_err(|e| e.to_string())?;
    Ok(())
}
