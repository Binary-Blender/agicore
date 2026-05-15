// COMPILER Code Generator
// Generates compiler.rs with:
//   - Document file I/O commands (read, write, scan)
//   - One AI-powered command per COMPILER decl targeting the document session
//   - Stub commands for compilers without AI prompts (exchange, folder extraction)
// Activated when ast.compilers.length > 0.

import type { AgiFile, CompilerDecl, EntityDecl } from '@agicore/parser';
import { toSnakeCase, toTableName } from '../naming.js';

// ── AST helpers ───────────────────────────────────────────────────────────────

function findChatMessageEntity(ast: AgiFile): EntityDecl | undefined {
  return ast.entities.find(e =>
    e.fields.some(f => f.name === 'user_message') &&
    e.fields.some(f => f.name === 'ai_message'),
  );
}

function findDocumentEntity(ast: AgiFile): EntityDecl | undefined {
  return ast.entities.find(e =>
    e.fields.some(f => f.name === 'file_path'),
  );
}

function findExchangeEntity(ast: AgiFile): EntityDecl | undefined {
  return ast.entities.find(e =>
    e.fields.some(f => f.name === 'prompt') &&
    e.fields.some(f => f.name === 'response') &&
    !e.fields.some(f => f.name === 'user_message'),
  );
}

function findFolderItemEntity(ast: AgiFile): EntityDecl | undefined {
  return ast.entities.find(e =>
    e.fields.some(f => f.name === 'content') &&
    e.relationships.some(r => r.target === 'Folder'),
  );
}

function isExchangeCompiler(compiler: CompilerDecl): boolean {
  return compiler.extract.includes('prompt') && compiler.extract.includes('response');
}

function isFolderCompiler(compiler: CompilerDecl): boolean {
  return compiler.extract.includes('content') && !compiler.extract.includes('prompt');
}

// ── Document file I/O section ─────────────────────────────────────────────────

function documentFileIo(): string[] {
  return [
    '// ── Document file I/O ────────────────────────────────────────────────────────',
    '',
    '#[derive(Debug, Serialize)]',
    '#[serde(rename_all = "camelCase")]',
    'pub struct ScannedDocument {',
    '    pub path: String,',
    '    pub title: String,',
    '    pub size: u64,',
    '    pub modified_at: String,',
    '}',
    '',
    '#[tauri::command]',
    'pub fn read_document_content(file_path: String) -> Result<String, String> {',
    '    std::fs::read_to_string(&file_path).map_err(|e| e.to_string())',
    '}',
    '',
    '#[tauri::command]',
    'pub fn write_document_content(file_path: String, content: String) -> Result<(), String> {',
    '    if let Some(parent) = std::path::PathBuf::from(&file_path).parent() {',
    '        std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;',
    '    }',
    '    std::fs::write(&file_path, content).map_err(|e| e.to_string())',
    '}',
    '',
    '#[tauri::command]',
    'pub fn scan_documents_dir(dir: String) -> Result<Vec<ScannedDocument>, String> {',
    '    let path = std::path::PathBuf::from(&dir);',
    '    if !path.exists() {',
    '        return Ok(vec![]);',
    '    }',
    '    let mut docs = Vec::new();',
    '    scan_recursive(&path, &mut docs)?;',
    '    Ok(docs)',
    '}',
    '',
    'fn scan_recursive(dir: &std::path::PathBuf, out: &mut Vec<ScannedDocument>) -> Result<(), String> {',
    '    let entries = std::fs::read_dir(dir).map_err(|e| e.to_string())?;',
    '    for entry in entries.flatten() {',
    '        let path = entry.path();',
    '        if path.is_dir() {',
    '            scan_recursive(&path, out)?;',
    '        } else if let Some(ext) = path.extension() {',
    '            if ext == "md" || ext == "txt" || ext == "markdown" {',
    '                let meta = entry.metadata().map_err(|e| e.to_string())?;',
    '                let title = path.file_stem()',
    '                    .unwrap_or_default()',
    '                    .to_string_lossy()',
    '                    .to_string();',
    '                let modified_at = meta.modified().ok()',
    '                    .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())',
    '                    .map(|d| chrono::DateTime::<chrono::Utc>::from(std::time::UNIX_EPOCH + d)',
    '                        .to_rfc3339())',
    '                    .unwrap_or_default();',
    '                out.push(ScannedDocument {',
    '                    path: path.to_string_lossy().to_string(),',
    '                    title,',
    '                    size: meta.len(),',
    '                    modified_at,',
    '                });',
    '            }',
    '        }',
    '    }',
    '    Ok(())',
    '}',
    '',
  ];
}

// ── Shared AI call (mirrors router.rs — keeps compiler.rs self-contained) ─────

function aiCallHelper(): string[] {
  return [
    '// ── AI call (non-streaming) ───────────────────────────────────────────────────',
    '',
    'async fn compiler_call_ai(',
    '    model: &str,',
    '    system: &str,',
    '    user_msg: &str,',
    '    keys: &std::collections::HashMap<String, String>,',
    ') -> Result<String, String> {',
    '    let empty = String::new();',
    '    let client = reqwest::Client::new();',
    '    let messages = vec![serde_json::json!({"role": "user", "content": user_msg})];',
    '',
    '    if model.starts_with("claude-") {',
    '        let key = keys.get("anthropic").unwrap_or(&empty);',
    '        let body = serde_json::json!({',
    '            "model": model, "max_tokens": 8192, "stream": false,',
    '            "system": system, "messages": messages,',
    '        });',
    '        let res = client.post("https://api.anthropic.com/v1/messages")',
    '            .header("x-api-key", key)',
    '            .header("anthropic-version", "2023-06-01")',
    '            .header("Content-Type", "application/json")',
    '            .json(&body).send().await.map_err(|e| e.to_string())?;',
    '        let json: serde_json::Value = res.json().await.map_err(|e| e.to_string())?;',
    '        return json["content"][0]["text"].as_str()',
    '            .map(|s| s.to_string())',
    '            .ok_or_else(|| format!("anthropic: unexpected response: {:?}", json));',
    '    }',
    '',
    '    if model.starts_with("gemini-") {',
    '        let key = keys.get("google").unwrap_or(&empty);',
    '        let contents = vec![serde_json::json!({"role": "user", "parts": [{"text": user_msg}]})];',
    '        let body = serde_json::json!({',
    '            "systemInstruction": {"parts": [{"text": system}]},',
    '            "contents": contents,',
    '            "generationConfig": {"maxOutputTokens": 8192}',
    '        });',
    '        let url = format!(',
    '            "https://generativelanguage.googleapis.com/v1beta/models/{}:generateContent?key={}",',
    '            model, key',
    '        );',
    '        let res = client.post(&url).header("Content-Type", "application/json")',
    '            .json(&body).send().await.map_err(|e| e.to_string())?;',
    '        let json: serde_json::Value = res.json().await.map_err(|e| e.to_string())?;',
    '        return json["candidates"][0]["content"]["parts"][0]["text"].as_str()',
    '            .map(|s| s.to_string())',
    '            .ok_or_else(|| format!("google: unexpected response: {:?}", json));',
    '    }',
    '',
    '    // OpenAI-compatible (openai, xai, huggingface)',
    '    let (url, key) = if model.starts_with("grok-") {',
    '        ("https://api.x.ai/v1/chat/completions", keys.get("xai").unwrap_or(&empty))',
    '    } else {',
    '        ("https://api.openai.com/v1/chat/completions", keys.get("openai").unwrap_or(&empty))',
    '    };',
    '    let mut msgs = vec![serde_json::json!({"role": "system", "content": system})];',
    '    msgs.extend(messages);',
    '    let body = serde_json::json!({"model": model, "stream": false, "messages": msgs});',
    '    let res = client.post(url)',
    '        .header("Authorization", format!("Bearer {}", key))',
    '        .header("Content-Type", "application/json")',
    '        .json(&body).send().await.map_err(|e| e.to_string())?;',
    '    let json: serde_json::Value = res.json().await.map_err(|e| e.to_string())?;',
    '    json["choices"][0]["message"]["content"].as_str()',
    '        .map(|s| s.to_string())',
    '        .ok_or_else(|| format!("openai: unexpected response: {:?}", json))',
    '}',
    '',
  ];
}

// ── AI-powered compile command (TO = document with AI prompt) ─────────────────

function generateAiCompileCommand(
  compiler: CompilerDecl,
  chatTable: string,
  docTable: string,
  hasAiService: boolean,
): string[] {
  const fnName = toSnakeCase(compiler.name);
  const structName = compiler.name
    .split('_')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join('');
  const inputStruct = `Compile${structName}Input`;

  const lines: string[] = [
    `// ── ${compiler.name} ──`,
    `// ${compiler.description}`,
    '',
    '#[derive(Debug, Deserialize)]',
    '#[serde(rename_all = "camelCase")]',
    `pub struct ${inputStruct} {`,
    '    pub message_ids: serde_json::Value,',
    '    pub model: String,',
    '    pub title: String,',
    '    pub output_path: String,',
    '}',
    '',
    '#[tauri::command]',
    `pub async fn ${fnName}(`,
    `    input: ${inputStruct},`,
    `    db: tauri::State<'_, DbPool>,`,
  ];
  if (hasAiService) lines.push(`    store: tauri::State<'_, ApiKeyStore>,`);
  lines.push(
    `) -> Result<serde_json::Value, String> {`,
    '    // Load selected messages from DB',
    '    let ids: Vec<String> = serde_json::from_value(input.message_ids)',
    '        .map_err(|e| e.to_string())?;',
    '    let conversation = {',
    `        let conn = db.lock().map_err(|e| e.to_string())?;`,
    '        ids.iter().map(|id| {',
    '            conn.query_row(',
    `                "SELECT user_message, ai_message FROM ${chatTable} WHERE id = ?",`,
    '                [id],',
    '                |row| Ok(format!(',
    '                    "User: {}\\nAssistant: {}",',
    '                    row.get::<_, String>(0)?,',
    '                    row.get::<_, String>(1)?,',
    '                )),',
    '            ).unwrap_or_default()',
    '        }).collect::<Vec<_>>().join("\\n\\n---\\n\\n")',
    '    };',
    '',
  );

  if (hasAiService) {
    const systemPrompt = (compiler.ai ?? '').replace(/"/g, '\\"');
    lines.push(
      '    // Call AI to compile the conversation',
      '    let keys = {',
      '        let guard = store.lock().map_err(|e| e.to_string())?;',
      '        guard.clone()',
      '    };',
      `    let system = "${systemPrompt}";`,
      `    let user_msg = format!("Conversation to analyze:\\n\\n{}", conversation);`,
      '    let content = compiler_call_ai(&input.model, system, &user_msg, &keys).await?;',
      '',
    );
  } else {
    lines.push(
      '    // No AI_SERVICE — use conversation as-is',
      '    let content = conversation;',
      '',
    );
  }

  lines.push(
    '    // Write file to disk',
    '    if let Some(parent) = std::path::PathBuf::from(&input.output_path).parent() {',
    '        std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;',
    '    }',
    '    std::fs::write(&input.output_path, &content).map_err(|e| e.to_string())?;',
    '',
    '    // Persist Document record in DB',
    '    let doc_id = uuid::Uuid::new_v4().to_string();',
    '    let now = chrono::Utc::now().to_rfc3339();',
    '    {',
    '        let conn = db.lock().map_err(|e| e.to_string())?;',
    '        conn.execute(',
    `            "INSERT INTO ${docTable} (id, title, file_path, language, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",`,
    '            rusqlite::params![doc_id, input.title, input.output_path, "markdown", now, now],',
    '        ).map_err(|e| e.to_string())?;',
    '    }',
    '',
    '    Ok(serde_json::json!({',
    '        "id": doc_id,',
    '        "title": input.title,',
    '        "file_path": input.output_path,',
    '        "content": content,',
    '    }))',
    '}',
    '',
  );

  return lines;
}

// ── Exchange compile command ──────────────────────────────────────────────────

function generateExchangeCompileCommand(
  compiler: CompilerDecl,
  chatTable: string,
  exchangeTable: string,
): string[] {
  const fnName = toSnakeCase(compiler.name);
  const structName = compiler.name
    .split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('');
  const inputStruct = `Compile${structName}Input`;

  return [
    `// ── ${compiler.name} ──`,
    `// ${compiler.description}`,
    '',
    '#[derive(Debug, Deserialize)]',
    '#[serde(rename_all = "camelCase")]',
    `pub struct ${inputStruct} {`,
    '    pub message_ids: serde_json::Value,',
    '    pub user_id: String,',
    '    pub rating: Option<i64>,',
    '}',
    '',
    '#[tauri::command]',
    `pub async fn ${fnName}(`,
    `    input: ${inputStruct},`,
    `    db: tauri::State<'_, DbPool>,`,
    `) -> Result<serde_json::Value, String> {`,
    '    let ids: Vec<String> = serde_json::from_value(input.message_ids).map_err(|e| e.to_string())?;',
    '    let conn = db.lock().map_err(|e| e.to_string())?;',
    '    let mut count = 0i64;',
    '    for id in &ids {',
    '        let row: (String, String, String, String) = conn.query_row(',
    `            "SELECT user_message, ai_message, model, provider FROM ${chatTable} WHERE id = ?",`,
    '            [id.as_str()],',
    '            |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?, r.get(3)?)),',
    '        ).map_err(|e| e.to_string())?;',
    '        let exchange_id = uuid::Uuid::new_v4().to_string();',
    '        let now = chrono::Utc::now().to_rfc3339();',
    '        let rating = input.rating.unwrap_or(0);',
    '        conn.execute(',
    `            "INSERT INTO ${exchangeTable} (id, prompt, response, model, provider, rating, success, user_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",`,
    '            rusqlite::params![exchange_id, row.0, row.1, row.2, row.3, rating, 1i64, input.user_id, now, now],',
    '        ).map_err(|e| e.to_string())?;',
    '        count += 1;',
    '    }',
    '    Ok(serde_json::json!({ "count": count }))',
    '}',
    '',
  ];
}

// ── Folder compile command ────────────────────────────────────────────────────

function generateFolderCompileCommand(
  compiler: CompilerDecl,
  chatTable: string,
  folderItemTable: string,
): string[] {
  const fnName = toSnakeCase(compiler.name);
  const structName = compiler.name
    .split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('');
  const inputStruct = `Compile${structName}Input`;

  return [
    `// ── ${compiler.name} ──`,
    `// ${compiler.description}`,
    '',
    '#[derive(Debug, Deserialize)]',
    '#[serde(rename_all = "camelCase")]',
    `pub struct ${inputStruct} {`,
    '    pub message_ids: serde_json::Value,',
    '    pub folder_id: String,',
    '}',
    '',
    '#[tauri::command]',
    `pub async fn ${fnName}(`,
    `    input: ${inputStruct},`,
    `    db: tauri::State<'_, DbPool>,`,
    `) -> Result<serde_json::Value, String> {`,
    '    let ids: Vec<String> = serde_json::from_value(input.message_ids).map_err(|e| e.to_string())?;',
    '    let conn = db.lock().map_err(|e| e.to_string())?;',
    '    let mut count = 0i64;',
    '    for id in &ids {',
    '        let row: (String, i64) = conn.query_row(',
    `            "SELECT ai_message, ai_tokens FROM ${chatTable} WHERE id = ?",`,
    '            [id.as_str()],',
    '            |r| Ok((r.get(0)?, r.get(1)?)),',
    '        ).map_err(|e| e.to_string())?;',
    '        let item_id = uuid::Uuid::new_v4().to_string();',
    '        let now = chrono::Utc::now().to_rfc3339();',
    '        conn.execute(',
    `            "INSERT INTO ${folderItemTable} (id, content, tokens, item_type, folder_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)",`,
    '            rusqlite::params![item_id, row.0, row.1, "ai-response", input.folder_id, now, now],',
    '        ).map_err(|e| e.to_string())?;',
    '        count += 1;',
    '    }',
    '    Ok(serde_json::json!({ "count": count }))',
    '}',
    '',
  ];
}

// ── Non-AI compile stub (fallback for unrecognized patterns) ──────────────────

function generateStubCompileCommand(compiler: CompilerDecl): string[] {
  const fnName = toSnakeCase(compiler.name);
  const structName = compiler.name
    .split('_')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join('');
  const inputStruct = `Compile${structName}Input`;

  return [
    `// ── ${compiler.name} ──`,
    `// ${compiler.description}`,
    '',
    '#[derive(Debug, Deserialize)]',
    '#[serde(rename_all = "camelCase")]',
    `pub struct ${inputStruct} {`,
    '    pub message_ids: serde_json::Value,',
    '}',
    '',
    '#[tauri::command]',
    `pub async fn ${fnName}(`,
    `    input: ${inputStruct},`,
    `    db: tauri::State<'_, DbPool>,`,
    `) -> Result<serde_json::Value, String> {`,
    `    let _ = (input, db);`,
    `    Err("${fnName}: not yet implemented".to_string())`,
    '}',
    '',
  ];
}

// ── Public API ────────────────────────────────────────────────────────────────

export function generateCompiler(ast: AgiFile): Map<string, string> {
  const files = new Map<string, string>();
  if (ast.compilers.length === 0) return files;

  const hasAiService = ast.aiService !== null && ast.aiService !== undefined;
  const chatEntity = findChatMessageEntity(ast);
  const docEntity = findDocumentEntity(ast);
  const exchangeEntity = findExchangeEntity(ast);
  const folderItemEntity = findFolderItemEntity(ast);
  const chatTable = chatEntity ? toTableName(chatEntity.name) : 'chat_messages';
  const docTable = docEntity ? toTableName(docEntity.name) : 'documents';
  const exchangeTable = exchangeEntity ? toTableName(exchangeEntity.name) : 'exchanges';
  const folderItemTable = folderItemEntity ? toTableName(folderItemEntity.name) : 'folder_items';

  const lines: string[] = [
    '// Agicore Generated — DO NOT EDIT BY HAND',
    '// Re-run `agicore generate` to regenerate.',
    '// Compiler commands: document file I/O + semantic "Send To" transitions.',
    '',
    '#![allow(unused_variables, dead_code)]',
    '',
    'use serde::{Deserialize, Serialize};',
    'use crate::db::DbPool;',
  ];
  if (hasAiService) lines.push('use crate::ai_service::ApiKeyStore;');
  lines.push('', ...documentFileIo());

  if (hasAiService) lines.push(...aiCallHelper());

  for (const compiler of ast.compilers) {
    const isAiDoc = compiler.ai !== undefined && compiler.to === 'document';
    if (isAiDoc) {
      lines.push(...generateAiCompileCommand(compiler, chatTable, docTable, hasAiService));
    } else if (isExchangeCompiler(compiler)) {
      lines.push(...generateExchangeCompileCommand(compiler, chatTable, exchangeTable));
    } else if (isFolderCompiler(compiler)) {
      lines.push(...generateFolderCompileCommand(compiler, chatTable, folderItemTable));
    } else {
      lines.push(...generateStubCompileCommand(compiler));
    }
  }

  files.set('src-tauri/src/compiler.rs', lines.join('\n'));
  return files;
}

/**
 * Tauri command identifiers to register in main.rs.
 */
export function compilerCommandNames(ast: AgiFile): string[] {
  if (ast.compilers.length === 0) return [];

  const base = [
    'compiler::read_document_content',
    'compiler::write_document_content',
    'compiler::scan_documents_dir',
  ];

  const compilerCmds = ast.compilers.map(c => `compiler::${toSnakeCase(c.name)}`);
  return [...base, ...compilerCmds];
}
