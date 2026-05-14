// Agicore Generated — DO NOT EDIT BY HAND
// Re-run `agicore generate` to regenerate.
// Action commands generated from ACTION declarations.

#![allow(unused_variables, unused_imports)]

use serde::{Deserialize, Serialize};
use crate::db::DbPool;

// --- search_chats ---

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SearchChatsInput {
    pub query: String,
    pub user_id: String,
}

#[tauri::command]
pub async fn search_chats(
    input: SearchChatsInput,
    db: tauri::State<'_, DbPool>,
) -> Result<serde_json::Value, String> {
    let _ = (input, db);
    Err("search_chats: not yet implemented".to_string())
}

// --- web_search ---

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WebSearchInput {
    pub query: String,
    #[serde(default)]
    pub num_results: Option<i64>,
}

#[tauri::command]
pub async fn web_search(
    input: WebSearchInput,
    db: tauri::State<'_, DbPool>,
) -> Result<serde_json::Value, String> {
    let _ = (input, db);
    Err("web_search: not yet implemented".to_string())
}

// --- export_session_md ---

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExportSessionMdInput {
    pub session_id: String,
}

#[tauri::command]
pub async fn export_session_md(
    input: ExportSessionMdInput,
    db: tauri::State<'_, DbPool>,
) -> Result<String, String> {
    let _ = (input, db);
    Err("export_session_md: not yet implemented".to_string())
}
