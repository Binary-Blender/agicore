// ACTION Code Generator
// Generates typed Rust async commands from ACTION declarations.
// Actions owned by the AI_SERVICE emitter (send_chat) are skipped here.

import type { AgiFile, ActionDecl, AgiType } from '@agicore/parser';
import { toSnakeCase, toPascalCase } from '../naming.js';

// These are emitted by ai-service.ts — skip here to avoid duplicate Tauri commands.
const AI_SERVICE_OWNED = new Set(['send_chat']);

// These are emitted by router.ts — skip here to avoid duplicate Tauri commands.
const ROUTER_OWNED = new Set(['broadcast_chat', 'council_chat']);

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
  const out = action.output[0];
  // Entity-name outputs → serde_json::Value stub (avoids cross-module imports)
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
      // Has a DSL default — make optional so callers can omit it.
      lines.push(`    #[serde(default)]`);
      lines.push(`    pub ${rustName}: Option<${base}>,`);
    } else {
      lines.push(`    pub ${rustName}: ${base},`);
    }
  }

  lines.push('}');
  return lines;
}

function generateCommand(action: ActionDecl): string[] {
  const lines: string[] = [];
  const fnName = toSnakeCase(action.name);
  const inputStruct = `${toPascalCase(action.name)}Input`;
  const returnType = rustReturnType(action);

  lines.push('#[tauri::command]');
  lines.push(`pub async fn ${fnName}(`);
  lines.push(`    input: ${inputStruct},`);
  lines.push(`    db: tauri::State<'_, DbPool>,`);
  lines.push(`) -> Result<${returnType}, String> {`);

  // Emit a clear TODO instead of panic — callers get a real error string at runtime.
  lines.push(`    let _ = (input, db);`);
  lines.push(`    Err("${fnName}: not yet implemented".to_string())`);
  lines.push('}');
  return lines;
}

export function generateActions(ast: AgiFile): Map<string, string> {
  const files = new Map<string, string>();

  const actions = ast.actions.filter(a => !AI_SERVICE_OWNED.has(a.name) && !ROUTER_OWNED.has(a.name));
  if (actions.length === 0) return files;

  const lines: string[] = [
    '// Agicore Generated — DO NOT EDIT BY HAND',
    '// Re-run `agicore generate` to regenerate.',
    '// Action commands generated from ACTION declarations.',
    '',
    '#![allow(unused_variables, unused_imports)]',
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
    lines.push(...generateCommand(action));
    lines.push('');
  }

  files.set('src-tauri/src/commands/actions.rs', lines.join('\n'));
  return files;
}

/**
 * Returns the list of action command identifiers for registration in main.rs.
 * Only actions that are emitted by this generator (not AI_SERVICE_OWNED).
 */
export function actionCommandNames(ast: AgiFile): string[] {
  return ast.actions
    .filter(a => !AI_SERVICE_OWNED.has(a.name) && !ROUTER_OWNED.has(a.name))
    .map(a => `commands::actions::${toSnakeCase(a.name)}`);
}
