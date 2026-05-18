// MACRO + MACRO_REGISTRY Code Generator
// Generates src-tauri/src/macros.rs with Tauri command stubs for each declared MACRO.
// Generates src/lib/macros.ts with typed TypeScript wrappers and the registry manifest.
// Activated when ast.macros.length > 0 or ast.macroRegistry is declared.

import type { AgiFile, MacroDecl, MacroRegistryDecl } from '@agicore/parser';

// ── Rust: macro command stubs ──────────────────────────────────────────────────

function macroParamRust(name: string, type: string): string {
  const rustType = type === 'INTEGER' || type === 'int' ? 'i64'
    : type === 'REAL' || type === 'float' ? 'f64'
    : type === 'BOOLEAN' || type === 'bool' ? 'bool'
    : 'String';
  return `${snakeCase(name)}: ${rustType}`;
}

function generateMacrosRs(macros: MacroDecl[]): string {
  const commands = macros.map(m => {
    const params = m.params.map(p =>
      `    ${macroParamRust(p.name, p.type)}`
    ).join(',\n');
    const paramList = params ? `\n${params},\n` : '';
    return `#[tauri::command]
pub async fn macro_${snakeCase(m.name)}(${paramList}) -> Result<serde_json::Value, String> {
    // MACRO ${m.name}: ${m.description}
    // Wire to action: ${m.action ?? '(none)'}
    // TODO: implement this macro
    Ok(serde_json::json!({ "status": "ok", "macro": "${m.name}" }))
}`;
  });

  const handler_list = macros.map(m => `        macros::macro_${snakeCase(m.name)},`).join('\n');

  return `// Agicore Generated — DO NOT EDIT BY HAND
// Macro command stubs. Each MACRO declaration becomes a Tauri command.
// Mark the file // @agicore-protected to preserve custom implementations.

use serde_json;

${commands.join('\n\n')}

// Register all macro commands in your lib.rs invoke_handler:
//
// .invoke_handler(tauri::generate_handler![
${handler_list.split('\n').map(l => `//   ${l.trim()}`).join('\n')}
// ])
`;
}

// ── TypeScript: typed invoke wrappers + registry manifest ─────────────────────

function macroParamTs(name: string, type: string, required: boolean): string {
  const tsType = type === 'INTEGER' || type === 'int' ? 'number'
    : type === 'REAL' || type === 'float' ? 'number'
    : type === 'BOOLEAN' || type === 'bool' ? 'boolean'
    : 'string';
  return required ? `${camelCase(name)}: ${tsType}` : `${camelCase(name)}?: ${tsType}`;
}

function generateMacrosTs(macros: MacroDecl[], registry?: MacroRegistryDecl): string {
  const imports = `import { invoke } from '@tauri-apps/api/core';`;

  const wrappers = macros.map(m => {
    const paramDefs = m.params.map(p => macroParamTs(p.name, p.type, p.required)).join(', ');
    const invokeArgs = m.params.map(p => `${camelCase(p.name)}`).join(', ');
    const args = m.params.length > 0
      ? `{ ${invokeArgs} }`
      : '{}';
    return `/** ${m.description} */
export async function invoke${pascalCase(m.name)}(${paramDefs}): Promise<unknown> {
  return invoke('macro_${snakeCase(m.name)}', ${args});
}`;
  });

  const exposedNames = registry?.exposes ?? macros.map(m => m.name);
  const manifestEntries = exposedNames.map(name => {
    const macro = macros.find(m => m.name === name);
    return `  ${JSON.stringify(name)}: { description: ${JSON.stringify(macro?.description ?? '')}, action: ${JSON.stringify(macro?.action ?? null)} }`;
  });

  const invokeBindings = (registry?.invokes ?? []).map(b => {
    const alias = b.as ?? camelCase(b.macro);
    return `export async function invoke${pascalCase(alias)}(...args: unknown[]): Promise<unknown> {
  return invoke(${JSON.stringify('macro_' + snakeCase(b.macro))}, ...args as [Record<string, unknown>]);
}`;
  });

  return `// Agicore Generated — DO NOT EDIT BY HAND
// Typed TypeScript wrappers for all declared MACROs and the registry manifest.

${imports}

${wrappers.join('\n\n')}

${invokeBindings.join('\n\n')}

/** Registry manifest — which macros this app exposes to other apps */
export const macroRegistry: Record<string, { description: string; action: string | null }> = {
${manifestEntries.join(',\n')}
};
`;
}

// ── Entry point ───────────────────────────────────────────────────────────────

export function generateMacroRegistry(ast: AgiFile): Map<string, string> {
  const files = new Map<string, string>();
  if (ast.macros.length === 0 && !ast.macroRegistry) return files;

  files.set('src-tauri/src/macros.rs', generateMacrosRs(ast.macros));
  files.set('src/lib/macros.ts', generateMacrosTs(ast.macros, ast.macroRegistry));
  return files;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function snakeCase(s: string): string {
  return s.replace(/([A-Z])/g, '_$1').replace(/-/g, '_').toLowerCase().replace(/^_/, '');
}

function camelCase(s: string): string {
  return s.replace(/[_-](\w)/g, (_, c) => c.toUpperCase());
}

function pascalCase(s: string): string {
  const cc = camelCase(s);
  return cc.charAt(0).toUpperCase() + cc.slice(1);
}
