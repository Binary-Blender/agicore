// TRIGGER runtime — reactive event binding
// Polls channel_messages on a 5-second interval; fires declared targets when
// matching pending messages arrive. Supports debounce and rate limiting.

use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter, State};
use crate::ai_service::ApiKeyStore;
use crate::db::DbPool;
use super::channel::{mark_processed_internal, publish_message_internal};

// ─── Types ────────────────────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TriggerLogEntry {
    pub id: String,
    pub trigger_name: String,
    pub channel_name: String,
    pub message_id: String,
    pub fires_kind: String,
    pub fires_target: String,
    pub status: String,
    pub fired_at: String,
}

impl TriggerLogEntry {
    fn from_row(row: &rusqlite::Row) -> Self {
        Self {
            id: row.get("id").unwrap(),
            trigger_name: row.get("trigger_name").unwrap(),
            channel_name: row.get("channel_name").unwrap(),
            message_id: row.get("message_id").unwrap(),
            fires_kind: row.get("fires_kind").unwrap(),
            fires_target: row.get("fires_target").unwrap(),
            status: row.get("status").unwrap(),
            fired_at: row.get("fired_at").unwrap(),
        }
    }
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TriggerStatus {
    pub name: String,
    pub description: String,
    pub when_channels: Vec<String>,
    pub when_packet: Option<String>,
    pub fires_kind: String,
    pub fires_target: String,
    pub debounce_secs: u64,
    pub last_fired: Option<TriggerLogEntry>,
}

// ─── Static TRIGGER registry ──────────────────────────────────────────────────

struct TriggerDef {
    name: &'static str,
    description: &'static str,
    when_channels: &'static [&'static str],
    when_packet: Option<&'static str>,
    fires_kind: &'static str,
    fires_target: &'static str,
    debounce_secs: u64,
}

const TRIGGERS: &[TriggerDef] = &[
    TriggerDef {
        name: "analyze_on_request",
        description: "Fires the conversation analyzer when a summary is requested via channel",
        when_channels: &["summary_request"],
        when_packet: None,
        fires_kind: "reasoner",
        fires_target: "conversation_analyzer",
        debounce_secs: 300,  // 5-minute debounce — avoids repeat runs while AI is working
    },
    TriggerDef {
        name: "gap_check_on_request",
        description: "Fires the knowledge gap finder when explicitly requested via channel",
        when_channels: &["gap_analysis_request"],
        when_packet: None,
        fires_kind: "reasoner",
        fires_target: "knowledge_gap_finder",
        debounce_secs: 3600, // 1-hour debounce
    },
    TriggerDef {
        name: "summarize_on_request",
        description: "Fires the session summarizer when a session summary is requested",
        when_channels: &["session_summary_request"],
        when_packet: None,
        fires_kind: "reasoner",
        fires_target: "session_summarizer",
        debounce_secs: 60,   // 1-minute debounce
    },
];

// ─── Tauri commands ───────────────────────────────────────────────────────────

#[tauri::command]
pub fn list_trigger_statuses(db: State<'_, DbPool>) -> Result<Vec<TriggerStatus>, String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    let mut result = Vec::new();

    for def in TRIGGERS {
        let last_fired = conn.query_row(
            "SELECT * FROM trigger_log WHERE trigger_name = ? ORDER BY fired_at DESC LIMIT 1",
            [def.name],
            |row| Ok(TriggerLogEntry::from_row(row))
        ).ok();

        result.push(TriggerStatus {
            name: def.name.to_string(),
            description: def.description.to_string(),
            when_channels: def.when_channels.iter().map(|s| s.to_string()).collect(),
            when_packet: def.when_packet.map(|s| s.to_string()),
            fires_kind: def.fires_kind.to_string(),
            fires_target: def.fires_target.to_string(),
            debounce_secs: def.debounce_secs,
            last_fired,
        });
    }

    Ok(result)
}

#[tauri::command]
pub fn list_trigger_log(
    trigger_name: Option<String>,
    limit: Option<i64>,
    db: State<'_, DbPool>,
) -> Result<Vec<TriggerLogEntry>, String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    let lim = limit.unwrap_or(50);

    let rows = if let Some(name) = trigger_name {
        let mut stmt = conn.prepare(
            "SELECT * FROM trigger_log WHERE trigger_name = ? ORDER BY fired_at DESC LIMIT ?"
        ).map_err(|e| e.to_string())?;
        let v = stmt.query_map(rusqlite::params![name, lim], |row| Ok(TriggerLogEntry::from_row(row)))
            .map_err(|e| e.to_string())?
            .collect::<Result<Vec<_>, _>>()
            .map_err(|e| e.to_string())?;
        v
    } else {
        let mut stmt = conn.prepare(
            "SELECT * FROM trigger_log ORDER BY fired_at DESC LIMIT ?"
        ).map_err(|e| e.to_string())?;
        let v = stmt.query_map([lim], |row| Ok(TriggerLogEntry::from_row(row)))
            .map_err(|e| e.to_string())?
            .collect::<Result<Vec<_>, _>>()
            .map_err(|e| e.to_string())?;
        v
    };

    Ok(rows)
}

// ─── Debounce check ───────────────────────────────────────────────────────────

fn is_debounced(db: &DbPool, trigger_name: &str, debounce_secs: u64) -> bool {
    if debounce_secs == 0 { return false; }
    let conn = match db.lock() { Ok(c) => c, Err(_) => return false };
    conn.query_row(
        "SELECT fired_at FROM trigger_log WHERE trigger_name = ? AND status = 'fired' ORDER BY fired_at DESC LIMIT 1",
        [trigger_name],
        |row| row.get::<_, String>(0)
    ).map(|last| {
        if let Ok(t) = chrono::DateTime::parse_from_rfc3339(&last) {
            let elapsed = chrono::Utc::now().signed_duration_since(t.with_timezone(&chrono::Utc));
            elapsed.num_seconds() < debounce_secs as i64
        } else {
            false
        }
    }).unwrap_or(false)
}

fn log_trigger_fire(
    db: &DbPool,
    trigger_name: &str,
    channel_name: &str,
    message_id: &str,
    fires_kind: &str,
    fires_target: &str,
    status: &str,
) {
    let conn = match db.lock() { Ok(c) => c, Err(_) => return };
    let id = uuid::Uuid::new_v4().to_string();
    let now = chrono::Utc::now().to_rfc3339();
    let _ = conn.execute(
        "INSERT INTO trigger_log (id, trigger_name, channel_name, message_id, fires_kind, fires_target, status, fired_at, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
        rusqlite::params![id, trigger_name, channel_name, message_id, fires_kind, fires_target, status, now, now],
    );
}

// ─── Dispatcher ───────────────────────────────────────────────────────────────

async fn check_and_fire(
    app: &AppHandle,
    db: &DbPool,
    keys: &std::sync::Arc<ApiKeyStore>,
    default_model: &str,
) {
    for trigger in TRIGGERS {
        for channel_name in trigger.when_channels {
            // Fetch oldest pending message on this channel (matching packet type if set)
            let message = {
                let conn = match db.lock() { Ok(c) => c, Err(_) => continue };
                let row = if let Some(pkt) = trigger.when_packet {
                    conn.query_row(
                        "SELECT id, payload FROM channel_messages WHERE channel_name = ? AND packet_type = ? AND status = 'pending' ORDER BY published_at ASC LIMIT 1",
                        rusqlite::params![channel_name, pkt],
                        |row| Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?))
                    ).ok()
                } else {
                    conn.query_row(
                        "SELECT id, payload FROM channel_messages WHERE channel_name = ? AND status = 'pending' ORDER BY published_at ASC LIMIT 1",
                        [channel_name],
                        |row| Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?))
                    ).ok()
                };
                row
            };

            let (msg_id, _payload) = match message {
                Some(m) => m,
                None => continue,
            };

            // Check debounce before firing
            if is_debounced(db, trigger.name, trigger.debounce_secs) {
                log_trigger_fire(db, trigger.name, channel_name, &msg_id, trigger.fires_kind, trigger.fires_target, "debounced");
                let _ = mark_processed_internal(db, &msg_id);
                continue;
            }

            // Mark message processed before firing (prevents double-fire)
            let _ = mark_processed_internal(db, &msg_id);

            eprintln!("[Trigger] {} → fires {} {}", trigger.name, trigger.fires_kind, trigger.fires_target);
            log_trigger_fire(db, trigger.name, channel_name, &msg_id, trigger.fires_kind, trigger.fires_target, "fired");

            let _ = app.emit("trigger-fired", serde_json::json!({
                "triggerName": trigger.name,
                "firesKind": trigger.fires_kind,
                "firesTarget": trigger.fires_target,
                "channelName": channel_name,
                "messageId": msg_id,
            }));

            // Fire the target
            match trigger.fires_kind {
                "reasoner" => {
                    let keys_snap: std::collections::HashMap<String, String> = {
                        match keys.lock() { Ok(k) => k.clone(), Err(_) => continue }
                    };
                    let target = trigger.fires_target;
                    let model = default_model.to_string();
                    let db_clone = db.clone();
                    let app_clone = app.clone();
                    tokio::spawn(async move {
                        use super::reasoner::{start_run, execute_reasoner, finish_run, fail_run, get_run};
                        let run_id = match start_run(&db_clone, target, &model) {
                            Ok(id) => id,
                            Err(e) => { eprintln!("[Trigger→Reasoner] start_run failed: {}", e); return; }
                        };
                        let _ = app_clone.emit("reasoner-started", &run_id);
                        match execute_reasoner(target, &model, &db_clone, &keys_snap).await {
                            Ok((records, output)) => {
                                let _ = finish_run(&db_clone, &run_id, records, &output);
                                if let Ok(run) = get_run(&db_clone, &run_id) {
                                    let _ = app_clone.emit("reasoner-completed", run);
                                }
                                // Publish result to analysis_ready channel
                                let _ = publish_message_internal(
                                    &db_clone,
                                    "analysis_ready",
                                    Some("ReasonerOutput"),
                                    &output[..output.len().min(500)],
                                    Some(86400),
                                );
                                eprintln!("[Trigger→Reasoner] {} completed ({} records)", target, records);
                            }
                            Err(err) => {
                                let _ = fail_run(&db_clone, &run_id, &err);
                                eprintln!("[Trigger→Reasoner] {} failed: {}", target, err);
                            }
                        }
                    });
                }
                _ => {
                    eprintln!("[Trigger] fires_kind '{}' not yet implemented", trigger.fires_kind);
                }
            }
        }
    }
}

pub fn start_trigger_dispatcher(
    app: AppHandle,
    db: DbPool,
    keys: std::sync::Arc<ApiKeyStore>,
    default_model: String,
) {
    tokio::spawn(async move {
        // Brief startup delay so other systems initialize first
        tokio::time::sleep(tokio::time::Duration::from_secs(5)).await;

        let mut interval = tokio::time::interval(tokio::time::Duration::from_secs(5));
        loop {
            interval.tick().await;
            check_and_fire(&app, &db, &keys, &default_model).await;
        }
    });
}
