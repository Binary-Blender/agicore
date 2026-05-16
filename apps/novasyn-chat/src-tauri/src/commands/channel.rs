// CHANNEL runtime — typed message passing backed by SQLite

use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter, State};
use crate::db::DbPool;

// ─── Types ────────────────────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ChannelMessage {
    pub id: String,
    pub channel_name: String,
    pub packet_type: Option<String>,
    pub payload: String,
    pub status: String,
    pub published_at: String,
    pub processed_at: Option<String>,
    pub expires_at: Option<String>,
    pub created_at: String,
}

impl ChannelMessage {
    pub fn from_row(row: &rusqlite::Row) -> Self {
        Self {
            id: row.get("id").unwrap(),
            channel_name: row.get("channel_name").unwrap(),
            packet_type: row.get("packet_type").ok(),
            payload: row.get("payload").unwrap(),
            status: row.get("status").unwrap(),
            published_at: row.get("published_at").unwrap(),
            processed_at: row.get("processed_at").ok(),
            expires_at: row.get("expires_at").ok(),
            created_at: row.get("created_at").unwrap(),
        }
    }
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ChannelSummary {
    pub name: String,
    pub total_messages: i64,
    pub pending_messages: i64,
    pub last_message_at: Option<String>,
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

/// Publish a message to a channel. Returns the created ChannelMessage.
/// Also emits a `channel-message` Tauri event for real-time UI updates.
pub fn publish_message_internal(
    db: &DbPool,
    channel: &str,
    packet_type: Option<&str>,
    payload: &str,
    ttl_seconds: Option<i64>,
) -> Result<ChannelMessage, String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    let id = uuid::Uuid::new_v4().to_string();
    let now = chrono::Utc::now().to_rfc3339();
    let expires_at = ttl_seconds.map(|ttl| {
        (chrono::Utc::now() + chrono::Duration::seconds(ttl)).to_rfc3339()
    });

    conn.execute(
        "INSERT INTO channel_messages (id, channel_name, packet_type, payload, status, published_at, expires_at, created_at)
         VALUES (?, ?, ?, ?, 'pending', ?, ?, ?)",
        rusqlite::params![id, channel, packet_type, payload, now, expires_at, now],
    ).map_err(|e| e.to_string())?;

    Ok(ChannelMessage {
        id,
        channel_name: channel.to_string(),
        packet_type: packet_type.map(|s| s.to_string()),
        payload: payload.to_string(),
        status: "pending".to_string(),
        published_at: now.clone(),
        processed_at: None,
        expires_at,
        created_at: now,
    })
}

/// Mark a message as processed (called by trigger dispatcher after firing).
pub fn mark_processed_internal(db: &DbPool, id: &str) -> Result<(), String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    let now = chrono::Utc::now().to_rfc3339();
    conn.execute(
        "UPDATE channel_messages SET status = 'processed', processed_at = ? WHERE id = ?",
        rusqlite::params![now, id],
    ).map_err(|e| e.to_string())?;
    Ok(())
}

// ─── Tauri commands ───────────────────────────────────────────────────────────

#[tauri::command]
pub fn publish_channel_message(
    channel: String,
    packet_type: Option<String>,
    payload: String,
    ttl_seconds: Option<i64>,
    app: AppHandle,
    db: State<'_, DbPool>,
) -> Result<ChannelMessage, String> {
    let msg = publish_message_internal(
        &db,
        &channel,
        packet_type.as_deref(),
        &payload,
        ttl_seconds,
    )?;
    let _ = app.emit("channel-message", &msg);
    Ok(msg)
}

#[tauri::command]
pub fn list_channel_messages(
    channel: String,
    limit: Option<i64>,
    status_filter: Option<String>,
    db: State<'_, DbPool>,
) -> Result<Vec<ChannelMessage>, String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    let lim = limit.unwrap_or(50);

    let rows = if let Some(status) = status_filter {
        let mut stmt = conn.prepare(
            "SELECT * FROM channel_messages WHERE channel_name = ? AND status = ? ORDER BY published_at DESC LIMIT ?"
        ).map_err(|e| e.to_string())?;
        let v = stmt.query_map(rusqlite::params![channel, status, lim], |row| {
            Ok(ChannelMessage::from_row(row))
        }).map_err(|e| e.to_string())?
            .collect::<Result<Vec<_>, _>>()
            .map_err(|e| e.to_string())?;
        v
    } else {
        let mut stmt = conn.prepare(
            "SELECT * FROM channel_messages WHERE channel_name = ? ORDER BY published_at DESC LIMIT ?"
        ).map_err(|e| e.to_string())?;
        let v = stmt.query_map(rusqlite::params![channel, lim], |row| {
            Ok(ChannelMessage::from_row(row))
        }).map_err(|e| e.to_string())?
            .collect::<Result<Vec<_>, _>>()
            .map_err(|e| e.to_string())?;
        v
    };

    Ok(rows)
}

#[tauri::command]
pub fn list_all_channels(db: State<'_, DbPool>) -> Result<Vec<ChannelSummary>, String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn.prepare(
        "SELECT channel_name,
                COUNT(*) as total,
                SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
                MAX(published_at) as last_at
         FROM channel_messages
         GROUP BY channel_name
         ORDER BY last_at DESC"
    ).map_err(|e| e.to_string())?;

    let rows = stmt.query_map([], |row| {
        Ok(ChannelSummary {
            name: row.get("channel_name")?,
            total_messages: row.get("total")?,
            pending_messages: row.get("pending")?,
            last_message_at: row.get("last_at").ok(),
        })
    }).map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    Ok(rows)
}

#[tauri::command]
pub fn clear_channel(channel: String, db: State<'_, DbPool>) -> Result<i64, String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    let count = conn.execute(
        "DELETE FROM channel_messages WHERE channel_name = ?",
        [&channel],
    ).map_err(|e| e.to_string())? as i64;
    Ok(count)
}

#[tauri::command]
pub fn mark_message_processed(id: String, db: State<'_, DbPool>) -> Result<(), String> {
    mark_processed_internal(&db, &id)
}
