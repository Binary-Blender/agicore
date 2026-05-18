// ACTUATOR Code Generator
// Generates TypeScript types and Tauri command stubs for all ACTUATOR declarations.
// Actuators are hardware output devices (motors, servos, relays, LEDs).
// Activated when ast.actuators.length > 0.

import type { AgiFile, ActuatorDecl } from '@agicore/parser';

// ── TypeScript types ───────────────────────────────────────────────────────────

function generateActuatorTs(actuators: ActuatorDecl[]): string {
  const interfaces = actuators.map(a => `
export interface ${pascalCase(a.name)}Command {
  actuatorName: string;  // '${a.name}'
  type: '${a.type}';
  command: 'set' | 'stop' | 'reset';
  value?: number;        // normalized 0.0–1.0 or step count
  durationMs?: number;
}`).join('\n');

  const invokers = actuators.map(a => `
/** ${a.description} — safe state: ${a.safeState}${a.maxCurrent ? `, max ${a.maxCurrent}mA` : ''} */
export async function set${pascalCase(a.name)}(value: number, durationMs?: number): Promise<void> {
  return invoke('actuator_set_${snakeCase(a.name)}', { value, durationMs });
}

export async function stop${pascalCase(a.name)}(): Promise<void> {
  return invoke('actuator_stop_${snakeCase(a.name)}');
}`).join('\n');

  return `// Agicore Generated — DO NOT EDIT BY HAND
// Typed TypeScript wrappers for ACTUATOR commands.

import { invoke } from '@tauri-apps/api/core';

${interfaces}

${invokers}
`;
}

// ── Rust command stubs ────────────────────────────────────────────────────────

function generateActuatorRs(actuators: ActuatorDecl[]): string {
  const commands = actuators.map(a => {
    const safeComment = `// Safe state: ${a.safeState}${a.maxCurrent ? ` | Max: ${a.maxCurrent}mA` : ''}${a.slewRate ? ` | Slew: ${a.slewRate}%/ms` : ''}${a.watchdog ? ` | Watchdog: ${a.watchdog}ms` : ''}`;
    return `${safeComment}
#[tauri::command]
pub async fn actuator_set_${snakeCase(a.name)}(value: f64, duration_ms: Option<u64>) -> Result<(), String> {
    // TODO: implement ${a.name} (${a.type}${a.model ? ` — ${a.model}` : ''}) set
    // Apply slew rate limit${a.slewRate ? ` (max ${a.slewRate}%/ms change)` : ''} before sending
    Ok(())
}

#[tauri::command]
pub async fn actuator_stop_${snakeCase(a.name)}() -> Result<(), String> {
    // TODO: command ${a.name} to safe state (${a.safeState})
    Ok(())
}`;
  }).join('\n\n');

  const handler_entries = actuators.flatMap(a => [
    `//     actuators::actuator_set_${snakeCase(a.name)},`,
    `//     actuators::actuator_stop_${snakeCase(a.name)},`,
  ]).join('\n');

  return `// Agicore Generated — DO NOT EDIT BY HAND
// Actuator command stubs. Mark // @agicore-protected to implement.
// Add to lib.rs invoke_handler:
//
// .invoke_handler(tauri::generate_handler![
${handler_entries}
// ])

${commands}
`;
}

// ── Entry point ───────────────────────────────────────────────────────────────

export function generateActuator(ast: AgiFile): Map<string, string> {
  const files = new Map<string, string>();
  if (ast.actuators.length === 0) return files;

  files.set('src/lib/actuators.ts', generateActuatorTs(ast.actuators));
  files.set('src-tauri/src/embedded/actuators.rs', generateActuatorRs(ast.actuators));
  return files;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function pascalCase(s: string): string {
  return s.replace(/[_-](\w)/g, (_, c: string) => c.toUpperCase())
    .replace(/^(\w)/, (c: string) => c.toUpperCase());
}

function snakeCase(s: string): string {
  return s.replace(/([A-Z])/g, '_$1').replace(/-/g, '_').toLowerCase().replace(/^_/, '');
}
