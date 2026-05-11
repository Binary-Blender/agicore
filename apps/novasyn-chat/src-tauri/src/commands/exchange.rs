// Agicore Generated Rust Code
// App: novasyn_chat

use serde::{Deserialize, Serialize};
use crate::db::DbPool;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Exchange {
    pub id: String,
    pub prompt: String,
    pub response: String,
    pub model: String,
    pub provider: String,
    pub rating: Option<i64>,
    pub success: bool,
    pub user_id: String,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateExchangeInput {
    pub prompt: String,
    pub response: String,
    pub model: String,
    pub provider: String,
    pub rating: Option<i64>,
    pub success: Option<bool>,
    pub user_id: String,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateExchangeInput {
    pub prompt: Option<String>,
    pub response: Option<String>,
    pub model: Option<String>,
    pub provider: Option<String>,
    pub rating: Option<i64>,
    pub success: Option<bool>,
}

impl Exchange {
    fn from_row(row: &rusqlite::Row) -> Self {
        Self {
            id: row.get("id").unwrap(),
            prompt: row.get("prompt").unwrap(),
            response: row.get("response").unwrap(),
            model: row.get("model").unwrap(),
            provider: row.get("provider").unwrap(),
            rating: row.get("rating").ok(),
            success: row.get("success").unwrap(),
            user_id: row.get("user_id").unwrap(),
            created_at: row.get("created_at").unwrap(),
            updated_at: row.get("updated_at").unwrap(),
        }
    }
}

#[tauri::command]
pub fn list_exchanges(db: tauri::State<'_, DbPool>) -> Result<Vec<Exchange>, String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn.prepare("SELECT * FROM exchanges ORDER BY created_at DESC")
        .map_err(|e| e.to_string())?;
    let rows = stmt.query_map([], |row| Ok(Exchange::from_row(row)))
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;
    Ok(rows)
}

#[tauri::command]
pub fn create_exchange(db: tauri::State<'_, DbPool>, input: CreateExchangeInput) -> Result<Exchange, String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    let id = uuid::Uuid::new_v4().to_string();
    let now = chrono::Utc::now().to_rfc3339();
    conn.execute(
        "INSERT INTO exchanges (id, prompt, response, model, provider, rating, success, user_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        rusqlite::params![
            id,
            input.prompt,
            input.response,
            input.model,
            input.provider,
            input.rating,
            input.success.unwrap_or(true),
            input.user_id,
            &now,
            &now,
        ],
    ).map_err(|e| e.to_string())?;
    drop(conn);
    get_exchange(db, id)
}

#[tauri::command]
pub fn get_exchange(db: tauri::State<'_, DbPool>, id: String) -> Result<Exchange, String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    conn.query_row("SELECT * FROM exchanges WHERE id = ?", [&id], |row| {
        Ok(Exchange::from_row(row))
    }).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn update_exchange(db: tauri::State<'_, DbPool>, id: String, input: UpdateExchangeInput) -> Result<Exchange, String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    let mut sets: Vec<String> = Vec::new();
    let mut params: Vec<Box<dyn rusqlite::types::ToSql>> = Vec::new();
    if let Some(val) = input.prompt {
        sets.push("prompt = ?".to_string());
        params.push(Box::new(val));
    }
    if let Some(val) = input.response {
        sets.push("response = ?".to_string());
        params.push(Box::new(val));
    }
    if let Some(val) = input.model {
        sets.push("model = ?".to_string());
        params.push(Box::new(val));
    }
    if let Some(val) = input.provider {
        sets.push("provider = ?".to_string());
        params.push(Box::new(val));
    }
    if let Some(val) = input.rating {
        sets.push("rating = ?".to_string());
        params.push(Box::new(val));
    }
    if let Some(val) = input.success {
        sets.push("success = ?".to_string());
        params.push(Box::new(val));
    }
    sets.push("updated_at = ?".to_string());
    params.push(Box::new(chrono::Utc::now().to_rfc3339()));
    params.push(Box::new(id.clone()));
    let sql = format!("UPDATE exchanges SET {} WHERE id = ?", sets.join(", "));
    let param_refs: Vec<&dyn rusqlite::types::ToSql> = params.iter().map(|p| p.as_ref()).collect();
    conn.execute(&sql, param_refs.as_slice()).map_err(|e| e.to_string())?;
    drop(conn);
    get_exchange(db, id)
}

#[tauri::command]
pub fn delete_exchange(db: tauri::State<'_, DbPool>, id: String) -> Result<(), String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM exchanges WHERE id = ?", [&id])
        .map_err(|e| e.to_string())?;
    Ok(())
}
