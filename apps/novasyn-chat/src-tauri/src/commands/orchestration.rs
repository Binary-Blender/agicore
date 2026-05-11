// Agicore Generated Rust Code
// App: novasyn_chat

use serde::{Deserialize, Serialize};
use crate::db::DbPool;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Orchestration {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub steps: String,
    pub is_template: bool,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateOrchestrationInput {
    pub name: String,
    pub description: Option<String>,
    pub steps: Option<String>,
    pub is_template: Option<bool>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateOrchestrationInput {
    pub name: Option<String>,
    pub description: Option<String>,
    pub steps: Option<String>,
    pub is_template: Option<bool>,
}

impl Orchestration {
    fn from_row(row: &rusqlite::Row) -> Self {
        Self {
            id: row.get("id").unwrap(),
            name: row.get("name").unwrap(),
            description: row.get("description").ok(),
            steps: row.get("steps").unwrap(),
            is_template: row.get("is_template").unwrap(),
            created_at: row.get("created_at").unwrap(),
            updated_at: row.get("updated_at").unwrap(),
        }
    }
}

#[tauri::command]
pub fn list_orchestrations(db: tauri::State<'_, DbPool>) -> Result<Vec<Orchestration>, String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn.prepare("SELECT * FROM orchestrations ORDER BY created_at DESC")
        .map_err(|e| e.to_string())?;
    let rows = stmt.query_map([], |row| Ok(Orchestration::from_row(row)))
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;
    Ok(rows)
}

#[tauri::command]
pub fn create_orchestration(db: tauri::State<'_, DbPool>, input: CreateOrchestrationInput) -> Result<Orchestration, String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    let id = uuid::Uuid::new_v4().to_string();
    let now = chrono::Utc::now().to_rfc3339();
    conn.execute(
        "INSERT INTO orchestrations (id, name, description, steps, is_template, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
        rusqlite::params![
            id,
            input.name,
            input.description,
            input.steps.unwrap_or("[]".to_string()),
            input.is_template.unwrap_or(false),
            &now,
            &now,
        ],
    ).map_err(|e| e.to_string())?;
    drop(conn);
    get_orchestration(db, id)
}

#[tauri::command]
pub fn get_orchestration(db: tauri::State<'_, DbPool>, id: String) -> Result<Orchestration, String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    conn.query_row("SELECT * FROM orchestrations WHERE id = ?", [&id], |row| {
        Ok(Orchestration::from_row(row))
    }).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn update_orchestration(db: tauri::State<'_, DbPool>, id: String, input: UpdateOrchestrationInput) -> Result<Orchestration, String> {
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
    if let Some(val) = input.steps {
        sets.push("steps = ?".to_string());
        params.push(Box::new(val));
    }
    if let Some(val) = input.is_template {
        sets.push("is_template = ?".to_string());
        params.push(Box::new(val));
    }
    sets.push("updated_at = ?".to_string());
    params.push(Box::new(chrono::Utc::now().to_rfc3339()));
    params.push(Box::new(id.clone()));
    let sql = format!("UPDATE orchestrations SET {} WHERE id = ?", sets.join(", "));
    let param_refs: Vec<&dyn rusqlite::types::ToSql> = params.iter().map(|p| p.as_ref()).collect();
    conn.execute(&sql, param_refs.as_slice()).map_err(|e| e.to_string())?;
    drop(conn);
    get_orchestration(db, id)
}

#[tauri::command]
pub fn delete_orchestration(db: tauri::State<'_, DbPool>, id: String) -> Result<(), String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM orchestrations WHERE id = ?", [&id])
        .map_err(|e| e.to_string())?;
    Ok(())
}
