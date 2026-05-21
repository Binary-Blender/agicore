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

type ActionCategory = 'ai' | 'search' | 'export_md' | 'web_search' | 'stub';

function categorize(action: ActionDecl): ActionCategory {
  // AI actions take priority — any action with a prompt template is AI-dispatched.
  if (action.ai !== undefined) return 'ai';
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
  const base = out.type.split(' | ')[0]!.trim(); // strip union suffix
  if (/^[A-Z]/.test(base)) return 'serde_json::Value';
  switch (base) {
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
  if (ret === 'serde_json::Value') return 'serde_json::json!({})';
  if (ret === 'String') return 'String::new()';
  if (ret === '()') return '()';
  if (ret === 'bool') return 'false';
  if (ret === 'i64') return '0';
  if (ret === 'f64') return '0.0';
  return 'todo!()';
}

// ─── AI action helpers ────────────────────────────────────────────────────────

/** Returns the default model id from AI_SERVICE for use in AI actions. */
function getDefaultModel(ast: AgiFile): string {
  const ai = ast.aiService;
  if (!ai) return 'claude-sonnet-4-20250514';
  const defaultProv = ai.defaultProvider ?? ai.providers[0] ?? 'anthropic';
  const entry = ai.models.find((m) => m.provider === defaultProv && m.isDefault);
  return entry?.id ?? 'claude-sonnet-4-20250514';
}

/**
 * Emits a `.replace("{{param}}", ...)` chain for interpolating action inputs
 * into the prompt template. Handles required/optional and all types.
 */
function buildPromptReplace(param: { name: string; type: string; defaultValue?: unknown }): string {
  const rustName = toSnakeCase(param.name);
  const isOptional = param.defaultValue !== undefined;
  // All types stringify the same way; Option wraps require unwrap_or_default().
  if (isOptional) {
    if (param.type === 'string') {
      return `        .replace("{{${param.name}}}", input.${rustName}.as_deref().unwrap_or(""))`;
    }
    return `        .replace("{{${param.name}}}", &input.${rustName}.map(|v| v.to_string()).unwrap_or_default())`;
  }
  if (param.type === 'string') {
    return `        .replace("{{${param.name}}}", &input.${rustName})`;
  }
  return `        .replace("{{${param.name}}}", &input.${rustName}.to_string())`;
}

/**
 * Generates the body of an AI action command. Interpolates the prompt template,
 * acquires API keys, calls `crate::ai_service::call_action`, and parses the
 * response according to the declared output type(s).
 *
 * Key mode is determined by `ast.aiService?.keysEntity`:
 *   - KEYS_FILE mode → lock ApiKeyStore state
 *   - KEYS_ENTITY mode → lock DbPool, call load_api_keys(&conn)
 */
function generateAiActionBody(action: ActionDecl, ast: AgiFile): string[] {
  const prompt = action.ai!;
  const defaultModel = action.model ?? getDefaultModel(ast);
  const keysEntity = ast.aiService?.keysEntity;
  const lines: string[] = [];

  // Build prompt with {{param}} interpolation — chain of .replace() calls
  lines.push(`    let prompt = ${JSON.stringify(prompt)}`);
  for (const param of action.input) {
    lines.push(buildPromptReplace(param));
  }
  lines.push('        ;');
  lines.push('');

  // Acquire keys depending on mode
  if (keysEntity) {
    lines.push('    let keys = {');
    lines.push('        let conn = db.lock().map_err(|e| e.to_string())?;');
    lines.push('        crate::ai_service::load_api_keys(&conn)');
    lines.push('    };');
  } else {
    lines.push('    let keys = {');
    lines.push('        let g = store.lock().map_err(|e| e.to_string())?;');
    lines.push('        g.clone()');
    lines.push('    };');
  }
  lines.push('');

  // Call the AI
  lines.push(`    let text = crate::ai_service::call_action(${JSON.stringify(defaultModel)}, &prompt, &keys).await?;`);

  // Parse response
  const outputs = action.output;
  if (outputs.length === 0) {
    lines.push('    let _ = text;');
    lines.push('    Ok(())');
  } else if (outputs.length === 1 && outputs[0]!.type === 'string') {
    lines.push('    Ok(text)');
  } else {
    // json output or multiple outputs — try to parse as JSON object
    lines.push('    let result: serde_json::Value = serde_json::from_str(&text)');
    lines.push('        .unwrap_or_else(|_| serde_json::json!({"content": text}));');
    lines.push('    Ok(result)');
  }

  return lines;
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

  // AI actions need access to API keys — inject the right state depending on key mode.
  if (cat === 'ai' && !ast.aiService?.keysEntity) {
    lines.push(`    store: tauri::State<'_, crate::ai_service::ApiKeyStore>,`);
  }

  lines.push(`) -> Result<${returnType}, String> {`);

  switch (cat) {
    case 'ai':
      lines.push(...generateAiActionBody(action, ast));
      break;
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

// ─── IMPL action stub generator ──────────────────────────────────────────────

function rustOutputType(typeStr: string): string {
  // Strip union suffixes to get base type for Rust
  const base = typeStr.split(' | ')[0]!.trim();
  const isOptional = typeStr.includes('| null') || typeStr.includes('| undefined');
  const rustBase = (() => {
    switch (base) {
      case 'string':   return 'String';
      case 'number':   return 'i64';
      case 'float':    return 'f64';
      case 'bool':     return 'bool';
      case 'json':     return 'serde_json::Value';
      default:         return 'String';
    }
  })();
  return isOptional ? `Option<${rustBase}>` : rustBase;
}

function generateImplStub(action: ActionDecl): string[] {
  const snakeName = toSnakeCase(action.name);
  const pascalName = toPascalCase(action.name);
  const lines: string[] = [];

  lines.push('// @agicore-protected — fill in your Rust logic; this file won\'t be overwritten');

  // Pattern-specific imports
  if (action.pattern === 'file_handler') {
    lines.push('use tauri_plugin_dialog::DialogExt;');
  } else if (action.pattern === 'shell_open') {
    lines.push('use tauri_plugin_shell::ShellExt;');
  } else if (action.pattern === 'oauth_callback') {
    lines.push('use tauri_plugin_shell::ShellExt;');
    lines.push('use std::net::TcpListener;');
    lines.push('use std::io::{BufRead, BufReader, Write};');
  }

  lines.push('use serde::{Deserialize, Serialize};');
  lines.push('use crate::db::DbPool;');
  lines.push('');

  // Input struct
  lines.push('#[derive(Debug, Deserialize)]');
  lines.push('#[serde(rename_all = "camelCase")]');
  lines.push(`pub struct ${pascalName}Input {`);
  for (const param of action.input) {
    const rustName = toSnakeCase(param.name);
    const base = (() => {
      switch (param.type as string) {
        case 'string':   return 'String';
        case 'number':   return 'i64';
        case 'float':    return 'f64';
        case 'bool':     return 'bool';
        default:         return 'String';
      }
    })();
    if (param.defaultValue !== undefined) {
      lines.push(`    #[serde(default)]`);
      lines.push(`    pub ${rustName}: Option<${base}>,`);
    } else {
      lines.push(`    pub ${rustName}: ${base},`);
    }
  }
  lines.push('}');
  lines.push('');

  // Output struct (only if action has outputs)
  const hasOutput = action.output.length > 0;
  const returnType = hasOutput ? `${pascalName}Output` : '()';

  if (hasOutput) {
    lines.push('#[derive(Debug, Serialize)]');
    lines.push('#[serde(rename_all = "camelCase")]');
    lines.push(`pub struct ${pascalName}Output {`);
    for (const out of action.output) {
      const rustName = toSnakeCase(out.name);
      lines.push(`    pub ${rustName}: ${rustOutputType(out.type)},`);
    }
    lines.push('}');
    lines.push('');
  }

  // Command signature — varies by pattern
  if (action.pattern === 'file_handler') {
    lines.push('#[tauri::command]');
    lines.push(`pub async fn ${snakeName}(`);
    lines.push(`    app: tauri::AppHandle,`);
    lines.push(`    _db: tauri::State<'_, DbPool>,`);
    lines.push(`) -> Result<${returnType}, String> {`);
    lines.push(`    // TODO: implement file picker`);
    lines.push(`    // let file = app.dialog().file().pick_file().await;`);
    if (action.emit) {
      lines.push(`    // Emit progress events like this:`);
      lines.push(`    // app.emit("${action.emit.eventName}", &serde_json::json!({ ${action.emit.fields.map(f => `"${f.name}": ""`).join(', ')} })).ok();`);
    }
    lines.push(`    todo!()`);
    lines.push(`}`);
  } else if (action.pattern === 'shell_open') {
    lines.push('#[tauri::command]');
    lines.push(`pub async fn ${snakeName}(`);
    lines.push(`    app: tauri::AppHandle,`);
    lines.push(`    input: ${pascalName}Input,`);
    lines.push(`) -> Result<${returnType}, String> {`);
    lines.push(`    // TODO: implement shell open`);
    lines.push(`    // app.shell().open(&input.url, None).map_err(|e| e.to_string())?;`);
    if (action.emit) {
      lines.push(`    // Emit progress events like this:`);
      lines.push(`    // app.emit("${action.emit.eventName}", &serde_json::json!({ ${action.emit.fields.map(f => `"${f.name}": ""`).join(', ')} })).ok();`);
    }
    lines.push(`    todo!()`);
    lines.push(`}`);
  } else if (action.pattern === 'oauth_callback') {
    lines.push('#[tauri::command]');
    lines.push(`pub async fn ${snakeName}(`);
    lines.push(`    app: tauri::AppHandle,`);
    if (action.input.length > 0) {
      lines.push(`    input: ${pascalName}Input,`);
    }
    lines.push(`) -> Result<${returnType}, String> {`);
    lines.push(`    // PATTERN oauth_callback — PKCE OAuth 2.0 desktop flow`);
    lines.push(`    // Default callback port: 21337 (override as needed)`);
    lines.push(`    // 1. Build auth URL with PKCE code_verifier + code_challenge (S256)`);
    lines.push(`    //    let (verifier, challenge) = pkce_pair();`);
    lines.push(`    //    let auth_url = format!("{}/oauth/authorize?response_type=code&client_id={}&redirect_uri=http://127.0.0.1:21337&code_challenge={}&code_challenge_method=S256", ...);`);
    lines.push(`    // 2. Open OS browser`);
    lines.push(`    //    app.shell().open(&auth_url, None).map_err(|e| e.to_string())?;`);
    lines.push(`    // 3. Spin up temporary callback server`);
    lines.push(`    //    let listener = TcpListener::bind("127.0.0.1:21337").map_err(|e| e.to_string())?;`);
    lines.push(`    //    let (mut stream, _) = listener.accept().map_err(|e| e.to_string())?;`);
    lines.push(`    // 4. Parse authorization code from GET /?code=XXX`);
    lines.push(`    //    let code = parse_code_from_request(&stream)?;`);
    lines.push(`    //    stream.write_all(b"HTTP/1.1 200 OK\\r\\n\\r\\nAuthorized. You can close this tab.").ok();`);
    lines.push(`    // 5. Exchange code for access token via POST to /oauth/token`);
    lines.push(`    //    let token = exchange_code(code, verifier, ...).await?;`);
    lines.push(`    todo!("implement oauth_callback flow")`);
    lines.push(`}`);
  } else {
    lines.push('#[tauri::command]');
    lines.push(`pub async fn ${snakeName}(`);
    if (action.input.length > 0) {
      lines.push(`    input: ${pascalName}Input,`);
    }
    lines.push(`    _db: tauri::State<'_, DbPool>,`);
    lines.push(`) -> Result<${returnType}, String> {`);
    if (action.emit) {
      lines.push(`    // Emit progress events like this:`);
      lines.push(`    // app_handle.emit("${action.emit.eventName}", &serde_json::json!({ ${action.emit.fields.map(f => `"${f.name}": ""`).join(', ')} })).ok();`);
    }
    lines.push(`    // TODO: implement ${snakeName}`);
    lines.push(`    todo!()`);
    lines.push(`}`);
  }

  return lines;
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function generateActions(ast: AgiFile): Map<string, string> {
  const files = new Map<string, string>();

  const allActions = ast.actions.filter(
    (a) => !AI_SERVICE_OWNED.has(a.name) && !ROUTER_OWNED.has(a.name),
  );

  // Split into impl/stub (protected) and regular (bundled) actions.
  // Stub actions (no built-in pattern, no AI) get their own protected file
  // to avoid being wiped on regen and to support multi-output structs.
  const implActions = allActions.filter(
    (a) => a.impl !== undefined || (categorize(a) === 'stub' && !a.ai),
  );
  const regularActions = allActions.filter(
    (a) => a.impl === undefined && !(categorize(a) === 'stub' && !a.ai),
  );

  // Regular actions — bundle into actions.rs as before
  if (regularActions.length > 0) {
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

    for (const action of regularActions) {
      lines.push(`// --- ${action.name} ---`);
      lines.push('');
      lines.push(...generateInputStruct(action));
      lines.push('');
      lines.push(...generateCommand(action, ast));
      lines.push('');
    }

    files.set('src-tauri/src/commands/actions.rs', lines.join('\n'));
  }

  // IMPL actions — each gets its own protected file
  for (const action of implActions) {
    const snakeName = toSnakeCase(action.name);
    const stubLines = generateImplStub(action);
    files.set(`src-tauri/src/commands/${snakeName}.rs`, stubLines.join('\n') + '\n');
  }

  return files;
}

/**
 * Returns the list of action command identifiers for registration in main.rs.
 * Only regular (non-IMPL, non-stub) actions emitted into the bundled actions.rs.
 */
export function actionCommandNames(ast: AgiFile): string[] {
  return ast.actions
    .filter((a) => !AI_SERVICE_OWNED.has(a.name) && !ROUTER_OWNED.has(a.name)
      && a.impl === undefined && !(categorize(a) === 'stub' && !a.ai))
    .map((a) => `commands::actions::${toSnakeCase(a.name)}`);
}

/**
 * Returns the list of IMPL/stub action command identifiers for registration in main.rs.
 */
export function implActionCommandNames(ast: AgiFile): string[] {
  return ast.actions
    .filter((a) => !AI_SERVICE_OWNED.has(a.name) && !ROUTER_OWNED.has(a.name)
      && (a.impl !== undefined || (categorize(a) === 'stub' && !a.ai)))
    .map((a) => `commands::${toSnakeCase(a.name)}::${toSnakeCase(a.name)}`);
}
