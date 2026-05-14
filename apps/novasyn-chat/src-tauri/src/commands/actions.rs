// Agicore Generated — DO NOT EDIT BY HAND
// Re-run `agicore generate` to regenerate.
// Action commands generated from ACTION declarations.

#![allow(unused_variables)]

use serde::{Deserialize, Serialize};
use crate::db::DbPool;

// --- broadcast_chat ---

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BroadcastChatInput {
    pub user_message: String,
    pub model_ids: serde_json::Value,
    pub system_prompt: String,
    pub context_folder_ids: serde_json::Value,
}

#[tauri::command]
pub async fn broadcast_chat(
    input: BroadcastChatInput,
    db: tauri::State<'_, DbPool>,
) -> Result<serde_json::Value, String> {
    let _ = (input, db);
    Err("broadcast_chat: not yet implemented".to_string())
}

// --- council_chat ---

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CouncilChatInput {
    pub user_message: String,
    pub model_ids: serde_json::Value,
    pub system_prompt: String,
    pub synthesis_model: String,
}

#[tauri::command]
pub async fn council_chat(
    input: CouncilChatInput,
    db: tauri::State<'_, DbPool>,
) -> Result<serde_json::Value, String> {
    let _ = (input, db);
    Err("council_chat: not yet implemented".to_string())
}

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
