// Agicore Generated — DO NOT EDIT BY HAND
// Re-run `agicore generate` to regenerate.
// Action commands generated from ACTION declarations.

#![allow(unused_imports)]

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
    let conn = db.lock().map_err(|e| e.to_string())?;
    let pattern = format!("%{}%", input.query);
    let mut stmt = conn.prepare(
        "SELECT cm.id, cm.user_message, cm.ai_message, cm.model, cm.provider, \
         cm.total_tokens, cm.is_saved, cm.created_at, cm.session_id, cm.user_id, \
         s.name AS session_name \
         FROM chat_messages cm \
         LEFT JOIN sessions s ON s.id = cm.session_id \
         WHERE (cm.user_message LIKE ?1 OR cm.ai_message LIKE ?1) \
         ORDER BY cm.created_at DESC \
         LIMIT 100",
    )
    .map_err(|e| e.to_string())?;

    let rows: Vec<serde_json::Value> = stmt
        .query_map([&pattern], |row| {
            Ok(serde_json::json!({
                "id":          row.get::<_, String>("id")?,
                "userMessage": row.get::<_, String>("user_message")?,
                "aiMessage":   row.get::<_, String>("ai_message")?,
                "model":       row.get::<_, String>("model")?,
                "provider":    row.get::<_, String>("provider")?,
                "totalTokens": row.get::<_, i64>("total_tokens")?,
                "isSaved":     row.get::<_, bool>("is_saved")?,
                "createdAt":   row.get::<_, String>("created_at")?,
                "sessionId":   row.get::<_, String>("session_id")?,
                "userId":      row.get::<_, String>("user_id")?,
                "sessionName": row.get::<_, Option<String>>("session_name")?,
            }))
        })
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();

    Ok(serde_json::json!(rows))
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
    _db: tauri::State<'_, DbPool>,
) -> Result<serde_json::Value, String> {
    let limit = input.num_results.unwrap_or(5) as usize;
    let client = reqwest::Client::new();
    let resp = client
        .get("https://api.duckduckgo.com/")
        .query(&[
            ("q", input.query.as_str()),
            ("format", "json"),
            ("no_redirect", "1"),
            ("no_html", "1"),
            ("skip_disambig", "1"),
        ])
        .header("User-Agent", "Agicore/1.0")
        .send()
        .await
        .map_err(|e| e.to_string())?;

    let data: serde_json::Value = resp.json().await.map_err(|e| e.to_string())?;
    let mut results: Vec<serde_json::Value> = Vec::new();

    // Instant answer / abstract
    if let Some(text) = data.get("Abstract").and_then(|v| v.as_str()).filter(|s| !s.is_empty()) {
        results.push(serde_json::json!({
            "title":   data.get("Heading").and_then(|v| v.as_str()).unwrap_or(""),
            "snippet": text,
            "url":     data.get("AbstractURL").and_then(|v| v.as_str()).unwrap_or(""),
            "source":  data.get("AbstractSource").and_then(|v| v.as_str()).unwrap_or("DuckDuckGo"),
        }));
    }

    // Related topics
    if let Some(topics) = data.get("RelatedTopics").and_then(|v| v.as_array()) {
        for topic in topics {
            if results.len() >= limit {
                break;
            }
            if let (Some(snippet), Some(url)) = (
                topic.get("Text").and_then(|v| v.as_str()),
                topic.get("FirstURL").and_then(|v| v.as_str()),
            ) {
                results.push(serde_json::json!({
                    "title":   topic.get("Result").and_then(|v| v.as_str()).unwrap_or(""),
                    "snippet": snippet,
                    "url":     url,
                    "source":  "DuckDuckGo",
                }));
            }
        }
    }

    Ok(serde_json::json!(results))
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
    let conn = db.lock().map_err(|e| e.to_string())?;

    let session_name: String = conn
        .query_row(
            "SELECT name FROM sessions WHERE id = ?1",
            [&input.session_id],
            |r| r.get(0),
        )
        .unwrap_or_else(|_| "Session".to_string());

    let mut stmt = conn
        .prepare(
            "SELECT user_message, ai_message, model, provider, created_at \
             FROM chat_messages \
             WHERE session_id = ?1 \
             ORDER BY created_at ASC",
        )
        .map_err(|e| e.to_string())?;

    let mut md = format!("# {}\n\n", session_name);

    let rows = stmt
        .query_map([&input.session_id], |row| {
            Ok((
                row.get::<_, String>(0)?,
                row.get::<_, String>(1)?,
                row.get::<_, String>(2)?,
                row.get::<_, String>(3)?,
                row.get::<_, String>(4)?,
            ))
        })
        .map_err(|e| e.to_string())?;

    for row in rows.filter_map(|r| r.ok()) {
        let (user_msg, ai_msg, model, provider, created_at) = row;
        md.push_str(&format!(
            "---\n*{created_at} — {provider} / {model}*\n\n**You:** {user_msg}\n\n**Assistant:** {ai_msg}\n\n",
        ));
    }

    Ok(md)
}
