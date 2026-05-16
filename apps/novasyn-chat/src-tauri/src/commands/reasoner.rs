// REASONER runtime — periodic AI analysis loops
// Reads from input channels (DB tables), calls AI, stores + emits insights.

use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter, State};
use crate::ai_service::{chat_complete, ApiKeyStore};
use crate::db::DbPool;

// ─── Types ────────────────────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ReasonerRun {
    pub id: String,
    pub reasoner_name: String,
    pub status: String,
    pub records_analyzed: i64,
    pub output: Option<String>,
    pub error: Option<String>,
    pub model: Option<String>,
    pub started_at: String,
    pub completed_at: Option<String>,
    pub created_at: String,
}

impl ReasonerRun {
    fn from_row(row: &rusqlite::Row) -> Self {
        Self {
            id: row.get("id").unwrap(),
            reasoner_name: row.get("reasoner_name").unwrap(),
            status: row.get("status").unwrap(),
            records_analyzed: row.get("records_analyzed").unwrap_or(0),
            output: row.get("output").ok(),
            error: row.get("error").ok(),
            model: row.get("model").ok(),
            started_at: row.get("started_at").unwrap(),
            completed_at: row.get("completed_at").ok(),
            created_at: row.get("created_at").unwrap(),
        }
    }
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ReasonerStatus {
    pub name: String,
    pub description: String,
    pub schedule: String,
    pub last_run: Option<ReasonerRun>,
}

// ─── Static REASONER registry ─────────────────────────────────────────────────

struct ReasonerDef {
    name: &'static str,
    description: &'static str,
    schedule: &'static str,
    system_prompt: &'static str,
    window_days: i64,
    input_query: &'static str,
}

const REASONERS: &[ReasonerDef] = &[
    ReasonerDef {
        name: "conversation_analyzer",
        description: "Surfaces patterns in recent conversations: recurring topics, gaps, insights",
        schedule: "daily",
        system_prompt: "You are an AI assistant analyzing conversation history for a knowledge worker. \
Review these recent chat exchanges and identify:\n\
1. **Recurring Topics** — questions or themes that keep coming up\n\
2. **Knowledge Gaps** — questions the AI couldn't answer well or that went unresolved\n\
3. **Key Insights** — important information surfaced in these conversations\n\
4. **Suggested Actions** — documents to create, topics to research, or workflows to build\n\n\
Be concise, specific, and actionable. Format with clear headings and bullet points.",
        window_days: 7,
        input_query: "SELECT user_message, ai_message, model, created_at \
FROM chat_messages \
WHERE created_at > datetime('now', '-{window} days') \
  AND is_excluded = 0 \
  AND is_archived = 0 \
ORDER BY created_at DESC \
LIMIT 200",
    },
    ReasonerDef {
        name: "knowledge_gap_finder",
        description: "Analyzes exchanges and conversations to find what's missing from your knowledge base",
        schedule: "weekly",
        system_prompt: "You are an AI knowledge curator analyzing a user's saved exchanges and recent conversations. \
Your job is to identify gaps and opportunities in their knowledge base.\n\n\
Analyze the provided data and produce:\n\
1. **Well-Covered Topics** — areas with good documentation in saved exchanges\n\
2. **Knowledge Gaps** — topics frequently discussed but not captured in exchanges\n\
3. **Stale Knowledge** — exchanges that may be outdated based on recent conversations\n\
4. **Recommended Captures** — specific exchanges from recent chats worth saving\n\n\
Be specific and actionable. Reference actual conversation content where relevant.",
        window_days: 30,
        input_query: "SELECT 'exchange' as source, prompt as user_message, response as ai_message, created_at \
FROM exchanges WHERE created_at > datetime('now', '-{window} days') \
UNION ALL \
SELECT 'chat' as source, user_message, ai_message, created_at \
FROM chat_messages \
WHERE created_at > datetime('now', '-{window} days') AND is_excluded = 0 \
ORDER BY created_at DESC LIMIT 300",
    },
    ReasonerDef {
        name: "session_summarizer",
        description: "On-demand: summarizes the current session's key decisions, insights, and action items",
        schedule: "on_demand",
        system_prompt: "You are an AI assistant creating a structured summary of a conversation session. \
Extract and organize:\n\
1. **Decisions Made** — concrete decisions or choices that were reached\n\
2. **Key Insights** — important information or realizations surfaced\n\
3. **Action Items** — specific tasks or next steps identified\n\
4. **Open Questions** — unresolved questions that need follow-up\n\
5. **Context for Next Session** — what someone would need to know to continue this work\n\n\
Be thorough but concise. This summary will be used to resume work later.",
        window_days: 1,
        input_query: "SELECT user_message, ai_message, model, created_at \
FROM chat_messages \
WHERE created_at > datetime('now', '-{window} days') \
  AND is_excluded = 0 \
ORDER BY created_at ASC \
LIMIT 100",
    },
];

// ─── Core execution ───────────────────────────────────────────────────────────

pub async fn execute_reasoner(
    name: &str,
    model: &str,
    db: &DbPool,
    keys: &std::collections::HashMap<String, String>,
) -> Result<(i64, String), String> {
    let def = REASONERS.iter().find(|r| r.name == name)
        .ok_or_else(|| format!("Unknown reasoner: {}", name))?;

    // Build the actual SQL query with the window substituted
    let query = def.input_query.replace("{window}", &def.window_days.to_string());

    // Fetch records from the input channel
    let context = {
        let conn = db.lock().map_err(|e| e.to_string())?;
        let mut stmt = conn.prepare(&query).map_err(|e| e.to_string())?;

        let mut rows_text = String::new();
        let mut count = 0i64;

        let rows = stmt.query_map([], |row| {
            Ok((
                row.get::<_, String>(0).unwrap_or_default(), // source or user_message
                row.get::<_, String>(1).unwrap_or_default(), // user_message or ai_message
                row.get::<_, String>(2).unwrap_or_default(), // ai_message or model
                row.get::<_, String>(3).unwrap_or_default(), // created_at
            ))
        }).map_err(|e| e.to_string())?;

        for row in rows {
            let (col0, col1, col2, col3) = row.map_err(|e| e.to_string())?;
            count += 1;
            // Truncate individual messages to avoid token bloat
            let user_truncated = if col1.len() > 500 { format!("{}…", &col1[..500]) } else { col1.clone() };
            let ai_truncated = if col2.len() > 800 { format!("{}…", &col2[..800]) } else { col2.clone() };
            rows_text.push_str(&format!(
                "[{}] {}\nUser: {}\nAI: {}\n\n",
                col3, col0, user_truncated, ai_truncated
            ));
        }

        if count == 0 {
            return Ok((0, "No data found in the analysis window. Add some conversations and try again.".to_string()));
        }

        // Cap total context at ~12K chars to stay within token limits
        let capped = if rows_text.len() > 12_000 {
            format!("{}…\n[Context truncated — showing most recent {} records]", &rows_text[..12_000], count)
        } else {
            rows_text
        };

        (count, capped)
    };

    let (record_count, user_content) = context;
    let output = chat_complete(def.system_prompt, &user_content, model, keys).await?;
    Ok((record_count, output))
}

pub fn start_run(db: &DbPool, name: &str, model: &str) -> Result<String, String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    let id = uuid::Uuid::new_v4().to_string();
    let now = chrono::Utc::now().to_rfc3339();
    conn.execute(
        "INSERT INTO reasoner_runs (id, reasoner_name, status, records_analyzed, model, started_at, created_at, updated_at) VALUES (?, ?, 'running', 0, ?, ?, ?, ?)",
        rusqlite::params![id, name, model, now, now, now],
    ).map_err(|e| e.to_string())?;
    Ok(id)
}

pub fn finish_run(db: &DbPool, id: &str, records: i64, output: &str) -> Result<(), String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    let now = chrono::Utc::now().to_rfc3339();
    conn.execute(
        "UPDATE reasoner_runs SET status = 'completed', records_analyzed = ?, output = ?, completed_at = ?, updated_at = ? WHERE id = ?",
        rusqlite::params![records, output, now, now, id],
    ).map_err(|e| e.to_string())?;
    Ok(())
}

pub fn fail_run(db: &DbPool, id: &str, error: &str) -> Result<(), String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    let now = chrono::Utc::now().to_rfc3339();
    conn.execute(
        "UPDATE reasoner_runs SET status = 'failed', error = ?, completed_at = ?, updated_at = ? WHERE id = ?",
        rusqlite::params![error, now, now, id],
    ).map_err(|e| e.to_string())?;
    Ok(())
}

pub fn get_run(db: &DbPool, id: &str) -> Result<ReasonerRun, String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    conn.query_row(
        "SELECT * FROM reasoner_runs WHERE id = ?", [id],
        |row| Ok(ReasonerRun::from_row(row))
    ).map_err(|e| e.to_string())
}

// ─── Tauri commands ───────────────────────────────────────────────────────────

#[tauri::command]
pub fn list_reasoner_statuses(db: State<'_, DbPool>) -> Result<Vec<ReasonerStatus>, String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    let mut result = Vec::new();

    for def in REASONERS {
        let last_run = conn.query_row(
            "SELECT * FROM reasoner_runs WHERE reasoner_name = ? ORDER BY started_at DESC LIMIT 1",
            [def.name],
            |row| Ok(ReasonerRun::from_row(row))
        ).ok();

        result.push(ReasonerStatus {
            name: def.name.to_string(),
            description: def.description.to_string(),
            schedule: def.schedule.to_string(),
            last_run,
        });
    }

    Ok(result)
}

#[tauri::command]
pub fn list_reasoner_runs(
    name: String,
    db: State<'_, DbPool>,
) -> Result<Vec<ReasonerRun>, String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn.prepare(
        "SELECT * FROM reasoner_runs WHERE reasoner_name = ? ORDER BY started_at DESC LIMIT 20"
    ).map_err(|e| e.to_string())?;
    let rows = stmt.query_map([&name], |row| Ok(ReasonerRun::from_row(row)))
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;
    Ok(rows)
}

#[tauri::command]
pub async fn run_reasoner(
    name: String,
    model: String,
    app: AppHandle,
    db: State<'_, DbPool>,
    keys: State<'_, ApiKeyStore>,
) -> Result<ReasonerRun, String> {
    // Clone what we need before any await points (State isn't Send)
    let keys_snapshot: std::collections::HashMap<String, String> = {
        let k = keys.lock().map_err(|e| e.to_string())?;
        k.clone()
    };

    let run_id = start_run(&db, &name, &model)?;
    let _ = app.emit("reasoner-started", &run_id);

    match execute_reasoner(&name, &model, &db, &keys_snapshot).await {
        Ok((records, output)) => {
            finish_run(&db, &run_id, records, &output)?;
            let run = get_run(&db, &run_id)?;
            let _ = app.emit("reasoner-completed", &run);
            Ok(run)
        }
        Err(err) => {
            fail_run(&db, &run_id, &err)?;
            let run = get_run(&db, &run_id)?;
            let _ = app.emit("reasoner-completed", &run);
            Err(err)
        }
    }
}

// ─── Background scheduler ─────────────────────────────────────────────────────

// Checks whether a scheduled reasoner should auto-run at startup.
// Only fires if: last run was more than {threshold} hours ago (or never ran).
fn should_auto_run(db: &DbPool, name: &str, threshold_hours: i64) -> bool {
    let conn = match db.lock() { Ok(c) => c, Err(_) => return false };
    conn.query_row(
        "SELECT completed_at FROM reasoner_runs WHERE reasoner_name = ? AND status = 'completed' ORDER BY completed_at DESC LIMIT 1",
        [name],
        |row| row.get::<_, String>(0)
    ).map(|last| {
        if let Ok(t) = chrono::DateTime::parse_from_rfc3339(&last) {
            let elapsed = chrono::Utc::now().signed_duration_since(t.with_timezone(&chrono::Utc));
            elapsed.num_hours() >= threshold_hours
        } else {
            true
        }
    }).unwrap_or(true) // Never ran → should run
}

pub fn start_reasoner_scheduler(
    app: AppHandle,
    db: crate::db::DbPool,       // Arc<Mutex<Connection>> — cloned cheaply from managed state
    keys: std::sync::Arc<ApiKeyStore>,
    default_model: String,
) {
    tokio::spawn(async move {
        // Brief startup delay so the UI can initialize first
        tokio::time::sleep(tokio::time::Duration::from_secs(10)).await;

        for def in REASONERS {
            if def.schedule == "on_demand" { continue; }

            let threshold_hours = match def.schedule {
                "hourly"  => 1i64,
                "daily"   => 22,   // 22h allows for slight drift
                "weekly"  => 160,  // ~6.7 days
                _         => continue,
            };

            if should_auto_run(&db, def.name, threshold_hours) {
                let keys_snap: std::collections::HashMap<String, String> = {
                    match keys.lock() {
                        Ok(k) => k.clone(),
                        Err(_) => continue,
                    }
                };

                let run_id = match start_run(&db, def.name, &default_model) {
                    Ok(id) => id,
                    Err(e) => { eprintln!("[Reasoner scheduler] start_run failed: {}", e); continue; }
                };
                let _ = app.emit("reasoner-started", &run_id);

                match execute_reasoner(def.name, &default_model, &db, &keys_snap).await {
                    Ok((records, output)) => {
                        let _ = finish_run(&db, &run_id, records, &output);
                        if let Ok(run) = get_run(&db, &run_id) {
                            let _ = app.emit("reasoner-completed", run);
                        }
                        eprintln!("[Reasoner] {} completed ({} records)", def.name, records);
                    }
                    Err(err) => {
                        let _ = fail_run(&db, &run_id, &err);
                        eprintln!("[Reasoner] {} failed: {}", def.name, err);
                    }
                }
            }
        }
    });
}
