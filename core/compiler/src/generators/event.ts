// EVENT codegen — emits Rust event bus registry and TypeScript typed event helpers

import type { AgiFile, EventDecl } from '@agicore/parser';

export function generateEvent(ast: AgiFile): Map<string, string> {
  const files = new Map<string, string>();
  if (ast.events.length === 0) return files;

  files.set('src-tauri/src/commands/event_bus.rs', buildEventBusRs(ast.events));
  files.set('src/lib/eventBus.ts', buildEventBusTs(ast.events));

  return files;
}

// ─── Rust event bus ───────────────────────────────────────────────────────────

function buildEventBusRs(events: EventDecl[]): string {
  const registryEntries = events.map((e: EventDecl) => {
    const subs = e.subscribers.length
      ? `&[${e.subscribers.map((s: string) => `"${s}"`).join(', ')}]`
      : '&[]';
    return `    EventInfo {
        name: "${e.name}",
        idempotent: ${e.idempotent},
        ttl: ${e.ttl},
        remote_subscribers: ${subs},
    },`;
  }).join('\n');

  return `// EVENT BUS — static event registry with typed emit
// @agicore-generated — DO NOT EDIT (regenerate via: agicore compile)

use serde::{Deserialize, Serialize};
use tauri::AppHandle;

// ─── Event registry ───────────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EventInfo {
    pub name: &'static str,
    pub idempotent: bool,
    pub ttl: u64,
    pub remote_subscribers: &'static [&'static str],
}

const EVENT_REGISTRY: &[EventInfo] = &[
${registryEntries}
];

// ─── Emit helper ─────────────────────────────────────────────────────────────

pub fn emit_event(app: &AppHandle, event_name: &str, payload: serde_json::Value) {
    if let Err(e) = app.emit(event_name, payload) {
        eprintln!("[EventBus] Failed to emit {}: {}", event_name, e);
    }
}

// ─── Remote delivery ─────────────────────────────────────────────────────────

/// Returns the list of remote node names subscribed to the given event.
pub fn remote_subscribers_for(event_name: &str) -> &'static [&'static str] {
    EVENT_REGISTRY
        .iter()
        .find(|e| e.name == event_name)
        .map(|e| e.remote_subscribers)
        .unwrap_or(&[])
}

// ─── Tauri commands ───────────────────────────────────────────────────────────

#[tauri::command]
pub fn get_event_registry() -> Vec<EventInfo> {
    EVENT_REGISTRY.iter().cloned().collect()
}
`;
}

// ─── TypeScript event helpers ─────────────────────────────────────────────────

function buildEventBusTs(events: EventDecl[]): string {
  const sections = events.map((e: EventDecl) => {
    const payloadFields = e.payload
      .map(f => `  ${f.name}: ${f.type};`)
      .join('\n');
    const subscriberList = e.subscribers.length
      ? `[${e.subscribers.map((s: string) => `'${s}'`).join(', ')}] as const`
      : '[] as const';

    return `// ─── ${e.name} ─────────────────────────────────────────────────────────────
// ${e.description}

export interface ${e.name}Payload {
${payloadFields}
}

/** Remote nodes subscribed to ${e.name} */
export const ${e.name}Subscribers = ${subscriberList};

export function listen${e.name}(cb: (payload: ${e.name}Payload) => void) {
  return listen<${e.name}Payload>('${e.name}', (event) => cb(event.payload));
}

export function emit${e.name}(payload: ${e.name}Payload) {
  return emit('${e.name}', payload);
}`;
  }).join('\n\n');

  return `// EVENT BUS — typed listen/emit helpers
// @agicore-generated — DO NOT EDIT (regenerate via: agicore compile)

import { listen, emit } from '@tauri-apps/api/event';

${sections}
`;
}
