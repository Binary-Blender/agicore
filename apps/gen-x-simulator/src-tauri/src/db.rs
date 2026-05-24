use rusqlite::Connection;
use std::path::PathBuf;
use std::sync::{Arc, Mutex};

pub type DbPool = Arc<Mutex<Connection>>;

pub fn init_db(db_path: PathBuf) -> DbPool {
    let conn = Connection::open(&db_path).expect("Failed to open database");
    conn.execute_batch("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;")
        .expect("Failed to set pragmas");
    conn.execute_batch(include_str!("../migrations/001_core.sql"))
        .expect("Failed to run core migration");
    Arc::new(Mutex::new(conn))
}
