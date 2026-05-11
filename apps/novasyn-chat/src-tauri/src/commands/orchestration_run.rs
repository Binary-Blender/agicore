// Agicore Generated Rust Code
// App: novasyn_chat

use serde::{Deserialize, Serialize};
use crate::db::DbPool;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct OrchestrationRun {
    pub id: String,
    pub status: String,
    pub current_step_index: i64,
    pub step_results: String,
    pub error: Option<String>,
    pub started_at: Option<String>,
    pub paused_at: Option<String>,
    pub completed_at: Option<String>,
    pub orchestration_id: String,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateOrchestrationRunInput {
    pub status: Option<String>,
    pub current_step_index: Option<i64>,
    pub step_results: Option<String>,
    pub error: Option<String>,
    pub started_at: Option<String>,
    pub paused_at: Option<String>,
    pub completed_at: Option<String>,
    pub orchestration_id: String,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateOrchestrationRunInput {
    pub status: Option<String>,
    pub current_step_index: Option<i64>,
    pub step_results: Option<String>,
    pub error: Option<String>,
    pub started_at: Option<String>,
    pub paused_at: Option<String>,
    pub completed_at: Option<String>,
}

impl OrchestrationRun {
    fn from_row(row: &rusqlite::Row) -> Self {
        Self {
            id: row.get("id").unwrap(),
            status: row.get("status").unwrap(),
            current_step_index: row.get("current_step_index").unwrap(),
            step_results: row.get("step_results").unwrap(),
            error: row.get("error").ok(),
            started_at: row.get("started_at").ok(),
            paused_at: row.get("paused_at").ok(),
            completed_at: row.get("completed_at").ok(),
            orchestration_id: row.get("orchestration_id").unwrap(),
            created_at: row.get("created_at").unwrap(),
            updated_at: row.get("updated_at").unwrap(),
        }
    }
}

#[tauri::command]
pub fn list_orchestration_runs(db: tauri::State<'_, DbPool>) -> Result<Vec<OrchestrationRun>, String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn.prepare("SELECT * FROM orchestration_runs ORDER BY created_at DESC")
        .map_err(|e| e.to_string())?;
    let rows = stmt.query_map([], |row| Ok(OrchestrationRun::from_row(row)))
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;
    Ok(rows)
}

#[tauri::command]
pub fn create_orchestration_run(db: tauri::State<'_, DbPool>, input: CreateOrchestrationRunInput) -> Result<OrchestrationRun, String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    let id = uuid::Uuid::new_v4().to_string();
    let now = chrono::Utc::now().to_rfc3339();
    conn.execute(
        "INSERT INTO orchestration_runs (id, status, current_step_index, step_results, error, started_at, paused_at, completed_at, orchestration_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        rusqlite::params![
            id,
            input.status.unwrap_or("pending".to_string()),
            input.current_step_index.unwrap_or(0),
            input.step_results.unwrap_or("[]".to_string()),
            input.error,
            input.started_at,
            input.paused_at,
            input.completed_at,
            input.orchestration_id,
            &now,
            &now,
        ],
    ).map_err(|e| e.to_string())?;
    drop(conn);
    get_orchestration_run(db, id)
}

#[tauri::command]
pub fn get_orchestration_run(db: tauri::State<'_, DbPool>, id: String) -> Result<OrchestrationRun, String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    conn.query_row("SELECT * FROM orchestration_runs WHERE id = ?", [&id], |row| {
        Ok(OrchestrationRun::from_row(row))
    }).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn update_orchestration_run(db: tauri::State<'_, DbPool>, id: String, input: UpdateOrchestrationRunInput) -> Result<OrchestrationRun, String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    let mut sets: Vec<String> = Vec::new();
    let mut params: Vec<Box<dyn rusqlite::types::ToSql>> = Vec::new();
    if let Some(val) = input.status {
        sets.push("status = ?".to_string());
        params.push(Box::new(val));
    }
    if let Some(val) = input.current_step_index {
        sets.push("current_step_index = ?".to_string());
        params.push(Box::new(val));
    }
    if let Some(val) = input.step_results {
        sets.push("step_results = ?".to_string());
        params.push(Box::new(val));
    }
    if let Some(val) = input.error {
        sets.push("error = ?".to_string());
        params.push(Box::new(val));
    }
    if let Some(val) = input.started_at {
        sets.push("started_at = ?".to_string());
        params.push(Box::new(val));
    }
    if let Some(val) = input.paused_at {
        sets.push("paused_at = ?".to_string());
        params.push(Box::new(val));
    }
    if let Some(val) = input.completed_at {
        sets.push("completed_at = ?".to_string());
        params.push(Box::new(val));
    }
    sets.push("updated_at = ?".to_string());
    params.push(Box::new(chrono::Utc::now().to_rfc3339()));
    params.push(Box::new(id.clone()));
    let sql = format!("UPDATE orchestration_runs SET {} WHERE id = ?", sets.join(", "));
    let param_refs: Vec<&dyn rusqlite::types::ToSql> = params.iter().map(|p| p.as_ref()).collect();
    conn.execute(&sql, param_refs.as_slice()).map_err(|e| e.to_string())?;
    drop(conn);
    get_orchestration_run(db, id)
}

#[tauri::command]
pub fn delete_orchestration_run(db: tauri::State<'_, DbPool>, id: String) -> Result<(), String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM orchestration_runs WHERE id = ?", [&id])
        .map_err(|e| e.to_string())?;
    Ok(())
}
