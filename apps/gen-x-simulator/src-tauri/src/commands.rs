//! Tauri commands exposed to the renderer.

use crate::basic::{InterpreterState, OutputEvent, RunResult};
use crate::db::DbPool;
use crate::platforms::{all_platforms, by_name};
use crate::types::{AttemptResult, Lesson, Platform as PlatformDto, Profile, SkillSnapshot};
use chrono::Utc;
use rusqlite::params;
use tauri::State;
use uuid::Uuid;

fn now() -> String {
    Utc::now().format("%Y-%m-%d %H:%M:%S").to_string()
}

#[tauri::command]
pub fn list_platforms(db: State<DbPool>) -> Result<Vec<PlatformDto>, String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare(
            "SELECT id, name, display_name, release_year, cultural_lineage, is_implemented
             FROM platforms ORDER BY release_year ASC",
        )
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map([], |r| {
            Ok(PlatformDto {
                id: r.get(0)?,
                name: r.get(1)?,
                display_name: r.get(2)?,
                release_year: r.get(3)?,
                cultural_lineage: r.get(4)?,
                is_implemented: r.get::<_, i64>(5)? == 1,
            })
        })
        .map_err(|e| e.to_string())?;
    rows.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn boot_platform(name: String) -> Result<String, String> {
    by_name(&name)
        .map(|p| p.boot_screen().to_string())
        .ok_or_else(|| format!("unknown platform `{}`", name))
}

#[tauri::command]
pub fn get_lessons(platform: String) -> Result<Vec<Lesson>, String> {
    by_name(&platform)
        .map(|p| p.lessons())
        .ok_or_else(|| format!("unknown platform `{}`", platform))
}

#[tauri::command]
pub fn ensure_profile(db: State<DbPool>, handle: String) -> Result<Profile, String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    // Try fetching by handle
    if let Ok(p) = conn.query_row(
        "SELECT id, handle, current_platform, total_play_time_seconds, created_at, updated_at
         FROM profiles WHERE handle = ?1",
        params![handle],
        |r| {
            Ok(Profile {
                id: r.get(0)?,
                handle: r.get(1)?,
                current_platform: r.get(2)?,
                total_play_time_seconds: r.get(3)?,
                created_at: r.get(4)?,
                updated_at: r.get(5)?,
            })
        },
    ) {
        return Ok(p);
    }
    let id = Uuid::new_v4().to_string();
    let now_s = now();
    conn.execute(
        "INSERT INTO profiles (id, handle, current_platform, total_play_time_seconds, created_at, updated_at)
         VALUES (?1, ?2, NULL, 0, ?3, ?3)",
        params![id, handle, now_s],
    )
    .map_err(|e| e.to_string())?;
    Ok(Profile {
        id,
        handle,
        current_platform: None,
        total_play_time_seconds: 0,
        created_at: now_s.clone(),
        updated_at: now_s,
    })
}

#[tauri::command]
pub fn choose_platform(
    db: State<DbPool>,
    profile_id: String,
    platform: String,
) -> Result<(), String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "UPDATE profiles SET current_platform = ?1, updated_at = ?2 WHERE id = ?3",
        params![platform, now(), profile_id],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RunOutput {
    pub outcome: String,
    pub output: String,
    pub clear_screen: bool,
    pub error_message: Option<String>,
    pub prompt: Option<String>,
    pub var_name: Option<String>,
    pub interpreter_state: Option<serde_json::Value>,
    pub graded: Option<bool>,
}

fn collect_text(frame: &crate::basic::RunFrame) -> (String, bool) {
    let mut out = String::new();
    let mut cleared = false;
    for e in &frame.events {
        match e {
            OutputEvent::Text(s) => out.push_str(s),
            OutputEvent::Newline => out.push('\n'),
            OutputEvent::ClearScreen => {
                out.clear();
                cleared = true;
            }
            OutputEvent::Poke { .. } => {} // POKE events not rendered in v1 text mode
        }
    }
    (out, cleared)
}

#[tauri::command]
pub fn run_program(
    platform: String,
    source: String,
    lesson_id: Option<String>,
) -> Result<RunOutput, String> {
    let p = by_name(&platform).ok_or_else(|| format!("unknown platform `{}`", platform))?;
    let result = p
        .run_program(&source, InterpreterState::new())
        .map_err(|(line, msg)| format!("?{} IN {}", msg, line))?;
    finalize_run(&p, result, lesson_id)
}

#[tauri::command]
pub fn resume_program(
    platform: String,
    source: String,
    interpreter_state: serde_json::Value,
    var_name: String,
    input: String,
    lesson_id: Option<String>,
) -> Result<RunOutput, String> {
    let p = by_name(&platform).ok_or_else(|| format!("unknown platform `{}`", platform))?;
    let state: InterpreterState =
        serde_json::from_value(interpreter_state).map_err(|e| e.to_string())?;
    let result = p
        .resume(&source, state, &var_name, &input)
        .map_err(|(line, msg)| format!("?{} IN {}", msg, line))?;
    finalize_run(&p, result, lesson_id)
}

fn finalize_run(
    platform: &Box<dyn crate::platforms::Platform>,
    result: RunResult,
    lesson_id: Option<String>,
) -> Result<RunOutput, String> {
    match result {
        RunResult::Halted { frame, .. } => {
            let (output, clear_screen) = collect_text(&frame);
            // Lesson grading: check success_substring against captured output.
            let graded = if let Some(lid) = lesson_id {
                platform.lessons().iter().find(|l| l.id == lid).map(|l| {
                    output.contains(&l.success_substring)
                })
            } else {
                None
            };
            Ok(RunOutput {
                outcome: match graded {
                    Some(true) => "success".into(),
                    Some(false) => "wrong_output".into(),
                    None => "halted".into(),
                },
                output,
                clear_screen,
                error_message: None,
                prompt: None,
                var_name: None,
                interpreter_state: None,
                graded,
            })
        }
        RunResult::Errored { frame, message, .. } => {
            let (output, clear_screen) = collect_text(&frame);
            Ok(RunOutput {
                outcome: "runtime_error".into(),
                output,
                clear_screen,
                error_message: Some(message),
                prompt: None,
                var_name: None,
                interpreter_state: None,
                graded: Some(false),
            })
        }
        RunResult::NeedsInput { state, frame, prompt, var_name } => {
            let (output, clear_screen) = collect_text(&frame);
            Ok(RunOutput {
                outcome: "needs_input".into(),
                output,
                clear_screen,
                error_message: None,
                prompt: Some(prompt),
                var_name: Some(var_name),
                interpreter_state: Some(serde_json::to_value(state).unwrap()),
                graded: None,
            })
        }
    }
}

#[tauri::command]
pub fn record_attempt(
    db: State<DbPool>,
    profile_id: String,
    lesson_id: String,
    typed_program: String,
    outcome: String,
    output: String,
    error_message: Option<String>,
    duration_seconds: i64,
) -> Result<AttemptResult, String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    let id = Uuid::new_v4().to_string();
    conn.execute(
        "INSERT INTO attempts (id, profile_id, lesson_id, typed_program, outcome, output, error_message, duration_seconds)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
        params![id, profile_id, lesson_id, typed_program, outcome, output, error_message, duration_seconds],
    )
    .map_err(|e| e.to_string())?;
    Ok(AttemptResult {
        attempt_id: id,
        outcome,
        output,
        error_message,
        prompt: None,
        var_name: None,
        interpreter_state: None,
    })
}

#[tauri::command]
pub fn get_skill_snapshot(
    db: State<DbPool>,
    profile_id: String,
) -> Result<Vec<SkillSnapshot>, String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    let mut snapshots = Vec::new();
    for p in all_platforms() {
        let row: Option<(i64, i64, i64, i64, i64)> = conn
            .query_row(
                "SELECT lessons_completed, total_attempts, total_syntax_errors,
                        defects_found, current_streak
                 FROM skill_states WHERE profile_id = ?1 AND platform = ?2",
                params![profile_id, p.name()],
                |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?, r.get(3)?, r.get(4)?)),
            )
            .ok();
        let (lc, ta, se, df, cs) = row.unwrap_or((0, 0, 0, 0, 0));
        snapshots.push(SkillSnapshot {
            platform: p.name().into(),
            lessons_completed: lc,
            total_attempts: ta,
            total_syntax_errors: se,
            defects_found: df,
            current_streak: cs,
        });
    }
    Ok(snapshots)
}
