// SEMANTIC MEMORY runtime — cross-session persistent intelligence store
// Namespaced, confidence-weighted, tag-indexed, TTL-aware memory with access tracking.

use serde::{Deserialize, Serialize};
use tauri::State;
use crate::db::DbPool;

// ─── Types ────────────────────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MemoryEntry {
    pub id: String,
    pub namespace: String,
    pub key: String,
    pub value: String,
    pub tags: Vec<String>,
    pub confidence: f64,
    pub source: String,
    pub ttl_hours: i64,
    pub created_at: String,
    pub accessed_at: String,
    pub access_count: i64,
    pub expires_at: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MemoryStats {
    pub namespace: String,
    pub count: i64,
    pub avg_confidence: f64,
    pub newest_at: Option<String>,
    pub oldest_at: Option<String>,
    pub most_accessed_key: Option<String>,
    pub total_access_count: i64,
}

// ─── DB helpers ───────────────────────────────────────────────────────────────

fn tags_to_str(tags: &[String]) -> String {
    tags.join(",")
}

fn str_to_tags(s: &str) -> Vec<String> {
    if s.is_empty() { return vec![]; }
    s.split(',').map(|t| t.trim().to_string()).filter(|t| !t.is_empty()).collect()
}

fn row_to_entry(row: &rusqlite::Row) -> rusqlite::Result<MemoryEntry> {
    let tags_str: String = row.get(4)?;
    Ok(MemoryEntry {
        id: row.get(0)?,
        namespace: row.get(1)?,
        key: row.get(2)?,
        value: row.get(3)?,
        tags: str_to_tags(&tags_str),
        confidence: row.get(5)?,
        source: row.get(6)?,
        ttl_hours: row.get(7)?,
        created_at: row.get(8)?,
        accessed_at: row.get(9)?,
        access_count: row.get(10)?,
        expires_at: row.get(11)?,
    })
}

fn is_expired(entry: &MemoryEntry) -> bool {
    if let Some(ref exp) = entry.expires_at {
        if let Ok(t) = chrono::DateTime::parse_from_rfc3339(exp) {
            return chrono::Utc::now() > t.with_timezone(&chrono::Utc);
        }
    }
    false
}

// ─── Public helpers (called from trigger.rs, reasoner.rs) ────────────────────

pub fn store_insight(db: &DbPool, namespace: &str, key: &str, value: &str, source: &str) {
    let conn = match db.lock() { Ok(c) => c, Err(_) => return };
    let now = chrono::Utc::now().to_rfc3339();
    let id = uuid::Uuid::new_v4().to_string();
    let _ = conn.execute(
        "INSERT INTO semantic_memory (id, namespace, key, value, tags, confidence, source, ttl_hours, created_at, accessed_at, access_count, expires_at)
         VALUES (?, ?, ?, ?, '', 0.8, ?, 0, ?, ?, 0, NULL)
         ON CONFLICT(namespace, key) DO UPDATE SET
           value = excluded.value, source = excluded.source,
           confidence = MIN(1.0, confidence + 0.05),
           accessed_at = excluded.accessed_at",
        rusqlite::params![id, namespace, key, value, source, now, now],
    );
}

// ─── Tauri commands ───────────────────────────────────────────────────────────

#[tauri::command]
pub fn mem_store(
    namespace: String,
    key: String,
    value: String,
    tags: Option<Vec<String>>,
    confidence: Option<f64>,
    source: Option<String>,
    ttl_hours: Option<i64>,
    db: State<'_, DbPool>,
) -> Result<MemoryEntry, String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    let now = chrono::Utc::now().to_rfc3339();
    let id = uuid::Uuid::new_v4().to_string();
    let tags_str = tags_to_str(&tags.unwrap_or_default());
    let conf = confidence.unwrap_or(1.0).clamp(0.0, 1.0);
    let src = source.unwrap_or_else(|| "user".to_string());
    let ttl = ttl_hours.unwrap_or(0);
    let expires_at: Option<String> = if ttl > 0 {
        Some((chrono::Utc::now() + chrono::Duration::hours(ttl)).to_rfc3339())
    } else { None };

    let existing: Option<String> = conn.query_row(
        "SELECT id FROM semantic_memory WHERE namespace = ? AND key = ?",
        rusqlite::params![namespace, key], |row| row.get(0),
    ).ok();

    if let Some(eid) = existing {
        conn.execute(
            "UPDATE semantic_memory SET value = ?, tags = ?, confidence = ?, source = ?, ttl_hours = ?, accessed_at = ?, access_count = access_count + 1, expires_at = ? WHERE id = ?",
            rusqlite::params![value, tags_str, conf, src, ttl, now, expires_at, eid],
        ).map_err(|e| e.to_string())?;
        conn.query_row(
            "SELECT id, namespace, key, value, tags, confidence, source, ttl_hours, created_at, accessed_at, access_count, expires_at FROM semantic_memory WHERE id = ?",
            [eid], |row| row_to_entry(row),
        ).map_err(|e| e.to_string())
    } else {
        conn.execute(
            "INSERT INTO semantic_memory (id, namespace, key, value, tags, confidence, source, ttl_hours, created_at, accessed_at, access_count, expires_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)",
            rusqlite::params![id, namespace, key, value, tags_str, conf, src, ttl, now, now, expires_at],
        ).map_err(|e| e.to_string())?;
        conn.query_row(
            "SELECT id, namespace, key, value, tags, confidence, source, ttl_hours, created_at, accessed_at, access_count, expires_at FROM semantic_memory WHERE id = ?",
            [id], |row| row_to_entry(row),
        ).map_err(|e| e.to_string())
    }
}

#[tauri::command]
pub fn mem_recall(
    key: String,
    namespace: Option<String>,
    db: State<'_, DbPool>,
) -> Result<Option<MemoryEntry>, String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    let now = chrono::Utc::now().to_rfc3339();
    let entry = if let Some(ns) = namespace {
        conn.query_row(
            "SELECT id, namespace, key, value, tags, confidence, source, ttl_hours, created_at, accessed_at, access_count, expires_at FROM semantic_memory WHERE namespace = ? AND key = ?",
            rusqlite::params![ns, key], |row| row_to_entry(row),
        ).ok()
    } else {
        conn.query_row(
            "SELECT id, namespace, key, value, tags, confidence, source, ttl_hours, created_at, accessed_at, access_count, expires_at FROM semantic_memory WHERE key = ? ORDER BY confidence DESC LIMIT 1",
            [&key], |row| row_to_entry(row),
        ).ok()
    };

    if let Some(ref e) = entry {
        if is_expired(e) { return Ok(None); }
        // Bump access
        conn.execute(
            "UPDATE semantic_memory SET accessed_at = ?, access_count = access_count + 1 WHERE id = ?",
            rusqlite::params![now, e.id],
        ).ok();
    }
    Ok(entry)
}

#[tauri::command]
pub fn mem_search(
    query: String,
    namespace: Option<String>,
    tags: Option<Vec<String>>,
    limit: Option<i64>,
    db: State<'_, DbPool>,
) -> Result<Vec<MemoryEntry>, String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    let now = chrono::Utc::now().to_rfc3339();
    let lim = limit.unwrap_or(20);
    let like = format!("%{}%", query);

    let mut entries: Vec<MemoryEntry> = if let Some(ns) = namespace {
        let mut stmt = conn.prepare(
            "SELECT id, namespace, key, value, tags, confidence, source, ttl_hours, created_at, accessed_at, access_count, expires_at FROM semantic_memory WHERE namespace = ? AND (key LIKE ? OR value LIKE ?) AND (expires_at IS NULL OR expires_at > ?) ORDER BY confidence DESC, accessed_at DESC LIMIT ?"
        ).map_err(|e| e.to_string())?;
        let v = stmt.query_map(rusqlite::params![ns, like, like, now, lim], |row| row_to_entry(row))
            .map_err(|e| e.to_string())?.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())?;
        v
    } else {
        let mut stmt = conn.prepare(
            "SELECT id, namespace, key, value, tags, confidence, source, ttl_hours, created_at, accessed_at, access_count, expires_at FROM semantic_memory WHERE (key LIKE ? OR value LIKE ?) AND (expires_at IS NULL OR expires_at > ?) ORDER BY confidence DESC, accessed_at DESC LIMIT ?"
        ).map_err(|e| e.to_string())?;
        let v = stmt.query_map(rusqlite::params![like, like, now, lim], |row| row_to_entry(row))
            .map_err(|e| e.to_string())?.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())?;
        v
    };

    // Post-filter by tags if provided
    if let Some(required_tags) = tags {
        if !required_tags.is_empty() {
            entries.retain(|e| required_tags.iter().any(|t| e.tags.contains(t)));
        }
    }

    Ok(entries)
}

#[tauri::command]
pub fn mem_list(
    namespace: Option<String>,
    limit: Option<i64>,
    db: State<'_, DbPool>,
) -> Result<Vec<MemoryEntry>, String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    let now = chrono::Utc::now().to_rfc3339();
    let lim = limit.unwrap_or(50);
    let rows = if let Some(ns) = namespace {
        let mut stmt = conn.prepare(
            "SELECT id, namespace, key, value, tags, confidence, source, ttl_hours, created_at, accessed_at, access_count, expires_at FROM semantic_memory WHERE namespace = ? AND (expires_at IS NULL OR expires_at > ?) ORDER BY accessed_at DESC LIMIT ?"
        ).map_err(|e| e.to_string())?;
        let v = stmt.query_map(rusqlite::params![ns, now, lim], |row| row_to_entry(row))
            .map_err(|e| e.to_string())?.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())?;
        v
    } else {
        let mut stmt = conn.prepare(
            "SELECT id, namespace, key, value, tags, confidence, source, ttl_hours, created_at, accessed_at, access_count, expires_at FROM semantic_memory WHERE expires_at IS NULL OR expires_at > ? ORDER BY accessed_at DESC LIMIT ?"
        ).map_err(|e| e.to_string())?;
        let v = stmt.query_map(rusqlite::params![now, lim], |row| row_to_entry(row))
            .map_err(|e| e.to_string())?.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())?;
        v
    };
    Ok(rows)
}

#[tauri::command]
pub fn mem_forget(namespace: String, key: String, db: State<'_, DbPool>) -> Result<(), String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "DELETE FROM semantic_memory WHERE namespace = ? AND key = ?",
        rusqlite::params![namespace, key],
    ).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn mem_prune(db: State<'_, DbPool>) -> Result<i64, String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    let now = chrono::Utc::now().to_rfc3339();
    let count: i64 = conn.query_row(
        "SELECT COUNT(*) FROM semantic_memory WHERE expires_at IS NOT NULL AND expires_at <= ?",
        [&now], |row| row.get(0),
    ).unwrap_or(0);
    conn.execute(
        "DELETE FROM semantic_memory WHERE expires_at IS NOT NULL AND expires_at <= ?",
        [&now],
    ).map_err(|e| e.to_string())?;
    eprintln!("[SemanticMemory] Pruned {} expired entries", count);
    Ok(count)
}

#[tauri::command]
pub fn mem_stats(db: State<'_, DbPool>) -> Result<Vec<MemoryStats>, String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    let now = chrono::Utc::now().to_rfc3339();
    let mut ns_stmt = conn.prepare(
        "SELECT DISTINCT namespace FROM semantic_memory WHERE expires_at IS NULL OR expires_at > ? ORDER BY namespace"
    ).map_err(|e| e.to_string())?;
    let namespaces: Vec<String> = ns_stmt.query_map([&now], |row| row.get(0))
        .map_err(|e| e.to_string())?.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())?;

    let mut stats = Vec::new();
    for ns in namespaces {
        let count: i64 = conn.query_row(
            "SELECT COUNT(*) FROM semantic_memory WHERE namespace = ? AND (expires_at IS NULL OR expires_at > ?)",
            rusqlite::params![ns, now], |row| row.get(0),
        ).unwrap_or(0);
        let avg_confidence: f64 = conn.query_row(
            "SELECT AVG(confidence) FROM semantic_memory WHERE namespace = ? AND (expires_at IS NULL OR expires_at > ?)",
            rusqlite::params![ns, now], |row| row.get(0),
        ).unwrap_or(0.0);
        let newest_at: Option<String> = conn.query_row(
            "SELECT MAX(created_at) FROM semantic_memory WHERE namespace = ?",
            [&ns], |row| row.get(0),
        ).ok().flatten();
        let oldest_at: Option<String> = conn.query_row(
            "SELECT MIN(created_at) FROM semantic_memory WHERE namespace = ?",
            [&ns], |row| row.get(0),
        ).ok().flatten();
        let most_accessed_key: Option<String> = conn.query_row(
            "SELECT key FROM semantic_memory WHERE namespace = ? ORDER BY access_count DESC LIMIT 1",
            [&ns], |row| row.get(0),
        ).ok();
        let total_access_count: i64 = conn.query_row(
            "SELECT SUM(access_count) FROM semantic_memory WHERE namespace = ?",
            [&ns], |row| row.get(0),
        ).unwrap_or(0);
        stats.push(MemoryStats { namespace: ns, count, avg_confidence, newest_at, oldest_at, most_accessed_key, total_access_count });
    }
    Ok(stats)
}

#[tauri::command]
pub fn mem_namespaces(db: State<'_, DbPool>) -> Result<Vec<String>, String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    let now = chrono::Utc::now().to_rfc3339();
    let mut stmt = conn.prepare(
        "SELECT DISTINCT namespace FROM semantic_memory WHERE expires_at IS NULL OR expires_at > ? ORDER BY namespace"
    ).map_err(|e| e.to_string())?;
    let v = stmt.query_map([now], |row| row.get::<_, String>(0))
        .map_err(|e| e.to_string())?.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())?;
    Ok(v)
}
