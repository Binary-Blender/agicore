use rusqlite::Connection;
use std::path::PathBuf;
use std::sync::Mutex;

pub type DbPool = Mutex<Connection>;
pub type DbPath = Mutex<PathBuf>;

pub fn init_db(db_path: PathBuf) -> DbPool {
    let conn = Connection::open(&db_path).expect("Failed to open database");
    conn.execute_batch("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;")
        .expect("Failed to set pragmas");

    // Run migrations
    let migration = include_str!("../migrations/001_initial.sql");
    conn.execute_batch(migration).expect("Failed to run migrations");

    Mutex::new(conn)
}
