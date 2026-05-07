import { app } from 'electron';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { executeMacro, getRegisteredMacroNames } from './macroExecutor';

// ─── Cross-App Queue System ─────────────────────────────────────────────────
// File-based message queue for inter-app macro invocation.
//
// Protocol:
//   1. App A writes req_<uuid>.json to App B's inbox
//   2. App B detects it, executes the macro, writes res_<uuid>.json to App A's inbox
//   3. App A reads the response
//
// Queue location: %APPDATA%\NovaSyn\macro-queue\<app-id>\

const APP_ID = 'novasyn-social';
const DEFAULT_TTL = 300; // seconds
const POLL_INTERVAL = 2000; // ms

interface MacroRequest {
  id: string;
  sourceApp: string;
  targetApp: string;
  macro: string;
  input: any;
  vaultParentId?: string;
  createdAt: string;
  status: 'pending';
  ttl: number;
}

interface MacroResponse {
  id: string;
  sourceApp: string;
  targetApp: string;
  macro: string;
  output?: any;
  status: 'completed' | 'failed';
  error?: string;
  completedAt: string;
}

let watcherInterval: ReturnType<typeof setInterval> | null = null;

function getQueueBasePath(): string {
  return path.join(app.getPath('appData'), 'NovaSyn', 'macro-queue');
}

function getInboxPath(appId?: string): string {
  return path.join(getQueueBasePath(), appId || APP_ID);
}

function ensureInboxExists(appId?: string): void {
  const inbox = getInboxPath(appId);
  fs.mkdirSync(inbox, { recursive: true });
}

/** Process incoming request files in this app's inbox */
function processInbox(): void {
  const inbox = getInboxPath();
  let files: string[];
  try {
    files = fs.readdirSync(inbox);
  } catch {
    return; // inbox doesn't exist yet
  }

  const now = Date.now();
  const registeredMacros = getRegisteredMacroNames();

  for (const file of files) {
    // Process request files
    if (file.startsWith('req_') && file.endsWith('.json')) {
      const filePath = path.join(inbox, file);
      handleRequest(filePath, registeredMacros, now);
    }

    // Clean up expired request files that were never processed
    if (file.startsWith('req_') && file.endsWith('.json')) {
      cleanupExpired(path.join(inbox, file), now);
    }
  }
}

async function handleRequest(
  filePath: string,
  registeredMacros: string[],
  now: number,
): Promise<void> {
  let request: MacroRequest;
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    request = JSON.parse(content) as MacroRequest;
  } catch (err) {
    console.error('Queue watcher: failed to read request file:', filePath, err);
    // Remove corrupted file
    try { fs.unlinkSync(filePath); } catch { /* ignore */ }
    return;
  }

  // Check TTL — skip and clean up if expired
  const createdAt = new Date(request.createdAt).getTime();
  if (now - createdAt > request.ttl * 1000) {
    console.log(`Queue watcher: expired request ${request.id} (age: ${Math.round((now - createdAt) / 1000)}s, ttl: ${request.ttl}s)`);
    try { fs.unlinkSync(filePath); } catch { /* ignore */ }
    return;
  }

  // Validate macro name
  if (!registeredMacros.includes(request.macro)) {
    console.warn(`Queue watcher: unknown macro "${request.macro}" in request ${request.id}`);
    writeResponse(request, {
      status: 'failed',
      error: `Unknown macro: ${request.macro}. Available: ${registeredMacros.join(', ')}`,
    });
    try { fs.unlinkSync(filePath); } catch { /* ignore */ }
    return;
  }

  // Execute the macro
  console.log(`Queue watcher: executing macro "${request.macro}" (request ${request.id} from ${request.sourceApp})`);
  try {
    const output = await executeMacro(request.macro, request.input);
    writeResponse(request, { status: 'completed', output });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error(`Queue watcher: macro "${request.macro}" failed:`, errorMessage);
    writeResponse(request, { status: 'failed', error: errorMessage });
  }

  // Delete the request file after processing
  try { fs.unlinkSync(filePath); } catch { /* ignore */ }
}

function writeResponse(
  request: MacroRequest,
  result: { status: 'completed' | 'failed'; output?: any; error?: string },
): void {
  const response: MacroResponse = {
    id: request.id,
    sourceApp: request.sourceApp,
    targetApp: request.targetApp,
    macro: request.macro,
    output: result.output,
    status: result.status,
    error: result.error,
    completedAt: new Date().toISOString(),
  };

  // Write response to the SOURCE app's inbox
  const sourceInbox = getInboxPath(request.sourceApp);
  ensureInboxExists(request.sourceApp);

  const responsePath = path.join(sourceInbox, `res_${request.id}.json`);
  const tmpPath = responsePath + '.tmp';
  try {
    fs.writeFileSync(tmpPath, JSON.stringify(response, null, 2));
    fs.renameSync(tmpPath, responsePath);
    console.log(`Queue watcher: wrote response for ${request.id} to ${request.sourceApp} inbox`);
  } catch (err) {
    console.error('Queue watcher: failed to write response:', err);
  }
}

function cleanupExpired(filePath: string, now: number): void {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const request = JSON.parse(content) as MacroRequest;
    const createdAt = new Date(request.createdAt).getTime();
    if (now - createdAt > request.ttl * 1000) {
      fs.unlinkSync(filePath);
      console.log(`Queue watcher: cleaned up expired request ${request.id}`);
    }
  } catch {
    // ignore read/parse errors during cleanup
  }
}

// ─── Public API ──────────────────────────────────────────────────────────────

/** Start watching this app's inbox for incoming macro requests */
export function startQueueWatcher(): void {
  ensureInboxExists();
  console.log(`Queue watcher: started for ${APP_ID} (inbox: ${getInboxPath()})`);

  // Immediately process any pending requests
  processInbox();

  // Poll every 2 seconds
  watcherInterval = setInterval(() => {
    processInbox();
  }, POLL_INTERVAL);
}

/** Stop watching the inbox */
export function stopQueueWatcher(): void {
  if (watcherInterval) {
    clearInterval(watcherInterval);
    watcherInterval = null;
    console.log(`Queue watcher: stopped for ${APP_ID}`);
  }
}

/**
 * Send a macro request to another app and wait for the response.
 * Returns a Promise that polls for the response file.
 */
export function sendMacroRequest(
  targetApp: string,
  macro: string,
  input: any,
  vaultParentId?: string,
): Promise<MacroResponse> {
  const id = uuidv4();

  const request: MacroRequest = {
    id,
    sourceApp: APP_ID,
    targetApp,
    macro,
    input,
    vaultParentId,
    createdAt: new Date().toISOString(),
    status: 'pending',
    ttl: DEFAULT_TTL,
  };

  // Write request to target app's inbox
  ensureInboxExists(targetApp);
  const requestPath = path.join(getInboxPath(targetApp), `req_${id}.json`);
  const tmpPath = requestPath + '.tmp';
  fs.writeFileSync(tmpPath, JSON.stringify(request, null, 2));
  fs.renameSync(tmpPath, requestPath);

  console.log(`Queue watcher: sent request ${id} to ${targetApp} (macro: ${macro})`);

  // Poll for response in our own inbox
  return new Promise((resolve, reject) => {
    const responsePath = path.join(getInboxPath(), `res_${id}.json`);
    const startTime = Date.now();
    const timeout = DEFAULT_TTL * 1000;

    const poll = setInterval(() => {
      // Check for timeout
      if (Date.now() - startTime > timeout) {
        clearInterval(poll);
        reject(new Error(`Macro request ${id} timed out after ${DEFAULT_TTL}s`));
        return;
      }

      // Check if response file exists
      if (fs.existsSync(responsePath)) {
        clearInterval(poll);
        try {
          const content = fs.readFileSync(responsePath, 'utf-8');
          const response = JSON.parse(content) as MacroResponse;
          // Clean up response file
          try { fs.unlinkSync(responsePath); } catch { /* ignore */ }
          resolve(response);
        } catch (err) {
          reject(new Error(`Failed to read response for ${id}: ${err}`));
        }
      }
    }, POLL_INTERVAL);
  });
}

/**
 * Check if a response exists for a given request ID (non-blocking).
 * Returns the response if found, null otherwise.
 */
export function checkMacroResponse(requestId: string): MacroResponse | null {
  const responsePath = path.join(getInboxPath(), `res_${requestId}.json`);
  if (!fs.existsSync(responsePath)) return null;

  try {
    const content = fs.readFileSync(responsePath, 'utf-8');
    const response = JSON.parse(content) as MacroResponse;
    // Clean up response file after reading
    try { fs.unlinkSync(responsePath); } catch { /* ignore */ }
    return response;
  } catch {
    return null;
  }
}

/**
 * List pending request files in this app's inbox.
 * Returns array of parsed request objects.
 */
export function getPendingRequests(): MacroRequest[] {
  const inbox = getInboxPath();
  let files: string[];
  try {
    files = fs.readdirSync(inbox);
  } catch {
    return [];
  }

  const requests: MacroRequest[] = [];
  for (const file of files) {
    if (file.startsWith('req_') && file.endsWith('.json')) {
      try {
        const content = fs.readFileSync(path.join(inbox, file), 'utf-8');
        requests.push(JSON.parse(content) as MacroRequest);
      } catch {
        // skip corrupted files
      }
    }
  }

  return requests;
}
