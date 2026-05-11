// Agicore Generated Rust Code
// App: novasyn_chat

use serde::{Deserialize, Serialize};
use crate::db::DbPool;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Document {
    pub id: String,
    pub title: String,
    pub file_path: String,
    pub language: String,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateDocumentInput {
    pub title: String,
    pub file_path: String,
    pub language: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateDocumentInput {
    pub title: Option<String>,
    pub file_path: Option<String>,
    pub language: Option<String>,
}

impl Document {
    fn from_row(row: &rusqlite::Row) -> Self {
        Self {
            id: row.get("id").unwrap(),
            title: row.get("title").unwrap(),
            file_path: row.get("file_path").unwrap(),
            language: row.get("language").unwrap(),
            created_at: row.get("created_at").unwrap(),
            updated_at: row.get("updated_at").unwrap(),
        }
    }
}

#[tauri::command]
pub fn list_documents(db: tauri::State<'_, DbPool>) -> Result<Vec<Document>, String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn.prepare("SELECT * FROM documents ORDER BY created_at DESC")
        .map_err(|e| e.to_string())?;
    let rows = stmt.query_map([], |row| Ok(Document::from_row(row)))
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;
    Ok(rows)
}

#[tauri::command]
pub fn create_document(db: tauri::State<'_, DbPool>, input: CreateDocumentInput) -> Result<Document, String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    let id = uuid::Uuid::new_v4().to_string();
    let now = chrono::Utc::now().to_rfc3339();
    conn.execute(
        "INSERT INTO documents (id, title, file_path, language, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
        rusqlite::params![
            id,
            input.title,
            input.file_path,
            input.language.unwrap_or("markdown".to_string()),
            &now,
            &now,
        ],
    ).map_err(|e| e.to_string())?;
    drop(conn);
    get_document(db, id)
}

#[tauri::command]
pub fn get_document(db: tauri::State<'_, DbPool>, id: String) -> Result<Document, String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    conn.query_row("SELECT * FROM documents WHERE id = ?", [&id], |row| {
        Ok(Document::from_row(row))
    }).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn update_document(db: tauri::State<'_, DbPool>, id: String, input: UpdateDocumentInput) -> Result<Document, String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    let mut sets: Vec<String> = Vec::new();
    let mut params: Vec<Box<dyn rusqlite::types::ToSql>> = Vec::new();
    if let Some(val) = input.title {
        sets.push("title = ?".to_string());
        params.push(Box::new(val));
    }
    if let Some(val) = input.file_path {
        sets.push("file_path = ?".to_string());
        params.push(Box::new(val));
    }
    if let Some(val) = input.language {
        sets.push("language = ?".to_string());
        params.push(Box::new(val));
    }
    sets.push("updated_at = ?".to_string());
    params.push(Box::new(chrono::Utc::now().to_rfc3339()));
    params.push(Box::new(id.clone()));
    let sql = format!("UPDATE documents SET {} WHERE id = ?", sets.join(", "));
    let param_refs: Vec<&dyn rusqlite::types::ToSql> = params.iter().map(|p| p.as_ref()).collect();
    conn.execute(&sql, param_refs.as_slice()).map_err(|e| e.to_string())?;
    drop(conn);
    get_document(db, id)
}

#[tauri::command]
pub fn delete_document(db: tauri::State<'_, DbPool>, id: String) -> Result<(), String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM documents WHERE id = ?", [&id])
        .map_err(|e| e.to_string())?;
    Ok(())
}
