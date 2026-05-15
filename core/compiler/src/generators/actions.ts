// ACTION Code Generator
// Generates typed Rust async commands from ACTION declarations.
// Actions owned by the AI_SERVICE emitter (send_chat) are skipped here.

import type { AgiFile, ActionDecl, EntityDecl, AgiType } from '@agicore/parser';
import { toSnakeCase, toPascalCase } from '../naming.js';

// These are emitted by ai-service.ts — skip here to avoid duplicate Tauri commands.
const AI_SERVICE_OWNED = new Set(['send_chat']);

// These are emitted by router.ts — skip here to avoid duplicate Tauri commands.
const ROUTER_OWNED = new Set(['broadcast_chat', 'council_chat']);

// ─── Action categories ────────────────────────────────────────────────────────

type ActionCategory = 'search' | 'export_md' | 'web_search' | 'stub';

function categorize(action: ActionDecl): ActionCategory {
  const inputNames = new Set(action.input.map((p) => p.name));
  const outType = action.output[0]?.type ?? '';
  if (inputNames.has('query') && inputNames.has('num_results')) return 'web_search';
  if (action.name.endsWith('_md') && [...inputNames].some((n) => n.endsWith('_id'))) return 'export_md';
  if (inputNames.has('query') && outType === 'json') return 'search';
  return 'stub';
}

// ─── Entity helpers ───────────────────────────────────────────────────────────

function toTableName(entityName: string): string {
  // PascalCase entity → snake_case plural table
  return toSnakeCase(entityName) + 's';
}

/** Find an entity whose table name is hinted by the action name part after "search_". */
function findSearchEntity(action: ActionDecl, entities: EntityDecl[]): EntityDecl | undefined {
  const hint = action.name.replace(/^search_/, '').toLowerCase(); // e.g. "chats"
  return entities.find((e) => {
    const table = toTableName(e.name).toLowerCase(); // e.g. "chat_messages"
    return table.startsWith(hint) || hint.startsWith(toSnakeCase(e.name).toLowerCase());
  });
}

/** Find the entity named by the primary _id input field (e.g. session_id → Session). */
function findParentEntity(action: ActionDecl, entities: EntityDecl[]): EntityDecl | undefined {
  const idField = action.input.find((p) => p.name.endsWith('_id'));
  if (!idField) return undefined;
  const baseName = idField.name.replace(/_id$/, ''); // "session"
  return entities.find((e) => toSnakeCase(e.name).toLowerCase() === baseName.toLowerCase());
}

/** Find the first child entity that has a BELONGS_TO the given parent. */
function findChildEntity(parent: EntityDecl, entities: EntityDecl[]): EntityDecl | undefined {
  return entities.find((e) =>
    e.relationships.some((r) => r.type === 'BELONGS_TO' && r.target === parent.name),
  );
}

/** String fields on an entity (excluding id, timestamps, foreign keys). */
function stringFields(entity: EntityDecl): string[] {
  return entity.fields
    .filter((f) => f.type === 'string' && !f.name.endsWith('_id'))
    .map((f) => f.name);
}

// ─── Type helpers ─────────────────────────────────────────────────────────────

function rustParamType(type: AgiType): string {
  switch (type) {
    case 'string':   return 'String';
    case 'number':   return 'i64';
    case 'float':    return 'f64';
    case 'bool':     return 'bool';
    case 'date':     return 'String';
    case 'datetime': return 'String';
    case 'json':     return 'serde_json::Value';
    case 'id':       return 'String';
  }
}

function rustReturnType(action: ActionDecl): string {
  if (action.output.length === 0) return '()';
  const out = action.output[0]!;
  if (/^[A-Z]/.test(out.type)) return 'serde_json::Value';
  switch (out.type) {
    case 'string': return 'String';
    case 'number': return 'i64';
    case 'float':  return 'f64';
    case 'bool':   return 'bool';
    case 'json':   return 'serde_json::Value';
    default:       return 'serde_json::Value';
  }
}

function defaultOkValue(action: ActionDecl): string {
  const ret = rustReturnType(action);
  if (ret === 'serde_json::Value') return 'serde_json::json!([])';
  if (ret === 'String') return 'String::new()';
  if (ret === '()') return '()';
  return '0'.padEnd(0); // numbers — shouldn't reach
}

// ─── Input struct ─────────────────────────────────────────────────────────────

function generateInputStruct(action: ActionDecl): string[] {
  const lines: string[] = [];
  const structName = `${toPascalCase(action.name)}Input`;

  lines.push('#[derive(Debug, Deserialize)]');
  lines.push('#[serde(rename_all = "camelCase")]');
  lines.push(`pub struct ${structName} {`);
  for (const param of action.input) {
    const rustName = toSnakeCase(param.name);
    const base = rustParamType(param.type);
    if (param.defaultValue !== undefined) {
      lines.push(`    #[serde(default)]`);
      lines.push(`    pub ${rustName}: Option<${base}>,`);
    } else {
      lines.push(`    pub ${rustName}: ${base},`);
    }
  }
  lines.push('}');
  return lines;
}

// ─── Command body generators ──────────────────────────────────────────────────

function generateSearchBody(action: ActionDecl, ast: AgiFile): string[] {
  const entity = findSearchEntity(action, ast.entities);
  const table = entity ? toTableName(entity.name) : 'chat_messages';
  const cols = entity ? stringFields(entity) : ['user_message', 'ai_message'];
  // Build LIKE clause: col1 LIKE ?1 OR col2 LIKE ?1 ...
  const likeClause = (cols.length > 0 ? cols : ['content'])
    .map((c) => `${table}.${c} LIKE ?1`)
    .join(' OR ');

  const lines: string[] = [];
  lines.push('    let conn = db.lock().map_err(|e| e.to_string())?;');
  lines.push('    let pattern = format!("%{}%", input.query);');
  lines.push('    let mut stmt = conn.prepare(');
  lines.push(`        "SELECT ${table}.* FROM ${table} WHERE (${likeClause}) ORDER BY ${table}.created_at DESC LIMIT 100"`);
  lines.push('    ).map_err(|e| e.to_string())?;');
  lines.push('    let rows: Vec<serde_json::Value> = stmt');
  lines.push('        .query_map([&pattern], |row| {');
  lines.push('            let mut map = serde_json::Map::new();');
  // Pull id and created_at at minimum; the rest come via column_names iteration
  lines.push('            for (i, col) in row.as_ref().column_names().iter().enumerate() {');
  lines.push('                let val: serde_json::Value = row.get_ref(i).ok()');
  lines.push('                    .and_then(|v| match v {');
  lines.push('                        rusqlite::types::ValueRef::Null => Some(serde_json::Value::Null),');
  lines.push('                        rusqlite::types::ValueRef::Integer(n) => Some(serde_json::json!(n)),');
  lines.push('                        rusqlite::types::ValueRef::Real(f) => Some(serde_json::json!(f)),');
  lines.push('                        rusqlite::types::ValueRef::Text(s) => std::str::from_utf8(s).ok().map(|s| serde_json::json!(s)),');
  lines.push('                        rusqlite::types::ValueRef::Blob(_) => Some(serde_json::Value::Null),');
  lines.push('                    })');
  lines.push('                    .unwrap_or(serde_json::Value::Null);');
  // Convert snake_case column name to camelCase key
  lines.push('                let key = col.split(\'_\').enumerate().map(|(i, part)| {');
  lines.push('                    if i == 0 { part.to_string() }');
  lines.push('                    else { let mut s = part.to_string(); s.get_mut(0..1).map(|c| c.make_ascii_uppercase()); s }');
  lines.push('                }).collect::<String>();');
  lines.push('                map.insert(key, val);');
  lines.push('            }');
  lines.push('            Ok(serde_json::Value::Object(map))');
  lines.push('        })');
  lines.push('        .map_err(|e| e.to_string())?');
  lines.push('        .filter_map(|r| r.ok())');
  lines.push('        .collect();');
  lines.push('    Ok(serde_json::json!(rows))');
  return lines;
}

function generateExportMdBody(action: ActionDecl, ast: AgiFile): string[] {
  const parent = findParentEntity(action, ast.entities);
  const child = parent ? findChildEntity(parent, ast.entities) : undefined;
  const idField = toSnakeCase(action.input.find((p) => p.name.endsWith('_id'))?.name ?? 'entity_id');
  const parentTable = parent ? toTableName(parent.name) : 'sessions';
  const childTable = child ? toTableName(child.name) : 'chat_messages';
  const parentNameField = parent?.fields.find((f) => f.name === 'name' || f.name === 'title')?.name ?? 'name';

  const lines: string[] = [];
  lines.push('    let conn = db.lock().map_err(|e| e.to_string())?;');
  lines.push(`    let parent_name: String = conn`);
  lines.push(`        .query_row("SELECT ${parentNameField} FROM ${parentTable} WHERE id = ?1", [&input.${idField}], |r| r.get(0))`);
  lines.push(`        .unwrap_or_else(|_| "${parent?.name ?? 'Record'}".to_string());`);
  lines.push(`    let mut stmt = conn.prepare(`);
  lines.push(`        "SELECT * FROM ${childTable} WHERE ${idField} = ?1 ORDER BY created_at ASC"`);
  lines.push(`    ).map_err(|e| e.to_string())?;`);
  lines.push(`    let mut md = format!("# {}\\n\\n", parent_name);`);
  lines.push(`    let rows = stmt.query_map([&input.${idField}], |row| {`);
  lines.push(`        let mut map = std::collections::HashMap::new();`);
  lines.push(`        for (i, col) in row.as_ref().column_names().iter().enumerate() {`);
  lines.push(`            if let Ok(v) = row.get::<_, Option<String>>(i) {`);
  lines.push(`                map.insert(col.to_string(), v.unwrap_or_default());`);
  lines.push(`            }`);
  lines.push(`        }`);
  lines.push(`        Ok(map)`);
  lines.push(`    }).map_err(|e| e.to_string())?;`);
  lines.push(`    for row in rows.filter_map(|r| r.ok()) {`);
  // Find human-readable content fields
  const userCol = child?.fields.find((f) => f.name.includes('user'))?.name ?? 'user_message';
  const aiCol   = child?.fields.find((f) => f.name.includes('ai') || f.name.includes('assistant'))?.name ?? 'ai_message';
  lines.push(`        let created = row.get("created_at").cloned().unwrap_or_default();`);
  lines.push(`        let user_text = row.get("${userCol}").cloned().unwrap_or_default();`);
  lines.push(`        let ai_text = row.get("${aiCol}").cloned().unwrap_or_default();`);
  lines.push(`        md.push_str(&format!("---\\n*{}*\\n\\n**You:** {}\\n\\n**Assistant:** {}\\n\\n", created, user_text, ai_text));`);
  lines.push(`    }`);
  lines.push(`    Ok(md)`);
  return lines;
}

function generateWebSearchBody(_action: ActionDecl): string[] {
  return [
    '    let limit = input.num_results.unwrap_or(5) as usize;',
    '    let client = reqwest::Client::new();',
    '    let resp = client',
    '        .get("https://api.duckduckgo.com/")',
    '        .query(&[',
    '            ("q", input.query.as_str()),',
    '            ("format", "json"),',
    '            ("no_redirect", "1"),',
    '            ("no_html", "1"),',
    '            ("skip_disambig", "1"),',
    '        ])',
    '        .header("User-Agent", "Agicore/1.0")',
    '        .send()',
    '        .await',
    '        .map_err(|e| e.to_string())?;',
    '    let data: serde_json::Value = resp.json().await.map_err(|e| e.to_string())?;',
    '    let mut results: Vec<serde_json::Value> = Vec::new();',
    '    if let Some(text) = data.get("Abstract").and_then(|v| v.as_str()).filter(|s| !s.is_empty()) {',
    '        results.push(serde_json::json!({',
    '            "title":   data.get("Heading").and_then(|v| v.as_str()).unwrap_or(""),',
    '            "snippet": text,',
    '            "url":     data.get("AbstractURL").and_then(|v| v.as_str()).unwrap_or(""),',
    '            "source":  data.get("AbstractSource").and_then(|v| v.as_str()).unwrap_or("DuckDuckGo"),',
    '        }));',
    '    }',
    '    if let Some(topics) = data.get("RelatedTopics").and_then(|v| v.as_array()) {',
    '        for topic in topics {',
    '            if results.len() >= limit { break; }',
    '            if let (Some(snippet), Some(url)) = (',
    '                topic.get("Text").and_then(|v| v.as_str()),',
    '                topic.get("FirstURL").and_then(|v| v.as_str()),',
    '            ) {',
    '                results.push(serde_json::json!({',
    '                    "title": topic.get("Result").and_then(|v| v.as_str()).unwrap_or(""),',
    '                    "snippet": snippet,',
    '                    "url": url,',
    '                    "source": "DuckDuckGo",',
    '                }));',
    '            }',
    '        }',
    '    }',
    '    Ok(serde_json::json!(results))',
  ];
}

// ─── Command emitter ──────────────────────────────────────────────────────────

function generateCommand(action: ActionDecl, ast: AgiFile): string[] {
  const fnName = toSnakeCase(action.name);
  const inputStruct = `${toPascalCase(action.name)}Input`;
  const returnType = rustReturnType(action);
  const cat = categorize(action);

  const lines: string[] = [];
  lines.push('#[tauri::command]');
  lines.push(`pub async fn ${fnName}(`);
  lines.push(`    input: ${inputStruct},`);
  lines.push(`    db: tauri::State<'_, DbPool>,`);
  lines.push(`) -> Result<${returnType}, String> {`);

  switch (cat) {
    case 'search':
      lines.push(...generateSearchBody(action, ast));
      break;
    case 'export_md':
      lines.push(...generateExportMdBody(action, ast));
      break;
    case 'web_search':
      lines.push(`    let _ = db;`);
      lines.push(...generateWebSearchBody(action));
      break;
    default:
      // Stub — return a sensible empty value so callers don't crash
      lines.push(`    let _ = (input, db);`);
      lines.push(`    Ok(${defaultOkValue(action)})`);
  }

  lines.push('}');
  return lines;
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function generateActions(ast: AgiFile): Map<string, string> {
  const files = new Map<string, string>();

  const actions = ast.actions.filter(
    (a) => !AI_SERVICE_OWNED.has(a.name) && !ROUTER_OWNED.has(a.name),
  );
  if (actions.length === 0) return files;

  const lines: string[] = [
    '// Agicore Generated — DO NOT EDIT BY HAND',
    '// Re-run `agicore generate` to regenerate.',
    '// Action commands generated from ACTION declarations.',
    '',
    '#![allow(unused_imports)]',
    '',
    'use serde::{Deserialize, Serialize};',
    'use crate::db::DbPool;',
    '',
  ];

  for (const action of actions) {
    lines.push(`// --- ${action.name} ---`);
    lines.push('');
    lines.push(...generateInputStruct(action));
    lines.push('');
    lines.push(...generateCommand(action, ast));
    lines.push('');
  }

  files.set('src-tauri/src/commands/actions.rs', lines.join('\n'));
  return files;
}

/**
 * Returns the list of action command identifiers for registration in main.rs.
 * Only actions emitted by this generator (not AI_SERVICE_OWNED or ROUTER_OWNED).
 */
export function actionCommandNames(ast: AgiFile): string[] {
  return ast.actions
    .filter((a) => !AI_SERVICE_OWNED.has(a.name) && !ROUTER_OWNED.has(a.name))
    .map((a) => `commands::actions::${toSnakeCase(a.name)}`);
}
