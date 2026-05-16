// FEED codegen — emits Rust Atom runtime and React UI stub

import type { AgiFile, FeedDecl } from '@agicore/parser';

export function generateFeed(ast: AgiFile): Map<string, string> {
  const files = new Map<string, string>();
  if (ast.feeds.length === 0) return files;

  files.set('src-tauri/src/commands/feed.rs', buildFeedRs(ast.feeds));
  files.set('migrations/feed.sql', buildMigrationSql());
  files.set('src/components/FeedView.tsx', buildFeedViewStub(ast.feeds));

  return files;
}

// ─── Rust runtime ─────────────────────────────────────────────────────────────

function buildFeedRs(feeds: FeedDecl[]): string {
  const feedDefs = feeds.map(f => {
    const channel = f.channel ? `Some("${f.channel}")` : 'None';
    return `    FeedDef {
        name: "${f.name}",
        title: "${f.description.replace(/"/g, '\\"')}",
        description: "${f.description.replace(/"/g, '\\"')}",
        identity: "${f.identity}",
        source_channel: ${channel},
        source_packet: "${f.packet}",
        subscribe: "${f.subscribe}",
        syndicate: ${f.syndicate},
        max_items: ${f.maxItems},
    },`;
  }).join('\n');

  return `// FEED runtime — Atom 1.0 syndication from reasoner outputs + channel messages
// @agicore-generated — DO NOT EDIT (regenerate via: agicore compile)

use serde::Serialize;
use tauri::State;
use crate::db::DbPool;
use super::identity::{get_identity_did, sign_content};

// ─── Feed registry ────────────────────────────────────────────────────────────

struct FeedDef {
    name: &'static str,
    title: &'static str,
    description: &'static str,
    identity: &'static str,
    source_channel: Option<&'static str>,
    source_packet: &'static str,
    subscribe: &'static str,
    syndicate: bool,
    max_items: usize,
}

const FEEDS: &[FeedDef] = &[
${feedDefs}
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

    xml.push_str("</feed>\\n");
    xml
}

// ─── Entry collection ─────────────────────────────────────────────────────────

fn collect_entries(db: &DbPool, feed: &FeedDef, author_did: &str) -> Vec<FeedEntry> {
    let conn = match db.lock() { Ok(c) => c, Err(_) => return vec![] };
    let mut entries: Vec<FeedEntry> = Vec::new();

    if let Some(channel) = feed.source_channel {
        let limit = feed.max_items as i64;
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
                let title = format!("{} — {}", packet_label, &published_at.get(..10).unwrap_or(&published_at));
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

    entries.sort_by(|a, b| b.published_at.cmp(&a.published_at));
    entries.truncate(feed.max_items);
    entries
}

// ─── Tauri commands ───────────────────────────────────────────────────────────

#[tauri::command]
pub fn list_feeds(db: State<'_, DbPool>) -> Result<Vec<FeedInfo>, String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    let mut result = Vec::new();
    for feed in FEEDS {
        let count: i64 = conn.query_row(
            "SELECT COUNT(*) FROM channel_messages WHERE channel_name = ? AND status != 'rejected'",
            [feed.source_channel.unwrap_or("")],
            |row| row.get(0)
        ).unwrap_or(0);
        let last_updated: Option<String> = conn.query_row(
            "SELECT MAX(published_at) FROM channel_messages WHERE channel_name = ? AND status != 'rejected'",
            [feed.source_channel.unwrap_or("")],
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
    Ok(build_atom_feed(feed, &author_did, &entries))
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
    if let Some(lim) = limit { entries.truncate(lim); }
    Ok(entries)
}
`;
}

// ─── Migration ────────────────────────────────────────────────────────────────

function buildMigrationSql(): string {
  return `-- FEED: no additional tables required — feeds read from channel_messages + identity_profiles
-- Placeholder for future feed subscription / discovery tables.
`;
}

// ─── React UI stub ────────────────────────────────────────────────────────────

function buildFeedViewStub(feeds: FeedDecl[]): string {
  const names = feeds.map(f => `'${f.name}'`).join(', ');
  return `// @agicore-protected — Feed syndication UI
// Generated by Agicore — customize freely.
import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Rss, RefreshCw, Copy } from 'lucide-react';

// Feeds declared in .agi source: ${names}

export function FeedView() {
  const [feeds, setFeeds] = useState<any[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [entries, setEntries] = useState<any[]>([]);
  const [atom, setAtom] = useState<string>('');
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    setLoading(true);
    try { setFeeds(await invoke('list_feeds')); } catch (e) { console.error(e); }
    setLoading(false);
  };

  const loadFeed = async (name: string) => {
    setSelected(name);
    const [ents, xml] = await Promise.all([
      invoke<any[]>('get_feed_entries', { name }),
      invoke<string>('generate_feed', { name }),
    ]);
    setEntries(ents);
    setAtom(xml);
  };

  useEffect(() => { refresh(); }, []);

  return (
    <div className="flex flex-col h-full p-6">
      <div className="flex items-center gap-3 mb-6">
        <Rss size={20} className="text-orange-400" />
        <h1 className="text-lg font-semibold">Feeds</h1>
        <button onClick={refresh} className="ml-auto p-1.5 hover:bg-gray-700 rounded"><RefreshCw size={16} /></button>
      </div>
      <div className="flex gap-6 flex-1 overflow-hidden">
        <div className="w-56 flex-shrink-0 space-y-2">
          {feeds.map((f: any) => (
            <button key={f.name} onClick={() => loadFeed(f.name)}
              className={\`w-full text-left p-3 rounded-lg border transition-colors \${selected === f.name ? 'border-orange-500 bg-orange-500/10' : 'border-gray-700 hover:bg-gray-800'}\`}>
              <div className="font-medium text-sm">{f.name}</div>
              <div className="text-xs text-gray-400">{f.entryCount} entries</div>
            </button>
          ))}
        </div>
        {selected && (
          <div className="flex-1 overflow-auto space-y-3">
            {entries.map((e: any) => (
              <div key={e.id} className="p-3 border border-gray-700 rounded-lg">
                <div className="font-medium text-sm">{e.title}</div>
                <div className="text-xs text-gray-400 mt-1">{e.content.slice(0, 200)}{e.content.length > 200 ? '…' : ''}</div>
                <div className="text-xs text-gray-600 mt-1 font-mono">{e.source}</div>
              </div>
            ))}
            {atom && (
              <div className="mt-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs text-gray-500">Atom XML</span>
                  <button onClick={() => navigator.clipboard.writeText(atom)} className="p-1 hover:bg-gray-700 rounded"><Copy size={12} /></button>
                </div>
                <pre className="text-xs font-mono text-gray-400 bg-gray-900 p-3 rounded overflow-auto max-h-64">{atom}</pre>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
`;
}
