// FEED runtime — Atom 1.0 syndication from reasoner outputs + channel messages

use serde::Serialize;
use tauri::State;
use crate::db::DbPool;
use super::identity::{get_identity_did, sign_content};

// ─── Static FEED registry ─────────────────────────────────────────────────────

struct FeedDef {
    name: &'static str,
    title: &'static str,
    description: &'static str,
    identity: &'static str,
    source_channel: Option<&'static str>,
    source_reasoners: &'static [&'static str],
    subscribe: &'static str,
    syndicate: bool,
    max_items: usize,
}

const FEEDS: &[FeedDef] = &[
    FeedDef {
        name: "insight_feed",
        title: "NovaSyn Insight Feed",
        description: "AI-generated insights from conversation analysis, knowledge gaps, and session summaries",
        identity: "novasyn_user",
        source_channel: Some("analysis_ready"),
        source_reasoners: &["conversation_analyzer", "knowledge_gap_finder", "session_summarizer"],
        subscribe: "open",
        syndicate: true,
        max_items: 100,
    },
];

// ─── Types ────────────────────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FeedInfo {
    pub name: String,
    pub title: String,
    pub description: String,
    pub identity: String,
    pub subscribe: String,
    pub syndicate: bool,
    pub max_items: usize,
    pub entry_count: i64,
    pub last_updated: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FeedEntry {
    pub id: String,
    pub title: String,
    pub content: String,
    pub author_did: String,
    pub signature: String,
    pub published_at: String,
    pub source: String,
}

// ─── Atom XML builder ─────────────────────────────────────────────────────────

fn escape_xml(s: &str) -> String {
    s.replace('&', "&amp;")
     .replace('<', "&lt;")
     .replace('>', "&gt;")
     .replace('"', "&quot;")
     .replace('\'', "&apos;")
}

fn build_atom_feed(feed: &FeedDef, author_did: &str, entries: &[FeedEntry]) -> String {
    let now = chrono::Utc::now().to_rfc3339();
    let last_updated = entries.first().map(|e| e.published_at.as_str()).unwrap_or(&now);
    let feed_id = format!("urn:agicore:feed:{}", feed.name);

    let mut xml = format!(
        r#"<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>{}</title>
  <subtitle>{}</subtitle>
  <id>{}</id>
  <updated>{}</updated>
  <author>
    <name>{}</name>
    <uri>{}</uri>
  </author>
  <link rel="self" href="agicore://feed/{}"/>
  <rights>Creator-owned — {}</rights>
  <generator uri="https://github.com/Binary-Blender/agicore">Agicore</generator>
"#,
        escape_xml(feed.title),
        escape_xml(feed.description),
        feed_id,
        last_updated,
        escape_xml(feed.identity),
        escape_xml(author_did),
        feed.name,
        if feed.syndicate { "Open syndication permitted" } else { "Syndication restricted" },
    );

    for entry in entries {
        let entry_xml = format!(
            r#"  <entry>
    <id>urn:agicore:entry:{}</id>
    <title>{}</title>
    <updated>{}</updated>
    <author>
      <name>{}</name>
      <uri>{}</uri>
    </author>
    <content type="text">{}</content>
    <category term="{}"/>
    <link href="agicore://source/{}"/>
    <agicore:signature xmlns:agicore="urn:agicore:1.0">{}</agicore:signature>
  </entry>
"#,
            escape_xml(&entry.id),
            escape_xml(&entry.title),
            escape_xml(&entry.published_at),
            escape_xml(feed.identity),
            escape_xml(&entry.author_did),
            escape_xml(&entry.content),
            escape_xml(&entry.source),
            escape_xml(&entry.source),
            escape_xml(&entry.signature),
        );
        xml.push_str(&entry_xml);
    }

    xml.push_str("</feed>\n");
    xml
}

// ─── Entry collection ─────────────────────────────────────────────────────────

fn collect_entries(db: &DbPool, feed: &FeedDef, author_did: &str) -> Vec<FeedEntry> {
    let conn = match db.lock() { Ok(c) => c, Err(_) => return vec![] };
    let mut entries: Vec<FeedEntry> = Vec::new();

    // From reasoner_runs (completed, with output)
    for reasoner_name in feed.source_reasoners {
        let mut stmt = match conn.prepare(
            "SELECT id, output, completed_at FROM reasoner_runs WHERE reasoner_name = ? AND status = 'completed' AND output IS NOT NULL ORDER BY completed_at DESC LIMIT ?"
        ) { Ok(s) => s, Err(_) => continue };

        let per_reasoner = feed.max_items / feed.source_reasoners.len().max(1);
        let rows = stmt.query_map(rusqlite::params![reasoner_name, per_reasoner as i64], |row| {
            Ok((
                row.get::<_, String>(0)?,
                row.get::<_, String>(1)?,
                row.get::<_, String>(2)?,
            ))
        });

        if let Ok(rows) = rows {
            for row in rows.flatten() {
                let (id, output, completed_at) = row;
                let title = format!("{} — {}", format_reasoner_name(reasoner_name), format_date(&completed_at));
                let content_preview = if output.len() > 2000 {
                    format!("{}…", &output[..2000])
                } else {
                    output.clone()
                };
                let sig = sign_content(db, feed.identity, &content_preview)
                    .unwrap_or_else(|| "unsigned".to_string());
                entries.push(FeedEntry {
                    id: id.clone(),
                    title,
                    content: content_preview,
                    author_did: author_did.to_string(),
                    signature: sig,
                    published_at: completed_at,
                    source: format!("reasoner:{}", reasoner_name),
                });
            }
        }
    }

    // From source channel (most recent messages)
    if let Some(channel) = feed.source_channel {
        let limit = (feed.max_items as i64).min(20); // cap channel entries
        let mut stmt = match conn.prepare(
            "SELECT id, payload, published_at, packet_type FROM channel_messages WHERE channel_name = ? AND status != 'rejected' ORDER BY published_at DESC LIMIT ?"
        ) { Ok(s) => s, Err(_) => return entries };

        let rows = stmt.query_map(rusqlite::params![channel, limit], |row| {
            Ok((
                row.get::<_, String>(0)?,
                row.get::<_, String>(1)?,
                row.get::<_, String>(2)?,
                row.get::<_, Option<String>>(3)?,
            ))
        });

        if let Ok(rows) = rows {
            for row in rows.flatten() {
                let (id, payload, published_at, packet_type) = row;
                let preview = if payload.len() > 500 { format!("{}…", &payload[..500]) } else { payload.clone() };
                let packet_label = packet_type.as_deref().unwrap_or("ChannelMessage");
                let title = format!("{} — {}", packet_label, format_date(&published_at));
                let sig = sign_content(db, feed.identity, &preview)
                    .unwrap_or_else(|| "unsigned".to_string());
                entries.push(FeedEntry {
                    id,
                    title,
                    content: preview,
                    author_did: author_did.to_string(),
                    signature: sig,
                    published_at,
                    source: format!("channel:{}", channel),
                });
            }
        }
    }

    // Sort by published_at descending, cap at max_items
    entries.sort_by(|a, b| b.published_at.cmp(&a.published_at));
    entries.truncate(feed.max_items);
    entries
}

fn format_reasoner_name(name: &str) -> String {
    name.replace('_', " ")
        .split_whitespace()
        .map(|w| { let mut c = w.chars(); c.next().map(|f| f.to_uppercase().collect::<String>() + c.as_str()).unwrap_or_default() })
        .collect::<Vec<_>>()
        .join(" ")
}

fn format_date(iso: &str) -> String {
    // Take first 10 chars of ISO date (YYYY-MM-DD)
    iso.get(..10).unwrap_or(iso).to_string()
}

// ─── Tauri commands ───────────────────────────────────────────────────────────

#[tauri::command]
pub fn list_feeds(db: State<'_, DbPool>) -> Result<Vec<FeedInfo>, String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    let mut result = Vec::new();
    for feed in FEEDS {
        // Count entries from reasoner_runs
        let count: i64 = conn.query_row(
            "SELECT COUNT(*) FROM reasoner_runs WHERE reasoner_name IN (SELECT DISTINCT reasoner_name FROM reasoner_runs WHERE status = 'completed')",
            [],
            |row| row.get(0)
        ).unwrap_or(0);

        let last_updated: Option<String> = conn.query_row(
            "SELECT MAX(completed_at) FROM reasoner_runs WHERE status = 'completed'",
            [],
            |row| row.get(0)
        ).ok().flatten();

        result.push(FeedInfo {
            name: feed.name.to_string(),
            title: feed.title.to_string(),
            description: feed.description.to_string(),
            identity: feed.identity.to_string(),
            subscribe: feed.subscribe.to_string(),
            syndicate: feed.syndicate,
            max_items: feed.max_items,
            entry_count: count,
            last_updated,
        });
    }
    Ok(result)
}

#[tauri::command]
pub fn generate_feed(name: String, db: State<'_, DbPool>) -> Result<String, String> {
    let feed = FEEDS.iter().find(|f| f.name == name.as_str())
        .ok_or_else(|| format!("Unknown feed: {}", name))?;

    let author_did = get_identity_did(&db, feed.identity)
        .unwrap_or_else(|| format!("did:agicore:{}:unknown", feed.identity));

    let entries = collect_entries(&db, feed, &author_did);
    let atom_xml = build_atom_feed(feed, &author_did, &entries);
    Ok(atom_xml)
}

#[tauri::command]
pub fn get_feed_entries(
    name: String,
    limit: Option<usize>,
    db: State<'_, DbPool>,
) -> Result<Vec<FeedEntry>, String> {
    let feed = FEEDS.iter().find(|f| f.name == name.as_str())
        .ok_or_else(|| format!("Unknown feed: {}", name))?;

    let author_did = get_identity_did(&db, feed.identity)
        .unwrap_or_else(|| format!("did:agicore:{}:unknown", feed.identity));

    let mut entries = collect_entries(&db, feed, &author_did);
    if let Some(lim) = limit {
        entries.truncate(lim);
    }
    Ok(entries)
}
