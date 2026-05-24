//! Tauri commands exposed to the renderer.
//!
//! Generated stub corresponding to the ACTION declarations in reality_ai.agi:
//!   - send_message      → ACTION send_message
//!   - reset_conversation → ACTION reset_conversation
//!   - get_stats         → ACTION get_stats
//!
//! Plus standard CRUD on the Conversation and Message entities.

use crate::db::DbPool;
use crate::dispatch;
use crate::types::{
    AppStats, Conversation, GameState, GameStateInfo, Message, SendMessageResult,
};
use chrono::Utc;
use rusqlite::params;
use tauri::State;
use uuid::Uuid;

const TOTAL_EASTER_EGGS: i64 = 10;

fn now() -> String {
    Utc::now().format("%Y-%m-%d %H:%M:%S").to_string()
}

fn load_game_state(conn: &rusqlite::Connection, conversation_id: &str) -> GameState {
    let row: Option<(String, String, String, String, String)> = conn
        .query_row(
            "SELECT persona_state, scores, scored_markers, completed_modules,
                    COALESCE(active_persona, '')
             FROM game_states WHERE conversation_id = ?1",
            params![conversation_id],
            |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?, r.get(3)?, r.get(4)?)),
        )
        .ok();

    let layer_etc: Option<(i64, i64, i64, i64, String, Option<String>)> = conn
        .query_row(
            "SELECT layer, turn_count, turns_in_current_layer, has_won,
                    easter_eggs_found, win_method
             FROM game_states WHERE conversation_id = ?1",
            params![conversation_id],
            |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?, r.get(3)?, r.get(4)?, r.get(5)?)),
        )
        .ok();

    let mut state = GameState::new();
    if let Some((layer, turn_count, til, has_won, eggs_json, win_method)) = layer_etc {
        state.layer = layer;
        state.turn_count = turn_count;
        state.turns_in_current_layer = til;
        state.has_won = has_won == 1;
        state.easter_eggs_found =
            serde_json::from_str(&eggs_json).unwrap_or_default();
        state.win_method = win_method;
    }
    if let Some((persona_state, scores, scored_markers, completed, active)) = row {
        state.persona_state =
            serde_json::from_str(&persona_state).unwrap_or_default();
        state.scores = serde_json::from_str(&scores).unwrap_or_default();
        state.scored_markers =
            serde_json::from_str(&scored_markers).unwrap_or_default();
        state.completed_modules =
            serde_json::from_str(&completed).unwrap_or_default();
        state.active_persona = if active.is_empty() { None } else { Some(active) };
    }
    state
}

fn save_game_state(
    conn: &rusqlite::Connection,
    conversation_id: &str,
    state: &GameState,
) -> rusqlite::Result<()> {
    let id = format!("gs-{}", conversation_id);
    conn.execute(
        "INSERT INTO game_states
            (id, conversation_id, layer, turn_count, turns_in_current_layer,
             easter_eggs_found, easter_egg_count, active_persona, has_won,
             win_method, persona_state, scores, scored_markers,
             completed_modules, updated_at)
         VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14,?15)
         ON CONFLICT(conversation_id) DO UPDATE SET
             layer = excluded.layer,
             turn_count = excluded.turn_count,
             turns_in_current_layer = excluded.turns_in_current_layer,
             easter_eggs_found = excluded.easter_eggs_found,
             easter_egg_count = excluded.easter_egg_count,
             active_persona = excluded.active_persona,
             has_won = excluded.has_won,
             win_method = excluded.win_method,
             persona_state = excluded.persona_state,
             scores = excluded.scores,
             scored_markers = excluded.scored_markers,
             completed_modules = excluded.completed_modules,
             updated_at = excluded.updated_at",
        params![
            id,
            conversation_id,
            state.layer,
            state.turn_count,
            state.turns_in_current_layer,
            serde_json::to_string(&state.easter_eggs_found).unwrap_or("[]".into()),
            state.easter_eggs_found.len() as i64,
            state.active_persona,
            if state.has_won { 1 } else { 0 },
            state.win_method,
            serde_json::to_string(&state.persona_state).unwrap_or("{}".into()),
            serde_json::to_string(&state.scores).unwrap_or("{}".into()),
            serde_json::to_string(&state.scored_markers).unwrap_or("{}".into()),
            serde_json::to_string(&state.completed_modules).unwrap_or("[]".into()),
            now(),
        ],
    )?;
    Ok(())
}

#[tauri::command]
pub fn list_conversations(db: State<DbPool>) -> Result<Vec<Conversation>, String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare(
            "SELECT id, title, message_count, created_at, updated_at
             FROM conversations ORDER BY updated_at DESC",
        )
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map([], |r| {
            Ok(Conversation {
                id: r.get(0)?,
                title: r.get(1)?,
                message_count: r.get(2)?,
                created_at: r.get(3)?,
                updated_at: r.get(4)?,
            })
        })
        .map_err(|e| e.to_string())?;
    rows.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn create_conversation(db: State<DbPool>) -> Result<Conversation, String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    let id = Uuid::new_v4().to_string();
    let now_str = now();
    conn.execute(
        "INSERT INTO conversations (id, title, message_count, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5)",
        params![id, "New Conversation", 0i64, now_str, now_str],
    )
    .map_err(|e| e.to_string())?;
    // Initialize game state
    save_game_state(&conn, &id, &GameState::new()).map_err(|e| e.to_string())?;
    Ok(Conversation {
        id,
        title: "New Conversation".into(),
        message_count: 0,
        created_at: now_str.clone(),
        updated_at: now_str,
    })
}

#[tauri::command]
pub fn delete_conversation(db: State<DbPool>, id: String) -> Result<(), String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM conversations WHERE id = ?1", params![id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn get_messages(
    db: State<DbPool>,
    conversation_id: String,
) -> Result<Vec<Message>, String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare(
            "SELECT id, conversation_id, role, content, created_at
             FROM messages WHERE conversation_id = ?1 ORDER BY created_at ASC",
        )
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map(params![conversation_id], |r| {
            Ok(Message {
                id: r.get(0)?,
                conversation_id: r.get(1)?,
                role: r.get(2)?,
                content: r.get(3)?,
                created_at: r.get(4)?,
            })
        })
        .map_err(|e| e.to_string())?;
    rows.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn send_message(
    db: State<DbPool>,
    conversation_id: String,
    content: String,
) -> Result<SendMessageResult, String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    let now_str = now();

    // 1. Persist user message
    let user_id = Uuid::new_v4().to_string();
    conn.execute(
        "INSERT INTO messages (id, conversation_id, role, content, created_at)
         VALUES (?1, ?2, 'user', ?3, ?4)",
        params![user_id, conversation_id, content, now_str],
    )
    .map_err(|e| e.to_string())?;

    // 2. Load game state, run dispatch, save game state
    let mut state = load_game_state(&conn, &conversation_id);
    let dispatched = dispatch::dispatch(&mut state, &content);
    save_game_state(&conn, &conversation_id, &state).map_err(|e| e.to_string())?;

    // 3. Persist assistant message
    let asst_id = Uuid::new_v4().to_string();
    let asst_now = now();
    conn.execute(
        "INSERT INTO messages (id, conversation_id, role, content, created_at)
         VALUES (?1, ?2, 'assistant', ?3, ?4)",
        params![asst_id, conversation_id, dispatched.response_text, asst_now],
    )
    .map_err(|e| e.to_string())?;

    // 4. Update conversation message_count + updated_at
    conn.execute(
        "UPDATE conversations
            SET message_count = (SELECT COUNT(*) FROM messages WHERE conversation_id = ?1),
                updated_at = ?2
          WHERE id = ?1",
        params![conversation_id, asst_now],
    )
    .map_err(|e| e.to_string())?;

    // 5. Auto-title from first user message
    let user_count: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM messages WHERE conversation_id = ?1 AND role = 'user'",
            params![conversation_id],
            |r| r.get(0),
        )
        .unwrap_or(0);
    if user_count == 1 {
        let title = if content.len() > 40 {
            format!("{}...", &content.chars().take(40).collect::<String>())
        } else {
            content.clone()
        };
        let _ = conn.execute(
            "UPDATE conversations SET title = ?1 WHERE id = ?2",
            params![title, conversation_id],
        );
    }

    let message = Message {
        id: asst_id,
        conversation_id: conversation_id.clone(),
        role: "assistant".into(),
        content: dispatched.response_text,
        created_at: asst_now,
    };
    let game_state = state.info(TOTAL_EASTER_EGGS);

    Ok(SendMessageResult {
        message,
        thinking_delay: dispatched.thinking_delay_ms,
        game_state,
    })
}

#[tauri::command]
pub fn reset_conversation(
    db: State<DbPool>,
    conversation_id: String,
) -> Result<GameStateInfo, String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "DELETE FROM messages WHERE conversation_id = ?1",
        params![conversation_id],
    )
    .map_err(|e| e.to_string())?;
    let fresh = GameState::new();
    save_game_state(&conn, &conversation_id, &fresh).map_err(|e| e.to_string())?;
    Ok(fresh.info(TOTAL_EASTER_EGGS))
}

#[tauri::command]
pub fn get_stats(db: State<DbPool>) -> Result<AppStats, String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    let count_of = |sql: &str| -> i64 {
        conn.query_row(sql, [], |r| r.get(0)).unwrap_or(0)
    };
    Ok(AppStats {
        total_conversations: count_of("SELECT COUNT(*) FROM conversations"),
        total_messages: count_of("SELECT COUNT(*) FROM messages"),
        total_user_messages: count_of(
            "SELECT COUNT(*) FROM messages WHERE role = 'user'",
        ),
        total_assistant_messages: count_of(
            "SELECT COUNT(*) FROM messages WHERE role = 'assistant'",
        ),
        memories_stored: count_of("SELECT COUNT(*) FROM memories"),
        total_escapes: count_of("SELECT COUNT(*) FROM game_states WHERE has_won = 1"),
    })
}
