// Agicore Generated Rust Code
// App: novasyn_chat

use serde::{Deserialize, Serialize};
use crate::db::DbPool;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ChatMessage {
    pub id: String,
    pub user_message: String,
    pub ai_message: String,
    pub user_tokens: i64,
    pub ai_tokens: i64,
    pub total_tokens: i64,
    pub model: String,
    pub provider: String,
    pub selected_folders: String,
    pub selected_tags: String,
    pub is_excluded: bool,
    pub is_pruned: bool,
    pub is_saved: bool,
    pub is_archived: bool,
    pub exchange_id: Option<String>,
    pub system_prompt: Option<String>,
    pub context_history_ids: String,
    pub alternatives: Option<String>,
    pub babyai_request_id: Option<String>,
    pub timestamp: Option<String>,
    pub user_id: String,
    pub session_id: String,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateChatMessageInput {
    pub user_message: String,
    pub ai_message: String,
    pub user_tokens: i64,
    pub ai_tokens: i64,
    pub total_tokens: i64,
    pub model: String,
    pub provider: String,
    pub selected_folders: Option<String>,
    pub selected_tags: Option<String>,
    pub is_excluded: Option<bool>,
    pub is_pruned: Option<bool>,
    pub is_saved: Option<bool>,
    pub is_archived: Option<bool>,
    pub exchange_id: Option<String>,
    pub system_prompt: Option<String>,
    pub context_history_ids: Option<String>,
    pub alternatives: Option<String>,
    pub babyai_request_id: Option<String>,
    pub timestamp: Option<String>,
    pub user_id: String,
    pub session_id: String,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateChatMessageInput {
    pub user_message: Option<String>,
    pub ai_message: Option<String>,
    pub user_tokens: Option<i64>,
    pub ai_tokens: Option<i64>,
    pub total_tokens: Option<i64>,
    pub model: Option<String>,
    pub provider: Option<String>,
    pub selected_folders: Option<String>,
    pub selected_tags: Option<String>,
    pub is_excluded: Option<bool>,
    pub is_pruned: Option<bool>,
    pub is_saved: Option<bool>,
    pub is_archived: Option<bool>,
    pub exchange_id: Option<String>,
    pub system_prompt: Option<String>,
    pub context_history_ids: Option<String>,
    pub alternatives: Option<String>,
    pub babyai_request_id: Option<String>,
    pub timestamp: Option<String>,
}

impl ChatMessage {
    fn from_row(row: &rusqlite::Row) -> Self {
        Self {
            id: row.get("id").unwrap(),
            user_message: row.get("user_message").unwrap(),
            ai_message: row.get("ai_message").unwrap(),
            user_tokens: row.get("user_tokens").unwrap(),
            ai_tokens: row.get("ai_tokens").unwrap(),
            total_tokens: row.get("total_tokens").unwrap(),
            model: row.get("model").unwrap(),
            provider: row.get("provider").unwrap(),
            selected_folders: row.get("selected_folders").unwrap(),
            selected_tags: row.get("selected_tags").unwrap(),
            is_excluded: row.get("is_excluded").unwrap(),
            is_pruned: row.get("is_pruned").unwrap(),
            is_saved: row.get("is_saved").unwrap(),
            is_archived: row.get("is_archived").unwrap(),
            exchange_id: row.get("exchange_id").ok(),
            system_prompt: row.get("system_prompt").ok(),
            context_history_ids: row.get("context_history_ids").unwrap(),
            alternatives: row.get("alternatives").ok(),
            babyai_request_id: row.get("babyai_request_id").ok(),
            timestamp: row.get("timestamp").ok(),
            user_id: row.get("user_id").unwrap(),
            session_id: row.get("session_id").unwrap(),
            created_at: row.get("created_at").unwrap(),
            updated_at: row.get("updated_at").unwrap(),
        }
    }
}

#[tauri::command]
pub fn list_chat_messages(db: tauri::State<'_, DbPool>) -> Result<Vec<ChatMessage>, String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn.prepare("SELECT * FROM chat_messages ORDER BY created_at ASC")
        .map_err(|e| e.to_string())?;
    let rows = stmt.query_map([], |row| Ok(ChatMessage::from_row(row)))
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;
    Ok(rows)
}

#[tauri::command]
pub fn list_chat_messages_by_session(db: tauri::State<'_, DbPool>, session_id: String) -> Result<Vec<ChatMessage>, String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn.prepare("SELECT * FROM chat_messages WHERE session_id = ? ORDER BY created_at ASC")
        .map_err(|e| e.to_string())?;
    let rows = stmt.query_map([&session_id], |row| Ok(ChatMessage::from_row(row)))
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;
    Ok(rows)
}

#[tauri::command]
pub fn create_chat_message(db: tauri::State<'_, DbPool>, input: CreateChatMessageInput) -> Result<ChatMessage, String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    let id = uuid::Uuid::new_v4().to_string();
    let now = chrono::Utc::now().to_rfc3339();
    conn.execute(
        "INSERT INTO chat_messages (id, user_message, ai_message, user_tokens, ai_tokens, total_tokens, model, provider, selected_folders, selected_tags, is_excluded, is_pruned, is_saved, is_archived, exchange_id, system_prompt, context_history_ids, alternatives, babyai_request_id, timestamp, user_id, session_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        rusqlite::params![
            id,
            input.user_message,
            input.ai_message,
            input.user_tokens,
            input.ai_tokens,
            input.total_tokens,
            input.model,
            input.provider,
            input.selected_folders.unwrap_or("[]".to_string()),
            input.selected_tags.unwrap_or("[]".to_string()),
            input.is_excluded.unwrap_or(false),
            input.is_pruned.unwrap_or(false),
            input.is_saved.unwrap_or(false),
            input.is_archived.unwrap_or(false),
            input.exchange_id,
            input.system_prompt,
            input.context_history_ids.unwrap_or("[]".to_string()),
            input.alternatives,
            input.babyai_request_id,
            input.timestamp,
            input.user_id,
            input.session_id,
            &now,
            &now,
        ],
    ).map_err(|e| e.to_string())?;
    drop(conn);
    get_chat_message(db, id)
}

#[tauri::command]
pub fn get_chat_message(db: tauri::State<'_, DbPool>, id: String) -> Result<ChatMessage, String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    conn.query_row("SELECT * FROM chat_messages WHERE id = ?", [&id], |row| {
        Ok(ChatMessage::from_row(row))
    }).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn update_chat_message(db: tauri::State<'_, DbPool>, id: String, input: UpdateChatMessageInput) -> Result<ChatMessage, String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    let mut sets: Vec<String> = Vec::new();
    let mut params: Vec<Box<dyn rusqlite::types::ToSql>> = Vec::new();
    if let Some(val) = input.user_message {
        sets.push("user_message = ?".to_string());
        params.push(Box::new(val));
    }
    if let Some(val) = input.ai_message {
        sets.push("ai_message = ?".to_string());
        params.push(Box::new(val));
    }
    if let Some(val) = input.user_tokens {
        sets.push("user_tokens = ?".to_string());
        params.push(Box::new(val));
    }
    if let Some(val) = input.ai_tokens {
        sets.push("ai_tokens = ?".to_string());
        params.push(Box::new(val));
    }
    if let Some(val) = input.total_tokens {
        sets.push("total_tokens = ?".to_string());
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
    if let Some(val) = input.selected_folders {
        sets.push("selected_folders = ?".to_string());
        params.push(Box::new(val));
    }
    if let Some(val) = input.selected_tags {
        sets.push("selected_tags = ?".to_string());
        params.push(Box::new(val));
    }
    if let Some(val) = input.is_excluded {
        sets.push("is_excluded = ?".to_string());
        params.push(Box::new(val));
    }
    if let Some(val) = input.is_pruned {
        sets.push("is_pruned = ?".to_string());
        params.push(Box::new(val));
    }
    if let Some(val) = input.is_saved {
        sets.push("is_saved = ?".to_string());
        params.push(Box::new(val));
    }
    if let Some(val) = input.is_archived {
        sets.push("is_archived = ?".to_string());
        params.push(Box::new(val));
    }
    if let Some(val) = input.exchange_id {
        sets.push("exchange_id = ?".to_string());
        params.push(Box::new(val));
    }
    if let Some(val) = input.system_prompt {
        sets.push("system_prompt = ?".to_string());
        params.push(Box::new(val));
    }
    if let Some(val) = input.context_history_ids {
        sets.push("context_history_ids = ?".to_string());
        params.push(Box::new(val));
    }
    if let Some(val) = input.alternatives {
        sets.push("alternatives = ?".to_string());
        params.push(Box::new(val));
    }
    if let Some(val) = input.babyai_request_id {
        sets.push("babyai_request_id = ?".to_string());
        params.push(Box::new(val));
    }
    if let Some(val) = input.timestamp {
        sets.push("timestamp = ?".to_string());
        params.push(Box::new(val));
    }
    sets.push("updated_at = ?".to_string());
    params.push(Box::new(chrono::Utc::now().to_rfc3339()));
    params.push(Box::new(id.clone()));
    let sql = format!("UPDATE chat_messages SET {} WHERE id = ?", sets.join(", "));
    let param_refs: Vec<&dyn rusqlite::types::ToSql> = params.iter().map(|p| p.as_ref()).collect();
    conn.execute(&sql, param_refs.as_slice()).map_err(|e| e.to_string())?;
    drop(conn);
    get_chat_message(db, id)
}

#[tauri::command]
pub fn delete_chat_message(db: tauri::State<'_, DbPool>, id: String) -> Result<(), String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM chat_messages WHERE id = ?", [&id])
        .map_err(|e| e.to_string())?;
    Ok(())
}
