// Agicore Generated — DO NOT EDIT BY HAND
// Workspace runtime DB switching commands.

use crate::db::{DbPool, DbPath};
use rusqlite::Connection;
use std::path::PathBuf;

#[tauri::command]
pub fn get_db_path(path: tauri::State<'_, DbPath>) -> String {
    path.lock().map(|p| p.display().to_string()).unwrap_or_default()
}

#[tauri::command]
pub fn switch_db(
    pool: tauri::State<'_, DbPool>,
    path_state: tauri::State<'_, DbPath>,
    new_path: String,
) -> Result<(), String> {
    let new_pb = PathBuf::from(&new_path);
    let new_conn = Connection::open(&new_pb).map_err(|e| e.to_string())?;
    new_conn.execute_batch("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;")
        .map_err(|e| e.to_string())?;
    let migration = include_str!("../../migrations/001_initial.sql");
    new_conn.execute_batch(migration).map_err(|e| e.to_string())?;
    let mut conn = pool.lock().map_err(|e| e.to_string())?;
    let mut path = path_state.lock().map_err(|e| e.to_string())?;
    *conn = new_conn;
    *path = new_pb;
    Ok(())
}
