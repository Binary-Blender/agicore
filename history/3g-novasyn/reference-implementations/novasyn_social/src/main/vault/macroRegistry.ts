import { app } from 'electron';
import path from 'path';
import fs from 'fs';

// ─── Macro Registry ─────────────────────────────────────────────────────────
// Shared JSON file at %APPDATA%\NovaSyn\macro-registry.json
// Each app registers its callable operations on startup so other apps
// can discover what operations are available across the ecosystem.

const APP_ID = 'novasyn-social';
const APP_DISPLAY_NAME = 'NovaSyn Social';

interface MacroDefinition {
  description: string;
  input: Record<string, unknown>;
  output: Record<string, unknown>;
}

interface AppRegistryEntry {
  displayName: string;
  pid: number | null;
  registeredAt: string;
  lastHeartbeat: string;
  macros: Record<string, MacroDefinition>;
}

type MacroRegistry = Record<string, AppRegistryEntry>;

const HEARTBEAT_INTERVAL_MS = 30_000; // 30 seconds
const HEARTBEAT_STALE_MS = 90_000; // 90 seconds — consider stale after this
let heartbeatTimer: ReturnType<typeof setInterval> | null = null;

function getRegistryPath(): string {
  return path.join(app.getPath('appData'), 'NovaSyn', 'macro-registry.json');
}

function readRegistry(): MacroRegistry {
  const registryPath = getRegistryPath();
  if (!fs.existsSync(registryPath)) return {};
  try {
    return JSON.parse(fs.readFileSync(registryPath, 'utf-8')) as MacroRegistry;
  } catch {
    return {};
  }
}

function writeRegistry(registry: MacroRegistry): void {
  const registryPath = getRegistryPath();
  const dir = path.dirname(registryPath);
  fs.mkdirSync(dir, { recursive: true });

  // Atomic write: write to .tmp, then rename
  const tmpPath = registryPath + '.tmp';
  fs.writeFileSync(tmpPath, JSON.stringify(registry, null, 2));
  fs.renameSync(tmpPath, registryPath);
}

function getSocialMacros(): Record<string, MacroDefinition> {
  return {
    'social.draft_email': {
      description: 'Draft an email response',
      input: { threadContext: 'string', instruction: 'string?' },
      output: { draft: 'string', subject: 'string' },
    },
    'social.classify_inbox': {
      description: 'Classify inbox messages',
      input: {},
      output: { classified: 'array' },
    },
    'social.generate_post': {
      description: 'Generate a social media post',
      input: { topic: 'string', platform: 'string?' },
      output: { post: 'string' },
    },
  };
}

/** Update this app's lastHeartbeat in the registry */
function updateHeartbeat(): void {
  try {
    const registry = readRegistry();
    if (registry[APP_ID]) {
      registry[APP_ID].lastHeartbeat = new Date().toISOString();
      writeRegistry(registry);
    }
  } catch (err) {
    console.error('Macro registry: heartbeat update failed', err);
  }
}

/** Register this app's macros in the shared registry (call on startup) */
export function registerMacros(): void {
  try {
    const now = new Date().toISOString();
    const registry = readRegistry();
    registry[APP_ID] = {
      displayName: APP_DISPLAY_NAME,
      pid: process.pid,
      registeredAt: now,
      lastHeartbeat: now,
      macros: getSocialMacros(),
    };
    writeRegistry(registry);

    // Start heartbeat interval
    if (heartbeatTimer) clearInterval(heartbeatTimer);
    heartbeatTimer = setInterval(updateHeartbeat, HEARTBEAT_INTERVAL_MS);

    console.log(`Macro registry: registered ${APP_DISPLAY_NAME} (PID ${process.pid})`);
  } catch (err) {
    console.error('Macro registry: failed to register', err);
  }
}

/** Mark this app as offline in the registry (call on shutdown) */
export function unregisterMacros(): void {
  try {
    // Stop heartbeat
    if (heartbeatTimer) {
      clearInterval(heartbeatTimer);
      heartbeatTimer = null;
    }

    const registry = readRegistry();
    if (registry[APP_ID]) {
      registry[APP_ID].pid = null;
      writeRegistry(registry);
      console.log(`Macro registry: unregistered ${APP_DISPLAY_NAME}`);
    }
  } catch (err) {
    console.error('Macro registry: failed to unregister', err);
  }
}

/** Get the full registry (all apps, online and offline) */
export function getRegistry(): MacroRegistry {
  return readRegistry();
}

/** Get only macros from apps that are currently running (pid is set and process exists) */
export function getAvailableMacros(): MacroRegistry {
  const registry = readRegistry();
  const available: MacroRegistry = {};

  for (const [appId, entry] of Object.entries(registry)) {
    if (entry.pid === null) continue;

    const pidAlive = isProcessRunning(entry.pid);
    const heartbeatFresh = isHeartbeatFresh(entry.lastHeartbeat);

    // Consider online if PID is alive OR heartbeat is fresh
    // Consider offline only if heartbeat is stale AND PID check fails
    if (pidAlive || heartbeatFresh) {
      available[appId] = entry;
    }
  }

  return available;
}

function isProcessRunning(pid: number): boolean {
  try {
    // signal 0 doesn't kill the process, just checks if it exists
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function isHeartbeatFresh(lastHeartbeat: string | undefined): boolean {
  if (!lastHeartbeat) return false;
  const elapsed = Date.now() - new Date(lastHeartbeat).getTime();
  return elapsed < HEARTBEAT_STALE_MS;
}

/** Remove entries with stale heartbeats (crashed apps that didn't call unregisterMacros) */
export function cleanStaleEntries(): void {
  try {
    const registry = readRegistry();
    let cleaned = false;

    for (const [appId, entry] of Object.entries(registry)) {
      if (entry.pid === null) continue; // Already marked offline, leave as-is

      const pidAlive = isProcessRunning(entry.pid);
      const heartbeatFresh = isHeartbeatFresh(entry.lastHeartbeat);

      if (!heartbeatFresh && !pidAlive) {
        // Stale entry — app crashed without unregistering
        registry[appId].pid = null;
        cleaned = true;
        console.log(`Macro registry: cleaned stale entry for ${entry.displayName} (PID ${entry.pid})`);
      }
    }

    if (cleaned) {
      writeRegistry(registry);
    }
  } catch (err) {
    console.error('Macro registry: failed to clean stale entries', err);
  }
}
