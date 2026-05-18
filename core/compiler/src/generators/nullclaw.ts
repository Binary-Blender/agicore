// NULLCLAW Code Generator
// Generates the NullClaw agent config JSON and a TypeScript tool bridge.
// NullClaw is a 678KB Zig binary with vtable-driven agent behavior.
// The tool bridge maps NullClaw tool calls to Tauri device commands.
// Activated when ast.nullclaw is declared.

import type { AgiFile, NullclawDecl } from '@agicore/parser';

// ── NullClaw config.json ──────────────────────────────────────────────────────

function generateNullclawConfig(nc: NullclawDecl): string {
  const providers = nc.providers.map(p => ({
    name: p.name,
    url: p.url,
    priority: p.priority,
    type: p.url.includes('localhost') ? 'local' : 'remote',
  }));

  const tools = nc.tools.map(t => ({
    name: t.name,
    maps_to: t.mapsTo,
    transport: 'tauri_ipc',
  }));

  const config: Record<string, unknown> = {
    version: '1',
    personality: nc.personality ?? 'You are a helpful AI assistant with access to device hardware.',
    providers,
    tools,
    safety: {
      max_tokens_per_turn: 2048,
      require_confirmation: false,
      log_all_tool_calls: true,
    },
    generated: new Date().toISOString().split('T')[0],
  };

  return JSON.stringify(config, null, 2);
}

// ── TypeScript tool bridge ─────────────────────────────────────────────────────

function generateToolBridge(nc: NullclawDecl): string {
  const toolHandlers = nc.tools.map(t => `
  '${t.name}': async (args: Record<string, unknown>) => {
    return invoke('${t.mapsTo}', args);
  },`).join('');

  const providerList = nc.providers
    .sort((a, b) => a.priority - b.priority)
    .map(p => `  // ${p.priority}. ${p.name}: ${p.url}`)
    .join('\n');

  return `// Agicore Generated — DO NOT EDIT BY HAND
// NullClaw tool bridge: routes agent tool calls to Tauri device commands.
// See scaffold/nullclaw/config.json for the full NullClaw configuration.

import { invoke } from '@tauri-apps/api/core';

// Provider priority (lower = preferred):
${providerList}

/** Dispatch a NullClaw tool call to the corresponding Tauri command */
export async function dispatchNullclawTool(
  toolName: string,
  args: Record<string, unknown>
): Promise<unknown> {
  const handler = toolHandlers[toolName];
  if (!handler) {
    throw new Error(\`Unknown NullClaw tool: \${toolName}. Declared tools: ${nc.tools.map(t => t.name).join(', ')}\`);
  }
  return handler(args);
}

const toolHandlers: Record<string, (args: Record<string, unknown>) => Promise<unknown>> = {
${toolHandlers}
};

/** All declared NullClaw tool names */
export type NullclawToolName = ${nc.tools.map(t => `'${t.name}'`).join(' | ') || 'never'};

/** Start the NullClaw agent loop (call from main window on startup) */
export async function startNullclawAgent(): Promise<void> {
  return invoke('nullclaw_start_agent');
}

/** Stop the NullClaw agent loop */
export async function stopNullclawAgent(): Promise<void> {
  return invoke('nullclaw_stop_agent');
}
`;
}

// ── Rust NullClaw launcher stub ────────────────────────────────────────────────

function generateNullclawRs(nc: NullclawDecl): string {
  return `// Agicore Generated — DO NOT EDIT BY HAND
// NullClaw agent launcher. Mark // @agicore-protected to customize.
// NullClaw binary: 678KB Zig binary, zero external dependencies.

use std::process::{Child, Command};
use std::sync::Mutex;

static NULLCLAW_PROCESS: Mutex<Option<Child>> = Mutex::new(None);

const CONFIG_PATH: &str = "${nc.configPath}";

#[tauri::command]
pub async fn nullclaw_start_agent() -> Result<(), String> {
    let mut proc = NULLCLAW_PROCESS.lock().map_err(|e| e.to_string())?;
    if proc.is_some() {
        return Ok(()); // already running
    }
    let child = Command::new("nullclaw")
        .arg("--config").arg(CONFIG_PATH)
        .spawn()
        .map_err(|e| format!("Failed to start NullClaw: {}", e))?;
    *proc = Some(child);
    Ok(())
}

#[tauri::command]
pub async fn nullclaw_stop_agent() -> Result<(), String> {
    let mut proc = NULLCLAW_PROCESS.lock().map_err(|e| e.to_string())?;
    if let Some(mut child) = proc.take() {
        child.kill().map_err(|e| e.to_string())?;
    }
    Ok(())
}
`;
}

// ── Entry point ───────────────────────────────────────────────────────────────

export function generateNullclaw(ast: AgiFile): Map<string, string> {
  const files = new Map<string, string>();
  if (!ast.nullclaw) return files;

  files.set('scaffold/nullclaw/config.json', generateNullclawConfig(ast.nullclaw));
  files.set('src/lib/nullclaw.ts', generateToolBridge(ast.nullclaw));
  files.set('src-tauri/src/nullclaw.rs', generateNullclawRs(ast.nullclaw));
  return files;
}
