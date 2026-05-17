use rusqlite::Connection;
use std::path::PathBuf;
use std::sync::{Arc, Mutex};

// Arc wrapper so DbPool can be cloned into background tasks (scheduler, etc.)
pub type DbPool = Arc<Mutex<Connection>>;
pub type DbPath = Mutex<PathBuf>;

pub fn init_db(db_path: PathBuf) -> DbPool {
    let conn = Connection::open(&db_path).expect("Failed to open database");
    conn.execute_batch("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;")
        .expect("Failed to set pragmas");

    // Run migrations
    let migration = include_str!("../migrations/001_initial.sql");
    conn.execute_batch(migration).expect("Failed to run migrations");
    let migration2 = include_str!("../migrations/002_system_prompt.sql");
    let _ = conn.execute_batch(migration2);
    let migration3 = include_str!("../migrations/003_session_folders.sql");
    let _ = conn.execute_batch(migration3);
    let migration4 = include_str!("../migrations/004_session_archived.sql");
    let _ = conn.execute_batch(migration4);

    Arc::new(Mutex::new(conn))
}
