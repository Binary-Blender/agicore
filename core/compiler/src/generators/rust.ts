// Rust Code Generator
// Generates Rust structs, Tauri commands, and database helpers from ENTITY declarations

import type { AgiFile, EntityDecl, FieldDef, AgiType } from '@agicore/parser';
import { toSnakeCase, toTableName, toForeignKey, toPascalCase, toCamelCase } from '../naming.js';
import { actionCommandNames } from './actions.js';
import { routerCommandNames } from './router.js';
import { compilerCommandNames } from './compiler.js';
import { vaultCommandNames, vaultPath } from './vault.js';

function rustType(agiType: AgiType, required: boolean): string {
  const base = (() => {
    switch (agiType) {
      case 'string':   return 'String';
      case 'number':   return 'i64';
      case 'float':    return 'f64';
      case 'bool':     return 'bool';
      case 'date':     return 'String';
      case 'datetime': return 'String';
      case 'json':     return 'String';
      case 'id':       return 'String';
    }
  })();
  return required ? base : `Option<${base}>`;
}

function isRequired(field: FieldDef): boolean {
  return field.modifiers.includes('REQUIRED') || field.defaultValue !== undefined;
}

function generateStruct(entity: EntityDecl): string {
  const lines: string[] = [];

  lines.push('#[derive(Debug, Clone, Serialize, Deserialize)]');
  lines.push('#[serde(rename_all = "camelCase")]');
  lines.push(`pub struct ${entity.name} {`);
  lines.push('    pub id: String,');

  for (const field of entity.fields) {
    const fieldName = toSnakeCase(field.name);
    const fieldType = rustType(field.type, isRequired(field));
    lines.push(`    pub ${fieldName}: ${fieldType},`);
  }

  for (const rel of entity.relationships) {
    if (rel.type === 'BELONGS_TO') {
      lines.push(`    pub ${toForeignKey(rel.target)}: String,`);
    }
  }

  if (entity.timestamps) {
    lines.push('    pub created_at: String,');
    lines.push('    pub updated_at: String,');
  }

  lines.push('}');
  return lines.join('\n');
}

function generateCreateInput(entity: EntityDecl): string {
  const lines: string[] = [];
  const name = `Create${entity.name}Input`;

  lines.push('#[derive(Debug, Clone, Deserialize)]');
  lines.push('#[serde(rename_all = "camelCase")]');
  lines.push(`pub struct ${name} {`);

  for (const field of entity.fields) {
    const fieldName = toSnakeCase(field.name);
    const required = field.modifiers.includes('REQUIRED');
    const fieldType = rustType(field.type, required);
    lines.push(`    pub ${fieldName}: ${fieldType},`);
  }

  for (const rel of entity.relationships) {
    if (rel.type === 'BELONGS_TO') {
      lines.push(`    pub ${toForeignKey(rel.target)}: String,`);
    }
  }

  lines.push('}');
  return lines.join('\n');
}

function generateUpdateInput(entity: EntityDecl): string {
  const lines: string[] = [];
  const name = `Update${entity.name}Input`;

  lines.push('#[derive(Debug, Clone, Deserialize)]');
  lines.push('#[serde(rename_all = "camelCase")]');
  lines.push(`pub struct ${name} {`);

  for (const field of entity.fields) {
    const fieldName = toSnakeCase(field.name);
    lines.push(`    pub ${fieldName}: Option<${rustType(field.type, true)}>,`);
  }

  lines.push('}');
  return lines.join('\n');
}

function generateCrudCommands(entity: EntityDecl, ast: AgiFile): string {
  const table = toTableName(entity.name);
  const snake = toSnakeCase(entity.name);
  const name = entity.name;
  const lines: string[] = [];

  const ops = entity.crud === 'full'
    ? ['list', 'create', 'read', 'update', 'delete']
    : entity.crud;

  const currentEntities = ast.app.current ?? [];

  // ORDER ASC|DESC on the ENTITY drives BOTH the unfiltered list and the
  // BELONGS_TO+CURRENT filtered variant. Missing => 'DESC' (back-compat with
  // every entity declared before ORDER was a DSL keyword).
  const orderDir = entity.order ?? 'DESC';

  // List
  if (ops.includes('list')) {
    lines.push(`#[tauri::command]`);
    lines.push(`pub fn list_${table}(db: tauri::State<'_, DbPool>) -> Result<Vec<${name}>, String> {`);
    lines.push(`    let conn = db.lock().map_err(|e| e.to_string())?;`);
    lines.push(`    let mut stmt = conn.prepare("SELECT * FROM ${table} ORDER BY created_at ${orderDir}")`);
    lines.push(`        .map_err(|e| e.to_string())?;`);
    lines.push(`    let rows = stmt.query_map([], |row| Ok(${name}::from_row(row)))`);
    lines.push(`        .map_err(|e| e.to_string())?`);
    lines.push(`        .collect::<Result<Vec<_>, _>>()`);
    lines.push(`        .map_err(|e| e.to_string())?;`);
    lines.push(`    Ok(rows)`);
    lines.push(`}`);
    lines.push('');

    // Filtered list_<entity>_by_<x> — only when X is BELONGS_TO and X is in CURRENT.
    // Loads only the rows for the active parent (e.g. messages for currentSessionId)
    // so the SQL planner does the work, not JS post-filtering.
    for (const rel of entity.relationships) {
      if (rel.type !== 'BELONGS_TO') continue;
      if (!currentEntities.includes(rel.target)) continue;
      const parentSnake = toSnakeCase(rel.target);
      const fk = toForeignKey(rel.target);
      lines.push(`#[tauri::command]`);
      lines.push(`pub fn list_${table}_by_${parentSnake}(db: tauri::State<'_, DbPool>, ${parentSnake}_id: String) -> Result<Vec<${name}>, String> {`);
      lines.push(`    let conn = db.lock().map_err(|e| e.to_string())?;`);
      lines.push(`    let mut stmt = conn.prepare("SELECT * FROM ${table} WHERE ${fk} = ? ORDER BY created_at ${orderDir}")`);
      lines.push(`        .map_err(|e| e.to_string())?;`);
      lines.push(`    let rows = stmt.query_map([&${parentSnake}_id], |row| Ok(${name}::from_row(row)))`);
      lines.push(`        .map_err(|e| e.to_string())?`);
      lines.push(`        .collect::<Result<Vec<_>, _>>()`);
      lines.push(`        .map_err(|e| e.to_string())?;`);
      lines.push(`    Ok(rows)`);
      lines.push(`}`);
      lines.push('');
    }
  }

  // Create
  if (ops.includes('create')) {
    const fieldNames = entity.fields.map(f => toSnakeCase(f.name));
    const fkNames = entity.relationships
      .filter(r => r.type === 'BELONGS_TO')
      .map(r => toForeignKey(r.target));
    const allCols = ['id', ...fieldNames, ...fkNames];
    if (entity.timestamps) allCols.push('created_at', 'updated_at');

    const placeholders = allCols.map(() => '?').join(', ');
    const colList = allCols.join(', ');

    lines.push(`#[tauri::command]`);
    lines.push(`pub fn create_${snake}(db: tauri::State<'_, DbPool>, input: Create${name}Input) -> Result<${name}, String> {`);
    lines.push(`    let conn = db.lock().map_err(|e| e.to_string())?;`);
    lines.push(`    let id = uuid::Uuid::new_v4().to_string();`);
    lines.push(`    let now = chrono::Utc::now().to_rfc3339();`);
    lines.push(`    conn.execute(`);
    lines.push(`        "INSERT INTO ${table} (${colList}) VALUES (${placeholders})",`);
    lines.push(`        rusqlite::params![`);
    lines.push(`            id,`);
    for (const f of entity.fields) {
      const sn = toSnakeCase(f.name);
      if (f.defaultValue !== undefined && !f.modifiers.includes('REQUIRED')) {
        const def = typeof f.defaultValue === 'string' ? `"${f.defaultValue}".to_string()`
          : typeof f.defaultValue === 'boolean' ? f.defaultValue.toString()
          : f.defaultValue.toString();
        lines.push(`            input.${sn}.unwrap_or(${def}),`);
      } else {
        lines.push(`            input.${sn},`);
      }
    }
    for (const r of entity.relationships) {
      if (r.type === 'BELONGS_TO') {
        lines.push(`            input.${toForeignKey(r.target)},`);
      }
    }
    if (entity.timestamps) {
      lines.push(`            &now,`);
      lines.push(`            &now,`);
    }
    lines.push(`        ],`);
    lines.push(`    ).map_err(|e| e.to_string())?;`);
    lines.push(`    drop(conn);`);
    lines.push(`    get_${snake}(db, id)`);
    lines.push(`}`);
    lines.push('');
  }

  // Read
  if (ops.includes('read')) {
    lines.push(`#[tauri::command]`);
    lines.push(`pub fn get_${snake}(db: tauri::State<'_, DbPool>, id: String) -> Result<${name}, String> {`);
    lines.push(`    let conn = db.lock().map_err(|e| e.to_string())?;`);
    lines.push(`    conn.query_row("SELECT * FROM ${table} WHERE id = ?", [&id], |row| {`);
    lines.push(`        Ok(${name}::from_row(row))`);
    lines.push(`    }).map_err(|e| e.to_string())`);
    lines.push(`}`);
    lines.push('');
  }

  // Update
  if (ops.includes('update')) {
    // Suppress unused-variable warning for junction tables that have no updatable fields.
    const hasUpdateableFields = entity.fields.length > 0;
    const inputParam = hasUpdateableFields ? `input: Update${name}Input` : `_input: Update${name}Input`;
    lines.push(`#[tauri::command]`);
    lines.push(`pub fn update_${snake}(db: tauri::State<'_, DbPool>, id: String, ${inputParam}) -> Result<${name}, String> {`);
    lines.push(`    let conn = db.lock().map_err(|e| e.to_string())?;`);
    lines.push(`    let mut sets: Vec<String> = Vec::new();`);
    lines.push(`    let mut params: Vec<Box<dyn rusqlite::types::ToSql>> = Vec::new();`);
    for (const f of entity.fields) {
      const sn = toSnakeCase(f.name);
      lines.push(`    if let Some(val) = input.${sn} {`);
      lines.push(`        sets.push("${sn} = ?".to_string());`);
      lines.push(`        params.push(Box::new(val));`);
      lines.push(`    }`);
    }
    if (entity.timestamps) {
      lines.push(`    sets.push("updated_at = ?".to_string());`);
      lines.push(`    params.push(Box::new(chrono::Utc::now().to_rfc3339()));`);
    }
    lines.push(`    params.push(Box::new(id.clone()));`);
    lines.push(`    let sql = format!("UPDATE ${table} SET {} WHERE id = ?", sets.join(", "));`);
    lines.push(`    let param_refs: Vec<&dyn rusqlite::types::ToSql> = params.iter().map(|p| p.as_ref()).collect();`);
    lines.push(`    conn.execute(&sql, param_refs.as_slice()).map_err(|e| e.to_string())?;`);
    lines.push(`    drop(conn);`);
    lines.push(`    get_${snake}(db, id)`);
    lines.push(`}`);
    lines.push('');
  }

  // Delete
  if (ops.includes('delete')) {
    lines.push(`#[tauri::command]`);
    lines.push(`pub fn delete_${snake}(db: tauri::State<'_, DbPool>, id: String) -> Result<(), String> {`);
    lines.push(`    let conn = db.lock().map_err(|e| e.to_string())?;`);
    lines.push(`    conn.execute("DELETE FROM ${table} WHERE id = ?", [&id])`);
    lines.push(`        .map_err(|e| e.to_string())?;`);
    lines.push(`    Ok(())`);
    lines.push(`}`);
    lines.push('');
  }

  return lines.join('\n');
}

function generateFromRow(entity: EntityDecl): string {
  const lines: string[] = [];
  lines.push(`impl ${entity.name} {`);
  lines.push(`    fn from_row(row: &rusqlite::Row) -> Self {`);
  lines.push(`        Self {`);
  lines.push(`            id: row.get("id").unwrap(),`);

  for (const field of entity.fields) {
    const col = toSnakeCase(field.name);
    if (isRequired(field)) {
      lines.push(`            ${col}: row.get("${col}").unwrap(),`);
    } else {
      lines.push(`            ${col}: row.get("${col}").ok(),`);
    }
  }

  for (const rel of entity.relationships) {
    if (rel.type === 'BELONGS_TO') {
      const fk = toForeignKey(rel.target);
      lines.push(`            ${fk}: row.get("${fk}").unwrap(),`);
    }
  }

  if (entity.timestamps) {
    lines.push(`            created_at: row.get("created_at").unwrap(),`);
    lines.push(`            updated_at: row.get("updated_at").unwrap(),`);
  }

  lines.push(`        }`);
  lines.push(`    }`);
  lines.push(`}`);
  return lines.join('\n');
}

export function generateRust(ast: AgiFile): Map<string, string> {
  const files = new Map<string, string>();

  const header = [
    '// Agicore Generated Rust Code',
    `// App: ${ast.app.name}`,
    '',
    'use serde::{Deserialize, Serialize};',
    'use crate::db::DbPool;',
    '',
  ].join('\n');

  // Generate one module file per entity
  for (const entity of ast.entities) {
    const modName = toSnakeCase(entity.name);
    const content = [
      header,
      generateStruct(entity),
      '',
      generateCreateInput(entity),
      '',
      generateUpdateInput(entity),
      '',
      generateFromRow(entity),
      '',
      generateCrudCommands(entity, ast),
    ].join('\n');

    files.set(`src-tauri/src/commands/${modName}.rs`, content);
  }

  // Generate mod.rs that re-exports everything
  const modLines = ast.entities.map(e => {
    const modName = toSnakeCase(e.name);
    return `pub mod ${modName};`;
  });
  // Include actions module when ACTION declarations exist (beyond send_chat and router-owned)
  const routerOwnedNames = new Set(['broadcast_chat', 'council_chat']);
  const hasActions = ast.actions.some(a => a.name !== 'send_chat' && !routerOwnedNames.has(a.name));
  if (hasActions) modLines.push('pub mod actions;');
  const hasWorkspaces = ast.app.workspaces === true;
  if (hasWorkspaces) modLines.push('pub mod workspaces;');
  const hasReasoners = ast.reasoners.length > 0;
  if (hasReasoners) modLines.push('pub mod reasoner;');
  const hasChannels = ast.channels.length > 0;
  if (hasChannels) modLines.push('pub mod channel;');
  const hasTriggers = ast.triggers.length > 0;
  if (hasTriggers) modLines.push('pub mod trigger;');
  const hasPackets = ast.packets.length > 0;
  if (hasPackets) modLines.push('pub mod packet;');
  const hasIdentities = ast.identities.length > 0;
  if (hasIdentities) modLines.push('pub mod identity;');
  const hasFeeds = ast.feeds.length > 0;
  if (hasFeeds) modLines.push('pub mod feed;');
  const hasSessions = ast.sessions.length > 0;
  if (hasSessions) modLines.push('pub mod session_mode;');
  const hasModules = ast.modules.length > 0;
  if (hasModules) modLines.push('pub mod module_engine;');
  files.set('src-tauri/src/commands/mod.rs', modLines.join('\n') + '\n');

  // Emit commands/workspaces.rs when WORKSPACES declared (plural — avoids collision with the Workspace entity module)
  if (hasWorkspaces) {
    const workspaceRs = [
      '// Agicore Generated — DO NOT EDIT BY HAND',
      '// Workspace runtime DB switching commands.',
      '',
      'use crate::db::{DbPool, DbPath};',
      'use rusqlite::Connection;',
      'use std::path::PathBuf;',
      '',
      '#[tauri::command]',
      'pub fn get_db_path(path: tauri::State<\'_, DbPath>) -> String {',
      '    path.lock().map(|p| p.display().to_string()).unwrap_or_default()',
      '}',
      '',
      '#[tauri::command]',
      'pub fn switch_db(',
      '    pool: tauri::State<\'_, DbPool>,',
      '    path_state: tauri::State<\'_, DbPath>,',
      '    new_path: String,',
      ') -> Result<(), String> {',
      '    let new_pb = PathBuf::from(&new_path);',
      '    let new_conn = Connection::open(&new_pb).map_err(|e| e.to_string())?;',
      '    new_conn.execute_batch("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;")',
      '        .map_err(|e| e.to_string())?;',
      '    let migration = include_str!("../../migrations/001_initial.sql");',
      '    new_conn.execute_batch(migration).map_err(|e| e.to_string())?;',
      '    let mut conn = pool.lock().map_err(|e| e.to_string())?;',
      '    let mut path = path_state.lock().map_err(|e| e.to_string())?;',
      '    *conn = new_conn;',
      '    *path = new_pb;',
      '    Ok(())',
      '}',
      '',
    ].join('\n');
    files.set('src-tauri/src/commands/workspaces.rs', workspaceRs);
  }

  // Generate main.rs
  const currentEntities = ast.app.current ?? [];
  const hasAiService = ast.aiService !== null && ast.aiService !== undefined;
  const hasRouter = ast.routers !== undefined && ast.routers.length > 0;
  const hasVault = ast.vault !== undefined && ast.vault !== null;

  const entityCommandList = ast.entities.flatMap(e => {
    const ops = e.crud === 'full' ? ['list', 'create', 'read', 'update', 'delete'] : e.crud;
    const table = toTableName(e.name);
    const snake = toSnakeCase(e.name);
    const cmds: string[] = [];
    for (const op of ops) {
      if (op === 'list') {
        cmds.push(`commands::${snake}::list_${table}`);
        // Register the by-<parent> filtered variant alongside the unfiltered list,
        // for each BELONGS_TO target that's in APP CURRENT.
        for (const rel of e.relationships) {
          if (rel.type !== 'BELONGS_TO') continue;
          if (!currentEntities.includes(rel.target)) continue;
          const parentSnake = toSnakeCase(rel.target);
          cmds.push(`commands::${snake}::list_${table}_by_${parentSnake}`);
        }
      } else if (op === 'read') {
        cmds.push(`commands::${snake}::get_${snake}`);
      } else {
        cmds.push(`commands::${snake}::${op}_${snake}`);
      }
    }
    return cmds;
  });

  // AI_SERVICE commands (send_chat + key management)
  const aiServiceCmds = hasAiService
    ? ['ai_service::send_chat', 'ai_service::get_api_keys', 'ai_service::set_api_key']
    : [];

  // ACTION commands (all non-send_chat, non-router actions)
  const actionCmds = hasActions ? actionCommandNames(ast) : [];

  // ROUTER commands (broadcast_chat, council_chat)
  const routerCmds = hasRouter ? routerCommandNames(ast) : [];

  // COMPILER commands (file I/O + Send To transitions)
  const hasCompilers = ast.compilers !== undefined && ast.compilers.length > 0;
  const compilerCmds = hasCompilers ? compilerCommandNames(ast) : [];

  // VAULT commands
  const vaultCmds = hasVault ? vaultCommandNames(ast) : [];

  // WORKSPACE commands
  const workspaceCmds = hasWorkspaces
    ? ['commands::workspaces::get_db_path', 'commands::workspaces::switch_db']
    : [];

  const reasonerCmds = hasReasoners
    ? ['commands::reasoner::list_reasoner_statuses', 'commands::reasoner::list_reasoner_runs', 'commands::reasoner::run_reasoner']
    : [];
  const channelCmds = hasChannels
    ? ['commands::channel::publish_channel_message', 'commands::channel::list_channel_messages', 'commands::channel::list_all_channels', 'commands::channel::clear_channel', 'commands::channel::mark_message_processed']
    : [];
  const triggerCmds = hasTriggers
    ? ['commands::trigger::list_trigger_statuses', 'commands::trigger::list_trigger_log']
    : [];
  const packetCmds = hasPackets
    ? ['commands::packet::list_packet_schemas', 'commands::packet::list_validation_failures']
    : [];
  const identityCmds = hasIdentities
    ? ['commands::identity::list_identities', 'commands::identity::get_identity', 'commands::identity::update_identity_profile', 'commands::identity::sign_payload', 'commands::identity::verify_signature']
    : [];
  const feedCmds = hasFeeds
    ? ['commands::feed::list_feeds', 'commands::feed::generate_feed', 'commands::feed::get_feed_entries']
    : [];
  const sessionModeCmds = hasSessions
    ? ['commands::session_mode::list_session_modes', 'commands::session_mode::get_active_mode', 'commands::session_mode::set_active_mode', 'commands::session_mode::get_mode_memory', 'commands::session_mode::set_mode_memory', 'commands::session_mode::delete_mode_memory']
    : [];
  const moduleCmds = hasModules
    ? ['commands::module_engine::list_module_statuses', 'commands::module_engine::set_module_active', 'commands::module_engine::check_module_conditions', 'commands::module_engine::list_module_facts', 'commands::module_engine::set_module_fact']
    : [];
  const allCommandList = [...aiServiceCmds, ...entityCommandList, ...actionCmds, ...routerCmds, ...compilerCmds, ...vaultCmds, ...workspaceCmds, ...reasonerCmds, ...channelCmds, ...triggerCmds, ...packetCmds, ...identityCmds, ...feedCmds, ...sessionModeCmds, ...moduleCmds];

  const mainRsLines = [
    '#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]',
    '',
    'mod commands;',
    'mod db;',
  ];
  if (hasAiService) mainRsLines.push('mod ai_service;');
  if (hasRouter) mainRsLines.push('mod router;');
  if (hasCompilers) mainRsLines.push('mod compiler;');
  if (hasVault) mainRsLines.push('mod vault;');
  if (ast.tests.length > 0) mainRsLines.push('mod tests;');

  const hasTray = ast.app.tray === true;
  const hasHotkey = typeof ast.app.hotkey === 'string' && ast.app.hotkey.length > 0;

  mainRsLines.push('');
  mainRsLines.push('use std::sync::Mutex;');
  mainRsLines.push('use tauri::Manager;');
  if (hasTray) {
    mainRsLines.push('use tauri::tray::{TrayIconBuilder, TrayIconEvent, MouseButton};');
    mainRsLines.push('use tauri::menu::{Menu, MenuItem};');
  }
  if (hasHotkey) {
    mainRsLines.push('use tauri_plugin_global_shortcut::GlobalShortcutExt;');
  }
  mainRsLines.push(
    '',
    'fn main() {',
    '    tauri::Builder::default()',
    ...(hasHotkey ? ['        .plugin(tauri_plugin_global_shortcut::Builder::new().build())'] : []),
    ...(hasWorkspaces ? ['        .plugin(tauri_plugin_dialog::init())'] : []),
    '        .setup(|app| {',
    '            let app_dir = app.path().app_data_dir().expect("failed to resolve app data dir");',
    '            std::fs::create_dir_all(&app_dir).ok();',
    `            let db_path = app_dir.join("${ast.app.db}");`,
    ...(hasWorkspaces ? [
      '            let pool = db::init_db(db_path.clone());',
      '            app.manage(pool);',
      '            app.manage(Mutex::new(db_path));',
    ] : [
      '            let pool = db::init_db(db_path);',
      '            app.manage(pool);',
    ]),
  );
  if (hasAiService) {
    mainRsLines.push(
      '            let api_keys = Mutex::new(ai_service::load_api_keys());',
      '            app.manage(api_keys);',
    );
  }
  if (hasVault) {
    const rawPath = vaultPath(ast).replace(/\\/g, '/');
    mainRsLines.push(
      `            let vault_path = vault::resolve_vault_path("${rawPath}");`,
      '            let vault_pool = vault::init_vault(vault_path);',
      '            app.manage(vault_pool);',
    );
  }
  if (hasTray) {
    mainRsLines.push(
      '            // System tray setup',
      `            let show = MenuItem::with_id(app, "show", "Show ${ast.app.title}", true, None::<&str>)?;`,
      `            let quit = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;`,
      '            let menu = Menu::with_items(app, &[&show, &quit])?;',
      '            TrayIconBuilder::new()',
      '                .icon(app.default_window_icon().unwrap().clone())',
      '                .menu(&menu)',
      '                .show_menu_on_left_click(false)',
      '                .on_menu_event(|app, event| match event.id.as_ref() {',
      '                    "show" => {',
      '                        if let Some(w) = app.get_webview_window("main") {',
      '                            let _ = w.show(); let _ = w.set_focus();',
      '                        }',
      '                    }',
      '                    "quit" => app.exit(0),',
      '                    _ => {}',
      '                })',
      '                .on_tray_icon_event(|tray, event| {',
      '                    if let TrayIconEvent::Click { button: MouseButton::Left, .. } = event {',
      '                        let app = tray.app_handle();',
      '                        if let Some(w) = app.get_webview_window("main") {',
      '                            let _ = w.show(); let _ = w.set_focus();',
      '                        }',
      '                    }',
      '                })',
      '                .build(app)?;',
    );
  }
  if (hasHotkey) {
    mainRsLines.push(
      '            // Global hotkey — toggle window visibility',
      `            app.global_shortcut().on_shortcut("${ast.app.hotkey}", |app, _shortcut, _event| {`,
      '                if let Some(w) = app.get_webview_window("main") {',
      '                    if w.is_visible().unwrap_or(false) {',
      '                        let _ = w.hide();',
      '                    } else {',
      '                        let _ = w.show();',
      '                        let _ = w.set_focus();',
      '                    }',
      '                }',
      `            })?;`,
    );
  }
  if (hasIdentities) {
    mainRsLines.push(
      '            // Bootstrap IDENTITY declarations (generate keys if first run)',
      '            {',
      '                let pool_ref = app.state::<db::DbPool>().inner().clone();',
      '                commands::identity::bootstrap_identities(&pool_ref);',
      '            }',
    );
  }
  if (hasReasoners || hasTriggers) {
    mainRsLines.push(
      '            // Start background runtimes',
      '            {',
      '                use std::sync::Arc;',
      '                let pool_ref = app.state::<db::DbPool>().inner().clone();',
      '                let keys_arc = Arc::new(std::sync::Mutex::new(ai_service::load_api_keys()));',
      '                let default_model = "claude-sonnet-4-6".to_string();',
    );
    if (hasReasoners) {
      mainRsLines.push(
        '                commands::reasoner::start_reasoner_scheduler(app.handle().clone(), pool_ref.clone(), keys_arc.clone(), default_model.clone());',
      );
    }
    if (hasTriggers) {
      mainRsLines.push(
        '                commands::trigger::start_trigger_dispatcher(app.handle().clone(), pool_ref, keys_arc, default_model);',
      );
    }
    mainRsLines.push('            }');
  }
  mainRsLines.push(
    '            Ok(())',
    '        })',
    '        .invoke_handler(tauri::generate_handler![',
    ...allCommandList.map(c => `            ${c},`),
    '        ])',
    '        .run(tauri::generate_context!())',
    '        .expect("error while running tauri application");',
    '}',
    '',
  );

  files.set('src-tauri/src/main.rs', mainRsLines.join('\n'));

  // Generate db.rs
  // Use Arc<Mutex<Connection>> when background tasks need a cloneable pool handle
  const needsArcPool = hasReasoners || hasTriggers;
  const dbRs = [
    'use rusqlite::Connection;',
    'use std::path::PathBuf;',
    'use std::sync::Mutex;',
    ...(needsArcPool ? ['use std::sync::Arc;'] : []),
    '',
    ...(needsArcPool
      ? ['pub type DbPool = Arc<Mutex<Connection>>;']
      : ['pub type DbPool = Mutex<Connection>;']
    ),
    ...(hasWorkspaces ? ['pub type DbPath = Mutex<PathBuf>;'] : []),
    '',
    'pub fn init_db(db_path: PathBuf) -> DbPool {',
    '    let conn = Connection::open(&db_path).expect("Failed to open database");',
    '    conn.execute_batch("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;")',
    '        .expect("Failed to set pragmas");',
    '',
    '    // Run migrations',
    '    let migration = include_str!("../migrations/001_initial.sql");',
    '    conn.execute_batch(migration).expect("Failed to run migrations");',
    '',
    ...(needsArcPool ? ['    Arc::new(Mutex::new(conn))'] : ['    Mutex::new(conn)']),
    '}',
    '',
  ].join('\n');

  files.set('src-tauri/src/db.rs', dbRs);

  return files;
}
