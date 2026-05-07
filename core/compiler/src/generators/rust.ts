// Rust Code Generator
// Generates Rust structs, Tauri commands, and database helpers from ENTITY declarations

import type { AgiFile, EntityDecl, FieldDef, AgiType } from '@agicore/parser';
import { toSnakeCase, toTableName, toForeignKey, toPascalCase, toCamelCase } from '../naming.js';

function rustType(agiType: AgiType, required: boolean): string {
  const base = (() => {
    switch (agiType) {
      case 'string':   return 'String';
      case 'number':   return 'i64';
      case 'float':    return 'f64';
      case 'bool':     return 'bool';
      case 'date':     return 'String';
      case 'datetime': return 'String';
      case 'json':     return 'serde_json::Value';
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

  lines.push('#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]');
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

  lines.push('#[derive(Debug, Clone, Deserialize, specta::Type)]');
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

  lines.push('#[derive(Debug, Clone, Deserialize, specta::Type)]');
  lines.push('#[serde(rename_all = "camelCase")]');
  lines.push(`pub struct ${name} {`);

  for (const field of entity.fields) {
    const fieldName = toSnakeCase(field.name);
    lines.push(`    pub ${fieldName}: Option<${rustType(field.type, true)}>,`);
  }

  lines.push('}');
  return lines.join('\n');
}

function generateCrudCommands(entity: EntityDecl): string {
  const table = toTableName(entity.name);
  const snake = toSnakeCase(entity.name);
  const name = entity.name;
  const lines: string[] = [];

  const ops = entity.crud === 'full'
    ? ['list', 'create', 'read', 'update', 'delete']
    : entity.crud;

  // List
  if (ops.includes('list')) {
    lines.push(`#[tauri::command]`);
    lines.push(`#[specta::specta]`);
    lines.push(`pub fn list_${table}(db: tauri::State<'_, DbPool>) -> Result<Vec<${name}>, String> {`);
    lines.push(`    let conn = db.get().map_err(|e| e.to_string())?;`);
    lines.push(`    let mut stmt = conn.prepare("SELECT * FROM ${table} ORDER BY created_at DESC")`);
    lines.push(`        .map_err(|e| e.to_string())?;`);
    lines.push(`    let rows = stmt.query_map([], |row| Ok(${name}::from_row(row)))`);
    lines.push(`        .map_err(|e| e.to_string())?`);
    lines.push(`        .collect::<Result<Vec<_>, _>>()`);
    lines.push(`        .map_err(|e| e.to_string())?;`);
    lines.push(`    Ok(rows)`);
    lines.push(`}`);
    lines.push('');
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
    lines.push(`#[specta::specta]`);
    lines.push(`pub fn create_${snake}(db: tauri::State<'_, DbPool>, input: Create${name}Input) -> Result<${name}, String> {`);
    lines.push(`    let conn = db.get().map_err(|e| e.to_string())?;`);
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
    lines.push(`    get_${snake}(db, id)`);
    lines.push(`}`);
    lines.push('');
  }

  // Read
  if (ops.includes('read')) {
    lines.push(`#[tauri::command]`);
    lines.push(`#[specta::specta]`);
    lines.push(`pub fn get_${snake}(db: tauri::State<'_, DbPool>, id: String) -> Result<${name}, String> {`);
    lines.push(`    let conn = db.get().map_err(|e| e.to_string())?;`);
    lines.push(`    conn.query_row("SELECT * FROM ${table} WHERE id = ?", [&id], |row| {`);
    lines.push(`        Ok(${name}::from_row(row))`);
    lines.push(`    }).map_err(|e| e.to_string())`);
    lines.push(`}`);
    lines.push('');
  }

  // Update
  if (ops.includes('update')) {
    lines.push(`#[tauri::command]`);
    lines.push(`#[specta::specta]`);
    lines.push(`pub fn update_${snake}(db: tauri::State<'_, DbPool>, id: String, input: Update${name}Input) -> Result<${name}, String> {`);
    lines.push(`    let conn = db.get().map_err(|e| e.to_string())?;`);
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
    lines.push(`    get_${snake}(db, id)`);
    lines.push(`}`);
    lines.push('');
  }

  // Delete
  if (ops.includes('delete')) {
    lines.push(`#[tauri::command]`);
    lines.push(`#[specta::specta]`);
    lines.push(`pub fn delete_${snake}(db: tauri::State<'_, DbPool>, id: String) -> Result<(), String> {`);
    lines.push(`    let conn = db.get().map_err(|e| e.to_string())?;`);
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
      generateCrudCommands(entity),
    ].join('\n');

    files.set(`src-tauri/src/commands/${modName}.rs`, content);
  }

  // Generate mod.rs that re-exports everything
  const modLines = ast.entities.map(e => {
    const modName = toSnakeCase(e.name);
    return `pub mod ${modName};`;
  });
  files.set('src-tauri/src/commands/mod.rs', modLines.join('\n') + '\n');

  // Generate main.rs
  const commandList = ast.entities.flatMap(e => {
    const ops = e.crud === 'full' ? ['list', 'create', 'read', 'update', 'delete'] : e.crud;
    const table = toTableName(e.name);
    const snake = toSnakeCase(e.name);
    return ops.map(op => {
      if (op === 'list') return `commands::${snake}::list_${table}`;
      if (op === 'read') return `commands::${snake}::get_${snake}`;
      return `commands::${snake}::${op}_${snake}`;
    });
  });

  const mainRs = [
    '#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]',
    '',
    'mod commands;',
    'mod db;',
    '',
    'fn main() {',
    '    let pool = db::init_db();',
    '',
    '    tauri::Builder::default()',
    '        .manage(pool)',
    '        .invoke_handler(tauri::generate_handler![',
    ...commandList.map(c => `            ${c},`),
    '        ])',
    '        .run(tauri::generate_context!())',
    '        .expect("error while running tauri application");',
    '}',
    '',
  ].join('\n');

  files.set('src-tauri/src/main.rs', mainRs);

  // Generate db.rs
  const dbRs = [
    'use rusqlite::Connection;',
    'use std::sync::Mutex;',
    '',
    'pub type DbPool = Mutex<Connection>;',
    '',
    'pub fn init_db() -> DbPool {',
    `    let db_path = tauri::api::path::app_data_dir(&tauri::Config::default())`,
    `        .unwrap_or_default()`,
    `        .join("${ast.app.db}");`,
    '',
    '    let conn = Connection::open(&db_path).expect("Failed to open database");',
    '    conn.execute_batch("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;")',
    '        .expect("Failed to set pragmas");',
    '',
    '    // Run migrations',
    '    let migration = include_str!("../migrations/001_initial.sql");',
    '    conn.execute_batch(migration).expect("Failed to run migrations");',
    '',
    '    Mutex::new(conn)',
    '}',
    '',
  ].join('\n');

  files.set('src-tauri/src/db.rs', dbRs);

  return files;
}
